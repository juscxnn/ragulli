// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Async iteration helpers. We use a tiny custom chunk splitter so the
// chat panel can stream tokens without pulling in a stream-parser lib.

export async function* splitLines(stream: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    let nl = buffer.indexOf('\n');
    while (nl >= 0) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      yield line;
      nl = buffer.indexOf('\n');
    }
    if (done) {
      if (buffer.length > 0) yield buffer;
      return;
    }
  }
}

export function textFromSseEvent(event: string): string | null {
  // SSE data: lines are "data: <payload>". A blank line ends the event.
  const data = event
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('\n');
  if (!data) return null;
  if (data === '[DONE]') return null;
  return data;
}
