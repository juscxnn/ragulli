// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Chat persistence. The workspace store is the render-side cache;
// this module writes the thread to `db.chats` (one row per
// workspace, deterministic id) so a reload can rehydrate the
// conversation. Persistence is best-effort and non-blocking — a
// storage failure must never break the chat itself.

import type { Chat, ChatMessage } from '@/features/retrieval/types';
import { putChat } from '@/features/retrieval/store';

/** Deterministic chat row id so every finalize upserts the same row. */
export function chatIdFor(workspaceId: string): string {
  return `chat-${workspaceId}`;
}

/**
 * Persist the given messages as the workspace's chat thread.
 * Best-effort: errors are swallowed because losing a saved thread is
 * strictly better than losing the live one.
 */
export async function persistChat(
  workspaceId: string,
  messages: ChatMessage[],
): Promise<void> {
  if (messages.length === 0) return;
  const firstUser = messages.find((m) => m.role === 'user');
  const chat: Chat = {
    id: chatIdFor(workspaceId),
    workspaceId,
    title: (firstUser?.content ?? 'Chat').slice(0, 80),
    createdAt: messages[0]?.createdAt ?? Date.now(),
    messages,
  };
  try {
    await putChat(chat);
  } catch {
    /* best-effort; IndexedDB may be unavailable in sandboxed envs */
  }
}
