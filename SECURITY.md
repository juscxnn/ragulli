# Security and privacy audit

Date: 2026-07-07. Run from the repo root against the production
dependency set. Re-run these checks before every release.

This is the master security document for RAGülli. It records the
threat model, the line-by-line `connect-src` justification, the
edge-function audit, the BYOK key audit, the storage audit, and the
trust-panel claim verification. The dependency vulnerability scan
and the license inventory live in `LICENSE-AUDIT.md`.

## 1. Threat model

### What RAGülli protects

- **The user's files.** Every byte of every dropped document
  stays in the browser tab. The parse, chunk, embed, and index
  steps run entirely client-side; the only network egress is the
  BYOK model call the user explicitly invokes.
- **The user's question content** when no BYOK key is configured.
  In the no-key mode the chat panel composes an extractive answer
  from the locally-retrieved passages and writes the answer into
  the local chat history. No request leaves the tab.
- **The user's BYOK key.** Stored in `localStorage` as an AES-GCM
  ciphertext; the AES key is derived from a 256-bit random secret
  in `sessionStorage` that dies when the tab closes. The cleartext
  key is in memory only and never touches disk.

### What RAGülli does NOT protect

- **BYOK model calls.** When the user invokes a frontier model
  with their own key, the question and the retrieved text
  snippets travel to the provider. This is by design — the user
  opted in. The trust panel narrates the destination in plain
  English before the call fires, and the call lands on an origin
  the user explicitly approved (the BYOK provider or the stateless
  Vercel Edge proxy for Anthropic).
- **An attacker with code execution in the tab.** The per-tab
  secret in `sessionStorage` is reachable from any script in the
  same origin. AES-GCM at rest is honest-at-rest defense, not
  real secrecy. The design raises the bar against accidental
  copy-paste, browser sync, and cached disk images.
- **Network egress during the embedding model download.** The
  embedding model is self-hosted at `/models/`, so the default
  ingest path has zero third-party dependencies. The optional
  Hugging Face and GitHub allow-list entries exist only for the
  opt-in WebLLM model; the requests carry zero user data.

## 2. Content-Security-Policy review

The CSP is set as a static response header in `public/_headers`
and served by Cloudflare Pages on every route. It is the
mechanism that makes the trust-panel claim — "your file is staying
in this browser tab" — a property of the page rather than a
promise: the browser refuses any network connection to an origin
not on the list below, so there is no code path by which file
bytes could be exfiltrated, even by a compromised dependency.

Key directives:

- `default-src 'self'` — nothing loads from a third-party origin by
  default.
- `script-src 'self' 'wasm-unsafe-eval'` — no inline scripts, no
  JS eval, no third-party scripts (and therefore no analytics
  snippets, ever). `'wasm-unsafe-eval'` permits WebAssembly
  compilation ONLY (it does not allow JS eval): the embedding
  model runs on the self-hosted ONNX Runtime WASM binary served
  from `/models/ort/` on this origin.
- `worker-src 'self' blob:` — same-origin workers, plus blob:
  workers built by PDF.js and Transformers.js from in-memory
  bundles.
- `img-src 'self' data: blob:` and `font-src 'self' data:` —
  images and fonts are self-hosted; `data:`/`blob:` cover inline
  SVG data URIs and PDF.js page bitmaps.

### connect-src allowlist

`connect-src` is the exhaustive list of origins the tab may open
a connection to. One line per origin:

