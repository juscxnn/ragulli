// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Landing — Features.

import type { FC } from 'react';

const FEATURES = [
  { title: 'Zero install', body: 'A PWA. Open it. Use it. No account, no email, no setup.' },
  { title: 'Zero account', body: 'No sign-up. The only credential is the one you already brought.' },
  { title: 'Works offline', body: 'After the first load, the model and your data live in this tab.' },
  { title: 'Cites its sources', body: 'Click any claim. The original file opens at that line.' },
];

export const Features: FC = () => (
  <section className="px-6 py-16 max-w-4xl mx-auto">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {FEATURES.map((f) => (
        <article key={f.title} className="p-6 rounded-lg border border-[var(--color-border)]">
          <h3 className="text-base font-medium text-[var(--color-fg)]">{f.title}</h3>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">{f.body}</p>
        </article>
      ))}
    </div>
  </section>
);
