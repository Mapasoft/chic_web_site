import assert from 'node:assert/strict';
import fs from 'node:fs';

const packages = JSON.parse(fs.readFileSync(new URL('../src/data/stdlib.json', import.meta.url), 'utf8'));
assert.equal(packages.length, 17, 'The public documentation must include all 17 packages.');
const home = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
assert.match(home, /Chic Programming Language/);
assert.match(home, /Downloadable builds for macOS and Windows are not yet available/);
for (const pkg of packages) {
  const slug = pkg.name.replaceAll('.', '/');
  assert.ok(home.includes(`/stdlib/${slug}/`), `Missing package link: ${pkg.name}`);
  const html = fs.readFileSync(new URL(`../dist/stdlib/${slug}/index.html`, import.meta.url), 'utf8');
  assert.equal((html.match(/<article\b/g) ?? []).length, pkg.items.length, `Missing API entries: ${pkg.name}`);
  assert.doesNotMatch(html, /github|playground|open source|\/Users\//i);
}
assert.doesNotMatch(home, /github|playground|open source|\.\/chic compile/i);
console.log(`Verified homepage and ${packages.length} package pages with ${packages.reduce((sum, pkg) => sum + pkg.items.length, 0)} API entries.`);
