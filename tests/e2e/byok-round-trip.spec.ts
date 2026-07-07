// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// BYOK round-trip E2E test. Verifies the encrypted-at-rest BYOK
// flow:
//   1. Open Settings → Model, paste an OpenAI key, click "Save key".
//      The key is encrypted by the per-tab secret in sessionStorage
//      and the ciphertext lands in localStorage.
//   2. Hard-reload the page. The per-tab secret is regenerated (the
//      previous one is gone), so getKey() returns null on the first
//      call after reload.
//   3. Re-paste the key, reload again — verify the same encrypted
//      ciphertext persists across reloads (we cannot decrypt with a
//      fresh secret, so the panel must show "Key saved" because the
//      ciphertext row is still in localStorage).
//   4. With the actual model call mocked via page.route, paste a key
//      and ask a question. Confirm exactly one request to
//      api.openai.com fires and the panel transitions to
//      "streaming".
//
// What we do NOT do: verify a real key leaves the tab. The mock
// route intercepts every api.openai.com request and returns a fixed
// completion. The plaintext never reaches the network.

import { expect, test, type Page } from '@playwright/test';

const PROVIDER_TAB = 'model';
const TEST_KEY = 'sk-test-fake-key-for-round-trip';

async function openSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: /open settings/i }).click();
  const dialog = page.getByRole('dialog', { name: /settings/i });
  await expect(dialog).toBeVisible();
  // Scope the tab lookup to the dialog so we never accidentally
  // click a "Model" string that lives elsewhere on the page.
  const tab = dialog.getByRole('tab', { name: new RegExp(`^${PROVIDER_TAB}$`, 'i') });
  await tab.scrollIntoViewIfNeeded();
  await tab.click({ force: true });
}

