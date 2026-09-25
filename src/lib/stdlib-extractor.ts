import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export type DocKind = 'func' | 'struct';
export interface StdlibDocItem {
  name: string;
  kind: DocKind;
  signature: string;
  attributes: string[];
  conditions: string[];
  comment: string;
  summary: string;
  source: string;
  line: number;
}

interface Token { text: string; start: number; end: number; line: number; kind: 'code' | 'comment' | 'directive' }

// A source scanner, not a compiler: keep all conditional variants and never
// evaluate platform conditions or function bodies while generating documentation.
function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  while (pos < source.length) {
    if (/\s/.test(source[pos])) {
      if (source[pos++] === '\n') line++;
      continue;
    }
    const start = pos;
    const startLine = line;
    let kind: Token['kind'] = 'code';
    if (source.startsWith('//', pos) || source[pos] === '#') {
      kind = source[pos] === '#' ? 'directive' : 'comment';
      while (pos < source.length && source[pos] !== '\n') pos++;
    } else if (source.startsWith('/*', pos)) {
      kind = 'comment';
      pos += 2;
      let depth = 1;
      while (pos < source.length && depth > 0) {
        if (source.startsWith('/*', pos)) { depth++; pos += 2; }
        else if (source.startsWith('*/', pos)) { depth--; pos += 2; }
        else if (source[pos++] === '\n') line++;
      }
      if (depth) throw new Error(`Unterminated comment at line ${startLine}`);
    } else if (source[pos] === '"' || source[pos] === "'") {
      const quote = source[pos++];
      let closed = false;
      while (pos < source.length) {
        const ch = source[pos++];
        if (ch === '\n') line++;
        if (ch === '\\') { if (source[pos] === '\n') line++; pos++; }
        else if (ch === quote) { closed = true; break; }
      }
      if (!closed) throw new Error(`Unterminated literal at line ${startLine}`);
    } else {
      const word = source.slice(pos).match(/^[A-Za-z_][\w]*|^\d[\w.]*|^->|^::|^:=/);
      pos += word ? word[0].length : 1;
    }
    tokens.push({ text: source.slice(start, pos), start, end: pos, line: startLine, kind });
  }
  return tokens;
}

function closing(tokens: Token[], start: number): number {
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const stack = [pairs[tokens[start].text]];
  for (let i = start + 1; i < tokens.length; i++) {
    if (tokens[i].kind !== 'code') continue;
    const text = tokens[i].text;
    if (pairs[text]) stack.push(pairs[text]);
    else if ([')', ']', '}'].includes(text)) {
      if (text !== stack.pop()) throw new Error(`Mismatched delimiter at line ${tokens[i].line}`);
      if (!stack.length) return i;
    }
  }
  throw new Error(`Unclosed delimiter at line ${tokens[start].line}`);
}

function cleanComment(comments: string[], name: string): string {
  const lines = comments.flatMap(text => text.split('\n').map(line => line.replace(/^\/\/\/? ?/, '').trimEnd()))
    .filter(line => !/^[=\-_*\/\s]+$/.test(line));
  while (lines[0]?.trim() === '') lines.shift();
  const title = lines[0]?.match(new RegExp(`^${name}(?:<[^>]+>)?(?:\\s*[:-]\\s*|\\s+|$)(.*)$`));
  if (title) { if (title[1]) lines[0] = title[1]; else lines.shift(); }
  while (lines[0]?.trim() === '') lines.shift();
  while (lines.at(-1)?.trim() === '') lines.pop();
  return lines.join('\n');
}

