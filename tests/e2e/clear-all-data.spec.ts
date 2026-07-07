// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Clear-all-data E2E test. Verifies the "Clear all my data" hold-to-
// confirm control in Settings → Danger zone wipes every IndexedDB
// store, every OPFS entry, every localStorage key owned by
// RAGülli, and the per-tab secret in sessionStorage. After the
// page reloads, the trust log must be empty and the workspace
// store must be at its fresh-install state.
//
// This proves the spec DoD:
//   "Click 'Clear all my data.' All IndexedDB and OPFS is gone.
//    The next reload behaves like a fresh install."

import { expect, test, type Page } from './fixtures';

const RAGULLI_DBS = ['ragulli', 'ragulli-trust-log'];

async function countDbStores(page: Page, dbName: string): Promise<number> {
  return await page.evaluate(
    (name) =>
      new Promise<number>((resolve, reject) => {
        const req = indexedDB.open(name);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const stores = Array.from(db.objectStoreNames);
          db.close();
          resolve(stores.length);
        };
      }),
    dbName,
  );
}

async function countAllRows(
  page: Page,
  dbName: string,
): Promise<number> {
  return await page.evaluate(
    (name) =>
      new Promise<number>((resolve, reject) => {
        const req = indexedDB.open(name);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const stores = Array.from(db.objectStoreNames);
          if (stores.length === 0) {
            db.close();
            resolve(0);
            return;
          }
          let total = 0;
          let pending = stores.length;
          const tx = db.transaction(stores, 'readonly');
          for (const storeName of stores) {
            const all = tx.objectStore(storeName).count();
            all.onsuccess = () => {
              total += (all.result as number) ?? 0;
              pending -= 1;
              if (pending === 0) {
                db.close();
                resolve(total);
              }
            };
            all.onerror = () => {
              pending -= 1;
              if (pending === 0) {
                db.close();
                resolve(total);
              }
            };
          }
        };
      }),
    dbName,
  );
}

async function opfsEntryCount(page: Page): Promise<number> {
  return await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    let count = 0;
    for await (const _entry of root.values()) {
      count += 1;
    }
    return count;
  });
}

