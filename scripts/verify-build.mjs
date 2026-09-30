import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const collections = [
  { directory: 'stdlib', title: 'Packages', slug: name => name.replaceAll('.', '/') },
  { directory: 'vendors', title: 'Vendors', slug: name => name.replace(/^vendors\./, '').replaceAll('.', '/') },
].map(collection => ({
  ...collection,
  packages: JSON.parse(fs.readFileSync(new URL(`../src/data/${collection.directory}.json`, import.meta.url), 'utf8')),
  sources: JSON.parse(fs.readFileSync(new URL(`../src/data/${collection.directory}-sources.json`, import.meta.url), 'utf8')).files,
}));
const decode = text => text.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'" })[entity]);
const home = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
assert.match(home, /Chic Programming Language/);
assert.match(home, /Downloads are not yet available/);
assert.doesNotMatch(home, /get-started|Get Started|>Learn<\/a>/);
assert.match(home, /href="\/stdlib\/"[^>]*>\s*Packages\s*<\/a>/);
for (const collection of collections) {
  const { packages, sources, directory, title } = collection;
  assert.ok(packages.length > 0, `The public documentation must include ${directory} packages.`);
  assert.deepEqual(packages.map(p => p.name).sort(), [...new Set(sources.map(f => f.package))].sort(), 'Every source package needs a page.');
  const packageIndex = fs.readFileSync(new URL(`../dist/${directory}/index.html`, import.meta.url), 'utf8');
  assert.ok(packageIndex.includes(`>${title}</h1>`));
  const menus = [...home.matchAll(/<details class="doc-menu[^>]*>([\s\S]*?)<\/details>/g)];
  assert.equal(menus.length, 2, 'Desktop and mobile menus must both be present.');
  for (const [, menu] of menus) assert.ok(menu.includes(`href="/${directory}/"`), `Missing ${directory} navigation.`);
  for (const pkg of packages) {
    const slug = collection.slug(pkg.name);
    assert.ok(packageIndex.includes(`/${directory}/${slug}/`), `Missing package link: ${pkg.name}`);
    assert.ok(!home.includes(`/${directory}/${slug}/`), `Package listing still on homepage: ${pkg.name}`);
    const html = fs.readFileSync(new URL(`../dist/${directory}/${slug}/index.html`, import.meta.url), 'utf8');
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
const packages = collections.flatMap(collection => collection.packages);
console.log(`Verified homepage, package indexes and ${packages.length} package pages with ${packages.reduce((sum, pkg) => sum + pkg.items.length, 0)} API entries.`);
