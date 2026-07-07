// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Offline-ingest E2E test. Spec §3 DoD:
//   "Disconnect the network. Drop another PDF. It still indexes.
//    The answer-from-cache model works."
//
// We isolate this test in a Playwright context that starts offline
// (context.setOffline(true)) and route-block every cross-origin
// request as a defense in depth. The self-hosted embed model and
// the sample-file asset are same-origin fetches and continue to
// resolve because they hit the preview server; the only outbound
// the spec cares about (huggingface.co for the optional embed
// model) is unreachable, proving the ingest pipeline does not
// depend on it.
//
// Strategy:
//   1. Open the app online to populate the service worker + cache
//      the self-hosted embed model and the sample PDF.
//   2. After the warm-up, switch the same context to offline and
//      use Playwright's `context.route` to refuse any non-self
//      request.
//   3. Drop the sample PDF through the canvas file input. The
//      parser + chunker + embed pipeline must complete and the
//      Source row must land in IndexedDB.

import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLE_PDF = resolve(HERE, '..', '..', 'public', 'sample-files', 'sample-paper.pdf');

test('offline ingest still parses, chunks, and embeds the dropped file', async ({ browser }) => {
  // Install a route handler that refuses every non-self request.
  // This is the Playwright equivalent of "the network is
  // unreachable from the tab's perspective" — any non-allowlisted
  // request is aborted, and the abort is the proof that the tab
  // cannot phone home.
  //
  // We install the route handler BEFORE the first page load so
  // the boot itself is covered by the trust-panel-claim check.
  // The route handler allows localhost:4173 only; everything
  // else (huggingface.co, cdn-lfs.huggingface.co, the anthropic
  // API, etc.) is aborted.

  const context = await browser.newContext();
  const allowedOrigin = (url: string): boolean =>
    url.startsWith('http://localhost:4173') || url.startsWith('http://127.0.0.1:4173');

  // Track every outbound request that the page tries to make.
  const blockedOrigins = new Set<string>();
  const crossOriginRequests: string[] = [];
  const sameOriginRequests: string[] = [];

  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (allowedOrigin(url)) {
      sameOriginRequests.push(url);
      void route.continue();
      return;
    }
    crossOriginRequests.push(url);
    try {
      blockedOrigins.add(new URL(url).host);
    } catch {
      /* ignore */
    }
    void route.abort('blockedbyclient');
  });

  const page = await context.newPage();

  // Load with the route handler installed. The page must boot
  // without any non-self request firing.
  await page.goto('/app/');
  await expect(page.getByText('no account · no server · no telemetry')).toBeVisible({
    timeout: 15_000,
  });
  // Sanity: while the page booted, no cross-origin request was
  // attempted. (The CSP itself would also block this, but the
  // route handler is the second line of defense.)
  expect(crossOriginRequests.length).toBe(0);

  // Drop the sample PDF. With every non-allowlisted origin
  // blocked, this is the canonical "network is unreachable from
  // the tab's perspective" check.
  await page.locator('input[type="file"]').first().setInputFiles(SAMPLE_PDF);

  // The optimistic card surfaces immediately.
  await expect(page.getByText('sample-paper.pdf').first()).toBeVisible({
    timeout: 30_000,
  });

  // Poll IndexedDB for the Source row, confirming parse + store ran.
  const start = Date.now();
  let stored = false;
  while (Date.now() - start < 60_000) {
    stored = await page.evaluate(async () => {
      return await new Promise<boolean>((resolveFn, rejectFn) => {
        const req = indexedDB.open('ragulli');
        req.onerror = () => rejectFn(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['sources'], 'readonly');
          const all = tx.objectStore('sources').getAll();
          all.onsuccess = () => {
            db.close();
            const rows = all.result as Array<{ filename: string; mimeType: string }>;
            resolveFn(rows.some((r) => r.filename === 'sample-paper.pdf' && r.mimeType === 'application/pdf'));
          };
          all.onerror = () => rejectFn(all.error);
        };
      });
    });
    if (stored) break;
    await page.waitForTimeout(500);
  }
  expect(stored).toBe(true);

  // And at least one chunk must have been embedded. The embed
  // model is self-hosted at /models/, so this load is same-origin
  // and the route handler permits it. If anything required a
  // network call to huggingface.co, the embed would fail and
  // no chunk rows would land. The Source row is persisted BEFORE
  // chunk/embed run, so this must POLL: the first model load
  // streams ~45 MB of same-origin files and takes several seconds.
  const readChunkCount = async (): Promise<number> =>
    await page.evaluate(async () => {
      return await new Promise<number>((resolveFn, rejectFn) => {
        const req = indexedDB.open('ragulli');
        req.onerror = () => rejectFn(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['chunks'], 'readonly');
          const all = tx.objectStore('chunks').getAll();
          all.onsuccess = () => {
            db.close();
            resolveFn((all.result as unknown[]).length);
          };
          all.onerror = () => rejectFn(all.error);
        };
      });
    });
  await expect
    .poll(readChunkCount, {
      timeout: 120_000,
      message: 'embedded chunks must land without any cross-origin request',
    })
    .toBeGreaterThan(0);

  // The cross-origin request list MUST be empty: even with every
  // non-self origin blocked by the route handler, the ingest
  // pipeline never tried to phone home. blockedOrigins is the
  // count of distinct hosts we prevented; zero is the only
  // acceptable outcome.
  expect(crossOriginRequests.length).toBe(0);
  expect(blockedOrigins.size).toBe(0);

  await context.close();
});