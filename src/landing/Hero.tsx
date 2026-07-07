// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Hero — the opening section. H1, subline, two CTAs, and a stylized
// trust-panel mock on the right. Headline tracking is scholarly and
// generous; subline is set in a quieter weight.

import type { FC } from 'react';
import { ArrowRightIcon, DropIcon, SampleIcon } from './icons';
import { TrustPanelMock } from './TrustPanelMock';

export const Hero: FC = () => (
  <section className="relative px-6 pt-14 pb-20 md:pt-24 md:pb-28">
    <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-16 items-center">
      <div className="space-y-7">
        <p className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/25 text-[11px] uppercase tracking-[0.16em] text-[var(--color-accent)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" aria-hidden />
          Private RAG, in your browser
        </p>
        <h1 className="font-serif font-medium text-[var(--color-fg)] text-[clamp(2.4rem,6vw,4.4rem)] leading-[1.04] tracking-[-0.02em]">
          Your files.
          <br />
          Your AI.
          <br />
          Your browser.
        </h1>
        <p className="text-lg md:text-xl text-[var(--color-fg-muted)] max-w-xl leading-relaxed">
          Private RAG. No account. No server.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <a
            href="/app/"
            className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg)] font-medium text-base hover:brightness-110 hover:no-underline transition-[filter]"
          >
            <DropIcon size={18} />
            Drop something to start
            <ArrowRightIcon size={16} />
          </a>
          <a
            href="/app/?sample=paper"
            className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-lg bg-[var(--color-surface-1)] text-[var(--color-fg)] border border-[var(--color-border)] font-medium text-base hover:border-[var(--color-accent)]/40 hover:no-underline transition-[border-color,background]"
          >
            <SampleIcon size={18} />
            Try a sample research paper
          </a>
        </div>
        <p className="text-xs text-[var(--color-fg-muted)] pt-1">
          AGPL-3.0 open source. Runs on your machine, not on ours.
        </p>
      </div>

      <div className="lg:justify-self-end w-full">
        <TrustPanelMock />
      </div>
    </div>
  </section>
);