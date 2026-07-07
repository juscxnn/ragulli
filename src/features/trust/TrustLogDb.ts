// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// TrustLog persistence — a small, dedicated Dexie database that holds
// the last 100 trust activities. It lives in its own database (rather
// than adding a table to the main `ragulli` schema) so we do not
// touch Subagent B's store. The DB has a single table, `entries`,
// keyed by activity id.

import Dexie, { type Table } from 'dexie';
import type { TrustActivity } from '@/features/llm/types';

export type StoredTrustEntry = {
  id: string;
  ts: number;
  activity: TrustActivity;
};

export class TrustLogDb extends Dexie {
  entries!: Table<StoredTrustEntry, string>;

  constructor() {
    super('ragulli-trust-log');
    this.version(1).stores({
      entries: 'id, ts',
    });
  }
}

let instance: TrustLogDb | null = null;

/** Lazy singleton. Tests may construct their own. */
export function getTrustLogDb(): TrustLogDb {
  if (!instance) instance = new TrustLogDb();
  return instance;
}

/** Test-only override. */
export function _setTrustLogDbForTests(db: TrustLogDb | null): void {
  instance = db;
}