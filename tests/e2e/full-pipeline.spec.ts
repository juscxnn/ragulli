// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Full-pipeline E2E: the moment of truth, end to end, with NO mocks
// and NO keys. Exercises the REAL embedding path (self-hosted
// all-MiniLM-L6-v2 + self-hosted ONNX Runtime WASM, both same-origin)
// under the production-mirrored CSP the preview server sends:
//   sample click → parse → chunk → embed → chunks in IndexedDB
//   → question → local extractive answer → citation click → viewer.
// This is the test that would have caught the launch blocker where
// the CSP silently killed embedding on the deployed site.

import { expect, test, type Page } from '@playwright/test';

test('sample → real embed → no-key cited answer → citation opens viewer', async ({ page }) => {
  // The first model load fetches ~45 MB of same-origin files (ONNX
  // model + WASM runtime); give CI room to breathe.
  test.setTimeout(180_000);

  // Fail fast if anything contacts an origin outside the CSP
  // allowlist — the trust claim, enforced in the test harness too.
  const offOrigin: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.hostname !== 'localhost' && url.protocol !== 'data:' && url.protocol !== 'blob:') {
      offOrigin.push(req.url());
    }
  });

  await page.goto('/app/');

  // Scene 1: the FirstDrop hero with sample buttons (four-second rule).
  const sampleButton = page.locator('[data-sample-id="sample-chapter"]');
  await expect(sampleButton).toBeVisible({ timeout: 10_000 });
  await sampleButton.click();

  // The real pipeline must land embedded chunks in IndexedDB.
  await expect
    .poll(async () => await countChunks(page), {
      timeout: 150_000,
      message: 'expected embedded chunks in IndexedDB (real embed path)',
    })
    .toBeGreaterThan(0);

  // Ask a question with zero keys configured: the local extractive
  // answer must render with at least one real citation span.
  const input = page.getByLabel('Ask a question');
  await expect(input).toBeEnabled();
  await input.fill('What is this chapter about?');
  await input.press('Enter');

  const citation = page.locator('button[data-chunk-id]').first();
  await expect(citation).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('local retrieval only')).toBeVisible();

  // Citation click → source viewer opens on the cited document.
  await citation.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(dialog.getByText('sample-chapter.md')).toBeVisible();

  // Nothing left the machine.
  expect(offOrigin).toEqual([]);
});

async function countChunks(page: Page): Promise<number> {
  return await page.evaluate(async () => {
    return await new Promise<number>((resolveFn) => {
      const req = indexedDB.open('ragulli');
      req.onerror = () => resolveFn(0);
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction(['chunks'], 'readonly');
          const count = tx.objectStore('chunks').count();
          count.onsuccess = () => {
            db.close();
            resolveFn(count.result);
          };
          count.onerror = () => {
            db.close();
            resolveFn(0);
          };
        } catch {
          db.close();
          resolveFn(0);
        }
      };
    });
  });
}
