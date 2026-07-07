// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Citation-click E2E test. Seeds a Source + Chunk rows + a
// citation-bearing assistant message via the workspace store
// (exposed on window.__ragulli for E2E testability), then clicks
// the rendered citation span and verifies the source viewer Dialog
// opens with the right filename.

import { expect, test } from './fixtures';

test('clicking a citation opens the source viewer dialog', async ({ page }) => {
  await page.goto('/app/');
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ragulli));

  // Seed Source + Chunk rows.
  await page.evaluate(async () => {
    const w = {
      id: 'ws-cite',
      name: 'T',
      templateId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const s = {
      id: 's-cite',
      workspaceId: 'ws-cite',
      filename: 'paper.pdf',
      mimeType: 'application/pdf',
      byteSize: 2048,
      addedAt: Date.now(),
      originOpfsPath: 'ragulli-files/s-cite',
      parserVersion: 'v1',
      meta: {},
    };
    const c = {
      id: 'c-cite-1',
      sourceId: 's-cite',
      workspaceId: 'ws-cite',
      zoneId: null,
      position: 0,
      text: 'Sliding window chunker is used in the methodology.',
      embedding: new Float32Array(8),
      tokenCount: 8,
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
  });

  // Hydrate the workspace store and push a citation-bearing message.
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

  // The citation span renders once the chat panel picks up the
  // message.
  const citation = page.locator('[data-chunk-id="c-cite-1"]').first();
  await expect(citation).toBeVisible({ timeout: 10_000 });

  await citation.click();

  // The source viewer Dialog opens. We don't depend on PDF.js
  // rendering here because jsdom doesn't run pdfjs; we just confirm
  // the dialog opened with the right filename in the title.
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  await expect(dialog.getByText('paper.pdf')).toBeVisible();
});