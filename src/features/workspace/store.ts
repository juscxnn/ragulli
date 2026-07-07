// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Workspace store. Single zustand store per feature area per spec
// §4.1. Holds the in-memory mirrors of the IndexedDB rows the UI
// needs to render: workspaces, sources, chunks (keyed by sourceId),
// zones, zone weights, the chat thread, the streaming message id,
// and the current ingest progress. The Dexie layer in
// `features/retrieval/store` is the source of truth on disk; this
// store is a render-side cache that other components subscribe to.

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

import type {
  ChatMessage,
  Chunk,
  Source,
  Workspace,
  Zone,
} from '@/features/retrieval/types';

/** A new source card default — what we seed in the canvas before the
 *  ingest pipeline finishes. The Source row is written to IndexedDB
 *  as soon as the user picks a file, but we want the card to render
 *  immediately so the canvas feels responsive. */
export type SourceCard = Source & {
  chunkCount: number;
};

export type SourceViewerState = {
  open: boolean;
  sourceId: string | null;
  charStart: number;
};

export type IngestProgress = {
  sourceId: string;
  filename: string;
  phase: 'parse' | 'store' | 'chunk' | 'embed' | 'save' | 'done' | 'error';
  ratio: number;
  /** Plain-English summary suitable for the active trust panel. */
  summary: string;
  error?: string;
};

export type WorkspaceState = {
  activeWorkspaceId: string | null;
  workspaces: Workspace[];
  sources: SourceCard[];
  chunksBySource: Record<string, Chunk[]>;
  zones: Zone[];
  zoneWeights: Record<string, number>;
  messages: ChatMessage[];
  streamingMessageId: string | null;
  ingestProgress: IngestProgress | null;
  sourceViewer: SourceViewerState;
  /** Monotonic counter bumped whenever the active workspace's
   *  template changes. ChatPanel subscribes to it so the picker can
   *  trigger a re-read of `ragulli:active-template:v1` without
   *  forcing the picker to import the chat panel. */
  templateVersion: number;

  /* lifecycle */
  setActiveWorkspace: (id: string | null) => void;
  addWorkspace: (w: Workspace) => void;
  removeWorkspace: (id: string) => void;
  setWorkspaces: (ws: Workspace[]) => void;

  /* sources */
  addSource: (s: Source, chunkCount: number) => void;
  removeSource: (id: string) => void;
  setSources: (sources: Source[], chunkCounts: Record<string, number>) => void;
  setChunksForSource: (sourceId: string, chunks: Chunk[]) => void;

  /* zones */
  addZone: (z: Zone) => void;
  updateZone: (id: string, patch: Partial<Zone>) => void;
  removeZone: (id: string) => void;
  setZones: (zones: Zone[], weights: Record<string, number>) => void;
  setZoneWeight: (id: string, weight: number) => void;

  /* chunk assignment */
  assignChunk: (sourceId: string, chunkId: string, zoneId: string | null) => void;
  assignAllChunksForSource: (sourceId: string, zoneId: string | null) => void;

  /* chat */
  addMessage: (m: ChatMessage) => string;
  appendStreamToken: (id: string, token: string) => void;
  finalizeMessage: (id: string, patch?: Partial<ChatMessage>) => void;
  setMessages: (m: ChatMessage[]) => void;
  clearMessages: () => void;

  /* ingest */
  setIngestProgress: (p: IngestProgress | null) => void;

  /* source viewer */
  openSourceViewer: (sourceId: string, charStart?: number) => void;
  closeSourceViewer: () => void;

  /* everything */
  clearAll: () => void;

  /* templates */
  bumpTemplateVersion: () => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspaceId: null,
  workspaces: [],
  sources: [],
  chunksBySource: {},
  zones: [],
  zoneWeights: {},
  messages: [],
  streamingMessageId: null,
  ingestProgress: null,
  sourceViewer: { open: false, sourceId: null, charStart: 0 },
  templateVersion: 0,

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
  addWorkspace: (w) =>
    set((s) => {
      const idx = s.workspaces.findIndex((x) => x.id === w.id);
      if (idx >= 0) {
        const next = s.workspaces.slice();
        next[idx] = w;
        return { workspaces: next };
      }
      return { workspaces: [...s.workspaces, w] };
    }),
  removeWorkspace: (id) =>
    set((s) => ({
      workspaces: s.workspaces.filter((w) => w.id !== id),
      activeWorkspaceId: s.activeWorkspaceId === id ? null : s.activeWorkspaceId,
    })),
  setWorkspaces: (ws) => set({ workspaces: ws }),

  addSource: (s, chunkCount) =>
    set((state) => {
      const card: SourceCard = { ...s, chunkCount };
      const idx = state.sources.findIndex((x) => x.id === s.id);
      if (idx >= 0) {
        const next = state.sources.slice();
        next[idx] = card;
        return { sources: next };
      }
      return { sources: [...state.sources, card] };
    }),
  removeSource: (id) =>
    set((s) => {
      const nextChunks = { ...s.chunksBySource };
      delete nextChunks[id];
      return {
        sources: s.sources.filter((x) => x.id !== id),
        chunksBySource: nextChunks,
      };
    }),
  setSources: (sources, chunkCounts) =>
    set({
      sources: sources.map((s) => ({
        ...s,
        chunkCount: chunkCounts[s.id] ?? 0,
      })),
    }),
  setChunksForSource: (sourceId, chunks) =>
    set((s) => ({
      chunksBySource: { ...s.chunksBySource, [sourceId]: chunks },
      sources: s.sources.map((src) =>
        src.id === sourceId ? { ...src, chunkCount: chunks.length } : src,
      ),
    })),

  addZone: (z) =>
    set((s) => {
      const idx = s.zones.findIndex((x) => x.id === z.id);
      if (idx >= 0) {
        const next = s.zones.slice();
        next[idx] = z;
        return { zones: next };
      }
      return {
        zones: [...s.zones, z],
        zoneWeights: { ...s.zoneWeights, [z.id]: z.weight },
      };
    }),
  updateZone: (id, patch) =>
    set((s) => ({
      zones: s.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)),
      zoneWeights:
        patch.weight === undefined
          ? s.zoneWeights
          : { ...s.zoneWeights, [id]: patch.weight },
    })),
  removeZone: (id) =>
    set((s) => {
      const next = { ...s.zoneWeights };
      delete next[id];
      // Clear zoneId on any chunks assigned to this zone
      const nextChunks: Record<string, Chunk[]> = {};
      for (const [sid, chunks] of Object.entries(s.chunksBySource)) {
        nextChunks[sid] = chunks.map((c) => (c.zoneId === id ? { ...c, zoneId: null } : c));
      }
      return {
        zones: s.zones.filter((z) => z.id !== id),
        zoneWeights: next,
        chunksBySource: nextChunks,
      };
    }),
  setZones: (zones, weights) => set({ zones, zoneWeights: weights }),
  setZoneWeight: (id, weight) =>
    set((s) => ({ zoneWeights: { ...s.zoneWeights, [id]: weight } })),

  assignChunk: (sourceId, chunkId, zoneId) =>
    set((s) => {
      const chunks = s.chunksBySource[sourceId];
      if (!chunks) return {};
      const next = chunks.map((c) => (c.id === chunkId ? { ...c, zoneId } : c));
      return { chunksBySource: { ...s.chunksBySource, [sourceId]: next } };
    }),
  assignAllChunksForSource: (sourceId, zoneId) =>
    set((s) => {
      const chunks = s.chunksBySource[sourceId];
      if (!chunks) return {};
      const next = chunks.map((c) => ({ ...c, zoneId }));
      return { chunksBySource: { ...s.chunksBySource, [sourceId]: next } };
    }),

  addMessage: (m) => {
    const id = m.id || uuidv4();
    const message: ChatMessage = { ...m, id };
    set((s) => ({ messages: [...s.messages, message], streamingMessageId: id }));
    return id;
  },
  appendStreamToken: (id, token) =>
    set((s) => {
      const idx = s.messages.findIndex((m) => m.id === id);
      if (idx < 0) return {};
      const next = s.messages.slice();
      const existing = next[idx]!;
      next[idx] = { ...existing, content: existing.content + token };
      return { messages: next };
    }),
  finalizeMessage: (id, patch) =>
    set((s) => {
      const idx = s.messages.findIndex((m) => m.id === id);
      if (idx < 0) return {};
      const next = s.messages.slice();
      const existing = next[idx]!;
      next[idx] = { ...existing, ...(patch ?? {}) };
      return {
        messages: next,
        streamingMessageId: s.streamingMessageId === id ? null : s.streamingMessageId,
      };
    }),
  setMessages: (m) => set({ messages: m }),
  clearMessages: () => set({ messages: [], streamingMessageId: null }),

  setIngestProgress: (p) => set({ ingestProgress: p }),

  openSourceViewer: (sourceId, charStart = 0) =>
    set({ sourceViewer: { open: true, sourceId, charStart } }),
  closeSourceViewer: () =>
    set({ sourceViewer: { open: false, sourceId: null, charStart: 0 } }),

