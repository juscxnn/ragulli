// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// LLM public API. The single import surface for other features.

export { streamChat } from './stream';
export { setKey, getKey, clearAll as clearAllKeys } from './keys';
export { PROVIDER_IDS, getAvailableProviders } from './providers';
export type { ProviderId, ChatMessage, StreamChunk, StreamOptions, TrustActivity } from './types';
export { buildCitations } from './citation-builder';
