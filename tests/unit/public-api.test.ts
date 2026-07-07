// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Compile-time check that the public API surface documented in
// the Subagent B prompt is exported with the right names and
// shapes. This file has no runtime tests; it only needs to
// typecheck.

import { ingestFile } from '@/features/ingest/pipeline';
import type { IngestOptions, ProgressEvent } from '@/features/ingest/types';

import { topK } from '@/features/retrieval/search';
import type { SearchOptions, SearchResult } from '@/features/retrieval/search';

import { embedBatch } from '@/features/retrieval/embed';

import {
  assignChunkToZone,
  getAllChunks,
  getChunksForSource,
  getSource,
  getZonesForWorkspace,
  putChunks,
  putSource,
  putZone,
} from '@/features/retrieval/store';

import { clearAll, getFile, listAll, putFile } from '@/lib/opfs';

// Reference each symbol to keep `noUnusedLocals` quiet.
const _check: unknown[] = [
  ingestFile,
  topK,
  embedBatch,
  assignChunkToZone,
  getAllChunks,
  getChunksForSource,
  getSource,
  getZonesForWorkspace,
  putChunks,
  putSource,
  putZone,
  clearAll,
  getFile,
  listAll,
  putFile,
];
void _check;

const _opts: IngestOptions = { workspaceId: 'ws', chunkSize: 800, chunkOverlap: 100 };
const _progress: ProgressEvent = { phase: 'parse', ratio: 0 };
const _searchOpts: SearchOptions = { workspaceId: 'ws' };
const _searchResult: SearchResult = { chunk: undefined as never, score: 0 };
void _opts;
void _progress;
void _searchOpts;
void _searchResult;
