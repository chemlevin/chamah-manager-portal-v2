import { spawn } from 'node:child_process';

const update = process.argv.includes('--update');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false });
    child.on('error', (error) => {
      console.error(error.message);
      resolve(1);
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

let code = await run(npmCmd, ['run', 'build']);
if (code === 0) {
  const args = ['playwright', 'test'];
  if (update) args.push('--update-snapshots');
  code = await run(npxCmd, args);
}
await run(npmCmd, ['run', 'qa:report']);
process.exit(code);
