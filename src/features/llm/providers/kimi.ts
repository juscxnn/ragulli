// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Moonshot Kimi streaming provider. Kimi exposes an OpenAI-compatible
// SSE endpoint at `https://api.moonshot.cn/v1/chat/completions`. We
// use the same `delta.content` parser shape as OpenAI.
//
// Kimi's docs explicitly recommend a slightly higher temperature for
// generation tasks; we pin 0.3 per the spec's locked decision.

import type { ChatMessage } from '@/features/retrieval/types';
import type { StreamChunk, StreamOptions, OpenAISSEEvent } from '../types';
import { parseSSEResponse } from '../sse';

interface KimiBody {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  stream: true;
  temperature: number;
}

function toKimiMessages(messages: ChatMessage[]): KimiBody['messages'] {
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
    summary: `Calling Kimi · ${opts.model}`,
    destination: 'https://api.moonshot.cn/v1/chat/completions',
  });

  const body: KimiBody = {
    model: opts.model,
    messages: toKimiMessages(messages),
    stream: true,
    temperature: 0.3,
  };

  let res: Response;
  try {
    res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
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
      message: `Kimi request failed (${res.status}). ${detail}`.trim(),
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
