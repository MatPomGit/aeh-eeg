import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('simulator');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const fail=msg=>{console.error(`SMOKE FAIL: ${msg}`);process.exitCode=1};
const index=read('index.html');
const scripts=[...index.matchAll(/<script[^>]+src=["']\.\/([^"']+)["']/g)].map(m=>m[1]);
const styles=[...index.matchAll(/<link[^>]+href=["']\.\/([^"']+\.css)["']/g)].map(m=>m[1]);
const refs=[...index.matchAll(/(?:src|href)=["']\.\/([^"']+)["']/g)].map(m=>m[1]);
for(const f of [...scripts,...styles])if(!fs.existsSync(path.join(root,f)))fail(`missing asset referenced by index.html: ${f}`);
if(new Set(scripts).size!==scripts.length)fail('duplicate script reference in index.html');
if(new Set(styles).size!==styles.length)fail('duplicate stylesheet reference in index.html');

const retired=[
 'app.js','enhancements.js','enhancements2.js','enhancements3.js','legacy-cleanup.js','ui-controller.js','physiology-eye.js','pedagogy-fixes.js','flashcards.js','clinical-learning.js','clinical-compare-v2.js','runtime-fixes-v2.js','layout-fixes-v3.js','structure-v4.js','post-ica-v5.js','interface-v6.js','eye-layout-fixes.js','enhancements.css','enhancements2.css','enhancements3.css','light-theme.css','main.html',
 'eye-tracking-v2.js','eye-tracking-v2.css','source-model-v2.js','source-model-v2.css','qeeg-heatmap-v2.js'
];
for(const f of retired){if(refs.includes(f))fail(`retired asset loaded again: ${f}`);if(fs.existsSync(path.join(root,f)))fail(`retired asset still exists: ${f}`)}

const required=['experiment-processing.js','signal-analysis.js','signal-live.js','montage.js','ica.js','storage.js','clinical.js','qeeg-workflow.js','qeeg-heatmap.js','quiz.js','live-modules.js','eye-tracking.js','teaching-content.js','source-model.js','theme.js','interface.js','stroop.js','oddball.js','erp-averaging.js'];
for(const f of required)if(!scripts.includes(f))fail(`required module is not loaded: ${f}`);

const declarations=[['experiment-processing.js',['m3','m5']],['signal-analysis.js',['m1x','mfft','mpostx']],['montage.js',['m2x']],['ica.js',['mica']],['storage.js',['mformats','mbids']],['clinical.js',['mlobes','mclinical']],['qeeg-workflow.js',['mqeeg']],['qeeg-heatmap.js',['mheat']],['quiz.js',['mquiz']],['live-modules.js',['msimlive2','mphys2','meye2']],['source-model.js',['m7']]];
const declaredIds=new Set();
for(const[file,ids]of declarations){const text=read(file);for(const id of ids){declaredIds.add(id);if(!text.includes(`id='${id}'`)&&!text.includes(`id="${id}"`))fail(`${file} does not declare #${id}`)}}

const iface=read('interface.js');
for(const group of ['Sygnał','Pomiar','Eksperyment','Przetwarzanie','Analiza','Zapis'])if(!iface.includes(`name:'${group}'`))fail(`navigation group missing: ${group}`);
if(!iface.includes("navigate('m1x')"))fail('application does not start on EEG signal');
if(!iface.includes("['mstroop','Eksperyment Stroopa']"))fail('Stroop experiment missing from navigation');
const navIds=[...iface.matchAll(/\['(m[a-zA-Z0-9]+)'\s*,\s*'[^']+'\]/g)].map(m=>m[1]);
for(const id of navIds)if(id!=='mstroop'&&!declaredIds.has(id))fail(`navigation points to undeclared module #${id}`);
for(const id of declaredIds)if(!navIds.includes(id))fail(`declared module #${id} is missing from navigation`);
if(/const\s+NAV\s*=/.test(read('signal-live.js')))fail('signal-live.js must not own navigation');
if(/nav\.innerHTML/.test(read('signal-live.js')))fail('signal-live.js modifies navigation');
if(!read('signal-live.js').includes("active==='m1x'"))fail('live EEG renderer does not handle m1x');
if(!read('oddball.js').includes("appendRow(tbody"))fail('Oddball event markers are not rendered incrementally');
if(!read('oddball.js').includes("e.target?'S2':'S1'"))fail('Oddball EEG plot lacks S1/S2 event markers');
if(!read('oddball.js').includes('buildTrialSequence(n,p)'))fail('Oddball runtime does not build a controlled S1/S2 sequence');
if(read('interface.js').includes('improveOddball'))fail('interface.js still owns a duplicate, unsynchronised Oddball runtime');
if(!fs.existsSync(path.join(root,'oddball-model.test.mjs')))fail('Oddball response model tests are missing');

const storage=read('storage.js');
if(!storage.includes("id='mformats'")||!storage.includes("id='mbids'"))fail('storage module is incomplete');
if(!storage.includes('BV_SAMPLING_INTERVAL_US=Math.round(1e6/BV_FS)'))fail('BrainVision sampling interval is not derived from sampling frequency');
if(!storage.includes('NumberOfChannels=${BV_CHANNELS.length}'))fail('BrainVision channel count is not derived from the data channels');
if(!storage.includes("BIDSVersion:'1.10.1'"))fail('example BIDS dataset description lacks an explicit BIDS version');

const labs=read('laboratories.html');
const labLinks=[...labs.matchAll(/href=["']\.\/laboratories\/([^"']+\.pdf)["']/g)].map(m=>m[1]);
if(labLinks.length!==6)fail(`expected 6 laboratory PDFs in laboratories.html, found ${labLinks.length}`);
for(const pdf of labLinks)if(!fs.existsSync(path.resolve('laboratories',pdf)))fail(`laboratory link points to missing PDF: ${pdf}`);

const versioned=fs.readdirSync(root).filter(f=>/-v\d+\.(?:js|css)$/.test(f));
if(versioned.length)fail(`historical version suffixes remain: ${versioned.join(', ')}`);

if(!process.exitCode)console.log('Static smoke checks passed.');
