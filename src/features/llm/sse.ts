// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Tiny SSE (Server-Sent Events) parser built on top of the browser
// `ReadableStream` API. The OpenAI-compatible providers (OpenAI,
// MiniMax, Kimi, Anthropic-via-proxy) emit events in the
// `data: <json>\n\n` shape with `data: [DONE]` marking the end.
// Each yielded object is the parsed JSON payload of one event.
//
// We intentionally keep this helper small: no retry logic, no event-id
// tracking, no per-line buffering beyond what the `TextDecoderStream`
// already does. The provider modules wrap this with their own
// payload-shape narrowing.

export interface SSERawEvent {
  /** Raw event-type, e.g. "message" or empty string. */
  event: string;
  /** Raw data after stripping the `data: ` prefix. Usually JSON. */
  data: string;
}

interface ParserOptions {
  signal?: AbortSignal;
}

/**
 * Iterate an SSE response body. Yields the raw `data:` payload of
 * each event (not JSON-parsed yet) so the caller can handle parsing
 * errors per provider. Terminates cleanly on `data: [DONE]`.
 */
export async function* readRawSSE(
  res: Response,
  opts: ParserOptions = {},
): AsyncIterableIterator<SSERawEvent> {
  if (!res.body) return;
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
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const evt = parseEvent(raw);
        if (evt === null) continue;
        yield evt;
        if (evt.data === '[DONE]') return;
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* already released */
    }
  }
}

/**
 * Convenience: iterate an SSE response and yield parsed JSON payloads
 * of type `T`. Skips malformed events silently (does not throw),
 * because providers sometimes send keepalive lines with no data.
 */
export async function* parseSSEResponse<T>(
  res: Response,
  opts: ParserOptions = {},
): AsyncIterableIterator<T> {
  for await (const evt of readRawSSE(res, opts)) {
    if (evt.data === '[DONE]') return;
    try {
      yield JSON.parse(evt.data) as T;
    } catch {
      // Ignore malformed lines. The chat UI handles missing tokens.
    }
  }
}

function parseEvent(raw: string): SSERawEvent | null {
  let event = '';
  const dataLines: string[] = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith(':')) continue; // comment / keepalive
    if (line.startsWith('event:')) {
      event = line.slice(6).trimStart();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
    // Field names other than event/data are ignored.
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}
