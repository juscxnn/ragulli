// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Features — the 4-card grid from spec §9.1.3. Each card has a
// hand-built inline SVG icon, a title, and a paragraph. No buttons.

import type { FC, ReactNode } from 'react';
import { AccountIcon, CitationIcon, InstallIcon, OfflineIcon } from './icons';

type Feature = {
  icon: ReactNode;
  title: string;
  body: string;
};

const FEATURES: Feature[] = [
  {
    icon: <InstallIcon size={24} />,
    title: 'Zero install',
    body: 'Open the URL. Drop a file. Start asking. RAGülli is a Progressive Web App; the browser caches it for offline use after the first load.',
  },
  {
    icon: <AccountIcon size={24} />,
    title: 'Zero account',
    body: 'No email. No signup. No password to forget. Just open it and drop a file. The app does not know who you are.',
  },
  {
    icon: <OfflineIcon size={24} />,
    title: 'Works offline',
    body: 'After the first load, embedding and retrieval work without a network. The local model is cached. Your files stay in this tab.',
  },
  {
    icon: <CitationIcon size={24} />,
    title: 'Cites its sources',
    body: 'Every claim in an answer links back to the line in the original PDF. No [1] footnotes. Click the citation, see the source.',
  },
];

export const Features: FC = () => (
  <section id="features" className="px-6 py-16 md:py-24 border-t border-[var(--color-border)]">
    <div className="max-w-6xl mx-auto">
      <div className="max-w-2xl mb-12">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-accent)] mb-3">
          What you get
        </p>
        <h2 className="font-serif font-medium text-3xl md:text-4xl text-[var(--color-fg)] leading-tight tracking-tight">
          The four things that matter.
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((f) => (
          <article
            key={f.title}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6 hover:border-[var(--color-accent)]/30 transition-[border-color] duration-200"
          >
            <div className="w-10 h-10 rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center mb-5">
              {f.icon}
            </div>
            <h3 className="font-serif text-lg text-[var(--color-fg)] mb-2 leading-snug">
              {f.title}
            </h3>
            <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">{f.body}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);