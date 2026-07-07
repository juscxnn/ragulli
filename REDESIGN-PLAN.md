# RAGülli UI/UX Redesign Plan

Status: in progress on branch `redesign/ui-overhaul`. This file is the
north star. If a session ends mid-way, the next model reads this,
checks the "Progress" checklist at the bottom, and continues.

## Goal

Make RAGülli **instantly useful and sticky** — parity-or-better than
NotebookLM / ChatPDF / Humata — while keeping its unique wedge: private,
browser-only, trust-forward, scholarly. Fix the broken layout/scrolling,
add stepper onboarding, and elevate the whole UI to a premium feel.

## What is wrong today (diagnosed live)

1. **App shell is a rigid 3-column desktop grid** (`w-56` + `flex-1` +
   `w-[420px]`) on a `min-h-screen` root. No responsive breakpoints, so
   on tablet/mobile it collapses/clips. Chat text clips at the right
   edge. Columns don't independently scroll — the whole page scrolls.
2. **No onboarding.** First open drops the user into a bare workspace
   with an empty canvas void and a cramped chat. No guidance, no "aha."
3. **Chat is cramped and basic** — 420px column, plain messages, no
   composer polish, citations are underlined text runs (hard to scan),
   no empty-state suggested questions, no streaming affordance.
4. **Canvas is a large empty void** with just "+ Create zone / + Add
   source" — no visual interest, no guidance, weak source cards.
5. **Flat design system** — minimal spacing rhythm, no elevation/motion,
   weak hover/focus states. Reads as a prototype, not a product.
6. **Landing** is acceptable but sparse; sections lack rhythm and the
   page doesn't build momentum toward the CTA.

## Design direction

Keep the brand: deep forest teal `#0B2027`, warm amber `#E0B158`, cream
`#F2EDE0`, Lora serif display + Inter body + JetBrains mono. Scholarly,
calm, private. NOT another purple-gradient AI tool.

Elevate with: generous spacing scale, soft elevation, restrained motion
(mount fades, 150–200ms transitions), crisp focus rings, refined type
scale, and a layout that breathes.

### New design tokens (globals.css `@theme`)
- Spacing rhythm: rely on Tailwind's scale but standardize section
  padding (`px-6 md:px-8`, panel padding `p-4 md:p-5`).
- Elevation: `--shadow-panel`, `--shadow-card`, `--shadow-pop` (dialogs).
- Motion: `--ease-out: cubic-bezier(0.22,1,0.36,1)`; durations 150/200/300.
- Radii already good (sm 4 / md 8 / lg 14); add `--radius-xl: 20px`.
- Add `--color-surface-3` for hover, `--color-accent-soft` (amber @ ~12%).
- Add a `.animate-fade-in` / `.animate-rise` utility via `@keyframes`.

## Architecture of the redesign

### 1. App shell — `src/App.tsx` + new `src/features/shell/AppShell.tsx`
Replace the fixed 3-column with a **responsive, scroll-contained shell**:
- Root: `h-[100dvh] flex flex-col overflow-hidden` (dvh handles mobile
  browser chrome). Topbar `shrink-0`. Body `flex-1 min-h-0 flex`.
- Desktop (`lg+`): three panes — Sources rail (collapsible, `lg:w-64`),
  Workspace/canvas (`flex-1 min-w-0`), Chat (`w-[min(460px,38vw)]`).
  Each pane is its own `overflow-y-auto min-h-0` scroll container.
- Tablet (`md`): two panes — collapse the sources rail into a drawer
  toggled from the topbar; canvas + chat side by side, or chat as a
  slide-over.
- Mobile (`<md`): single column with a **bottom tab bar**: Sources /
  Chat / Trust. One pane visible at a time; drop/ask still work.
- Never let the page body scroll horizontally; wide content
  (source viewer, tables) scrolls inside its own container.

### 2. Onboarding stepper — new `src/features/onboarding/`
- `Onboarding.tsx` — a focused modal/overlay shown when
  `localStorage['ragulli:onboarded:v1']` is absent, or re-openable from
  the "?" menu.
- Stepper component `Stepper.tsx` (reusable): numbered steps, progress
  bar, back/next, skip.
- Steps:
  1. **Welcome** — one-line what-it-is + the three trust promises
     (no account, no server, nothing leaves the tab). Warm, short.
  2. **Add your first source** — the four big inputs (PDF / URL / TEXT /
     sample buttons). Picking one ingests and advances. This is the
     four-second-rule moment.
  3. **Ask anything** — explain local-retrieval-for-free vs BYOK for
     synthesized answers; offer "Ask a sample question" that pre-fills
     the composer. Show the citation-click promise.
  4. **(Optional) Connect a model** — link to Settings; make clear it's
     optional and keys never leave the tab. "Finish".
