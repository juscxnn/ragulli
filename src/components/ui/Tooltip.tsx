// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Tooltip — hover/focus-revealed hint. Pure CSS in V1 (no portal needed).

import { useState, type FC, type ReactNode } from 'react';

export type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom';
};

export const Tooltip: FC<TooltipProps> = ({ content, children, side = 'top' }) => {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <span
        role="tooltip"
        aria-hidden={!open}
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-10 px-2 py-1 text-xs rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-fg)] whitespace-nowrap transition-opacity ${
          open ? 'opacity-100' : 'opacity-0'
        } ${side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}
      >
        {content}
      </span>
    </span>
  );
};
