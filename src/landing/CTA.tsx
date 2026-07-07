// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Landing — CTA.

import type { FC } from 'react';

export const CTA: FC = () => (
  <section className="px-6 py-20 text-center">
    <h2 className="text-2xl font-serif text-[var(--color-fg)]">Open the app</h2>
    <p className="mt-3 text-sm text-[var(--color-fg-muted)]">
      It opens on the dropzone. Drop something. Get an answer.
    </p>
    <div className="mt-6 flex items-center justify-center gap-3">
      <a
        href="/app/"
        className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-[var(--color-accent)] text-[var(--color-bg)] font-medium"
      >
        Open RAGülli
      </a>
      <a
        href="https://github.com/juscxnn/ragulli"
        className="inline-flex items-center justify-center h-10 px-4 rounded-md border border-[var(--color-border)] text-[var(--color-fg)]"
      >
        Read the code
      </a>
    </div>
  </section>
);
