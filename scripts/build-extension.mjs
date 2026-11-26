// Builds the Chrome extension into dist/extension and zips it for the Chrome Web Store.
// Usage: node scripts/build-extension.mjs
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'extension');
rmSync(join(root, 'dist'), { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const f of ['app.js', 'i18n.js', 'config.js', 'license.js', 'styles.css', 'fonts.css']) cpSync(join(root, f), join(out, f));
for (const d of ['fonts', 'icons']) cpSync(join(root, d), join(out, d), { recursive: true });
cpSync(join(root, 'extension'), out, { recursive: true });

// Extensions may not load remote scripts: drop the web-only Google sign-in script.
let html = readFileSync(join(root, 'index.html'), 'utf8');
html = html.replace(/\s*<script[^>]*data-web-only[^>]*><\/script>/g, '');
if (/<script[^>]+src="https?:/i.test(html)) throw new Error('index.html still references a remote script');
writeFileSync(join(out, 'index.html'), html);

const { version } = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
const zip = join(root, 'dist', `maymunkapak-extension-${version}.zip`);
if (existsSync(zip)) rmSync(zip);
execFileSync('zip', ['-qr', zip, '.'], { cwd: out });
console.log('Built', out, '\nZip  ', zip);
