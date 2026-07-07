// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// WorkspaceSwitcher — left rail. Lists every workspace the user has
// created and highlights the active one. "+ New" creates a fresh
// workspace and immediately seeds the "general" zone so the canvas
// has a sensible starting point. The store is the source of truth
// (it mirrors what is in IndexedDB).

import { useCallback, type FC } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useWorkspaceStore } from '../store';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/Button';
import { putZone } from '@/features/retrieval/store';
import { nextZoneColor } from '../store';
import type { Workspace } from '@/features/retrieval/types';

export const WorkspaceSwitcher: FC = () => {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActive = useWorkspaceStore((s) => s.setActiveWorkspace);
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  const onCreate = useCallback(async () => {
    const id = uuidv4();
    const ws: Workspace = {
      id,
      name: `Untitled ${workspaces.length + 1}`,
      templateId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    addWorkspace(ws);
    setActive(id);
    try {
      await db.workspaces.put(ws);
      // Seed a default "Trusted" zone so the canvas has somewhere
      // to drop sources immediately.
      const z = {
        id: uuidv4(),
        workspaceId: id,
        name: 'Trusted',
        weight: 1.0,
        color: nextZoneColor(0),
        position: { x: 0, y: 0 },
      };
      await putZone(z);
      addWorkspace({
        ...ws,
        updatedAt: Date.now(),
      });
      setActiveWorkspace(id);
    } catch {
      /* sandboxed env: in-memory still works */
    }
  }, [workspaces.length, addWorkspace, setActive, setActiveWorkspace]);

  return (
    <aside className="h-full p-3 pb-20 border-r border-[var(--color-border)] bg-[var(--color-surface-1)] flex flex-col gap-3">
      <h2 className="text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)] px-1">
        Workspaces
      </h2>
      <ul className="flex flex-col gap-1 flex-1 overflow-auto">
        {workspaces.length === 0 ? (
          <li className="text-xs text-[var(--color-fg-muted)] italic px-1 py-1">
            No workspaces yet.
          </li>
        ) : (
          workspaces.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => setActive(w.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                  w.id === activeId
                    ? 'bg-[var(--color-surface-2)] text-[var(--color-fg)]'
                    : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-2)]/50'
                }`}
                title={w.name}
              >
                {w.name}
              </button>
            </li>
          ))
        )}
      </ul>
      <Button variant="secondary" size="sm" onClick={() => void onCreate()} block>
        + New workspace
      </Button>
    </aside>
  );
};