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
// `--publish never`: electron-builder's default publish mode is
// onTagOrDraft, so on a tag-push run it would try to upload to GitHub
// Releases itself and hard-fail with "GitHub Personal Access Token is
// not set". Release publishing is owned by the CI workflow's
// softprops/action-gh-release step (and by the manual gh release flow)
// — the build only produces artifacts, it never uploads them.
execSync(`npx electron-builder ${target} --publish never --config.directories.output="${tempOutDir}"`, { stdio: 'inherit' });

console.log('Creating local release folder...');
mkdirSync('release', { recursive: true });

console.log('Copying build artifacts back to local release folder...');
cpSync(tempOutDir, 'release', { recursive: true });

console.log('Build completed successfully!');
