# Product Hunt launch — RAGülli

## Name

RAGülli

## Tagline

Private RAG in your browser. No account, no server.

## Description

Drop a PDF, DOCX, Markdown file, or URL. RAGülli parses, chunks, and embeds it entirely inside your browser tab — PDF.js and Transformers.js in a Web Worker, stored in IndexedDB and OPFS. Ask a question and every claim in the answer links to the exact line in the original file. Bring your own key for OpenAI, Anthropic, Google, MiniMax, or Kimi, or run a model fully in-browser with WebLLM. Works offline after first load. No signup, no telemetry, AGPL-3.0 open source.

## First maker comment

Hi Product Hunt.

I built RAGülli because I read a lot of PDFs I'm not comfortable uploading anywhere — contracts, medical letters, half-finished research. Every "chat with your PDF" tool asks me to hand the file to a server first, and I kept declining.

So this one doesn't have a server. The whole pipeline — parsing, chunking, embedding, retrieval — runs inside the browser tab. The file goes into IndexedDB and OPFS on your machine and stays there. The Content-Security-Policy header enforces this: the page literally cannot phone home, because there is no home.

A few things I care about:

Citations are hyperlinks. Click any claim in an answer and the source opens scrolled to that exact line. If the model can't back a sentence with a passage, you can see that too.

You don't need a key to try it. There's a local retrieval mode that shows you the cited passages before any model is connected. When you're ready, paste your own OpenAI, Anthropic, Google, MiniMax, or Kimi key — or download a WebLLM model and stay fully offline.

There's a trust panel in the corner that narrates every byte movement in plain English: "your file: staying in this browser tab." When you do ask a BYOK model a question, it tells you exactly what left (the question and the retrieved snippets — never the files).

Honest limitations: the embedding model is English-first, there's no OCR or audio yet, and the in-browser model is a large first download. The code is AGPL-3.0 if you want to check any of the claims yourself.

I'd love to hear what breaks, and what you'd want it to read next.

## Gallery shots to capture

**Lead image (1280×640).** The app open with one document indexed, cropped so the trust panel is prominent on the right showing "your file: staying in this browser tab — embedded: local browser." Overlay the tagline "Your files. Your AI. Your browser." in the Lora serif on the deep forest teal, left third of the frame. Light theme, 1280×640 exactly.

**Shot 1 — first-open hero.** A fresh browser tab at the app root: the dropzone, the four big file-type icons (PDF, DOCX, Markdown, URL), and the sample-file chips below. No file dropped yet. Capture at desktop width (1280+) so the four-second-rule layout reads instantly. Nothing else on screen — no dialogs, no dev tools.

**Shot 2 — sources canvas with zones.** The spatial canvas with five document cards arranged into two named zones — three cards in a zone labelled "trusted" with a visibly higher weight, two in "background." Drag one card mid-hover if possible so the affordance is visible. Zone weight controls should be readable.

**Shot 3 — chat with a clicked citation.** Split view: an answer on the left with inline citation spans, one citation clicked, and the source pane on the right open at the cited line with the sentence highlighted and scrolled into view. Choose a question with a crisp factual answer from the sample research paper.

**Shot 4 — trust panel close-up.** Tight crop of the trust panel mid-session: the file-ingest entry ("parsed and embedded in this tab"), a model-call entry showing the destination ("question sent to api.anthropic.com via proxy — files stayed here"), and the answer-return entry. This is the screenshot that carries the whole pitch; make the plain-English log lines legible at gallery size.
