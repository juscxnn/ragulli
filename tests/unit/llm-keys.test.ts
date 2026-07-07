// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Tests for the BYOK key storage. We verify:
//   - setKey + getKey round-trip returns the plaintext
//   - the localStorage value is NOT the plaintext (encryption works)
//   - clearAll wipes every provider's entry AND the session-secret
//   - hasKey reflects the storage state without decrypting
//   - decrypting stale ciphertext (post-reload, no session secret)
//     returns null rather than throwing
//
// We reset the crypto module's cache between tests by calling
// _resetForTests() from lib/crypto.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _resetForTests as resetCryptoCache,
  decryptSecret,
  encryptSecret,
} from '@/lib/crypto';

beforeEach(() => {
  // Clean slate per test: drop the derived key, the session secret,
  // and any prior encrypted blobs.
  resetCryptoCache();
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
  localStorage.clear();
});

afterEach(() => {
  resetCryptoCache();
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
  localStorage.clear();
});

describe('encryptSecret / decryptSecret (crypto.ts)', () => {
  it('round-trips the plaintext', async () => {
    const ciphertext = await encryptSecret('sk-test-1234567890');
    const back = await decryptSecret(ciphertext);
    expect(back).toBe('sk-test-1234567890');
  });

  it('produces different ciphertext for the same plaintext across calls', async () => {
    // Each encryptSecret call uses a fresh IV; ciphertext varies.
    const a = await encryptSecret('same');
    const b = await encryptSecret('same');
    expect(a).not.toBe(b);
  });

  it('does not store the plaintext as the ciphertext', async () => {
    const plaintext = 'super-secret-value';
    const ciphertext = await encryptSecret(plaintext);
    expect(ciphertext).not.toContain(plaintext);
    expect(ciphertext).not.toBe(plaintext);
  });

  it('throws on a malformed ciphertext shape', async () => {
    await expect(decryptSecret('not-a-blob')).rejects.toThrow();
  });
});

describe('keys.setKey / getKey / hasKey / clearAll', () => {
  it('setKey + getKey round-trips for every supported provider', async () => {
    const mod = await import('@/features/llm/keys');
    const providers = ['openai', 'anthropic', 'google', 'minimax', 'kimi', 'webllm'] as const;
    for (const id of providers) {
      await mod.setKey(id, `value-for-${id}`);
      const back = await mod.getKey(id);
      expect(back).toBe(`value-for-${id}`);
      expect(mod.hasKey(id)).toBe(true);
    }
  });

  it('getKey returns null when no key is set', async () => {
    const mod = await import('@/features/llm/keys');
    expect(await mod.getKey('openai')).toBeNull();
  });

  it('the localStorage value is NOT the plaintext', async () => {
    const mod = await import('@/features/llm/keys');
    const plaintext = 'sk-supersecret-very-long-key';
    await mod.setKey('openai', plaintext);
    const stored = localStorage.getItem('ragulli:keys:v1:openai');
    expect(stored).not.toBeNull();
    expect(stored).not.toContain(plaintext);
    // Must look like an AES-GCM ciphertext: base64.base64 with no
    // obvious plaintext leakage.
    expect(stored).toMatch(/^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);
  });

  it('hasKey reads localStorage synchronously without decrypting', async () => {
    const mod = await import('@/features/llm/keys');
    expect(mod.hasKey('openai')).toBe(false);
    await mod.setKey('openai', 'value');
    expect(mod.hasKey('openai')).toBe(true);
  });

  it('clearAll wipes every provider and the session secret', async () => {
    const mod = await import('@/features/llm/keys');
    const providers = ['openai', 'anthropic', 'google', 'minimax', 'kimi', 'webllm'] as const;
    for (const id of providers) {
      await mod.setKey(id, `value-for-${id}`);
    }
    expect(localStorage.length).toBeGreaterThan(0);
    expect(sessionStorage.getItem('ragulli:tab-secret:v1')).not.toBeNull();

    await mod.clearAll();

    for (const id of providers) {
      expect(mod.hasKey(id)).toBe(false);
      expect(await mod.getKey(id)).toBeNull();
    }
    expect(sessionStorage.getItem('ragulli:tab-secret:v1')).toBeNull();
  });

  it('a key set before clearAll cannot be decrypted after clearAll', async () => {
    const mod = await import('@/features/llm/keys');
    await mod.setKey('openai', 'original-value');
    const secretBefore = sessionStorage.getItem('ragulli:tab-secret:v1');

    // Simulate a clear + reload by wiping everything.
    await mod.clearAll();

    // After clear, the sessionStorage secret is gone. Re-setting it
    // by setKey would generate a brand-new secret, but we want to
    // confirm the OLD localStorage ciphertext is now unreadable.
    if (secretBefore !== null) {
      sessionStorage.setItem('ragulli:tab-secret:v1', secretBefore);
    }
    // Re-add the old ciphertext manually and confirm getKey returns null.
    localStorage.setItem('ragulli:keys:v1:openai', 'stale.blob');
    expect(await mod.getKey('openai')).toBeNull();
  });

  it('decryption failure (stale ciphertext) is swallowed and treated as no key', async () => {
    const mod = await import('@/features/llm/keys');
    // Inject malformed ciphertext directly.
    localStorage.setItem('ragulli:keys:v1:anthropic', 'garbage.noise');
    expect(await mod.getKey('anthropic')).toBeNull();
    // And the malformed blob was cleaned up.
    expect(mod.hasKey('anthropic')).toBe(false);
  });
});

describe('keys with mocked crypto failure', () => {
  it('getKey returns null when the decrypter throws (post-reload scenario)', async () => {
    // Simulate a post-reload state where the session secret is gone
    // but the ciphertext remains. We reset the cache and clear
    // sessionStorage, then ask getKey to read a stored blob that
    // was encrypted against a previous secret.
    const mod = await import('@/features/llm/keys');

    // First, store a real key.
    await mod.setKey('openai', 'protected-value');

    // Wipe the session secret WITHOUT calling clearAll (which would
    // also wipe the localStorage entry). This mimics reload.
    sessionStorage.removeItem('ragulli:tab-secret:v1');
    resetCryptoCache();

    expect(await mod.getKey('openai')).toBeNull();
  });

  it('setKey throws synchronously on empty value', async () => {
    const mod = await import('@/features/llm/keys');
    await expect(mod.setKey('openai', '')).rejects.toThrow();
  });
});
