// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Templates — the 6 starter templates as cards, each linking to a
// dedicated /t/{id} landing page. Icon, name, one-sentence
// description, soft hover state.

import type { FC, ReactNode } from 'react';
import { TEMPLATES } from '@/features/templates/templates';
import {
  ArticleLandingIcon,
  BookLandingIcon,
  BriefcaseIcon,
  ChapterLandingIcon,
  ContractLandingIcon,
  MicIcon,
} from './icons';

const ICONS: Record<string, ReactNode> = {
  book: <BookLandingIcon size={22} />,
  contract: <ContractLandingIcon size={22} />,
  'customer-interview-corpus': <MicIcon size={22} />,
  mic: <MicIcon size={22} />,
  chapter: <ChapterLandingIcon size={22} />,
  article: <ArticleLandingIcon size={22} />,
  briefcase: <BriefcaseIcon size={22} />,
};

export const Templates: FC = () => (
  <section id="templates" className="px-6 py-20 md:py-28 border-t border-[var(--color-border)]">
    <div className="max-w-6xl mx-auto">
      <div className="max-w-2xl mb-12">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-accent)] mb-3">
          Starter templates
        </p>
        <h2 className="font-serif font-medium text-3xl md:text-4xl text-[var(--color-fg)] leading-tight tracking-tight">
          Six ways to start.
        </h2>
        <p className="mt-4 text-[var(--color-fg-muted)] text-base md:text-lg leading-relaxed">
          Each template tunes the chunk size, the system prompt, and the
          quick-action chips to a specific shape of work. Pick one to
          skip the setup.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map((t) => (
          <a
            key={t.id}
            href={`/t/${t.id}`}
            className="group block rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6 hover:border-[var(--color-accent)]/40 hover:shadow-[var(--shadow-glow)] hover:no-underline transition-[border-color,box-shadow] duration-200"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center shrink-0">
                {ICONS[t.icon] ?? <ArticleLandingIcon size={22} />}
              </div>
              <h3 className="font-serif text-lg text-[var(--color-fg)] leading-snug pt-1">
                {t.name}
              </h3>
            </div>
            <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">
              {t.description}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Open template
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </a>
        ))}
      </div>
    </div>
  </section>
);