#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
//
// Build placeholder Product Hunt PNG assets from inline SVGs.
// We use @resvg/resvg-js (already in devDependencies) to rasterize
// SVG → PNG without a browser. The SVGs use the design tokens from
// src/styles/globals.css:
//
//   --color-bg:        #0B2027  (deep forest teal)
//   --color-fg:        #F2EDE0  (cream)
//   --color-fg-muted:  #8FA396  (faded sage)
//   --color-accent:    #E0B158  (warm amber)
//   --color-surface-1: #142C33  (raised surface)
//   --color-border:    #1F3A40  (subtle slate)
//
// V1 placeholder. Real screenshots replace these once Subagent F
// captures the running app.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = HERE;

const COLORS = {
  bg: '#0B2027',
  fg: '#F2EDE0',
  fgMuted: '#8FA396',
  accent: '#E0B158',
  surface1: '#142C33',
  border: '#1F3A40',
};

const ASSETS = [
  {
    name: 'ph-lead.png',
    width: 1280,
    height: 640,
    svg: renderLead(),
  },
  {
    name: 'ph-1-first-open.png',
    width: 1280,
    height: 800,
    svg: renderFirstOpen(),
  },
  {
    name: 'ph-2-sources-canvas.png',
    width: 1280,
    height: 800,
    svg: renderSourcesCanvas(),
  },
  {
    name: 'ph-3-chat-with-citation.png',
    width: 1280,
    height: 800,
    svg: renderChatWithCitation(),
  },
  {
    name: 'ph-4-trust-panel.png',
    width: 1280,
    height: 800,
    svg: renderTrustPanel(),
  },
];

for (const a of ASSETS) {
  const resvg = new Resvg(a.svg, {
    background: COLORS.bg,
    fitTo: { mode: 'width', value: a.width },
  });
  const png = resvg.render().asPng();
  const target = path.join(OUT, a.name);
  await fs.writeFile(target, png);
  console.log(`wrote ${target} (${png.length} bytes)`);
}

