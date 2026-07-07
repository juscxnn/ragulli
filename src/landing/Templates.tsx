// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Landing — Templates. Re-uses the feature templates list.

import type { FC } from 'react';
import { TEMPLATES, TEMPLATE_ICONS } from '@/features/templates/templates';

export const Templates: FC = () => (
  <section className="px-6 py-16 max-w-5xl mx-auto">
    <h2 className="text-2xl font-serif text-[var(--color-fg)] text-center">Six starter templates</h2>
    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {TEMPLATES.map((t) => {
        const Icon = TEMPLATE_ICONS[t.icon];
        return (
          <a
            key={t.id}
            href={`/t/${t.id}`}
            className="block p-5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)]/40 transition-colors"
          >
            <span className="text-[var(--color-accent)]">
              <Icon size={22} />
            </span>
            <h3 className="mt-3 text-base text-[var(--color-fg)] font-medium">{t.name}</h3>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{t.description}</p>
          </a>
        );
      })}
    </div>
  </section>
);
