// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Retrieval types. These mirror the spec §4.3 schema. Subagent B extends
// with the full Dexie schema and search logic, but the shapes are owned
// here because other features import them.

export type Source = {
  id: string;
  workspaceId: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  addedAt: number;
  originOpfsPath: string;
  parserVersion: string;
  meta: Record<string, unknown>;
};

export type Chunk = {
  id: string;
  sourceId: string;
  workspaceId: string;
  zoneId: string | null;
  position: number;
  text: string;
  embedding: Float32Array;
  tokenCount: number;
};

export type Zone = {
  id: string;
  workspaceId: string;
  name: string;
  weight: number; // 0.0 .. 2.0
  color: string; // hex
  position: { x: number; y: number };
};

export type Workspace = {
  id: string;
  name: string;
  templateId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type Citation = {
  id: string;
  chunkId: string;
  sourceId: string;
  pageNumber?: number;
  charStart: number;
  charEnd: number;
};

export type Role = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  citations?: Citation[];
  trustEntries?: TrustActivity[];
  createdAt: number;
};

export type TrustActivity = {
  id: string;
  ts: number;
  kind: 'file' | 'chunk' | 'embed' | 'model-call' | 'model-response' | 'error';
  summary: string;
  destination?: string;
};

export type Chat = {
  id: string;
  workspaceId: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
};

export type SearchHit = {
  chunk: Chunk;
  score: number;
};

export type TopKOptions = {
  k?: number;
  workspaceId?: string;
  weightByZone?: Record<string, number>;
  filter?: (chunk: Chunk) => boolean;
};
