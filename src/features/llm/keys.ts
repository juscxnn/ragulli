// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// BYOK key storage. Each provider's key is encrypted with a per-tab
// secret derived in `lib/crypto.ts` (random 256-bit secret kept in
// sessionStorage). The ciphertext lives in localStorage under
// `ragulli:keys:v1:<provider>`. Closing the tab evaporates the
// secret, so a subsequent reload sees only opaque ciphertext.
// Users re-enter the key once per session.
//
// The encryption is honest-at-rest defense, not real secrecy. Anyone
// with code execution in the tab can recover the plaintext. The
// design raises the bar against accidental copy-paste, browser
// sync, and cached disk images — nothing more.

import { decryptSecret, encryptSecret } from '@/lib/crypto';
import type { ProviderId } from './types';

const NS = 'ragulli:keys:v1';
const ALL_PROVIDERS: readonly ProviderId[] = [
  'openai',
  'anthropic',
  'google',
  'minimax',
  'kimi',
  'webllm',
];

function key(provider: ProviderId): string {
  return `${NS}:${provider}`;
}

export async function setKey(provider: ProviderId, value: string): Promise<void> {
  if (!value) throw new Error('setKey: empty value');
  const payload = await encryptSecret(value);
  localStorage.setItem(key(provider), payload);
}

/**
 * Returns the decrypted key, or null when:
 *   - no entry exists for this provider
 *   - the encrypted blob is unreadable (stale ciphertext from a
 *     previous tab without the per-tab secret)
 */
export async function getKey(provider: ProviderId): Promise<string | null> {
  const payload = localStorage.getItem(key(provider));
  if (!payload) return null;
  try {
    return await decryptSecret(payload);
  } catch {
    // Stale ciphertext; treat as no key.
    localStorage.removeItem(key(provider));
    return null;
  }
}

/**
 * Synchronous check used by the Settings UI to decide whether to
 * render the masked input ("update key") or the saved indicator
 * ("key saved"). Reads the raw localStorage entry — does NOT
 * attempt to decrypt, since a decryption failure is a normal first-
 * load state and we want the UI to show "key saved" if any entry
 * exists.
 */
export function hasKey(provider: ProviderId): boolean {
  return localStorage.getItem(key(provider)) !== null;
}

/**
 * Wipe every provider key AND the per-tab secret. Used by the
 * Danger Zone button. The per-tab secret wipe forces a fresh secret
 * to be generated on the next call to `setKey`.
 */
export async function clearAll(): Promise<void> {
  for (const p of ALL_PROVIDERS) {
    localStorage.removeItem(key(p));
  }
  try {
    sessionStorage.removeItem('ragulli:tab-secret:v1');
  } catch {
    /* sessionStorage unavailable */
  }
}
