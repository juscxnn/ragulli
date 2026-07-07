// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Landing router. Reads window.location.pathname and renders the
// matching page. The pathname is consulted on mount and on every
// popstate; the home page also re-checks when the user clicks an
// in-page anchor.

import { useEffect, useState, type FC } from 'react';
import { TEMPLATES } from '@/features/templates/templates';
import { Home } from './pages/Home';
import { TemplatePage } from './pages/TemplatePage';
import { ComparePage } from './pages/ComparePage';
import { PrivacyPage } from './pages/PrivacyPage';

export type LandingPath =
  | { kind: 'home' }
  | { kind: 'template'; id: string }
  | { kind: 'compare'; id: string }
  | { kind: 'privacy' };

const VALID_TEMPLATE_IDS = new Set(TEMPLATES.map((t) => t.id));
const VALID_COMPARE_IDS = new Set(['notebooklm', 'humata', 'chatpdf']);

function parsePath(pathname: string): LandingPath {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/' || clean === '') return { kind: 'home' };
  if (clean === '/privacy') return { kind: 'privacy' };
  const tMatch = /^\/t\/([a-z0-9-]+)$/.exec(clean);
  if (tMatch) {
    const id = tMatch[1];
    if (id && VALID_TEMPLATE_IDS.has(id)) return { kind: 'template', id };
  }
  const cMatch = /^\/compare\/([a-z0-9-]+)$/.exec(clean);
  if (cMatch) {
    const id = cMatch[1];
    if (id && VALID_COMPARE_IDS.has(id)) return { kind: 'compare', id };
  }
  return { kind: 'home' };
}

export const LandingApp: FC = () => {
  const [path, setPath] = useState<LandingPath>(() =>
    typeof window === 'undefined'
      ? { kind: 'home' }
      : parsePath(window.location.pathname),
  );

  useEffect(() => {
    const onPop = () => setPath(parsePath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  switch (path.kind) {
    case 'template':
      return <TemplatePage templateId={path.id} />;
    case 'compare':
      return <ComparePage competitorId={path.id} />;
    case 'privacy':
      return <PrivacyPage />;
    case 'home':
    default:
      return <Home />;
  }
};