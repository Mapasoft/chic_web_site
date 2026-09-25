import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const packages = JSON.parse(fs.readFileSync(new URL('../src/data/stdlib.json', import.meta.url), 'utf8'));
const sources = JSON.parse(fs.readFileSync(new URL('../src/data/stdlib-sources.json', import.meta.url), 'utf8')).files;
assert.ok(packages.length > 0, 'The public documentation must include core packages.');
assert.deepEqual(packages.map(p => p.name).sort(), [...new Set(sources.map(f => f.package))].sort(), 'Every source package needs a page.');
const decode = text => text.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'" })[entity]);
const home = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
assert.match(home, /Chic Programming Language/);
assert.match(home, /Downloadable builds for macOS and Windows are not yet available/);
for (const pkg of packages) {
  const slug = pkg.name.replaceAll('.', '/');
  assert.ok(home.includes(`/stdlib/${slug}/`), `Missing package link: ${pkg.name}`);
  const html = fs.readFileSync(new URL(`../dist/stdlib/${slug}/index.html`, import.meta.url), 'utf8');
  assert.equal((html.match(/<article\b/g) ?? []).length, pkg.items.length, `Missing API entries: ${pkg.name}`);
  const renderedSignatures = [...html.matchAll(/<pre\b[^>]*><code>([\s\S]*?)<\/code><\/pre>/g)].map(m => decode(m[1])).sort();
  assert.deepEqual(renderedSignatures, pkg.items.map(i => [...i.attributes, i.signature].join('\n')).sort(), `Incorrect signatures or structure fields: ${pkg.name}`);
  for (const item of pkg.items) {
    assert.ok(sources.some(f => f.path === item.source && f.package === pkg.name), `Unknown source: ${item.source}`);
    assert.ok(!item.attributes.some(a => /^@(internal|private)\b/.test(a)), `Internal declaration: ${item.name}`);
    for (const condition of item.conditions) assert.ok(html.includes(condition.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')), `Missing source condition: ${item.name}`);
  }
  for (const file of sources.filter(f => f.package === pkg.name)) {
    assert.equal(pkg.items.filter(i => i.source === file.path && i.kind === 'struct').length, file.publicStructs);
    assert.equal(pkg.items.filter(i => i.source === file.path && i.kind === 'func').length, file.publicFunctions);
  }
  assert.doesNotMatch(html, /github|playground|open source|\/Users\//i);
}
assert.doesNotMatch(home, /github|playground|open source|\.\/chic compile/i);
assert.match(home, /href="mailto:admin@chic-lang.org"/);
assert.doesNotMatch(home, /Contact Martin/);
const homeText = decode(home.replace(/<[^>]*>/g, ''));
assert.match(homeText, /direction : func/);
assert.match(homeText, /switch \(color\)/);
assert.match(homeText, /grade : string = match \(score\)/);

// Check all navigation and per-declaration links, including overloaded names.
const dist = new URL('../dist/', import.meta.url);
const pages = fs.readdirSync(dist, { recursive: true }).filter(p => p.endsWith('.html'));
const pageIds = new Map(pages.map(file => {
  const html = fs.readFileSync(new URL(file, dist), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, `Duplicate anchor in ${file}`);
  return [file, new Set(ids)];
}));
for (const file of pages) {
  const html = fs.readFileSync(new URL(file, dist), 'utf8');
  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const target = new URL(decode(href), `https://www.chic-lang.org/${file}`);
    if (target.origin !== 'https://www.chic-lang.org') continue;
    const targetFile = target.pathname.endsWith('/') ? `${target.pathname.slice(1)}index.html` : target.pathname.slice(1);
    assert.ok(fs.existsSync(new URL(targetFile, dist)), `Broken link in ${file}: ${href}`);
    if (target.hash) assert.ok(pageIds.get(path.posix.normalize(targetFile))?.has(decodeURIComponent(target.hash.slice(1))), `Broken anchor in ${file}: ${href}`);
  }
}
console.log(`Verified homepage and ${packages.length} package pages with ${packages.reduce((sum, pkg) => sum + pkg.items.length, 0)} API entries.`);
