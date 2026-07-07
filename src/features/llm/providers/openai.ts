// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// OpenAI streaming provider. Calls `https://api.openai.com/v1/chat/completions`
// directly from the browser. CORS is permitted by OpenAI for this endpoint,
// so we do not route through a proxy. We emit one `token` chunk per
// `delta.content` SSE event and a `done` chunk on `data: [DONE]`.
//
// The provider knows nothing about the chat UI; Subagent D wires it
// through the dispatcher in `stream.ts`.

import type { ChatMessage } from '@/features/retrieval/types';
import type { StreamChunk, StreamOptions, OpenAISSEEvent } from '../types';
import { parseSSEResponse } from '../sse';

interface OpenAIBody {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  stream: true;
  temperature: number;
}

function toOpenAIMessages(messages: ChatMessage[]): OpenAIBody['messages'] {
  return messages
    .filter((m) => m.role === 'system' || m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));
}

export async function* stream(
  messages: ChatMessage[],
  opts: StreamOptions,
): AsyncIterable<StreamChunk> {
  opts.onTrust?.({
    id: cryptoRandomId(),
    ts: Date.now(),
    kind: 'model-call',
    summary: `Calling OpenAI · ${opts.model}`,
    destination: 'https://api.openai.com/v1/chat/completions',
  });

  const body: OpenAIBody = {
    model: opts.model,
    messages: toOpenAIMessages(messages),
    stream: true,
    temperature: 0.2,
  };

  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
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
      message: `OpenAI request failed (${res.status}). ${detail}`.trim(),
    };
    return;
  }

  for await (const evt of parseSSEResponse<OpenAISSEEvent>(res)) {
    const text = evt.choices?.[0]?.delta?.content;
    if (text) yield { type: 'token', text };
  }

  yield { type: 'done' };
}

function cryptoRandomId(): string {
  // crypto.randomUUID is in both browser and Node 20; fallback to Math.random
  // for ancient runtimes.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `act-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

async function safeReadError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return '';
    // OpenAI returns JSON like { "error": { "message": "..." } }.
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
