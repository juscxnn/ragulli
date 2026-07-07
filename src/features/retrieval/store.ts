// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Typed Dexie wrappers for sources, chunks, and zones. The Dexie
// schema lives in src/lib/db.ts; this file is the only place the
// rest of the app talks to the database. Each function is a thin
// adapter so callers do not import Dexie directly and the schema
// can be evolved in one place.

import type { Chat, Chunk, Source, Zone } from './types';
import { db } from '@/lib/db';

export async function putSource(s: Source): Promise<void> {
  await db.sources.put(s);
}

export async function getSource(id: string): Promise<Source | undefined> {
  return db.sources.get(id);
}

export async function listSources(workspaceId: string): Promise<Source[]> {
  return db.sources.where('workspaceId').equals(workspaceId).toArray();
}

export async function putChunks(cs: Chunk[]): Promise<void> {
  if (cs.length === 0) return;
  await db.chunks.bulkPut(cs);
}

export async function getChunksForSource(sourceId: string): Promise<Chunk[]> {
  return db.chunks.where('sourceId').equals(sourceId).sortBy('position');
}

export async function getAllChunks(): Promise<Chunk[]> {
  return db.chunks.toArray();
}

export async function listChunksForWorkspace(workspaceId: string): Promise<Chunk[]> {
  return db.chunks.where('workspaceId').equals(workspaceId).sortBy('position');
}

export async function putChat(chat: Chat): Promise<void> {
  await db.chats.put(chat);
}

/** Latest persisted chat thread for a workspace, or undefined when the
 *  user has never asked anything there. */
export async function getChatForWorkspace(workspaceId: string): Promise<Chat | undefined> {
  const rows = await db.chats.where('workspaceId').equals(workspaceId).toArray();
  if (rows.length === 0) return undefined;
  return rows.slice().sort((a, b) => b.createdAt - a.createdAt)[0];
}

export async function putZone(z: Zone): Promise<void> {
  await db.zones.put(z);
}

export async function getZonesForWorkspace(wsId: string): Promise<Zone[]> {
  return db.zones.where('workspaceId').equals(wsId).toArray();
}

export async function assignChunkToZone(chunkId: string, zoneId: string | null): Promise<void> {
  const chunk = await db.chunks.get(chunkId);
  if (!chunk) throw new Error(`No chunk with id ${chunkId}`);
  await db.chunks.put({ ...chunk, zoneId });
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
