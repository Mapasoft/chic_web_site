import fs from 'node:fs';
import assert from 'node:assert/strict';
import { extractStdlib } from '../src/lib/stdlib-extractor.ts';

if (!process.env.CHIC_SOURCE_DIR) {
  throw new Error('Set CHIC_SOURCE_DIR to the local Chic checkout to refresh the documentation.');
}

const { packages, files } = extractStdlib(process.env.CHIC_SOURCE_DIR);
// Track source fingerprints without publishing local paths or implementation bodies.
const outputs = [
  ['../src/data/stdlib.json', packages],
  ['../src/data/stdlib-sources.json', { files }],
];
for (const [relative, value] of outputs) {
  const url = new URL(relative, import.meta.url);
  const text = `${JSON.stringify(value, null, 2)}\n`;
  if (process.argv.includes('--check')) assert.equal(fs.readFileSync(url, 'utf8'), text, `${relative} is out of date; run docs:refresh.`);
  else fs.writeFileSync(url, text);
}
console.log(`${process.argv.includes('--check') ? 'Verified' : 'Updated'} ${packages.length} packages from ${files.length} source files: ${packages.reduce((n, p) => n + p.items.length, 0)} public declarations.`);
