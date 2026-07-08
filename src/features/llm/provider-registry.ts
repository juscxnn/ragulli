// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Provider registry. Each provider has a static descriptor (label,
// default model, whether it needs a key, whether it calls the network
// directly or via an Edge function) and a `stream` function from the
// provider module.
//
// The default model is the model's currently-shipped ID at the time
// of writing. The Settings UI lets the user override this per
// provider (`getModel` / `setModel`); the override is persisted in
// localStorage under `ragulli:model:v1:{providerId}`. The chat panel
// always reads the effective model via `getModel`, never via the
// static default — that way a user who customizes a model keeps it
// across reloads.

import * as openai from './providers/openai';
import * as anthropic from './providers/anthropic';
import * as google from './providers/google';
import * as minimax from './providers/minimax';
import * as kimi from './providers/kimi';
import * as webllm from './providers/webllm';
import type { ProviderId, StreamChunk, ChatMessage, StreamOptions } from './types';

export interface ProviderDescriptor {
  id: ProviderId;
  label: string;
  defaultModel: string;
  needsKey: boolean;
  corsDirect: boolean;
  stream: (messages: ChatMessage[], opts: StreamOptions) => AsyncIterable<StreamChunk>;
}

const PROVIDERS: Record<ProviderId, ProviderDescriptor> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    defaultModel: 'gpt-5.4-mini',
    needsKey: true,
    corsDirect: true,
    stream: openai.stream,
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    defaultModel: 'claude-opus-4-8',
    needsKey: true,
    corsDirect: false, // routed through the Vercel Edge proxy
    stream: anthropic.stream,
  },
  google: {
    id: 'google',
    label: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    needsKey: true,
    corsDirect: true,
    stream: google.stream,
  },
  minimax: {
    id: 'minimax',
    label: 'MiniMax',
    defaultModel: 'MiniMax-M2.7',
    needsKey: true,
    corsDirect: true,
    stream: minimax.stream,
  },
  kimi: {
    id: 'kimi',
    label: 'Moonshot Kimi',
    defaultModel: 'kimi-k2.6',
    needsKey: true,
    corsDirect: true,
    stream: kimi.stream,
  },
  webllm: {
    id: 'webllm',
    label: 'In-browser model',
    defaultModel: webllm.DEFAULT_MODEL,
    needsKey: false,
    corsDirect: false,
    stream: webllm.stream,
  },
};

export const PROVIDER_ORDER: ProviderId[] = [
  'webllm',
  'openai',
  'anthropic',
  'google',
  'minimax',
  'kimi',
];

export function getAvailableProviders(): ProviderDescriptor[] {
  return PROVIDER_ORDER.map((id) => PROVIDERS[id]);
}

export function getProvider(id: ProviderId): ProviderDescriptor {
  return PROVIDERS[id];
}

const MODEL_OVERRIDE_PREFIX = 'ragulli:model:v1:';
const ACTIVE_PROVIDER_KEY = 'ragulli:provider:v1';

let activeProvider: ProviderId | null = null;

export function setProvider(id: ProviderId): void {
  activeProvider = id;
  try {
    localStorage.setItem(ACTIVE_PROVIDER_KEY, id);
  } catch {
    /* localStorage may be unavailable in some sandboxes */
  }
}

export function getActiveProvider(): ProviderId {
  if (activeProvider) return activeProvider;
  try {
    const stored = localStorage.getItem(ACTIVE_PROVIDER_KEY);
    if (stored && isProviderId(stored)) {
      activeProvider = stored;
      return stored;
    }
  } catch {
    /* fall through */
  }
  activeProvider = 'webllm';
  return activeProvider;
}

export function hasExplicitProviderChoice(): boolean {
  try {
    const stored = localStorage.getItem(ACTIVE_PROVIDER_KEY);
    return stored !== null && isProviderId(stored);
  } catch {
    return false;
  }
}

/**
 * Return the model the user has configured for `id`. Falls back to
 * the registry default when the user has not set an override. An
 * override of the empty string is treated as "use the default" so a
 * user can clear their customisation by emptying the input.
 */
export function getModel(id: ProviderId): string {
  try {
    const stored = localStorage.getItem(MODEL_OVERRIDE_PREFIX + id);
    if (stored && stored.trim().length > 0) return stored.trim();
  } catch {
    /* fall through */
  }
  return PROVIDERS[id].defaultModel;
}

/**
 * Persist the user's model choice for `id`. Pass an empty string to
 * clear the override (revert to the registry default).
 */
export function setModel(id: ProviderId, model: string): void {
  try {
    if (model.trim().length === 0) {
      localStorage.removeItem(MODEL_OVERRIDE_PREFIX + id);
    } else {
      localStorage.setItem(MODEL_OVERRIDE_PREFIX + id, model.trim());
    }
  } catch {
    /* localStorage may be unavailable in some sandboxes */
  }
}

/** Reset every provider's model override back to its registry default. */
export function clearModelOverrides(): void {
  try {
    for (const id of Object.keys(PROVIDERS) as ProviderId[]) {
      localStorage.removeItem(MODEL_OVERRIDE_PREFIX + id);
    }
  } catch {
    /* ignore */
  }
}

function isProviderId(s: string): s is ProviderId {
  return (
    s === 'openai' ||
    s === 'anthropic' ||
    s === 'google' ||
    s === 'minimax' ||
    s === 'kimi' ||
    s === 'webllm'
  );
}