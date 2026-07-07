// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// SiteHeader — the small nav strip above every landing page. Holds
// the wordmark, a couple of links, and the primary "Open the app"
// CTA. Self-contained; no JS for the nav itself (anchor links only).

import type { FC } from 'react';
import { Wordmark } from './Wordmark';
import { ArrowRightIcon } from './icons';

type Props = {
  /** Optional override for the primary CTA destination. */
  ctaHref?: string;
};

export const SiteHeader: FC<Props> = ({ ctaHref = '/app/' }) => (
  <header className="w-full border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
    <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
      <a
        href="/"
        className="text-[var(--color-fg)] hover:no-underline"
        aria-label="RAGülli — home"
      >
        <Wordmark size="sm" />
      </a>
      <nav className="flex items-center gap-1 sm:gap-2 text-sm">
        <a
          href="/#features"
          className="hidden md:inline px-2 py-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:no-underline rounded-md transition-colors"
        >
          Features
        </a>
        <a
          href="/#templates"
          className="hidden md:inline px-2 py-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:no-underline rounded-md transition-colors"
        >
          Templates
        </a>
        <a
          href="/#compare"
          className="hidden md:inline px-2 py-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:no-underline rounded-md transition-colors"
        >
          Compare
        </a>
        <a
          href="/privacy"
          className="hidden md:inline px-2 py-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:no-underline rounded-md transition-colors"
        >
          Privacy
        </a>
        <a
          href="https://github.com/juscxnn/ragulli"
          className="hidden sm:inline px-2 py-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:no-underline rounded-md transition-colors"
          rel="noreferrer noopener"
          target="_blank"
        >
          Source
        </a>
        <a
          href={ctaHref}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[var(--color-accent)] text-[var(--color-bg)] font-medium hover:brightness-110 hover:no-underline transition-[filter]"
        >
          Open the app
          <ArrowRightIcon size={14} />
        </a>
      </nav>
    </div>
  </header>
);