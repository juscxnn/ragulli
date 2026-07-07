// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Comparison data — the same 7-row comparison as
// ComparisonTable.tsx, but expanded with "where they're better" and
// "where RAGülli is better" callouts per competitor.

export type CompetitorId = 'notebooklm' | 'humata' | 'chatpdf';

export type Competitor = {
  id: CompetitorId;
  name: string;
  tagline: string;
  betterAt: string;
  /** Three bullets explaining where RAGülli wins. */
  ragulliBetter: string[];
  rows: ComparisonRow[];
};

export type ComparisonRow = {
  label: string;
  ragulli: string;
  competitor: string;
};

const ROWS: ComparisonRow[] = [
  {
    label: 'Install',
    ragulli: 'Open the URL — that is it',
    competitor: 'Open the URL',
  },
  {
    label: 'Account',
    ragulli: 'Not required',
    competitor: 'Required (Google / Humata / ChatPDF account)',
  },
  {
    label: 'Where files go',
    ragulli: 'Stay in this browser tab',
    competitor: 'Uploaded to the vendor server',
  },
  {
    label: 'Citation quality',
    ragulli: 'Inline link to the line in the original',
    competitor: 'Inline link to a span, or footnote-style numbers',
  },
  {
    label: 'BYOK models',
    ragulli: 'Yes — OpenAI, Anthropic, Google, Kimi, M2, in-browser',
    competitor: 'No',
  },
  {
    label: 'Offline after first load',
    ragulli: 'Embedding and retrieval work offline',
    competitor: 'Requires a connection',
  },
  {
    label: 'Open source',
    ragulli: 'AGPL-3.0',
    competitor: 'Closed source',
  },
];

export const COMPETITORS: Record<CompetitorId, Competitor> = {
  notebooklm: {
    id: 'notebooklm',
    name: 'NotebookLM',
    tagline: 'Google\'s hosted research notebook. Free with limits.',
    betterAt:
      'NotebookLM has Audio Overviews — the AI-generated podcast summary. It is genuinely good, and a class of its own. NotebookLM also has tight integration with Google Docs and Drive, which is the right tool if your corpus already lives there.',
    ragulliBetter: [
      'Your source documents never leave the browser tab. NotebookLM uploads every file to Google servers.',
      'No Google account required. Open the URL and drop a file.',
      'BYOK models — bring your own Anthropic or OpenAI key and choose the model that fits the work.',
    ],
    rows: ROWS,
  },
  humata: {
    id: 'humata',
    name: 'Humata',
    tagline: 'A polished hosted RAG tool aimed at academic PDFs.',
    betterAt:
      'Humata has a polished UX and a tight feature set around citation formatting — the kind of thing a research paper reader will appreciate on the first click. It also has a generous free tier and is the right tool if you do not have the time to set up anything.',
    ragulliBetter: [
      'Files stay in this browser tab. Humata uploads them to its own backend.',
      'No account, no signup. Humata requires an email and password.',
      'AGPL-3.0 open source. You can read the code, run it yourself, and modify it.',
    ],
    rows: ROWS,
  },
  chatpdf: {
    id: 'chatpdf',
    name: 'ChatPDF',
    tagline: 'The fastest way to paste a PDF and ask a question.',
    betterAt:
      'ChatPDF is the fastest path from PDF to answer. Paste a link or upload a file and you are chatting in seconds. The free tier is generous. It is the right tool if speed is the whole game and the file is not sensitive.',
    ragulliBetter: [
      'Files stay in this browser tab. ChatPDF uploads them to its servers.',
      'No account, no email, no paste-to-chat signup flow.',
      'BYOK models — bring your own key. ChatPDF runs its own model only.',
    ],
    rows: ROWS,
  },
};

export function getCompetitor(id: string): Competitor | undefined {
  if (id === 'notebooklm' || id === 'humata' || id === 'chatpdf') {
    return COMPETITORS[id];
  }
  return undefined;
}