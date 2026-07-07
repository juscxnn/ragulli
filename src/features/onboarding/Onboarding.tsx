// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Onboarding — a short, functional stepper shown on first visit (and
// re-openable from the "?" info dialog). It gets the user to the "aha"
// fast: understand the promise, add a first source (a sample ingests
// on click and advances), then a one-screen recap of how answers +
// citations work with an optional pointer to connect a model. The
// trust story is front and center; nothing here sends data anywhere.

import { useState, type FC, type ReactNode } from 'react';
import {
  BookIcon,
  ContractIcon,
  ChapterIcon,
  ArticleIcon,
  ShieldIcon,
  SparkleIcon,
  ArrowRightIcon,
  CloseIcon,
  type PdfIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/Button';

export type OnboardingSampleId = 'paper' | 'contract' | 'chapter' | 'article';

export type OnboardingProps = {
  open: boolean;
  /** Called on finish or skip. Persists the "seen" flag in the caller. */
  onClose: () => void;
  /** Ingest a sample and advance to the recap step. */
  onPickSample: (id: OnboardingSampleId) => void;
  /** Open the Settings dialog (to connect a model). */
  onOpenSettings: () => void;
};

const STORAGE_KEY = 'ragulli:onboarded:v1';

/** Whether the first-run onboarding should auto-open. */
export function shouldShowOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === null;
  } catch {
    return false;
  }
}

/** Persist that onboarding has been completed or skipped. */
export function markOnboarded(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

type Sample = {
  id: OnboardingSampleId;
  label: string;
  hint: string;
  Icon: typeof PdfIcon;
};

const SAMPLES: Sample[] = [
  { id: 'paper', label: 'Research paper', hint: '2 pages · abstract + sections', Icon: BookIcon },
  { id: 'contract', label: 'Contract', hint: '5 clauses · consulting agreement', Icon: ContractIcon },
  { id: 'chapter', label: 'Book chapter', hint: 'Markdown · ~500 words', Icon: ChapterIcon },
  { id: 'article', label: 'Article', hint: 'HTML · headings + body', Icon: ArticleIcon },
];

const STEP_COUNT = 3;

export const Onboarding: FC<OnboardingProps> = ({
  open,
  onClose,
  onPickSample,
  onOpenSettings,
}) => {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const finish = (): void => {
    markOnboarded();
    onClose();
  };

  const pick = (id: OnboardingSampleId): void => {
    onPickSample(id);
    setStep(2);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to RAGülli"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-bg)]/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-[var(--shadow-pop)] animate-pop">
        {/* Skip / close */}
        <button
          type="button"
          onClick={finish}
          aria-label="Skip onboarding"
          className="absolute top-3 right-3 inline-flex items-center justify-center h-8 w-8 rounded-lg text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-2)] transition-colors"
        >
          <CloseIcon size={16} />
        </button>

        {/* Progress */}
        <div className="flex items-center gap-1.5 px-6 pt-6">
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
              }`}
            />
          ))}
        </div>

        <div className="px-6 py-6 min-h-[19rem] flex flex-col">
          {step === 0 ? <StepWelcome /> : null}
          {step === 1 ? <StepAddSource onPick={pick} /> : null}
          {step === 2 ? <StepRecap onOpenSettings={onOpenSettings} /> : null}

          <div className="mt-auto pt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={step === 0 ? finish : () => setStep((s) => Math.max(0, s - 1))}
              className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
            >
              {step === 0 ? 'Skip' : 'Back'}
            </button>
            {step === 0 ? (
              <Button variant="primary" size="md" onClick={() => setStep(1)}>
                Get started
                <ArrowRightIcon size={16} />
              </Button>
            ) : step === 1 ? (
              <span className="text-xs text-[var(--color-fg-muted)]">
                Pick one to continue, or drop your own file after.
              </span>
            ) : (
              <Button variant="primary" size="md" onClick={finish}>
                Start using RAGülli
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StepWelcome: FC = () => (
  <div className="flex flex-col gap-5 animate-fade-in">
    <div className="flex flex-col gap-2">
      <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--color-accent)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" aria-hidden />
        Welcome
      </p>
      <h2 className="font-serif text-2xl text-[var(--color-fg)] leading-tight">
        Private RAG, entirely in your browser
      </h2>
      <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">
        Drop your documents, ask questions, and get answers that cite the exact line.
        Your files are parsed, embedded, and searched inside this tab — they never
        touch a server.
      </p>
    </div>
    <ul className="flex flex-col gap-2.5">
      <Promise icon={<ShieldIcon size={18} />} title="No account, no server">
        Nothing to sign up for. No backend to trust.
      </Promise>
      <Promise icon={<SparkleIcon size={18} />} title="Answers cite the line">
        Every claim links back to the exact place in your source.
      </Promise>
      <Promise icon={<ShieldIcon size={18} />} title="Works offline">
        After the first load, indexing runs with no network at all.
      </Promise>
    </ul>
  </div>
);

const Promise: FC<{ icon: ReactNode; title: string; children: ReactNode }> = ({
  icon,
  title,
  children,
}) => (
  <li className="flex items-start gap-3">
    <span className="mt-0.5 shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
      {icon}
    </span>
    <div className="min-w-0">
      <p className="text-sm font-medium text-[var(--color-fg)]">{title}</p>
      <p className="text-xs text-[var(--color-fg-muted)] leading-relaxed">{children}</p>
    </div>
  </li>
);

const StepAddSource: FC<{ onPick: (id: OnboardingSampleId) => void }> = ({ onPick }) => (
  <div className="flex flex-col gap-4 animate-fade-in">
    <div className="flex flex-col gap-1.5">
      <h2 className="font-serif text-2xl text-[var(--color-fg)] leading-tight">
        Add your first source
      </h2>
      <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">
        Try one of these samples to see it work in seconds. It indexes right here in
        your browser.
      </p>
    </div>
    <div className="grid grid-cols-2 gap-2.5">
      {SAMPLES.map((s) => (
        <button
          key={s.id}
          type="button"
          data-onboarding-sample={s.id}
          onClick={() => onPick(s.id)}
          className="group flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-left hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-surface-3)] transition-colors"
        >
          <span className="mt-0.5 shrink-0 text-[var(--color-accent)]">
            <s.Icon size={20} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-[var(--color-fg)]">{s.label}</span>
            <span className="block text-[11px] text-[var(--color-fg-muted)] leading-snug">
              {s.hint}
            </span>
          </span>
        </button>
      ))}
    </div>
  </div>
);

const StepRecap: FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => (
  <div className="flex flex-col gap-5 animate-fade-in">
    <div className="flex flex-col gap-1.5">
      <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--color-success)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" aria-hidden />
        You are set
      </p>
      <h2 className="font-serif text-2xl text-[var(--color-fg)] leading-tight">
        Ask anything, click any citation
      </h2>
      <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">
        Type a question in the chat. Answers quote your sources and link straight to
        the line — click a citation to open the document there.
      </p>
    </div>
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 flex flex-col gap-2">
      <p className="text-sm font-medium text-[var(--color-fg)]">
        Want synthesized answers?
      </p>
      <p className="text-xs text-[var(--color-fg-muted)] leading-relaxed">
        Without a model, RAGülli shows the most relevant passages for free. Connect
        your own API key (OpenAI, Anthropic, Google, and more) for written answers —
        your key is stored only in this tab, never on a server.
      </p>
      <button
        type="button"
        onClick={onOpenSettings}
        className="self-start text-sm text-[var(--color-accent)] hover:underline"
      >
        Connect a model in Settings
      </button>
    </div>
  </div>
);
