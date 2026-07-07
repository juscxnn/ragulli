// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Provider registry. Each provider has a static descriptor: its
// human-readable label, default model, whether it needs a key, and
// whether it calls the network directly (true) or via an Edge
// function (false). The registry is the single place Subagent D
// iterates when rendering the Settings UI's ModelSelection tab.

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

/**
 * Provider module map. The dispatcher uses `req.provider` to pick the
 * right module. We use a static map (no dynamic import) so the
 * bundled chart for Subagent D's Settings UI is predictable.
 */
const PROVIDERS: Record<ProviderId, ProviderDescriptor> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    needsKey: true,
    corsDirect: true,
    stream: openai.stream,
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    defaultModel: 'claude-sonnet-4-5',
    needsKey: true,
    corsDirect: false, // routed through the Vercel Edge proxy
    stream: anthropic.stream,
  },
  google: {
    id: 'google',
    label: 'Google Gemini',
    defaultModel: 'gemini-1.5-flash',
    needsKey: true,
    corsDirect: true,
    stream: google.stream,
  },
  minimax: {
    id: 'minimax',
    label: 'MiniMax',
    defaultModel: 'MiniMax-Text-01',
    needsKey: true,
    corsDirect: true,
    stream: minimax.stream,
  },
  kimi: {
    id: 'kimi',
    label: 'Moonshot Kimi',
    defaultModel: 'moonshot-v1-8k',
    needsKey: true,
    corsDirect: true,
    stream: kimi.stream,
  },
  webllm: {
    id: 'webllm',
    label: 'In-browser model',
    defaultModel: webllm.DEFAULT_MODEL,
    needsKey: false,
    corsDirect: false, // does not leave the tab at all
    stream: webllm.stream,
  },
};

/** Display order for the Settings UI. */
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

/**
 * Persist the user's selection across sessions. We store the choice
 * in `localStorage` (NOT session storage) so a reload keeps the
 * active provider. Selection is independent of the BYOK key, which
 * is encrypted separately in `keys.ts`.
 */
const STORAGE_KEY = 'ragulli:provider:v1';
let activeProvider: ProviderId | null = null;

export function setProvider(id: ProviderId): void {
  activeProvider = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* localStorage may be unavailable in some sandboxes */
  }
}

/** Returns the user's selected provider, or the default if unset. */
export function getActiveProvider(): ProviderId {
  if (activeProvider) return activeProvider;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isProviderId(stored)) {
      activeProvider = stored;
      return stored;
    }
  } catch {
    /* fall through */
  }
  // Default: the in-browser provider is the only one that works
  // without a BYOK key, so it is the right first-run default.
  activeProvider = 'webllm';
  return activeProvider;
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
