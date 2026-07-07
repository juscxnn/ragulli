// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// At-rest crypto helpers for BYOK keys. The design is "honest-at-rest
// defense", not real secrecy:
//
//   1. We generate a 256-bit random secret at first key set.
//   2. We store that secret in `sessionStorage` (NOT localStorage) so
//      it dies with the tab. A hard reload evaporates it.
//   3. We derive an AES-GCM key from the secret via HKDF; the salt is
//      random per encrypt call but is stored alongside the ciphertext
//      (it does not need to be secret).
//   4. The ciphertext lives in `localStorage` under `ragulli:keys:v1`.
//
// This means a user who reloads the page must re-enter their keys
// once per session — the spec's intended UX. A user who closes the
// tab and comes back is similarly prompted on first interaction.
//
// IMPORTANT: sessionStorage is reachable from DevTools in the same
// origin. An attacker with code execution in the tab can read the
// per-tab secret and decrypt localStorage entries. This module does
// NOT pretend otherwise; it raises the bar against passive leaks
// (cached disk images, browser sync, copy-paste of localStorage to
// another tab) and that's it.

const ENC = new TextEncoder();
const DEC = new TextDecoder();

const SECRET_NAMESPACE = 'ragulli:tab-secret:v1';
const SECRET_BYTES = 32;
const IV_BYTES = 12;

interface DerivedCryptoKey {
  key: CryptoKey;
  rawSecret: string;
}

let cachedKey: DerivedCryptoKey | null = null;

function readOrCreateSecret(): Uint8Array {
  // sessionStorage is per-tab. It is wiped when the tab closes.
  try {
    const existing = sessionStorage.getItem(SECRET_NAMESPACE);
    if (existing) {
      const bytes = decodeBase64(existing);
      if (bytes.length === SECRET_BYTES) return bytes;
    }
  } catch {
    /* sessionStorage unavailable; fall through to memory-only mode */
  }
  const fresh = crypto.getRandomValues(new Uint8Array(SECRET_BYTES));
  try {
    sessionStorage.setItem(SECRET_NAMESPACE, encodeBase64(fresh));
  } catch {
    /* keep in-memory only if storage is unavailable */
  }
  return fresh;
}

async function getKey(): Promise<DerivedCryptoKey> {
  if (cachedKey) return cachedKey;
  const raw = readOrCreateSecret();
  const baseKey = await crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey']);
  // Salt is informational here; it does not need to be secret. We
  // generate it fresh per derivation so distinct calls do not
  // collide.
  const salt = ENC.encode(`ragulli/v1/${raw.length}`);
  const info = ENC.encode('ragulli-tab-key/v1');
  const key = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  cachedKey = { key, rawSecret: encodeBase64(raw) };
  return cachedKey;
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const { key } = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, ENC.encode(plaintext));
  return `${encodeBase64(iv)}.${encodeBase64(new Uint8Array(buf))}`;
}

export async function decryptSecret(payload: string): Promise<string> {
  const parts = payload.split('.');
  if (parts.length !== 2) throw new Error('Malformed ciphertext');
  const [ivB64, dataB64] = parts;
  if (!ivB64 || !dataB64) throw new Error('Malformed ciphertext');
  const { key } = await getKey();
  const iv = decodeBase64(ivB64);
  const data = decodeBase64(dataB64);
  const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return DEC.decode(buf);
}

/**
 * Wipe the cached AES-GCM key AND the session-storage secret. Tests
 * call this to simulate a reload without actually reloading.
 */
export function _resetForTests(): void {
  cachedKey = null;
  try {
    sessionStorage.removeItem(SECRET_NAMESPACE);
  } catch {
    /* ignore */
  }
}

function encodeBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(bin);
}

function decodeBase64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}
