import test from'node:test';
import assert from'node:assert/strict';
import{applyAffine,calibrationError,fitAffine,sampleSpread,trimmedCenter}from'./eye-tracking-model.js';

test('affine calibration expands a narrow eye-motion range to the full stage',()=>{
 const pairs=[];
 for(const [rawX,targetX] of [[.46,.07],[.5,.5],[.54,.93]])for(const [rawY,targetY] of [[.47,.08],[.5,.5],[.53,.92]])pairs.push({raw:{x:rawX,y:rawY},target:{x:targetX,y:targetY}});
 const mapX=fitAffine(pairs,'x'),mapY=fitAffine(pairs,'y'),corner=applyAffine({x:.46,y:.47},mapX,mapY);
 assert.ok(Math.abs(corner.x-.07)<1e-10);
 assert.ok(Math.abs(corner.y-.08)<1e-10);
 assert.ok(calibrationError(pairs,mapX,mapY)<1e-10);
});

test('trimmed calibration center rejects isolated tracking outliers',()=>{
 const points=[{x:.49,y:.51},{x:.5,y:.5},{x:.51,y:.49},{x:.99,y:.01},{x:.5,y:.5},{x:.49,y:.51}];
 const center=trimmedCenter(points);
 assert.ok(Math.abs(center.x-.5)<.01);
 assert.ok(Math.abs(center.y-.5)<.01);
 assert.ok(sampleSpread(points)>.2);
});

test('degenerate calibration is rejected instead of producing extreme coordinates',()=>{
 const pairs=Array.from({length:9},(_,index)=>({raw:{x:.5,y:.5},target:{x:(index%3)/2,y:Math.floor(index/3)/2}}));
 assert.equal(fitAffine(pairs,'x'),null);
 assert.equal(fitAffine(pairs,'y'),null);
});
