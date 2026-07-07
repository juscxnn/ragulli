# Show HN post

## Title

Show HN: RAGülli – private RAG in your browser, no account, no server

## Body

I read a lot of documents I don't want to upload anywhere, so I built a RAG tool where the entire pipeline runs in the browser tab.

How it works: drop a PDF/DOCX/Markdown/text file or a URL. Parsing is PDF.js / Mammoth / Readability. Chunking is a token-aware sliding window. Embeddings are Transformers.js running all-MiniLM-L6-v2 (quantized, ~23 MB, self-hosted from the same origin — the CSP doesn't need a Hugging Face exception for it) in a Web Worker. Vectors and chunk metadata go into IndexedDB via Dexie; original file bytes go into OPFS. Retrieval is cosine similarity over the local vectors, weighted by user-defined document groups. Every sentence in an answer carries a citation that opens the source file at the exact character offset.

The privacy claim is enforced rather than promised: the Content-Security-Policy header sets default-src 'self' and an explicit connect-src allowlist, so the page cannot talk to any origin that isn't a BYOK model endpoint you invoke deliberately (plus Hugging Face, GET-only, for optional model downloads). There is no backend, no account, no telemetry. You can verify it with the network tab open while you drop a file — nothing fires.

For generation you have three options: a no-key local retrieval mode that just shows the cited passages; BYOK for OpenAI/Anthropic/Google/MiniMax/Kimi (Anthropic doesn't allow browser CORS calls, so those go through a stateless Vercel Edge proxy that sees only your question and key, never your files — the code for that function is in the repo); or WebLLM running Phi-3.5-mini fully in-browser over WebGPU. After first load, everything except BYOK calls works offline.

I picked AGPL-3.0 deliberately. The product's whole argument is "you can check the claims," and copyleft keeps that true for forks too — if someone runs a modified version as a service, users get the source.

Honest limitations: the embedding model is English-first, so retrieval quality drops on other languages. No OCR, so scanned PDFs come out empty. No audio. The WebLLM path needs WebGPU and the first model download is multiple GB, which is slow and not small. Very large corpora will eventually hit the flat-cosine-scan wall; there's no ANN index yet.

Repo: https://github.com/juscxnn/ragulli
App: [link — fill in the deployed Cloudflare Pages URL]

Happy to answer questions about OPFS quirks, running transformer inference in a worker, or the CSP setup.
