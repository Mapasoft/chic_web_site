import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractDeclarations, extractStdlib, extractVendors } from '../src/lib/stdlib-extractor.ts';

const parse = source => extractDeclarations(source, 'core/example.chic');

test('skips single-line and multiline vendor link directives without losing APIs or source lines', () => {
  const { items } = parse(`#import_lib(.name = "audio", .local_path = "/api/")
#if DARWIN
#import_lib(
  .name = "graphics",
  .link_darwin = "-framework,Cocoa" // Link options are not API declarations.
)
@import_func draw : func(point : Point) -> bool
#end
Point : struct { x : f32 }`);
  assert.deepEqual(items.map(i => i.name), ['draw', 'Point']);
  assert.equal(items[0].line, 7);
  assert.equal(items[0].signature, 'draw : func(point : Point) -> bool');
  assert.deepEqual(items[0].conditions, ['DARWIN']);
  assert.equal(items[0].comment, '');
  assert.throws(() => parse('#import_lib "missing parentheses"'), /invalid #import_lib/);
  assert.throws(() => parse('#import_lib(\n.name = "unclosed"'), /Unclosed delimiter/);
});

test('discovers vendor packages and platform subpackages while excluding test and example programs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chic-vendors-test-'));
  try {
    const write = (file, source) => { const full = path.join(root, file); fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, source); };
    write('vendors/audio/api.chic', '#import_lib(.name = "audio")\n@import_func play : func()');
    write('vendors/graphics/api.chic', 'Point : struct { x : f32 }');
    write('vendors/graphics/darwin/api.chic', '@import_func draw : func()');
    write('vendors/raylib/api.chic', '@import_func InitWindow : func()');
    write('vendors/raylib/darwin/api.chic', '@import_func InitWindow : func()');
    write('vendors/fonts/api.chic', '#package fonts\nfont : func() {}\n@internal helper : func() {}');
    write('vendors/fonts/details/api.chic', 'metrics : func() {}');
    write('vendors/fonts/tests/probe.chic', 'main : func() {}');
    write('vendors/graphics/examples/demo.chic', 'main : func() {}');
    const { packages, files } = extractVendors(root);
    assert.deepEqual(packages.map(p => p.name), ['vendors.audio', 'vendors.fonts', 'vendors.graphics', 'vendors.graphics.darwin', 'vendors.raylib']);
    assert.deepEqual(packages.find(p => p.name === 'vendors.fonts').items.map(i => i.name), ['font', 'metrics']);
    assert.equal(files.length, 6);
    assert.ok(!files.some(f => f.path.startsWith('vendors/raylib/darwin/')));
    assert.ok(files.every(f => f.path.startsWith('vendors/') && /^[0-9a-f]{64}$/.test(f.sha256)));
    assert.ok(!packages.flatMap(p => p.items).some(i => ['main', 'helper'].includes(i.name)));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('includes uncommented structs, their fields/defaults and function signatures', () => {
  const { items } = parse(`Box : struct<T> {
    inline Base<T>
    value : T
    callback : funcptr(T) -> [bool, T]
    point : Point = Point{.x = 3, .y = 4}
}
@extension
get : func<T>(self : ^Box<T>, fallback : T) -> [T, bool] { return [self.value, true] }`);
  assert.equal(items.length, 2);
  assert.match(items[0].signature, /callback : funcptr\(T\) -> \[bool, T\]/);
  assert.match(items[0].signature, /point : Point = Point\{.x = 3, .y = 4\}/);
  assert.equal(items[1].signature, 'get : func<T>(self : ^Box<T>, fallback : T) -> [T, bool]');
  assert.deepEqual(items[1].attributes, ['@extension']);
  assert.equal(items[0].comment, '');
});

test('preserves imported overloads, inline attributes and bodyless void functions', () => {
  const { items } = parse(`// Load a value.
@import_func(.name = "load") load : func(ptr : ^i32) -> i32
@import_func load : func(ptr : ^u64) -> u64
@import_func free : func(ptr : ^void)
@inline
next : func() {}`);
  assert.equal(items.length, 4);
  assert.equal(items[0].signature, 'load : func(ptr : ^i32) -> i32');
  assert.equal(items[0].comment, 'Load a value.');
  assert.equal(items[1].comment, '');
  assert.equal(items[2].signature, 'free : func(ptr : ^void)');
  assert.deepEqual(items[0].attributes, ['@import_func(.name = "load")']);
});

