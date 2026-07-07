// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Ingest pipeline. The single public entry point is `ingestFile`,
// which turns a `File` into a stored Source + an array of embedded
// Chunks in IndexedDB. The pipeline is sequential on the main
// thread (cheap operations like type dispatch and OPFS write) and
// offloads the expensive steps to other boundaries: the embed
// worker handles model inference, and chunking uses the same
// tokenizer so we never block the UI for more than a few ms.

import { v4 as uuidv4 } from 'uuid';

import { chunkText } from './chunker';
import type { IngestOptions, ProgressEvent } from './types';
import { parseDocx } from './parsers/docx';
import { parseMarkdown } from './parsers/markdown';
import { parsePdf } from './parsers/pdf';
import { parseText } from './parsers/text';
import type { ParseResult } from './parsers/types';

import { embedBatch } from '@/features/retrieval/embed';
import { putChunks, putSource } from '@/features/retrieval/store';
import type { Chunk, Source } from '@/features/retrieval/types';
import { putFile } from '@/lib/opfs';

const PARSER_VERSION = 'v1';

type ParserFn = (file: File) => Promise<ParseResult>;

function pickParser(file: File): ParserFn {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return parsePdf;
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    return parseDocx;
  }
  if (mime.startsWith('text/markdown') || name.endsWith('.md') || name.endsWith('.markdown')) {
    return parseMarkdown;
  }
  return parseText;
}

function emit(onProgress: ((e: ProgressEvent) => void) | undefined, e: ProgressEvent): void {
  onProgress?.(e);
}

export type IngestResult = {
  sourceId: string;
  chunksCreated: number;
};

export async function ingestFile(
  file: File,
  opts: IngestOptions,
  onProgress?: (e: ProgressEvent) => void,
): Promise<IngestResult> {
  const sourceId = uuidv4();
  const opfsPath = `ragulli-files/${sourceId}`;

  // 1. Parse
  emit(onProgress, { phase: 'parse', ratio: 0 });
  const parser = pickParser(file);
  const parsed = await parser(file);
  emit(onProgress, { phase: 'parse', ratio: 1 });

  // 2. Store bytes
  emit(onProgress, { phase: 'store', ratio: 0 });
  await putFile(opfsPath, file);
  emit(onProgress, { phase: 'store', ratio: 1 });

  // Persist the Source record up front so the UI can show the file
  // even if embedding fails or the user reloads mid-way.
  const source: Source = {
    id: sourceId,
    workspaceId: opts.workspaceId,
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    byteSize: file.size,
    addedAt: Date.now(),
    originOpfsPath: opfsPath,
    parserVersion: PARSER_VERSION,
    meta: parsed.meta,
  };
  await putSource(source);

  // 3. Chunk
  emit(onProgress, { phase: 'chunk', ratio: 0 });
  const chunkResults = await chunkText(parsed.text, {
    chunkSize: opts.chunkSize,
    chunkOverlap: opts.chunkOverlap,
  });
  emit(onProgress, { phase: 'chunk', ratio: 1 });

  if (chunkResults.length === 0) {
    return { sourceId, chunksCreated: 0 };
  }

  // 4. Embed
  emit(onProgress, { phase: 'embed', ratio: 0 });
  const texts = chunkResults.map((c) => c.text);
  // For very large corpora, embed in pages so the progress bar
  // can advance; the model is loaded once and reused.
  const PAGE = 16;
  const embeddings: Float32Array[] = new Array(texts.length);
  for (let i = 0; i < texts.length; i += PAGE) {
    const end = Math.min(i + PAGE, texts.length);
    const batch = await embedBatch(texts.slice(i, end));
    for (let j = 0; j < batch.length; j += 1) {
      embeddings[i + j] = batch[j]!;
    }
    emit(onProgress, {
      phase: 'embed',
      ratio: end / texts.length,
    });
  }
  emit(onProgress, { phase: 'embed', ratio: 1 });

  // 5. Save chunks
  emit(onProgress, { phase: 'save', ratio: 0 });
  const chunks: Chunk[] = chunkResults.map((c, i) => ({
    id: uuidv4(),
    sourceId,
    workspaceId: opts.workspaceId,
    zoneId: null,
    position: i,
    text: c.text,
    embedding: embeddings[i]!,
    tokenCount: c.tokenCount,
  }));
  await putChunks(chunks);
  emit(onProgress, { phase: 'save', ratio: 1 });

  return { sourceId, chunksCreated: chunks.length };
}
