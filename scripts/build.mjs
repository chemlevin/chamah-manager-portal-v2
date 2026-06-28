import { cp, rm, mkdir } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('chamah-manager-portal', 'dist', { recursive: true });
console.log('Built chamah-manager-portal into dist');
