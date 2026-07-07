// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Cosine-similarity top-k search. Embeddings are L2-normalized at
// the model layer (`pooling: 'mean', normalize: true`) so cosine
// similarity reduces to a dot product. We do a single full scan of
// the chunk table per query; this is O(N) per query and fine for V1
// (N <= a few thousand chunks per workspace). For larger corpora
// we will add an HNSW index behind the same interface.

import type { Chunk } from './types';
import { embedBatch } from './embed';
import { getAllChunks } from './store';

export interface SearchOptions {
  /** Number of hits to return. Defaults to 8. */
  k?: number;
  /** Workspace the chunks must belong to. */
  workspaceId: string;
  /** Per-zone multiplicative weight (default 1.0 for unzoned). */
  weightByZone?: Record<string, number>;
  /** Caller-supplied predicate applied before scoring. */
  filter?: (chunk: Chunk) => boolean;
}

export interface SearchResult {
  chunk: Chunk;
  score: number;
}

function dotProduct(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i += 1) {
    s += (a[i] ?? 0) * (b[i] ?? 0);
  }
  return s;
}

export async function topK(query: string, opts: SearchOptions): Promise<SearchResult[]> {
  const k = opts.k ?? 8;
  const [queryVec] = await embedBatch([query]);
  if (!queryVec) return [];

  const all = await getAllChunks();
  const inWorkspace = all.filter((c) => c.workspaceId === opts.workspaceId);
  const candidates = opts.filter ? inWorkspace.filter(opts.filter) : inWorkspace;

  const scored: SearchResult[] = new Array(candidates.length);
  for (let i = 0; i < candidates.length; i += 1) {
    const c = candidates[i]!;
    const base = dotProduct(queryVec, c.embedding);
    const weight = c.zoneId === null ? 1.0 : opts.weightByZone?.[c.zoneId] ?? 1.0;
    scored[i] = { chunk: c, score: base * weight };
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
