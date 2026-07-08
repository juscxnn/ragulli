// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// LLM public API. The single import surface for other features.
// Subagent D imports from here exclusively.

export { streamChat } from './stream';
export { buildCitations, segmentForRender } from './citation-builder';
export { setKey, getKey, clearAll, hasKey } from './keys';
export {
  getAvailableProviders,
  setProvider,
  getActiveProvider,
  getProvider,
  getModel,
  setModel,
  clearModelOverrides,
  hasExplicitProviderChoice,
} from './provider-registry';
export type {
  ProviderId,
  ChatRequest,
  StreamChunk,
  StreamOptions,
  ChatMessage,
  TrustActivity,
} from './types';
export type { BuiltCitation, CitationContext, CitationMode, RenderSegment } from './citation-builder';
export type { ProviderDescriptor } from './provider-registry';
