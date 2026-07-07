// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Reducer-style unit tests for the workspace store. The store is a
// plain zustand vanilla, so we can call actions imperatively and
// read state back without React. Each test resets the store to a
// known baseline via `clearAll()`.

import { beforeEach, describe, expect, it } from 'vitest';
import {
  useWorkspaceStore,
  nextZoneColor,
  type SourceCard,
} from '@/features/workspace/store';
import type { Source, Zone } from '@/features/retrieval/types';

function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: overrides.id ?? `src-${Math.random().toString(36).slice(2)}`,
    workspaceId: overrides.workspaceId ?? 'ws-1',
    filename: overrides.filename ?? 'doc.pdf',
    mimeType: overrides.mimeType ?? 'application/pdf',
    byteSize: overrides.byteSize ?? 1024,
    addedAt: overrides.addedAt ?? Date.now(),
    originOpfsPath: overrides.originOpfsPath ?? 'ragulli-files/x',
    parserVersion: overrides.parserVersion ?? 'v1',
    meta: overrides.meta ?? {},
  };
}

function makeZone(overrides: Partial<Zone> = {}): Zone {
  return {
    id: overrides.id ?? `z-${Math.random().toString(36).slice(2)}`,
    workspaceId: overrides.workspaceId ?? 'ws-1',
    name: overrides.name ?? 'Trusted',
    weight: overrides.weight ?? 1.0,
    color: overrides.color ?? '#E0B158',
    position: overrides.position ?? { x: 0, y: 0 },
  };
}

beforeEach(() => {
  useWorkspaceStore.getState().clearAll();
});

describe('workspace store: workspaces', () => {
  it('adds a workspace and selects it', () => {
    const { addWorkspace, setActiveWorkspace } = useWorkspaceStore.getState();
    addWorkspace({
      id: 'ws-1',
      name: 'A',
      templateId: null,
      createdAt: 0,
      updatedAt: 0,
    });
    addWorkspace({
      id: 'ws-2',
      name: 'B',
      templateId: null,
      createdAt: 0,
      updatedAt: 0,
    });
    setActiveWorkspace('ws-2');
    expect(useWorkspaceStore.getState().workspaces.length).toBe(2);
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('ws-2');
  });

  it('upserts on duplicate add', () => {
    const { addWorkspace } = useWorkspaceStore.getState();
    addWorkspace({ id: 'a', name: 'old', templateId: null, createdAt: 0, updatedAt: 0 });
    addWorkspace({ id: 'a', name: 'new', templateId: null, createdAt: 0, updatedAt: 0 });
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(1);
    expect(useWorkspaceStore.getState().workspaces[0]?.name).toBe('new');
  });
});

describe('workspace store: sources', () => {
  it('addSource updates chunkCount and replaces existing', () => {
    const { addSource } = useWorkspaceStore.getState();
    addSource(makeSource({ id: 's1' }), 12);
    expect(useWorkspaceStore.getState().sources[0]?.chunkCount).toBe(12);
    // Replace
    addSource(makeSource({ id: 's1', filename: 'renamed.pdf' }), 30);
    const after = useWorkspaceStore.getState().sources;
    expect(after).toHaveLength(1);
    expect(after[0]?.chunkCount).toBe(30);
    expect(after[0]?.filename).toBe('renamed.pdf');
  });

  it('removeSource clears the chunksBySource entry', () => {
    const store = useWorkspaceStore.getState();
    const src = makeSource({ id: 's1' });
    store.addSource(src, 4);
    store.setChunksForSource('s1', [
      {
        id: 'c1',
        sourceId: 's1',
        workspaceId: 'ws-1',
        zoneId: null,
        position: 0,
        text: 'hello',
        embedding: new Float32Array(8),
        tokenCount: 1,
      },
    ]);
    expect(useWorkspaceStore.getState().chunksBySource['s1']).toHaveLength(1);
    useWorkspaceStore.getState().removeSource('s1');
    expect(useWorkspaceStore.getState().chunksBySource['s1']).toBeUndefined();
    expect(useWorkspaceStore.getState().sources).toHaveLength(0);
  });

  it('setSources with chunkCounts materializes SourceCard rows', () => {
    useWorkspaceStore.getState().setSources(
      [makeSource({ id: 'a' }), makeSource({ id: 'b' })],
      { a: 5, b: 9 },
    );
    const list = useWorkspaceStore.getState().sources;
    expect(list).toHaveLength(2);
    const byId = new Map(list.map((s: SourceCard) => [s.id, s]));
    expect(byId.get('a')?.chunkCount).toBe(5);
    expect(byId.get('b')?.chunkCount).toBe(9);
  });
});

