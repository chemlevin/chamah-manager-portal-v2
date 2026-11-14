#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export function inspectMigrations(entries) {
  const byVersion = new Map();
  const issues = [];
  for (const entry of entries) {
    const match = entry.name.match(/^(\d+)_.*\.sql$/);
    if (!match) { issues.push(`invalid migration filename: ${entry.name}`); continue; }
    if (byVersion.has(match[1])) issues.push(`duplicate migration version: ${match[1]}`);
    byVersion.set(match[1], entry);
  }
  const ordered = [...byVersion.keys()].sort();
  for (const version of ordered) for (const dependency of byVersion.get(version).dependencies) {
    if (!byVersion.has(dependency)) issues.push(`${version} depends on missing migration ${dependency}`);
    else if (dependency >= version) issues.push(`${version} depends on non-prior migration ${dependency}`);
  }
  return { ordered, issues };
}

async function readLocal(dir) {
  const names = (await readdir(dir)).filter(name => name.endsWith('.sql'));
  return Promise.all(names.map(async name => ({
    name,
    dependencies: [...(await readFile(join(dir, name), 'utf8')).matchAll(/^\s*--\s*Depends-On:\s*(\d+)(?:\.sql)?\s*$/gim)].map(m => m[1])
  })));
}

export async function runPreflight({ migrationsDir = 'supabase/migrations', remoteVersions = null } = {}) {
  const local = inspectMigrations(await readLocal(migrationsDir));
  const issues = [...local.issues];
  const pending = [];
  if (remoteVersions) {
    const remote = new Set(remoteVersions);
    pending.push(...local.ordered.filter(version => !remote.has(version)));
    const unknown = [...remote].filter(version => !local.ordered.includes(version));
    if (unknown.length) issues.push(`remote has unknown migration versions: ${unknown.join(', ')}`);
    const firstPending = local.ordered.indexOf(pending[0]);
    if (firstPending >= 0 && local.ordered.slice(firstPending).some(version => !remote.has(version)) && local.ordered.slice(0, firstPending).some(version => !remote.has(version))) issues.push('pending migrations are not a contiguous ordered suffix');
  }
  return { ...local, pending, issues };
}

if (process.argv[1]?.endsWith('migration-preflight.mjs')) {
  const result = await runPreflight();
  if (result.issues.length) { console.error(result.issues.map(issue => `MIGRATION PREFLIGHT FAILED: ${issue}`).join('\n')); process.exitCode = 1; }
  else console.log(`Migration preflight passed: ${result.ordered.length} ordered migrations.`);
}
