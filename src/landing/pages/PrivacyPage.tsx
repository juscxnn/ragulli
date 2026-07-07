// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// PrivacyPage — the /privacy page. Plain prose, the six statements
// from spec §9 / §4.6 in their canonical order.

import type { FC } from 'react';
import { PageShell } from '../PageShell';
import { ShieldIcon } from '../icons';

const POINTS: { heading: string; body: string }[] = [
  {
    heading: 'No analytics',
    body: 'RAGülli does not collect analytics. There is no event tracker, no page-view beacon, no funnel, no A/B test, no crash reporter. The app does not know who you are, and it does not try to find out.',
  },
  {
    heading: 'No telemetry',
    body: 'RAGülli does not send telemetry. Every byte that leaves the browser is a byte you explicitly chose to send — a question to your chosen LLM, or a static asset request.',
  },
  {
    heading: 'No third-party scripts',
    body: 'RAGülli does not run any third-party scripts. No analytics SDK, no chat widget, no font CDN, no A/B testing library. The strict Content-Security-Policy header reflects this; if you find an entry in connect-src that is not your chosen LLM endpoint, that is a bug.',
  },
  {
    heading: 'Your files never leave the browser',
    body: 'Your files never leave your browser unless you explicitly call a frontier LLM with your own API key. Parsing, chunking, embedding, and storage all happen in this tab. The original bytes are written to the Origin Private File System (OPFS) inside the browser sandbox.',
  },
  {
    heading: 'If you use Anthropic, the question passes through a stateless Edge function',
    body: 'If you use Anthropic as your model provider, your question passes through a stateless Vercel Edge function for CORS. The function does not log anything, does not persist anything, and is rebuilt every cold start. Files never do — only the question, plus the API key you supplied, are forwarded.',
  },
  {
    heading: 'Open source, AGPL-3.0',
    body: 'RAGülli is licensed under AGPL-3.0. The source code is at github.com/juscxnn/ragulli. You can read it, run it yourself, modify it, and self-host it. If you change it and offer it as a service, the AGPL requires you to publish your changes.',
  },
];

export const PrivacyPage: FC = () => (
  <PageShell>
    <article className="px-6 py-16 md:py-24">
      <div className="max-w-2xl mx-auto">
        <header className="mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)] mb-5">
            <ShieldIcon size={26} />
          </div>
          <h1 className="font-serif font-medium text-4xl md:text-5xl text-[var(--color-fg)] leading-tight tracking-tight">
            Privacy.
          </h1>
          <p className="mt-4 text-lg text-[var(--color-fg-muted)] leading-relaxed">
            The shortest possible version: RAGülli does not collect,
            send, or know anything about you that you did not choose
            to tell it. The rest of this page is the long version.
          </p>
        </header>

        <div className="space-y-10">
          {POINTS.map((p) => (
            <section key={p.heading}>
              <h2 className="font-serif text-2xl text-[var(--color-fg)] mb-3">
                {p.heading}
              </h2>
              <p className="text-[var(--color-fg-muted)] leading-relaxed text-base">
                {p.body}
              </p>
            </section>
          ))}
        </div>

        <footer className="mt-16 pt-8 border-t border-[var(--color-border)] text-sm text-[var(--color-fg-muted)]">
          <p>
            If you find a place where this page and the running app
            disagree, that is a bug. Please open an issue at{' '}
            <a
              href="https://github.com/juscxnn/ragulli"
              className="text-[var(--color-accent)] hover:no-underline"
              rel="noreferrer noopener"
              target="_blank"
            >
              github.com/juscxnn/ragulli
            </a>
            .
          </p>
        </footer>
      </div>
    </article>
  </PageShell>
);