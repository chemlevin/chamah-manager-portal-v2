'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { parseTamaWords } = require('./tama-parser.js');
const { buildOperationalPreviewRequest } = require('./tama-operational-adapter.js');

const REPORTS = Object.freeze({
  'September-2026.pdf': { reportMonth: '2026-09-01', childCount: 205, total: 191302 },
  'October-2026-1.pdf': { reportMonth: '2026-10-01', childCount: 245, total: 262867 },
  'October-2026-2.pdf': { reportMonth: '2026-10-01', childCount: 270, total: 87240 }
});
const REPORT_DIR = path.resolve(process.cwd(), 'documents', 'tama-2026');

async function extractWords(file) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // Vercel runs this function in Node, where PDF.js cannot use a browser
  // Worker. Point its fake-worker loader at the bundled Node-resolvable
  // worker module instead of the package-relative default.
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
  const data = new Uint8Array(await fs.readFile(file));
  const doc = await pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;
  const words = [];
  for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent({ disableCombineTextItems: true });
    const items = content.items.filter(item => item.str && item.str.trim());
    const ids = items.filter(item => /^\d{9}$/.test(item.str.trim()));
    // These PDFs are laid out as vertical RTL columns: each child is a
    // physical x-column and the fields are stacked by physical y-position.
    // Rotate that layout into the parser's stable logical row/column model.
    for (const item of items) {
      if (!item.str || !item.str.trim()) continue;
      const x = item.transform[4];
      const y = viewport.height - item.transform[5];
      const id = ids.find(candidate => Math.abs(candidate.transform[4] - x) < 1.1);
      if (!id) continue;
      let logicalX = null;
      if (Math.abs(y - 205) < 3) logicalX = 410;
      else if (Math.abs(y - 225) < 8 || Math.abs(y - 230) < 8) logicalX = 360;
      else if (Math.abs(y - 276) < 8) logicalX = 320;
      else if (Math.abs(y - 317) < 8) logicalX = 285;
      else if (Math.abs(y - 348) < 8) logicalX = 245;
      else if (Math.abs(y - 358) < 8) logicalX = 225;
      else if (Math.abs(y - 435) < 8 || Math.abs(y - 446) < 8) logicalX = 205;
      else if (Math.abs(y - 523) < 8 || Math.abs(y - 533) < 8) logicalX = 185;
      if (logicalX === null) continue;
      const width = item.width || 1;
      const height = Math.abs(item.transform[3] || 8);
      words.push({
        text: item.str,
        xMin: logicalX,
        xMax: logicalX + 1,
        yMin: x,
        yMax: x + 1,
        original_xMin: x,
        original_xMax: x + width,
        original_yMin: viewport.height - y,
        original_yMax: viewport.height - y + height,
        page: pageNo
      });
    }
  }
  return words;
}

async function parseAllowedReport(filename) {
  const definition = REPORTS[filename];
  if (!definition) throw new Error(`TAMA_REPORT_NOT_ALLOWED:${filename}`);
  const file = path.join(REPORT_DIR, filename);
  const words = await extractWords(file);
  const parsed = parseTamaWords(words, { sourceFilename: filename, reportMonth: definition.reportMonth });
  const regularTotal = parsed.movements.filter(m => m.movement_type === 'REGULAR').reduce((sum, m) => sum + (m.amount || 0), 0);
  const movementTotal = parsed.movements.reduce((sum, m) => sum + (m.amount || 0), 0);
  parsed.report_header = { ...parsed.report_header, source_filename: filename, report_month: definition.reportMonth, expected_child_count: definition.childCount, expected_total: definition.total };
  parsed.reconciliation = { child_count: parsed.children.length, expected_child_count: definition.childCount, regular_total: regularTotal, movement_total: movementTotal, expected_total: definition.total, matches: parsed.children.length === definition.childCount && movementTotal === definition.total };
  return parsed;
}

async function buildTamaPreviewRequest(filenames) {
  if (!Array.isArray(filenames) || filenames.length !== 3 || new Set(filenames).size !== 3 || filenames.some(name => !REPORTS[name])) throw new Error('TAMA_REPORT_SET_INVALID');
  const reports = await Promise.all(filenames.map(parseAllowedReport));
  const invalid = reports.filter(report => !report.reconciliation.matches);
  if (invalid.length) {
    const error = new Error('TAMA_RECONCILIATION_FAILED');
    error.reports = invalid.map(report => report.reconciliation);
    throw error;
  }
  const request = buildOperationalPreviewRequest(reports, { sourceName: 'TAMA September and October 2026 reports' });
  return { request, reports, expected_child_rows: 720, expected_total: 541409 };
}

module.exports = { REPORTS, buildTamaPreviewRequest, parseAllowedReport };
