// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// BYOK key storage. Each provider key is encrypted with the per-tab
// secret derived in lib/crypto. After a reload, the encrypted bytes
// become unreadable — the user re-enters the key once per session.

import { decryptSecret, encryptSecret } from '@/lib/crypto';
import type { ProviderId } from './types';

const NS = 'ragulli:keys:v1';

function key(provider: ProviderId): string {
  return `${NS}:${provider}`;
}

export async function setKey(provider: ProviderId, value: string): Promise<void> {
  const payload = await encryptSecret(value);
  localStorage.setItem(key(provider), payload);
}

export async function getKey(provider: ProviderId): Promise<string | null> {
  const payload = localStorage.getItem(key(provider));
  if (!payload) return null;
  try {
    return await decryptSecret(payload);
  } catch {
    return null;
  }
}

export async function clearAll(): Promise<void> {
  for (const provider of ['openai', 'anthropic', 'google', 'minimax', 'kimi', 'webllm'] as const) {
    localStorage.removeItem(key(provider));
  }
}
