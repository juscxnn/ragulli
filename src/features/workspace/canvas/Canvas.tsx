// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Canvas — the spatial workspace where sources live as cards. Owns
// the drag-drop wiring between zones (HTML5 native API) and exposes
// the "Create zone" button per spec Scene 5. The whole canvas is a
// drop target: dropping a file outside any zone routes it through
// the ingest pipeline.

import { useCallback, useMemo, type DragEvent, type FC, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useWorkspaceStore, nextZoneColor, type SourceCard } from '../store';
import type { Zone as ZoneData, Chunk } from '@/features/retrieval/types';
import {
  assignChunkToZone,
  putZone,
  getChunksForSource,
  getSource,
} from '@/features/retrieval/store';
import { Button } from '@/components/ui/Button';
import { Dropzone } from '@/features/dropzone/Dropzone';
import { useTrustLog } from '@/features/trust/TrustLog';
import type { ProgressEvent } from '@/features/ingest/types';
import { ingestFile } from '@/features/ingest/pipeline';
import type { TrustActivity } from '@/features/llm/types';
import { SourceCard as SourceCardView } from './Card';
import { Zone } from './Zone';

export type CanvasProps = {
  workspaceId: string;
};

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_CHUNK_OVERLAP = 100;

interface IngestPrefs {
  chunkSize: number;
  chunkOverlap: number;
}