describe('workspace store: zones and weights', () => {
  it('addZone seeds zoneWeights from the zone weight', () => {
    const { addZone } = useWorkspaceStore.getState();
    addZone(makeZone({ id: 'z1', weight: 1.5 }));
    expect(useWorkspaceStore.getState().zoneWeights['z1']).toBe(1.5);
  });

  it('setZoneWeight writes only that zone', () => {
    const { addZone, setZoneWeight } = useWorkspaceStore.getState();
    addZone(makeZone({ id: 'z1' }));
    addZone(makeZone({ id: 'z2' }));
    setZoneWeight('z1', 0.4);
    expect(useWorkspaceStore.getState().zoneWeights).toEqual({ z1: 0.4, z2: 1 });
  });

  it('removeZone clears zoneId on chunks assigned to it', () => {
    const store = useWorkspaceStore.getState();
    store.addZone(makeZone({ id: 'z1' }));
    store.setChunksForSource('s1', [
      {
        id: 'c1',
        sourceId: 's1',
        workspaceId: 'ws-1',
        zoneId: 'z1',
        position: 0,
        text: 'hi',
        embedding: new Float32Array(4),
        tokenCount: 1,
      },
    ]);
    store.removeZone('z1');
    const chunks = useWorkspaceStore.getState().chunksBySource['s1'] ?? [];
    expect(chunks[0]?.zoneId).toBeNull();
    expect(useWorkspaceStore.getState().zones).toHaveLength(0);
  });

  it('updateZone writes through name + weight', () => {
    const { addZone, updateZone } = useWorkspaceStore.getState();
    addZone(makeZone({ id: 'z1', name: 'Old' }));
    updateZone('z1', { name: 'New', weight: 0.3 });
    const z = useWorkspaceStore.getState().zones[0];
    expect(z?.name).toBe('New');
    expect(z?.weight).toBe(0.3);
    expect(useWorkspaceStore.getState().zoneWeights['z1']).toBe(0.3);
  });

  it('nextZoneColor cycles the palette', () => {
    expect(nextZoneColor(0)).toBe('#E0B158');
    expect(nextZoneColor(1)).toBe('#8FA396');
    expect(nextZoneColor(6)).toBe('#E0B158'); // wraps
  });
});

describe('workspace store: chunks and zone assignment', () => {
  it('assignAllChunksForSource sets zoneId on every chunk', () => {
    const store = useWorkspaceStore.getState();
    store.addSource(makeSource({ id: 's1' }), 2);
    store.setChunksForSource('s1', [
      chunk('c1', 's1', null),
      chunk('c2', 's1', null),
    ]);
    store.assignAllChunksForSource('s1', 'z1');
    const after = useWorkspaceStore.getState().chunksBySource['s1'] ?? [];
    expect(after.every((c) => c.zoneId === 'z1')).toBe(true);
  });

  it('assignChunk changes one chunk only', () => {
    const store = useWorkspaceStore.getState();
    store.setChunksForSource('s1', [chunk('c1', 's1', null), chunk('c2', 's1', null)]);
    store.assignChunk('s1', 'c1', 'zA');
    const after = useWorkspaceStore.getState().chunksBySource['s1'] ?? [];
    expect(after[0]?.zoneId).toBe('zA');
    expect(after[1]?.zoneId).toBeNull();
  });

  it('setChunksForSource updates the source card chunkCount', () => {
    const store = useWorkspaceStore.getState();
    store.addSource(makeSource({ id: 's1' }), 0);
    store.setChunksForSource('s1', [chunk('c1', 's1', null), chunk('c2', 's1', null)]);
    const src = useWorkspaceStore.getState().sources[0];
    expect(src?.chunkCount).toBe(2);
  });
});

