// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Retrieval-flow E2E test. Two scenarios:
//   1. Without a BYOK key, asking a question does not error out:
//      the chat panel answers from local retrieval (an honest
//      extractive answer with quoted passages) or, if retrieval
//      itself cannot run in this environment, surfaces a clear
//      failure — no fake spinner, no silent failure.
//   2. With a Source + Chunk rows seeded and a citation-bearing
//      chat message in the store, the chat panel renders the
//      citation as a clickable inline span.

import { expect, test, type Page } from '@playwright/test';

async function seedSourceChunks(
  page: Page,
  workspaceId: string,
  sourceId: string,
  chunkId: string,
  text: string,
): Promise<void> {
  await page.evaluate(
    async ({ ws, sid, cid, t }) => {
      const w = {
        id: ws,
        name: 'T',
        templateId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const s = {
        id: sid,
        workspaceId: ws,
        filename: 'paper.pdf',
        mimeType: 'application/pdf',
        byteSize: 1024,
        addedAt: Date.now(),
        originOpfsPath: `ragulli-files/${sid}`,
        parserVersion: 'v1',
        meta: {},
      };
      const c = {
        id: cid,
        sourceId: sid,
        workspaceId: ws,
        zoneId: null,
        position: 0,
        text: t,
        embedding: new Float32Array(8),
        tokenCount: t.split(/\s+/).length,
      };
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('ragulli');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(
            ['workspaces', 'sources', 'chunks'],
            'readwrite',
          );
          tx.objectStore('workspaces').put(w);
          tx.objectStore('sources').put(s);
          tx.objectStore('chunks').put(c);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      });
    },
    { ws: workspaceId, sid: sourceId, cid: chunkId, t: text },
  );
}

test('without a BYOK key, asking yields a local extractive answer or a clear failure', async ({
  page,
}) => {
  await page.goto('/app/');
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();

  // Force a provider that needs a key.
  await page.evaluate(() => {
    localStorage.setItem('ragulli:provider:v1', 'anthropic');
  });
  await page.reload();

  // Wait for the testability hook to attach.
  await page.waitForFunction(() => Boolean(window.__ragulli));

  // Seed a workspace + source + chunks so the chat input enables.
  await seedSourceChunks(
    page,
    'ws-keytest',
    's-keytest',
    'c-keytest-1',
    'Methodology uses a sliding window chunker.',
  );

  // Hydrate the workspace store from IndexedDB using raw API.
  await page.evaluate(async () => {
    const useWorkspaceStore = window.__ragulli!.store;
    const data = await new Promise<{
      sources: Array<{
        id: string;
        workspaceId: string;
        filename: string;
        mimeType: string;
        byteSize: number;
        addedAt: number;
        originOpfsPath: string;
        parserVersion: string;
        meta: Record<string, unknown>;
      }>;
      chunks: Array<{
        id: string;
        sourceId: string;
        workspaceId: string;
        zoneId: string | null;
        position: number;
        text: string;
        embedding: ArrayBuffer;
        tokenCount: number;
      }>;
      workspaces: Array<{
        id: string;
        name: string;
        templateId: string | null;
        createdAt: number;
        updatedAt: number;
      }>;
    }>((resolveFn, rejectFn) => {
      const req = indexedDB.open('ragulli');
      req.onerror = () => rejectFn(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['sources', 'chunks', 'workspaces'], 'readonly');
        const sourcesReq = tx.objectStore('sources').getAll();
        const chunksReq = tx.objectStore('chunks').getAll();
        const wsReq = tx.objectStore('workspaces').getAll();
        let sources: Array<{
          id: string;
          workspaceId: string;
          filename: string;
          mimeType: string;
          byteSize: number;
          addedAt: number;
          originOpfsPath: string;
          parserVersion: string;
          meta: Record<string, unknown>;
        }> = [];
        let chunks: Array<{
          id: string;
          sourceId: string;
          workspaceId: string;
          zoneId: string | null;
          position: number;
          text: string;
          embedding: ArrayBuffer;
          tokenCount: number;
        }> = [];
        let workspaces: Array<{
          id: string;
          name: string;
          templateId: string | null;
          createdAt: number;
          updatedAt: number;
        }> = [];
        sourcesReq.onsuccess = () => {
          sources = sourcesReq.result as typeof sources;
        };
        chunksReq.onsuccess = () => {
          chunks = chunksReq.result as typeof chunks;
        };
        wsReq.onsuccess = () => {
          workspaces = wsReq.result as typeof workspaces;
        };
        tx.oncomplete = () => {
          db.close();
          resolveFn({ sources, chunks, workspaces });
        };
        tx.onerror = () => rejectFn(tx.error);
      };
    });
    const sources = data.sources.map((s) => ({ ...s, chunkCount: 0 }));
    const sb: Record<string, typeof data.chunks> = {};
    for (const c of data.chunks) {
      const arr = sb[c.sourceId] ?? [];
      arr.push(c);
      sb[c.sourceId] = arr;
    }
    useWorkspaceStore.setState({
      activeWorkspaceId: data.workspaces[0]?.id ?? 'ws-keytest',
      workspaces: data.workspaces,
      sources,
      chunksBySource: sb,
    });
  });

  // The chat input should now be enabled (because sources exist),
  // but the model call path should fail because the key is missing.
  // We trigger streamChat via a real DOM submit on the form, then
  // observe the chat panel's alert region.
  const input = page.locator('input[aria-label="Ask a question"]');
  await expect(input).toBeEnabled({ timeout: 10_000 });

  await input.fill('summarize');
  await page.keyboard.press('Enter');

  // Two acceptable outcomes, both honest:
  //  - the extractive no-key answer ("local retrieval only", with
  //    the top passages quoted) when the embed worker can run;
  //  - a [role="alert"] with "Retrieval failed: ..." when the embed
  //    model cannot be fetched in this environment.
  // Either way there is no fake spinner and no silent failure.
  const outcome = page
    .getByText(/local retrieval/i)
    .or(page.locator('[role="alert"]'))
    .first();
  await expect(outcome).toBeVisible({ timeout: 15_000 });

  const alert = page.locator('[role="alert"]');
  if ((await alert.count()) > 0) {
    const text = await alert.first().textContent();
    expect(text).toMatch(/key|Settings|Retrieval failed/i);
  }
});