function loadIngestPrefs(): IngestPrefs {
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

function loadIngestOpts(workspaceId: string): {
  workspaceId: string;
  chunkSize: number;
  chunkOverlap: number;
} {
  const prefs = loadIngestPrefs();
  return {
    workspaceId,
    chunkSize: prefs.chunkSize,
    chunkOverlap: prefs.chunkOverlap,
  };
}

function phaseLabel(
  phase: 'parse' | 'store' | 'chunk' | 'embed' | 'save' | 'done' | 'error',
): string {
  switch (phase) {
    case 'parse':
      return 'parsing';
    case 'store':
      return 'saving file';
    case 'chunk':
      return 'chunking';
    case 'embed':
      return 'embedding';
    case 'save':
      return 'persisting';
    case 'done':
      return 'done';
    case 'error':
      return 'failed';
  }
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export const Canvas: FC<CanvasProps> = ({ workspaceId }) => {
  const sources = useWorkspaceStore((s) => s.sources);
  const chunksBySource = useWorkspaceStore((s) => s.chunksBySource);
  const zones = useWorkspaceStore((s) => s.zones);
  const zoneWeights = useWorkspaceStore((s) => s.zoneWeights);
  const addZone = useWorkspaceStore((s) => s.addZone);
  const removeZone = useWorkspaceStore((s) => s.removeZone);
  const updateZone = useWorkspaceStore((s) => s.updateZone);
  const setZoneWeight = useWorkspaceStore((s) => s.setZoneWeight);
  const assignAll = useWorkspaceStore((s) => s.assignAllChunksForSource);
  const openViewer = useWorkspaceStore((s) => s.openSourceViewer);
  const setChunks = useWorkspaceStore((s) => s.setChunksForSource);
  const addSourceCard = useWorkspaceStore((s) => s.addSource);
  const setIngestProgress = useWorkspaceStore((s) => s.setIngestProgress);
  const ingestProgress = useWorkspaceStore((s) => s.ingestProgress);
  const pushTrust = useTrustLog((s) => s.push);

  const [draggingSourceId, setDraggingSourceId] = useState<string | null>(null);
  const [fileOver, setFileOver] = useState(false);

  const sourcesByZone = useMemo(() => {
    const out = new Map<string | null, SourceCard[]>();
    for (const src of sources) {
      const chunks: Chunk[] = chunksBySource[src.id] ?? [];
      const zoneId: string | null =
        chunks.length > 0 ? (chunks[0]?.zoneId ?? null) : null;
      const arr = out.get(zoneId) ?? [];
      arr.push(src);
      out.set(zoneId, arr);
    }
    return out;
  }, [sources, chunksBySource]);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      for (const file of files) {
        pushTrust({
          id: uuidv4(),
          ts: Date.now(),
          kind: 'file',
          summary: `Ingesting ${file.name}`,
          destination: 'this browser tab (parser + embed worker)',
        });
        // Optimistically surface a card before the embed worker
        // finishes, so the canvas feels responsive and the user
        // can move the card into a zone while embed churns.
        const optimisticId = uuidv4();
        addSourceCard(
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
          const ingestOpts = loadIngestOpts(workspaceId);
          const onProgress = makeProgressHandler(file.name, setIngestProgress);
          const result = await ingestFile(file, ingestOpts, onProgress);
          // Replace the optimistic card with the canonical Source row.
          const source = await getSource(result.sourceId);
          const chunks = await getChunksForSource(result.sourceId);
          if (source) addSourceCard(source, chunks.length);
          setChunks(result.sourceId, chunks);
          setIngestProgress({
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
          // Clear the "done" toast after a beat so the next ingest
          // does not see a stale entry.
          window.setTimeout(() => setIngestProgress(null), 800);
        } catch (err) {
          setIngestProgress({
            sourceId: uuidv4(),
            filename: file.name,
            phase: 'error',
            ratio: 0,
            summary: 'Ingest failed',
            error: errMessage(err),
          });
          pushTrust({
            id: uuidv4(),
            ts: Date.now(),
            kind: 'error',
            summary: `Ingest failed for ${file.name}: ${errMessage(err)}`,
          });
        }
      }
    },
    [workspaceId, pushTrust, setIngestProgress, addSourceCard, setChunks],
  );

  const onCanvasDragOver = (e: DragEvent<HTMLDivElement>): void => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (!fileOver) setFileOver(true);
    }
  };

  const onCanvasDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    if (e.currentTarget === e.target) setFileOver(false);
  };

  const onCanvasDrop = (e: DragEvent<HTMLDivElement>): void => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setFileOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    void handleFiles(files);
  };

  const onCreateZone = async (): Promise<void> => {
    const id = uuidv4();
    const color = nextZoneColor(zones.length);
    const z: ZoneData = {
      id,
      workspaceId,
      name: zones.length === 0 ? 'Trusted' : `Group ${zones.length + 1}`,
      weight: 1.0,
      color,
      position: { x: 0, y: zones.length },
    };
    addZone(z);
    try {
      await putZone(z);
    } catch {
      /* DB may be unavailable in sandboxed envs; the in-memory
       * store still serves the canvas. */
    }
  };

  const onDropSource = (zoneId: string, sourceId: string): void => {
    assignAll(sourceId, zoneId);
    const chunks = chunksBySource[sourceId] ?? [];
    void Promise.all(
      chunks.map((c) => assignChunkToZone(c.id, zoneId).catch(() => undefined)),
    ).catch(() => undefined);
  };

  const onRenameZone = (id: string, name: string): void => {
    updateZone(id, { name });
  };

  const onDeleteZone = (id: string): void => {
    removeZone(id);
  };

  const onWeightChange = (id: string, weight: number): void => {
    setZoneWeight(id, weight);
  };

  const unzoned = sourcesByZone.get(null) ?? [];
  const isBusy =
    ingestProgress !== null &&
    ingestProgress.phase !== 'done' &&
    ingestProgress.phase !== 'error';

  return (
    <div
      className="relative h-full"
      onDragOver={onCanvasDragOver}
      onDragLeave={onCanvasDragLeave}
      onDrop={onCanvasDrop}
    >
      {sources.length === 0 && !isBusy ? (
        <div className="h-full flex items-center justify-center p-6">
          <div className="w-full max-w-2xl">
            <Dropzone
              onFiles={(files) => void handleFiles(files)}
              accept=".pdf,.docx,.md,.markdown,.txt,.html,.htm"
            >
              <div className="flex flex-col items-center gap-2 py-6">
                <span className="text-sm text-[var(--color-fg)]">
                  Drop a file to ingest
                </span>
                <span className="text-xs text-[var(--color-fg-muted)]">
                  PDF, DOCX, Markdown, text, HTML
                </span>
              </div>
            </Dropzone>
          </div>
        </div>
      ) : (
        <div className="h-full overflow-auto p-6 flex flex-col gap-6">
          {ingestProgress ? (
            <div
              role="status"
              className={`rounded-md border px-3 py-2 text-xs ${
                ingestProgress.phase === 'error'
                  ? 'border-[var(--color-danger)]/40 text-[var(--color-danger)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-fg-muted)]'
              }`}
            >
              <span className="text-[var(--color-fg)]">{ingestProgress.filename}</span> ·{' '}
              {phaseLabel(ingestProgress.phase)}
              {ingestProgress.phase !== 'error' ? (
                <>
                  {' · '}
                  <span className="tabular-nums">
                    {Math.round(ingestProgress.ratio * 100)}%
                  </span>
                </>
              ) : ingestProgress.error ? (
                <> · {ingestProgress.error}</>
              ) : null}
            </div>
          ) : null}

          {zones.map((z) => {
            const cards = sourcesByZone.get(z.id) ?? [];
            return (
              <Zone
                key={z.id}
                id={z.id}
                name={z.name}
                weight={zoneWeights[z.id] ?? z.weight}
                color={z.color}
                onWeightChange={onWeightChange}
                onRename={onRenameZone}
                onDelete={onDeleteZone}
                onDropSource={onDropSource}
                sourceCount={cards.length}
              >
                {cards.length === 0 ? (
                  <p className="text-xs text-[var(--color-fg-muted)] italic px-1 py-2">
                    Drag cards here.
                  </p>
                ) : (
                  cards.map((src) => (
                    <SourceCardView
                      key={src.id}
                      source={src}
                      zoneName={z.name}
                      zoneColor={z.color}
                      onOpen={openViewer}
                      onDragStart={() => setDraggingSourceId(src.id)}
                      onDragEnd={() => setDraggingSourceId(null)}
                      isDragging={draggingSourceId === src.id}
                    />
                  ))
                )}
              </Zone>
            );
          })}

          {unzoned.length > 0 ? (
            <section className="rounded-lg border border-[var(--color-border)] border-dashed p-4">
              <h3 className="text-sm font-medium text-[var(--color-fg-muted)] mb-3">
                Ungrouped
                <span className="ml-2 text-[11px] tabular-nums">{unzoned.length}</span>
              </h3>
              <div className="flex flex-col gap-2">
                {unzoned.map((src) => (
                  <SourceCardView
                    key={src.id}
                    source={src}
                    onOpen={openViewer}
                    onDragStart={() => setDraggingSourceId(src.id)}
                    onDragEnd={() => setDraggingSourceId(null)}
                    isDragging={draggingSourceId === src.id}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <div>
            <Button variant="secondary" size="sm" onClick={() => void onCreateZone()}>
              + Create zone
            </Button>
          </div>
        </div>
      )}

      {fileOver ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-2 rounded-lg border-2 border-dashed border-[var(--color-accent)] bg-[var(--color-accent)]/5"
        />
      ) : null}
    </div>
  );
};

function makeProgressHandler(
  filename: string,
  setProgress: (p: ReturnType<typeof useWorkspaceStore.getState>['ingestProgress']) => void,
): (e: ProgressEvent) => void {
  let lastEmit = 0;
  return (e: ProgressEvent) => {
    const now = Date.now();
    if (now - lastEmit < 60 && e.ratio < 1) return;
    lastEmit = now;
    setProgress({
      sourceId: 'in-progress',
      filename,
      phase: e.phase,
      ratio: e.ratio,
      summary: `${e.phase} ${Math.round(e.ratio * 100)}%`,
    });
  };
}

// Keep the type exported for downstream users.
export type { TrustActivity };