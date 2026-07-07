// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// CitationSpan — the clickable inline span that opens the source view at
// the cited offset. Subagent D wires the navigation.

import type { FC } from 'react';
import type { Citation } from '@/features/retrieval/types';

export type CitationSpanProps = {
  citation: Citation;
  children: string;
  onOpen: (citation: Citation) => void;
};

export const CitationSpan: FC<CitationSpanProps> = ({ children, onOpen, citation }) => (
  <button
    type="button"
    onClick={() => onOpen(citation)}
    className="underline decoration-[var(--color-accent)] decoration-dotted underline-offset-4 hover:decoration-solid"
    data-citation-id={citation.id}
  >
    {children}
  </button>
);
