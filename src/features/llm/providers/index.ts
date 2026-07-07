// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Provider index. Re-exports for convenience and lists the available
// provider ids in display order. Subagent C fills in the per-provider
// modules; here we just declare the public surface.

import type { ChatMessage, ProviderId, StreamChunk, StreamOptions } from '../types';

export type Provider = {
  id: ProviderId;
  name: string;
  needsKey: boolean;
  description: string;
  defaultModel: string;
  stream: (messages: ChatMessage[], options: StreamOptions) => AsyncIterable<StreamChunk>;
};

export const PROVIDER_IDS: readonly ProviderId[] = [
  'openai',
  'anthropic',
  'google',
  'minimax',
  'kimi',
  'webllm',
] as const;

export function getAvailableProviders(): Provider[] {
  // Placeholder: empty until Subagent C registers real providers.
  return [];
}
