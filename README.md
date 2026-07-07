# RAGülli

![RAGülli](./public/og-image.png)

**Your files. Your AI. Your browser.**

Private RAG. No account. No server.

RAGülli is a browser-only private RAG tool. Drop a PDF, a DOCX, a Markdown file, or a URL. The document is parsed, chunked, embedded, and indexed entirely inside your browser tab. Ask a question; the answer cites the exact line in the original file. Nothing leaves the tab unless you have explicitly pasted a BYOK key and asked a question.

## The 7 design principles

1. **Four-second rule.** First open = dropzone + four big icons + sample files. No config. No account. No form.
2. **Trust contract.** If the user's data could leave the browser, the UI says so in the same view as the action that moved it.
3. **Zero install, zero account.** PWA. Never an email field. Never a signup form.
4. **Honest about what's missing.** No fake spinners. If the user just dropped their first file and hasn't chosen a model, the UI says so.
5. **Spatial layout actually matters.** Documents are drag-drop cards. Groups have weights. Weights propagate to retrieval.
6. **Citation is a hyperlink.** Click any claim in the answer; the source view opens at that line.
7. **Works offline after first load.** Everything except BYOK frontier calls runs offline once the embedding model is cached.

## How it works

1. **Drop a file.** PDF, DOCX, Markdown, plain text, or URL.
2. **Indexed locally.** The file is parsed with PDF.js / Mammoth / Readability, chunked with a sliding window, and embedded with a local embedding model in a Web Worker.
3. **Ask a question.** The question is embedded against the same model. The top-k chunks are retrieved with cosine similarity, weighted by the group they live in.
4. **Get an answer with citations.** The model streams an answer. Each claim carries a clickable span that opens the original file at the cited offset.

## How to run locally

```bash
pnpm install
pnpm dev          # starts the Vite dev server on http://localhost:5173
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint .
pnpm test         # vitest run
pnpm build        # builds the static site and writes it to ./dist
pnpm preview      # serves ./dist on http://localhost:4173
```

## How to deploy

```bash
pnpm build
# Push the dist/ folder to Cloudflare Pages, or wire the included
# .github/workflows/deploy.yml to deploy on every push to main.
```

The deployment target is Cloudflare Pages. The static `_headers` and `_redirects` files in `public/` set the Content-Security-Policy and the SPA fallback.

## AGPL-3.0

RAGülli is free software. It is licensed under the [GNU Affero General Public License v3.0](./LICENSE). If you fork it and run a modified version as a network service, you must publish your modifications.

[![AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](./LICENSE)

## Made with restraint. No analytics. No telemetry.
