// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Embedding worker wrapper. Subagent B fills the real implementation;
// this file documents the contract so other modules can import safely.

export type EmbedRequest = {
  type: 'embed';
  id: string;
  texts: string[];
};

export type EmbedResponse = {
  type: 'embed-result';
  id: string;
  embeddings: Float32Array[];
};

export type EmbedderMessage = EmbedRequest | EmbedResponse;

export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  // Placeholder: throw until Subagent B wires the worker.
  throw new Error(`embedTexts not yet wired (received ${texts.length} texts). Subagent B owns this.`);
}
