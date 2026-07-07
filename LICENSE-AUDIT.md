# License audit

Date: 2026-07-07. Run from the repo root against the production
dependency set. Re-run before every release.

RAGülli is licensed under AGPL-3.0-only. Every dependency in the
production tree must be compatible with AGPL-3.0 distribution. The
two checks below cover (a) license compatibility and (b) known
vulnerabilities. The full security audit is in [`SECURITY.md`](./SECURITY.md).

## 1. License inventory

```
$ npx --yes license-checker --production --summary
```

Result:

```
├─ MIT: 6
├─ Apache-2.0: 5
├─ OFL-1.1: 3
├─ BSD-2-Clause: 1
└─ UNLICENSED: 1
```

Per-package detail (production deps only):

| Package | License | Notes |
| --- | --- | --- |
| `@fontsource/inter` | OFL-1.1 | Self-hosted font. |
| `@fontsource/jetbrains-mono` | OFL-1.1 | Self-hosted font. |
| `@fontsource/lora` | OFL-1.1 | Self-hosted font. |
| `@huggingface/transformers` | Apache-2.0 | In-browser embedding model. |
| `@mlc-ai/web-llm` | Apache-2.0 | Opt-in in-browser LLM. |
| `@mozilla/readability` | Apache-2.0 | URL article extraction. |
| `dexie` | Apache-2.0 | IndexedDB wrapper. |
| `mammoth` | BSD-2-Clause | DOCX parser. |
| `native-file-system-adapter` | MIT | OPFS polyfill. |
| `pdfjs-dist` | Apache-2.0 | PDF renderer. |
| `ragulli` (root) | UNLICENSED in npm, AGPL-3.0-only in `package.json` | The package itself. license-checker reports private root packages as `UNLICENSED`; the actual license is `AGPL-3.0-only` (see `LICENSE` + `package.json` + `NOTICE`). |
| `react`, `react-dom` | MIT | UI runtime. |
| `uuid` | MIT | ID generation. |
| `workbox-window` | MIT | PWA service worker registration. |
| `zustand` | MIT | State stores. |

All production licenses (MIT, Apache-2.0, BSD-2-Clause, OFL-1.1) are
permissive and compatible with AGPL-3.0 distribution. **No GPL-only
dependencies without dual-license terms.** No copyleft surprises.
No source-available or "Business Source License" packages.

Spot-check with the transitive view when needed:

```
$ pnpm licenses list --prod
```

## 2. Vulnerability scan

```
$ pnpm audit --prod
```

Result:

```
No known vulnerabilities found
```

(The tool prints a Node `url.parse()` deprecation warning from its
own internal use of the legacy URL API. It is unrelated to our
dependencies and not flagged as a CVE.)

The CI workflow runs `pnpm audit --audit-level=high` on every push
and pull request to `main`, so any future high or critical finding
fails the build before it lands.

## 3. AGPL compatibility — explicit notes

- **No GPL-only deps.** We deliberately avoid packages licensed
  under GPL-2.0-only or GPL-3.0-only that are not also offered under
  a permissive or LGPL-with-static-linking exception. The current
  tree contains zero GPL entries.
- **No SSPL / BSL / source-available deps.** We do not depend on
  Mongo, Elastic, Cockroach, MariaDB MaxScale, Sentry, etc. None of
  the production deps carry a "source available" restriction that
  would conflict with AGPL-3.0 distribution.
- **Font licenses.** OFL-1.1 fonts (Inter, Lora, JetBrains Mono) are
  bundled via `@fontsource/*` so they self-host; no Google Fonts
  CDN call leaves the tab. The trust-panel claim about not
  contacting third-party origins for files holds for fonts.
- **Model licenses.** The embedding model (Xenova/all-MiniLM-L6-v2)
  is Apache-2.0. The optional WebLLM models (Phi-3.5-mini,
  Llama-3.1-8B) are pulled from Hugging Face only when the user
  explicitly enables the in-browser LLM, and their respective
  licenses (MIT for Phi, Llama Community License for Llama) are
  surfaced in the Settings → Model panel.

## 4. How to re-run

```bash
# License inventory.
npx --yes license-checker --production

# Just the summary.
npx --yes license-checker --production --summary

# Fails on any license outside the allow-list.
npx --yes license-checker --production \
  --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;OFL-1.1;ISC;CC0-1.0;CC-BY-4.0;MPL-2.0;0BSD;Unlicense;AGPL-3.0'

# Dependency vulnerability scan.
pnpm audit --prod

# CI gating level — fails on high or critical.
pnpm audit --audit-level=high
```

Both checks are wired into `.github/workflows/deploy.yml` so they
run on every push and PR.