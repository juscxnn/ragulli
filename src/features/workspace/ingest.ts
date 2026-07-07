// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Shared ingest controller. Every UI surface that accepts a file —
// the Canvas drop target, the FirstDrop hero, and the ?sample= deep
// link — routes through `ingestFiles` so the behavior is identical
// everywhere: an optimistic card appears immediately, progress
// (phase + ratio) streams into the workspace store, trust-log
// entries record the parse/embed milestones in plain English, and
// failures land in `ingestProgress` with phase 'error' so the UI
// can render them. Nothing is swallowed into the console.

import { v4 as uuidv4 } from 'uuid';

import { useWorkspaceStore, type IngestProgress } from './store';
import { useTrustLog } from '@/features/trust/TrustLog';
import { ingestFile } from '@/features/ingest/pipeline';
import type { ProgressEvent } from '@/features/ingest/types';
import { getChunksForSource, getSource } from '@/features/retrieval/store';

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_CHUNK_OVERLAP = 100;

interface IngestPrefs {
  chunkSize: number;
  chunkOverlap: number;
}

/** Chunking preferences saved by the Settings → Ingest defaults tab. */
export function loadIngestPrefs(): IngestPrefs {
  try {
    const raw = localStorage.getItem('ragulli:ingest:v1');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<IngestPrefs>;
      return {
        chunkSize:
          typeof parsed.chunkSize === 'number' ? parsed.chunkSize : DEFAULT_CHUNK_SIZE,
        chunkOverlap:
          typeof parsed.chunkOverlap === 'number' ? parsed.chunkOverlap : DEFAULT_CHUNK_OVERLAP,
      };
    }
  } catch {
    /* fall through */
  }
  return { chunkSize: DEFAULT_CHUNK_SIZE, chunkOverlap: DEFAULT_CHUNK_OVERLAP };
}

/** Plain-English label per pipeline phase, for the progress line. */
export function phaseSummary(phase: ProgressEvent['phase'], ratio: number): string {
  const pct = `${Math.round(ratio * 100)}%`;
  switch (phase) {
    case 'parse':
      return `Reading the file (${pct})`;
    case 'store':
      return `Saving the original bytes to this device (${pct})`;
    case 'chunk':
      return `Splitting into passages (${pct})`;
    case 'embed':
      return `Indexing passages locally (${pct})`;
    case 'save':
      return `Writing the index to this device (${pct})`;
  }
}

/**
 * Ingest one or more files into `workspaceId`. Resolves with the list
 * of source ids that made it all the way through the pipeline.
 * Failures never throw: they are surfaced through `ingestProgress`
 * (phase 'error') and a trust-log entry, and the failed file's
 * optimistic card is removed.
 */
export async function ingestFiles(files: File[], workspaceId: string): Promise<string[]> {
  const store = useWorkspaceStore.getState();
  const pushTrust = useTrustLog.getState().push;
  const prefs = loadIngestPrefs();
  const done: string[] = [];

  for (const file of files) {
    pushTrust({
      id: uuidv4(),
      ts: Date.now(),
      kind: 'file',
      summary: `Ingesting ${file.name}`,
      destination: 'this browser tab (parser + embed worker)',
    });

    // Optimistically surface a card before the embed worker finishes,
    // so the canvas feels responsive and the user can move the card
    // into a zone while embed churns.
    const optimisticId = uuidv4();
    store.addSource(
      {
        id: optimisticId,
        workspaceId,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        byteSize: file.size,
        addedAt: Date.now(),
        originOpfsPath: '',
        parserVersion: 'v1',
        meta: {},
      },
      0,
    );

    try {
      const result = await ingestFile(
        file,
        { workspaceId, chunkSize: prefs.chunkSize, chunkOverlap: prefs.chunkOverlap },
        makeProgressHandler(file.name, pushTrust),
      );
      // Replace the optimistic card with the canonical Source row.
      const source = await getSource(result.sourceId);
      const chunks = await getChunksForSource(result.sourceId);
      store.removeSource(optimisticId);
      if (source) store.addSource(source, chunks.length);
      store.setChunksForSource(result.sourceId, chunks);
      store.setIngestProgress({
        sourceId: result.sourceId,
        filename: file.name,
        phase: 'done',
        ratio: 1,
        summary: `Indexed ${result.chunksCreated} chunks`,
      });
      pushTrust({
        id: uuidv4(),
        ts: Date.now(),
        kind: 'chunk',
        summary: `Indexed ${result.chunksCreated} chunks from ${file.name}`,
        destination: 'IndexedDB (this tab)',
      });
      done.push(result.sourceId);
      // Clear the "done" toast after a beat so the next ingest does
      // not see a stale entry.
      window.setTimeout(() => {
        const current = useWorkspaceStore.getState().ingestProgress;
        if (current?.phase === 'done') useWorkspaceStore.getState().setIngestProgress(null);
      }, 800);
    } catch (err) {
      // The failed file never became a real source; drop its card so
      // the canvas does not show a ghost entry.
      store.removeSource(optimisticId);
      reportIngestError(file.name, err);
    }
  }
  return done;
}

/**
 * Surface an ingest failure honestly: the workspace store gets a
 * phase-'error' progress entry the canvas and hero render inline,
 * and the trust log records what happened.
 */
export function reportIngestError(filename: string, err: unknown): void {
  const message = errMessage(err);
  useWorkspaceStore.getState().setIngestProgress({
    sourceId: uuidv4(),
    filename,
    phase: 'error',
    ratio: 0,
    summary: `Could not ingest ${filename}`,
    error: message,
  });
  useTrustLog.getState().push({
    id: uuidv4(),
    ts: Date.now(),
    kind: 'error',
    summary: `Ingest failed for ${filename}: ${message}`,
  });
}

function makeProgressHandler(
  filename: string,
  pushTrust: ReturnType<typeof useTrustLog.getState>['push'],
): (e: ProgressEvent) => void {
  let lastEmit = 0;
  let lastPhase: ProgressEvent['phase'] | null = null;
  return (e: ProgressEvent) => {
    // Trust milestones: one entry when parsing completes, one when
    // the local embedding pass completes.
    if (e.ratio >= 1 && e.phase !== lastPhase) {
      lastPhase = e.phase;
      if (e.phase === 'parse') {
        pushTrust({
          id: uuidv4(),
          ts: Date.now(),
          kind: 'file',
          summary: `Parsed ${filename}`,
          destination: 'this browser tab (parser)',
        });
      } else if (e.phase === 'embed') {
        pushTrust({
          id: uuidv4(),
          ts: Date.now(),
          kind: 'embed',
          summary: `Embedded ${filename} locally`,
          destination: 'this browser tab (embed worker)',
        });
      }
    }
    // Throttle store writes so a fast pipeline does not thrash React.
    const now = Date.now();
    if (now - lastEmit < 60 && e.ratio < 1) return;
    lastEmit = now;
    const progress: IngestProgress = {
      sourceId: 'in-progress',
      filename,
      phase: e.phase,
      ratio: e.ratio,
      summary: phaseSummary(e.phase, e.ratio),
    };
    useWorkspaceStore.getState().setIngestProgress(progress);
  };
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
