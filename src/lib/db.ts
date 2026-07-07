// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Dexie database handle. The schema lives here so any feature can import
// the same singleton instance and avoid "two-database" drift.

import Dexie, { type Table } from 'dexie';
import type { Chat, Chunk, Citation, Source, Workspace, Zone } from '@/features/retrieval/types';

export class RagulliDb extends Dexie {
  sources!: Table<Source, string>;
  chunks!: Table<Chunk, string>;
  zones!: Table<Zone, string>;
  citations!: Table<Citation, string>;
  workspaces!: Table<Workspace, string>;
  chats!: Table<Chat, string>;

  constructor() {
    super('ragulli');
    this.version(1).stores({
      sources: 'id, workspaceId, addedAt, mimeType',
      chunks: 'id, sourceId, workspaceId, zoneId, position',
      zones: 'id, workspaceId',
      citations: 'id, chunkId, sourceId',
      workspaces: 'id, updatedAt',
      chats: 'id, workspaceId, createdAt',
    });
  }
}

export const db: RagulliDb = new RagulliDb();
