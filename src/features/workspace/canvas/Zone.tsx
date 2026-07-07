// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Zone — a dashed-border container on the canvas that groups sources.
// Subagent D implements drag-drop targets and weight sliders.

import type { FC, ReactNode } from 'react';

export type ZoneProps = {
  title: string;
  weight: number;
  color: string;
  children?: ReactNode;
};

export const Zone: FC<ZoneProps> = ({ title, weight, color, children }) => (
  <section
    className="rounded-lg border-2 border-dashed p-4"
    style={{ borderColor: `${color}66` }}
  >
    <header className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-medium text-[var(--color-fg)]">{title}</h3>
      <span className="text-xs text-[var(--color-fg-muted)] tabular-nums">
        weight {weight.toFixed(2)}
      </span>
    </header>
    <div className="flex flex-col gap-2">{children}</div>
  </section>
);
