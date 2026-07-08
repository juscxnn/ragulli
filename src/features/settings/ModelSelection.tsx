// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// ModelSelection settings tab. One row per provider. Each row has:
//   - a masked API key input (only if needsKey),
//   - a model name input pre-filled with the per-provider override or
//     the registry default,
//   - Save key / Save model / Test connection / Remove key buttons.
//
// The previous version had no model input — the model was hard-coded
// in the registry with no way to override. Users hit that when a
// default model was renamed or deprecated and the call failed. The
// fix is to expose the model name as a first-class editable field,
// persisted per-provider in localStorage.

import { useEffect, useState, type FC } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import {
  getAvailableProviders,
  getModel,
  setModel,
  setProvider,
  useProviderStore,
  type ProviderDescriptor,
} from '@/features/llm/provider-registry';
import { hasKey, setKey, clearAll as clearKeys } from '@/features/llm/keys';
import type { ProviderId } from '@/features/llm/types';

type TestState = 'idle' | 'testing' | 'ok' | 'fail';

interface RowState {
  apiKeyDraft: string;
  modelDraft: string;
  modelSaved: string;
  testState: TestState;
  testMessage: string;
  hasKey: boolean;
}

function makeInitialState(): Record<ProviderId, RowState> {
  const out = {} as Record<ProviderId, RowState>;
  for (const p of getAvailableProviders()) {
    const current = getModel(p.id);
    out[p.id] = {
      apiKeyDraft: '',
      modelDraft: current,
      modelSaved: current,
      testState: 'idle',
      testMessage: '',
      hasKey: hasKey(p.id),
    };
  }
  return out;
}

async function probeProvider(
  p: ProviderDescriptor,
  key: string,
  model: string,
): Promise<string> {
  const url = providerEndpoint(p);
  if (!url) throw new Error('No probe URL for this provider');

  const headers = providerHeaders(p.id, key);
  const body = providerProbeBody(p, model, 'Reply with the single word "ready".');

  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch (err) {
    throw new Error(`Network error: ${errMessage(err)}`);
  }
  if (!res.ok) {
    const detail = await safeBody(res);
    throw new Error(`${res.status}: ${detail || 'request failed'}`);
  }
  const text = await res.text();
  if (text.length === 0) throw new Error('Empty response');
  return 'Connection succeeded.';
}

function providerEndpoint(p: ProviderDescriptor): string | null {
  switch (p.id) {
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions';
    case 'google':
      return `https://generativelanguage.googleapis.com/v1beta/models/${p.defaultModel}:streamGenerateContent?alt=sse&key=`;
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
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
  }
  if (id === 'google') return { 'Content-Type': 'application/json' };
  if (id === 'anthropic') {
    return { 'Content-Type': 'application/json', Accept: 'text/event-stream' };
  }
  return {};
}

