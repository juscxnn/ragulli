// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// Wedge — the "we live in the empty square" 4-quadrant chart from
// spec §1.4. Pure SVG, no images. Subtle reveal-on-scroll via
// IntersectionObserver + a CSS class.

import { useEffect, useRef, useState, type FC } from 'react';

type QuadId = 'tl' | 'tr' | 'bl' | 'br';

type Quadrant = {
  id: QuadId;
  label: string;
  sub: string;
  us?: boolean;
};

const QUADRANTS: Quadrant[] = [
  { id: 'tl', label: 'private RAG repos', sub: 'engineer-grade (ugly)' },
  { id: 'tr', label: 'RAGülli', sub: 'polished + browser-only', us: true },
  { id: 'bl', label: 'raw GPT + manual upload', sub: 'ugly + uploads' },
  { id: 'br', label: 'NotebookLM · Humata · ChatPDF', sub: 'polished + uploads' },
];

export const Wedge: FC = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="wedge" className="px-6 py-20 md:py-28 border-t border-[var(--color-border)]">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <div className="max-w-2xl mb-12">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-accent)] mb-3">
            The wedge
          </p>
          <h2 className="font-serif font-medium text-3xl md:text-4xl text-[var(--color-fg)] leading-tight tracking-tight">
            The empty square, occupied.
          </h2>
          <p className="mt-4 text-[var(--color-fg-muted)] text-base md:text-lg leading-relaxed">
            Every existing tool is either engineer-grade or hosted.
            RAGülli is the first polished, zero-install, browser-only
            private RAG tool. The architecture is the moat: competitors
            cannot copy the trust story without giving up their backend.
          </p>
        </div>

        <div className="relative">
          <div
            className={[
              'aspect-[16/10] md:aspect-[16/9] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden transition-opacity duration-700',
              shown ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            aria-label="Four-quadrant chart comparing RAGülli against private RAG repos, hosted RAG tools, and raw GPT"
            role="img"
          >
            <svg
              viewBox="0 0 800 500"
              className="w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Axes */}
              <line x1="400" y1="30" x2="400" y2="470" stroke="var(--color-border)" strokeWidth="1" />
              <line x1="30" y1="250" x2="770" y2="250" stroke="var(--color-border)" strokeWidth="1" />

              {/* Axis labels */}
              <text
                x="30"
                y="22"
                fontSize="11"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fill="var(--color-fg-muted)"
                letterSpacing="1.5"
              >
                ENGINEER-GRADE (UGLY)
              </text>
              <text
                x="770"
                y="22"
                fontSize="11"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fill="var(--color-accent)"
                textAnchor="end"
                letterSpacing="1.5"
              >
                POLISHED
              </text>
              <text
                x="30"
                y="488"
                fontSize="11"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fill="var(--color-fg-muted)"
                letterSpacing="1.5"
              >
                HOSTED (UPLOADS)
              </text>
              <text
                x="770"
                y="488"
                fontSize="11"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fill="var(--color-accent)"
                textAnchor="end"
                letterSpacing="1.5"
              >
                BROWSER-ONLY (PRIVATE)
              </text>

              {/* Quadrant fills + labels */}
              {QUADRANTS.map((q, i) => {
                const cx = q.id === 'tl' || q.id === 'bl' ? 200 : 600;
                const cy = q.id === 'tl' || q.id === 'tr' ? 140 : 360;
                const isUs = !!q.us;
                const reveal = shown;
                return (
                  <g
                    key={q.id}
                    style={{
                      opacity: reveal ? 1 : 0,
                      transformOrigin: `${cx}px ${cy}px`,
                      transition: `opacity 700ms ease ${300 + i * 120}ms, transform 700ms ease ${300 + i * 120}ms`,
                      transform: reveal ? 'scale(1)' : 'scale(0.92)',
                    }}
                  >
                    <rect
                      x={cx - 160}
                      y={cy - 80}
                      width={320}
                      height={160}
                      rx={10}
                      fill={isUs ? 'rgba(224, 177, 88, 0.06)' : 'rgba(31, 58, 64, 0.3)'}
                      stroke={isUs ? 'rgba(224, 177, 88, 0.45)' : 'rgba(31, 58, 64, 1)'}
                      strokeWidth={isUs ? 1.5 : 1}
                    />
                    <text
                      x={cx}
                      y={cy - 18}
                      fontSize="16"
                      fontFamily="Lora, Georgia, serif"
                      fontWeight={isUs ? 600 : 500}
                      fill={isUs ? 'var(--color-accent)' : 'var(--color-fg)'}
                      textAnchor="middle"
                    >
                      {q.label}
                    </text>
                    <text
                      x={cx}
                      y={cy + 6}
                      fontSize="11"
                      fontFamily="ui-sans-serif, system-ui, sans-serif"
                      fill="var(--color-fg-muted)"
                      textAnchor="middle"
                      letterSpacing="1"
                    >
                      {q.sub}
                    </text>
                    {isUs ? (
                      <g>
                        <circle cx={cx} cy={cy + 26} r={4} fill="var(--color-accent)" />
                        <text
                          x={cx}
                          y={cy + 56}
                          fontSize="10"
                          fontFamily="ui-sans-serif, system-ui, sans-serif"
                          fill="var(--color-accent)"
                          textAnchor="middle"
                          letterSpacing="2"
                        >
                          YOU ARE HERE
                        </text>
                      </g>
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>
          <p className="mt-6 text-sm text-[var(--color-fg-muted)] leading-relaxed max-w-2xl">
            The top-right cell — polished and browser-only — has been
            empty for years. Every other private RAG tool is either a
            repo full of scripts, or it sends your files to a backend.
            RAGülli is the first to ship a real product in that cell.
          </p>
        </div>
      </div>
    </section>
  );
};

