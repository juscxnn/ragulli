// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Tests for the BYOK providers. Each test mocks globalThis.fetch
// with a streaming Response backed by a ReadableStream, then asserts
// the chunk sequence the provider emitted is exactly what we expect.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '@/features/retrieval/types';

// =========================================================================
// Mocked fetch stream helper
// =========================================================================

function makeSSEResponse(events: string[]): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const evt of events) {
        controller.enqueue(enc.encode(evt));
      }
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  });
}

function makeJsonStreamResponse(events: string[]): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const evt of events) {
        controller.enqueue(enc.encode(evt));
      }
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/x-ndjson' },
  });
}

function makeErrorResponse(status: number, body: string): Response {
  return new Response(body, { status, headers: { 'content-type': 'application/json' } });
}

interface FetchCall {
  url: string;
  init: RequestInit;
}

type FetchImpl = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function captureFetch(): { setImpl: (impl: FetchImpl) => void; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  let impl: FetchImpl = async () => new Response('', { status: 599 });

  const fn: FetchImpl = async (input, init) => {
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

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of iter) out.push(x);
  return out;
}

// =========================================================================
// Shared messages for tests
// =========================================================================

const messages: ChatMessage[] = [
  {
    id: 'u1',
    role: 'user',
    content: 'hi',
    createdAt: 0,
  },
];

const opts = { apiKey: 'test-key', model: 'test-model' };

// =========================================================================
// OpenAI
// =========================================================================

describe('openai provider', () => {
  let realFetch: typeof fetch | undefined;
  beforeEach(() => {
    realFetch = globalThis.fetch;
  });
  afterEach(() => {
    if (realFetch) vi.stubGlobal('fetch', realFetch);
    else vi.unstubAllGlobals();
  });

  it('POSTs to /v1/chat/completions with Bearer auth and correct body', async () => {
    const cap = captureFetch();
    cap.setImpl(async () =>
      makeSSEResponse([
        'data: {"choices":[{"delta":{"content":"hi"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const { stream } = await import('@/features/llm/providers/openai');
    const chunks = await collect(stream(messages, opts));
    expect(cap.calls).toHaveLength(1);
    expect(cap.calls[0]!.url).toBe('https://api.openai.com/v1/chat/completions');
    expect(cap.calls[0]!.init.method).toBe('POST');
    const headers = cap.calls[0]!.init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-key');
    expect(headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(cap.calls[0]!.init.body as string);
    expect(body.model).toBe('test-model');
    expect(body.stream).toBe(true);
    expect(body.temperature).toBeCloseTo(0.2);
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
    expect(chunks.map((c) => c.type)).toEqual(['token', 'done']);
    expect(chunks[0]).toEqual({ type: 'token', text: 'hi' });
  });

  it('emits a token chunk per delta.content in the SSE stream', async () => {
    const cap = captureFetch();
    cap.setImpl(async () =>
      makeSSEResponse([
        'data: {"choices":[{"delta":{"content":"a"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"b"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"c"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const { stream } = await import('@/features/llm/providers/openai');
    const chunks = await collect(stream(messages, opts));
    const tokens = chunks
      .filter((c) => c.type === 'token')
      .map((c) => (c as { text: string }).text);
    expect(tokens).toEqual(['a', 'b', 'c']);
  });

  it('emits an error chunk on non-OK responses', async () => {
    const cap = captureFetch();
    cap.setImpl(async () => makeErrorResponse(401, '{"error":{"message":"bad key"}}'));
    const { stream } = await import('@/features/llm/providers/openai');
    const chunks = await collect(stream(messages, opts));
    expect(cap.calls).toHaveLength(1);
    expect(chunks[0]?.type).toBe('error');
    expect((chunks[0] as { message: string }).message).toMatch(/401.*bad key/);
  });

  it('emits an error chunk when fetch throws', async () => {
    const cap = captureFetch();
    cap.setImpl(async () => {
      throw new TypeError('offline');
    });
    const { stream } = await import('@/features/llm/providers/openai');
    const chunks = await collect(stream(messages, opts));
    expect(cap.calls).toHaveLength(1);
    expect((chunks[0] as { message: string }).message).toMatch(/offline/);
  });
});

// =========================================================================
// Google (Gemini) — newline-delimited JSON
// =========================================================================

describe('google provider', () => {
  let realFetch: typeof fetch | undefined;
  beforeEach(() => {
    realFetch = globalThis.fetch;
  });
  afterEach(() => {
    if (realFetch) vi.stubGlobal('fetch', realFetch);
    else vi.unstubAllGlobals();
  });

  it('targets streamGenerateContent with key query param and parses NDJSON', async () => {
    const cap = captureFetch();
    cap.setImpl(async () =>
      makeJsonStreamResponse([
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'he' }] } }] }) + '\n',
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'llo' }] } }] }) + '\n',
      ]),
    );
    const { stream } = await import('@/features/llm/providers/google');
    const chunks = await collect(stream(messages, opts));
    expect(cap.calls).toHaveLength(1);
    expect(cap.calls[0]!.url).toContain('streamGenerateContent');
    expect(cap.calls[0]!.url).toContain('key=test-key');
    expect(cap.calls[0]!.url).toContain('alt=sse');
    const tokens = chunks
      .filter((c) => c.type === 'token')
      .map((c) => (c as { text: string }).text);
    expect(tokens).toEqual(['he', 'llo']);
    expect(chunks[chunks.length - 1]?.type).toBe('done');
  });
});

