// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Tests for the sliding-window chunker. We mock the AutoTokenizer via
// the test hook so the suite runs in milliseconds with no network.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  _setTokenizerForTests,
  chunkText,
  type ChunkResult,
} from '@/features/ingest/chunker';
import type { PreTrainedTokenizer } from '@huggingface/transformers';

type FakeTokenizer = Pick<PreTrainedTokenizer, 'encode' | 'decode'>;

function makeFakeTokenizer(overrides?: Partial<FakeTokenizer>): PreTrainedTokenizer {
  const encode = (text: string): number[] => {
    // One token per whitespace-delimited word. Add a final sentinel
    // so the decoder can join the tokens back with spaces.
    const words = text.split(/\s+/).filter(Boolean);
    return words.map((_, i) => i + 1);
  };
  const decode = (ids: ArrayLike<number | bigint>): string => {
    const parts: string[] = [];
    for (let i = 0; i < ids.length; i += 1) {
      parts.push(`t${ids[i]}`);
    }
    return parts.join(' ');
  };
  const base: FakeTokenizer = { encode, decode };
  const merged = { ...base, ...overrides };
  return merged as unknown as PreTrainedTokenizer;
}

describe('chunkText', () => {
  beforeEach(() => {
    _setTokenizerForTests(makeFakeTokenizer());
  });
  afterEach(() => {
    _setTokenizerForTests(null);
  });

  it('returns [] for empty input', async () => {
    const out: ChunkResult[] = await chunkText('', { chunkSize: 4, chunkOverlap: 1 });
    expect(out).toEqual([]);
  });

  it('returns a single chunk for tiny input (< chunkSize)', async () => {
    const out = await chunkText('a b c', { chunkSize: 10, chunkOverlap: 2 });
    expect(out).toHaveLength(1);
    expect(out[0]?.tokenCount).toBe(3);
    expect(out[0]?.text).toBe('t1 t2 t3');
  });

  it('returns one chunk when input is exactly chunkSize', async () => {
    const out = await chunkText('a b c d e', { chunkSize: 5, chunkOverlap: 1 });
    expect(out).toHaveLength(1);
    expect(out[0]?.tokenCount).toBe(5);
  });

  it('produces overlapping chunks for medium input', async () => {
    // 8 tokens, chunkSize=5, overlap=2, step=3
    // chunk 1: tokens 0..4 (t1 t2 t3 t4 t5)
    // chunk 2: tokens 3..7 (t4 t5 t6 t7 t8)
    const out = await chunkText('a b c d e f g h', { chunkSize: 5, chunkOverlap: 2 });
    expect(out).toHaveLength(2);
    expect(out[0]?.tokenCount).toBe(5);
    expect(out[1]?.tokenCount).toBe(5);
    expect(out[0]?.text).toBe('t1 t2 t3 t4 t5');
    expect(out[1]?.text).toBe('t4 t5 t6 t7 t8');
  });

  it('produces a short final chunk when input is not a multiple of step', async () => {
    // 7 tokens, chunkSize=5, overlap=2, step=3
    // chunk 1: tokens 0..4 (5)
    // chunk 2: tokens 3..6 (4) — short final
    const out = await chunkText('a b c d e f g', { chunkSize: 5, chunkOverlap: 2 });
    expect(out).toHaveLength(2);
    expect(out[0]?.tokenCount).toBe(5);
    expect(out[1]?.tokenCount).toBe(4);
  });

  it('handles large files (1MB+) by streaming through the token array once', async () => {
    // Build a ~1.2 MB text of 200k tokens (each token ~6 chars).
    const tokens: string[] = [];
    for (let i = 0; i < 200_000; i += 1) tokens.push(`tok${i}`);
    const big = tokens.join(' ');
    expect(big.length).toBeGreaterThan(1_000_000);

    const encode = (text: string): number[] => text.split(/\s+/).filter(Boolean).length
      ? Array.from({ length: text.split(/\s+/).filter(Boolean).length }, (_, i) => i + 1)
      : [];
    _setTokenizerForTests(makeFakeTokenizer({ encode }));
    const out = await chunkText(big, { chunkSize: 800, chunkOverlap: 100 });
    // step = 700, so number of chunks = ceil(200000 / 700) = 286
    expect(out.length).toBeGreaterThanOrEqual(285);
    expect(out.length).toBeLessThanOrEqual(287);
    // First chunk is full size, last chunk may be partial.
    expect(out[0]?.tokenCount).toBe(800);
    const last = out[out.length - 1];
    expect(last?.tokenCount).toBeLessThanOrEqual(800);
    expect(last?.tokenCount).toBeGreaterThan(0);
  });

  it('throws when chunkOverlap >= chunkSize', async () => {
    await expect(chunkText('hello world', { chunkSize: 4, chunkOverlap: 4 })).rejects.toThrow();
    await expect(
      chunkText('hello world', { chunkSize: 4, chunkOverlap: 10 }),
    ).rejects.toThrow();
  });

  it('throws when chunkSize is non-positive', async () => {
    await expect(chunkText('x', { chunkSize: 0, chunkOverlap: 0 })).rejects.toThrow();
    await expect(chunkText('x', { chunkSize: -1, chunkOverlap: 0 })).rejects.toThrow();
  });
});
