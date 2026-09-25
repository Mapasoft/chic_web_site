import fs from 'node:fs';
import path from 'node:path';
import bundledPackages from '../data/stdlib.json' with { type: 'json' };

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
  core: 'Foundational types, numeric limits, status codes, and the allocator interface shared by core packages. Includes slice allocation, hashing, and equality helpers.',
  'core.atomic': 'Atomic load, store, exchange, and compare-exchange operations for booleans, integers, and raw pointers.',
  'core.containers': 'Generic containers for storing and organizing values: fixed-capacity arrays, growable array lists, hash maps, sets, and stacks. Includes initialization, cleanup, and container status codes.',
  'core.fmt': 'Formats values into strings or prints them to standard output. Supports format markers for numbers, text, characters, and other values.',
  'core.imgui': 'Immediate-mode user interface tools for windows, panels, buttons, menus, and text fields. Includes layout, styling, input handling, font support, and drawing commands.',
  'core.io': 'Reads and writes files as bytes, text, or lines. Includes directory operations and helpers for joining, normalizing, and inspecting file paths.',
  'core.json': 'Parses JSON into values, arrays, and objects, looks up object properties, and saves values as JSON files. Includes parse status codes and cleanup of allocated values.',
  'core.libc': 'Bindings to C library functions for memory allocation, byte and C-string operations, standard I/O, and process termination.',
  'core.math': 'Numeric constants and functions for trigonometry, rounding, clamping, and powers of two. Includes integer and floating-point points, sizes, and rectangles.',
  'core.memory': 'Heap, arena, permanent, and fixed-slot pool allocators for managing memory. Includes byte-copying and memory-filling helpers.',
  'core.net': 'IP address parsing, DNS resolution, and socket communication for TCP and UDP. Includes connection, listening, sending, and receiving operations for IPv4 and IPv6.',
  'core.os': 'Low-level file and directory handles, filesystem metadata, working-directory operations, and thread sleep. Wraps platform calls with shared status codes.',
  'core.posix': 'Low-level system bindings and compatibility wrappers for files, directories, sockets, and threading. Includes macOS bindings and Windows adapters.',
  'core.process': 'Runs external commands and returns their exit status, with optional capture of combined standard output and error. Currently implemented on macOS; other platforms return Unsupported.',
  'core.runtime': 'The default handler for failed slice bounds checks. Reports the invalid index and source location, then terminates the program.',
  'core.strings': 'String creation, copying, comparison, splitting, and concatenation, plus a growable string builder. Includes UTF-8 encoding, decoding, validation, and traversal.',
  'core.threading': 'Thread creation, joining, detaching, and yielding, plus mutexes and condition variables for synchronization. Includes macOS and Windows implementations.',
};

let stdlibPackages: StdlibPackage[] | null = null;

export function getStdlibPackages(): StdlibPackage[] {
  if (stdlibPackages) {
    return stdlibPackages;
  }

  let packages: Array<{ name: string; items: StdlibDocItem[] }> = bundledPackages as Array<{ name: string; items: StdlibDocItem[] }>;
  if (process.env.CHIC_SOURCE_DIR) {
    const coreRoot = path.join(process.env.CHIC_SOURCE_DIR, 'core');
    const packageFiles = getPackageFiles(coreRoot);
    if (Object.keys(packageFiles).length === 0) {
      throw new Error('CHIC_SOURCE_DIR must contain a core directory with Chic packages.');
    }
    packages = Object.entries(packageFiles).map(([name, files]) => ({
      name,
      items: files.flatMap((file) => extractDocItems(file, coreRoot)),
    }));
  }

  stdlibPackages = packages
    .map(({ name, items }) => buildPackage(name, items))
    .sort((a, b) => a.name.localeCompare(b.name));

  return stdlibPackages;
}

export function getStdlibPackage(slug: string): StdlibPackage | undefined {
  return getStdlibPackages().find((pkg) => pkg.slug === slug);
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

function buildPackage(name: string, items: StdlibDocItem[]): StdlibPackage {
  const funcCount = items.filter((item) => item.kind === 'func').length;
  const structCount = items.filter((item) => item.kind === 'struct').length;

  return {
    name,
    slug: name.replace(/\./g, '/'),
    description: packageDescriptions[name] ?? `${name} package reference.`,
    itemCount: items.length,
    funcCount,
    structCount,
    items,
  };
}

function extractDocItems(file: string, coreRoot: string): StdlibDocItem[] {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const items: StdlibDocItem[] = [];
  let commentLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const commentMatch = line.match(/^\s*\/\/\/? ?(.*)$/);

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
  } else if (lines.length > 1) {
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
