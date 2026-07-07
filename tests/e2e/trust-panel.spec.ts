// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Trust-panel E2E test. Verifies that dropping a sample file
// produces a trust log entry the user can read in plain English,
// and that every outbound request during the flow goes to either
// 'self' or one of the allow-listed hosts in the CSP.

import { expect, test, type Page } from './fixtures';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLE_PDF = resolve(HERE, '..', '..', 'public', 'sample-files', 'sample-paper.pdf');

const ALLOWLIST = [
  'self',
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.minimaxi.chat',
  'api.moonshot.cn',
  'ragulli-proxy.vercel.app',
  'huggingface.co',
  'cdn-lfs.huggingface.co',
];

test('trust log records the user ingest and only allow-listed origins are contacted', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (req) => requests.push(req.url()));

  await page.goto('/app/');
  await expect(page.getByText('no account · no server · no telemetry')).toBeVisible();

  // Drop the sample PDF via the canvas's hidden file input.
  await expect(page.getByText('Drop a file to ingest')).toBeVisible({ timeout: 10_000 });
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(SAMPLE_PDF);

  // The optimistic card appears almost immediately.
  await expect(page.getByText('sample-paper.pdf').first()).toBeVisible({
    timeout: 30_000,
  });

  // Read the trust log from its own IndexedDB database. The log
  // uses a dedicated `ragulli-trust-log` DB so the writes never
  // collide with the main schema.
  const trustEntries = await waitForTrustEntries(page, 1, 30_000);
  expect(trustEntries.length).toBeGreaterThan(0);

  const summary = trustEntries.map((e) => e.summary).join(' | ');
  // The user-facing trust panel text references the user's file
  // and where the bytes stayed.
  expect(/sample-paper|Ingesting|Indexed/.test(summary)).toBe(true);

  // Network assertion: every outbound request goes to either
  // 'self' (localhost) or an allow-listed host. No tracking pixels,
  // no analytics, no random origins.
  for (const url of requests) {
    if (url.startsWith('data:') || url.startsWith('blob:')) continue;
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      continue;
    }
    const ok =
      u.host === 'localhost:4173' ||
      u.host === '127.0.0.1:4173' ||
      ALLOWLIST.some((entry) => u.host === entry || u.host.endsWith(`.${entry}`));
    expect(ok, `Unexpected outbound request to ${url} (host ${u.host})`).toBe(true);
  }
});

async function waitForTrustEntries(
  page: Page,
  min: number,
  timeoutMs: number,
): Promise<Array<{ summary: string; kind: string }>> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const entries = await readTrustLog(page);
    if (entries.length >= min) return entries;
    await page.waitForTimeout(500);
  }
  return await readTrustLog(page);
}

async function readTrustLog(
  page: Page,
): Promise<Array<{ summary: string; kind: string }>> {
  return await page.evaluate(async () => {
    return await new Promise<Array<{ summary: string; kind: string }>>(
      (resolveFn, rejectFn) => {
        const req = indexedDB.open('ragulli-trust-log');
        req.onerror = () => rejectFn(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['entries'], 'readonly');
          const all = tx.objectStore('entries').getAll();
          all.onsuccess = () => {
            db.close();
            resolveFn(
              (all.result as Array<{ activity: { summary: string; kind: string } }>).map(
                (r) => ({ summary: r.activity.summary, kind: r.activity.kind }),
              ),
            );
          };
          all.onerror = () => rejectFn(all.error);
        };
      },
    );
  });
}