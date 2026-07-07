// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 RAGülli contributors
// build-samples.mjs — Generate the four sample files referenced by the
// hero buttons. Two PDFs (research paper + consulting contract), one
// Markdown chapter, one HTML article. Pure Node; no network access.

import { promises as fs, createWriteStream } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT = resolve(__dirname, '..', 'public', 'sample-files');

async function ensureOut() {
  await fs.mkdir(OUT, { recursive: true });
}

function writePdf(rel, draw) {
  return new Promise((resolveP, reject) => {
    const path = resolve(OUT, rel);
    const doc = new PDFDocument({ size: 'LETTER', margin: 72 });
    const stream = createWriteStream(path);
    stream.on('finish', () => resolveP(path));
    stream.on('error', reject);
    doc.pipe(stream);
    draw(doc);
    doc.end();
  });
}

function paper(doc) {
  doc.font('Times-Bold').fontSize(20).text('A Brief Note on Reading', { align: 'center' });
  doc.moveDown(0.5);
  doc.font('Times-Italic').fontSize(12).text('A short, two-page essay.', { align: 'center' });
  doc.moveDown(1.5);

  doc.font('Times-Bold').fontSize(13).text('Abstract');
  doc.font('Times-Roman').fontSize(11).text(
    'Reading well is a practice, not a talent. This note argues that the difference between skimming a paper and understanding it is largely a matter of which questions you bring to it. We propose a small set of questions, drawn from the natural sciences, that generalize across the humanities. The note is meant as a companion, not a doctrine.',
  );
  doc.moveDown(1);

  doc.font('Times-Bold').fontSize(13).text('1. The four questions');
  doc.font('Times-Roman').fontSize(11).text(
    'First, what is the author trying to show. Second, what would have to be true for the argument to fail. Third, what evidence is offered, and how is it qualified. Fourth, who else has a stake in the answer. These are not new questions. They are old, in the Socratic sense, because they keep producing the same kind of clarity when asked honestly.',
  );
  doc.moveDown(1);

  doc.font('Times-Bold').fontSize(13).text('2. The cost of skipping them');
  doc.font('Times-Roman').fontSize(11).text(
    'When the questions are skipped, reading collapses into two postures: agreement and rejection. Both are cheap. Agreement costs no effort because it asks nothing of the reader. Rejection is cheap in a different way: it requires only that the reader has an opinion, and most of us always do. The four questions break the symmetry by demanding specifics before the verdict.',
  );
  doc.moveDown(1);

  doc.font('Times-Bold').fontSize(13).text('3. A practical limit');
  doc.font('Times-Roman').fontSize(11).text(
    'There is a practical limit to how deeply one can read. Time is finite, attention is finite, and the most rewarding books are the ones that take the longest. The four questions are a tool for triage: they help the reader decide which parts of a text deserve the slow treatment, and which can be carried away by summary. The point is not to read more. The point is to read what matters.',
  );
  doc.addPage();
  doc.font('Times-Bold').fontSize(13).text('4. Acknowledgements');
  doc.font('Times-Roman').fontSize(11).text(
    'This note is a placeholder for the RAGülli sample-files bundle. It is intentionally short. The point is to give the user something to drop into the dropzone that will, end-to-end, exercise the parsing, chunking, embedding, retrieval, and citation pipeline. Real reading happens elsewhere.',
  );
}

function contract(doc) {
  doc.font('Times-Bold').fontSize(18).text('Sample Consulting Agreement', { align: 'center' });
  doc.moveDown(1);
  doc.font('Times-Roman').fontSize(11).text('This Agreement is entered into as of the Effective Date by and between Acme Co. ("Client") and Solis Advisory ("Consultant").');
  doc.moveDown(1);

  doc.font('Times-Bold').fontSize(12).text('1. Scope of Work');
  doc.font('Times-Roman').fontSize(11).text(
    'Consultant shall provide advisory services as described in one or more Statements of Work executed under this Agreement. Each Statement of Work shall specify deliverables, timeline, and fees.',
  );
  doc.moveDown(1);

  doc.font('Times-Bold').fontSize(12).text('2. Term and Termination');
  doc.font('Times-Roman').fontSize(11).text(
    'This Agreement shall commence on the Effective Date and continue until terminated by either party upon thirty (30) days written notice. Upon termination, Client shall pay for all services rendered through the effective date of termination.',
  );
  doc.moveDown(1);

  doc.font('Times-Bold').fontSize(12).text('3. Fees and Payment');
  doc.font('Times-Roman').fontSize(11).text(
    'Client shall pay Consultant the fees set forth in each Statement of Work. Invoices are due net thirty (30) days from the invoice date. Late payments shall accrue interest at one and one-half percent (1.5%) per month or the maximum rate permitted by law, whichever is less.',
  );
  doc.moveDown(1);

  doc.font('Times-Bold').fontSize(12).text('4. Confidentiality');
  doc.font('Times-Roman').fontSize(11).text(
    'Each party shall hold in confidence all non-public information of the other party identified as confidential or that reasonably should be understood to be confidential. The confidentiality obligations shall survive termination for a period of three (3) years.',
  );
  doc.moveDown(1);

  doc.font('Times-Bold').fontSize(12).text('5. Limitation of Liability');
  doc.font('Times-Roman').fontSize(11).text(
    'Except for breaches of confidentiality or indemnification obligations, neither party shall be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with this Agreement, even if advised of the possibility of such damages. Each party\'s total liability shall not exceed the fees paid in the twelve (12) months preceding the claim.',
  );
}

