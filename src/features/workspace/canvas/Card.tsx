// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Card — a single source card on the canvas. Subagent D extends with
// drag handle and citation count.

import type { FC, ReactNode } from 'react';

export type CanvasCardProps = {
  title: string;
  meta?: ReactNode;
  onOpen?: () => void;
};

export const CanvasCard: FC<CanvasCardProps> = ({ title, meta, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className="w-full text-left rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 hover:border-[var(--color-accent)]/40 transition-colors"
  >
    <div className="text-sm font-medium text-[var(--color-fg)] truncate">{title}</div>
    {meta ? <div className="text-xs text-[var(--color-fg-muted)] mt-1">{meta}</div> : null}
  </button>
);
