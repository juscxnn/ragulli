// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Ingest pipeline. Subagent B owns this. The shape is fixed here so the
// UI and the trust panel can import the same types.

import type { Chunk } from '@/features/retrieval/types';

export type IngestKind = 'pdf' | 'docx' | 'markdown' | 'text' | 'url' | 'audio';

export type IngestProgress =
  | { stage: 'parsing'; kind: IngestKind }
  | { stage: 'writing-opfs' }
  | { stage: 'chunking'; totalEstimated: number }
  | { stage: 'embedding'; completed: number; total: number }
  | { stage: 'indexing' }
  | { stage: 'done'; sourceId: string; chunksCreated: number };

export type IngestResult = {
  sourceId: string;
  chunksCreated: number;
};

export type IngestOptions = {
  workspaceId: string;
  onProgress?: (p: IngestProgress) => void;
  signal?: AbortSignal;
};

export type IngestFileFn = (
  file: File,
  opts: IngestOptions,
) => Promise<IngestResult>;

// Default no-op pipeline; Subagent B replaces this with the real one.
export const ingestFile: IngestFileFn = async (file) => {
  throw new Error(
    `Ingest pipeline not yet wired (received ${file.name}). Subagent B owns this.`,
  );
};

export type _ReexportForChunks = Chunk;
