import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const handbookDirectory = 'docs/handbook';
const outputFile = 'chamah-manager-portal/new/management-catalog.generated.js';
const categoryLabels = {
  'accounting-rules': 'הנהלת חשבונות',
  'banking-rules': 'בנקאות',
  'budgeting-rules': 'תקציב',
  'calendar-rules': 'לוחות שנה ותקופות',
  'children-rules': 'ילדים ורישום',
  'classroom-rules': 'כיתות ורישוי',
  'compensation-rules': 'תגמול ושכר',
  'data-quality-rules': 'איכות נתונים',
  'employees-rules': 'עובדים',
  'import-rules': 'ייבוא נתונים',
  'master-data-rules': 'נתוני יסוד',
  'organization-rules': 'מבנה ארגוני',
  'payroll-rules': 'שכר והקצאות שכר',
  'reporting-rules': 'דיווח ודשבורדים',
  'roles-rules': 'תפקידי שכר',
  'staffing-rules': 'תקינה ושעות פעילות',
  'tuition-rules': 'שכר לימוד'
};

const files = (await readdir(handbookDirectory)).filter((file) => file.endsWith('.md')).sort();
const rules = [];
for (const file of files) {
  const sourceKey = basename(file, '.md');
  if (!categoryLabels[sourceKey]) continue;
  const content = await readFile(join(handbookDirectory, file), 'utf8');
  const matches = [...content.matchAll(/^BR-(\d{4}) \| (.+)$/gm)];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const end = matches[index + 1]?.index ?? content.length;
    const block = content.slice(match.index + match[0].length, end).split(/^---$/m)[0].trim();
    if (match[2].trim().toLowerCase() === 'reserved') continue;
    rules.push({
      id: `BR-${match[1]}`,
      title: match[2].trim(),
      category: sourceKey,
      categoryLabel: categoryLabels[sourceKey],
      source: `docs/handbook/${file}`,
      details: block
    });
  }
}

rules.sort((a, b) => a.id.localeCompare(b.id));
const categories = Object.entries(categoryLabels).map(([id, label]) => ({ id, label, count: rules.filter((rule) => rule.category === id).length }));
const output = `// Generated from docs/handbook by scripts/generate-management-catalog.mjs. Do not edit manually.\nexport const SYSTEM_RULES = ${JSON.stringify(rules, null, 2)};\nexport const RULE_CATEGORIES = ${JSON.stringify(categories, null, 2)};\n`;
await writeFile(outputFile, output, 'utf8');
console.log(`Generated ${rules.length} documented rules across ${categories.length} categories`);
