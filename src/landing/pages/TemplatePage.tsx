// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// TemplatePage — the per-template marketing page. One component,
// used by all six /t/{id}.html entries; the template id is passed
// in as a prop from LandingApp's router.
//
// Sections:
//   - Hero (template name + one-sentence description)
//   - "Why this template" paragraph (drawn from ingestDefaults +
//     defaultPrompt, in our own voice)
//   - Three example questions (first three of the template's
//     quickActions)
//   - "Open in RAGülli" CTA -> /app/?template={id}
//   - "← Back to all templates" link -> /

import type { FC } from 'react';
import { TEMPLATES, type Template } from '@/features/templates/templates';
import { PageShell } from '../PageShell';
import { ArrowLeftIcon, ArrowRightIcon } from '../icons';

type Props = { templateId: string };

function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

function whyParagraph(t: Template): string {
  const ingest = t.ingestDefaults;
  // Build a sentence that explains the ingest defaults in plain English.
  const ingestLine = `It chunks sources at ${ingest.chunkSize} tokens with ${ingest.chunkOverlap} of overlap — tuned for ${kindOfWork(t)}.`;
  // A second sentence drawn from the system prompt, paraphrased.
  const behaviour = behaviourLine(t);
  return `${ingestLine} ${behaviour}`;
}

function kindOfWork(t: Template): string {
  switch (t.id) {
    case 'research-paper-reader':
      return 'dense, citation-heavy papers';
    case 'contract-reviewer':
      return 'clause-by-clause contract review';
    case 'customer-interview-corpus':
      return 'verbatim interview notes';
    case 'book-companion':
      return 'long-form books where chapter context matters';
    case 'newsletter-digester':
      return 'short, mixed-topic newsletter issues';
    case 'job-application-matcher':
      return 'CV-and-job-description matching';
    default:
      return 'this shape of work';
  }
}

function behaviourLine(t: Template): string {
  switch (t.id) {
    case 'research-paper-reader':
      return 'When asked to summarize, the assistant structures the answer as question, method, result, and limitations — the same four questions a careful reader brings to a paper.';
    case 'contract-reviewer':
      return 'It highlights every obligation, deadline, and liability cap, flags non-standard terms, and cites the clause number for each finding.';
    case 'customer-interview-corpus':
      return 'It quotes verbatim wherever possible, groups by theme, and cites the interview and timestamp for every claim.';
    case 'book-companion':
      return 'When asked about a chapter, it gives a one-paragraph orientation first, then answers, and always cites the chapter.';
    case 'newsletter-digester':
      return 'It groups items by topic, separates what is genuinely new from re-hashes, and cites the source newsletter and date.';
    case 'job-application-matcher':
      return 'It matches the candidate experience to the role requirements one bullet at a time and cites the source line for every match.';
    default:
      return 'It answers in plain language and always cites the source.';
  }
}

export const TemplatePage: FC<Props> = ({ templateId }) => {
  const t = getTemplate(templateId);
  if (!t) {
    return (
      <PageShell>
        <section className="px-6 py-32 max-w-2xl mx-auto text-center">
          <h1 className="font-serif text-3xl text-[var(--color-fg)] mb-4">
            Template not found
          </h1>
          <p className="text-[var(--color-fg-muted)]">
            We could not find a template at that path.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 mt-6 text-[var(--color-accent)] hover:no-underline"
          >
            <ArrowLeftIcon size={16} />
            Back to all templates
          </a>
        </section>
      </PageShell>
    );
  }

  const questions = t.quickActions.slice(0, 3);

  return (
    <PageShell ctaHref={`/app/?template=${t.id}`}>
      <article className="px-6 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:no-underline mb-10"
          >
            <ArrowLeftIcon size={14} />
            Back to all templates
          </a>

          <header className="mb-12">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-accent)] mb-3">
              Template
            </p>
            <h1 className="font-serif font-medium text-4xl md:text-5xl text-[var(--color-fg)] leading-tight tracking-tight">
              {t.name}
            </h1>
            <p className="mt-4 text-lg md:text-xl text-[var(--color-fg-muted)] leading-relaxed">
              {t.description}
            </p>
          </header>

          <section className="mb-12">
            <h2 className="font-serif text-2xl text-[var(--color-fg)] mb-4">
              Why this template
            </h2>
            <p className="text-[var(--color-fg-muted)] leading-relaxed text-base md:text-lg">
              {whyParagraph(t)}
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-serif text-2xl text-[var(--color-fg)] mb-4">
              Three example questions
            </h2>
            <ol className="space-y-3">
              {questions.map((q, i) => (
                <li
                  key={q.label}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4"
                >
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-accent)] mb-1.5">
                    {i + 1}. {q.label}
                  </p>
                  <p className="text-[var(--color-fg)] text-sm leading-relaxed">
                    {q.prompt}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[var(--color-border)]">
            <a
              href={`/app/?template=${t.id}`}
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg)] font-medium text-base hover:brightness-110 hover:no-underline transition-[filter]"
            >
              Open in RAGülli
              <ArrowRightIcon size={16} />
            </a>
            <a
              href="/#templates"
              className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-lg bg-[var(--color-surface-1)] text-[var(--color-fg)] border border-[var(--color-border)] font-medium text-base hover:border-[var(--color-accent)]/40 hover:no-underline transition-[border-color,background]"
            >
              See all templates
            </a>
          </div>
        </div>
      </article>
    </PageShell>
  );
};