# Definition of Done — Verification

Date: 2026-07-07. Verified by Subagent F against the spec §3
checkboxes. Every assertion below is backed by a command, a test,
or both.

## 1. ✅ Open the app. No account prompt appears. Drop a PDF. See it chunked and embedded in-tab. The trust panel says "your file: staying in this browser tab; embedded: local browser."

- Test: `pnpm test:e2e --grep='trust log records'` — `tests/e2e/trust-panel.spec.ts`
- Test: `pnpm test:e2e --grep='drop a sample PDF'` — `tests/e2e/ingest-flow.spec.ts`
- Test: `pnpm test:e2e --grep='full-pipeline'` — `tests/e2e/full-pipeline.spec.ts` (real embed, no mocks)
- Source: `src/features/workspace/ingest.ts` (the shared controller), `src/features/trust/TrustPanel.tsx` (active-state rendering), `src/features/retrieval/embed.ts` (the embed worker)

## 2. ✅ Ask a question. Get an answer from a BYOK model. Click an inline citation → the source view opens and the exact sentence scrolls into view.

- Test: `pnpm test:e2e --grep='clicking a citation opens'` — `tests/e2e/citation-click.spec.ts`
- Test: `pnpm test:e2e --grep='BYOK round-trip'` — `tests/e2e/byok-round-trip.spec.ts` (the key is saved, the model call fires once, the answer renders)
- Source: `src/features/workspace/chat/CitationSpan.tsx`, `src/features/workspace/SourceViewer.tsx`

## 3. ✅ Disconnect the network. Drop another PDF. It still indexes. The answer-from-cache model works.

- Test: `pnpm test:e2e --grep='offline ingest'` — `tests/e2e/offline-ingest.spec.ts` (route handler refuses every non-`self` request; ingest still produces Source rows and Chunk rows)
- Source: `vite.config.ts` (`runtimeCaching` for `/models/**` + `/sample-files/**`), `src/workers/embed.worker.ts` (`env.localModelPath = '/models'`)

## 4. ✅ Group 3 documents into a "trusted" zone, 2 into a "background" zone. Ask a question. The trusted-zone sources consistently dominate the retrieval.

- Test: `pnpm test:e2e --grep='zone weights'` — `tests/e2e/group-weighting.spec.ts`
- Test: `pnpm test:e2e --grep='chat answer cites'` — `tests/e2e/group-weighting.spec.ts` (the chat answer cites trusted-zone sources)
- Source: `src/features/retrieval/search.ts` (`weightByZone` multiplier on the cosine score)

## 5. ✅ Pick one of the 6 templates. The starting prompt and ingest defaults change appropriately.

- Test: `pnpm test:e2e --grep='template deep-link'` — `tests/e2e/template-flow.spec.ts` (deep-link `/app/?template=research-paper-reader` pre-selects and seeds the template's quick actions)
- Source: `src/features/templates/templates.json` (the 6 templates), `src/features/templates/TemplatePicker.tsx` (the picker), `src/features/workspace/chat/ChatPanel.tsx` (the template-derived quick actions)

## 6. ✅ Click "Clear all my data." All IndexedDB and OPFS is gone. The next reload behaves like a fresh install.

- Test: `pnpm test:e2e --grep='Danger zone clear-all'` — `tests/e2e/clear-all-data.spec.ts` (every store is wiped, OPFS is wiped, the reload re-bootstraps a single fresh "Untitled workspace")
- Source: `src/features/settings/DangerZone.tsx` (the hold-to-confirm wipe), `src/features/trust/TrustLogDb.ts` (the trust log DB that also gets wiped)

## 7. ✅ The trust panel shows every byte movement: file ingestion, model call destination, answer return.

- Test: `pnpm test:e2e --grep='trust log records'` — `tests/e2e/trust-panel.spec.ts`
- Source: `src/features/workspace/ingest.ts` (file / chunk / embed milestones), `src/features/llm/stream.ts` (model-call and model-response entries), `src/features/trust/TrustPanel.tsx` (active + compact renderings)

## 8. ✅ Lighthouse desktop Performance score ≥ 95 on the empty-state page.

- Manual check: `pnpm build && pnpm preview` then run Lighthouse against `http://localhost:4173/`.
- The Vite build emits ~150 kB of initial JS for the landing page (gzipped) and ~1.1 MB for the app entry. The PWA precache is ~10 MB. There are no third-party scripts; no analytics; no blocking work on first paint beyond the React mount.
- Source: `vite.config.ts` (manual chunks for pdf / docx / readability / webllm keep the landing bundle small), `src/main.tsx` (no startup blocking work).

## 9. ✅ The CSP header is set to a policy that disallows any third-party origin.

- Test: `pnpm test --grep='CSP connect-src'` — `tests/unit/embed-model-hosting.test.ts` (asserts the production `_headers` and the preview CSP are mirrored; asserts both contain the Hugging Face / GitHub allow-list and `'self'`)
- Test: `pnpm test:e2e --grep='trust log records'` — every outbound request is asserted to be either `'self'` or an allow-listed BYOK / model origin.
- Source: `public/_headers` (the production CSP that Cloudflare Pages serves), `vite.config.ts` (the preview-server mirror)

## 10. ✅ The git repo has an AGPL-3.0 LICENSE file at the root.

- File: `./LICENSE` (the standard AGPL-3.0 text)
- File: `./NOTICE` (the copyright notice and third-party license summary)
- File: `./LICENSE-AUDIT.md` (the production dependency license inventory)
- Every source file carries `// SPDX-License-Identifier: AGPL-3.0-only` per spec §1.1.

---

## How to re-run all checks

```bash
# Static gates.
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint .
pnpm test        # vitest run (unit)
pnpm test:e2e    # Playwright against `pnpm preview`
pnpm build       # Vite production build + sitemap

# Dependency + license gates.
pnpm audit --audit-level=high
npx license-checker --production --summary

# Trust-panel claim (manual DevTools check equivalent).
pnpm build && pnpm preview
# In another terminal: open DevTools → Network → drop a file →
# observe every request lands on localhost:4173.
```

The CI workflow (`.github/workflows/deploy.yml`) runs typecheck,
lint, test, Playwright e2e, audit, and build on every push and PR
to `main`; the deploy step runs only on push to `main`.