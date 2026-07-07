// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// ComparePage — the per-competitor comparison page. One component,
// used by all three /compare/{id}.html entries; the competitor id
// is passed in as a prop from LandingApp's router.
//
// Sections:
//   - Hero (RAGülli vs {Competitor} + tagline)
//   - "Where they're better" — honest, one paragraph.
//   - "Where RAGülli is better" — three bullets.
//   - Side-by-side comparison grid (the 7 rows).
//   - "Switch to RAGülli" CTA -> /app/

import type { FC } from 'react';
import { PageShell } from '../PageShell';
import { getCompetitor } from '../data/comparison';
import { ArrowLeftIcon, ArrowRightIcon, CheckSmallIcon } from '../icons';

type Props = { competitorId: string };

export const ComparePage: FC<Props> = ({ competitorId }) => {
  const c = getCompetitor(competitorId);
  if (!c) {
    return (
      <PageShell>
        <section className="px-6 py-32 max-w-2xl mx-auto text-center">
          <h1 className="font-serif text-3xl text-[var(--color-fg)] mb-4">
            Page not found
          </h1>
          <p className="text-[var(--color-fg-muted)]">
            We could not find a comparison at that path.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 mt-6 text-[var(--color-accent)] hover:no-underline"
          >
            <ArrowLeftIcon size={16} />
            Back to home
          </a>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell ctaHref="/app/">
      <article className="px-6 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:no-underline mb-10"
          >
            <ArrowLeftIcon size={14} />
            Back to home
          </a>

          <header className="mb-12">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-accent)] mb-3">
              Comparison
            </p>
            <h1 className="font-serif font-medium text-4xl md:text-5xl text-[var(--color-fg)] leading-tight tracking-tight">
              RAGülli vs {c.name}
            </h1>
            <p className="mt-4 text-lg md:text-xl text-[var(--color-fg-muted)] leading-relaxed">
              {c.tagline}
            </p>
          </header>

          <section className="mb-12 grid md:grid-cols-2 gap-6">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6">
              <h2 className="font-serif text-xl text-[var(--color-fg)] mb-3">
                Where {c.name} is better
              </h2>
              <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">
                {c.betterAt}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-6">
              <h2 className="font-serif text-xl text-[var(--color-fg)] mb-3">
                Where RAGülli is better
              </h2>
              <ul className="space-y-2.5">
                {c.ragulliBetter.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-[var(--color-fg)] leading-relaxed">
                    <span className="text-[var(--color-accent)] mt-0.5 shrink-0">
                      <CheckSmallIcon size={14} />
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="font-serif text-2xl text-[var(--color-fg)] mb-5">
              Side-by-side
            </h2>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="text-left text-[11px] uppercase tracking-[0.14em] text-[var(--color-fg-muted)] py-3 pr-4 font-medium w-[28%]"
                    >
                      Feature
                    </th>
                    <th
                      scope="col"
                      className="text-left py-3 px-4 font-serif text-base text-[var(--color-accent)] w-[36%]"
                    >
                      RAGülli
                    </th>
                    <th
                      scope="col"
                      className="text-left py-3 px-4 font-serif text-base text-[var(--color-fg)] w-[36%]"
                    >
                      {c.name}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {c.rows.map((row, i) => (
                    <tr
                      key={row.label}
                      className={
                        i % 2 === 0
                          ? 'border-t border-[var(--color-border)] bg-[var(--color-surface-1)]/40'
                          : 'border-t border-[var(--color-border)]'
                      }
                    >
                      <th
                        scope="row"
                        className="text-left text-sm font-medium text-[var(--color-fg)] py-4 pr-4 align-top"
                      >
                        {row.label}
                      </th>
                      <td className="py-4 px-4 align-top text-sm text-[var(--color-fg)]">
                        {row.ragulli}
                      </td>
                      <td className="py-4 px-4 align-top text-sm text-[var(--color-fg-muted)]">
                        {row.competitor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[var(--color-border)]">
            <a
              href="/app/"
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg)] font-medium text-base hover:brightness-110 hover:no-underline transition-[filter]"
            >
              Switch to RAGülli
              <ArrowRightIcon size={16} />
            </a>
            <a
              href="/#compare"
              className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-lg bg-[var(--color-surface-1)] text-[var(--color-fg)] border border-[var(--color-border)] font-medium text-base hover:border-[var(--color-accent)]/40 hover:no-underline transition-[border-color,background]"
            >
              See the full comparison
            </a>
          </div>
        </div>
      </article>
    </PageShell>
  );
};