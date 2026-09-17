import test from'node:test';
import assert from'node:assert/strict';
import{buildTrialSequence,evokedPotential}from'./oddball-model.js';

test('trial sequence preserves the configured target proportion',()=>{
 const values=[.73,.14,.91,.32,.58,.05,.46,.87];let i=0;
 const sequence=buildTrialSequence(20,.2,()=>values[i++%values.length]);
 assert.equal(sequence.length,20);
 assert.equal(sequence.filter(Boolean).length,4);
});

test('target stimulus produces a visibly larger P3 than a standard',()=>{
 const target=evokedPotential(.36,true);
 const standard=evokedPotential(.36,false);
 assert.ok(target-standard>15,`expected target-standard > 15 µV, received ${target-standard}`);
});

test('evoked response is zero outside the stimulus-locked window',()=>{
 assert.equal(evokedPotential(-.01,true),0);
 assert.equal(evokedPotential(1.2,true),0);
});
