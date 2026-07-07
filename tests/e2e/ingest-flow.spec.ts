// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Ingest-flow E2E test. The full RAGülli ingest pipeline (parse +
// chunk + embed) is exercised by other suites (Subagent F); here
// we focus on the UI + storage contract: dropping a sample file
// onto the canvas surface must produce a Source row in IndexedDB
// with the right mime type and a non-empty OPFS pointer, even if
// the embedding worker is still in flight.

import { expect, test, type Page } from './fixtures';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLE_PDF = resolve(HERE, '..', '..', 'public', 'sample-files', 'sample-paper.pdf');

test('drop a sample PDF onto the canvas and verify Source row in IndexedDB', async ({ page }) => {
  test.setTimeout(60_000);

  await page.goto('/app/');

  // The bootstrap creates a default workspace, so we land on the
  // three-column shell with an empty canvas (its own Dropzone).
  await expect(page.getByText('Drop a file to ingest')).toBeVisible({ timeout: 10_000 });

  // Confirm the canvas has rendered the Dropzone with a hidden
  // file input.
  const fileInputCount = await page.locator('input[type="file"]').count();
  expect(fileInputCount).toBeGreaterThan(0);

  // Use the hidden <input type="file"> on the canvas Dropzone.
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(SAMPLE_PDF);

  // The canvas optimistically adds a source card as soon as the
  // file is accepted, before the embed worker completes.
  await expect(page.getByText('sample-paper.pdf').first()).toBeVisible({
    timeout: 30_000,
  });

  // Poll IndexedDB for the Source row. The pipeline persists the
  // Source record early so it lands well before embed finishes.
  const stored = await waitForSourceRow(page, 'sample-paper.pdf', 30_000);
  expect(stored.sourceCount).toBeGreaterThan(0);
  expect(stored.filenames).toContain('sample-paper.pdf');
  expect(stored.mimeType).toBe('application/pdf');
  // OPFS pointer should be set after parse + store.
  expect(stored.opfsPath.length).toBeGreaterThan(0);
});

async function waitForSourceRow(
  page: Page,
  filename: string,
  timeoutMs: number,
): Promise<{
  sourceCount: number;
  filenames: string[];
  mimeType: string | undefined;
  opfsPath: string;
}> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const stored = await page.evaluate(async (targetName) => {
      return await new Promise<{
        sourceCount: number;
        filenames: string[];
        mimeType: string | undefined;
        opfsPath: string;
      }>((resolveFn, rejectFn) => {
        const req = indexedDB.open('ragulli');
        req.onerror = () => rejectFn(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['sources'], 'readonly');
          const all = tx.objectStore('sources').getAll();
          all.onsuccess = () => {
            db.close();
            const sources = all.result as Array<{
              filename: string;
              mimeType: string;
              originOpfsPath: string;
            }>;
            const found = sources.find((s) => s.filename === targetName);
            resolveFn({
              sourceCount: sources.length,
              filenames: sources.map((s) => s.filename),
              mimeType: found?.mimeType,
              opfsPath: found?.originOpfsPath ?? '',
            });
          };
          all.onerror = () => rejectFn(all.error);
        };
      });
    }, filename);
    if (stored.filenames.includes(filename)) return stored;
    await page.waitForTimeout(500);
  }
  return await page.evaluate(async () => {
    return await new Promise<{
      sourceCount: number;
      filenames: string[];
      mimeType: string | undefined;
      opfsPath: string;
    }>((resolveFn, rejectFn) => {
      const req = indexedDB.open('ragulli');
      req.onerror = () => rejectFn(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['sources'], 'readonly');
        const all = tx.objectStore('sources').getAll();
        all.onsuccess = () => {
          db.close();
          const sources = all.result as Array<{
            filename: string;
            mimeType: string;
            originOpfsPath: string;
          }>;
          resolveFn({
            sourceCount: sources.length,
            filenames: sources.map((s) => s.filename),
            mimeType: sources[0]?.mimeType,
            opfsPath: sources[0]?.originOpfsPath ?? '',
          });
        };
        all.onerror = () => rejectFn(all.error);
      };
    });
  });
}