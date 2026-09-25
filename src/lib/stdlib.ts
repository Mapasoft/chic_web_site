import bundledPackages from '../data/stdlib.json' with { type: 'json' };
import { extractStdlib, type StdlibDocItem } from './stdlib-extractor.ts';
export type { DocKind, StdlibDocItem } from './stdlib-extractor.ts';

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
  'core.imgui': 'Immediate-mode user interface tools for windows, panels, buttons, menus, and text fields. Includes layout, styling, input, font faces and fallback chains, glyph atlases, text measurement, and drawing commands.',
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
    packages = extractStdlib(process.env.CHIC_SOURCE_DIR).packages;
  }

  stdlibPackages = packages
    .map(({ name, items }) => buildPackage(name, items))
    .sort((a, b) => a.name.localeCompare(b.name));

  return stdlibPackages;
}

export function getStdlibPackage(slug: string): StdlibPackage | undefined {
  return getStdlibPackages().find((pkg) => pkg.slug === slug);
}

export function getDocItemId(item: StdlibDocItem): string {
  return `${item.kind}-${item.name}-${item.source.replace(/[^a-zA-Z0-9_-]/g, '-')}-${item.line}`;
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
