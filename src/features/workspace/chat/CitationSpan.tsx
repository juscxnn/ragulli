// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// CitationSpan — the clickable inline span that opens the source
// viewer at the cited offset. Carries the chunk id and source id as
// data attributes so an E2E test can assert on the DOM directly.
// On click, dispatches `openSourceViewer(sourceId, charStart)`.

import type { FC } from 'react';

export type CitationSpanProps = {
  chunkId: string;
  sourceId: string;
  charStart: number;
  onOpen: (sourceId: string, charStart: number) => void;
  children?: string;
};

export const CitationSpan: FC<CitationSpanProps> = ({
  chunkId,
  sourceId,
  charStart,
  onOpen,
  children,
}) => (
  <button
    type="button"
    onClick={() => onOpen(sourceId, charStart)}
    data-chunk-id={chunkId}
    data-source-id={sourceId}
    data-char-start={charStart}
    className="underline decoration-[var(--color-accent)] decoration-dotted underline-offset-4 hover:decoration-solid hover:text-[var(--color-accent)] transition-colors"
  >
    {children ?? ''}
  </button>
);