// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Tests for the streamChat dispatcher. We mock every provider module
// so the dispatcher selects them and we observe which one was called
// and with what arguments.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '@/features/retrieval/types';
import type { StreamChunk, ProviderId } from '@/features/llm/types';

type ProviderStream = (
  messages: ChatMessage[],
  opts: { apiKey: string; model: string },
) => AsyncIterable<StreamChunk>;

interface Spy {
  calls: Array<{ messages: ChatMessage[]; opts: { apiKey: string; model: string } }>;
  impl: ProviderStream | null;
  fn: ProviderStream;
}

function spyOnStream(initial?: ProviderStream): Spy {
  const calls: Spy['calls'] = [];
  let impl: ProviderStream | null = initial ?? null;
  const fn: ProviderStream = (messages, opts) => {
    calls.push({ messages, opts });
    if (!impl) {
      throw new Error('Provider stream called without a registered impl');
    }
    return impl(messages, opts);
  };
  return {
    calls,
    get impl() {
      return impl;
    },
    set impl(next) {
      impl = next;
    },
    fn,
  };
}

async function* genTokens(...text: string[]): AsyncIterable<StreamChunk> {
  for (const t of text) yield { type: 'token', text: t };
  yield { type: 'done' };
}
void genTokens;

vi.mock('@/features/llm/providers/openai', () => ({
  stream: (...args: unknown[]) => {
    const [messages, opts] = args as [ChatMessage[], { apiKey: string; model: string }];
    return mocks.openai.fn(messages, opts);
  },
}));
vi.mock('@/features/llm/providers/anthropic', () => ({
  stream: (...args: unknown[]) => {
    const [messages, opts] = args as [ChatMessage[], { apiKey: string; model: string }];
    return mocks.anthropic.fn(messages, opts);
  },
}));
vi.mock('@/features/llm/providers/google', () => ({
  stream: (...args: unknown[]) => {
    const [messages, opts] = args as [ChatMessage[], { apiKey: string; model: string }];
    return mocks.google.fn(messages, opts);
  },
}));
vi.mock('@/features/llm/providers/minimax', () => ({
  stream: (...args: unknown[]) => {
    const [messages, opts] = args as [ChatMessage[], { apiKey: string; model: string }];
    return mocks.minimax.fn(messages, opts);
  },
}));
vi.mock('@/features/llm/providers/kimi', () => ({
  stream: (...args: unknown[]) => {
    const [messages, opts] = args as [ChatMessage[], { apiKey: string; model: string }];
    return mocks.kimi.fn(messages, opts);
  },
}));
vi.mock('@/features/llm/providers/webllm', () => ({
  stream: (...args: unknown[]) => {
    const [messages, opts] = args as [ChatMessage[], { apiKey: string; model: string }];
    return mocks.webllm.fn(messages, opts);
  },
  DEFAULT_MODEL: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
}));

import { streamChat } from '@/features/llm/stream';
import { setProvider, getActiveProvider } from '@/features/llm/provider-registry';

// vi.hoisted so the mocks above can capture the spy's `.fn` at
// module-load time (vi.mock hoists before the surrounding code).
const mocks = vi.hoisted(() => ({
  openai: spyOnStream(),
  anthropic: spyOnStream(),
  google: spyOnStream(),
  minimax: spyOnStream(),
  kimi: spyOnStream(),
  webllm: spyOnStream(),
}));

const messages: ChatMessage[] = [{ id: 'u1', role: 'user', content: 'hi', createdAt: 0 }];

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of iter) out.push(x);
  return out;
}

beforeEach(() => {
  for (const id of ['openai', 'anthropic', 'google', 'minimax', 'kimi', 'webllm'] as const) {
    mocks[id].calls.length = 0;
    mocks[id].impl = null;
  }
  setProvider('webllm');
});

afterEach(() => {
  localStorage.clear();
});

