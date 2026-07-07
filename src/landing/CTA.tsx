// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// CTA — the closing section before the footer. One primary CTA into
// the app, two secondary CTAs to the repo.

import type { FC } from 'react';
import { ArrowRightIcon, GitHubIcon } from './icons';

export const CTA: FC = () => (
  <section className="px-6 py-16 md:py-24 border-t border-[var(--color-border)]">
    <div className="max-w-3xl mx-auto text-center">
      <h2 className="font-serif font-medium text-3xl md:text-4xl text-[var(--color-fg)] leading-tight tracking-tight">
        Try it now.
      </h2>
      <p className="mt-4 text-[var(--color-fg-muted)] text-base md:text-lg leading-relaxed">
        Drop a file. Ask a question. Watch the trust panel explain,
        in plain English, where every byte went.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href="/app/"
          className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg)] font-medium text-base hover:brightness-110 hover:no-underline transition-[filter]"
        >
          Try it now
          <ArrowRightIcon size={16} />
        </a>
        <a
          href="https://github.com/juscxnn/ragulli"
          className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-[var(--color-surface-1)] text-[var(--color-fg)] border border-[var(--color-border)] font-medium text-base hover:border-[var(--color-accent)]/40 hover:no-underline transition-[border-color,background]"
          rel="noreferrer noopener"
          target="_blank"
        >
          <GitHubIcon size={18} />
          Read the code
        </a>
        <a
          href="https://github.com/juscxnn/ragulli"
          className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-[var(--color-surface-1)] text-[var(--color-fg)] border border-[var(--color-border)] font-medium text-base hover:border-[var(--color-accent)]/40 hover:no-underline transition-[border-color,background]"
          rel="noreferrer noopener"
          target="_blank"
        >
          <GitHubIcon size={18} />
          Star on GitHub
        </a>
      </div>
    </div>
  </section>
);