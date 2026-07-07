// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// At-rest crypto helpers for BYOK keys. We derive a per-tab AES-GCM key
// from a random 256-bit secret generated at session start. The key never
// leaves the tab; on reload, the encrypted bytes become unreadable.

const ENC = new TextEncoder();
const DEC = new TextDecoder();

const TAB_SECRET_BYTES = 32;
const SALT_BYTES = 16;
const IV_BYTES = 12;

let cachedTabKey: CryptoKey | null = null;

async function getTabKey(): Promise<CryptoKey> {
  if (cachedTabKey) return cachedTabKey;
  const secret = crypto.getRandomValues(new Uint8Array(TAB_SECRET_BYTES));
  const baseKey = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
  // The salt is regenerated each time we derive; it does not need to be
  // secret, but we pass it for completeness in the construction.
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const info = ENC.encode('ragulli-tab-key/v1');
  cachedTabKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  return cachedTabKey;
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getTabKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, ENC.encode(plaintext));
  return `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...new Uint8Array(buf)))}`;
}

export async function decryptSecret(payload: string): Promise<string> {
  const [ivB64, dataB64] = payload.split('.');
  if (!ivB64 || !dataB64) throw new Error('Malformed ciphertext');
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(dataB64), (c) => c.charCodeAt(0));
  const key = await getTabKey();
  const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return DEC.decode(buf);
}
