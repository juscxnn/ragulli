// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Tests for the Vercel Edge function `api/anthropic.ts`. We import
// the default export as a function `(req: Request) => Promise<Response>`
// and mock globalThis.fetch so we never actually call Anthropic.
//
// The tests verify:
//   - method != POST returns 405
//   - non-JSON body returns 400
//   - missing fields return 400
//   - valid POST forwards x-api-key, anthropic-version, and the
//     correct body shape to api.anthropic.com
//   - response passes through only content-type from the upstream
//   - non-OK upstream responses are wrapped as JSON
//   - the file does not contain console.log / localStorage / cookies

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface FetchCall {
  url: string;
  init: RequestInit;
}

function captureFetch(): { setImpl: (impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) => void; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  let impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> = async () =>
    new Response('', { status: 599 });
  const fn = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;
    calls.push({ url, init: init ?? {} });
    return impl(input, init);
  };
  vi.stubGlobal('fetch', fn);
  return {
    setImpl: (next) => {
      impl = next;
    },
    calls,
  };
}

let realFetch: typeof fetch | undefined;
beforeEach(() => {
  realFetch = globalThis.fetch;
});
afterEach(() => {
  if (realFetch !== undefined) {
    vi.stubGlobal('fetch', realFetch);
  } else {
    vi.unstubAllGlobals();
  }
});

async function importHandler(): Promise<(req: Request) => Promise<Response>> {
  const mod = await import('../../api/anthropic');
  return mod.default;
}

describe('api/anthropic.ts — Edge function', () => {
  it('returns 405 for non-POST requests', async () => {
    const handler = await importHandler();
    const res = await handler(new Request('https://example.com/api/anthropic', { method: 'GET' }));
    expect(res.status).toBe(405);
  });

  it('returns 400 when the body is not valid JSON', async () => {
    const handler = await importHandler();
    const req = new Request('https://example.com/api/anthropic', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { type: string } };
    expect(body.error.type).toBe('invalid_json');
  });

  it('returns 400 when required fields are missing', async () => {
    const handler = await importHandler();
    const req = new Request('https://example.com/api/anthropic', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'x' }),
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { type: string } };
    expect(body.error.type).toBe('invalid_request');
  });

  it('forwards x-api-key, anthropic-version, and the request body to Anthropic', async () => {
    const cap = captureFetch();
    cap.setImpl(async () =>
      new Response('data: {"type":"message_stop"}\n\ndata: [DONE]\n\n', {
        status: 200,
        headers: { 'content-type': 'text/event-stream', 'x-request-id': 'should-be-stripped' },
      }),
    );
    const handler = await importHandler();
    const req = new Request('https://ragulli-proxy.vercel.app/api/anthropic', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        apiKey: 'sk-ant-test-abc',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1024,
        stream: true,
      }),
    });
    const res = await handler(req);
    expect(res.status).toBe(200);

    expect(cap.calls).toHaveLength(1);
    expect(cap.calls[0]!.url).toBe('https://api.anthropic.com/v1/messages');

    const headers = cap.calls[0]!.init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-ant-test-abc');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    expect(headers['content-type']).toBe('application/json');

    const body = JSON.parse(cap.calls[0]!.init.body as string);
    expect(body.model).toBe('claude-sonnet-4-5');
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
    expect(body.max_tokens).toBe(1024);
    expect(body.stream).toBe(true);
    expect(body.apiKey).toBeUndefined(); // apiKey stripped from body before forwarding
  });

  it('defaults max_tokens to 4096 when not provided', async () => {
    const cap = captureFetch();
    cap.setImpl(async () =>
      new Response('data: [DONE]\n\n', {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      }),
    );
    const handler = await importHandler();
    const req = new Request('https://example.com/api/anthropic', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'm',
        apiKey: 'k',
        messages: [{ role: 'user', content: 'q' }],
      }),
    });
    await handler(req);
    const body = JSON.parse(cap.calls[0]!.init.body as string);
    expect(body.max_tokens).toBe(4096);
  });

  it('passes through only content-type and strips other Anthropic headers', async () => {
    const cap = captureFetch();
    cap.setImpl(async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('event: message\ndata: {"x":1}\n\n'));
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: {
          'content-type': 'text/event-stream; charset=utf-8',
          'x-request-id': 'must-be-stripped',
          'x-amzn-trace-id': 'must-be-stripped',
          'anthropic-organization-id': 'must-be-stripped',
          'set-cookie': 'must-be-stripped',
        },
      });
    });
    const handler = await importHandler();
    const req = new Request('https://example.com/api/anthropic', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'm',
        apiKey: 'k',
        messages: [{ role: 'user', content: 'q' }],
      }),
    });
    const res = await handler(req);
    expect(res.headers.get('content-type')).toBe('text/event-stream; charset=utf-8');
    expect(res.headers.get('x-request-id')).toBeNull();
    expect(res.headers.get('x-amzn-trace-id')).toBeNull();
    expect(res.headers.get('anthropic-organization-id')).toBeNull();
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('wraps a non-OK upstream response as JSON', async () => {
    const cap = captureFetch();
    cap.setImpl(async () =>
      new Response(JSON.stringify({ error: 'rate limited' }), {
        status: 429,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const handler = await importHandler();
    const req = new Request('https://example.com/api/anthropic', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'm',
        apiKey: 'k',
        messages: [{ role: 'user', content: 'q' }],
      }),
    });
    const res = await handler(req);
    expect(res.status).toBe(429);
    expect(res.headers.get('content-type')).toBe('application/json');
    const body = (await res.json()) as { error: { type: string; message: string } };
    expect(body.error.type).toBe('upstream_error');
    expect(body.error.message).toMatch(/rate limited/);
  });

  it('returns 502 when fetch throws', async () => {
    const cap = captureFetch();
    cap.setImpl(async () => {
      throw new TypeError('Failed to fetch');
    });
    const handler = await importHandler();
    const req = new Request('https://example.com/api/anthropic', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'm',
        apiKey: 'k',
        messages: [{ role: 'user', content: 'q' }],
      }),
    });
    const res = await handler(req);
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: { type: string } };
    expect(body.error.type).toBe('upstream_unreachable');
  });
});

describe('api/anthropic.ts — source-file invariants', () => {
  it('does not contain console.log / console.error statements', () => {
    const path = resolve(__dirname, '../../api/anthropic.ts');
    const src = readFileSync(path, 'utf8');
    // Strip comment lines that mention console for documentation
    // (the file has a comment about why we don't log).
    const lines = src
      .split('\n')
      .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'));
    const codeOnly = lines.join('\n');
    expect(codeOnly).not.toMatch(/console\.(log|error|info|warn|debug)/);
  });

  it('does not touch localStorage or cookies', () => {
    const path = resolve(__dirname, '../../api/anthropic.ts');
    const src = readFileSync(path, 'utf8');
    // Strip line and block comments so the rule applies to code only.
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');
    expect(stripped).not.toMatch(/localStorage/);
    expect(stripped).not.toMatch(/sessionStorage/);
    expect(stripped).not.toMatch(/document\.cookie/);
    expect(stripped).not.toMatch(/cookies\b/);
  });

  it('declares the edge runtime', () => {
    const path = resolve(__dirname, '../../api/anthropic.ts');
    const src = readFileSync(path, 'utf8');
    expect(src).toMatch(/export\s+const\s+config\s*=\s*\{[^}]*runtime:\s*['"]edge['"]/);
  });
});
