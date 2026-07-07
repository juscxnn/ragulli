# Security and privacy audit

Date: 2026-07-07. Run from the repo root against the production
dependency set. Re-run these checks before every release.

## 1. Dependency vulnerability scan

```
pnpm audit --prod
```

Result: **No known vulnerabilities found.**

(The command prints a Node `url.parse()` deprecation warning from the
audit tooling itself; it is unrelated to the project's dependencies.)

## 2. License inventory

```
npx --yes license-checker --production --summary
```

Result:

```
├─ MIT: 6
├─ Apache-2.0: 5
├─ OFL-1.1: 3
├─ BSD-2-Clause: 1
└─ UNLICENSED: 1
```

Notes:

- The single `UNLICENSED` entry is `ragulli@0.1.0` itself — the
  private root package. It is licensed AGPL-3.0-only (see `LICENSE`
  and the `license` field in `package.json`); license-checker reports
  private root packages this way.
- The three OFL-1.1 entries are the self-hosted `@fontsource` fonts
  (Inter, Lora, JetBrains Mono).
- `pdfjs-dist` is Apache-2.0; its license file ships in
  `node_modules/pdfjs-dist/LICENSE`.
- All licenses in the production tree (MIT, Apache-2.0, BSD-2-Clause,
  OFL-1.1) are compatible with AGPL-3.0 distribution. No GPL-only
  dependencies.
- license-checker walks the npm-style tree, so with pnpm's layout the
  summary covers the direct production dependencies rather than every
  transitive package. Full transitive licensing is governed by the
  lockfile; spot-check with `pnpm licenses list --prod` if needed.

## 3. Content-Security-Policy review

The CSP is set as a static response header in `public/_headers` and
served by Cloudflare Pages on every route. It is the mechanism that
makes the trust-panel claim — "your file is staying in this browser
tab" — a property of the page rather than a promise: the browser
refuses any network connection to an origin not on the list below, so
there is no code path by which file bytes could be exfiltrated, even
by a compromised dependency.

Key directives:

- `default-src 'self'` — nothing loads from a third-party origin by
  default.
- `script-src 'self' 'wasm-unsafe-eval'` — no inline scripts, no JS
  eval, no third-party scripts (and therefore no analytics snippets,
  ever). `'wasm-unsafe-eval'` permits WebAssembly compilation only —
  it does not enable `eval()` — and exists so the self-hosted ONNX
  Runtime binary at `/models/ort/` (staged from the installed
  `@huggingface/transformers` package at build time, served from this
  origin) can run the embedding model.
- `worker-src 'self' blob:` — same-origin workers, plus blob: workers
  built by PDF.js and Transformers.js from in-memory bundles.
- `img-src 'self' data: blob:` and `font-src 'self' data:` — images
  and fonts are self-hosted; data:/blob: cover inline SVG data URIs
  and PDF.js page bitmaps.

### connect-src allowlist

`connect-src` is the exhaustive list of origins the tab may open a
connection to. One line per origin:

| Origin | Why it is allowed |
| --- | --- |
| `'self'` | The app's own static assets, the self-hosted embedding model files, and the service worker cache. |
| `https://api.openai.com` | OpenAI BYOK — reached only when the user pastes their own key and asks a question. |
| `https://api.anthropic.com` | Anthropic BYOK, direct path; kept alongside the proxy below. |
| `https://ragulli-proxy.vercel.app` | Stateless Vercel Edge CORS proxy for Anthropic (Anthropic blocks browser CORS). It forwards the question and the user's key; it never sees files and stores nothing. |
| `https://generativelanguage.googleapis.com` | Google Gemini BYOK. |
| `https://api.minimaxi.chat` | MiniMax BYOK. |
| `https://api.moonshot.cn` | Moonshot Kimi BYOK. |
| `https://huggingface.co` | Optional model downloads (WebLLM weights, Transformers.js model files) — public model files only, GET only, no user data in the request. |
| `https://*.hf.co` | The Hugging Face CDN hosts that the above downloads redirect to — same terms: public files, GET only. |
| `https://raw.githubusercontent.com` | WebLLM model manifests fetched by @mlc-ai/web-llm — public config files only, GET only. |

The BYOK origins are reached only when the user has explicitly pasted
a key and asked a question, and what leaves is the question plus the
retrieved text snippets — never the source files. The Hugging Face and
GitHub origins exist solely so the optional in-browser models can be
downloaded; the requests carry zero user data. The core embedding
model is self-hosted same-origin, so the default ingest-and-retrieve
path works with no third-party connection at all.

Adding any new origin to `connect-src` is a trust-panel violation per
spec §4.5 and must be treated as a breaking change to the privacy
contract.

### Other headers

`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`Cross-Origin-Opener-Policy: same-origin`, and a `Permissions-Policy`
that disables camera, microphone, geolocation, and FLoC/interest
cohorts.

## 4. Manual verification steps

Repeat these before each release, in a normal (non-extension) browser
profile against the production deployment:

1. Open DevTools → Network. Load the app. Confirm every request is
   same-origin (plus, at most, the Hugging Face/GitHub model
   downloads if you trigger a model install).
2. Keep the Network tab recording. Drop a PDF. Confirm **zero**
   network requests fire during parse, chunk, embed, and index.
3. Ask a question in no-key local retrieval mode. Confirm zero
   requests.
4. Paste a BYOK key and ask a question. Confirm exactly one request
   leaves, to the expected provider origin, and inspect its payload:
   the question and retrieved snippets, never file bytes.
5. In the Console, run a fetch to an origin not on the allowlist
   (for example `fetch('https://example.com')`) and confirm the CSP
   blocks it.
6. Go offline (DevTools → Network → Offline). Drop another file and
   run a local-retrieval question. Both must still work.
7. Click "Clear all my data," then check DevTools → Application:
   IndexedDB and OPFS must be empty.
