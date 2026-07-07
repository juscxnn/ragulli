// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Ingest types — re-export from the canonical location (retrieval/types)
// so the ingest feature has a single import surface.

export type { Chunk, Source, Zone, Workspace } from '@/features/retrieval/types';

export type ParserVersion = string;
