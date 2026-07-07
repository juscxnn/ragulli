// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Trust — spec §9.1 section 5. A close-up of the trust panel and a
// paragraph that explains the architecture in plain English.

import type { FC } from 'react';
import { TrustPanelMock } from './TrustPanelMock';

export const Trust: FC = () => (
  <section id="trust" className="px-6 py-16 md:py-24 border-t border-[var(--color-border)]">
    <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-16 items-center">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-accent)] mb-3">
          Trust, in detail
        </p>
        <h2 className="font-serif font-medium text-3xl md:text-4xl text-[var(--color-fg)] leading-tight tracking-tight">
          The trust panel is the product.
        </h2>
        <p className="mt-4 text-[var(--color-fg-muted)] text-base md:text-lg leading-relaxed">
          Parsing, chunking, and embedding all run in a Web Worker
          inside your tab. The file bytes never leave the page. The
          only outbound request that can ever happen is the one you
          make yourself: typing a question and pressing enter, which
          goes to a frontier LLM with the key you supplied.
        </p>
        <p className="mt-4 text-[var(--color-fg-muted)] text-base md:text-lg leading-relaxed">
          If you use Anthropic, your question passes through a stateless
          Vercel Edge function for CORS. The file never does. The Edge
          function does not log anything and does not persist anything.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-[var(--color-fg)]">
          <li className="flex items-start gap-2">
            <span className="text-[var(--color-success)] mt-1">·</span>
            <span>Strict CSP — no third-party origins in connect-src.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--color-success)] mt-1">·</span>
            <span>No analytics, no telemetry, no third-party scripts.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--color-success)] mt-1">·</span>
            <span>Embeddings and storage happen entirely in-tab.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--color-success)] mt-1">·</span>
            <span>BYOK keys are encrypted at rest with a per-tab secret.</span>
          </li>
        </ul>
      </div>
      <div className="lg:justify-self-end w-full">
        <TrustPanelMock />
      </div>
    </div>
  </section>
);