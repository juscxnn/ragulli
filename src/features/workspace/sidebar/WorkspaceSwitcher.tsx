// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// WorkspaceSwitcher — left column.

import type { FC } from 'react';
import { useWorkspaceStore } from '../store';

export const WorkspaceSwitcher: FC = () => {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActive = useWorkspaceStore((s) => s.setActiveWorkspace);

  return (
    <aside className="h-full p-4 border-r border-[var(--color-border)] bg-[var(--color-surface-1)]">
      <h2 className="text-[11px] uppercase tracking-wide text-[var(--color-fg-muted)] mb-3">
        Workspaces
      </h2>
      <ul className="flex flex-col gap-1">
        {workspaces.length === 0 ? (
          <li className="text-sm text-[var(--color-fg-muted)] italic">Untitled workspace</li>
        ) : (
          workspaces.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => setActive(w.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                  w.id === activeId
                    ? 'bg-[var(--color-surface-2)] text-[var(--color-fg)]'
                    : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
                }`}
              >
                {w.name}
              </button>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
};
