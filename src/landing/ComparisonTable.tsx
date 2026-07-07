// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Landing — ComparisonTable. RAGülli vs NotebookLM vs Humata vs ChatPDF.

import type { FC } from 'react';

const ROWS: { label: string; values: [string, string, string, string] }[] = [
  { label: 'Install', values: ['none (PWA)', 'none', 'none', 'none'] },
  { label: 'Account', values: ['none', 'Google', 'email', 'email'] },
  { label: 'Where files go', values: ['this tab', 'Google servers', 'vendor cloud', 'vendor cloud'] },
  { label: 'Citation quality', values: ['inline line-level', 'paragraph', 'page', 'page'] },
  { label: 'BYOK', values: ['yes (5 providers)', 'no', 'no', 'no'] },
  { label: 'Price', values: ['free', 'free', '$', '$'] },
  { label: 'Open source', values: ['AGPL-3.0', 'no', 'no', 'no'] },
];

export const ComparisonTable: FC = () => (
  <section className="px-6 py-16 max-w-4xl mx-auto">
    <h2 className="text-2xl font-serif text-[var(--color-fg)] text-center">How RAGülli compares</h2>
    <div className="mt-8 overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-[var(--color-fg-muted)]">
            <th className="py-2 pr-4"></th>
            <th className="py-2 pr-4 text-[var(--color-accent)]">RAGülli</th>
            <th className="py-2 pr-4">NotebookLM</th>
            <th className="py-2 pr-4">Humata</th>
            <th className="py-2 pr-4">ChatPDF</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.label} className="border-t border-[var(--color-border)]">
              <td className="py-2 pr-4 text-[var(--color-fg-muted)]">{r.label}</td>
              <td className="py-2 pr-4 text-[var(--color-fg)]">{r.values[0]}</td>
              <td className="py-2 pr-4 text-[var(--color-fg-muted)]">{r.values[1]}</td>
              <td className="py-2 pr-4 text-[var(--color-fg-muted)]">{r.values[2]}</td>
              <td className="py-2 pr-4 text-[var(--color-fg-muted)]">{r.values[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);
