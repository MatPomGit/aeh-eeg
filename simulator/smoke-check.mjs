import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('simulator');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const fail=msg=>{console.error(`SMOKE FAIL: ${msg}`);process.exitCode=1};
const index=read('index.html');
const scripts=[...index.matchAll(/<script[^>]+src=["']\.\/([^"']+)["']/g)].map(m=>m[1]);
const styles=[...index.matchAll(/<link[^>]+href=["']\.\/([^"']+\.css)["']/g)].map(m=>m[1]);

for(const file of [...scripts,...styles])if(!fs.existsSync(path.join(root,file)))fail(`index.html references missing asset: ${file}`);
if(new Set(scripts).size!==scripts.length)fail('index.html contains duplicate script references');
if(new Set(styles).size!==styles.length)fail('index.html contains duplicate stylesheet references');

const retired=[
 'app.js','enhancements.js','enhancements2.js','enhancements3.js','legacy-cleanup.js',
 'pedagogy-fixes.js','flashcards.js','clinical-learning.js','clinical-compare-v2.js',
 'enhancements.css','enhancements2.css','enhancements3.css','light-theme.css','main.html',
 'runtime-fixes-v2.js','runtime-fixes-v2.css','compact-layout-fixes.css','layout-fixes-v3.js','layout-fixes-v3.css',
 'structure-v4.js','structure-v4.css','post-ica-v5.js','post-ica-v5.css','interface-v6.js','interface-v6.css','eye-layout-fixes.js'
];
for(const file of retired){
 if(index.includes(file))fail(`retired asset is loaded again: ${file}`);
 if(fs.existsSync(path.join(root,file)))fail(`retired asset still exists: ${file}`);
}

const requiredScripts=['experiment-processing.js','signal-analysis.js','montage.js','clinical.js','quiz.js','teaching-content.js','interface.js'];
for(const file of requiredScripts)if(!scripts.includes(file))fail(`required module is not loaded: ${file}`);

const sources=new Map();
function addSource(file){if(sources.has(file))return;const full=path.join(root,file);if(!fs.existsSync(full)){fail(`missing imported module: ${file}`);return}const text=read(file);sources.set(file,text);for(const m of text.matchAll(/^\s*import(?:[^'"\n]*from\s*)?["']\.\/([^"']+\.js)["']/gm))addSource(m[1])}
scripts.forEach(addSource);

const ui=read('ui-controller.js'),navMatch=ui.match(/const NAV=\[(.*?)\];/s);
if(!navMatch)fail('NAV definition was not found in ui-controller.js');
else{
 const ids=[...navMatch[1].matchAll(/\['([^']+)'/g)].map(m=>m[1]);
 if(new Set(ids).size!==ids.length)fail('NAV contains duplicate module IDs');
 const all=[...sources.values()].join('\n');
 for(const id of ids){const pats=[`id='${id}'`,`id="${id}"`,`.id='${id}'`,`.id="${id}"`,`'${id}'`,`"${id}"`];if(!pats.some(p=>all.includes(p)))fail(`NAV module #${id} has no declaration or factory reference`)}
}

const iface=read('interface.js');
for(const group of ['Sygnał','Pomiar','Eksperyment','Przetwarzanie','Analiza','Zapis'])if(!iface.includes(`name:'${group}'`))fail(`interface navigation is missing group: ${group}`);
if(!iface.includes("navigate('m1x')"))fail('application does not default to the EEG signal module');
if(!iface.includes("['mstroop','Eksperyment Stroopa']"))fail('Stroop experiment is missing from Experiment group');

for(const [file,id] of [['experiment-processing.js','m3'],['experiment-processing.js','m5'],['signal-analysis.js','m1x'],['signal-analysis.js','mfft'],['signal-analysis.js','mpostx'],['montage.js','m2x'],['clinical.js','mclinical'],['quiz.js','mquiz']]){
 if(!read(file).includes(`id='${id}'`)&&!read(file).includes(`id="${id}"`))fail(`${file} does not declare #${id}`);
}

if(!process.exitCode)console.log('Static smoke checks passed.');