test('does not truncate long signatures or composite defaults', () => {
  const { items } = parse(`make : func<T>(
    a : T,
    b : T,
    c : T,
    d : T,
    e : T,
    f : T,
    g : T,
    h : T,
    options : Options = Options{.flag = true}
) -> [T, bool]
{ return [a, true] }`);
  assert.equal(items.length, 1);
  assert.match(items[0].signature, /Options\{.flag = true\}/);
  assert.ok(items[0].signature.endsWith('-> [T, bool]'));
  assert.doesNotMatch(items[0].signature, /return/);
});

test('excludes internal declarations, locals and commented-out code', () => {
  const { items, excluded } = parse(`@internal
@nocontext
hidden : func() {}
@internal @import_func native : func() -> i32
@internal Hidden : struct { value : i32 }
/*
@extension
disabled : func() {}
*/
// public function
visible : func() {
    local : func() {}
    text := "fake : struct { } // text"
}
other : struct { value : i32 }
`);
  assert.deepEqual(items.map(i => i.name), ['visible', 'other']);
  assert.deepEqual(excluded.map(i => i.name), ['hidden', 'native', 'Hidden']);
  assert.equal(items[0].comment, 'public function');
});

test('preserves nested source conditions and conditional fields', () => {
  const { items } = parse(`#if CHIC_OS == builtin.OS.MacOs
run : func() -> i32 { return 0 }
#else
#if FEATURE
run : func() -> i32 { return 1 }
#end
#end
Address : struct {
#if CHIC_OS != builtin.OS.Windows
    length : u8
#end
    family : u16
}`);
  assert.deepEqual(items[0].conditions, ['CHIC_OS == builtin.OS.MacOs']);
  assert.deepEqual(items[1].conditions, ['!(CHIC_OS == builtin.OS.MacOs)', 'FEATURE']);
  assert.deepEqual(items[2].conditions, []);
  assert.match(items[2].signature, /#if CHIC_OS != builtin.OS.Windows\n    length : u8\n#end/);
});

test('keeps comments attached to their declaration and strips banner titles', () => {
  const { items } = parse(`// A file heading
import core = core
First : struct {}
/// ========
/// Second
///
/// Actual description.
@inline
Second : func() {}
// Internal helper.
@internal
hidden : func() {}
last : func() {}`);
  assert.equal(items[0].comment, '');
  assert.equal(items[1].comment, 'Actual description.');
  assert.equal(items[2].comment, '');
});

test('fails on unsupported directives and malformed source instead of silently omitting APIs', () => {
  assert.throws(() => parse('#else\nf : func() {}'), /unmatched/);
  assert.throws(() => parse('#if FLAG\nf : func() {}'), /unclosed/);
  assert.throws(() => parse('#unknown something'), /unsupported/);
  assert.throws(() => parse('Bad : struct {'), /Unclosed/);
  assert.throws(() => parse('/* disabled'), /Unterminated/);
});

test('discovers legacy packages and declared logical package roots without flattening', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chic-docs-test-'));
  try {
    const write = (file, source) => { const full = path.join(root, file); fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, source); };
    write('core/core.chic', 'Root : struct {}');
    write('core/legacy/api.chic', 'a : func() {}');
    write('core/legacy/nested/api.chic', 'b : func() {}');
    write('core/runtime/api.chic', '#package runtime\nc : func() {}');
    write('core/runtime/details/api.chic', 'd : func() {}');
    write('core/runtime/codecs/api.chic', '#package codecs\ne : func() {}');
    const { packages, files } = extractStdlib(root);
    assert.deepEqual(packages.map(p => p.name), ['core', 'core.legacy', 'core.legacy.nested', 'core.runtime', 'core.runtime.codecs']);
    assert.deepEqual(packages.find(p => p.name === 'core.runtime').items.map(i => i.name), ['c', 'd']);
    assert.equal(files.length, 6);
    assert.ok(files.every(f => /^[0-9a-f]{64}$/.test(f.sha256)));
    write('core/runtime/details/duplicate.chic', '#package codecs');
    assert.throws(() => extractStdlib(root), /Duplicate package/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
