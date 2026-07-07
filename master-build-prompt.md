RAGÜLLI — MASTER BUILD PROMPT (one-pass, single execution)
You are the orchestrator. This is one self-contained prompt. Read it end-to-end before spawning any subagent. Do not re-ask the user any questions; every call is already made. If a subagent needs clarification, it must come back to YOU, the orchestrator, not to the user.

Build target: 4 weeks of solo-founder time. V1 must ship. Static deploy, no backend service the user depends on, AGPL-3.0, full free, full open source.

Execute as parallel subagents where the contracts below allow. Sequential barriers are called out explicitly. Do not introduce new dependencies between subagents that don't exist in their contracts.

0. META INSTRUCTIONS
0.1 Quality bar
This is a flagship product. Every detail matters. Visual polish, copy, error states, loading states, empty states, edge cases. If you're not sure, look at Linear, Figma, Pitch, Raycast, Arc, Vercel, Stripe — those are the references. Anything less than those is a regression.

0.2 Anti-patterns (do not do these)

No backend service the user depends on. A Vercel Edge function used SOLELY for passing auth headers to non-CORS-permitting AI APIs (Anthropic) is allowed and doesn't violate this.

No analytics, no telemetry, no tracking pixels, no third-party scripts. The trust panel claim must be literally true.

No fake chat bubbles, no fake "thinking…" spinners, no fake memory. If RAGülli doesn't have state, say so.

No "we'll add this in V2" placeholders in V1 code. Either ship it or don't write the UI for it.

No skeleton UIs that look like dev tools. Every page must look polished even when empty.

No semicolons banned / snake_case / weird naming. Use TypeScript standard. Use camelCase. Use Airbnb-style React.

No CSS-in-JS. Tailwind only. Plus CSS variables for the design tokens.

0.3 Hard rules

Strict TypeScript (strict: true, noUncheckedIndexedAccess: true).

Tailwind v4 with CSS variables for the design tokens.

All long-running tasks in Web Workers. Never block the UI thread for >50ms.

All data must round-trip IndexedDB / OPFS. No in-memory-only state that survives only as long as the tab.

Strict CSP. No inline scripts. No eval. No unsafe-inline. No third-party origins in the CSP allow-list.

1. PRODUCT IDENTITY
1.1 The product
RAGülli (pronounced RAG-goo-lee; U+0308 on the u — yes, the umlaut is canonical).

Tagline (use everywhere a one-line is needed):

Your files. Your AI. Your browser.

