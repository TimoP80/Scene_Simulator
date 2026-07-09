import { rmSync, mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const target = args.length > 0 ? args.join(' ') : '--dir';
const tempOutDir = join(tmpdir(), 'demoscene-build');

console.log('Cleaning local release folder...');
rmSync('release', { recursive: true, force: true });

console.log('Cleaning temporary build folder...');
rmSync(tempOutDir, { recursive: true, force: true });

console.log('Running build:all...');
execSync('npm run build:all', { stdio: 'inherit' });

console.log(`Running electron-builder for ${target}...`);
execSync(`npx electron-builder ${target} --config.directories.output="${tempOutDir}"`, { stdio: 'inherit' });

console.log('Creating local release folder...');
mkdirSync('release', { recursive: true });

console.log('Copying build artifacts back to local release folder...');
cpSync(tempOutDir, 'release', { recursive: true });

console.log('Build completed successfully!');
