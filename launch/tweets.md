# Launch tweet thread

Rules honored: no emoji, no exclamation marks, every tweet under 280 characters.

## Tweet 1

I built RAGülli: private RAG that runs entirely in your browser tab.

Drop a PDF. It's parsed, chunked, and embedded on your machine. Ask a question, get an answer that cites the exact line.

No account. No server. No telemetry.

[link]

## Tweet 2

The pipeline: PDF.js parses, a sliding window chunks, Transformers.js embeds in a Web Worker, Dexie/IndexedDB and OPFS store everything locally.

Your file never crosses the network. The CSP header makes that a property of the page, not a promise in a policy.

## Tweet 3

Citations are hyperlinks. Click any claim in an answer and the original document opens scrolled to that sentence.

If a tool can't show you where an answer came from, it's asking for trust. This one shows its work.

## Tweet 4

You don't need an API key to try it. Local retrieval mode shows you the cited passages before any model is connected.

When you want generation: bring your own key for OpenAI, Anthropic, Google, MiniMax, or Kimi — or run a WebLLM model fully in-browser and stay offline.

## Tweet 5

There's a trust panel that narrates every byte movement in plain English.

"Your file: staying in this browser tab."
"Question sent to api.anthropic.com. Files stayed here."

If data could leave the browser, the UI says so in the same view as the action that moved it.

## Tweet 6

Documents live on a spatial canvas. Group them into zones, give zones weights, and the weights propagate into retrieval.

Your "trusted sources" zone actually outranks your "background reading" zone when the answer is assembled.

## Tweet 7

Honest limits: embeddings are English-first, no OCR or audio yet, and the in-browser model is a large first download.

It's AGPL-3.0, so every claim in this thread is checkable in the source.

Try it with a sample paper, no key needed: [link]
