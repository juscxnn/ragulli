// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// QuickActions — the 4 quick-action chips below the chat input. The
// active workspace's template seeds the prompts; the ChatPanel
// passes them in. Each chip submits its prompt directly to the chat
// input.

import type { FC } from 'react';

export type QuickAction = {
  label: string;
  prompt: string;
};

export type QuickActionsProps = {
  actions: QuickAction[];
  onSelect: (a: QuickAction) => void;
  disabled?: boolean;
};

export const QuickActions: FC<QuickActionsProps> = ({ actions, onSelect, disabled }) => (
  <div className="flex flex-wrap gap-2">
    {actions.map((a) => (
      <button
        key={a.label}
        type="button"
        onClick={() => onSelect(a)}
        disabled={disabled}
        className="text-xs px-3 h-7 rounded-full border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-accent)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {a.label}
      </button>
    ))}
  </div>
);