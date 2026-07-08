// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Hero — the opening section. One argument, presented with restraint.
// Three lines of Lora serif, then a two-line subhead, then two
// buttons. No pill badge. No "AGPL-3.0" line under the buttons. No
// trust-panel mock — that earns its own section below the fold.
//
// The amber appears only on the primary CTA. Nothing else on this
// section is amber. The visual hierarchy is the headline first, then
// the subhead, then the buttons.

import type { FC } from 'react';

export const Hero: FC = () => (
  <section className="relative px-6 pt-28 pb-32 md:pt-40 md:pb-40">
    <div className="max-w-3xl">
      <h1 className="font-serif font-normal text-[var(--color-fg)] text-[clamp(2.6rem,7.5vw,5.25rem)] leading-[1.02] tracking-[-0.022em]">
        A private RAG tool
        <br />
        that doesn&rsquo;t upload
        <br />
        your files.
      </h1>

      <p className="mt-10 md:mt-12 text-[var(--color-fg-muted)] text-lg md:text-xl leading-[1.55] max-w-xl">
        The first polished, browser-only answer in a sea of scripts and
        cloud services. Drop a PDF, ask a question, every answer cites
        the line it came from.
      </p>

      <div className="mt-12 md:mt-14 flex flex-col sm:flex-row gap-3">
        <a
          href="/app/"
          className="inline-flex items-center justify-center h-12 px-6 rounded-md bg-[var(--color-accent)] text-[var(--color-bg)] font-medium text-[0.95rem] hover:brightness-110 hover:no-underline transition-[filter]"
        >
          Open the app
        </a>
        <a
          href="https://github.com/juscxnn/ragulli"
          rel="noreferrer noopener"
          className="inline-flex items-center justify-center h-12 px-6 rounded-md border border-[var(--color-border)] text-[var(--color-fg)] font-medium text-[0.95rem] hover:border-[var(--color-fg-muted)] hover:no-underline transition-[border-color]"
        >
          Read the code
        </a>
      </div>
    </div>
  </section>
);