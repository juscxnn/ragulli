// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Unified stream interface. Subagent C implements the real per-provider
// streams; we keep the typecheck surface stable.

import type { ChatMessage, StreamChunk, StreamOptions } from './types';

export async function* streamChat(
  messages: ChatMessage[],
  options: StreamOptions,
): AsyncIterable<StreamChunk> {
  // Placeholder: emit a single error token so the UI can show that the
  // wiring is missing. Subagent C replaces this with the real provider
  // implementation.
  void messages;
  void options;
  yield { type: 'error', message: 'streamChat not yet wired. Subagent C owns this.' };
}
