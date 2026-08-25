import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const roots = ['app', 'components', 'lib'];
const sourceFiles = [];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(absolute);
    else if (/\.(?:js|jsx|ts|tsx|mjs)$/.test(entry.name)) sourceFiles.push(absolute);
  }
}

for (const directory of roots) collect(path.join(root, directory));
sourceFiles.push(path.join(root, 'next.config.mjs'));

const forbidden = [
  /posthog\s*\.\s*init\s*\(/i,
  /googletagmanager\.com/i,
  /GTM-[A-Z0-9]+/,
  /phc_[A-Za-z0-9_-]+/,
  /\/cookbook\/ingest/,
];
const violations = [];

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(source)) {
      violations.push(`${path.relative(root, file)}: ${pattern}`);
    }
  }
}

if (violations.length) {
  console.error(
    'Cookbook may emit events and render consent UI, but anam-website-proxy is the only analytics initializer:\n' +
      violations.map((violation) => `- ${violation}`).join('\n'),
  );
  process.exit(1);
}

console.log('Cookbook contains no PostHog or GTM initializer.');
