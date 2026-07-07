// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Ingest pipeline types. The pipeline itself lives in pipeline.ts;
// this file is the only place the rest of the app imports the option
// and progress shapes, so changing the wire format is a single-file
// edit.

export interface IngestOptions {
  /** Workspace the new source and its chunks belong to. */
  workspaceId: string;
  /** Maximum number of tokens per chunk. */
  chunkSize: number;
  /** Number of tokens shared between adjacent chunks. */
  chunkOverlap: number;
}

export type ProgressEvent = {
  phase: 'parse' | 'store' | 'chunk' | 'embed' | 'save';
  /** 0..1 within the phase. */
  ratio: number;
};

/** A no-op progress callback. Useful as a default argument. */
export const noopProgress = (_e: ProgressEvent): void => {
  void _e;
};