test('with a citation-bearing message, the chat panel renders a clickable span', async ({
  page,
}) => {
  await page.goto('/app/');
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ragulli));

  await seedSourceChunks(
    page,
    'ws-cite',
    's-cite',
    'c-cite-1',
    'Sliding window chunker is used in the methodology.',
  );

  // Hydrate the store + push a citation-bearing assistant message.
  await page.evaluate(async () => {
    const useWorkspaceStore = window.__ragulli!.store;
    const data = await new Promise<{
      sources: Array<{
        id: string;
        workspaceId: string;
        filename: string;
        mimeType: string;
        byteSize: number;
        addedAt: number;
        originOpfsPath: string;
        parserVersion: string;
        meta: Record<string, unknown>;
      }>;
      chunks: Array<{
        id: string;
        sourceId: string;
        workspaceId: string;
        zoneId: string | null;
        position: number;
        text: string;
        embedding: ArrayBuffer;
        tokenCount: number;
      }>;
      workspaces: Array<{
        id: string;
        name: string;
        templateId: string | null;
        createdAt: number;
        updatedAt: number;
      }>;
    }>((resolveFn, rejectFn) => {
      const req = indexedDB.open('ragulli');
      req.onerror = () => rejectFn(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['sources', 'chunks', 'workspaces'], 'readonly');
        const sourcesReq = tx.objectStore('sources').getAll();
        const chunksReq = tx.objectStore('chunks').getAll();
        const wsReq = tx.objectStore('workspaces').getAll();
        let sources: Array<{
          id: string;
          workspaceId: string;
          filename: string;
          mimeType: string;
          byteSize: number;
          addedAt: number;
          originOpfsPath: string;
          parserVersion: string;
          meta: Record<string, unknown>;
        }> = [];
        let chunks: Array<{
          id: string;
          sourceId: string;
          workspaceId: string;
          zoneId: string | null;
          position: number;
          text: string;
          embedding: ArrayBuffer;
          tokenCount: number;
        }> = [];
        let workspaces: Array<{
          id: string;
          name: string;
          templateId: string | null;
          createdAt: number;
          updatedAt: number;
        }> = [];
        sourcesReq.onsuccess = () => {
          sources = sourcesReq.result as typeof sources;
        };
        chunksReq.onsuccess = () => {
          chunks = chunksReq.result as typeof chunks;
        };
        wsReq.onsuccess = () => {
          workspaces = wsReq.result as typeof workspaces;
        };
        tx.oncomplete = () => {
          db.close();
          resolveFn({ sources, chunks, workspaces });
        };
        tx.onerror = () => rejectFn(tx.error);
      };
    });
    useWorkspaceStore.setState({
      activeWorkspaceId: data.workspaces[0]?.id ?? 'ws-cite',
      workspaces: data.workspaces,
      sources: data.sources,
      chunksBySource: { 's-cite': data.chunks },
    });

    const answer = 'Sliding window chunker is used in the methodology.';
    useWorkspaceStore.getState().addMessage({
      id: 'a-cite',
      role: 'assistant',
      content: answer,
      createdAt: Date.now(),
      citations: [
        {
          id: 'cit-0',
          chunkId: 'c-cite-1',
          sourceId: 's-cite',
          charStart: 0,
          charEnd: answer.length,
        },
      ],
    });
  });

  // The chat panel must render a span with data-chunk-id.
  const span = page.locator('[data-chunk-id="c-cite-1"]').first();
  await expect(span).toBeVisible({ timeout: 10_000 });
  const sourceId = await span.getAttribute('data-source-id');
  expect(sourceId).toBe('s-cite');
});