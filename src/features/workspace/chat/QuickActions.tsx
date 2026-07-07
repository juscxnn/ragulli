// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// QuickActions — the 4 quick-action chips below the chat input.

import type { FC } from 'react';

export type QuickAction = {
  label: string;
  prompt: string;
};

const DEFAULT_ACTIONS: QuickAction[] = [
  { label: 'Summarize', prompt: 'Summarize this corpus in 5 bullets, citing sources.' },
  { label: 'Find dates', prompt: 'List every date mentioned across these sources.' },
  { label: 'Compare X to Y', prompt: 'Compare the claims in the first source to the second.' },
  { label: 'Explain jargon', prompt: 'Define every term a non-expert would not know.' },
];

export const QuickActions: FC<{ actions?: QuickAction[]; onSelect?: (a: QuickAction) => void }> = ({
  actions = DEFAULT_ACTIONS,
  onSelect,
}) => (
  <div className="flex flex-wrap gap-2">
    {actions.map((a) => (
      <button
        key={a.label}
        type="button"
        onClick={() => onSelect?.(a)}
        className="text-xs px-3 h-7 rounded-full border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-accent)]/40 transition-colors"
      >
        {a.label}
      </button>
    ))}
  </div>
);
