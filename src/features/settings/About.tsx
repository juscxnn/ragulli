// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// About settings tab. Version (read from package.json), license,
// GitHub link, the "no analytics, no telemetry" pledge, and a link
// to the docs. This is the page users land on when they ask
// "what is this thing?" — keep the copy short and direct.

import { useMemo, type FC } from 'react';

const PKG_VERSION = import.meta.env?.MODE === 'test' ? '0.0.0-test' : '0.1.0';
const REPO_URL = 'https://github.com/juscxnn/ragulli';
const PRIVACY_URL = '/privacy';

interface BuildInfo {
  version: string;
}

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
          RAGülli does not embed analytics, telemetry, tracking pixels, or third-party
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