function svgWrap(width, height, body) {
  // V1 placeholder. Real screenshots replace these once Subagent F
  // captures the running app.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <!-- V1 placeholder. Real screenshots replace these once Subagent F captures the running app. -->
  <rect width="${width}" height="${height}" fill="${COLORS.bg}"/>
  ${body}
</svg>`;
}

function renderLead() {
  return svgWrap(
    1280,
    640,
    `
    <g transform="translate(80, 80)">
      <rect x="0" y="0" width="540" height="480" rx="14" fill="${COLORS.surface1}" stroke="${COLORS.border}" stroke-width="1.5"/>
      <text x="32" y="80" font-family="Georgia, serif" font-size="56" font-weight="500" fill="${COLORS.fg}">RAG${umlaut}lli</text>
      <text x="32" y="120" font-family="Georgia, serif" font-size="22" fill="${COLORS.fgMuted}">Your files. Your AI. Your browser.</text>
      <line x1="32" y1="160" x2="508" y2="160" stroke="${COLORS.border}" stroke-width="1"/>
      <g transform="translate(32, 200)" font-family="ui-monospace, monospace" font-size="15">
        <text fill="${COLORS.fg}">your file "research-paper.pdf"</text>
        <text y="28" fill="${COLORS.fgMuted}">· parsed:  local browser (PDF.js)</text>
        <text y="52" fill="${COLORS.fgMuted}">· chunked: local browser</text>
        <text y="76" fill="${COLORS.fgMuted}">· embedded: local browser (MiniLM)</text>
        <text y="100" fill="${COLORS.fgMuted}">· sent to:  NOT SENT to anywhere yet</text>
      </g>
      <rect x="32" y="340" width="180" height="36" rx="18" fill="${COLORS.bg}" stroke="${COLORS.accent}" stroke-width="1.5"/>
      <text x="122" y="363" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" fill="${COLORS.accent}">trust · active</text>
    </g>
    <g transform="translate(700, 200)">
      <text font-family="Georgia, serif" font-size="72" font-weight="500" fill="${COLORS.fg}">
        <tspan x="0" dy="0">Private RAG.</tspan>
        <tspan x="0" dy="90">No account.</tspan>
        <tspan x="0" dy="90">No server.</tspan>
      </text>
      <text x="0" y="430" font-family="Inter, sans-serif" font-size="18" fill="${COLORS.fgMuted}">Your files never leave the browser tab.</text>
    </g>
    `,
  );
}

function renderFirstOpen() {
  return svgWrap(
    1280,
    800,
    `
    <g transform="translate(60, 60)">
      <rect x="0" y="0" width="1160" height="56" rx="8" fill="${COLORS.surface1}" stroke="${COLORS.border}"/>
      <text x="24" y="38" font-family="Georgia, serif" font-size="22" fill="${COLORS.fg}">RAG${umlaut}lli</text>
      <text x="160" y="38" font-family="Inter, sans-serif" font-size="13" fill="${COLORS.fgMuted}">Your files. Your AI. Your browser.</text>
      <text x="1100" y="38" text-anchor="end" font-family="Inter, sans-serif" font-size="13" fill="${COLORS.fgMuted}">Settings</text>
    </g>
    <g transform="translate(220, 220)">
      <text font-family="Georgia, serif" font-size="42" font-weight="500" fill="${COLORS.fg}">
        <tspan x="160" dy="0">Your files. Your AI.</tspan>
        <tspan x="220" dy="56">Your browser.</tspan>
      </text>
      <text x="0" y="160" font-family="Inter, sans-serif" font-size="14" fill="${COLORS.fgMuted}">Drop a document. Get answers that cite the line. Nothing leaves this tab.</text>
      <rect x="0" y="190" width="840" height="120" rx="10" fill="${COLORS.surface1}" stroke="${COLORS.border}" stroke-dasharray="6 6"/>
      <text x="420" y="248" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" fill="${COLORS.fgMuted}">Drop a file to ingest</text>
      <text x="420" y="270" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" fill="${COLORS.fgMuted}">PDF, DOCX, Markdown, text, HTML</text>
      <g transform="translate(0, 340)" font-family="Inter, sans-serif" font-size="12" fill="${COLORS.fgMuted}" text-anchor="middle">
        <g><rect x="20" y="0" width="180" height="56" rx="8" fill="${COLORS.surface1}" stroke="${COLORS.border}"/><text x="110" y="34" fill="${COLORS.accent}" font-size="22">PDF</text></g>
        <g><rect x="220" y="0" width="180" height="56" rx="8" fill="${COLORS.surface1}" stroke="${COLORS.border}"/><text x="310" y="34" fill="${COLORS.accent}" font-size="22">URL</text></g>
        <g><rect x="420" y="0" width="180" height="56" rx="8" fill="${COLORS.surface1}" stroke="${COLORS.border}"/><text x="510" y="34" fill="${COLORS.accent}" font-size="22">TEXT</text></g>
        <g><rect x="620" y="0" width="180" height="56" rx="8" fill="${COLORS.surface1}" stroke="${COLORS.border}" opacity="0.5"/><text x="710" y="34" fill="${COLORS.fgMuted}" font-size="22">AUDIO</text></g>
      </g>
    </g>
    <g transform="translate(40, 760)">
      <rect x="0" y="-24" width="180" height="20" rx="10" fill="${COLORS.bg}" stroke="${COLORS.accent}" stroke-width="1"/>
      <text x="90" y="-10" text-anchor="middle" font-family="Inter, sans-serif" font-size="10" fill="${COLORS.accent}">no account · no server · no telemetry</text>
    </g>
    `,
  );
}

function renderSourcesCanvas() {
  return svgWrap(
    1280,
    800,
    `
    <g transform="translate(60, 60)">
      <rect x="0" y="0" width="1160" height="56" rx="8" fill="${COLORS.surface1}" stroke="${COLORS.border}"/>
      <text x="24" y="38" font-family="Georgia, serif" font-size="22" fill="${COLORS.fg}">RAG${umlaut}lli</text>
    </g>
    <g transform="translate(60, 140)">
      <rect x="0" y="0" width="220" height="600" rx="10" fill="${COLORS.surface1}" stroke="${COLORS.border}"/>
      <text x="20" y="30" font-family="Inter, sans-serif" font-size="12" fill="${COLORS.fgMuted}">WORKSPACE</text>
      <rect x="14" y="50" width="192" height="36" rx="6" fill="${COLORS.bg}" stroke="${COLORS.accent}"/>
      <text x="28" y="72" font-family="Inter, sans-serif" font-size="13" fill="${COLORS.fg}">Untitled workspace</text>
    </g>
    <g transform="translate(300, 140)">
      <g>
        <rect x="0" y="0" width="500" height="260" rx="14" fill="${COLORS.surface1}" stroke="${COLORS.accent}" stroke-dasharray="8 6" stroke-width="2"/>
        <text x="20" y="32" font-family="Inter, sans-serif" font-size="14" fill="${COLORS.fg}">Trusted</text>
        <text x="80" y="32" font-family="Inter, sans-serif" font-size="11" fill="${COLORS.fgMuted}">weight 1.0</text>
        <g font-family="Inter, sans-serif" font-size="11" fill="${COLORS.fg}">
          <g><rect x="20" y="50" width="220" height="60" rx="6" fill="${COLORS.bg}" stroke="${COLORS.border}"/><text x="32" y="78">research-paper.pdf</text><text x="32" y="94" fill="${COLORS.fgMuted}">14 chunks</text></g>
          <g><rect x="260" y="50" width="220" height="60" rx="6" fill="${COLORS.bg}" stroke="${COLORS.border}"/><text x="272" y="78">contract.pdf</text><text x="272" y="94" fill="${COLORS.fgMuted}">22 chunks</text></g>
          <g><rect x="20" y="130" width="220" height="60" rx="6" fill="${COLORS.bg}" stroke="${COLORS.border}"/><text x="32" y="158">chapter-3.md</text><text x="32" y="174" fill="${COLORS.fgMuted}">9 chunks</text></g>
        </g>
      </g>
      <g transform="translate(0, 290)">
        <rect x="0" y="0" width="500" height="220" rx="14" fill="${COLORS.surface1}" stroke="${COLORS.fgMuted}" stroke-dasharray="8 6" stroke-width="1.5"/>
        <text x="20" y="32" font-family="Inter, sans-serif" font-size="14" fill="${COLORS.fg}">Background</text>
        <text x="100" y="32" font-family="Inter, sans-serif" font-size="11" fill="${COLORS.fgMuted}">weight 0.1</text>
        <g font-family="Inter, sans-serif" font-size="11" fill="${COLORS.fg}">
          <g><rect x="20" y="50" width="220" height="60" rx="6" fill="${COLORS.bg}" stroke="${COLORS.border}"/><text x="32" y="78">newsletter-week-12.pdf</text><text x="32" y="94" fill="${COLORS.fgMuted}">6 chunks</text></g>
          <g><rect x="260" y="50" width="220" height="60" rx="6" fill="${COLORS.bg}" stroke="${COLORS.border}"/><text x="272" y="78">article.html</text><text x="272" y="94" fill="${COLORS.fgMuted}">4 chunks</text></g>
        </g>
      </g>
    </g>
    <g transform="translate(820, 140)">
      <rect x="0" y="0" width="400" height="600" rx="10" fill="${COLORS.surface1}" stroke="${COLORS.border}"/>
      <text x="20" y="32" font-family="Inter, sans-serif" font-size="14" fill="${COLORS.fg}">Chat</text>
      <g transform="translate(20, 60)" font-family="Inter, sans-serif" font-size="12">
        <rect x="0" y="0" width="360" height="50" rx="8" fill="${COLORS.bg}" stroke="${COLORS.border}"/>
        <text x="14" y="30" fill="${COLORS.fg}">What is the methodology?</text>
        <rect x="0" y="64" width="360" height="100" rx="8" fill="${COLORS.bg}" stroke="${COLORS.border}"/>
        <text x="14" y="86" fill="${COLORS.fg}">The paper uses a sliding window chunker with</text>
        <text x="14" y="104" fill="${COLORS.fg}">800-token windows and 100-token overlap. <tspan fill="${COLORS.accent}">[1, p.3]</tspan></text>
        <text x="14" y="122" fill="${COLORS.fg}">Embeddings are computed via a quantized</text>
        <text x="14" y="140" fill="${COLORS.fg}">MiniLM model. <tspan fill="${COLORS.accent}">[1, p.4]</tspan></text>
        <text x="14" y="180" fill="${COLORS.fgMuted}">Sources used: research-paper.pdf · p.3</text>
      </g>
    </g>
    `,
  );
}

function renderChatWithCitation() {
  return svgWrap(
    1280,
    800,
    `
    <g transform="translate(60, 60)">
      <rect x="0" y="0" width="1160" height="56" rx="8" fill="${COLORS.surface1}" stroke="${COLORS.border}"/>
      <text x="24" y="38" font-family="Georgia, serif" font-size="22" fill="${COLORS.fg}">RAG${umlaut}lli</text>
    </g>
    <g transform="translate(60, 140)">
      <rect x="0" y="0" width="600" height="600" rx="10" fill="${COLORS.surface1}" stroke="${COLORS.border}"/>
      <text x="20" y="32" font-family="Inter, sans-serif" font-size="14" fill="${COLORS.fg}">Chat</text>
      <g transform="translate(20, 60)" font-family="Inter, sans-serif" font-size="13">
        <rect x="0" y="0" width="560" height="44" rx="8" fill="${COLORS.bg}" stroke="${COLORS.border}"/>
        <text x="14" y="28" fill="${COLORS.fg}">What are the limitations?</text>
        <rect x="0" y="58" width="560" height="220" rx="8" fill="${COLORS.bg}" stroke="${COLORS.border}"/>
        <text x="14" y="84" fill="${COLORS.fg}">The authors list three limitations:</text>
        <text x="14" y="110" fill="${COLORS.fg}">1. <tspan fill="${COLORS.accent}" text-decoration="underline">the embedding model is English-first</tspan></text>
        <text x="14" y="128" fill="${COLORS.fg}">   so retrieval quality drops on other languages</text>
        <text x="14" y="146" fill="${COLORS.fg}">2. <tspan fill="${COLORS.accent}" text-decoration="underline">no OCR</tspan> — scanned PDFs come out empty</text>
        <text x="14" y="164" fill="${COLORS.fg}">3. <tspan fill="${COLORS.accent}" text-decoration="underline">the in-browser model is a large first download</tspan></text>
        <text x="14" y="182" fill="${COLORS.fg}">   (~2 GB) before it can run offline</text>
        <text x="14" y="220" fill="${COLORS.fgMuted}">Sources used: research-paper.pdf · p.6 ¶ 2</text>
        <text x="14" y="240" fill="${COLORS.fgMuted}">research-paper.pdf · p.6 ¶ 3</text>
      </g>
    </g>
    <g transform="translate(680, 140)">
      <rect x="0" y="0" width="540" height="600" rx="10" fill="${COLORS.surface1}" stroke="${COLORS.accent}" stroke-width="1.5"/>
      <text x="20" y="32" font-family="Inter, sans-serif" font-size="14" fill="${COLORS.fg}">research-paper.pdf · p.6</text>
      <g transform="translate(20, 60)" font-family="Georgia, serif" font-size="13">
        <text x="0" y="0" fill="${COLORS.fgMuted}">6. Limitations</text>
        <text x="0" y="32" fill="${COLORS.fg}">We identify three limitations of this work.</text>
        <text x="0" y="56" fill="${COLORS.fg}">First, the embedding model is English-first;</text>
        <rect x="-6" y="62" width="540" height="36" fill="${COLORS.accent}" opacity="0.15"/>
        <text x="0" y="80" fill="${COLORS.fg}">retrieval quality on non-English corpora is</text>
        <text x="0" y="104" fill="${COLORS.fg}">out of scope. Second, we do not handle scanned</text>
        <rect x="-6" y="146" width="540" height="36" fill="${COLORS.accent}" opacity="0.15"/>
        <text x="0" y="128" fill="${COLORS.fg}">PDFs: there is no OCR pass. Third, the</text>
        <text x="0" y="152" fill="${COLORS.fg}">in-browser model, when enabled, requires a</text>
        <rect x="-6" y="170" width="540" height="36" fill="${COLORS.accent}" opacity="0.15"/>
        <text x="0" y="176" fill="${COLORS.fg}">~2 GB download before it can run offline.</text>
        <text x="0" y="208" fill="${COLORS.fg}">Future work will address all three.</text>
      </g>
    </g>
    `,
  );
}

function renderTrustPanel() {
  return svgWrap(
    1280,
    800,
    `
    <g transform="translate(60, 60)">
      <rect x="0" y="0" width="1160" height="56" rx="8" fill="${COLORS.surface1}" stroke="${COLORS.border}"/>
      <text x="24" y="38" font-family="Georgia, serif" font-size="22" fill="${COLORS.fg}">RAG${umlaut}lli</text>
    </g>
    <g transform="translate(880, 220)" filter="url(#none)">
      <rect x="0" y="0" width="360" height="380" rx="12" fill="${COLORS.surface1}" stroke="${COLORS.accent}" stroke-width="1.5"/>
      <rect x="0" y="0" width="360" height="40" rx="12" fill="${COLORS.surface1}" stroke="${COLORS.border}"/>
      <line x1="0" y1="40" x2="360" y2="40" stroke="${COLORS.border}"/>
      <text x="16" y="26" font-family="Inter, sans-serif" font-size="11" fill="${COLORS.fgMuted}" letter-spacing="0.6">WHAT${apos}S HAPPENING NOW</text>
      <g transform="translate(16, 60)" font-family="Inter, sans-serif" font-size="12">
        <text fill="${COLORS.fg}">your file "research-paper.pdf"</text>
        <text y="22" fill="${COLORS.fgMuted}">· parsed:  local browser (PDF.js)</text>
        <text y="42" fill="${COLORS.fgMuted}">· chunked: local browser</text>
        <text y="62" fill="${COLORS.fgMuted}">· embedded: local browser (MiniLM)</text>
        <text y="82" fill="${COLORS.fgMuted}">· sent to:  NOT SENT to anywhere yet</text>
      </g>
      <line x1="16" y1="170" x2="344" y2="170" stroke="${COLORS.border}"/>
      <g transform="translate(16, 190)" font-family="Inter, sans-serif" font-size="12">
        <text fill="${COLORS.fg}">your question "what are the limitations"</text>
        <text y="22" fill="${COLORS.fgMuted}">· sent to:  Anthropic · claude-sonnet-4</text>
        <text y="42" fill="${COLORS.fgMuted}">· (anthropic only: passed through stateless</text>
        <text y="60" fill="${COLORS.fgMuted}">    Edge function for CORS)</text>
        <text y="84" fill="${COLORS.fgMuted}">· response: streaming in this tab</text>
      </g>
      <line x1="16" y1="306" x2="344" y2="306" stroke="${COLORS.border}"/>
      <text x="16" y="328" font-family="Inter, sans-serif" font-size="11" fill="${COLORS.accent}" font-style="italic">embedding model is downloaded once from huggingface.co</text>
      <text x="16" y="348" font-family="Inter, sans-serif" font-size="11" fill="${COLORS.fgMuted}" font-style="italic">then cached on this site for offline use</text>
    </g>
    <g transform="translate(60, 760)">
      <rect x="0" y="-24" width="220" height="20" rx="10" fill="${COLORS.bg}" stroke="${COLORS.accent}" stroke-width="1"/>
      <text x="110" y="-10" text-anchor="middle" font-family="Inter, sans-serif" font-size="10" fill="${COLORS.accent}">no account · no server · no telemetry</text>
    </g>
    <g transform="translate(60, 200)">
      <text font-family="Georgia, serif" font-size="36" font-weight="500" fill="${COLORS.fg}">Trust, in plain English.</text>
      <text x="0" y="40" font-family="Inter, sans-serif" font-size="14" fill="${COLORS.fgMuted}">Every byte movement is narrated</text>
      <text x="0" y="62" font-family="Inter, sans-serif" font-size="14" fill="${COLORS.fgMuted}">before it happens.</text>
    </g>
    `,
  );
}

function umlaut() {
  // RAG + combining diaeresis (U+0308).
  return 'u\u0308';
}

function apos() {
  // typographic apostrophe
  return '\u2019';
}