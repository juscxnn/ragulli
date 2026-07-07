// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// LLM provider protocol. The wire shapes used by every provider in
// `features/llm/providers/*` and the dispatcher in `stream.ts`. Kept in
// a single file so Subagent D can import the full set without
// reaching into per-provider modules.

import type {
  ChatMessage as _ChatMessage,
  TrustActivity as _TrustActivity,
} from '@/features/retrieval/types';

export type ProviderId = 'openai' | 'anthropic' | 'google' | 'minimax' | 'kimi' | 'webllm';

export type { ChatMessage, TrustActivity } from '@/features/retrieval/types';

/**
 * Per-provider streaming options. The minimum every provider accepts.
 * Provider modules may extend this with provider-specific extras
 * (e.g. system prompt injection for Anthropic).
 */
export interface StreamOptions {
  /** The user's BYOK key. Empty string for the in-browser `webllm` provider. */
  apiKey: string;
  /** The model id (e.g. `gpt-4o-mini`, `claude-sonnet-4-5`, `Phi-3.5-mini-instruct-q4f16_1-MLC`). */
  model: string;
  /** Cooperative cancellation; honored by all HTTP-based providers. */
  signal?: AbortSignal;
  /**
   * Emitted once before the underlying network call (or model load)
   * fires. Subagent D wires this into the trust panel. Providers MUST
   * emit at minimum a `model-call` activity so the UI can show the
   * destination.
   */
  onTrust?: (e: TrustActivity) => void;
}

/**
 * One chunk of streamed output. The dispatcher in `stream.ts`
 * forwards these chunks opaquely to the caller; Subagent D's chat
 * panel is the consumer.
 */
export type StreamChunk =
  | { type: 'token'; text: string }
  | { type: 'done'; meta?: Record<string, unknown> }
  | { type: 'error'; message: string; meta?: Record<string, unknown> };

/**
 * The top-level request shape. The dispatcher in `stream.ts` takes
 * one of these and selects the right provider module based on
 * `provider`. We export this here so callers do not have to import
 * provider modules directly.
 */
export interface ChatRequest {
  provider: ProviderId;
  model: string;
  messages: _ChatMessage[];
  apiKey: string;
  signal?: AbortSignal;
  onTrust?: (e: _TrustActivity) => void;
}

/**
 * OpenAI-style SSE delta payload (subset). The provider modules use
 * this typing only internally; the public surface is `StreamChunk`.
 */
export interface OpenAISSEEvent {
  choices?: Array<{ delta?: { content?: string } }>;
}

/**
 * Gemini's streamGenerateContent JSON chunk (subset). The browser
 * CORS endpoint delivers an array of such chunks.
 */
export interface GeminiStreamChunk {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

// Reference imports keep the linter from complaining about unused
// symbols while still surfacing the canonical chat/trust types.
export type _Retained = _ChatMessage | _TrustActivity;