test('Danger zone clear-all wipes IndexedDB, OPFS, and reloads to fresh state', async ({ page }) => {
  await page.goto('/app/');
  await page.waitForFunction(() => Boolean(window.__ragulli));

  // Seed a few rows so we have something to wipe. We write one
  // workspace + one source + one chunk + one trust-log entry.
  await page.evaluate(async () => {
    const useWorkspaceStore = window.__ragulli!.store;
    const useTrustLog = window.__ragulli!.trust;
    useWorkspaceStore.setState({
      activeWorkspaceId: 'ws-clear',
      workspaces: [
        {
          id: 'ws-clear',
          name: 'T',
          templateId: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      sources: [],
      chunksBySource: {},
    });
    useTrustLog.getState().push({
      id: 'trust-seed',
      ts: Date.now(),
      kind: 'file',
      summary: 'seeded',
      destination: 'this browser tab',
    });

    // Seed a localStorage key owned by the app.
    localStorage.setItem('ragulli:active-template:v1', JSON.stringify({ 'ws-clear': 'contract-reviewer' }));
    // Seed the per-tab secret so we can confirm it is wiped too.
    sessionStorage.setItem('ragulli:tab-secret:v1', btoa('x'.repeat(43)));

    // Seed an OPFS entry under the ragulli-files prefix.
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('ragulli-files', { create: true });
    const fh = await dir.getFileHandle('seed.bin', { create: true });
    const w = await fh.createWritable();
    await w.write(new Uint8Array([1, 2, 3]));
    await w.close();
  });

  // Sanity: the seed wrote data into both DBs and OPFS.
  expect(await countDbStores(page, 'ragulli')).toBeGreaterThan(0);
  expect(await countAllRows(page, 'ragulli-trust-log')).toBeGreaterThan(0);
  expect(await opfsEntryCount(page)).toBeGreaterThan(0);
  expect(await page.evaluate(() => localStorage.getItem('ragulli:active-template:v1'))).not.toBeNull();

  // Open Settings → Danger zone.
  await page.getByRole('button', { name: /open settings/i }).click();
  await expect(page.getByRole('dialog', { name: /settings/i })).toBeVisible();
  await page.getByRole('tab', { name: /danger zone/i }).click();
  await expect(page.getByRole('button', { name: /clear all my data/i })).toBeVisible();

  // Hold-to-confirm. We use the page mouse API so React's synthetic
// event system sees real pointer events (dispatchEvent on a
// disconnected DOM node can race with the React re-render that
// changes the button label mid-hold).
  const clearBtn = page.getByRole('button', { name: /clear all my data/i });
  const box = await clearBtn.boundingBox();
  if (!box) throw new Error('Clear button has no bounding box');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  // Wait past the HOLD_MS (1 second).
  await page.waitForTimeout(1300);
  await page.mouse.up();

  // The DangerZone wipes IndexedDB, OPFS, localStorage, and
  // sessionStorage, then schedules a window.location.reload()
  // 500ms later. We poll the DB until every store is empty to
  // confirm the wipe ran; then we explicitly reload to verify
  // the post-reload fresh-install state. We can't rely solely on
  // the DangerZone-triggered reload because in headless test runs
  // the reload can race with our polling, so being explicit makes
  // the test deterministic.
  await page.waitForFunction(
    async () => {
      try {
        const allRows = await new Promise<number>((resolveFn, rejectFn) => {
          const req = indexedDB.open('ragulli');
          req.onerror = () => rejectFn(req.error);
          req.onsuccess = () => {
            const db = req.result;
            const stores = Array.from(db.objectStoreNames);
            if (stores.length === 0) {
              db.close();
              resolveFn(0);
              return;
            }
            let total = 0;
            let pending = stores.length;
            const tx = db.transaction(stores, 'readonly');
            for (const storeName of stores) {
              const count = tx.objectStore(storeName).count();
              count.onsuccess = () => {
                total += (count.result as number) ?? 0;
                pending -= 1;
                if (pending === 0) {
                  db.close();
                  resolveFn(total);
                }
              };
              count.onerror = () => {
                pending -= 1;
                if (pending === 0) {
                  db.close();
                  resolveFn(total);
                }
              };
            }
          };
        });
        return allRows === 0;
      } catch {
        // Reload landed; assertion holds by construction.
        return true;
      }
    },
    undefined,
    { timeout: 10_000, polling: 100 },
  );

  // Force a reload to a guaranteed fresh state. The DangerZone's own
  // reload may already have fired, in which case this is a no-op.
  await page.waitForTimeout(700);
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ragulli));

  // The seeded workspace 'T' must not have survived. After a reload
  // the bootstrap creates a single "Untitled workspace" — no 'T'.
  const survivingSeed = await page.evaluate(async () => {
    const useWorkspaceStore = window.__ragulli!.store;
    return useWorkspaceStore
      .getState()
      .workspaces.some((w: { name: string }) => w.name === 'T');
  });
  expect(survivingSeed).toBe(false);

  const trustCount = await page.evaluate(async () => {
    const useTrustLog = window.__ragulli!.trust;
    return useTrustLog.getState().entries.length;
  });
  expect(trustCount).toBe(0);

  // No app-owned localStorage keys remain (the only allowed one is
  // the version key prefix which DangerZone preserves; in V1 nothing
  // writes under that prefix, so the map is empty).
  // DangerZone does clear `ragulli:onboarded:v1` along with every other
  // app key, but the shared fixture re-adds it via an init script on the
  // post-clear reload (it keeps the first-run onboarding modal from
  // blocking UI in every spec). That key is test infrastructure, not app
  // data, so exclude it here; every real app-owned key must still be gone.
  const remaining = await page.evaluate(() => {
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith('ragulli:') && k !== 'ragulli:onboarded:v1') out.push(k);
    }
    return out;
  });
  expect(remaining).toEqual([]);

  // OPFS ragulli-files directory is gone. The root may contain other
  // entries (Workbox creates its own); we only check for our prefix.
  const ragulliOpfsEntries = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    let count = 0;
    for await (const entry of root.values()) {
      if (entry.name === 'ragulli-files') count += 1;
    }
    return count;
  });
  expect(ragulliOpfsEntries).toBe(0);

  // The ragulli DB still exists (Dexie recreates the schema
  // immediately on access) but its tables are empty — EXCEPT for
  // the single row the bootstrap writes into workspaces after the
  // reload (the "Untitled workspace" we verified above is not
  // named 'T'). So we expect exactly one row total: the bootstrap
  // workspace.
  const allRows = await countAllRows(page, 'ragulli');
  expect(allRows).toBe(1);

  // The trust-log DB is empty.
  const trustRows = await countAllRows(page, 'ragulli-trust-log');
  expect(trustRows).toBe(0);

  // The per-tab secret was wiped.
  const tabSecret = await page.evaluate(() => sessionStorage.getItem('ragulli:tab-secret:v1'));
  expect(tabSecret).toBeNull();

  // Sanity: every expected DB was touched by the wipe path.
  for (const name of RAGULLI_DBS) {
    const stores = await countDbStores(page, name);
    // 'ragulli' has the full schema; the trust-log DB has one store.
    // The wipe does not delete the DBs themselves (Dexie handles that
    // when its tables are cleared); we just assert they exist and are
    // empty.
    expect(stores).toBeGreaterThan(0);
  }
});