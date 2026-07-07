# RAGülli

![RAGülli](./public/og-image.png)

**Your files. Your AI. Your browser.**

Private RAG. No account. No server.

RAGülli is a browser-only private RAG tool. Drop a PDF, a DOCX, a Markdown file, or a URL. The document is parsed, chunked, and embedded entirely inside your browser tab. Ask a question and the answer cites the exact line in the original file. Nothing leaves the tab unless you explicitly paste a BYOK key and ask a question.

## The 7 design principles

1. **Four-second rule.** First open is a dropzone, four big icons, and a few sample files. No config, no account, no form.
2. **Trust contract.** If the user's data could leave the browser, the UI says so in plain English in the same view as the action that moved it.
3. **Zero install, zero account.** A PWA. No email field. No signup form.
4. **Honest about what's missing.** No fake spinners. If the user just dropped their first file and hasn't chosen a model, the UI says so.
5. **Spatial layout actually matters.** Documents are drag-drop cards. Groups have weights. Weights propagate to retrieval.
6. **Citation is a hyperlink.** Click any claim in an answer and the source view opens at that line.
7. **Works offline after first load.** Everything except BYOK frontier calls works offline once the embedding model is cached.

## How it works

1. **Drop a file.** PDF, DOCX, Markdown, plain text, or URL.
2. **Indexed locally.** The file is parsed with PDF.js / Mammoth / Readability, chunked with a sliding window, and embedded with a local model (all-MiniLM-L6-v2 via Transformers.js, served from this origin in a Web Worker).
3. **Ask a question.** The question is embedded against the same model. The top-k chunks are retrieved with cosine similarity, weighted by the group they live in.
4. **Get an answer with citations.** The model streams an answer. Each claim carries a clickable span that opens the original file at the cited offset.

## Trust panel in detail

This is the product story. The active state below is what a user sees during a real session — every byte movement in plain English, in the same view as the action that caused it.

```
┌─ what's happening now ──────────────────────┐
│                                             │
│  your file "research-paper.pdf"             │
│  • parsed:  local browser (PDF.js)          │
│  • chunked: local browser                   │
│  • embedded: local browser (MiniLM)         │
│  • sent to:  NOT SENT to anywhere yet       │
│                                             │
│  your question "what are the risks"         │
│  • sent to:  Anthropic · claude-sonnet-4    │
│  • (anthropic only: passed through          │
│     stateless Edge function for CORS)       │
│  • response: streaming in this tab          │
│                                             │
│  embedding model is downloaded once         │
│  from huggingface.co, then cached on this   │
│  site for offline use                       │
└─────────────────────────────────────────────┘
```

The compact state below is what the user sees when nothing is in flight. A small chip in the bottom-right; hover to expand; click to pin.

```
┌─ last 4 actions ────────────────────────┐
│  embedded 4 files · asked 1 question    │
│  last Q went to: Anthropic · sonnet-4   │
│  nothing uploaded to a server           │
└─────────────────────────────────────────┘
```

The trust claim is enforced, not promised. The Content-Security-Policy header sets `default-src 'self'` and an explicit `connect-src` allow-list; the page literally cannot phone home to any origin that isn't a BYOK model endpoint the user invokes deliberately, or the optional Hugging Face / GitHub origins used for the opt-in in-browser model. There is no analytics origin in the CSP because there is no analytics.

## How to run locally

```bash
git clone https://github.com/juscxnn/ragulli
cd ragulli
pnpm install
pnpm fetch:model   # one-time: downloads the self-hosted embedding model into public/models/
pnpm dev           # open http://localhost:5173/app/ and drop a file
```

The embedding model (~23 MB) is not committed to the repo. `pnpm fetch:model` downloads it once from Hugging Face at build time and serves it from your own origin. Skipping it makes local embedding fail with a 404. `pnpm build` runs this step automatically.

## How to deploy to Cloudflare Pages

Three commands:

1. Connect this repository to Cloudflare Pages.
2. Set the build command to `pnpm build`.
3. Set the output directory to `dist`.

The included `.github/workflows/deploy.yml` also deploys on every push to `main`, so once the Cloudflare API token and account ID are set as repository secrets, the pipeline runs end-to-end (typecheck → lint → test → Playwright e2e → audit → build → deploy).

## How to add a starter template

It is one PR away. Templates are plain data — they live in [`src/features/templates/templates.json`](./src/features/templates/templates.json). Append an object to the array and open the pull request:

```jsonc
{
  "id": "meeting-notes",
  "name": "Meeting notes",
  "icon": "mic",
  "description": "One sentence saying what this template is for.",
  "ingestDefaults": {
    "chunkSize": 600,
    "chunkOverlap": 80,
    "ocr": false
  },
  "defaultPrompt": "The system prompt the model starts with.",
  "quickActions": [
    { "label": "Summarize", "prompt": "The prompt this button sends." }
  ]
}
```

Keep the description to one sentence and the quick-actions to four or fewer. Match the copy voice of the existing six templates: confident, warm, no emoji, no exclamation marks.

## Self-host

Cloudflare Pages is the recommended host. After connecting the repo:

- Build command: `pnpm build`
- Output directory: `dist`
- Compatibility flags: none required
- Environment variables: none required for V1 (BYOK keys are pasted by the user at runtime, never stored on a server)

For a one-shot manual deploy from your own machine:

```bash
pnpm build
npx wrangler pages deploy dist --project-name ragulli
```

The static `_headers` file in `public/` sets the Content-Security-Policy, X-Frame-Options, Referrer-Policy, and Permissions-Policy. Cloudflare Pages picks it up automatically.

## Security and privacy

- The full threat model, the `connect-src` audit, the BYOK key audit, and the storage audit are in [`SECURITY.md`](./SECURITY.md).
- The dependency vulnerability scan and the license inventory are in [`LICENSE-AUDIT.md`](./LICENSE-AUDIT.md).
- The trust-panel claim is verified by `tests/e2e/trust-panel.spec.ts` and `tests/e2e/offline-ingest.spec.ts`. Both run on every push.

## AGPL-3.0

RAGülli is free software. It is licensed under the [GNU Affero General Public License v3.0](./LICENSE). If you fork it and run a modified version as a network service, you must publish your modifications. See [NOTICE](./NOTICE) for the copyright notice and third-party license summary.

[![AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](./LICENSE)

## Made with restraint. No analytics. No telemetry.