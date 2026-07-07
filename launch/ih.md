# Indie Hackers post

## Title

I built RAGülli because I'm tired of uploading every PDF I read to someone else's server

## Body

Last year I counted the number of documents I fed to "chat with your PDF" tools: contracts I hadn't signed yet, a lease, medical letters, unpublished drafts from friends. Every one of them went to somebody's backend first. Every tool made the same trade — convenience now, custody never.

The strange part is that the trade is no longer necessary. Browsers got good. WebAssembly runs transformer models, OPFS gives you a real local file system, IndexedDB holds vector indexes, WebGPU runs a small LLM. The pieces for a fully client-side RAG tool have existed for a while; nobody had assembled them into something a non-engineer would actually enjoy using.

So I built RAGülli. You drop a PDF, DOCX, Markdown file, or URL. It gets parsed, chunked, and embedded entirely inside the browser tab — the embedding model runs in a Web Worker, storage is IndexedDB and OPFS on your machine. You ask a question and the answer cites the exact line in the original file; every citation is a clickable link that opens the source at that spot.

The positioning wedge became obvious once I mapped the market. Every existing option is either engineer-grade (self-hosted RAG repos you need a weekend and a GPU to stand up) or hosted-and-polished (NotebookLM, Humata, ChatPDF — all of which upload your files). Polished and browser-only was an empty square. The architecture is also the moat: a hosted competitor cannot copy the trust story without giving up their backend, their accounts, and their data flywheel.

A few decisions that mattered:

**Make the privacy claim enforceable, not aspirational.** The Content-Security-Policy header allows connections only to the BYOK model endpoints. There is no analytics origin because there are no analytics. A trust panel in the UI narrates every byte movement in plain English, and you can verify it with the network tab open.

**Don't gate the first experience on a key.** A no-key local retrieval mode shows cited passages before any model is connected. When you want generation, you bring your own OpenAI, Anthropic, Google, MiniMax, or Kimi key — or download a WebLLM model and run everything, including the LLM, in the tab.

**Open source as a business argument, not a virtue signal.** It's AGPL-3.0. For a product whose pitch is "verify the claims yourself," closed source would be self-defeating, and copyleft means forks that run as services must publish their changes too.

What I'm honest about: embeddings are English-first, there's no OCR or audio transcription yet, and the in-browser model is a heavy first download. There's no revenue yet either — the current plan is to keep the core free forever and explore paid team features that still never touch the files.

If you read PDFs you'd rather keep to yourself, try it — there's a sample paper preloaded and you don't need an account or a key. I'd genuinely like to know where it falls short.

[link]
