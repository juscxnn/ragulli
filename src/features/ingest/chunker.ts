// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Sliding-window chunker. Subagent B fills in the real implementation;
// we keep the public shape stable so callers can typecheck today.

export type ChunkerOptions = {
  chunkSize: number; // tokens
  chunkOverlap: number; // tokens
};

export type Chunk = {
  text: string;
  tokenCount: number;
  position: number;
};

export function chunkText(text: string, _options: ChunkerOptions): Chunk[] {
  // Placeholder: return the whole text as a single chunk. Subagent B
  // replaces this with a token-aware sliding window.
  return [{ text, tokenCount: Math.ceil(text.length / 4), position: 0 }];
}
