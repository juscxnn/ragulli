// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Anthropic provider. Anthropic's API does not CORS-permit direct
// browser calls, so we forward through a stateless Vercel Edge
// function. The Edge function (api/anthropic.ts) accepts the user's
// key in the request body so the browser never has to set the
// `x-api-key` header (which would expose it in DevTools), adds the
// header server-side, and streams the SSE response back unchanged.
//
// This file owns the browser side of the conversation: it shapes the
// Anthropic request in the body, posts it to the Edge proxy, parses
// the SSE stream, and emits StreamChunks. NO HTTP-side secrets
// (apiKey is in the body) and NO logging of user content.

import type { ChatMessage } from '@/features/retrieval/types';
import type { StreamChunk, StreamOptions } from '../types';
import { parseSSEResponse } from '../sse';

// The proxy host. The spec says "ragulli-proxy.vercel.app"; the
// exact subdomain is a deployment decision documented in
// `vite.config.ts` (CSP connect-src) and `public/_headers`.
const PROXY_URL = 'https://ragulli-proxy.vercel.app/api/anthropic';

interface AnthropicProxyBody {
  model: string;
  apiKey: string;
  // The Edge proxy expects Anthropic's own request body shape so it
  // can stay a thin pass-through. We omit `model` here because the
  // proxy fills it from the top-level model field above.
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  system?: string;
  max_tokens: number;
  stream: true;
}

interface AnthropicSSEEvent {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop' | 'ping';
  delta?: { type?: string; text?: string };
  content_block?: { type?: string; text?: string };
  error?: { type?: string; message?: string };
}

function toAnthropicMessages(messages: ChatMessage[]): {
  system?: string;
  messages: AnthropicProxyBody['messages'];
} {
  const systemParts: string[] = [];
  const chatMessages: AnthropicProxyBody['messages'] = [];
  for (const m of messages) {
    if (m.role === 'system') {
      systemParts.push(m.content);
      continue;
    }
    if (m.role === 'user' || m.role === 'assistant') {
      chatMessages.push({ role: m.role, content: m.content });
    }
  }
  const system = systemParts.length > 0 ? systemParts.join('\n\n') : undefined;
  return { system, messages: chatMessages };
}

export async function* stream(
  messages: ChatMessage[],
  opts: StreamOptions,
): AsyncIterable<StreamChunk> {
  opts.onTrust?.({
    id: randomId(),
    ts: Date.now(),
    kind: 'model-call',
    summary: `Calling Anthropic · ${opts.model}`,
    destination: PROXY_URL,
  });

  const { system, messages: chatMessages } = toAnthropicMessages(messages);
  const body: AnthropicProxyBody = {
    model: opts.model,
    apiKey: opts.apiKey,
    messages: chatMessages,
    ...(system ? { system } : {}),
    max_tokens: 4096,
    stream: true,
  };

  let res: Response;
  try {
    res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
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
      message: `Anthropic proxy returned ${res.status}. ${detail}`.trim(),
    };
    return;
  }

  for await (const evt of parseSSEResponse<AnthropicSSEEvent>(res, {
    signal: opts.signal,
  })) {
    // We only emit text from content_block_delta events. The other
    // event types carry no user-facing text and are filtered out.
    if (evt.type === 'content_block_delta') {
      const text = evt.delta?.text;
      if (text) yield { type: 'token', text };
    } else if (evt.type === 'error') {
      yield {
        type: 'error',
        message: evt.error?.message ?? 'Anthropic returned an error event',
      };
      return;
    }
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
