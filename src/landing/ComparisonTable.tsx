// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// ComparisonTable — RAGülli vs NotebookLM vs Humata vs ChatPDF.
// 7 rows × 4 columns. Honest about where competitors win.

import type { FC, ReactNode } from 'react';
import { CheckSmallIcon, XSmallIcon } from './icons';

type Cell = ReactNode;

type Row = {
  label: string;
  cells: [Cell, Cell, Cell, Cell]; // [RAGülli, NotebookLM, Humata, ChatPDF]
};

const Y = (
  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)]">
    <CheckSmallIcon size={12} />
  </span>
);
const N = (
  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-danger)]/15 text-[var(--color-danger)]">
    <XSmallIcon size={12} />
  </span>
);

const ROWS: Row[] = [
  {
    label: 'Install',
    cells: [
      <span>Open the URL</span>,
      <span>Open the URL</span>,
      <span>Open the URL</span>,
      <span>Open the URL</span>,
    ],
  },
  {
    label: 'Account',
    cells: [
      <span>Not required</span>,
      <span>Required (Google)</span>,
      <span>Required</span>,
      <span>Required</span>,
    ],
  },
  {
    label: 'Where files go',
    cells: [
      <span className="text-[var(--color-accent)]">Stay in this browser tab</span>,
      <span>Google servers</span>,
      <span>Humata servers</span>,
      <span>ChatPDF servers</span>,
    ],
  },
  {
    label: 'Citation quality',
    cells: [
      <span>Inline link to source line</span>,
      <span>Inline link to source span</span>,
      <span>Inline link to source span</span>,
      <span>Footnote-style numbers</span>,
    ],
  },
  {
    label: 'BYOK models',
    cells: [Y, N, N, N],
  },
  {
    label: 'Price',
    cells: [
      <span className="text-[var(--color-accent)]">Free, forever</span>,
      <span>Free with limits; Plus plan</span>,
      <span>Freemium; paid tiers</span>,
      <span>Freemium; paid tiers</span>,
    ],
  },
  {
    label: 'Open source',
    cells: [<span className="text-[var(--color-accent)]">AGPL-3.0</span>, N, N, N],
  },
];

const COMPETITORS = ['NotebookLM', 'Humata', 'ChatPDF'];

export const ComparisonTable: FC = () => (
  <section id="compare" className="px-6 py-16 md:py-24 border-t border-[var(--color-border)]">
    <div className="max-w-6xl mx-auto">
      <div className="max-w-2xl mb-12">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-accent)] mb-3">
          How it stacks up
        </p>
        <h2 className="font-serif font-medium text-3xl md:text-4xl text-[var(--color-fg)] leading-tight tracking-tight">
          Compared to the hosted tools.
        </h2>
        <p className="mt-4 text-[var(--color-fg-muted)] text-base md:text-lg leading-relaxed">
          Honest: NotebookLM has Audio Overviews. Humata has a polished
          UX. ChatPDF is the fastest way to paste a PDF and ask. RAGülli
          trades those conveniences for the one thing those tools cannot
          give you: the file stays in this tab.
        </p>
      </div>

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <th
                scope="col"
                className="text-left text-[11px] uppercase tracking-[0.14em] text-[var(--color-fg-muted)] py-3 pr-4 font-medium w-[20%]"
              >
                Feature
              </th>
              <th
                scope="col"
                className="text-left py-3 px-4 font-serif text-base text-[var(--color-accent)] w-[20%]"
              >
                RAGülli
              </th>
              {COMPETITORS.map((c) => (
                <th
                  key={c}
                  scope="col"
                  className="text-left py-3 px-4 font-serif text-base text-[var(--color-fg)] w-[20%]"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
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
                  {row.cells[0]}
                </td>
                <td className="py-4 px-4 align-top text-sm text-[var(--color-fg-muted)]">
                  {row.cells[1]}
                </td>
                <td className="py-4 px-4 align-top text-sm text-[var(--color-fg-muted)]">
                  {row.cells[2]}
                </td>
                <td className="py-4 px-4 align-top text-sm text-[var(--color-fg-muted)]">
                  {row.cells[3]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
);