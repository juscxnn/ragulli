// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Google Gemini streaming provider. Calls Gemini's
// `streamGenerateContent` endpoint directly from the browser. Unlike
// OpenAI/MiniMax/Kimi, Google's streaming endpoint emits
// newline-delimited JSON objects, not SSE. Each chunk contains
// `candidates[0].content.parts[0].text`; we emit it as one `token`
// chunk per line.

import type { ChatMessage } from '@/features/retrieval/types';
import type { StreamChunk, StreamOptions, GeminiStreamChunk } from '../types';

interface GeminiPart {
  text?: string;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiBody {
  contents: GeminiContent[];
  generationConfig?: Record<string, unknown>;
}

function toGeminiContents(messages: ChatMessage[]): GeminiContent[] {
  // Gemini alternates `user` and `model` roles; we collapse adjacent
  // same-role messages into one entry, and skip `system` messages
  // because Gemini's free-tier endpoint does not accept them.
  const out: GeminiContent[] = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';
    const last = out[out.length - 1];
    if (last && last.role === role) {
      last.parts.push({ text: m.content });
    } else {
      out.push({ role, parts: [{ text: m.content }] });
    }
  }
  if (out.length === 0 || out[0]?.role !== 'user') {
    // Gemini requires the conversation to start with a `user` turn.
    out.unshift({ role: 'user', parts: [{ text: '' }] });
  }
  return out;
}

export async function* stream(
  messages: ChatMessage[],
  opts: StreamOptions,
): AsyncIterable<StreamChunk> {
  opts.onTrust?.({
    id: randomId(),
    ts: Date.now(),
    kind: 'model-call',
    summary: `Calling Google · ${opts.model}`,
    destination: `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:streamGenerateContent`,
  });

  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      opts.model,
    )}:streamGenerateContent`,
  );
  url.searchParams.set('alt', 'sse');
  // The spec from Subagent C uses ?key=${apiKey} rather than the
  // x-goog-api-key header; both work, but the query-string form is
  // what the prompt specifies, and it survives an http-to-https
  // downgrade warning better in some browsers.

  const body: GeminiBody = {
    contents: toGeminiContents(messages),
    generationConfig: { temperature: 0.2 },
  };

  let res: Response;
  try {
    res = await fetch(`${url.toString()}&key=${encodeURIComponent(opts.apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      message: `Google request failed (${res.status}). ${detail}`.trim(),
    };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  try {
    while (true) {
      if (opts.signal?.aborted) {
        await reader.cancel();
        return;
      }
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        const trimmed = line.trim();
        if (!trimmed) continue;
        let parsed: GeminiStreamChunk;
        try {
          parsed = JSON.parse(trimmed) as GeminiStreamChunk;
        } catch {
          // Malformed line; skip and continue.
          continue;
        }
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield { type: 'token', text };
      }
    }
    // Final leftover (some Gemini responses omit the trailing newline).
    const trimmed = buffer.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed) as GeminiStreamChunk;
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield { type: 'token', text };
      } catch {
        /* ignore */
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* already released */
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