function chapterMd() {
  return `# Chapter 1 — The Reading Companion

Most software for reading asks the reader to do less. The reading companion asks the reader to do more, and makes the doing easier. That is the whole idea.

The tradition of the study companion is older than software. For centuries, readers kept notebooks. They copied out passages, they argued with the page in the margin, they wrote the date in the corner so they could find the place again. The notebook was a second brain, offloadable, returnable, losable, but always there.

The reading companion, in this sense, is not a new thing. It is a notebook with a search box.

## What the search box changes

The notebook is a way of remembering. The search box is a way of re-finding. The two are not the same. Remembering is generative; the act of writing fixes a thought. Re-finding is indexical; the act of searching assumes the thought is already there, somewhere, and only the path to it is missing.

A good reading companion does both. It lets the reader fix a thought, and it lets the reader return to it. The two operations reinforce each other: the more you write, the more you can find. The more you can find, the more you are willing to write.

## The four questions, again

A book is many things at once. It is an argument, an artifact, a record of a moment, a record of a life. The reading companion, like the notebook, is a tool for the reader to choose which of these to engage with. The four questions — what is the author trying to show, what would have to be true for the argument to fail, what evidence is offered, and who else has a stake — are not a method. They are a habit. A habit, like a notebook, is something you keep.

The reading companion is, at its best, a small private library that knows what you have read. It does not replace the notebook. It remembers the notebook for you.
`;
}

function articleHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>A short note on attention</title>
    <meta name="author" content="Sample Author" />
  </head>
  <body>
    <article>
      <h1>A short note on attention</h1>
      <p>Attention is the currency of reading. The reader brings it; the text earns it. This article is about the second half of that transaction, and why most software for reading optimizes the wrong side.</p>
      <h2>The economics of a paragraph</h2>
      <p>A paragraph that earns attention does not announce itself. It does not open with a question it then refuses to answer, or with a statistic that exists to be repeated. It opens with the next sentence, and it earns the one after that, and so on. The reader, on the other side, is not a passive recipient. The reader is the one who decides, sentence by sentence, whether the next sentence is worth the cost of attending to it.</p>
      <h2>Why the cost matters</h2>
      <p>The cost of attending to a sentence is small, but it is not zero. A reader who is asked to attend to a thousand sentences a day is asked to spend a thousand small coins. The writer who is aware of this spends the reader's coins carefully. The writer who is not aware of it spends them anyway, and wonders why the reader stops at paragraph three.</p>
      <h2>The reading companion, again</h2>
      <p>The reading companion does not change the economics. It changes the record. The reader, having decided which sentences are worth the coin, can return to them. The writer, having been recorded, can be argued with. The argument, having been recorded, can be returned to. That is the whole loop.</p>
    </article>
  </body>
</html>
`;
}

async function exists(rel) {
  try {
    await fs.access(resolve(OUT, rel));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('build-samples: generating sample files');
  await ensureOut();
  // Skip files that already exist; this keeps the build idempotent and
  // avoids spurious diffs on every `pnpm build` run. To force a rebuild,
  // delete the files in public/sample-files/ first.
  if (!(await exists('sample-paper.pdf'))) {
    await writePdf('sample-paper.pdf', paper);
  }
  if (!(await exists('sample-contract.pdf'))) {
    await writePdf('sample-contract.pdf', contract);
  }
  if (!(await exists('sample-chapter.md'))) {
    await fs.writeFile(resolve(OUT, 'sample-chapter.md'), chapterMd(), 'utf8');
  }
  if (!(await exists('sample-article.html'))) {
    await fs.writeFile(resolve(OUT, 'sample-article.html'), articleHtml(), 'utf8');
  }
  console.log('build-samples: done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
