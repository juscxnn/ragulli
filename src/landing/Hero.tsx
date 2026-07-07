// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Landing — Hero. Subagent E owns the polished version.

import type { FC } from 'react';

export const Hero: FC = () => (
  <section className="px-6 py-20 text-center">
    <h1 className="font-serif text-4xl sm:text-6xl text-[var(--color-fg)] tracking-tight">
      Your files. Your AI. Your browser.
    </h1>
    <p className="mt-6 text-base text-[var(--color-fg-muted)] max-w-xl mx-auto">
      RAGülli is the private RAG tool that runs in your browser. Drop files. Ask questions.
      Every answer cites the line.
    </p>
  </section>
);