| Origin | Why it is allowed |
| --- | --- |
| `'self'` | The app's own static assets, the self-hosted embedding model files at `/models/`, the service worker cache, and the in-browser PWA shell. |
| `https://api.openai.com` | OpenAI BYOK — reached only when the user pastes their own key and asks a question. |
| `https://api.anthropic.com` | Anthropic BYOK, direct path; kept alongside the proxy below. |
| `https://ragulli-proxy.vercel.app` | Stateless Vercel Edge CORS proxy for Anthropic (Anthropic blocks browser CORS). It forwards the question and the user's key; it never sees files and stores nothing. |
| `https://generativelanguage.googleapis.com` | Google Gemini BYOK. |
| `https://api.minimaxi.chat` | MiniMax / M2 BYOK. |
| `https://api.moonshot.cn` | Moonshot Kimi BYOK. |
| `https://huggingface.co` | transformers.js / WebLLM model weights download — not the user's files; only model weights. |
| `https://cdn-lfs.huggingface.co` | transformers.js / WebLLM model weights download — not the user's files; only model weights. |
| `https://*.huggingface.co` | transformers.js / WebLLM weight shards — not the user's files; only model weights. |
| `https://*.hf.co` | transformers.js / WebLLM model weights download — not the user's files; only model weights. |
| `https://raw.githubusercontent.com` | WebLLM public model manifest fetch — not the user's files; only model config. |

The BYOK origins are reached only when the user has explicitly
pasted a key and asked a question, and what leaves is the question
plus the retrieved text snippets — never the source files. The
Hugging Face and GitHub origins exist solely so the optional
in-browser models can be downloaded; the requests carry zero user
data. The core embedding model is self-hosted same-origin, so the
default ingest-and-retrieve path works with no third-party
connection at all.

Adding any new origin to `connect-src` is a trust-panel violation
per spec §4.5 and must be treated as a breaking change to the
privacy contract. The full table is mirrored in
`src/features/settings/About.tsx` so the Settings → Advanced tab
shows the user the same list.

### Other headers

