// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Canvas — the spatial workspace where sources live as cards. Owns
// the drag-drop wiring between zones (HTML5 native API) and exposes
// the "Create zone" button per spec Scene 5. The whole canvas is a
// drop target: dropping a file outside any zone routes it through
// the ingest pipeline.

import { useCallback, useMemo, useRef, type ChangeEvent, type DragEvent, type FC, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useWorkspaceStore, nextZoneColor, type SourceCard } from '../store';
import { ingestFiles } from '../ingest';
import type { Zone as ZoneData, Chunk } from '@/features/retrieval/types';
import { assignChunkToZone, putZone } from '@/features/retrieval/store';
import { Button } from '@/components/ui/Button';
import { Dropzone } from '@/features/dropzone/Dropzone';
import type { TrustActivity } from '@/features/llm/types';
import { SourceCard as SourceCardView } from './Card';
import { Zone } from './Zone';

export type CanvasProps = {
  workspaceId: string;
};

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
  const ingestProgress = useWorkspaceStore((s) => s.ingestProgress);

  const [draggingSourceId, setDraggingSourceId] = useState<string | null>(null);
  const [fileOver, setFileOver] = useState(false);
  const addFileRef = useRef<HTMLInputElement>(null);

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

  // All the ingest mechanics (optimistic card, progress, trust
  // entries, error surfacing) live in the shared controller so this
  // drop target behaves exactly like the FirstDrop hero.
  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      await ingestFiles(files, workspaceId);
    },
    [workspaceId],
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

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => void onCreateZone()}>
              + Create zone
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addFileRef.current?.click()}
            >
              + Add source
            </Button>
            {/* Click-to-add path for the populated canvas; drag-drop
                anywhere on the canvas still works. */}
            <input
              ref={addFileRef}
              type="file"
              multiple
              accept=".pdf,.docx,.md,.markdown,.txt,.html,.htm"
              className="hidden"
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length > 0) void handleFiles(files);
                e.target.value = '';
              }}
            />
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

// Keep the type exported for downstream users.
export type { TrustActivity };