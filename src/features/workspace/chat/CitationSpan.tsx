// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
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
    title="Open the source at this line"
    className="text-[var(--color-accent)] decoration-[var(--color-accent)]/50 decoration-dotted underline underline-offset-[3px] rounded-sm px-0.5 -mx-0.5 hover:bg-[var(--color-accent-soft)] hover:decoration-solid focus-visible:outline-none focus-visible:shadow-[var(--shadow-glow)] transition-colors"
  >
    {children ?? ''}
  </button>
);