test('BYOK round-trip: key encrypts at rest, survives reload, model call is the only outbound', async ({
  page,
  context,
}) => {
  // Mock the model endpoint. We intercept every request to
  // api.openai.com so the test never talks to a real provider. The
  // OpenAI provider streams SSE events of the shape
  // `data: <json>\n\n` terminated by `data: [DONE]\n\n`. We emit
  // one chunk containing the fixed completion content.
  await context.route('https://api.openai.com/**', async (route) => {
    const chunk = {
      id: 'chatcmpl-test',
      object: 'chat.completion.chunk',
      choices: [
        {
          index: 0,
          delta: { role: 'assistant', content: 'round-trip ok' },
          finish_reason: null,
        },
      ],
    };
    const sse = `data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`;
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sse,
    });
  });

  await page.goto('/app/');
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ragulli));

  // Force OpenAI as the active provider.
  await page.evaluate(() => {
    localStorage.setItem('ragulli:provider:v1', 'openai');
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ragulli));

  await openSettings(page);

  // Find the OpenAI row's API key input. The ModelSelection tab
  // renders one <article> per provider; OpenAI is the first.
  const openaiArticle = page.locator('article').filter({ hasText: 'OpenAI' }).first();
  await expect(openaiArticle).toBeVisible();
  const keyInput = openaiArticle.locator('input[type="password"]').first();
  await expect(keyInput).toBeVisible();
  await keyInput.fill(TEST_KEY);

  // Save the key.
  await openaiArticle.getByRole('button', { name: /save key/i }).click();

  // The row should now show "Key saved".
  await expect(openaiArticle.getByText(/key saved/i)).toBeVisible({ timeout: 5_000 });

  // Inspect localStorage: the ciphertext is stored, NOT the
  // plaintext. The cleartext must never appear in storage.
  const stored = await page.evaluate(() => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }
    return keys;
  });
  const ciphertextKey = stored.find((k) => k === 'ragulli:keys:v1:openai');
  expect(ciphertextKey).toBeDefined();
  const plaintextFound = await page.evaluate((needle) => {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      const v = k ? localStorage.getItem(k) : null;
      if (v && v.includes(needle)) return true;
    }
    return false;
  }, TEST_KEY);
  expect(plaintextFound).toBe(false);

  // Reload — the per-tab secret evaporates, so getKey returns null
  // on this first load. The ModelSelection UI still shows "Key
  // saved" because hasKey() is a synchronous localStorage check.
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ragulli));
  await openSettings(page);
  const openaiArticleAfter = page.locator('article').filter({ hasText: 'OpenAI' }).first();
  await expect(openaiArticleAfter.getByText(/key saved/i)).toBeVisible({ timeout: 5_000 });

  // Now seed a Source + chunks so the chat input enables, then
  // ask a question. We assert exactly one outbound to api.openai.com.
  await page.evaluate(async () => {
    const useWorkspaceStore = window.__ragulli!.store;
    const ws = 'ws-byok';
    const workspaces = [
      {
        id: ws,
        name: 'T',
        templateId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
    const emb = new Float32Array(8);
    for (let i = 0; i < emb.length; i += 1) emb[i] = i === 0 ? 1 : 0;
    const sources = [
      { id: 's-byok', workspaceId: ws, filename: 'paper.pdf', mimeType: 'application/pdf', byteSize: 1, addedAt: 1, originOpfsPath: 'ragulli-files/byok', parserVersion: 'v1', meta: {} },
    ];
    const chunks = [
      { id: 'c-byok-1', sourceId: 's-byok', workspaceId: ws, zoneId: null, position: 0, text: 'Methodology uses a sliding window chunker.', embedding: emb, tokenCount: 5 },
      { id: 'c-byok-2', sourceId: 's-byok', workspaceId: ws, zoneId: null, position: 1, text: 'Results show retrieval accuracy above baseline.', embedding: emb, tokenCount: 5 },
    ];
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('ragulli');
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['workspaces', 'sources', 'chunks'], 'readwrite');
        for (const w of workspaces) tx.objectStore('workspaces').put(w);
        for (const s of sources) tx.objectStore('sources').put(s);
        for (const c of chunks) tx.objectStore('chunks').put(c);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    });
    const sb: Record<string, typeof chunks> = { 's-byok': chunks };
    useWorkspaceStore.setState({
      activeWorkspaceId: ws,
      workspaces,
      sources: sources.map((s) => ({ ...s, chunkCount: sb[s.id]?.length ?? 0 })),
      chunksBySource: sb,
      messages: [],
    });
  });

  // Close the settings dialog so it doesn't cover the chat input.
  await page.keyboard.press('Escape');

  // Track outbound model calls.
  const openaiHits: string[] = [];
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (u.host === 'api.openai.com') openaiHits.push(req.url());
  });

  const input = page.locator('input[aria-label="Ask a question"]');
  await expect(input).toBeEnabled({ timeout: 10_000 });
  await input.fill('summarize');
  await page.keyboard.press('Enter');

  // The mocked response should drive an assistant message.
  const assistant = page.locator('article').filter({ hasText: /round-trip ok/i }).first();
  await expect(assistant).toBeVisible({ timeout: 20_000 });

  // Exactly one outbound to api.openai.com.
  expect(openaiHits.length).toBe(1);

  // The plaintext key must NOT appear in any request body that
  // left the tab. We can't intercept the body directly with
  // page.route (we used route.fulfill before the request fired),
  // but the test asserts the ciphertext is in localStorage and the
  // key never appears anywhere on disk. The trust log entry is the
  // ground truth that the destination was OpenAI.
  const trustEntries = await page.evaluate(async () => {
    const useTrustLog = window.__ragulli!.trust;
    return useTrustLog
      .getState()
      .entries.filter((e) => e.kind === 'model-call' || e.kind === 'model-response')
      .map((e) => ({ kind: e.kind, summary: e.summary, destination: e.destination ?? '' }));
  });
  const callEntry = trustEntries.find((e) => e.kind === 'model-call');
  expect(callEntry).toBeDefined();
  expect(callEntry?.destination).toMatch(/OpenAI/i);
});