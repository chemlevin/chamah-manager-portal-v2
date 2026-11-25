import { readFileSync, writeFileSync } from 'node:fs';

const preview = JSON.parse(readFileSync(new URL('./preview-calendar-859.json', import.meta.url)));
const production = JSON.parse(readFileSync(new URL('./production-calendar-859.json', import.meta.url)));
if (preview.rows.length !== production.rows.length) throw new Error('Row counts differ');

const rows = preview.rows.map((left, index) => {
  const right = production.rows[index];
  if (left.entity !== right.entity) throw new Error(`Entity order differs at ${index + 1}`);
  const fields = [...new Set([...Object.keys(left.values), ...Object.keys(right.values)])].sort();
  const differences = fields.flatMap((field) => {
    const a = left.values[field];
    const b = right.values[field];
    return JSON.stringify(a) === JSON.stringify(b) ? [] : [{ field, preview: a ?? null, production: b ?? null }];
  });
  return { row: index + 1, entity: left.entity, differences };
});

const changed = rows.filter((row) => row.differences.length);
const byEntity = {};
const byField = {};
for (const row of changed) {
  byEntity[row.entity] = (byEntity[row.entity] ?? 0) + 1;
  for (const difference of row.differences) {
    const key = `${row.entity}.${difference.field}`;
    byField[key] = (byField[key] ?? 0) + 1;
  }
}
const report = {
  preview_rows: preview.rows.length,
  production_rows: production.rows.length,
  unchanged_rows: rows.length - changed.length,
  changed_rows: changed.length,
  differences_by_entity: byEntity,
  differences_by_field: byField,
  rows,
};
writeFileSync(new URL('./preview-production-row-diff.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, rows: undefined }, null, 2));
