import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('simulator');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const fail = msg => { console.error(`SMOKE FAIL: ${msg}`); process.exitCode = 1; };

const index = read('index.html');
const scriptFiles = [...index.matchAll(/<script[^>]+src=["']\.\/([^"']+)["']/g)].map(m => m[1]);
const styleFiles = [...index.matchAll(/<link[^>]+href=["']\.\/([^"']+\.css)["']/g)].map(m => m[1]);
for (const file of [...scriptFiles, ...styleFiles]) {
  if (!fs.existsSync(path.join(root, file))) fail(`index.html references missing asset: ${file}`);
}

const ui = read('ui-controller.js');
const navMatch = ui.match(/const NAV=\[(.*?)\];/s);
if (!navMatch) {
  fail('final NAV definition was not found in ui-controller.js');
} else {
  const navIds = [...navMatch[1].matchAll(/\['([^']+)'/g)].map(m => m[1]);
  if (new Set(navIds).size !== navIds.length) fail('final NAV contains duplicate module IDs');

  const sources = new Map();
  for (const file of scriptFiles) sources.set(file, read(file));
  const all = [...sources.values()].join('\n');
  for (const id of navIds) {
    const patterns = [
      `id='${id}'`, `id="${id}"`, `id:\'${id}\'`, `id:'${id}'`, `.id='${id}'`, `.id="${id}"`
    ];
    if (!patterns.some(p => all.includes(p))) fail(`NAV module #${id} has no matching module declaration`);
  }

  // Replacement modules must not reuse a DOM id already declared by legacy modules.
  const replacementFiles = ['live-modules.js', 'ui-controller.js'];
  const extractIds = text => [...text.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
  const replacementIds = new Set(replacementFiles.flatMap(f => extractIds(read(f))));
  const counts = new Map();
  for (const [file, text] of sources) {
    for (const id of extractIds(text)) {
      const arr = counts.get(id) || [];
      arr.push(file);
      counts.set(id, arr);
    }
  }
  for (const id of replacementIds) {
    const where = counts.get(id) || [];
    if (where.length > 1) fail(`DOM id #${id} is declared more than once: ${where.join(', ')}`);
  }
}

const ext3 = read('enhancements3.js');
if (ext3.includes("physiology-eye.js")) fail('legacy physiology-eye.js is imported again');
if (/function\s+rebuild\s*\(/.test(ext3)) fail('enhancements3.js must not own navigation; ui-controller.js is the only final controller');

if (!process.exitCode) console.log('Static smoke checks passed.');
