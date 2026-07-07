// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Message protocol for the embed worker. The main-thread wrapper and
// the worker both import this so request and response shapes are
// kept in lock-step.

export type EmbedRequest = {
  type: 'embed';
  id: string;
  chunks: string[];
};

export type EmbedResultMessage = {
  type: 'embed:result';
  id: string;
  embeddings: number[][];
};

export type EmbedErrorMessage = {
  type: 'embed:error';
  id: string;
  message: string;
};

export type EmbedderMessage = EmbedRequest | EmbedResultMessage | EmbedErrorMessage;
