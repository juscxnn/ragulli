// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Citation builder. Given the chunks used as context, slice the
// assistant's answer into spans that map back to the chunk that contains
// the quoted text. No fuzzy matching — exact substring slicing.

import type { Citation } from '@/features/retrieval/types';
import type { Chunk } from '@/features/retrieval/types';

export type CitationMap = {
  citations: Citation[];
  annotated: string;
};

export function buildCitations(answer: string, chunks: Chunk[]): CitationMap {
  // Placeholder: return the answer untouched. Subagent C replaces with
  // the real substring-scan implementation.
  void chunks;
  void answer;
  return { citations: [], annotated: '' };
}
