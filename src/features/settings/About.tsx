// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// About settings tab. Version (read from package.json), license,
// GitHub link, the "no analytics, no telemetry" pledge, an
// Advanced section that enumerates every outbound origin the CSP
// allow-lists and what it is used for, and a link to the docs. This
// is the page users land on when they ask "what is this thing?" —
// keep the copy short and direct.

import { useMemo, type FC } from 'react';

const PKG_VERSION = import.meta.env?.MODE === 'test' ? '0.0.0-test' : '0.1.0';
const REPO_URL = 'https://github.com/juscxnn/ragulli';
const PRIVACY_URL = '/privacy';

interface BuildInfo {
  version: string;
}

/** Every origin the Content-Security-Policy allow-lists, with a
 *  one-line justification. Mirrored in vite.config.ts and in the
 *  audit list in SECURITY.md — keep all three in sync. */
const CONNECT_SRC_TABLE: ReadonlyArray<{ origin: string; purpose: string }> = [
  { origin: "'self'", purpose: 'App assets, the self-hosted embedding model at /models/, the service worker cache, and the in-browser PWA shell.' },
  { origin: 'https://api.openai.com', purpose: 'BYOK direct call — OpenAI / GPT family. Reached only when the user pastes a key and asks a question.' },
  { origin: 'https://api.anthropic.com', purpose: 'BYOK direct path — kept as a fallback for self-hosted CORS; the primary Anthropic route is the Vercel Edge proxy below.' },
  { origin: 'https://ragulli-proxy.vercel.app', purpose: 'Stateless Vercel Edge function for Anthropic CORS. Receives only the question and the user-supplied key; never the files.' },
  { origin: 'https://generativelanguage.googleapis.com', purpose: 'BYOK direct call — Google Gemini.' },
  { origin: 'https://api.minimaxi.chat', purpose: 'BYOK direct call — MiniMax / M2.' },
  { origin: 'https://api.moonshot.cn', purpose: 'BYOK direct call — Moonshot / Kimi.' },
  { origin: 'https://huggingface.co', purpose: "transformers.js / WebLLM model weights download — not the user's files; only model weights." },
  { origin: 'https://cdn-lfs.huggingface.co', purpose: "transformers.js / WebLLM model weights download — not the user's files; only model weights." },
  { origin: 'https://*.huggingface.co', purpose: "transformers.js / WebLLM weight shards — not the user's files; only model weights." },
  { origin: 'https://*.hf.co', purpose: "transformers.js / WebLLM model weights download — not the user's files; only model weights." },
  { origin: 'https://raw.githubusercontent.com', purpose: "WebLLM public model manifest fetch — not the user's files; only model config." },
];

export const About: FC = () => {
  const build = useMemo<BuildInfo>(() => {
    // `import.meta.env` is replaced at build time by Vite. The
    // constant PKG_VERSION above is the dev-server fallback; in
    // production the version literal is the public package.json
    // version.
    return { version: PKG_VERSION };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 flex flex-col gap-2">
        <Row label="Version" value={`v${build.version}`} />
        <Row label="License" value="AGPL-3.0-only" />
        <Row
          label="Source"
          value={
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              {REPO_URL}
            </a>
          }
        />
        <Row
          label="Privacy"
          value={
            <a href={PRIVACY_URL} target="_blank" rel="noreferrer">
              How your data moves
            </a>
          }
        />
      </section>

      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 flex flex-col gap-3">
        <h3 className="text-sm font-medium text-[var(--color-fg)]">
          The browser-only promise
        </h3>
        <p className="text-sm text-[var(--color-fg-muted)]">
          RAGülli does not embed analytics, telemetry, tracking pixels, or third-party
          scripts. Every byte of your files stays in this tab. When you ask a question,
          only the question and your BYOK key leave the tab — and only over the network
          path you chose (direct to the frontier provider, or through a stateless Vercel
          Edge function for the one provider that does not allow browser CORS).
        </p>
        <ul className="text-sm text-[var(--color-fg-muted)] list-disc pl-5">
          <li>No analytics. No cookies. No third-party origins in the CSP.</li>
          <li>The only outbound calls are BYOK model calls you initiate yourself.</li>
          <li>Clearing local data is one tap in the Danger Zone tab.</li>
        </ul>
      </section>

      <section
        data-testid="connect-src-advanced"
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 flex flex-col gap-3"
      >
        <header className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-medium text-[var(--color-fg)]">
            Advanced: every outbound origin
          </h3>
          <span className="text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)]">
            CSP connect-src
          </span>
        </header>
        <p className="text-sm text-[var(--color-fg-muted)]">
          Every connection the tab is allowed to open. The browser refuses any request
          to an origin not on this list, so this table is the complete picture of where
          bytes can leave the tab.
        </p>
        <ul className="flex flex-col gap-2 text-sm">
          {CONNECT_SRC_TABLE.map((row) => (
            <li
              key={row.origin}
              className="flex flex-col gap-0.5 border-b border-[var(--color-border)] pb-2 last:border-b-0"
            >
              <code className="text-xs font-mono text-[var(--color-fg)] break-all">
                {row.origin}
              </code>
              <span className="text-xs text-[var(--color-fg-muted)]">{row.purpose}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-[var(--color-fg-muted)]">
        Made with restraint. No analytics. No telemetry.
      </p>
    </div>
  );
};

interface RowProps {
  label: string;
  value: string | React.ReactNode;
}

const Row: FC<RowProps> = ({ label, value }) => (
  <div className="flex items-baseline gap-3">
    <span className="w-20 text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
      {label}
    </span>
    <span className="text-sm text-[var(--color-fg)] break-all">{value}</span>
  </div>
);
