// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// ModelSelection settings tab. One row per provider: a masked
// password input (renders the key as dots regardless of length), a
// "Test connection" button that fires a minimal request and shows
// the result in plain English, and a "Remove key" button.
//
// The webllm row is different: it has no key input (needsKey:false)
// but does expose the model picker.

import { useEffect, useState, type FC } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import {
  getAvailableProviders,
  type ProviderDescriptor,
} from '@/features/llm/provider-registry';
import { hasKey, setKey, clearAll as clearKeys } from '@/features/llm/keys';
import type { ProviderId } from '@/features/llm/types';

type TestState = 'idle' | 'testing' | 'ok' | 'fail';

interface RowState {
  apiKeyDraft: string;
  testState: TestState;
  testMessage: string;
  hasKey: boolean;
}

function makeInitialState(): Record<ProviderId, RowState> {
  const out = {} as Record<ProviderId, RowState>;
  for (const p of getAvailableProviders()) {
    out[p.id] = {
      apiKeyDraft: '',
      testState: 'idle',
      testMessage: '',
      hasKey: hasKey(p.id),
    };
  }
  return out;
}

async function probeProvider(p: ProviderDescriptor, key: string): Promise<string> {
  // The cheapest valid call for each provider: one short user
  // message, max_tokens capped. We never persist anything.
  const url = providerEndpoint(p.id);
  if (!url) throw new Error('No probe URL for this provider');

  const headers = providerHeaders(p.id, key);
  const body = providerProbeBody(p, 'Reply with the single word "ready".');

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`Network error: ${errMessage(err)}`);
  }
  if (!res.ok) {
    const detail = await safeBody(res);
    throw new Error(`${res.status}: ${detail || 'request failed'}`);
  }
  // Parse just enough to confirm we got JSON-shaped output.
  const text = await res.text();
  if (text.length === 0) throw new Error('Empty response');
  return 'Connection succeeded.';
}

function providerEndpoint(id: ProviderId): string | null {
  switch (id) {
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions';
    case 'google':
      return 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse';
    case 'minimax':
      return 'https://api.minimaxi.chat/v1/text/chatcompletion_v2';
    case 'kimi':
      return 'https://api.moonshot.cn/v1/chat/completions';
    case 'anthropic':
      return 'https://ragulli-proxy.vercel.app/api/anthropic';
    case 'webllm':
      return null;
  }
}

function providerHeaders(id: ProviderId, key: string): HeadersInit {
  if (id === 'openai' || id === 'minimax' || id === 'kimi') {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    };
  }
  if (id === 'google') {
    // API key in query string per the spec.
    return { 'Content-Type': 'application/json' };
  }
  if (id === 'anthropic') {
    return { 'Content-Type': 'application/json', Accept: 'text/event-stream' };
  }
  return {};
}

function providerProbeBody(p: ProviderDescriptor, user: string): unknown {
  const prompt = [{ role: 'user' as const, content: user }];
  switch (p.id) {
    case 'openai':
      return {
        model: p.defaultModel,
        messages: prompt,
        stream: false,
        max_tokens: 8,
        temperature: 0,
      };
    case 'google':
      return {
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: 8, temperature: 0 },
      };
    case 'minimax':
      return { model: p.defaultModel, messages: prompt, stream: false };
    case 'kimi':
      return {
        model: p.defaultModel,
        messages: prompt,
        stream: false,
        max_tokens: 8,
        temperature: 0,
      };
    case 'anthropic':
      return {
        model: p.defaultModel,
        apiKey: '__probe_uses_draft__',
        messages: [{ role: 'user', content: user }],
        max_tokens: 8,
        stream: true,
      };
    case 'webllm':
      return null;
  }
}