describe('workspace store: messages and streaming', () => {
  it('addMessage returns the same id and sets streamingMessageId', () => {
    const { addMessage } = useWorkspaceStore.getState();
    const id = addMessage({
      id: 'm1',
      role: 'user',
      content: 'hi',
      createdAt: 0,
    });
    expect(id).toBe('m1');
    expect(useWorkspaceStore.getState().streamingMessageId).toBe('m1');
  });

  it('appendStreamToken appends to the message content', () => {
    const { addMessage, appendStreamToken } = useWorkspaceStore.getState();
    const id = addMessage({ id: 'm2', role: 'assistant', content: '', createdAt: 0 });
    appendStreamToken(id, 'Hello');
    appendStreamToken(id, ', world');
    const msg = useWorkspaceStore.getState().messages[0];
    expect(msg?.content).toBe('Hello, world');
  });

  it('finalizeMessage patches content and clears streamingMessageId', () => {
    const { addMessage, appendStreamToken, finalizeMessage } = useWorkspaceStore.getState();
    const id = addMessage({ id: 'm3', role: 'assistant', content: '', createdAt: 0 });
    appendStreamToken(id, 'partial');
    finalizeMessage(id, { content: 'full' });
    const msg = useWorkspaceStore.getState().messages[0];
    expect(msg?.content).toBe('full');
    expect(useWorkspaceStore.getState().streamingMessageId).toBeNull();
  });

  it('clearMessages empties the message list', () => {
    const { addMessage, clearMessages } = useWorkspaceStore.getState();
    addMessage({ id: 'a', role: 'user', content: 'x', createdAt: 0 });
    clearMessages();
    expect(useWorkspaceStore.getState().messages).toHaveLength(0);
    expect(useWorkspaceStore.getState().streamingMessageId).toBeNull();
  });
});

describe('workspace store: source viewer', () => {
  it('openSourceViewer flips the viewer open with charStart', () => {
    useWorkspaceStore.getState().openSourceViewer('s1', 42);
    const v = useWorkspaceStore.getState().sourceViewer;
    expect(v.open).toBe(true);
    expect(v.sourceId).toBe('s1');
    expect(v.charStart).toBe(42);
  });

  it('closeSourceViewer resets to closed', () => {
    const store = useWorkspaceStore.getState();
    store.openSourceViewer('s1');
    store.closeSourceViewer();
    const v = useWorkspaceStore.getState().sourceViewer;
    expect(v.open).toBe(false);
    expect(v.sourceId).toBeNull();
  });
});

describe('workspace store: clearAll', () => {
  it('resets every slice', () => {
    const store = useWorkspaceStore.getState();
    store.addSource(makeSource({ id: 's1' }), 4);
    store.addZone(makeZone({ id: 'z1' }));
    store.addMessage({ id: 'm', role: 'user', content: 'x', createdAt: 0 });
    store.openSourceViewer('s1');
    store.setIngestProgress({
      sourceId: 's1',
      filename: 'f',
      phase: 'parse',
      ratio: 0.5,
      summary: 'parsing 50%',
    });
    store.clearAll();
    const s = useWorkspaceStore.getState();
    expect(s.sources).toHaveLength(0);
    expect(s.zones).toHaveLength(0);
    expect(s.zoneWeights).toEqual({});
    expect(s.messages).toHaveLength(0);
    expect(s.sourceViewer.open).toBe(false);
    expect(s.ingestProgress).toBeNull();
    expect(s.activeWorkspaceId).toBeNull();
  });
});

function chunk(id: string, sourceId: string, zoneId: string | null) {
  return {
    id,
    sourceId,
    workspaceId: 'ws-1',
    zoneId,
    position: 0,
    text: 'hello',
    embedding: new Float32Array(4),
    tokenCount: 1,
  };
}