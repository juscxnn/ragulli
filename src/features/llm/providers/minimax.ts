// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// MiniMax streaming provider. Uses the same OpenAI-compatible
// `delta.content` SSE shape that the OpenAI/MiniMax/Moonshot family
// emits. We share the SSE parser with OpenAI but point at MiniMax's
// own endpoint.
//
// NOTE: the official MiniMax docs page lists the endpoint as
// `https://api.minimaxi.chat/v1/text/chatcompletion_v2`. We follow
// the spec's locked URL verbatim.

import type { ChatMessage } from '@/features/retrieval/types';
import type { StreamChunk, StreamOptions, OpenAISSEEvent } from '../types';
import { parseSSEResponse } from '../sse';

interface MiniMaxBody {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  stream: true;
}

function toMiniMaxMessages(messages: ChatMessage[]): MiniMaxBody['messages'] {
  return messages
    .filter((m) => m.role === 'system' || m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));
}

export async function* stream(
  messages: ChatMessage[],
  opts: StreamOptions,
): AsyncIterable<StreamChunk> {
  opts.onTrust?.({
    id: randomId(),
    ts: Date.now(),
    kind: 'model-call',
    summary: `Calling MiniMax · ${opts.model}`,
    destination: 'https://api.minimaxi.chat/v1/text/chatcompletion_v2',
  });

  const body: MiniMaxBody = {
    model: opts.model,
    messages: toMiniMaxMessages(messages),
    stream: true,
  };

  let res: Response;
  try {
    res = await fetch('https://api.minimaxi.chat/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (err) {
    yield { type: 'error', message: errToMessage(err) };
    return;
  }

  if (!res.ok || !res.body) {
    const detail = await safeReadError(res);
    yield {
      type: 'error',
      message: `MiniMax request failed (${res.status}). ${detail}`.trim(),
    };
    return;
  }

  for await (const evt of parseSSEResponse<OpenAISSEEvent>(res, { signal: opts.signal })) {
    const text = evt.choices?.[0]?.delta?.content;
    if (text) yield { type: 'token', text };
  }

  yield { type: 'done' };
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `act-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

async function safeReadError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return '';
    try {
      const obj = JSON.parse(text) as { error?: { message?: string } };
      if (obj.error?.message) return obj.error.message;
      return text.slice(0, 200);
    } catch {
      return text.slice(0, 200);
    }
  } catch {
    return '';
  }
}

function errToMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
