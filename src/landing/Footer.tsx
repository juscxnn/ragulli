// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Footer — wordmark, tagline, AGPL-3.0 badge, GitHub link, the
// "no analytics, no telemetry" line, and a Privacy link.

import type { FC } from 'react';
import { Wordmark } from './Wordmark';

export const Footer: FC = () => (
  <footer className="px-6 py-14 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div className="space-y-3">
        <Wordmark size="md" />
        <p className="text-sm text-[var(--color-fg-muted)] max-w-md leading-relaxed">
          A private RAG tool that runs in your browser. Drop files,
          ask questions, every answer cites the line.
        </p>
      </div>
      <div className="flex flex-col items-start md:items-end gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="https://github.com/juscxnn/ragulli"
            className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:no-underline"
            rel="noreferrer noopener"
            target="_blank"
          >
            GitHub
          </a>
          <span className="text-[var(--color-border)]">·</span>
          <a
            href="/privacy"
            className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:no-underline"
          >
            Privacy
          </a>
          <span className="text-[var(--color-border)]">·</span>
          <a
            href="https://www.gnu.org/licenses/agpl-3.0.html"
            className="inline-flex items-center gap-1.5 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:no-underline"
            rel="noreferrer noopener"
            target="_blank"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            AGPL-3.0
          </a>
        </div>
        <p className="text-xs text-[var(--color-fg-muted)]">
          Made with restraint. No analytics. No telemetry.
        </p>
      </div>
    </div>
  </footer>
);