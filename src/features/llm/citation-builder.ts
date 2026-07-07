// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Citation builder. Given the source chunks used as context, attach
// citation markers to the assistant's streamed answer.
//
// Two modes per spec §7.3:
//   - 'numbered': the model emits `[1]`, `[2]`, ... against the
//     context list. We map each `[N]` to the chunk at index N-1.
//   - 'inline'  (default for V1): the model is instructed to embed
//     exact quotes from the chunks. We scan the answer text for
//     exact substring matches against chunk text. No fuzzy matching.
//     When a quote spans a line break, we normalize whitespace
//     before matching.
//
// The renderer hook `segmentForRender` turns a final `BuiltCitation[]`
// into a flat list of text/citation segments Subagent D's chat
// panel can render directly.

import type { Chunk } from '@/features/retrieval/types';

export interface CitationContext {
  chunks: Chunk[];
}

export interface BuiltCitation {
  chunkId: string;
  sourceId: string;
  /** The exact substring of `answerText` that anchors the citation. */
  quote: string;
  charStart: number;
  charEnd: number;
}

export type CitationMode = 'numbered' | 'inline';

export interface RenderSegment {
  kind: 'text' | 'citation';
  text: string;
  citation?: BuiltCitation;
}

/**
 * Find every citation in `answerText`. The order in the returned
 * array is the order they appear in the answer, and the indices
 * uniquely identify a citation span.
 *
 * For `inline` mode: if the exact quote appears more than once,
 * attach a separate citation to EACH occurrence. This matches user
 * expectation that "every claim gets a citation, every time it is
 * made" beats "only the first occurrence gets a citation".
 */
export function buildCitations(
  answerText: string,
  ctx: CitationContext,
  mode: CitationMode,
): BuiltCitation[] {
  if (!answerText) return [];
  if (ctx.chunks.length === 0) return [];

  if (mode === 'numbered') {
    return buildNumberedCitations(answerText, ctx);
  }
  return buildInlineCitations(answerText, ctx);
}

function buildNumberedCitations(answerText: string, ctx: CitationContext): BuiltCitation[] {
  // Pattern matches `[N]` (and tolerates `[N][M]` adjacent). We do
  // not consume more than one number per loop iteration so adjacent
  // markers generate two separate citations.
  const re = /\[(\d+)\]/g;
  const out: BuiltCitation[] = [];
  const seen = new Set<string>();
  for (const m of answerText.matchAll(re)) {
    const idxStr = m[1];
    if (!idxStr) continue;
    const n = parseInt(idxStr, 10);
    if (Number.isNaN(n) || n < 1 || n > ctx.chunks.length) continue;
    const chunk = ctx.chunks[n - 1];
    if (!chunk) continue;
    const key = `n-${n}-${m.index}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      chunkId: chunk.id,
      sourceId: chunk.sourceId,
      quote: `[${idxStr}]`,
      charStart: m.index ?? 0,
      charEnd: (m.index ?? 0) + m[0].length,
    });
  }
  return out;
}

function buildInlineCitations(answerText: string, ctx: CitationContext): BuiltCitation[] {
  // We collect every (chunkId, sourceId, charStart, charEnd, quote)
  // match for every chunk, then merge overlapping spans preferring
  // the longer match.
  const raw: BuiltCitation[] = [];
  for (const chunk of ctx.chunks) {
    raw.push(...findAllOccurrences(answerText, chunk));
  }
  raw.sort((a, b) => a.charStart - b.charStart);

  // Merge overlapping spans. If two spans overlap, keep the first
  // (earlier) one. We do not merge across chunks; we just drop
  // overlapping later matches.
  const merged: BuiltCitation[] = [];
  for (const c of raw) {
    const last = merged[merged.length - 1];
    if (last && c.charStart < last.charEnd) {
      continue;
    }
    merged.push(c);
  }
  return merged;
}

/**
 * Find every occurrence of `chunk.text` (or any whitespace-normalized
 * variant) inside `haystack`. Returns citations with character
 * indices into the original `haystack`.
 */
function findAllOccurrences(haystack: string, chunk: Chunk): BuiltCitation[] {
  const out: BuiltCitation[] = [];
  const text = chunk.text;
  if (!text || text.length < 3) return out;

  // Direct substring matches first.
  let from = 0;
  while (true) {
    const at = haystack.indexOf(text, from);
    if (at === -1) break;
    out.push({
      chunkId: chunk.id,
      sourceId: chunk.sourceId,
      quote: text,
      charStart: at,
      charEnd: at + text.length,
    });
    from = at + text.length;
    if (from > haystack.length) break;
  }

  // Whitespace-normalized fallback: collapse runs of whitespace
  // (including newlines) to a single space in BOTH the haystack and
  // the chunk text, then look for matches. Only worth doing when
  // either side has runs of whitespace that the other could be
  // matching against. The output `quote` is the original haystack
  // slice, with whatever whitespace the model emitted.
  const haystackHasRuns = /\s{2,}|\n|\t/.test(haystack);
  const textHasRuns = /\s{2,}|\n|\t/.test(text);
  if (!haystackHasRuns && !textHasRuns) return out;

  const normHaystack = haystack.replace(/\s+/g, ' ');
  const normText = text.replace(/\s+/g, ' ');
  let nFrom = 0;
  while (true) {
    const at = normHaystack.indexOf(normText, nFrom);
    if (at === -1) break;
    if (!overlapsExisting(out, at, at + normText.length)) {
      out.push({
        chunkId: chunk.id,
        sourceId: chunk.sourceId,
        quote: haystack.slice(at, at + normText.length),
        charStart: at,
        charEnd: at + normText.length,
      });
    }
    nFrom = at + normText.length;
    if (nFrom > normHaystack.length) break;
  }

  return out;
}

function overlapsExisting(
  list: BuiltCitation[],
  start: number,
  end: number,
): boolean {
  for (const c of list) {
    if (c.charStart < end && c.charEnd > start) return true;
  }
  return false;
}

/**
 * Slice `answerText` into alternating text/citation segments the
 * chat panel can render directly. Text between citations is emitted
 * as a `text` segment; each citation span becomes a `citation`
 * segment whose `citation` field carries its chunk/source pointers.
 *
 * The citations MUST be in ascending `charStart` order and MUST
 * NOT overlap (buildCitations guarantees both). The output array
 * is a partition of the input text with no overlaps.
 */
export function segmentForRender(
  answerText: string,
  citations: BuiltCitation[],
): RenderSegment[] {
  if (citations.length === 0) {
    if (answerText === '') return [];
    return [{ kind: 'text', text: answerText }];
  }

  const out: RenderSegment[] = [];
  let cursor = 0;
  for (const c of citations) {
    if (c.charStart > cursor) {
      out.push({ kind: 'text', text: answerText.slice(cursor, c.charStart) });
    }
    out.push({
      kind: 'citation',
      text: answerText.slice(c.charStart, c.charEnd),
      citation: c,
    });
    cursor = c.charEnd;
  }
  if (cursor < answerText.length) {
    out.push({ kind: 'text', text: answerText.slice(cursor) });
  }
  return out;
}
