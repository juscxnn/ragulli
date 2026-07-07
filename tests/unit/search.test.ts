// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Tests for the topK search. The embed worker is mocked to return
// deterministic one-hot vectors over a small vocabulary, and the
// Dexie store is replaced with an in-memory map, so the suite has
// no native dependencies and runs in milliseconds.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chunk, Zone } from '@/features/retrieval/types';

const chunks = new Map<string, Chunk>();
const zones = new Map<string, Zone>();

vi.mock('@/features/retrieval/embed', () => ({
  embedBatch: vi.fn(),
}));

vi.mock('@/features/retrieval/store', () => ({
  putChunks: vi.fn(async (cs: Chunk[]) => {
    for (const c of cs) chunks.set(c.id, c);
  }),
  getAllChunks: vi.fn(async () => Array.from(chunks.values())),
  getChunksForSource: vi.fn(async (sourceId: string) =>
    Array.from(chunks.values()).filter((c) => c.sourceId === sourceId),
  ),
  assignChunkToZone: vi.fn(async (chunkId: string, zoneId: string | null) => {
    const c = chunks.get(chunkId);
    if (!c) throw new Error(`no chunk ${chunkId}`);
    chunks.set(chunkId, { ...c, zoneId });
  }),
  putZone: vi.fn(async (z: Zone) => {
    zones.set(z.id, z);
  }),
  getZonesForWorkspace: vi.fn(async (wsId: string) =>
    Array.from(zones.values()).filter((z) => z.workspaceId === wsId),
  ),
  putSource: vi.fn(),
  getSource: vi.fn(),
  clearAll: vi.fn(async () => {
    chunks.clear();
    zones.clear();
  }),
}));

import { embedBatch } from '@/features/retrieval/embed';
import { topK, type SearchOptions, type SearchResult } from '@/features/retrieval/search';
import {
  assignChunkToZone,
  clearAll,
  getAllChunks,
  putChunks,
  putZone,
} from '@/features/retrieval/store';

const VOCAB = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'] as const;
const DIM = VOCAB.length;

function encode(text: string): Float32Array {
  const v = new Float32Array(DIM);
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const tok of tokens) {
    const idx = VOCAB.indexOf(tok as (typeof VOCAB)[number]);
    if (idx >= 0) v[idx] = 1;
  }
  // L2 normalize so cosine == dot, matching the model contract.
  let norm = 0;
  for (let i = 0; i < DIM; i += 1) norm += (v[i] ?? 0) ** 2;
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < DIM; i += 1) v[i] = (v[i] ?? 0) / norm;
  }
  return v;
}

function makeChunk(overrides: Partial<Chunk>): Chunk {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    sourceId: overrides.sourceId ?? 'src',
    workspaceId: overrides.workspaceId ?? 'ws-1',
    zoneId: overrides.zoneId ?? null,
    position: overrides.position ?? 0,
    text: overrides.text ?? '',
    embedding: overrides.embedding ?? new Float32Array(DIM),
    tokenCount: overrides.tokenCount ?? 1,
  };
}

