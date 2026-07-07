// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Tabs — accessible tab list. Controlled component.

import { useId, type FC, type ReactNode } from 'react';

export type TabItem = { id: string; label: ReactNode; content: ReactNode };

export type TabsProps = {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
};

export const Tabs: FC<TabsProps> = ({ items, value, onChange }) => {
  const baseId = useId();
  return (
    <div>
      <div role="tablist" aria-orientation="horizontal" className="flex gap-1 border-b border-[var(--color-border)]">
        {items.map((item) => {
          const selected = item.id === value;
          return (
            <button
              key={item.id}
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.id)}
              className={`-mb-px px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                selected
                  ? 'border-[var(--color-accent)] text-[var(--color-fg)]'
                  : 'border-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== value}
          className="pt-4"
        >
          {item.id === value ? item.content : null}
        </div>
      ))}
    </div>
  );
};