Sub-tagline (only when there's vertical space):

Private RAG. No account. No server.

Repo: ragulli (kebab-case) on the user's GitHub.

License: AGPL-3.0. Every source file must carry an SPDX header:

text

Copy
// SPDX-License-Identifier: AGPL-3.0-only

// Copyright (c) 2026 RAGülli contributors
1.2 Who it's for (ICP, ranked)
1.
Privacy-sensitive knowledge workers. Doctors, lawyers, financial analysts, founders with sensitive data, journalists. The trust story sells them.
2.
Independent researchers. PhD students, indie researchers, book authors, podcasters. The bookmark-into-corpus pattern.
3.
PMs / designers / solo operators drowning in PDFs. The book-companion / customer-interview use cases.
4.
Power users who resent upload-everything apps. They already self-host; they want a clean browser-native tool.
1.3 What it is
A browser application that lets a user drop files (PDF, DOCX, Markdown, plain text, URLs), have them chunked and embedded in-tab, and then have a conversation where every claim cites its source — by clicking through to the exact line in the original file.

The user's files never leave the browser. Optionally, the user's questions go to a frontier LLM via a key the user supplied.

1.4 The wedge (the only one that matters)
There is no polished, zero-install, zero-account, browser-only private RAG tool. Every existing tool is either engineer-grade (ugly) or hosted (uploads). RAGülli occupies the empty square. The architecture (browser-only) is the moat — competitors cannot copy the trust story without giving up their BE.

1.5 Out of scope for V1 (do not build, do not tease)

Cloud sync

Multi-user / team workspaces

Mobile app

Web clipper extension

Audio transcription

Image OCR

Cloud-stored BYOK keys

Any form of analytics / telemetry

2. THE 7 DESIGN PRINCIPLES
Every feature gets graded against these. If a feature violates one, redesign.

1.
Four-second rule. First open = dropzone + four big icons (PDF, URL, text, audio) + sample files. No config. No account. No form.
2.
Trust contract. If the user's data could leave the browser, the UI must say so in plain English, in the same view as the action that moved it. Never on a separate page.
3.
Zero install, zero account. PWA. Never an email field. Never a signup form. (When cloud sync arrives V2, it's a paid add-on explicitly.)
4.
Honest about what's missing. No fake "thinking…" spinners. If the user just dropped their first file and hasn't chosen a model, say so.
5.
Spatial layout actually matters. Documents are drag-drop cards; groups have weights; weights propagate to retrieval. Layout IS retrieval.
6.
Citation is a hyperlink, not a number. Click any claim in the answer → the original PDF view scrolls to that sentence. No [1] footnotes.
7.
Works offline after first load. Everything except BYOK frontier calls works fully offline after the embedding model is cached.
3. SUCCESS CRITERIA (Definition of Done)
A reviewer with no prior context must be able to do all of the following without breaking:

 Open the app. No account prompt appears. Drop a PDF. See it chunked and embedded in-tab. The trust panel says "your file: staying in this browser tab; embedded: local browser."

 Ask a question. Get an answer from a BYOK model. Click an inline citation → the source view opens and the exact sentence scrolls into view.

 Disconnect the network. Drop another PDF. It still indexes. The answer-from-cache model works.

 Group 3 documents into a "trusted" zone, 2 into a "background" zone. Ask a question. The trusted-zone sources consistently dominate the retrieval.

 Pick one of the 6 templates. The starting prompt and ingest defaults change appropriately.

 Click "Clear all my data." All IndexedDB and OPFS is gone. The next reload behaves like a fresh install.

 The trust panel shows every byte movement: file ingestion, model call destination, answer return.

 Lighthouse desktop Performance score ≥ 95 on the empty-state page.

 The CSP header is set to a policy that disallows any third-party origin.

 The git repo has an AGPL-3.0 LICENSE file at the root.

4. TECH ARCHITECTURE
4.1 Stack (locked)
Concern	Choice
Build	Vite 5 + React 18
Language	TypeScript (strict)
Styling	Tailwind v4 with CSS variables for tokens
State	Zustand (one store per feature area)
Router	None needed (single-page app)
Local DB	Dexie.js (IndexedDB wrapper)
File storage	OPFS via native-file-system-adapter
Embeddings	Transformers.js (Xenova/bge-small-en-v1.5) in a Web Worker
PDF parsing	PDF.js
DOCX parsing	Mammoth.js
URL parsing	Mozilla Readability.js + a fallback server-side CORS proxy if needed
LLM (BYOK)	Direct fetch from browser; Anthropic via a stateless Vercel Edge function
LLM (in-browser)	WebLLM, Phi-3.5-mini-instruct (default) or Llama-3.1-8B-Instruct q4
PWA	Vite PWA plugin, service worker, manifest
Deployment	Cloudflare Pages (free tier, fast edge, no Google)
Linting	ESLint flat config + Prettier
Tests	Vitest (unit), Playwright (e2e)
Do not add new dependencies without justification in code review. Each dep is one more thing to license-check and update.

4.2 Project structure
text

Copy
ragulli/

├── LICENSE                          # AGPL-3.0

├── README.md

├── package.json

├── tsconfig.json

├── vite.config.ts

├── tailwind.config.ts

├── index.html                       # Single entry

├── public/

│   ├── favicon.svg

│   ├── logo-full.svg                # Logo + wordmark

│   ├── logo-mark.svg                # Just the mark

│   ├── og-image.png                 # For OG tags

│   └── sample-files/                # Used by the "sample research paper" etc. buttons

│       ├── sample-paper.pdf

│       ├── sample-contract.pdf

│       ├── sample-chapter.md

│       └── sample-article.html

├── src/

│   ├── main.tsx

│   ├── App.tsx

│   ├── routes/

│   │   └── index.tsx                # Single root route

│   ├── features/

│   │   ├── ingest/

│   │   │   ├── parsers/

│   │   │   │   ├── pdf.ts

│   │   │   │   ├── docx.ts

│   │   │   │   ├── markdown.ts

│   │   │   │   ├── text.ts

│   │   │   │   └── url.ts

│   │   │   ├── chunker.ts           # Sliding window with overlap

│   │   │   ├── pipeline.ts          # Drop → parse → chunk → embed → store

│   │   │   └── types.ts

│   │   ├── retrieval/

│   │   │   ├── embed.ts             # Web Worker wrapper

│   │   │   ├── store.ts             # Dexie schema + OPFS integration

│   │   │   ├── search.ts            # Cosine similarity top-k

│   │   │   └── types.ts

│   │   ├── llm/

│   │   │   ├── providers/

│   │   │   │   ├── openai.ts

│   │   │   │   ├── anthropic.ts

│   │   │   │   ├── google.ts

│   │   │   │   ├── minimax.ts

│   │   │   │   ├── kimi.ts

│   │   │   │   └── webllm.ts        # In-browser fallback

│   │   │   ├── stream.ts            # SSE / fetch stream abstraction

│   │   │   ├── citation-builder.ts  # Maps chunks → in-text citations

│   │   │   ├── keys.ts              # BYOK storage (localStorage, encrypted)

│   │   │   └── types.ts

│   │   ├── workspace/

│   │   │   ├── canvas/              # Sources canvas (drag-drop, weights)

│   │   │   │   ├── Canvas.tsx

│   │   │   │   ├── Card.tsx

│   │   │   │   ├── Zone.tsx

│   │   │   │   └── WeightSlider.tsx

│   │   │   ├── chat/

│   │   │   │   ├── ChatPanel.tsx

│   │   │   │   ├── Message.tsx

│   │   │   │   ├── CitationSpan.tsx # The clickable in-text span

│   │   │   │   └── QuickActions.tsx

│   │   │   ├── sidebar/

│   │   │   │   └── WorkspaceSwitcher.tsx

│   │   │   └── store.ts             # Zustand store for workspace state

│   │   ├── trust/

│   │   │   ├── TrustPanel.tsx       # The always-visible UI surface

│   │   │   ├── TrustLog.ts          # In-memory + persisted log

│   │   │   └── Activity.ts          # Single activity record type

│   │   ├── templates/

│   │   │   ├── templates.json       # The 6 starter templates

│   │   │   └── TemplatePicker.tsx

│   │   ├── settings/

│   │   │   ├── Settings.tsx

│   │   │   ├── ModelSelection.tsx

│   │   │   ├── IngestDefaults.tsx

│   │   │   ├── DangerZone.tsx       # Clear all data

│   │   │   └── About.tsx

│   │   └── dropzone/

│   │       ├── Dropzone.tsx

│   │       └── FirstDrop.tsx        # The first-open hero

│   ├── workers/

│   │   ├── embed.worker.ts          # Transformers.js runs here

│   │   └── chunk.worker.ts          # Optional: heavy chunking

│   ├── components/

│   │   ├── ui/                      # Button, Card, Chip, Dialog, ...

│   │   └── icons/

│   ├── lib/

│   │   ├── db.ts                    # Dexie instance

│   │   ├── opfs.ts                  # OPFS helpers

│   │   ├── crypto.ts                # For at-rest BYOK key encryption

│   │   └── stream.ts                # Async iter helpers

│   ├── styles/

│   │   └── globals.css              # Tailwind v4 + tokens

│   └── landing/                     # Landing-page components (separate from app)

│       ├── Hero.tsx

│       ├── Features.tsx

│       ├── Wedge.tsx

│       ├── ComparisonTable.tsx

│       ├── Templates.tsx

│       ├── CTA.tsx

│       └── Footer.tsx

├── api/                             # Vercel Edge function for Anthropic CORS proxy

│   └── anthropic.ts

├── tests/

│   ├── unit/

│   └── e2e/

│       ├── trust-panel.spec.ts

│       ├── ingest-flow.spec.ts

│       ├── retrieval-flow.spec.ts

│       └── citation-click.spec.ts

└── .github/

    └── workflows/

        └── deploy.yml
4.3 Storage schema (Dexie / IndexedDB)
ts

Copy
// src/features/retrieval/store.ts (schema shape only — actual code by Subagent B)


type Source = {

  id: string;                    // uuid

  workspaceId: string;

  filename: string;

  mimeType: string;

  byteSize: number;

  addedAt: number;               // Date.now()

  originOpfsPath: string;        // pointer to OPFS file

  parserVersion: string;

  meta: Record<string, unknown>; // free-form (PDF page count, etc.)

};


type Chunk = {

  id: string;                    // uuid

  sourceId: string;

  workspaceId: string;

  zoneId: string | null;         // null = ungrouped

  position: number;              // ordinal within source

  text: string;                  // the chunked passage

  embedding: Float32Array;       // bge-small-en, 384 dims

  tokenCount: number;

};


type Zone = {

  id: string;

  workspaceId: string;

  name: string;

  weight: number;                // 0.0 ... 2.0, default 1.0

  color: string;                 // hex

  position: { x: number; y: number };

};


type Chat = {

  id: string;

  workspaceId: string;

  title: string;

  createdAt: number;

  messages: ChatMessage[];

};


type ChatMessage = {

  id: string;

  role: "user" | "assistant" | "system";

  content: string;               // markdown-ish

  citations?: Citation[];        // span-id → chunk-id map

  trustEntries?: TrustActivity[];// what model was called, what was sent

  createdAt: number;

};


type Citation = {

  id: string;

  chunkId: string;

  sourceId: string;

  pageNumber?: number;           // for PDFs

  charStart: number;

  charEnd: number;

};


type Workspace = {

  id: string;

  name: string;

  templateId: string | null;

  createdAt: number;

  updatedAt: number;

};
4.4 In-browser LLM fallback

Default model: Phi-3.5-mini-instruct.

Toggle in Settings → "Run fully in browser (slower, ~3 GB first download)."

Uses WebLLM (@mlc-ai/web-llm) with WebGPU if available, WebGPU-LTS otherwise.

The first activation may take 30+ seconds while the model streams.

Once cached, it works offline.

4.5 The browser-only promise, formalized
These three things must be physically impossible for the user data to violate:

1.
Files dropped into the app never make any network request other than the user's explicit BYOK call.
2.
Embeddings and storage happen entirely in-tab.
3.
There is no analytics origin in the CSP connect-src directive.
CSP baseline (must appear in _headers for Cloudflare Pages):

text

Copy
default-src 'self';

script-src 'self';

style-src 'self' 'unsafe-inline';

img-src 'self' data: blob:;

font-src 'self';

connect-src 'self' https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.minimaxi.chat https://api.moonshot.cn https://ragulli-proxy.vercel.app;

worker-src 'self' blob:;
Any new outbound URL added to connect-src is a trust-panel violation. Document every entry with a comment in vite.config.ts.

4.6 The Anthropic CORS workaround
Vercel Edge function at api/anthropic.ts that takes { messages, apiKey } (passed in the body, NOT stored), forwards to Anthropic, streams back. The function:


Does NOT log anything.

Does NOT persist anything.

Returns the stream directly.

The Vercel function logs are turned off (or wiped every 24 hours).

This counts as a "BE" in the deployment sense but does NOT violate the user-facing browser-only promise, because:


The user's files never go to it.

Only the user's question + user-supplied key go to it.

The Edge function is stateless and call-time-only.

The landing page and the trust panel call this out explicitly: "If you use Anthropic, your question passes through a stateless Vercel Edge function for CORS. Files never do."

5. SUBAGENT SPAWNING PLAN
Spawn these subagents. Each owns its scope end-to-end. Outputs are passed via the orchestrator's shared filesystem + git commits; the orchestrator verifies the DoD before moving to the next phase.

Each subagent's prompt section below is the literal subagent prompt. Pass them as separate agent tasks.

🅰️ Subagent A — Architect & Scaffolder  (runs first, must complete before 🅱️/🅲️/🅳️)
Scope

Repo init, monorepo (single package for V1)

All configs: Vite, TS strict, Tailwind v4, ESLint, Prettier, Vitest, Playwright

index.html, _headers (CSP), _redirects, manifest.json

Cloudflare Pages deployment via GitHub Actions

Design tokens (CSS variables) — see Section 8

Logo generation — see Section 10

CI/CD: pnpm typecheck && pnpm lint && pnpm test && pnpm build on every PR

Deliverables
1.
Working Vite + React + TS app that renders an empty page with the RAGülli logo and the tagline.
2.
PWA install works offline after first load.
3.
CSP header set.
4.
README skeleton (placeholder for the real README — Subagent F will replace).
5.
AGPL-3.0 LICENSE file at the root.
6.
The logo (full lockup and mark-only) in /public/ — see Section 10 for the brief.
7.
Sample files in /public/sample-files/: one research paper (real PDF), one contract (real PDF), one Markdown chapter, one HTML article. Subagent A can generate these with simple mock content.
Definition of Done

pnpm install && pnpm build && pnpm preview boots a working app.

Logo displays correctly at favicon size, full size, and as OG image.

Lighthouse PWA + Performance score ≥ 95.

Lighthouse audit shows the CSP header in place.

git log is clean, commits are scoped.

🅱️ Subagent B — RAG Core (Ingest + Retrieval)  (runs after 🅰️)
Scope

All files under src/features/ingest/

All files under src/features/retrieval/

The Web Worker files (src/workers/embed.worker.ts)

Tests for chunking, embedding, top-k retrieval

Deliverables
1.
pipeline.ts — public function ingestFile(file: File): Promise<{sourceId, chunksCreated}> that handles parse → chunk → embed → store. Returns chunk IDs and a final progress callback.
2.
chunker.ts — sliding window with configurable chunk size (default 800 tokens) and overlap (default 100 tokens). Tokenization via the embedding model's tokenizer.
3.
embed.worker.ts — runs Transformers.js embedding, accepts { chunks: string[] }, returns { embeddings: Float32Array[] }.
4.
db.ts + store.ts — Dexie schema as in §4.3. CRUD for sources, chunks, zones.
5.
opfs.ts — Helpers to put/get files in OPFS.
6.
search.ts — topK(query: string, k: number, filter?: (chunk) => boolean): Chunk[] — embed query, cosine against filtered chunks, return sorted top-k.
7.
Zone weighting: topK must accept a weightByZone: Record<string, number> map and multiply the similarity score by (zoneWeight ?? 1.0).
8.
Unit tests covering all parsers, chunker edge cases (empty files, large files, PDFs with no text layer), retrieval ranking.
Definition of Done

Drop any of the four supported file types into the empty app → see chunks stream in the trust panel → see them persisted in IndexedDB.

A console-driven unit test can: drop → store → query → get back the right chunks.

pnpm test is green.

Handoff contract

The pipeline accepts a File and returns rich metadata other subagents can use.

The retrieval API is the only thing Subagent C (LLM) and Subagent D (UI) need to import.

🅲️ Subagent C — LLM, Chat & Citations  (runs after 🅱️; depends on retrieval API)
Scope

All files under src/features/llm/

The Vercel Edge function at api/anthropic.ts

The streaming + citation-mapping logic

The settings page (src/features/settings/)

Tests for streaming, citation mapping, key handling

Deliverables
1.
providers/openai.ts, providers/anthropic.ts, providers/google.ts, providers/minimax.ts, providers/kimi.ts, providers/webllm.ts — each exposes a stream(messages, opts) → AsyncIterable<StreamChunk> where StreamChunk is { type: "token" | "done"; text?: string; meta?: ... }.
2.
The Anthropic provider routes through the Vercel Edge function. The other four call direct from browser.
3.
stream.ts — unified interface + helpers.
4.
citation-builder.ts — given a chat history and retrieved chunks, attaches { chunkId, spanRange } markers to assistant tokens before rendering. Spans must match the chunk text exactly (no fuzzy matching — slice on identical substrings).
5.
keys.ts — BYOK key storage. setKey(provider, key) / getKey(provider) / clearAll(). Encrypted at rest with a per-tab secret (crypto.subtle + crypto.getRandomValues).
6.
api/anthropic.ts (Vercel Edge function) — stateless, no logs.
7.
Settings page (with ModelSelection, IngestDefaults, DangerZone, About).
8.
Unit tests covering all five providers (mock the network), citation builder edge cases (chunk text in middle of answer, chunk text spanning line breaks).
Definition of Done

Pick any provider in Settings → save a key → reload the page → the key is still there (encrypted).

Ask a question in the chat panel → get a streamed answer that includes clickable citations spanning the right chunks.

pnpm test is green; tests cover the Edge function in isolation (treat it as a function that takes a Request and returns a Response).

Handoff contract

Exposes a single src/features/llm/index.ts with: streamChat, getAvailableProviders, setProvider. That's the only API Subagent D imports.

🅳️ Subagent D — UI/UX Shell, Trust Panel, Templates  (runs after 🅱️ and 🅲️)
Scope

All files under src/features/workspace/

All files under src/features/trust/

All files under src/features/templates/

All files under src/features/dropzone/ and src/features/settings/

src/App.tsx, src/routes/index.tsx

Tests for the trust panel claim, the citation click, the zone weighting in UI

Deliverables
1.
The full first-open hero screen.
2.
The three-column workspace shell.
3.
The dropzone with the four big icon-buttons (PDF, URL, text, audio).
4.
The sources canvas with drag-drop, group creation, weight slider per group.
5.
The chat panel with inline citation spans (clickable, linking to the source view).
6.
The trust panel — always visible. Active state during processing. Compact state when idle. Shows the last 4-8 actions and their destinations, in plain English.
7.
The source viewer — opens the original file (PDF rendered via PDF.js, .md/.txt as styled text), with the ability to scroll to a given character offset (used by the citation click).
8.
The workspace switcher sidebar.
9.
The 6 starter templates JSON file. Each template is { id, name, icon, ingestDefaults, defaultPrompt, suggestedSources }.
10.
Settings page (Subagent C builds the back end; Subagent D builds the UI). DangerZone has a one-click "Clear all my data" with a confirmation pulse animation before it executes.
Definition of Done

All 7 scenes from Section 6 render correctly with mock data.

The four-second rule is met on first open (test in a fresh browser session with cleared IndexedDB).

A Playwright E2E test verifies: drop a PDF → click the citation in the answer → the source view scrolls to the right line.

A Playwright E2E test verifies: trust panel shows "your file: staying in this browser tab" when a file is dropped.

pnpm test and pnpm test:e2e both green.

Handoff contract

This subagent treats Subagents B and C as libraries. Imports only from their public APIs. Never reaches into their internals.

🅴 Subagent E — Landing Page + Brand  (runs in parallel with 🅱️ after 🅰️)
Scope

src/landing/ — the marketing site components

Cloudflare Pages serves the landing site at the root URL (/); the app lives at /app (a separate Vite multi-page entry) — OR the app lives at a subdomain app.ragulli.com. Pick the multi-page option: simpler.

OG image, Twitter card, sitemap

Per-template SEO landing pages

Comparison pages

Deliverables
1.
src/landing/Hero.tsx — the marketing hero with H1, subline, two CTAs ("Drop something", "Try a sample"), a visual that shows the trust panel.
2.
src/landing/Wedge.tsx — the "we live in the empty square" 4-quadrant comparison chart.
3.
src/landing/Features.tsx — the 4 features at launch.
4.
src/landing/Templates.tsx — the 6 templates shown as cards.
5.
src/landing/ComparisonTable.tsx — RAGülli vs NotebookLM vs Humata vs ChatPDF — 5 rows × 4 columns.
6.
src/landing/CTA.tsx + Footer.tsx.
7.
SEO: meta tags, structured data (SoftwareApplication), per-template landing pages (one per template).
8.
Comparison pages (one per competitor above).
The landing page must be:

Static-rendered (the simplest possible Cloudflare Pages config)

Lighthouse Performance ≥ 95

A11y ≥ 95

All copy from the brand voice rules (Section 10)

Real screenshots from the running app (Subagent F's job to capture, but Subagent E owns the layout slots)

Definition of Done

pnpm build produces a static site + a /app/index.html entry.

The landing page loads in <1 second on a clean cache.

Lighthouse a11y + performance + best-practices all green.

OG image renders correctly when posted to X / LinkedIn / Slack.

🅵 Subagent F — QA, Tests, Launch Assets  (runs after 🅳️ completes; can overlap with 🅴 if launch assets are independent)
Scope

Tests under tests/

README + GitHub Pages site

GitHub Actions workflows

PH / HN / Twitter launch assets

Final security audit

Deliverables
1.
E2E test suite (Playwright) covering: drop → process → query → cite → click. Trust panel claim. Group weighting. Templates. Clear-all-data.
2.
Unit tests for any uncovered helpers.
3.
README.md: title, hero image, the 7 principles, the 4-week story, "how to run locally," "how to self-host," AGPL badge, link to /app.
4.
GitHub Pages site (or use Cloudflare Pages for the marketing site, GitHub for the docs).
5.
PH launch assets: 4 screenshots, 1 lead image, 1 short caption, 1 maker comment. Use the styles from images.v3 of the Struppëflo launch (separate brand, same dark-and-editorial language).
6.
HN Show HN post draft + tweet thread draft + Indie Hackers draft — all in launch/.
7.
Security audit: run npm audit, manual CSP review, manual review of every connect-src entry, test that the trust panel claim is literally true (drop a file with the network tab open; verify no requests to non-allowed origins).
8.
AGPL NOTICE file with the AGPL-3.0 license text in LICENSE.
Definition of Done

All 10 checkboxes in Section 3 are checked.

A second human unfamiliar with the project can deploy, drop a file, and get an answer citing a source line, in under 5 minutes total.

6. PRODUCT FLOWS (scene-by-scene)
(Description only — Subagent D implements.)

Scene 1 — First open (no project yet)
Empty state. Topbar shows "RAGülli" (logo + wordmark) + a "?" info button + a "Settings" gear icon. Center: huge dropzone with four big icon-buttons (PDF, URL, TEXT, AUDIO) and four sample file buttons ("Sample research paper", "Sample contract", "Sample book chapter", "Sample article URL"). A small trust chip pinned at the bottom-left: "no account • no server • no telemetry."

Scene 2 — After first drop
Processing state. The dropzone shrinks to a topbar progress bar. The trust panel transitions to its active state on the right side: "your file 'paper.pdf' • parsed: local browser (PDF.js) • chunked: local browser • embedded: local browser (MiniLM) • sent to: NOT SENT."

Scene 3 — Workspace view (default)
Three columns. Left: workspace switcher with "Untitled workspace" highlighted. Center: sources canvas (empty initially). Right: chat panel with an empty state that says "Drop a file to start" plus 4 quick-action chips: "Summarize", "Find dates", "Compare X to Y", "Explain jargon". As files are added, cards appear in the canvas.

Scene 4 — Chat answer (the moment of truth)
User types a question. Streams in. Each assistant message has clickable inline spans at the citation points. Below the answer: "Sources used: [paper-2 · p.4 ¶ 2] [paper-3 · p.1 ¶ 1]". Clicking either opens the source view with that exact line scrolled into view.

Scene 5 — Sources canvas with grouping
User drags cards into zones. Each zone has a name (rename inline), a color, and a weight slider (0–2.0, default 1.0). The retrieval API reweights based on these. Visually, zones have soft dashed borders and the cards inside have subtle glow that matches the zone color.

Scene 6 — Trust panel
Always visible. Active state during processing (covers the right rail). Compact state when idle (chip in the bottom-right). Hover to expand. Click to pin. The compact state shows the last 4 actions with destinations, in plain English.

Scene 7 — Settings
Single page. Six sections as in §0.2 above. Default sections are Model selection (BYOK fields, one per provider, masked), Ingest defaults (chunk size slider, overlap slider, OCR toggle), Citations style (inline / footnote / numbered), Privacy (one big "Clear all local data" button that requires holding for 1 second), Storage usage (numeric: "X MB / Y MB used"), About (version, license, GitHub link, "no analytics, no telemetry" pledge).

7. DATA FLOW
7.1 Ingest
text

Copy
file.drop

  → parse (PDF.js / Mammoth.js / Readability.js / plain text)

  → write raw bytes to OPFS (originOpfsPath)

  → save Source record (Dexie)

  → chunk (sliding window, 800 tokens, 100 overlap)

  → per chunk: tokenize → embed (Web Worker, bge-small-en-v1.5)

  → save Chunk records (Dexie)

  → return chunk IDs
7.2 Query
text

Copy
question.text

  → embed (Web Worker, bge-small-en-v1.5)

  → top-k (cosine similarity, k=8 default, weighted by zone)

  → build context: numbered list of chunks with inline markers

  → build messages: [system + template prompt, user question]

  → stream to chosen LLM provider (BYOK key from localStorage)

  → on each token: append to UI, check for citation marker matches

  → finalize: save ChatMessage with citations[] + trustEntries[]
7.3 Citation rendering

During generation, the prompt template instructs the model to cite using markers like [1], [2]. The model output is then post-processed: each [N] is replaced with a clickable <CitationSpan> whose anchor is the chunk with that index.

A separate "inline span" mode: the prompt instructs the model to embed exact quotes from chunks, the renderer uses those exact substrings to build the spans. (This is the higher-quality mode; default for V1.)

7.4 Storage lifecycle

A user "Clear all my data" wipes all IndexedDB databases and the OPFS root.

A "Export workspace" emits a JSON containing source metadata, chunks, embeddings, zones, chat history, plus a zip of original files via OPFS streaming. (V1.x — drop if time-constrained.)

A user "Delete workspace" deletes just that workspace's data.

8. UI/UX DETAIL
8.1 Visual language

Dark theme default. No light mode for V1 — the wedge is "private, focused, scholarly." A light mode can come V2.

Background: Deep forest teal (#0B2027)

Text primary: Soft cream (#F2EDE0)

Text secondary: Faded sage (#8FA396)

Accent: Warm amber (#E0B158)

Borders: Subtle slate (#1F3A40)

Glow / focus: Amber at low opacity

Forbidden colors: Purple, blue, neon, gradients that scream "AI tool." RAGülli is NOT another AI tool. RAGülli is a study companion that uses AI.

8.2 Typography

Sans: Inter (body, UI)

Serif: Lora or Source Serif Pro (long-form content like chat answers)

Mono: JetBrains Mono (code, the X-Ray-style prompt preview in settings)

All via @fontsource/* self-hosted. No Google Fonts CDN (would violate the trust panel claim).

8.3 Components in src/components/ui/
Button (primary, secondary, ghost), Chip (filter chip, status chip), Card (the source card on the canvas), Dialog (small modal — used by clear-data confirmation), Tabs, Tooltip, Toast, Slider (weight slider), Dropzone. Each component must:

Be typed (FC<Props>)

Have an accompanying Storybook-style preview story (.stories.tsx)

Be dark-theme by default

Use Tailwind only (no inline styles for color)

8.4 Trust panel detail
Active state (during a file ingestion or model call):

text

Copy
┌─ what's happening now ──────────────────────┐

│  your file "research-paper.pdf"             │

│  • parsed:  local browser (PDF.js)          │

│  • chunked:  local browser                  │

│  • embedded: local browser (MiniLM)         │

│  • sent to:  NOT SENT to anywhere yet       │

│                                              │

│  your question "what are the risks"         │

│  • sent to:  Anthropic · claude-sonnet-4    │

│  • (anthropic only: passed through          │

│     stateless Edge function for CORS)       │

│  • response: streaming in this tab          │

└──────────────────────────────────────────────┘
Compact state (idle):

text

Copy
┌─ last 4 actions ────────────────────────┐

│  embedded 4 files · asked 1 question    │

│  last Q went to: Anthropic · sonnet-4   │

│  nothing uploaded to a server          │

└─────────────────────────────────────────┘
The compact state is a small chip in the bottom-right. Hover → expand. Click → pin (becomes a permanent side panel).

8.5 Templates JSON shape
json

Copy
{

  "id": "research-paper-reader",

  "name": "Research paper reader",

  "icon": "book",

  "description": "Read academic papers with structured summaries and a reading-companion Q&A.",

  "ingestDefaults": {

    "chunkSize": 600,

    "chunkOverlap": 80,

    "ocr": false

  },

  "defaultPrompt": "You are a research-paper reading companion. Answer the user's questions in plain language. Always cite the source page and paragraph. When asked to summarize, structure the summary as: 1) the question being asked, 2) the method, 3) the headline result, 4) limitations.",

  "quickActions": [

    { "label": "Summarize", "prompt": "Summarize this paper in 5 bullets, citing pages." },

    { "label": "Find methodology", "prompt": "Where in this paper is the methodology described? Quote it." },

    { "label": "List limitations", "prompt": "List every limitation the authors acknowledge, with page citations." },

    { "label": "Compare claims", "prompt": "Compare the claims in this paper to ..." }

  ]

}
The 6 V1 templates: research-paper-reader, contract-reviewer, customer-interview-corpus, book-companion, newsletter-digester, job-application-matcher.

9. LANDING PAGE — must be stellar
9.1 Sections, in order
1.
Hero. H1: "Your files. Your AI. Your browser." Subline: the 7-second sub. Two CTAs: "Drop something to start" (links to /app) and "Try a sample research paper" (drops the sample file directly into the running app). Visual: a screenshot of the trust panel showing "your file: staying in this browser tab."
2.
The wedge. The 4-quadrant chart from §1.4 rendered as an HTML element (no image). Animated subtly on scroll. RAGülli lives in the top-right cell.
3.
Features. 4 cards: zero install / zero account / works offline / cites its sources.
4.
Templates. The 6 templates as cards, each linking to /t/research-paper-reader (per-template landing page).
5.
Trust, in detail. Visual of the trust panel close-up + a one-paragraph explanation of the architecture.
6.
Comparison table. RAGülli vs NotebookLM vs Humata vs ChatPDF. Rows: install, account, where files go, citation quality, BYOK, prices, open source.
7.
CTA. "Try it now" + "Read the code" + "Star on GitHub."
9.2 SEO

Meta description (155 chars): "RAGülli is the browser-based, zero-account, private RAG tool. Drop files, ask questions, every answer cites the line. Open source (AGPL-3.0)."

OG title: "Your files. Your AI. Your browser."

Structured data: SoftwareApplication schema with offers.price: 0 and license: AGPL-3.0.

Sitemap with: /, /t/{template} × 6, /compare/{competitor} × 3 (NotebookLM, Humata, ChatPDF), /privacy.

9.3 Per-template landing pages
One per template, e.g. /t/research-paper-reader:

Hero with the template name + one-sentence description.

"Why this template" paragraph.

3 example questions.

"Open in RAGülli" CTA (deep-link to /app with ?template=research-paper-reader).

9.4 Comparison pages
One per major competitor, e.g. /compare/notebooklm:

Side-by-side feature grid.

Honest assessment (acknowledge where NotebookLM is better — Audio Overviews are a great feature).

"Switch to RAGülli" CTA.

9.5 Copy voice

Confident but not arrogant.

Direct. No "we believe," no "we think." Just say what it does.

Short paragraphs. Short sentences. Lots of line breaks for scanning.

No emoji. No exclamation marks. The brand IS the calm.

10. BRAND
10.1 The umlaut
The u in RAGülli has a U+0308 (combining diaeresis): RAGülli. This is non-negotiable. The umlaut is the brand. Set the lang attribute on every page to mul (multiple languages) or de (German — closest linguistic register to the Nordic feel the name evokes).

10.2 Logo generation brief (Subagent A's responsibility)
Generate two logo SVGs using image generation. The brief:

Logo mark (square / 1:1) — abstract "library stamp" feel:

Deep forest teal background

A subtle, hand-drawn-feel mark in warm amber

Concept: a stylized open-book glyph, or three flowing horizontal lines that suggest "indexed documents," or a layered "depth" mark suggesting a corpus

Must read clearly at 32×32 (favicon) and at 1024×1024 (OG image)

No text in this version

Refs (do not copy): classic publisher's marks, Penguin Classics logo, Folio Society

Logo full lockup (landscape / ~4:1) — for landing-page hero, README header, etc.:

Same mark on the left, larger

The wordmark "RAGülli" on the right, in a clean modern serif (Lora)

Two-line caption below: "Private RAG in your browser."

Background: deep forest teal (#0B2027)

Save both to /public/logo-mark.svg and /public/logo-full.svg. Also export a /public/og-image.png (1200×630) for OG tags.

Regenerate at least 5 variants per logo and pick the strongest. If none look right, simplify the brief and try again. If still wrong, fall back to a hand-built SVG mark + a typeset wordmark, and document the choice.

10.3 Brand voice (for all copy)

Confident but warm.

Direct, never breathless.

Long words are fine if they're precise.

No emoji. No exclamation marks.

The brand is the calm — let the product feel like a leather-bound research notebook, not a SaaS landing page.

11. OUT OF SCOPE (V1)
These must not be built, and the UI must not tease them:

Cloud sync (V2)

Multi-user / team workspaces (V2)

Mobile (V3)

Web clipper extension (V1.5)

Audio transcription (V1.5)

Image OCR (V1.5)

Cloud-stored BYOK keys (V2)

Any form of analytics or telemetry

12. LICENSE & LEGAL
12.1 License
AGPL-3.0-only. Place LICENSE file at repo root with the standard AGPL-3.0 text. Every source file carries the SPDX header from §1.1.

12.2 Third-party dependencies

All dependencies must have a license compatible with AGPL-3.0 distribution.

Run npx license-checker --production and confirm before launch.

No GPL-only deps without explicit dual-license notes.

12.3 Trademarks

"RAGülli" is the project name, not a registered trademark.

Do not reference third-party trademarks except in comparison-table copy and "NotebookLM alternative" SEO pages, both of which are nominative use.

13. LAUNCH ASSETS
13.1 README

Title + hero image (the lockup + a product screenshot)

The 7 design principles (one bullet each)

"How it works" (4-step explainer)

"How to run locally" (5 commands)

"How to deploy to Cloudflare Pages" (3 commands)

"How to add a starter template" (1 PR away)

AGPL badge

"Made with restraint. No analytics. No telemetry."

13.2 GitHub Pages site (optional for V1)
Same content as the landing page but with a "Docs" tab and a "Templates" tab. Vercel / Cloudflare Pages is fine to host everything.

13.3 Product Hunt assets

Lead image: 1280×640 (the trust panel + tagline)

4 gallery images: first-open hero, sources canvas with zones, chat with citation, trust panel close-up

Maker comment (drafted in launch/ph.md)

Show HN post (drafted in launch/hn.md)

Tweet thread (drafted in launch/tweets.md)

13.4 Indie Hackers post (drafted in launch/ih.md)
Story-format: "I built RAGülli because I'm tired of uploading every PDF I read to someone else's server."

14. NOTES FOR THE ORCHESTRATOR
14.1 Sequencing summary

🅰️ runs first.

🅱️ runs after 🅰️.

🅲️ runs after 🅱️.

🅳️ runs after 🅲️ (depends on both).

🅴️ runs after 🅰️ (parallel to 🅱️/🅲️/🅳️).

🅵️ runs after 🅳️ + 🅴️.

14.2 Verification gates

Between each phase, the orchestrator runs the prior subagent's DoD before unblocking the next.

If a DoD fails, return to the responsible subagent with the failure log.

14.3 What "good" looks like

The product itself looks like a new kind of premium tool, not "another RAG."

The landing page converts (a soft metric; at minimum, the "Try a sample" CTA is the most-clicked element).

The trust panel claim is literally true — verify this in the security audit by opening DevTools' Network tab while dropping a file.

14.4 What "shippable" looks like

4-week build completes.

The empty-quadrant cell is occupied for the first time.

The first 100 users find it via search or word-of-mouth.

The first 5 community template PRs land in the repo.

✅ HANDOFF
Pass this document to your build orchestrator with the instruction: "Spawn 6 subagents per Section 5. Block on dependencies. Verify DoD at each gate. Ship when Section 3 is fully checked."

The product is named, the architecture is locked, the brand is set, the wedge is the empty square. Build it.