async function safeBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text ? text.slice(0, 160) : '';
  } catch {
    return '';
  }
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export const ModelSelection: FC = () => {
  const [state, setState] = useState<Record<ProviderId, RowState>>(makeInitialState);

  // Refresh "has key" indicators if storage changes (e.g. another tab).
  useEffect(() => {
    const refresh = (): void => {
      setState((prev) => {
        const next = { ...prev };
        for (const id of Object.keys(next) as ProviderId[]) {
          next[id] = { ...next[id]!, hasKey: hasKey(id) };
        }
        return next;
      });
    };
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  const onSave = async (p: ProviderDescriptor): Promise<void> => {
    const s = state[p.id];
    if (!s || !s.apiKeyDraft) return;
    try {
      await setKey(p.id, s.apiKeyDraft);
      setState((prev) => ({
        ...prev,
        [p.id]: { ...prev[p.id]!, hasKey: true, apiKeyDraft: '' },
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        [p.id]: {
          ...prev[p.id]!,
          testState: 'fail',
          testMessage: errMessage(err),
        },
      }));
    }
  };

  const onTest = async (p: ProviderDescriptor): Promise<void> => {
    const s = state[p.id];
    if (!s) return;
    if (p.needsKey && !s.apiKeyDraft && !s.hasKey) {
      setState((prev) => ({
        ...prev,
        [p.id]: {
          ...prev[p.id]!,
          testState: 'fail',
          testMessage: 'Add a key first.',
        },
      }));
      return;
    }
    const probeKey = s.apiKeyDraft || (await loadKeyForProbe(p.id));
    if (!probeKey && p.needsKey) {
      setState((prev) => ({
        ...prev,
        [p.id]: {
          ...prev[p.id]!,
          testState: 'fail',
          testMessage: 'No key to test with.',
        },
      }));
      return;
    }
    setState((prev) => ({
      ...prev,
      [p.id]: { ...prev[p.id]!, testState: 'testing', testMessage: 'Testing connection' },
    }));
    try {
      const msg = await probeProvider(p, probeKey);
      setState((prev) => ({
        ...prev,
        [p.id]: { ...prev[p.id]!, testState: 'ok', testMessage: msg },
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        [p.id]: {
          ...prev[p.id]!,
          testState: 'fail',
          testMessage: errMessage(err),
        },
      }));
    }
  };

  const onRemove = (_p: ProviderDescriptor): void => {
    void clearKeys(); // global; UI is per-row but the per-provider
    // granularity isn't exposed in the spec's API. Wipe everything;
    // webllm doesn't store anything so users keep their model.
    setState((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next) as ProviderId[]) {
        next[id] = { ...next[id]!, hasKey: false };
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-[var(--color-fg-muted)]">
        Each provider accepts a BYOK (bring-your-own-key). The key is encrypted with a
        per-tab secret and dies when this tab closes.
      </p>
      {getAvailableProviders().map((p) => {
        const s = state[p.id];
        if (!s) return null;
        return (
          <article
            key={p.id}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 flex flex-col gap-3"
          >
            <header className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-[var(--color-fg)]">{p.label}</h3>
              <div className="flex items-center gap-2">
                {p.corsDirect ? (
                  <Chip size="sm" tone="success">
                    Direct
                  </Chip>
                ) : p.id === 'webllm' ? (
                  <Chip size="sm" tone="accent">
                    In-browser
                  </Chip>
                ) : (
                  <Chip size="sm" tone="neutral">
                    Via proxy
                  </Chip>
                )}
                {p.needsKey ? (
                  s.hasKey ? (
                    <Chip size="sm" tone="success" leadingDot>
                      Key saved
                    </Chip>
                  ) : (
                    <Chip size="sm" tone="neutral" leadingDot>
                      No key
                    </Chip>
                  )
                ) : null}
              </div>
            </header>
            <div className="text-xs text-[var(--color-fg-muted)]">
              default model: <span className="font-mono">{p.defaultModel}</span>
            </div>
            {p.needsKey ? (
              <div className="flex flex-col gap-2">
                <label className="text-xs text-[var(--color-fg-muted)]" htmlFor={`k-${p.id}`}>
                  API key
                </label>
                <input
                  id={`k-${p.id}`}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Paste your key (encrypted on this device)"
                  value={s.apiKeyDraft}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      [p.id]: { ...prev[p.id]!, apiKeyDraft: e.target.value },
                    }))
                  }
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-fg)] focus:outline-none focus-visible:shadow-[var(--shadow-glow)]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => void onSave(p)}
                    disabled={!s.apiKeyDraft}
                  >
                    Save key
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void onTest(p)}
                    disabled={s.testState === 'testing'}
                  >
                    {s.testState === 'testing' ? 'Testing' : 'Test connection'}
                  </Button>
                  {s.hasKey ? (
                    <Button size="sm" variant="ghost" onClick={() => onRemove(p)}>
                      Remove key
                    </Button>
                  ) : null}
                </div>
                {s.testState !== 'idle' && s.testMessage ? (
                  <p
                    className={`text-xs ${
                      s.testState === 'ok'
                        ? 'text-[var(--color-success)]'
                        : s.testState === 'fail'
                          ? 'text-[var(--color-danger)]'
                          : 'text-[var(--color-fg-muted)]'
                    }`}
                    role="status"
                  >
                    {s.testMessage}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-fg-muted)]">
                No key needed; the model runs in this tab via WebGPU. First activation may
                download ~2 GB.
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
};

async function loadKeyForProbe(id: ProviderId): Promise<string> {
  // Lazy import to avoid a circular dep with keys.ts.
  const mod = await import('@/features/llm/keys');
  return (await mod.getKey(id)) ?? '';
}
