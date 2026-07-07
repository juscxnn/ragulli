// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// TrustLog — in-memory log of trust-relevant events. The log is a
// snapshot only; Subagent C wires the persistence path.

import { create } from 'zustand';
import type { TrustActivity } from './Activity';

export type TrustLogState = {
  entries: TrustActivity[];
  push: (entry: TrustActivity) => void;
  clear: () => void;
};

export const useTrustLog = create<TrustLogState>((set) => ({
  entries: [],
  push: (entry) => set((s) => ({ entries: [...s.entries, entry] })),
  clear: () => set({ entries: [] }),
}));
