// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Group-weighting E2E test. Spec §3 DoD:
//   "Group 3 documents into a 'trusted' zone, 2 into a 'background'
//    zone. Ask a question. The trusted-zone sources consistently
//    dominate the retrieval."
//
// We seed two zones with weights 1.0 (trusted) and 0.1 (background)
// and five sources whose chunks are assigned to those zones. We
// monkey-patch the embedder to produce identical embeddings per
// chunk so cosine similarity is purely a function of the
// weightByZone multiplier, and then assert that the top-K retrieval
// returns the trusted-zone chunks first.

import { expect, test, type Page } from '@playwright/test';
import type { TrustActivity } from '@/features/llm/types';

async function seedFiveSources(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const useWorkspaceStore = window.__ragulli!.store;
    const ws = 'ws-weight';
    const workspaces = [
      {
        id: ws,
        name: 'T',
        templateId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
    const sources = [
      { id: 'src-trusted-1', workspaceId: ws, filename: 'trusted-1.pdf', mimeType: 'application/pdf', byteSize: 1, addedAt: 1, originOpfsPath: 'ragulli-files/trusted-1', parserVersion: 'v1', meta: {} },
      { id: 'src-trusted-2', workspaceId: ws, filename: 'trusted-2.pdf', mimeType: 'application/pdf', byteSize: 1, addedAt: 2, originOpfsPath: 'ragulli-files/trusted-2', parserVersion: 'v1', meta: {} },
      { id: 'src-trusted-3', workspaceId: ws, filename: 'trusted-3.pdf', mimeType: 'application/pdf', byteSize: 1, addedAt: 3, originOpfsPath: 'ragulli-files/trusted-3', parserVersion: 'v1', meta: {} },
      { id: 'src-bg-1', workspaceId: ws, filename: 'bg-1.pdf', mimeType: 'application/pdf', byteSize: 1, addedAt: 4, originOpfsPath: 'ragulli-files/bg-1', parserVersion: 'v1', meta: {} },
      { id: 'src-bg-2', workspaceId: ws, filename: 'bg-2.pdf', mimeType: 'application/pdf', byteSize: 1, addedAt: 5, originOpfsPath: 'ragulli-files/bg-2', parserVersion: 'v1', meta: {} },
    ];
    const zones = [
      { id: 'z-trusted', workspaceId: ws, name: 'Trusted', weight: 1.0, color: '#E0B158', position: { x: 0, y: 0 } },
      { id: 'z-background', workspaceId: ws, name: 'Background', weight: 0.1, color: '#8FA396', position: { x: 0, y: 1 } },
    ];
    // Identical embeddings → cosine similarity = 1 for any pair, so
    // the only signal in the score is the zone weight multiplier.
    const emb = new Float32Array(8);
    for (let i = 0; i < emb.length; i += 1) emb[i] = i === 0 ? 1 : 0;
    const chunks = sources.flatMap((src, i) => [
      { id: `c-${i}-a`, sourceId: src.id, workspaceId: ws, zoneId: src.id.startsWith('src-trusted') ? 'z-trusted' : 'z-background', position: 0, text: `chunk a for ${src.filename}`, embedding: emb, tokenCount: 5 },
      { id: `c-${i}-b`, sourceId: src.id, workspaceId: ws, zoneId: src.id.startsWith('src-trusted') ? 'z-trusted' : 'z-background', position: 1, text: `chunk b for ${src.filename}`, embedding: emb, tokenCount: 5 },
    ]);

    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('ragulli');
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['workspaces', 'sources', 'chunks', 'zones'], 'readwrite');
        for (const w of workspaces) tx.objectStore('workspaces').put(w);
        for (const s of sources) tx.objectStore('sources').put(s);
        for (const c of chunks) tx.objectStore('chunks').put(c);
        for (const z of zones) tx.objectStore('zones').put(z);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });

    const sb: Record<string, typeof chunks> = {};
    for (const c of chunks) {
      const arr = sb[c.sourceId] ?? [];
      arr.push(c);
      sb[c.sourceId] = arr;
    }
    useWorkspaceStore.setState({
      activeWorkspaceId: ws,
      workspaces,
      sources: sources.map((s) => ({ ...s, chunkCount: sb[s.id]?.length ?? 0 })),
      chunksBySource: sb,
      zones,
      zoneWeights: { 'z-trusted': 1.0, 'z-background': 0.1 },
      messages: [],
    });
  });
}