- On finish/skip, set the flag. Keep it re-triggerable.
- Persist a lightweight "has completed onboarding" so returning users
  skip straight to the workspace.

### 3. Chat enhancement — `src/features/workspace/chat/`
- Wider, breathing column. Message list with clear role affordance
  (user right-aligned pill or subtle avatar; assistant left, serif body
  for readability).
- **Composer**: rounded input, quick-action chips ABOVE the input as a
  horizontally-scrollable row, send button with state, disabled reasons
  surfaced inline (not as errors), Enter to send / Shift+Enter newline.
- **Citations as pills**: render `[n]` or the quoted span as a compact
  amber pill/superscript that's obviously clickable; hover shows the
  source filename; click opens the viewer. Keep exact-substring spans
  for the inline mode but style them as pill-underlines, not raw
  underlined text.
- **Empty state**: 3–4 suggested questions as clickable chips tailored
  to the active template.
- **Streaming**: a subtle typing indicator + smooth token append.
- **Sources-used footer**: compact chips `[filename · p.n]`.
- Keep the no-key extractive path and the keyed/webllm path intact.

### 4. Canvas / sources — `src/features/workspace/canvas/`
- Stronger **empty state** (when sources exist but no zones): a hint
  card explaining zones + weights with a one-click "Create a Trusted
  zone".
- **Source cards**: icon by type, filename, size, chunk count, a small
  menu (open / remove / move to zone). Hover elevation. Type-colored
  accent.
- Zones: clearer dashed containers, weight slider with a live label
  ("2.0× — dominates retrieval"), color chip, rename inline.
- Keep drag-drop + click-to-add.

### 5. Landing polish — `src/landing/`
- Tighten section rhythm and vertical spacing; consistent max-width.
- Hero: keep, but add a subtle "how it works in 3 steps" strip.
- Ensure the comparison table reads as a clear win.
- Strong final CTA with the two primary actions.
- Mobile: verify every section stacks cleanly.

## Build order (priority)
- [x] P0 Plan committed + pushed (this file)
- [x] P0 Design tokens + motion utilities in globals.css
- [x] P0 Responsive scroll-contained app shell (fixes the worst problem)
- [x] P1 Onboarding stepper (3-step: welcome / add source / recap)
- [x] P1 Chat enhancement (textarea composer, citations-as-pills,
      suggested-question empty state, streaming indicator, source chips)
- [x] P1 Canvas/source-card polish (icon tile, elevation) — zone UX
      still uses the existing weight slider; a deeper zone pass is
      optional follow-up.
- [x] P2 Landing rhythm + wedge chart legibility (tighter py, chart
      visible by default, higher-contrast quadrants)
- [x] P2 Full verification: typecheck clean, lint clean (only pre-
      existing story console warnings), 129 unit + 13 e2e green,
      production build serves the self-hosted model + CSP.

## Done in this redesign (branch redesign/ui-overhaul)
All committed and pushed. Highlights: responsive scroll-contained shell
(mobile bottom-tab), design tokens + motion, 3-step onboarding stepper,
chat composer/citation-pills/suggested-questions, source-card polish,
landing rhythm + legible wedge chart, e2e onboarding-skip fixture.

## Remaining polish opportunities (optional follow-ups)
- Deeper zone UX (weight-label copy like "2.0× dominates retrieval",
  clearer dashed containers) — currently uses the existing slider.
- Landing: per-section mobile spot-check at 375px; consider a compact
  "how it works in 3 steps" strip in/after the hero.
- Tablet (md–lg): the workspace switcher rail is desktop-only; consider
  a drawer toggle so tablet users can switch workspaces.
- A "Take the tour" affordance is in the info dialog; consider also a
  first-source celebration to reinforce the aha.

## Note on the e2e input selector change
The chat composer became a `<textarea>` (Enter sends, Shift+Enter
newline). Specs that used `input[aria-label="Ask a question"]` were
switched to `getByLabel('Ask a question')` so they match the textarea.
Do not revert to an `<input>` without updating those specs.

## Constraints (do not break)
- Strict TS, Tailwind only, SPDX headers on new files.
- Preserve all E2E selectors listed above (tests/e2e/*.spec.ts).
- Keep the trust story literally true — no new third-party origins.
- Keep the no-key extractive answer flow (the sticky moment).
- Brand voice for copy: confident, warm, no emoji, no exclamation marks.
- Every pane scrolls internally; the page body never scrolls
  horizontally.

## Verification loop
After each chunk: `pnpm typecheck && pnpm lint`, then drive the preview
in a browser (drop sample → ask → cite → click) at desktop AND mobile
widths. Run `pnpm test` and `pnpm test:e2e` before the final commit.
