// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// LLM types. The chat, message, and citation shapes live in
// `@/features/retrieval/types` because multiple features need them. Here
// we add the LLM-only shapes (streaming chunk, provider options).

import type { ChatMessage as _ChatMessage, TrustActivity as _TrustActivity } from '@/features/retrieval/types';

export type ProviderId = 'openai' | 'anthropic' | 'google' | 'minimax' | 'kimi' | 'webllm';

export type { ChatMessage, TrustActivity } from '@/features/retrieval/types';

export type StreamChunk =
  | { type: 'token'; text: string }
  | { type: 'done'; usage?: { promptTokens: number; completionTokens: number } }
  | { type: 'error'; message: string };

export type StreamOptions = {
  provider: ProviderId;
  apiKey?: string;
  model: string;
  signal?: AbortSignal;
};

// Reference imports to make the linter see the symbol as "used".
export type _Retained = _ChatMessage | _TrustActivity;