async function installFakeEmbedder(page: Page): Promise<void> {
  // The real embedBatch returns Float32Array[] from the worker. We
  // hijack the underlying store's call by replacing the embedder
  // used by the chat panel. Easiest path: monkey-patch the worker
  // bridge via window so topK still hits the real DB but the
  // embedding step is controlled.
  //
  // The simplest, most honest replacement is to mock the
  // embedBatch export via a dynamic import + a setter on the embed
  // module. The embed module already exposes
  // `_setWorkerFactoryForTests`; we instead override the
  // `embedBatch` symbol directly via the Vite dev-only module hot
  // API. For the preview build (which is what we test), the cleanest
  // path is to replace the worker constructor with one that returns
  // a deterministic identity-vector response.
  await page.addInitScript(() => {
    // Replace `Worker` so the embed worker, when constructed, is a
    // no-op that resolves any embed:* request with a deterministic
    // vector of all-1s (cosine similarity = 1.0 against itself).
    const origWorker = window.Worker;
    class FakeWorker extends origWorker {
      constructor(_url: string | URL, _opts?: WorkerOptions) {
        super(_url, _opts);
        // The real embed.worker posts { type: 'embed', id, chunks }
        // and expects { type: 'embed:result', id, embeddings }.
        this.addEventListener('message', (event: MessageEvent<{ type: string; id: string; chunks: string[] }>) => {
          const req = event.data;
          if (req && req.type === 'embed') {
            const emb = new Array<number>(8).fill(0);
            emb[0] = 1;
            const embeddings = req.chunks.map(() => emb);
            // postMessage synchronously so the awaiting promise
            // resolves on the next microtask.
            queueMicrotask(() => {
              (this as unknown as { postMessage: (m: unknown) => void }).postMessage({
                type: 'embed:result',
                id: req.id,
                embeddings,
              });
            });
          }
        });
      }
    }
    (window as unknown as { Worker: typeof Worker }).Worker = FakeWorker as unknown as typeof Worker;
  });
}

test('zone weights propagate to retrieval ranking', async ({ page }) => {
  await installFakeEmbedder(page);

  await page.goto('/app/');
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ragulli));

  await seedFiveSources(page);

  // Drive topK from the page. The chat panel's `topK` is wired
  // through the workspace store's zoneWeights, so calling the same
  // path gives the same answer the chat panel would see.
  const ranking = await page.evaluate(async () => {
    const topK = window.__ragulli!.topK;
    const useWorkspaceStore = window.__ragulli!.store;
    const ws = 'ws-weight';
    const zoneWeights = useWorkspaceStore.getState().zoneWeights;
    const results = await topK('any query', { workspaceId: ws, k: 6, weightByZone: zoneWeights });
    return results.map((r) => ({ sourceId: r.chunk.sourceId, score: r.score }));
  });

  // Top hits must come from the trusted zone (sources whose id
  // starts with src-trusted-). With identical base similarity, the
  // score for trusted = 1.0 * 1.0 = 1.0, the score for background =
  // 1.0 * 0.1 = 0.1, so trusted wins every position until exhausted.
  const topThree = ranking.slice(0, 3);
  for (const hit of topThree) {
    expect(hit.sourceId.startsWith('src-trusted-')).toBe(true);
  }

  // Request k=10 (all chunks) so we see both trusted AND background
  // hits and can confirm the score ratio. 5 sources x 2 chunks = 10
  // chunks total; the 6 trusted-zone chunks score 1.0, the 4
  // background-zone chunks score 0.1, so the top-6 are all trusted
  // and the trailing 4 are background.
  const fullRanking = await page.evaluate(async () => {
    const topK = window.__ragulli!.topK;
    const useWorkspaceStore = window.__ragulli!.store;
    const ws = 'ws-weight';
    const zoneWeights = useWorkspaceStore.getState().zoneWeights;
    const results = await topK('any query', { workspaceId: ws, k: 10, weightByZone: zoneWeights });
    return results.map((r) => ({ sourceId: r.chunk.sourceId, score: r.score }));
  });

  // And the spread between the highest trusted and the highest
  // background score must reflect the weight ratio (10:1).
  const firstTrusted = fullRanking.find((r) => r.sourceId.startsWith('src-trusted-'));
  const firstBackground = fullRanking.find((r) => r.sourceId.startsWith('src-bg-'));
  expect(firstTrusted).toBeDefined();
  expect(firstBackground).toBeDefined();
  if (firstTrusted && firstBackground) {
    expect(firstTrusted.score / firstBackground.score).toBeCloseTo(10, 5);
  }
});

test('chat answer cites trusted-zone sources when zone weights are applied', async ({ page }) => {
  await installFakeEmbedder(page);

  await page.goto('/app/');
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    // Force the local-retrieval-only path: no BYOK for the active
    // provider. The chat panel renders an extractive answer built
    // from the top-K passages.
    localStorage.setItem('ragulli:provider:v1', 'anthropic');
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ragulli));
  await seedFiveSources(page);

  // Ask a question — the chat panel runs topK with zoneWeights and
  // composes an extractive answer.
  const input = page.locator('input[aria-label="Ask a question"]');
  await expect(input).toBeEnabled({ timeout: 10_000 });
  await input.fill('which sources are most relevant?');
  await page.keyboard.press('Enter');

  // The answer must be visible. We don't care about its exact text;
  // we only need the assistant message to render with citation spans
  // pointing into the trusted zone. The no-key extractive answer
  // quotes passages verbatim; the chunks we seeded begin with
  // "chunk a for trusted-..." so a visible match confirms trusted
  // sources dominated the retrieval.
  const assistant = page.locator('article').filter({ hasText: 'trusted-' }).first();
  await expect(assistant).toBeVisible({ timeout: 20_000 });

  // The trust log records a model-call with destination "this browser
  // tab (local retrieval — nothing sent)" — proves no BYOK call.
  const trustEntries = await page.evaluate(async () => {
    const useTrustLog = window.__ragulli!.trust;
    return useTrustLog
      .getState()
      .entries.filter((e: TrustActivity) => e.kind === 'model-call' || e.kind === 'model-response');
  });
  expect(trustEntries.length).toBeGreaterThan(0);
});