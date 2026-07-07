// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// TrustLog — in-memory mirror of the trust panel's history. The
// store holds the last `MAX_ENTRIES` activities in memory and
// persists the same set into a dedicated IndexedDB database
// (`ragulli-trust-log`, defined in `TrustLogDb.ts`). On reload,
// hydrate() pulls the saved set back so the compact panel can show
// the user's last actions immediately.

import { create } from 'zustand';
import type { TrustActivity } from '@/features/llm/types';
import { getTrustLogDb } from './TrustLogDb';

const MAX_ENTRIES = 100;

export type TrustLogState = {
  entries: TrustActivity[];
  push: (entry: TrustActivity) => void;
  clear: () => void;
  hydrate: () => Promise<void>;
};

export const useTrustLog = create<TrustLogState>((set) => ({
  entries: [],
  push: (entry) => {
    set((s) => {
      const next = [...s.entries, entry];
      const trimmed =
        next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
      void persistEntries(trimmed).catch(() => undefined);
      return { entries: trimmed };
    });
  },
  clear: () => {
    set({ entries: [] });
    void clearPersisted().catch(() => undefined);
  },
  hydrate: async () => {
    try {
      const db = getTrustLogDb();
      const rows = await db.entries.toArray();
      const sorted = rows
        .map((r) => r.activity)
        .sort((a, b) => a.ts - b.ts)
        .slice(-MAX_ENTRIES);
      set({ entries: sorted });
    } catch {
      /* DB unavailable — start with an empty log */
      set({ entries: [] });
    }
  },
}));

async function persistEntries(entries: TrustActivity[]): Promise<void> {
  const db = getTrustLogDb();
  await db.transaction('rw', db.entries, async () => {
    await db.entries.clear();
    if (entries.length > 0) {
      await db.entries.bulkPut(
        entries.map((activity) => ({
          id: activity.id,
          ts: activity.ts,
          activity,
        })),
      );
    }
  });
}

async function clearPersisted(): Promise<void> {
  const db = getTrustLogDb();
  await db.entries.clear();
}