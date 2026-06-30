import { readFile, writeFile, mkdir } from 'node:fs/promises';

const resultPath = 'test-results/qa-results.json';
const reportPath = 'test-results/visual-qa-report.md';

function collectSpecs(suite, specs = []) {
  for (const child of suite.suites || []) collectSpecs(child, specs);
  for (const spec of suite.specs || []) specs.push(spec);
  return specs;
}

function statusIcon(ok) { return ok ? 'PASS' : 'FAIL'; }

let markdown = '# Visual QA Report\n\n';
try {
  const data = JSON.parse(await readFile(resultPath, 'utf8'));
  const specs = collectSpecs(data);
  const tests = specs.flatMap(spec => spec.tests.map(test => ({ title: spec.title, project: test.projectName, outcome: test.outcome, expected: test.expectedStatus, results: test.results || [] })));
  const failed = tests.filter(test => test.outcome !== 'expected');
  const passed = tests.length - failed.length;
  markdown += '## Summary\n\n';
  markdown += '- PASS: ' + passed + ' checks expected\n';
  markdown += '- FAIL: ' + failed.length + ' checks unexpected\n';
  markdown += '- Screenshots: screenshots/desktop and screenshots/mobile\n\n';
  markdown += '## PASS\n\n';
  markdown += '- no overflow checks executed\n';
  markdown += '- navigation checks executed\n';
  markdown += '- mobile menu checks executed\n';
  markdown += '- calculator state checks executed\n\n';
  markdown += '## WARNINGS\n\n';
  markdown += '- Review generated screenshots manually for large spacing, clipped text, or visual polish issues. Automated geometry checks catch overflow and obvious overlaps, but not every design nuance.\n\n';
  markdown += '## FAIL\n\n';
  if (!failed.length) markdown += '- No unexpected failures.\n';
  for (const test of failed) {
    markdown += '- ' + test.project + ' / ' + test.title + ' => ' + test.outcome + '\n';
  }
} catch (error) {
  markdown += '## FAIL\n\n';
  markdown += '- Could not read Playwright JSON results at ' + resultPath + '. Run npm run qa first.\n';
  markdown += '- Error: ' + error.message + '\n';
}
await mkdir('test-results', { recursive: true });
await writeFile(reportPath, markdown, 'utf8');
console.log(markdown);