clearAll: () =>
    set({
      activeWorkspaceId: null,
      workspaces: [],
      sources: [],
      chunksBySource: {},
      zones: [],
      zoneWeights: {},
      messages: [],
      streamingMessageId: null,
      ingestProgress: null,
      sourceViewer: { open: false, sourceId: null, charStart: 0 },
      templateVersion: 0,
    }),

  bumpTemplateVersion: () => set((s) => ({ templateVersion: s.templateVersion + 1 })),
}));

/** Stable color rotation for newly-created zones. The first two
 *  match the spec's example ("trusted" amber, "background" sage);
 *  the rest are tasteful variants on the same hue wheel. */
export const ZONE_COLOR_PALETTE: readonly string[] = [
  '#E0B158', // amber
  '#8FA396', // sage
  '#C45A4A', // brick
  '#6EA886', // moss
  '#D8A07A', // peach
  '#A0B6CF', // dusk
];

/** Resolve the next palette color based on the current zone count. */
export function nextZoneColor(existing: number): string {
  const palette = ZONE_COLOR_PALETTE;
  return palette[existing % palette.length]!;
}

/** Lookup helper that callers can use without subscribing to the whole
 *  store. Returns the source card for `sourceId`, or undefined. */
export function findSource(sources: readonly SourceCard[], sourceId: string): SourceCard | undefined {
  return sources.find((s) => s.id === sourceId);
}

/** Lookup helper for a zone. */
export function findZone(zones: readonly Zone[], zoneId: string): Zone | undefined {
  return zones.find((z) => z.id === zoneId);
}