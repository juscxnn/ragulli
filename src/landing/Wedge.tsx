// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Landing — Wedge. The 4-quadrant chart. Subagent E animates this.

import type { FC } from 'react';

export const Wedge: FC = () => (
  <section className="px-6 py-16 max-w-3xl mx-auto">
    <h2 className="text-2xl font-serif text-[var(--color-fg)] text-center">The empty square</h2>
    <div className="mt-8 grid grid-cols-2 gap-3">
      {[
        { x: 0, y: 0, label: 'Ugly self-hosted RAG', tone: 'muted' },
        { x: 1, y: 0, label: 'Hosted, uploads to a server', tone: 'muted' },
        { x: 0, y: 1, label: 'Browser-only but no polish', tone: 'muted' },
        { x: 1, y: 1, label: 'RAGülli', tone: 'accent' },
      ].map((q) => (
        <div
          key={`${q.x}-${q.y}`}
          className={`p-8 rounded-lg border text-sm ${
            q.tone === 'accent'
              ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5 text-[var(--color-fg)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-fg-muted)]'
          }`}
        >
          {q.label}
        </div>
      ))}
    </div>
  </section>
);
