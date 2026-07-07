// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Extractive answers for the no-key path. When the active provider
// needs a BYOK key and none is saved, we do not error out — we run
// the same local retrieval and compose an honest, quoted answer from
// the top passages. Because we build the content string ourselves we
// know the exact char offsets of every quote, so each passage gets a
// real clickable citation without any model in the loop.

import { v4 as uuidv4 } from 'uuid';
import type { Citation } from '@/features/retrieval/types';
import type { SearchResult } from '@/features/retrieval/search';

export const EXTRACTIVE_LEAD_IN =
  'No model is connected, so this is local retrieval only — the most relevant passages from your sources:';

export const EXTRACTIVE_FOOTER =
  'For a synthesized answer, add an API key or pick the in-browser model in Settings.';

export const EXTRACTIVE_EMPTY =
  'No model is connected, and local retrieval found nothing relevant in your sources. Try rephrasing the question, or add an API key in Settings for synthesized answers.';

/** Max passages quoted in an extractive answer. */
const MAX_PASSAGES = 4;

/** Max characters per quoted passage; cut at a word boundary. */
const MAX_EXCERPT = 320;

export interface ExtractiveAnswer {
  content: string;
  citations: Citation[];
}

/**
 * Compose the extractive answer. `filenameFor` resolves a sourceId to
 * a display name for the per-passage attribution line.
 */
export function composeExtractiveAnswer(
  hits: SearchResult[],
  filenameFor: (sourceId: string) => string,
): ExtractiveAnswer {
  const top = hits.slice(0, MAX_PASSAGES);
  if (top.length === 0) {
    return { content: EXTRACTIVE_EMPTY, citations: [] };
  }

  let content = EXTRACTIVE_LEAD_IN;
  const citations: Citation[] = [];

  for (const hit of top) {
    const excerpt = excerptOf(hit.chunk.text);
    if (excerpt.length === 0) continue;
    content += `\n\n${citations.length + 1}. "`;
    const charStart = content.length;
    content += excerpt;
    const charEnd = content.length;
    content += `" — ${filenameFor(hit.chunk.sourceId)}`;
    citations.push({
      id: uuidv4(),
      chunkId: hit.chunk.id,
      sourceId: hit.chunk.sourceId,
      charStart,
      charEnd,
    });
  }

  if (citations.length === 0) {
    return { content: EXTRACTIVE_EMPTY, citations: [] };
  }
  content += `\n\n${EXTRACTIVE_FOOTER}`;
  return { content, citations };
}

/** Trim and cap a chunk's text at a word boundary. */
function excerptOf(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_EXCERPT) return trimmed;
  const cut = trimmed.slice(0, MAX_EXCERPT);
  const lastSpace = cut.lastIndexOf(' ');
  const bounded = lastSpace > MAX_EXCERPT / 2 ? cut.slice(0, lastSpace) : cut;
  return `${bounded}…`;
}
