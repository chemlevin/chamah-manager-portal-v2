import { cp, rm, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
await import('./generate-management-catalog.mjs');
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('chamah-manager-portal', 'dist', { recursive: true });
await mkdir(join('dist', 'vendor'), { recursive: true });
await mkdir(join('dist', 'new', 'vendor'), { recursive: true });
await cp(join('node_modules', 'exceljs', 'dist', 'exceljs.min.js'), join('dist', 'vendor', 'exceljs.min.js'));
await cp(join('node_modules', 'xlsx', 'dist', 'xlsx.full.min.js'), join('dist', 'vendor', 'xlsx.full.min.js'));
await cp(join('node_modules', 'exceljs', 'dist', 'exceljs.min.js'), join('dist', 'new', 'vendor', 'exceljs.min.js'));
await cp(join('node_modules', 'xlsx', 'dist', 'xlsx.full.min.js'), join('dist', 'new', 'vendor', 'xlsx.full.min.js'));
const portalSource = 'chamah-manager-portal/new';
for (const entry of await readdir(portalSource)) {
  await cp(join(portalSource, entry), join('dist', entry), { recursive: true });
}

const deployFiles = (await readdir('dist', { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) => join(entry.parentPath || entry.path, entry.name))
  .sort();
const contentHash = createHash('sha256');
for (const file of deployFiles) contentHash.update(await readFile(file));
const buildId = String(process.env.PORTAL_BUILD_ID || contentHash.digest('hex').slice(0, 12)).replace(/[^a-zA-Z0-9_-]/g, '');
if (!buildId) throw new Error('PORTAL_BUILD_ID must contain a letter, number, underscore, or hyphen.');

const versionUrl = (url) => `${url}${url.includes('?') ? '&' : '?'}v=${buildId}`;
for (const file of deployFiles) {
  const extension = file.split('.').pop();
  if (!['html', 'js'].includes(extension)) continue;
  let content = await readFile(file, 'utf8');
  if (extension === 'html') {
    content = content.replace(/\b(src|href)=(['"])(?!https?:|data:|#)([^'"?]+\.(?:js|css|webmanifest))\2/g, (_match, attribute, quote, url) => `${attribute}=${quote}${versionUrl(url)}${quote}`);
  } else {
    content = content.replace(/(\bfrom\s*|\bimport\s*\()(['"])(\.{1,2}\/[^'"?]+\.js)\2/g, (_match, prefix, quote, url) => `${prefix}${quote}${versionUrl(url)}${quote}`);
  }
  await writeFile(file, content);
}

const appShell = deployFiles
  .filter((file) => /\.(?:html|js|css|webmanifest)$/.test(file))
  .map((file) => `/${file.slice('dist'.length + 1).replaceAll('\\', '/')}`)
  .filter((url) => !url.slice(1).includes('/') || url.startsWith('/vendor/'))
  .filter((url) => url !== '/service-worker.js')
  .map(versionUrl);
appShell.push('/');

const serviceWorker = `const BUILD_ID=${JSON.stringify(buildId)};
const CACHE_NAME='chamah-portal-'+BUILD_ID;
const APP_SHELL=${JSON.stringify(appShell)};
self.addEventListener('install',(event)=>{event.waitUntil(caches.open(CACHE_NAME).then((cache)=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',(event)=>{event.waitUntil(caches.keys().then((names)=>Promise.all(names.filter((name)=>name.startsWith('chamah-portal-')&&name!==CACHE_NAME).map((name)=>caches.delete(name)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',(event)=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then((response)=>{if(response.ok)caches.open(CACHE_NAME).then((cache)=>cache.put('/',response.clone()));return response;}).catch(()=>caches.match('/')));
    return;
  }
  if(url.searchParams.get('v')===BUILD_ID){
    event.respondWith(caches.match(event.request).then((cached)=>cached||fetch(event.request).then((response)=>{if(response.ok)caches.open(CACHE_NAME).then((cache)=>cache.put(event.request,response.clone()));return response;})));
  }
});
`;
await writeFile(join('dist', 'service-worker.js'), serviceWorker);
console.log(`Built the new portal at the deployment root (${buildId})`);