describe('streamChat dispatcher', () => {
  it('routes OpenAI requests to the openai provider', async () => {
    mocks.openai.impl = async function* () {
      yield { type: 'token', text: 'hi' };
      yield { type: 'done' };
    };
    await collect(streamChat({ provider: 'openai', apiKey: 'k', model: 'm', messages }));
    expect(mocks.openai.calls).toHaveLength(1);
    expect(mocks.anthropic.calls).toHaveLength(0);
  });

  it('routes Anthropic requests to the anthropic provider', async () => {
    mocks.anthropic.impl = async function* () {
      yield { type: 'token', text: 'a' };
      yield { type: 'done' };
    };
    await collect(streamChat({ provider: 'anthropic', apiKey: 'k', model: 'm', messages }));
    expect(mocks.anthropic.calls).toHaveLength(1);
  });

  it('routes Google requests to the google provider', async () => {
    mocks.google.impl = async function* () {
      yield { type: 'token', text: 'g' };
      yield { type: 'done' };
    };
    await collect(streamChat({ provider: 'google', apiKey: 'k', model: 'm', messages }));
    expect(mocks.google.calls).toHaveLength(1);
  });

  it('routes MiniMax requests to the minimax provider', async () => {
    mocks.minimax.impl = async function* () {
      yield { type: 'token', text: 'x' };
      yield { type: 'done' };
    };
    await collect(streamChat({ provider: 'minimax', apiKey: 'k', model: 'm', messages }));
    expect(mocks.minimax.calls).toHaveLength(1);
  });

  it('routes Kimi requests to the kimi provider', async () => {
    mocks.kimi.impl = async function* () {
      yield { type: 'token', text: 'k' };
      yield { type: 'done' };
    };
    await collect(streamChat({ provider: 'kimi', apiKey: 'k', model: 'm', messages }));
    expect(mocks.kimi.calls).toHaveLength(1);
  });

  it('routes WebLLM requests to the webllm provider', async () => {
    mocks.webllm.impl = async function* () {
      yield { type: 'token', text: 'w' };
      yield { type: 'done' };
    };
    await collect(streamChat({ provider: 'webllm', apiKey: '', model: 'm', messages }));
    expect(mocks.webllm.calls).toHaveLength(1);
  });

  it('emits an error chunk when a key-requiring provider is missing an apiKey', async () => {
    const chunks = await collect(
      streamChat({ provider: 'openai', apiKey: '', model: 'm', messages }),
    );
    expect(chunks[0]?.type).toBe('error');
    expect((chunks[0] as { message: string }).message).toMatch(/Missing API key/);
    expect(mocks.openai.calls).toHaveLength(0);
  });

  it('falls back to the active provider when provider is omitted from the request', async () => {
    setProvider('openai');
    mocks.openai.impl = async function* () {
      yield { type: 'token', text: 'z' };
      yield { type: 'done' };
    };
    await collect(streamChat({ apiKey: 'k', model: 'm', messages }));
    expect(mocks.openai.calls).toHaveLength(1);
  });

  it('getActiveProvider returns the last setProvider selection', () => {
    setProvider('openai');
    expect(getActiveProvider()).toBe('openai');
    setProvider('kimi');
    expect(getActiveProvider()).toBe('kimi');
  });

  it('getActiveProvider defaults to webllm when nothing is stored', () => {
    localStorage.clear();
    expect(getActiveProvider()).toBe('webllm');
  });

  it('dispatches every provider id without throwing', async () => {
    const ids: ProviderId[] = [
      'openai',
      'anthropic',
      'google',
      'minimax',
      'kimi',
      'webllm',
    ];
    for (const id of ids) {
      const m = mocks[id];
      m.impl = async function* () {
        yield { type: 'token', text: 'ok' };
        yield { type: 'done' };
      };
      const chunks = await collect(
        streamChat({
          provider: id,
          apiKey: id === 'webllm' ? '' : 'k',
          model: 'm',
          messages,
        }),
      );
      expect(chunks.some((c) => c.type === 'done')).toBe(true);
    }
  });
});
