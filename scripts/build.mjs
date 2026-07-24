import { cp, rm, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
await import('./generate-management-catalog.mjs');
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('chamah-manager-portal', 'dist', { recursive: true });
await mkdir(join('dist', 'vendor'), { recursive: true });
await cp(join('node_modules', 'exceljs', 'dist', 'exceljs.min.js'), join('dist', 'vendor', 'exceljs.min.js'));
await cp(join('node_modules', 'xlsx', 'dist', 'xlsx.full.min.js'), join('dist', 'vendor', 'xlsx.full.min.js'));
const portalSource = 'chamah-manager-portal/new';
for (const entry of await readdir(portalSource)) {
  await cp(join(portalSource, entry), join('dist', entry), { recursive: true });
}
console.log('Built the new portal at the deployment root');
