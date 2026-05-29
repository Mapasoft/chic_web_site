import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type DocKind = 'func' | 'struct';

export interface StdlibDocItem {
  name: string;
  kind: DocKind;
  signature: string;
  comment: string;
  summary: string;
  source: string;
  line: number;
}

export interface StdlibPackage {
  name: string;
  slug: string;
  description: string;
  itemCount: number;
  funcCount: number;
  structCount: number;
  items: StdlibDocItem[];
}

const packageDescriptions: Record<string, string> = {
  core: 'Core aliases, status values, allocator interfaces, and primitive helpers.',
  'core.atomic': 'Atomic primitives and low-level synchronization helpers.',
  'core.collections': 'Generic arrays, lists, maps, and collection status helpers.',
  'core.fmt': 'Formatting helpers for text, integers, floats, and output buffers.',
  'core.io': 'Stream, file, and console I/O primitives.',
  'core.json': 'JSON value types and parsing helpers.',
  'core.libc': 'C standard library bindings used by the runtime and core packages.',
  'core.math': 'Math constants and numeric helpers.',
  'core.memory': 'Allocator implementations and memory-management helpers.',
  'core.os': 'Operating-system abstractions and platform services.',
  'core.posix': 'POSIX bindings and platform-specific system calls.',
  'core.strings': 'String helpers and growable string builders.',
  'core.threading': 'Thread creation, joining, mutexes, and platform thread adapters.',
};

let stdlibPackages: StdlibPackage[] | null = null;

export function getStdlibPackages(): StdlibPackage[] {
  if (stdlibPackages) {
    return stdlibPackages;
  }

  const coreRoot = path.join(getChicSourceRoot(), 'core');
  const packageFiles = getPackageFiles(coreRoot);

  stdlibPackages = Object.entries(packageFiles)
    .map(([name, files]) => buildPackage(name, files, coreRoot))
    .sort((a, b) => a.name.localeCompare(b.name));

  return stdlibPackages;
}

export function getStdlibPackage(slug: string): StdlibPackage | undefined {
  return getStdlibPackages().find((pkg) => pkg.slug === slug);
}

function getChicSourceRoot(): string {
  if (process.env.CHIC_SOURCE_DIR) {
    return process.env.CHIC_SOURCE_DIR;
  }

  return fileURLToPath(new URL('../../../chic', import.meta.url));
}

function getPackageFiles(coreRoot: string): Record<string, string[]> {
  const packageFiles: Record<string, string[]> = {};

  if (!fs.existsSync(coreRoot)) {
    return packageFiles;
  }

  for (const entry of fs.readdirSync(coreRoot, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const entryPath = path.join(coreRoot, entry.name);

    if (entry.isFile() && entry.name.endsWith('.chic')) {
      addPackageFile(packageFiles, 'core', entryPath);
      continue;
    }

    if (entry.isDirectory()) {
      const packageName = `core.${entry.name}`;
      for (const file of walkChicFiles(entryPath)) {
        addPackageFile(packageFiles, packageName, file);
      }
    }
  }

  return packageFiles;
}

function addPackageFile(packageFiles: Record<string, string[]>, packageName: string, file: string): void {
  packageFiles[packageName] ??= [];
  packageFiles[packageName].push(file);
}

function walkChicFiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkChicFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.chic')) {
      files.push(entryPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function buildPackage(name: string, files: string[], coreRoot: string): StdlibPackage {
  const items = files.flatMap((file) => extractDocItems(file, coreRoot));
  const funcCount = items.filter((item) => item.kind === 'func').length;
  const structCount = items.filter((item) => item.kind === 'struct').length;

  return {
    name,
    slug: name.replace(/\./g, '/'),
    description: packageDescriptions[name] ?? describePackage(name, items),
    itemCount: items.length,
    funcCount,
    structCount,
    items,
  };
}

function describePackage(name: string, items: StdlibDocItem[]): string {
  if (items[0]?.summary) {
    return items[0].summary;
  }

  return `${name} package declarations and helpers.`;
}

function extractDocItems(file: string, coreRoot: string): StdlibDocItem[] {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const items: StdlibDocItem[] = [];
  let commentLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const commentMatch = line.match(/^\s*\/\/ ?(.*)$/);

    if (commentMatch) {
      commentLines.push(commentMatch[1]);
      continue;
    }

    if (/^\s*$/.test(line) || /^\s*@/.test(line)) {
      continue;
    }

    const declaration = parseDeclaration(lines, index);

    if (declaration && commentLines.length > 0) {
      const cleanedComment = cleanComment(commentLines, declaration.name);

      if (cleanedComment.length > 0) {
        items.push({
          ...declaration,
          comment: cleanedComment.join('\n'),
          summary: firstParagraph(cleanedComment),
          source: `core/${path.relative(coreRoot, file)}`,
          line: index + 1,
        });
      }
    }

    commentLines = [];
  }

  return items;
}

function parseDeclaration(lines: string[], startIndex: number): Pick<StdlibDocItem, 'name' | 'kind' | 'signature'> | null {
  const match = lines[startIndex].match(/^\s*([A-Za-z_]\w*)\s*:\s*(func|struct)\b/);

  if (!match) {
    return null;
  }

  const signatureLines: string[] = [];

  for (let index = startIndex; index < Math.min(lines.length, startIndex + 8); index += 1) {
    signatureLines.push(lines[index].trim());

    if (lines[index].includes('{')) {
      const signature = signatureLines.join(' ').replace(/\s+/g, ' ').replace(/\s*\{.*$/, '').trim();

      return {
        name: match[1],
        kind: match[2] as DocKind,
        signature,
      };
    }
  }

  return null;
}

function cleanComment(lines: string[], declarationName: string): string[] {
  const cleaned = lines
    .map((line) => line.trimEnd())
    .filter((line) => !isDivider(line.trim()));

  trimEmpty(cleaned);
  removeRepeatedTitle(cleaned, declarationName);
  trimEmpty(cleaned);

  return cleaned;
}

function isDivider(line: string): boolean {
  return line.length > 0 && /^[=\-_*\/\s]+$/.test(line);
}

function removeRepeatedTitle(lines: string[], declarationName: string): void {
  if (lines.length === 0) {
    return;
  }

  const escapedName = declarationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const titlePattern = new RegExp(`^${escapedName}(?:<[^>]+>)?\\s*(?::|-)?\\s*(.*)$`);
  const titleMatch = lines[0].trim().match(titlePattern);

  if (!titleMatch) {
    return;
  }

  const titleText = titleMatch[1]?.trim();

  if (titleText) {
    lines[0] = titleText;
  } else {
    lines.shift();
  }
}

function trimEmpty(lines: string[]): void {
  while (lines[0]?.trim() === '') {
    lines.shift();
  }

  while (lines.at(-1)?.trim() === '') {
    lines.pop();
  }
}

function firstParagraph(lines: string[]): string {
  const paragraph: string[] = [];

  for (const line of lines) {
    if (line.trim() === '') {
      if (paragraph.length > 0) {
        break;
      }

      continue;
    }

    paragraph.push(line.trim());
  }

  return paragraph.join(' ');
}
