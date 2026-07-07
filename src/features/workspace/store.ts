// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Workspace store. One zustand store per feature area. Subagent D adds
// the canvas/chat actions; we ship a minimal slice today so the
// workspace switcher can typecheck.

import { create } from 'zustand';
import type { Chat, Workspace } from '@/features/retrieval/types';

export type WorkspaceState = {
  activeWorkspaceId: string | null;
  workspaces: Workspace[];
  activeChat: Chat | null;
  setActiveWorkspace: (id: string) => void;
  upsertWorkspace: (w: Workspace) => void;
  setActiveChat: (c: Chat | null) => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspaceId: null,
  workspaces: [],
  activeChat: null,
  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
  upsertWorkspace: (w) =>
    set((s) => {
      const existing = s.workspaces.findIndex((x) => x.id === w.id);
      if (existing >= 0) {
        const next = s.workspaces.slice();
        next[existing] = w;
        return { workspaces: next };
      }
      return { workspaces: [...s.workspaces, w] };
    }),
  setActiveChat: (c) => set({ activeChat: c }),
}));
