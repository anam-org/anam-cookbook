import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = ['app', 'components', 'lib'];
const sourceFiles = [];
const sourceExtension = /\.(?:js|jsx|ts|tsx|mjs)$/;

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(absolute);
    else if (sourceExtension.test(entry.name)) sourceFiles.push(absolute);
  }
}

for (const directory of roots) collect(path.join(root, directory));
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (entry.isFile() && sourceExtension.test(entry.name)) {
    sourceFiles.push(path.join(root, entry.name));
  }
}

const forbidden = [
  /posthog\s*\.\s*init\s*\(/i,
  /googletagmanager\.com/i,
  /GTM-[A-Z0-9]+/,
  /phc_[A-Za-z0-9_-]+/,
  /\/(?:cookbook\/)?ingest(?:\/|['"`])/i,
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
