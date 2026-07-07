// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// TrustPanelMock — a stylized rendering of the running-app trust panel
// for the Hero visual. Pure HTML/CSS/SVG; no screenshot. Reads from
// design tokens. The visual states the trust-panel claim explicitly:
// "your file: staying in this browser tab".

import type { FC } from 'react';

export const TrustPanelMock: FC = () => (
  <div
    className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-[var(--shadow-soft)] overflow-hidden"
    role="img"
    aria-label="Mock of the RAGülli trust panel: your file is staying in this browser tab."
  >
    <div className="flex items-center gap-2 px-4 h-9 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" aria-hidden />
      <span className="text-[11px] uppercase tracking-wider text-[var(--color-fg-muted)]">
        trust panel
      </span>
      <span className="ml-auto text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)]">
        idle
      </span>
    </div>

    <div className="p-4 space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-[var(--color-fg-muted)] mb-2">
          last action
        </p>
        <div className="rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] p-3 space-y-1.5">
          <p className="font-mono text-xs text-[var(--color-fg)] break-words">
            your file <span className="text-[var(--color-accent)]">"paper.pdf"</span>
          </p>
          <div className="font-mono text-[11px] text-[var(--color-fg-muted)] space-y-0.5 pl-1">
            <p>
              <span className="text-[var(--color-fg)]">·</span> parsed&nbsp;&nbsp;local browser
              (PDF.js)
            </p>
            <p>
              <span className="text-[var(--color-fg)]">·</span> chunked&nbsp;&nbsp;local browser
            </p>
            <p>
              <span className="text-[var(--color-fg)]">·</span> embedded&nbsp;&nbsp;local browser
              (bge-small)
            </p>
            <p>
              <span className="text-[var(--color-fg)]">·</span> sent to&nbsp;&nbsp;
              <span className="text-[var(--color-success)]">NOT SENT</span>
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wider text-[var(--color-fg-muted)] mb-2">
          standing
        </p>
        <p className="font-mono text-xs text-[var(--color-fg)]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-success)] mr-2 align-middle" />
          your file: <span className="text-[var(--color-accent)]">staying in this browser tab</span>
        </p>
      </div>
    </div>

    <div className="px-4 py-2.5 border-t border-[var(--color-border)] flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)]">
      <span>no account</span>
      <span className="text-[var(--color-border)]">·</span>
      <span>no server</span>
      <span className="text-[var(--color-border)]">·</span>
      <span>no telemetry</span>
    </div>
  </div>
);