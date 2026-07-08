// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Provider registry. Each provider has a static descriptor (label,
// default model, whether it needs a key, whether it calls the network
// directly or via an Edge function) and a `stream` function from the
// provider module.
//
// Active provider state lives in a tiny Zustand store so that changes
// propagate to every component that reads it (chat panel, settings,
// trust log) without prop-drilling. The previous version cached the
// active provider in a module-level variable; that meant Settings
// could update localStorage while the chat panel kept reading a stale
// "webllm" default, leaving the user stuck in local-only mode with
// no visible indicator. The store fixes that.

import { create } from 'zustand';
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
    corsDirect: false,
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

// --- active provider state (Zustand) ---------------------------------

const ACTIVE_PROVIDER_KEY = 'ragulli:provider:v1';
const MODEL_OVERRIDE_PREFIX = 'ragulli:model:v1:';

interface ProviderState {
  activeProviderId: ProviderId;
  setActiveProvider: (id: ProviderId) => void;
}

function readStoredProvider(): ProviderId | null {
  try {
    const stored = localStorage.getItem(ACTIVE_PROVIDER_KEY);
    if (stored && isProviderId(stored)) return stored;
  } catch {
    /* ignore */
  }
  return null;
}

export const useProviderStore = create<ProviderState>((set) => ({
  // Initial: the user's last choice if any, otherwise webllm. We do
  // NOT block on storage here — webllm is the safe default if the
  // user is on a fresh tab; the chat panel re-evaluates on every
  // render so a Settings change is visible immediately.
  activeProviderId: readStoredProvider() ?? 'webllm',
  setActiveProvider: (id) => {
    try {
      localStorage.setItem(ACTIVE_PROVIDER_KEY, id);
    } catch {
      /* localStorage may be unavailable in some sandboxes */
    }
    set({ activeProviderId: id });
  },
}));

// --- synchronous accessors used by non-React paths -------------------

/** Read the current active provider without subscribing to the store. */
export function getActiveProvider(): ProviderId {
  return useProviderStore.getState().activeProviderId;
}

/** Imperatively switch the active provider. */
export function setProvider(id: ProviderId): void {
  useProviderStore.getState().setActiveProvider(id);
}

/**
 * True once the user has explicitly picked a provider (i.e., the
 * active id is something other than the runtime default). WebLLM is
 * opt-in (spec §4.4); until the user explicitly picks a provider,
 * the chat panel answers from local retrieval rather than silently
 * starting a multi-gigabyte download.
 */
export function hasExplicitProviderChoice(): boolean {
  // "Explicit" means the user has clicked a provider — i.e., the
  // store has written to localStorage at least once. The store
  // writes only on explicit setActiveProvider calls, so a fresh
  // tab falls back to webllm without writing. That keeps
  // hasExplicitProviderChoice honest: it tells you whether the
  // current active id was chosen by the user, not just defaulted.
  try {
    return localStorage.getItem(ACTIVE_PROVIDER_KEY) !== null;
  } catch {
    return false;
  }
}

// --- model override storage ------------------------------------------

/** Return the model the user has configured for `id`. */
export function getModel(id: ProviderId): string {
  try {
    const stored = localStorage.getItem(MODEL_OVERRIDE_PREFIX + id);
    if (stored && stored.trim().length > 0) return stored.trim();
  } catch {
    /* fall through */
  }
  return PROVIDERS[id].defaultModel;
}

export function setModel(id: ProviderId, model: string): void {
  try {
    if (model.trim().length === 0) {
      localStorage.removeItem(MODEL_OVERRIDE_PREFIX + id);
    } else {
      localStorage.setItem(MODEL_OVERRIDE_PREFIX + id, model.trim());
    }
  } catch {
    /* ignore */
  }
}

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