export function extractDeclarations(source: string, sourcePath: string) {
  source = source.replace(/\r\n/g, '\n');
  const tokens = tokenize(source);
  const items: StdlibDocItem[] = [];
  const excluded: Array<{ name: string; kind: DocKind; line: number }> = [];
  const packageNames: string[] = [];
  const conditions: Array<{ expression: string; alternative: boolean }> = [];
  let comments: string[] = [];
  let attributes: string[] = [];
  for (let i = 0; i < tokens.length;) {
    const token = tokens[i];
    if (token.kind === 'comment') {
      // Block comments may contain disabled declarations, not documentation.
      if (token.text.startsWith('//')) comments.push(token.text);
      else comments = [];
      i++; continue;
    }
    if (token.kind === 'directive') {
      const text = token.text.replace(/\/\/.*$/, '').trim();
      if (text.startsWith('#if ')) conditions.push({ expression: text.slice(4).trim(), alternative: false });
      else if (text === '#else') {
        const active = conditions.at(-1);
        if (!active || active.alternative) throw new Error(`${sourcePath}:${token.line}: unmatched #else`);
        active.alternative = true;
      } else if (text === '#end') {
        if (!conditions.pop()) throw new Error(`${sourcePath}:${token.line}: unmatched #end`);
      } else if (text.startsWith('#package ')) {
        const match = text.match(/^#package ([A-Za-z_]\w*)$/);
        if (!match) throw new Error(`${sourcePath}:${token.line}: invalid #package`);
        packageNames.push(match[1]);
      } else throw new Error(`${sourcePath}:${token.line}: unsupported top-level directive ${text}`);
      comments = []; attributes = []; i++; continue;
    }
    if (token.text === '@') {
      let end = i + 1;
      if (!/^[A-Za-z_]\w*$/.test(tokens[end]?.text ?? '')) throw new Error(`${sourcePath}:${token.line}: invalid attribute`);
      if (tokens[end + 1]?.text === '(') end = closing(tokens, end + 1);
      attributes.push(source.slice(token.start, tokens[end].end));
      i = end + 1; continue;
    }
    const kind = tokens[i + 2]?.text;
    if (/^[A-Za-z_]\w*$/.test(token.text) && tokens[i + 1]?.text === ':' && (kind === 'func' || kind === 'struct')) {
      let end = i + 3;
      let body = -1;
      const imported = attributes.some(a => /^@import_func\b/.test(a));
      for (; end < tokens.length; end++) {
        const part = tokens[end];
        if (part.kind === 'comment') continue;
        if (part.text === '{') { body = end; break; }
        // Parenthesized parameters/defaults and tuple/slice return types can
        // span arbitrary lines, including nested composite literals.
        if (part.text === '(' || part.text === '[') { end = closing(tokens, end); continue; }
        if (imported && (part.kind === 'directive' || part.text === '@' || part.text === ';' ||
          (part.line > tokens[end - 1].line && part.text !== '->' && tokens[end - 1].text !== '->'))) break;
      }
      if (body < 0 && !imported) throw new Error(`${sourcePath}:${token.line}: declaration body not found`);
      const finish = body >= 0 ? closing(tokens, body) : end - 1;
      let signatureEnd = kind === 'struct' ? finish + 1 : end;
      while (tokens[signatureEnd - 1]?.kind === 'comment') signatureEnd--;
      // Preserve source whitespace, defaults and field comments verbatim.
      const signature = source.slice(token.start, tokens[signatureEnd - 1].end).trimEnd();
      if (attributes.some(a => /^@(internal|private)\b/.test(a))) {
        excluded.push({ name: token.text, kind, line: token.line });
      } else {
        const comment = cleanComment(comments, token.text);
        items.push({ name: token.text, kind, signature, attributes: [...attributes],
          conditions: conditions.map(c => c.alternative ? `!(${c.expression})` : c.expression),
          comment, summary: comment.split(/\n\s*\n/)[0].replace(/\s+/g, ' ').trim(),
          source: sourcePath, line: token.line });
      }
      comments = []; attributes = [];
      i = body >= 0 ? finish + 1 : end;
      continue;
    }
    // Skip imports, aliases, constants, enums and other globals as complete
    // statements; declarations in their bodies must not become public entries.
    comments = []; attributes = [];
    const firstLine = token.line;
    do {
      if (['{', '(', '['].includes(tokens[i].text)) i = closing(tokens, i);
      i++;
    } while (i < tokens.length && tokens[i].line === firstLine && tokens[i].kind !== 'directive');
  }
  if (conditions.length) throw new Error(`${sourcePath}: unclosed #if`);
  if (packageNames.length > 1) throw new Error(`${sourcePath}: multiple #package declarations`);
  return { items, excluded, packageName: packageNames[0] };
}

export function extractStdlib(sourceDir: string) {
  const root = path.join(sourceDir, 'core');
  const packages = new Map<string, StdlibDocItem[]>();
  const roots = new Map<string, string>();
  const files: Array<{ path: string; package: string; sha256: string; publicStructs: number; publicFunctions: number; internalDeclarations: number }> = [];
  function visit(dir: string, parentName: string, declaredParent: boolean) {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).filter(e => !e.name.startsWith('.')).sort((a, b) => a.name.localeCompare(b.name));
    const sources = entries.filter(e => e.isFile() && e.name.endsWith('.chic')).map(e => {
      const fullPath = path.join(dir, e.name);
      const sourcePath = `core/${path.relative(root, fullPath).split(path.sep).join('/')}`;
      const source = fs.readFileSync(fullPath, 'utf8');
      return { sourcePath, source, parsed: extractDeclarations(source, sourcePath) };
    });
    const declarations = sources.map(s => s.parsed.packageName).filter(Boolean);
    if (declarations.length > 1) throw new Error(`${dir}: multiple package declarations`);
    const local = declarations[0];
    const name = dir === root ? (local ?? 'core') : local ? `${parentName}.${local}` : declaredParent ? parentName : `${parentName}.${path.basename(dir)}`;
    if (dir === root && name !== 'core') throw new Error('Expected the core package root');
    if (local || !declaredParent) {
      if (roots.has(name)) throw new Error(`Duplicate package ${name}`);
      roots.set(name, dir);
    }
    if (sources.length) {
      if (!packages.has(name)) packages.set(name, []);
      for (const { sourcePath, source, parsed } of sources) {
        packages.get(name)!.push(...parsed.items);
        files.push({ path: sourcePath, package: name, sha256: createHash('sha256').update(source).digest('hex'),
          publicStructs: parsed.items.filter(i => i.kind === 'struct').length,
          publicFunctions: parsed.items.filter(i => i.kind === 'func').length,
          internalDeclarations: parsed.excluded.length });
      }
    }
    for (const entry of entries.filter(e => e.isDirectory())) visit(path.join(dir, entry.name), name, declaredParent || !!local);
  }
  visit(root, '', false);
  if (!files.length) throw new Error('CHIC_SOURCE_DIR must contain core packages with Chic source files');
  return { packages: [...packages].map(([name, items]) => ({ name, items })).sort((a, b) => a.name.localeCompare(b.name)), files };
}