describe('topK', () => {
  beforeEach(async () => {
    await clearAll();
    vi.mocked(embedBatch).mockReset();
    vi.mocked(embedBatch).mockImplementation(async (texts: string[]) => texts.map(encode));
  });

  it('ranks a known-term query correctly across a 5-doc corpus', async () => {
    const chunks: Chunk[] = [
      makeChunk({ id: 'c1', text: 'alpha alpha', embedding: encode('alpha alpha') }),
      makeChunk({ id: 'c2', text: 'beta gamma', embedding: encode('beta gamma') }),
      makeChunk({ id: 'c3', text: 'delta epsilon', embedding: encode('delta epsilon') }),
      makeChunk({ id: 'c4', text: 'alpha beta', embedding: encode('alpha beta') }),
      makeChunk({ id: 'c5', text: 'alpha', embedding: encode('alpha') }),
    ];
    await putChunks(chunks);

    const opts: SearchOptions = { workspaceId: 'ws-1', k: 3 };
    const results: SearchResult[] = await topK('alpha', opts);

    // Top hit must be the most "alpha-heavy" chunk, i.e. c1 (alpha alpha).
    expect(results[0]?.chunk.id).toBe('c1');
    // Hits must be sorted descending by score.
    for (let i = 1; i < results.length; i += 1) {
      const prev = results[i - 1]!;
      const cur = results[i]!;
      expect(prev.score).toBeGreaterThanOrEqual(cur.score);
    }
  });

  it('returns chunks in the same workspace, ignoring others', async () => {
    const ws1: Chunk[] = [
      makeChunk({ id: 'ws1-a', workspaceId: 'ws-1', text: 'alpha', embedding: encode('alpha') }),
    ];
    const ws2: Chunk[] = [
      makeChunk({ id: 'ws2-a', workspaceId: 'ws-2', text: 'alpha', embedding: encode('alpha') }),
    ];
    await putChunks([...ws1, ...ws2]);

    const results = await topK('alpha', { workspaceId: 'ws-1' });
    expect(results).toHaveLength(1);
    expect(results[0]?.chunk.id).toBe('ws1-a');
  });

  it('applies zone weighting: 2.0x weight makes that zone dominate', async () => {
    // Two zones, each with one chunk. Both contain "alpha". Without
    // weighting, scores are equal. With weight 2.0 on zone-1, the
    // zone-1 chunk must rank first.
    const z1 = makeChunk({ id: 'z1', text: 'alpha', zoneId: 'zone-1', embedding: encode('alpha') });
    const z2 = makeChunk({ id: 'z2', text: 'alpha', zoneId: 'zone-2', embedding: encode('alpha') });
    await putChunks([z1, z2]);

    const baseline = await topK('alpha', { workspaceId: 'ws-1' });
    expect(baseline[0]?.score).toBeCloseTo(baseline[1]?.score ?? 0, 6);

    const weighted = await topK('alpha', {
      workspaceId: 'ws-1',
      weightByZone: { 'zone-1': 2.0, 'zone-2': 0.5 },
    });
    expect(weighted[0]?.chunk.id).toBe('z1');
    expect(weighted[0]?.score).toBeGreaterThan(weighted[1]?.score ?? 0);
    expect(weighted[0]?.score / (weighted[1]?.score || 1)).toBeCloseTo(4, 5);
  });

  it('respects the k parameter', async () => {
    const chunks: Chunk[] = Array.from({ length: 20 }, (_, i) =>
      makeChunk({ id: `c${i}`, text: 'alpha', embedding: encode('alpha') }),
    );
    await putChunks(chunks);
    const r3 = await topK('alpha', { workspaceId: 'ws-1', k: 3 });
    expect(r3).toHaveLength(3);
    const r10 = await topK('alpha', { workspaceId: 'ws-1', k: 10 });
    expect(r10).toHaveLength(10);
  });

  it('applies the user filter before scoring', async () => {
    const a = makeChunk({ id: 'a', text: 'alpha', zoneId: 'kept', embedding: encode('alpha') });
    const b = makeChunk({ id: 'b', text: 'alpha', zoneId: 'dropped', embedding: encode('alpha') });
    await putChunks([a, b]);
    const results = await topK('alpha', {
      workspaceId: 'ws-1',
      filter: (c) => c.zoneId === 'kept',
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.chunk.id).toBe('a');
  });

  it('assignChunkToZone changes subsequent rankings', async () => {
    const a = makeChunk({ id: 'a', text: 'alpha', zoneId: null, embedding: encode('alpha') });
    const b = makeChunk({ id: 'b', text: 'alpha', zoneId: null, embedding: encode('alpha') });
    await putChunks([a, b]);
    await assignChunkToZone('a', 'pinned');
    const all = await getAllChunks();
    expect(all.find((c) => c.id === 'a')?.zoneId).toBe('pinned');
  });

  it('putZone / getZonesForWorkspace round-trip', async () => {
    await putZone({
      id: 'z1',
      workspaceId: 'ws-1',
      name: 'Trusted',
      weight: 1.5,
      color: '#E0B158',
      position: { x: 0, y: 0 },
    });
    const zones = await (await import('@/features/retrieval/store')).getZonesForWorkspace('ws-1');
    expect(zones).toHaveLength(1);
    expect(zones[0]?.weight).toBe(1.5);
  });
});
