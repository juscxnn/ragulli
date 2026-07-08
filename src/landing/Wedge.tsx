// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Wedge — the "empty square, occupied" 4-quadrant chart from spec §1.4.
// Pure SVG, no images. The previous version had a reveal-on-scroll
// animation and a "YOU ARE HERE" pin — both cut. The chart itself is
// the argument. The RAGülli cell is the only one with a fill.

import type { FC } from 'react';

type Quadrant = {
  id: 'tl' | 'tr' | 'bl' | 'br';
  label: string;
  ours?: boolean;
};

const QUADRANTS: Quadrant[] = [
  { id: 'tl', label: 'private RAG repos' },
  { id: 'tr', label: 'RAGülli', ours: true },
  { id: 'bl', label: 'raw GPT + manual upload' },
  { id: 'br', label: 'NotebookLM · Humata · ChatPDF' },
];

export const Wedge: FC = () => (
  <section
    id="wedge"
    className="px-6 py-24 md:py-32 border-t border-[var(--color-border)]"
  >
    <div className="max-w-5xl mx-auto">
      <div className="max-w-xl mb-16">
        <h2 className="font-serif font-normal text-[var(--color-fg)] text-3xl md:text-4xl leading-[1.1] tracking-[-0.015em]">
          The empty square,
          <br />
          occupied.
        </h2>
        <p className="mt-6 text-[var(--color-fg-muted)] text-base md:text-lg leading-[1.6]">
          Every other private RAG tool is either a repo full of scripts
          or a service that uploads your files. RAGülli is the first
          polished product in the empty cell.
        </p>
      </div>

      <div
        className="aspect-[2/1] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden"
        aria-label="Four-quadrant chart comparing RAGülli against private RAG repos, hosted RAG tools, and raw GPT with manual upload"
        role="img"
      >
        <svg
          viewBox="0 0 800 400"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Axes */}
          <line
            x1="400"
            y1="24"
            x2="400"
            y2="376"
            stroke="var(--color-border)"
            strokeWidth="1"
          />
          <line
            x1="24"
            y1="200"
            x2="776"
            y2="200"
            stroke="var(--color-border)"
            strokeWidth="1"
          />

          {/* Axis labels, only on the sides that describe the position we occupy */}
          <text
            x="24"
            y="18"
            fontSize="10"
            fontFamily="Inter, system-ui, sans-serif"
            fill="var(--color-fg-muted)"
            letterSpacing="2"
          >
            ENGINEER-GRADE
          </text>
          <text
            x="776"
            y="18"
            fontSize="10"
            fontFamily="Inter, system-ui, sans-serif"
            fill="var(--color-fg-muted)"
            textAnchor="end"
            letterSpacing="2"
          >
            POLISHED
          </text>
          <text
            x="24"
            y="392"
            fontSize="10"
            fontFamily="Inter, system-ui, sans-serif"
            fill="var(--color-fg-muted)"
            letterSpacing="2"
          >
            HOSTED
          </text>
          <text
            x="776"
            y="392"
            fontSize="10"
            fontFamily="Inter, system-ui, sans-serif"
            fill="var(--color-fg-muted)"
            textAnchor="end"
            letterSpacing="2"
          >
            BROWSER-ONLY
          </text>

          {/* Quadrant rectangles + labels. RAGülli (tr) is the only one with a fill. */}
          {QUADRANTS.map((q) => {
            const cx = q.id === 'tl' || q.id === 'bl' ? 212 : 588;
            const cy = q.id === 'tl' || q.id === 'tr' ? 112 : 288;
            return (
              <g key={q.id}>
                <rect
                  x={cx - 170}
                  y={cy - 70}
                  width={340}
                  height={140}
                  rx={6}
                  fill={
                    q.ours
                      ? 'rgba(224, 177, 88, 0.08)'
                      : 'transparent'
                  }
                  stroke={
                    q.ours
                      ? 'rgba(224, 177, 88, 0.5)'
                      : 'var(--color-border)'
                  }
                  strokeWidth={q.ours ? 1.5 : 1}
                />
                <text
                  x={cx}
                  y={cy + 5}
                  fontSize={q.ours ? 18 : 14}
                  fontFamily="Lora, Georgia, serif"
                  fontWeight={q.ours ? 500 : 400}
                  fill={
                    q.ours
                      ? 'var(--color-accent)'
                      : 'var(--color-fg-muted)'
                  }
                  textAnchor="middle"
                  letterSpacing={q.ours ? '0.5' : '0'}
                >
                  {q.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  </section>
);