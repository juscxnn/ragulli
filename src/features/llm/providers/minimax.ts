// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// MiniMax streaming provider. Uses the same OpenAI-compatible
// `delta.content` SSE shape that the OpenAI / MiniMax / Moonshot family
// emits. We share the SSE parser with OpenAI but point at MiniMax's
// own endpoint.
//
// IMPORTANT: MiniMax returns a JSON envelope ({"base_resp":{...}})
// on auth / model errors with HTTP 200, instead of an error status.
// The previous implementation silently treated this as an empty SSE
// stream and yielded `done` with no content — leaving the user with
// a blank assistant message and no explanation. We now read the
// response body fully, detect the JSON envelope by its first byte,
// and surface the MiniMax status_code / status_msg as an error chunk.

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

function formatMiniMaxError(jsonText: string): string {
  try {
    const obj = JSON.parse(jsonText) as {
      base_resp?: { status_code?: number; status_msg?: string };
    };
    const code = obj.base_resp?.status_code;
    const msg = obj.base_resp?.status_msg ?? jsonText.slice(0, 240);
    if (typeof code === 'number') {
      return `MiniMax (code ${code}): ${msg}`;
    }
    return `MiniMax: ${msg}`;
  } catch {
    return `MiniMax: ${jsonText.slice(0, 240)}`;
  }
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

  if (!res.ok) {
    const detail = await safeReadError(res);
    yield {
      type: 'error',
      message: `MiniMax request failed (${res.status}). ${detail}`.trim(),
    };
    return;
  }

  // Drain the body fully so we can detect a JSON envelope error
  // response. MiniMax uses the same endpoint for both SSE and JSON
  // and distinguishes by the request rather than the body shape, so
  // a `stream: true` request usually returns SSE — but auth or model
  // errors can come back as JSON with HTTP 200.
  const fullText = await res.text();
  const trimmed = fullText.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    yield { type: 'error', message: formatMiniMaxError(fullText) };
    return;
  }

  // Reconstruct a stream from the cached text so the SSE parser can
  // iterate the same way it does for other providers.
  const reconstructed = new Response(fullText, {
    headers: res.headers,
    status: res.status,
    statusText: res.statusText,
  });
  for await (const evt of parseSSEResponse<OpenAISSEEvent>(reconstructed, {
    signal: opts.signal,
  })) {
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