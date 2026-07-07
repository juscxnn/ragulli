// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Pipeline integration test. We exercise `ingestFile` end-to-end
// against a plain-text input (which works in jsdom) and skip the
// PDF integration because pdfjs-dist v5 needs browser globals that
// jsdom does not provide. The PDF path is covered in the Playwright
// suite (Subagent F) where a real browser is available.

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chunk, Source } from '@/features/retrieval/types';

const sources = new Map<string, Source>();
const chunks = new Map<string, Chunk>();

vi.mock('@/features/retrieval/store', () => ({
  putSource: vi.fn(async (s: Source) => {
    sources.set(s.id, s);
  }),
  putChunks: vi.fn(async (cs: Chunk[]) => {
    for (const c of cs) chunks.set(c.id, c);
  }),
  getAllChunks: vi.fn(async () => Array.from(chunks.values())),
  getChunksForSource: vi.fn(async (sid: string) =>
    Array.from(chunks.values()).filter((c) => c.sourceId === sid),
  ),
  getSource: vi.fn(async (id: string) => sources.get(id)),
  listSources: vi.fn(async () => Array.from(sources.values())),
  putZone: vi.fn(),
  getZonesForWorkspace: vi.fn(async () => []),
  assignChunkToZone: vi.fn(),
  clearAll: vi.fn(async () => {
    sources.clear();
    chunks.clear();
  }),
}));

vi.mock('@/features/retrieval/embed', () => ({
  embedBatch: vi.fn(async (texts: string[]) =>
    texts.map((t) => {
      // Deterministic 8-dim one-hot over the first character; only
      // shape matters here, not the math.
      const v = new Float32Array(8);
      v[t.charCodeAt(0) % 8] = 1;
      return v;
    }),
  ),
}));

vi.mock('@/features/ingest/chunker', async () => {
  // Real chunker uses the real BGE tokenizer which would download
  // a model; for the orchestrator test we replace it with a
  // whitespace splitter. The chunker has its own dedicated test
  // suite (tests/unit/chunker.test.ts) using a fake tokenizer.
  return {
    chunkText: vi.fn(async (text: string) => {
      const tokens = text.split(/\s+/).filter(Boolean);
      if (tokens.length === 0) return [];
      // Two short chunks, simulating a small document.
      const mid = Math.ceil(tokens.length / 2);
      return [
        { text: tokens.slice(0, mid).join(' '), tokenCount: mid },
        { text: tokens.slice(mid).join(' '), tokenCount: tokens.length - mid },
      ];
    }),
  };
});

import { ingestFile } from '@/features/ingest/pipeline';
import type { ProgressEvent } from '@/features/ingest/types';

function makeFile(name: string, body: string, mime = 'text/plain'): File {
  return new File([body], name, { type: mime });
}

describe('ingestFile orchestrator (plain text)', () => {
  beforeEach(() => {
    sources.clear();
    chunks.clear();
    vi.clearAllMocks();
  });

  it('runs parse -> store -> chunk -> embed -> save and emits all five phases', async () => {
    const body = 'one two three four five six seven eight';
    const file = makeFile('note.txt', body);
    const events: ProgressEvent[] = [];
    const onProgress = (e: ProgressEvent) => {
      events.push(e);
    };

    const result = await ingestFile(
      file,
      { workspaceId: 'ws-1', chunkSize: 4, chunkOverlap: 1 },
      onProgress,
    );

    expect(result.sourceId).toMatch(/[0-9a-f-]{36}/);
    expect(result.chunksCreated).toBe(2);

    // Every phase must have been entered.
    const phases = new Set(events.map((e) => e.phase));
    expect(phases).toEqual(new Set(['parse', 'store', 'chunk', 'embed', 'save']));

    // The Source was persisted.
    const source = sources.get(result.sourceId);
    expect(source).toBeDefined();
    expect(source?.filename).toBe('note.txt');
    expect(source?.workspaceId).toBe('ws-1');
    expect(source?.byteSize).toBe(file.size);
    expect(source?.originOpfsPath).toBe(`ragulli-files/${result.sourceId}`);

    // Both chunks were persisted.
    const stored = Array.from(chunks.values()).filter(
      (c) => c.sourceId === result.sourceId,
    );
    expect(stored).toHaveLength(2);
    for (const c of stored) {
      expect(c.workspaceId).toBe('ws-1');
      expect(c.zoneId).toBeNull();
      expect(c.embedding.length).toBe(8);
      expect(c.position).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns chunksCreated=0 for an empty file', async () => {
    const file = makeFile('empty.txt', '');
    const result = await ingestFile(file, {
      workspaceId: 'ws-1',
      chunkSize: 4,
      chunkOverlap: 0,
    });
    expect(result.chunksCreated).toBe(0);
    expect(sources.get(result.sourceId)).toBeDefined();
  });
});

describe('ingestFile against sample-paper.pdf', () => {
  it('parses, chunks, and embeds the real sample PDF', async () => {
    const path = resolve(process.cwd(), 'public/sample-files/sample-paper.pdf');
    const bytes = await readFile(path);
    const file = new File([new Uint8Array(bytes)], 'sample-paper.pdf', {
      type: 'application/pdf',
    });
    const result = await ingestFile(file, {
      workspaceId: 'ws-1',
      chunkSize: 80,
      chunkOverlap: 10,
    });
    expect(result.chunksCreated).toBeGreaterThan(0);
  });
});
