// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Dexie + OPFS store for sources, chunks, zones. Subagent B owns the
// CRUD bodies; the import surface is fixed here.

import type { Chunk, Source, Workspace, Zone } from './types';
import { db } from '@/lib/db';

export async function listSources(workspaceId: string): Promise<Source[]> {
  return db.sources.where('workspaceId').equals(workspaceId).toArray();
}

export async function putSource(source: Source): Promise<void> {
  await db.sources.put(source);
}

export async function putChunks(chunks: Chunk[]): Promise<void> {
  await db.chunks.bulkPut(chunks);
}

export async function listChunksForSource(sourceId: string): Promise<Chunk[]> {
  return db.chunks.where('sourceId').equals(sourceId).sortBy('position');
}

export async function putZone(zone: Zone): Promise<void> {
  await db.zones.put(zone);
}

export async function listZones(workspaceId: string): Promise<Zone[]> {
  return db.zones.where('workspaceId').equals(workspaceId).toArray();
}

export async function getWorkspace(id: string): Promise<Workspace | undefined> {
  return db.workspaces.get(id);
}

export async function clearAll(): Promise<void> {
  await db.transaction(
    'rw',
    [db.sources, db.chunks, db.zones, db.citations, db.workspaces, db.chats],
    async () => {
      await Promise.all([
        db.sources.clear(),
        db.chunks.clear(),
        db.zones.clear(),
        db.citations.clear(),
        db.workspaces.clear(),
        db.chats.clear(),
      ]);
    },
  );
}