// =========================================================================
// MiniMax
// =========================================================================

describe('minimax provider', () => {
  let realFetch: typeof fetch | undefined;
  beforeEach(() => {
    realFetch = globalThis.fetch;
  });
  afterEach(() => {
    if (realFetch) vi.stubGlobal('fetch', realFetch);
    else vi.unstubAllGlobals();
  });

  it('POSTs to /v1/text/chatcompletion_v2 with Bearer auth', async () => {
    const cap = captureFetch();
    cap.setImpl(async () =>
      makeSSEResponse([
        'data: {"choices":[{"delta":{"content":"x"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const { stream } = await import('@/features/llm/providers/minimax');
    const chunks = await collect(stream(messages, opts));
    expect(cap.calls).toHaveLength(1);
    expect(cap.calls[0]!.url).toBe('https://api.minimaxi.chat/v1/text/chatcompletion_v2');
    expect((cap.calls[0]!.init.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer test-key',
    );
    expect(chunks[0]).toEqual({ type: 'token', text: 'x' });
    expect(chunks[1]?.type).toBe('done');
  });
});

// =========================================================================
// Kimi (Moonshot)
// =========================================================================

describe('kimi provider', () => {
  let realFetch: typeof fetch | undefined;
  beforeEach(() => {
    realFetch = globalThis.fetch;
  });
  afterEach(() => {
    if (realFetch) vi.stubGlobal('fetch', realFetch);
    else vi.unstubAllGlobals();
  });

  it('POSTs to Moonshot with Bearer auth and temperature 0.3', async () => {
    const cap = captureFetch();
    cap.setImpl(async () =>
      makeSSEResponse([
        'data: {"choices":[{"delta":{"content":"y"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const { stream } = await import('@/features/llm/providers/kimi');
    await collect(stream(messages, opts));
    expect(cap.calls).toHaveLength(1);
    expect(cap.calls[0]!.url).toBe('https://api.moonshot.cn/v1/chat/completions');
    expect((cap.calls[0]!.init.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer test-key',
    );
    const body = JSON.parse(cap.calls[0]!.init.body as string);
    expect(body.temperature).toBeCloseTo(0.3);
    expect(body.stream).toBe(true);
  });
});

// =========================================================================
// Anthropic — forwards to the Vercel Edge proxy
// =========================================================================

describe('anthropic provider', () => {
  let realFetch: typeof fetch | undefined;
  beforeEach(() => {
    realFetch = globalThis.fetch;
  });
  afterEach(() => {
    if (realFetch) vi.stubGlobal('fetch', realFetch);
    else vi.unstubAllGlobals();
  });

  it('POSTs to the Edge proxy with apiKey in the body (not the header)', async () => {
    const cap = captureFetch();
    cap.setImpl(async () =>
      makeSSEResponse([
        'data: {"type":"content_block_delta","delta":{"text":"AB"}}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const { stream } = await import('@/features/llm/providers/anthropic');
    await collect(stream(messages, opts));
    expect(cap.calls).toHaveLength(1);
    expect(cap.calls[0]!.url).toMatch(/ragulli-proxy\.vercel\.app\/api\/anthropic/);
    const headers = cap.calls[0]!.init.headers as Record<string, string>;
    // CRITICAL: no x-api-key on the browser side.
    expect(headers['x-api-key']).toBeUndefined();
    expect(headers['Authorization']).toBeUndefined();
    const body = JSON.parse(cap.calls[0]!.init.body as string);
    expect(body.apiKey).toBe('test-key');
    expect(body.model).toBe('test-model');
    expect(body.max_tokens).toBe(4096);
    expect(body.stream).toBe(true);
  });

  it('emits text only from content_block_delta events, not from other types', async () => {
    const cap = captureFetch();
    cap.setImpl(async () =>
      makeSSEResponse([
        'data: {"type":"ping"}\n\n',
        'data: {"type":"content_block_start"}\n\n',
        'data: {"type":"content_block_delta","delta":{"text":"X"}}\n\n',
        'data: {"type":"content_block_delta","delta":{"text":"Y"}}\n\n',
        'data: {"type":"message_stop"}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const { stream } = await import('@/features/llm/providers/anthropic');
    const chunks = await collect(stream(messages, opts));
    expect(cap.calls).toHaveLength(1);
    const tokens = chunks
      .filter((c) => c.type === 'token')
      .map((c) => (c as { text: string }).text);
    expect(tokens).toEqual(['X', 'Y']);
  });
});

// =========================================================================
// WebLLM
//
// The webllm provider statically imports webllm-engine (lazy via
// dynamic import inside the function, but the helper symbol itself
// is statically imported for the public surface). We mock the
// engine module with vi.mock at file level so the static import
// resolves to our stub. The stubs themselves expose a swap hook
// so each test can configure its own engine behavior.
// =========================================================================

interface EngineStub {
  chatChunks: Array<{ choices: Array<{ delta: { content?: string } }> }>;
  interruptGenerate: () => void;
}

interface EngineStubState {
  stub: EngineStub | null;
  rejectLoad: boolean;
  currentEngine: {
    engine: {
      chat: {
        completions: { create: (req: never) => Promise<AsyncIterable<unknown>> };
      };
      interruptGenerate: () => void;
    };
  } | null;
}

const engineStubState: EngineStubState = {
  stub: null,
  rejectLoad: false,
  currentEngine: null,
};

vi.mock('@/features/llm/providers/webllm-engine', () => ({
  DEFAULT_WEBLLM_MODEL: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
  listWebLLMModels: () => ['Phi-3.5-mini-instruct-q4f16_1-MLC'],
  getWebLLMEngine: vi.fn(async (_modelId: string, onProgress?: (r: unknown) => void) => {
    if (engineStubState.rejectLoad) {
      throw new Error('WebGPU unavailable');
    }
    if (!engineStubState.stub) {
      throw new Error('No engine stub configured for this test');
    }
    const asyncIter = (async function* (): AsyncIterable<unknown> {
      for (const c of engineStubState.stub!.chatChunks) yield c;
    })();
    const engine = {
      engine: {
        chat: {
          completions: {
            create: vi.fn(async () => asyncIter),
          },
        },
        interruptGenerate: vi.fn(),
      },
    };
    engineStubState.currentEngine = engine;
    if (onProgress) onProgress({ progress: 1, timeElapsed: 0, text: 'ready' });
    return engine;
  }),
  _resetWebLLMEngineForTests: () => undefined,
}));

// Re-import after the mock is installed so the provider module's
// static `import` of webllm-engine resolves to the stub.
import * as webllm from '@/features/llm/providers/webllm';

describe('webllm provider', () => {
  beforeEach(() => {
    engineStubState.stub = null;
    engineStubState.rejectLoad = false;
    engineStubState.currentEngine = null;
  });

  it('calls engine.chat.completions.create with stream:true and yields tokens', async () => {
    engineStubState.stub = {
      chatChunks: [
        { choices: [{ delta: { content: 'foo' } }] },
        { choices: [{ delta: { content: 'bar' } }] },
        { choices: [{ delta: { content: undefined } }] },
      ],
      interruptGenerate: () => undefined,
    };

    const chunks = await collect(
      webllm.stream([{ id: 'u', role: 'user', content: 'q', createdAt: 0 }], opts),
    );
    // The provider may emit one token-shaped loading-progress chunk
    // with empty text before generation starts. Filter those out for
    // the assertion on the actual answer content.
    const tokens = chunks
      .filter((c) => c.type === 'token' && (c as { text: string }).text.length > 0)
      .map((c) => (c as { text: string }).text);
    expect(tokens).toEqual(['foo', 'bar']);
    expect(chunks[chunks.length - 1]?.type).toBe('done');
  });

  it('emits an error chunk if getWebLLMEngine rejects', async () => {
    engineStubState.rejectLoad = true;
    const chunks = await collect(webllm.stream([], opts));
    expect(chunks[0]?.type).toBe('error');
    expect((chunks[0] as { message: string }).message).toMatch(/WebGPU/);
  });
});
