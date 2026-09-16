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

// Resolve local ES-module imports recursively, so modules loaded through
// enhancements3.js are included in NAV checks as well.
const sources = new Map();
function addSource(file) {
  if (sources.has(file)) return;
  const full = path.join(root, file);
  if (!fs.existsSync(full)) { fail(`missing imported module: ${file}`); return; }
  const text = read(file);
  sources.set(file, text);
  for (const m of text.matchAll(/^\s*import(?:[^'"\n]*from\s*)?["']\.\/([^"']+\.js)["']/gm)) {
    addSource(m[1]);
  }
}
scriptFiles.forEach(addSource);

const ui = read('ui-controller.js');
const navMatch = ui.match(/const NAV=\[(.*?)\];/s);
if (!navMatch) {
  fail('final NAV definition was not found in ui-controller.js');
} else {
  const navIds = [...navMatch[1].matchAll(/\['([^']+)'/g)].map(m => m[1]);
  if (new Set(navIds).size !== navIds.length) fail('final NAV contains duplicate module IDs');

  const all = [...sources.values()].join('\n');
  for (const id of navIds) {
    const patterns = [
      `id='${id}'`, `id="${id}"`, `id:\'${id}\'`, `id:'${id}'`, `.id='${id}'`, `.id="${id}"`
    ];
    if (!patterns.some(p => all.includes(p))) fail(`NAV module #${id} has no matching module declaration`);
  }

  const extractIds = text => [...text.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
  const replacementFiles = ['live-modules.js', 'ui-controller.js'];
  const replacementIds = new Set(replacementFiles.flatMap(f => extractIds(read(f))));
  const counts = new Map();
  for (const [file, text] of sources) {
    for (const id of extractIds(text)) {
      const arr = counts.get(id) || [];
      arr.push(file);
      counts.set(id, arr);
    }
  }

  // fmtL/fmtR belong to the superseded mfiles module in enhancements.js;
  // legacy-cleanup.js removes that whole view before ui-controller builds
  // mformats. They therefore never coexist in the final DOM.
  const removedLegacyDuplicates = new Set(['fmtL','fmtR','fmtLbody','fmtRbody']);
  for (const id of replacementIds) {
    if (removedLegacyDuplicates.has(id)) continue;
    const where = counts.get(id) || [];
    if (where.length > 1) fail(`DOM id #${id} is declared more than once: ${where.join(', ')}`);
  }
}

const ext3 = read('enhancements3.js');
if (ext3.includes('physiology-eye.js')) fail('legacy physiology-eye.js is imported again');
if (/function\s+rebuild\s*\(/.test(ext3)) fail('enhancements3.js must not own navigation; ui-controller.js is the only final controller');

const cleanup = read('legacy-cleanup.js');
for (const id of ['m1','m2','m4','m6','mfiles','msimlive']) {
  if (!cleanup.includes(`'${id}'`)) fail(`legacy cleanup does not remove #${id}`);
}

if (!process.exitCode) console.log('Static smoke checks passed.');
