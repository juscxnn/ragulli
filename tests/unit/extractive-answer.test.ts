// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Unit tests for the no-key extractive answer composer. The
// contract that matters: every citation's [charStart, charEnd)
// slice of the composed content must be exactly the quoted passage,
// so the chat panel's citation spans are clickable and truthful.

import { describe, expect, it } from 'vitest';
import {
  composeExtractiveAnswer,
  EXTRACTIVE_EMPTY,
  EXTRACTIVE_FOOTER,
  EXTRACTIVE_LEAD_IN,
} from '@/features/workspace/chat/extractive';
import type { SearchResult } from '@/features/retrieval/search';
import type { Chunk } from '@/features/retrieval/types';

function makeHit(id: string, sourceId: string, text: string, score = 0.5): SearchResult {
  const chunk: Chunk = {
    id,
    sourceId,
    workspaceId: 'ws-1',
    zoneId: null,
    position: 0,
    text,
    embedding: new Float32Array(4),
    tokenCount: text.split(/\s+/).length,
  };
  return { chunk, score };
}

const filenameFor = (sourceId: string): string =>
  sourceId === 's-1' ? 'paper.pdf' : 'notes.md';

describe('composeExtractiveAnswer', () => {
  it('returns the honest empty message when there are no hits', () => {
    const { content, citations } = composeExtractiveAnswer([], filenameFor);
    expect(content).toBe(EXTRACTIVE_EMPTY);
    expect(citations).toHaveLength(0);
  });

  it('quotes each passage and every citation span slices back to it', () => {
    const hits = [
      makeHit('c1', 's-1', 'The sliding window chunker preserves overlap.'),
      makeHit('c2', 's-2', 'Zones weight retrieval by trust level.'),
    ];
    const { content, citations } = composeExtractiveAnswer(hits, filenameFor);

    expect(content.startsWith(EXTRACTIVE_LEAD_IN)).toBe(true);
    expect(content.endsWith(EXTRACTIVE_FOOTER)).toBe(true);
    expect(citations).toHaveLength(2);

    // The load-bearing invariant: content.slice(charStart, charEnd)
    // is the exact quoted passage.
    expect(content.slice(citations[0]!.charStart, citations[0]!.charEnd)).toBe(
      'The sliding window chunker preserves overlap.',
    );
    expect(content.slice(citations[1]!.charStart, citations[1]!.charEnd)).toBe(
      'Zones weight retrieval by trust level.',
    );

    // Chunk and source pointers survive.
    expect(citations[0]!.chunkId).toBe('c1');
    expect(citations[0]!.sourceId).toBe('s-1');
    expect(citations[1]!.chunkId).toBe('c2');
    expect(citations[1]!.sourceId).toBe('s-2');

    // Attribution names the file.
    expect(content).toContain('paper.pdf');
    expect(content).toContain('notes.md');
  });

  it('caps at four passages', () => {
    const hits = Array.from({ length: 6 }, (_, i) =>
      makeHit(`c${i}`, 's-1', `Distinct passage number ${i} with unique words.`),
    );
    const { citations } = composeExtractiveAnswer(hits, filenameFor);
    expect(citations).toHaveLength(4);
  });

  it('trims long passages at a word boundary and keeps the span truthful', () => {
    const long = `${'alpha beta gamma delta '.repeat(30)}omega`;
    const hits = [makeHit('c1', 's-1', long)];
    const { content, citations } = composeExtractiveAnswer(hits, filenameFor);
    const quoted = content.slice(citations[0]!.charStart, citations[0]!.charEnd);
    expect(quoted.length).toBeLessThanOrEqual(321);
    expect(quoted.endsWith('…')).toBe(true);
    // No mid-word cut: the character before the ellipsis is not a space
    // and the excerpt is a prefix of the original text.
    expect(long.startsWith(quoted.slice(0, -1))).toBe(true);
  });

  it('skips whitespace-only chunks without emitting empty quotes', () => {
    const hits = [makeHit('c1', 's-1', '   \n  '), makeHit('c2', 's-2', 'Real content here.')];
    const { content, citations } = composeExtractiveAnswer(hits, filenameFor);
    expect(citations).toHaveLength(1);
    expect(content.slice(citations[0]!.charStart, citations[0]!.charEnd)).toBe(
      'Real content here.',
    );
  });
});
