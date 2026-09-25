import fs from 'node:fs';

if (!process.env.CHIC_SOURCE_DIR) {
  throw new Error('Set CHIC_SOURCE_DIR to the local Chic checkout to refresh the documentation.');
}

const { getStdlibPackages } = await import('../src/lib/stdlib.ts');
// Store only the API documentation already shown on the site, never source files.
const packages = getStdlibPackages().map(({ name, items }) => ({ name, items }));
fs.writeFileSync(new URL('../src/data/stdlib.json', import.meta.url), `${JSON.stringify(packages, null, 2)}\n`);
console.log(`Updated public API documentation for ${packages.length} packages.`);