function providerProbeBody(p: ProviderDescriptor, model: string, user: string): unknown {
  const prompt = [{ role: 'user' as const, content: user }];
  switch (p.id) {
    case 'openai':
      return {
        model,
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
      return { model, messages: prompt, stream: false };
    case 'kimi':
      return {
        model,
        messages: prompt,
        stream: false,
        max_tokens: 8,
        temperature: 0,
      };
    case 'anthropic':
      return {
        model,
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
  const activeProvider = useProviderStore((s) => s.activeProviderId);

  useEffect(() => {
    const refresh = (): void => {
      setState((prev) => {
        const next = { ...prev };
        for (const id of Object.keys(next) as ProviderId[]) {
          const cur = getModel(id);
          next[id] = {
            ...next[id]!,
            hasKey: hasKey(id),
            modelSaved: cur,
            modelDraft: prev[id]?.modelDraft ?? cur,
          };
        }
        return next;
      });
    };
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  const onSaveKey = async (p: ProviderDescriptor): Promise<void> => {
    const s = state[p.id];
    if (!s || !s.apiKeyDraft) return;
    try {
      await setKey(p.id, s.apiKeyDraft);
      // Saving a key for a provider activates that provider. The
      // previous flow kept the active provider at its (cached)
      // default, so the chat panel kept showing "no model connected"
      // even after the user saved their key.
      setProvider(p.id);
      setState((prev) => ({
        ...prev,
        [p.id]: { ...prev[p.id]!, hasKey: true, apiKeyDraft: '' },
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        [p.id]: { ...prev[p.id]!, testState: 'fail', testMessage: errMessage(err) },
      }));
    }
  };

  const onActivate = (p: ProviderDescriptor): void => {
    setProvider(p.id);
  };

  const onSaveModel = (p: ProviderDescriptor): void => {
    const s = state[p.id];
    if (!s) return;
    const next = s.modelDraft.trim();
    setModel(p.id, next);
    const effective = getModel(p.id);
    setState((prev) => ({ ...prev, [p.id]: { ...prev[p.id]!, modelSaved: effective } }));
  };

  const onResetModel = (p: ProviderDescriptor): void => {
    setModel(p.id, '');
    const effective = getModel(p.id);
    setState((prev) => ({
      ...prev,
      [p.id]: { ...prev[p.id]!, modelDraft: effective, modelSaved: effective },
    }));
  };

  const onTest = async (p: ProviderDescriptor): Promise<void> => {
    const s = state[p.id];
    if (!s) return;
    const model = getModel(p.id);
    if (p.needsKey && !s.apiKeyDraft && !s.hasKey) {
      setState((prev) => ({
        ...prev,
        [p.id]: { ...prev[p.id]!, testState: 'fail', testMessage: 'Add a key first.' },
      }));
      return;
    }
    const probeKey = s.apiKeyDraft || (await loadKeyForProbe(p.id));
    if (!probeKey && p.needsKey) {
      setState((prev) => ({
        ...prev,
        [p.id]: { ...prev[p.id]!, testState: 'fail', testMessage: 'No key to test with.' },
      }));
      return;
    }
    setState((prev) => ({
      ...prev,
      [p.id]: { ...prev[p.id]!, testState: 'testing', testMessage: 'Testing connection' },
    }));
    try {
      const msg = await probeProvider(p, probeKey, model);
      setState((prev) => ({
        ...prev,
        [p.id]: { ...prev[p.id]!, testState: 'ok', testMessage: msg },
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        [p.id]: { ...prev[p.id]!, testState: 'fail', testMessage: errMessage(err) },
      }));
    }
  };

  const onRemove = (_p: ProviderDescriptor): void => {
    void clearKeys();
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
        per-tab secret and dies when this tab closes. Model names persist per provider
        in this browser.
      </p>
      {getAvailableProviders().map((p) => {
        const s = state[p.id];
        if (!s) return null;
        const isActive = p.id === activeProvider;
        return (
          <article
            key={p.id}
            className={[
              'rounded-lg border p-4 flex flex-col gap-3',
              isActive
                ? 'border-[var(--color-accent)]/50 bg-[var(--color-surface-2)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface-2)]',
            ].join(' ')}
          >
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-[var(--color-fg)]">{p.label}</h3>
                {isActive ? (
                  <Chip size="sm" tone="accent" leadingDot>
                    Active
                  </Chip>
                ) : null}
              </div>
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
            {!isActive ? (
              <div className="-mt-1">
                <Button size="sm" variant="ghost" onClick={() => onActivate(p)}>
                  Use this provider
                </Button>
              </div>
            ) : null}

            {p.needsKey ? (
              <div className="flex flex-col gap-2">
                <label className="text-xs text-[var(--color-fg-muted)]" htmlFor={`m-${p.id}`}>
                  Model name
                </label>
                <input
                  id={`m-${p.id}`}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={p.defaultModel}
                  value={s.modelDraft}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      [p.id]: { ...prev[p.id]!, modelDraft: e.target.value },
                    }))
                  }
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm font-mono text-[var(--color-fg)] focus:outline-none focus-visible:shadow-[var(--shadow-glow)]"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onSaveModel(p)}
                    disabled={s.modelDraft.trim() === s.modelSaved}
                  >
                    Save model
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onResetModel(p)}
                    disabled={s.modelSaved === p.defaultModel}
                  >
                    Reset to default ({p.defaultModel})
                  </Button>
                  <span className="text-[11px] text-[var(--color-fg-muted)] ml-auto">
                    in use: <span className="font-mono">{s.modelSaved}</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[var(--color-fg-muted)]">
                Default model: <span className="font-mono">{p.defaultModel}</span> (in-browser,
                no API key required).
              </div>
            )}

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
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => void onSaveKey(p)}
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
  const mod = await import('@/features/llm/keys');
  return (await mod.getKey(id)) ?? '';
}