// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Sliding-window chunker. We tokenize the input with the same
// tokenizer used by the embedding model (Xenova/bge-small-en-v1.5) and
// then advance a window of (chunkSize - chunkOverlap) tokens over the
// sequence. Each window is decoded back to a string and returned with
// its true token count. Empty input returns an empty array; tiny
// input returns a single chunk; very large input produces N chunks in
// one pass (we never hold duplicate copies of the token array).

import { AutoTokenizer, type PreTrainedTokenizer } from '@huggingface/transformers';

export interface ChunkOptions {
  /** Maximum number of tokens per chunk. Must be > 0. */
  chunkSize: number;
  /** Number of tokens shared between adjacent chunks. Must be in [0, chunkSize). */
  chunkOverlap: number;
}

export interface ChunkResult {
  text: string;
  tokenCount: number;
}

const TOKENIZER_NAME = 'Xenova/bge-small-en-v1.5';

let cachedTokenizer: PreTrainedTokenizer | null = null;
let tokenizerPromise: Promise<PreTrainedTokenizer> | null = null;

/**
 * Lazily load and cache the BGE tokenizer. Subsequent calls return the
 * same instance so the model is downloaded only once per tab.
 */
export async function getTokenizer(): Promise<PreTrainedTokenizer> {
  if (cachedTokenizer) return cachedTokenizer;
  if (!tokenizerPromise) {
    tokenizerPromise = AutoTokenizer.from_pretrained(TOKENIZER_NAME).then((tok) => {
      cachedTokenizer = tok;
      return tok;
    });
  }
  return tokenizerPromise;
}

/** Test-only: replace the cached tokenizer (and its pending load). */
export function _setTokenizerForTests(tok: PreTrainedTokenizer | null): void {
  cachedTokenizer = tok;
  tokenizerPromise = tok ? Promise.resolve(tok) : null;
}

function validateOptions(opts: ChunkOptions): void {
  if (!Number.isFinite(opts.chunkSize) || opts.chunkSize <= 0) {
    throw new Error(`chunkSize must be a positive number, got ${opts.chunkSize}`);
  }
  if (!Number.isFinite(opts.chunkOverlap) || opts.chunkOverlap < 0) {
    throw new Error(`chunkOverlap must be >= 0, got ${opts.chunkOverlap}`);
  }
  if (opts.chunkOverlap >= opts.chunkSize) {
    throw new Error(`chunkOverlap (${opts.chunkOverlap}) must be < chunkSize (${opts.chunkSize})`);
  }
}

export async function chunkText(text: string, opts: ChunkOptions): Promise<ChunkResult[]> {
  validateOptions(opts);
  if (text.length === 0) return [];

  const tokenizer = await getTokenizer();
  const tokenIds = tokenizer.encode(text, { add_special_tokens: false });
  if (tokenIds.length === 0) return [];

  const step = opts.chunkSize - opts.chunkOverlap;
  const chunks: ChunkResult[] = [];
  for (let start = 0; start < tokenIds.length; start += step) {
    const end = Math.min(start + opts.chunkSize, tokenIds.length);
    const sliceIds = tokenIds.slice(start, end);
    const sliceText = tokenizer.decode(sliceIds, { skip_special_tokens: true });
    chunks.push({ text: sliceText, tokenCount: sliceIds.length });
    if (end >= tokenIds.length) break;
  }
  return chunks;
}
