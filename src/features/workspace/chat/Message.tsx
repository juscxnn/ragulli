// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Message — a single chat message. Subagent D renders citations inline.

import type { FC } from 'react';
import type { ChatMessage as LLMChatMessage } from '@/features/llm/types';

export type MessageProps = {
  message: LLMChatMessage;
};

export const Message: FC<MessageProps> = ({ message }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[11px] uppercase tracking-wide text-[var(--color-fg-muted)]">
      {message.role}
    </span>
    <p className="text-sm text-[var(--color-fg)] whitespace-pre-wrap">{message.content}</p>
  </div>
);