`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`Cross-Origin-Opener-Policy: same-origin`, and a `Permissions-Policy`
that disables camera, microphone, geolocation, and FLoC/interest
cohorts.

## 3. Edge function audit

`api/anthropic.ts` is the only server-side component in V1. The
intent (spec §4.6) is "stateless, no logs, no persistence."

Grep for any line that could leak:

```
$ grep -nE 'console\.(log|info|debug|warn|error)|fs\.|writeFile|appendFile|localStorage|sessionStorage|indexedDB|cookies|setHeader' api/anthropic.ts
api/anthropic.ts:144:        const contentType = upstream.headers.get('content-type');
api/anthropic.ts:145:        if (contentType) headers.set('content-type', contentType);
```

The only matches are:

- `upstream.headers.get('content-type')` — a read from the
  upstream response, not a write.
- `headers.set('content-type', ...)` — passes the content-type
  through to the browser; nothing else from the upstream is
  copied.

The handler never calls `console.*` with anything that includes the
body, headers, or query string. It never reads or writes any
browser storage API. The body is piped through with `return new
Response(upstream.body, ...)` so Anthropic's stream goes straight to
the browser without buffering. The unit test
`tests/unit/anthropic-edge.test.ts` enforces these properties
programmatically (no `console.*` calls, no `localStorage`/`sessionStorage`/
`indexedDB`/`cookies` references).

## 4. BYOK key audit

`src/features/llm/keys.ts` + `src/lib/crypto.ts`:

- `setKey(provider, value)` calls `encryptSecret(value)` which
  derives an AES-GCM key from a 256-bit secret via HKDF and
  encrypts the key with a fresh random IV. The ciphertext
  (`${ivBase64}.${ciphertextBase64}`) lands in `localStorage` under
  `ragulli:keys:v1:<provider>`.
- `getKey(provider)` reverses the operation; on a stale ciphertext
  (the per-tab secret is gone) it returns `null` and clears the
  orphan entry.
- `clearAll()` removes every `ragulli:keys:v1:*` entry and wipes
  the per-tab secret in `sessionStorage`. Triggered by the
  DangerZone "Clear all my data" button.

Plaintext keys never touch disk. The only place the cleartext lives
is in the in-memory `crypto.subtle` runtime and the React state of
the chat panel for the duration of one model call. The unit test
`tests/unit/llm-keys.test.ts` walks this lifecycle, asserts the
plaintext never appears in `localStorage` after `setKey`, and
verifies the ciphertext decrypts cleanly until the per-tab secret
is wiped.

The Settings → Model UI masks the input (`type="password"`), shows
the masked value regardless of length, and only displays the
cleartext at edit time. The Settings → Advanced panel enumerates
every `connect-src` entry, including the BYOK endpoints, so the
user can see at a glance which providers' origins the key will
ever travel to.

## 5. Storage audit

The Danger Zone "Clear all my data" button holds for one second
before wiping:

- IndexedDB `ragulli` — every table (`sources`, `chunks`, `zones`,
  `citations`, `workspaces`, `chats`) is cleared via Dexie.
- IndexedDB `ragulli-trust-log` — the dedicated trust log database
  is cleared so a fresh install does not inherit the previous
  session's activity history.
- OPFS — every entry under `navigator.storage.getDirectory()` is
  removed, including the original-file bytes stored under
  `ragulli-files/`.
- `localStorage` — every key with the `ragulli:` prefix is wiped,
  except version keys under `ragulli:version:`.
- `sessionStorage` — the per-tab secret under
  `ragulli:tab-secret:v1` is removed.

After the wipe completes, the page reloads. The bootstrap creates a
single fresh "Untitled workspace" so the chat panel can mount. The
Playwright test `tests/e2e/clear-all-data.spec.ts` walks this path
and asserts every store is empty (or, for `workspaces`, contains
exactly the bootstrap row — never the seeded workspace).

## 6. Trust panel claim verification

The trust panel claim is "if your data could leave the browser, the
UI says so in the same view as the action that moved it." The
runtime check is the Playwright test
`tests/e2e/trust-panel.spec.ts`, which:

1. Drops the sample PDF and waits for the trust log to record the
   ingest.
2. Records every outbound request via `page.on('request', ...)`.
3. Asserts every URL is either `'self'` (localhost / 127.0.0.1 on
   the preview port) or a host on the allow-list:
   `api.openai.com`, `api.anthropic.com`,
   `generativelanguage.googleapis.com`, `api.minimaxi.chat`,
   `api.moonshot.cn`, `ragulli-proxy.vercel.app`, `huggingface.co`,
   `cdn-lfs.huggingface.co`.
4. Fails the test if any host is not on the list.

The companion test `tests/e2e/offline-ingest.spec.ts` takes this
further: it installs a Playwright `context.route` handler that
**aborts every non-`self` request** before the first page load, then
drops the sample PDF and confirms:

- The Source row lands in IndexedDB (parse + OPFS write succeed).
- At least one Chunk row lands (the embed model loads from the
  self-hosted `/models/` path).
- Zero requests fired outside `localhost:4173` — the abort is the
  proof that the tab cannot phone home.

This is the canonical "open the network panel in DevTools, drop a
file, and watch only the allow-listed origins get hit" check,
automated so it cannot drift.

## 7. Vulnerability scan (summary)

The full `pnpm audit` output is in `LICENSE-AUDIT.md`. Headline:
no known high or critical vulnerabilities in the production
dependency tree at the time of the last release. The CI workflow
runs `pnpm audit --audit-level=high` on every push and PR so any
new high/critical finding blocks deploy.

## 8. Limitations (honest list)

- The embedding model is English-first. Retrieval quality drops on
  other languages.
- No OCR. Scanned PDFs come out empty.
- No audio transcription.
- The WebLLM in-browser LLM path needs WebGPU and the first model
  download is multiple GB. Slow, not small.
- The per-tab AES-GCM design is honest-at-rest defense, not real
  secrecy. Anyone with code execution in the tab can recover the
  plaintext key.
- Very large corpora will eventually hit the flat-cosine-scan wall;
  there is no ANN index yet. (Adding one is a future-version task.)