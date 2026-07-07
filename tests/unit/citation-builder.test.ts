// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Tests for the citation builder. Covers both numbered and inline
// modes plus the edge cases the spec calls out: quotes spanning line
// breaks, same quote appearing twice, overlapping matches.

import { describe, expect, it } from 'vitest';
import {
  buildCitations,
  segmentForRender,
} from '@/features/llm/citation-builder';
import type { Chunk } from '@/features/retrieval/types';

function makeChunk(overrides: Partial<Chunk> & { id: string; text: string }): Chunk {
  return {
    sourceId: overrides.sourceId ?? `src-${overrides.id}`,
    workspaceId: overrides.workspaceId ?? 'ws-1',
    zoneId: overrides.zoneId ?? null,
    position: overrides.position ?? 0,
    embedding: overrides.embedding ?? new Float32Array(0),
    tokenCount: overrides.tokenCount ?? 0,
    ...overrides,
  };
}

describe('buildCitations — numbered mode', () => {
  it('maps [1] [2] to chunks[0] and chunks[1]', () => {
    const chunks = [
      makeChunk({ id: 'c1', text: 'first chunk' }),
      makeChunk({ id: 'c2', text: 'second chunk' }),
    ];
    const answer = 'See [1] and [2] for context.';
    const citations = buildCitations(answer, { chunks }, 'numbered');
    expect(citations).toHaveLength(2);
    expect(citations[0]?.chunkId).toBe('c1');
    expect(citations[1]?.chunkId).toBe('c2');
    // The first citation must attach to the [1] token, not to 'See'.
    expect(answer.slice(citations[0]!.charStart, citations[0]!.charEnd)).toBe('[1]');
    expect(answer.slice(citations[1]!.charStart, citations[1]!.charEnd)).toBe('[2]');
  });

  it('silently ignores [N] for N out of range', () => {
    const chunks = [makeChunk({ id: 'c1', text: 'a' })];
    const answer = 'No citation here. [5] is out of range.';
    const citations = buildCitations(answer, { chunks }, 'numbered');
    expect(citations).toHaveLength(0);
  });

  it('returns no citations for empty input', () => {
    expect(buildCitations('', { chunks: [makeChunk({ id: 'c1', text: 'x' })] }, 'numbered')).toEqual(
      [],
    );
  });
});

describe('buildCitations — inline mode', () => {
  it('attaches a citation to each exact-quote occurrence', () => {
    const chunk = makeChunk({ id: 'c1', text: 'the key finding is X' });
    const answer =
      'According to the paper, the key finding is X is supported by later work.';
    const citations = buildCitations(answer, { chunks: [chunk] }, 'inline');
    expect(citations).toHaveLength(1);
    expect(citations[0]?.chunkId).toBe('c1');
    expect(citations[0]?.quote).toBe('the key finding is X');
    expect(answer.slice(citations[0]!.charStart, citations[0]!.charEnd)).toBe(
      'the key finding is X',
    );
  });

  it('quotes spanning a line break still match via whitespace normalization', () => {
    const chunk = makeChunk({
      id: 'c1',
      text: 'the first paragraph\nspans multiple\nlines of source text',
    });
    // The answer compresses the whitespace to a single space.
    const answer =
      'As the source says: the first paragraph spans multiple lines of source text is the relevant claim.';
    const citations = buildCitations(answer, { chunks: [chunk] }, 'inline');
    expect(citations).toHaveLength(1);
    expect(citations[0]?.chunkId).toBe('c1');
    // The `quote` field holds the original haystack slice (with the
    // compressed whitespace the model emitted), NOT the chunk's
    // multiline text.
    expect(citations[0]!.quote).toContain('the first paragraph spans multiple');
  });

  it('multiple chunks each contribute their own citations', () => {
    const a = makeChunk({ id: 'a', text: 'apple' });
    const b = makeChunk({ id: 'b', text: 'banana' });
    const answer = 'fruit: apple and banana';
    const citations = buildCitations(answer, { chunks: [a, b] }, 'inline');
    expect(citations).toHaveLength(2);
    const ids = citations.map((c) => c.chunkId).sort();
    expect(ids).toEqual(['a', 'b']);
  });

  it('the same quote appearing twice gets two citations', () => {
    // Per spec: "every claim gets a citation, every time it is made".
    const chunk = makeChunk({ id: 'c1', text: 'once said' });
    const answer = 'He once said this and once said that.';
    const citations = buildCitations(answer, { chunks: [chunk] }, 'inline');
    expect(citations).toHaveLength(2);
    expect(citations[0]!.charStart).toBeLessThan(citations[1]!.charStart);
    // Both quote positions point to non-overlapping substrings.
    expect(citations[0]!.charEnd).toBeLessThanOrEqual(citations[1]!.charStart);
  });

  it('overlapping matches keep the earlier one and drop the later', () => {
    const a = makeChunk({ id: 'a', text: 'foo bar' });
    const b = makeChunk({ id: 'b', text: 'foo bar baz' });
    // Both chunks can match the same span; the builder keeps the
    // earliest one so the renderer does not produce overlapping
    // spans.
    const answer = 'foo bar baz';
    const citations = buildCitations(answer, { chunks: [a, b] }, 'inline');
    expect(citations.length).toBeGreaterThan(0);
    for (let i = 1; i < citations.length; i += 1) {
      const prev = citations[i - 1]!;
      const cur = citations[i]!;
      expect(cur.charStart).toBeGreaterThanOrEqual(prev.charEnd);
    }
  });

  it('short chunk text (< 3 chars) is ignored', () => {
    const chunk = makeChunk({ id: 'c1', text: 'ab' });
    const answer = 'We see ab in the data.';
    const citations = buildCitations(answer, { chunks: [chunk] }, 'inline');
    expect(citations).toHaveLength(0);
  });

  it('returns no citations for empty chunks array', () => {
    expect(buildCitations('hello', { chunks: [] }, 'inline')).toEqual([]);
  });
});

describe('segmentForRender', () => {
  it('produces a partition of the answer text with no gaps or overlaps', () => {
    const a = makeChunk({ id: 'a', text: 'apple' });
    const b = makeChunk({ id: 'b', text: 'banana' });
    const answer = 'fruit: apple and banana';
    const citations = buildCitations(answer, { chunks: [a, b] }, 'inline');
    const segments = segmentForRender(answer, citations);
    const reconstructed = segments.map((s) => s.text).join('');
    expect(reconstructed).toBe(answer);
    // Verify the alternation: text, citation, text, citation.
    expect(segments.filter((s) => s.kind === 'citation')).toHaveLength(2);
    expect(segments.filter((s) => s.kind === 'text')).toHaveLength(2);
  });

  it('returns a single text segment when there are no citations', () => {
    const segs = segmentForRender('all plain text', []);
    expect(segs).toEqual([{ kind: 'text', text: 'all plain text' }]);
  });

  it('returns an empty array for an empty answer', () => {
    expect(segmentForRender('', [])).toEqual([]);
  });
});
