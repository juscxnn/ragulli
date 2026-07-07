// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Cosine-similarity top-k search. Subagent B implements the real version;
// we keep a stable typecheck surface for callers.

import type { SearchHit, TopKOptions } from './types';
import { embedTexts } from './embed';

export async function topK(query: string, options: TopKOptions = {}): Promise<SearchHit[]> {
  // Placeholder: throw until Subagent B wires the real search.
  void options;
  void query;
  void embedTexts;
  throw new Error('topK not yet wired. Subagent B owns this.');
}
