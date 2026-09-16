const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

const ERP_POINTS=600;
const ERP_MAX_TRIALS=120;
const ERP_T0=-200;
const ERP_T1=800;
let epochs=[];

function css(name,fallback=''){
 const v=getComputedStyle(document.documentElement).getPropertyValue(name).trim();
 return v||fallback;
}
function mulberry32(seed){
 return function(){
  let t=seed+=0x6D2B79F5;
  t=Math.imul(t^t>>>15,t|1);
  t^=t+Math.imul(t^t>>>7,t|61);
  return((t^t>>>14)>>>0)/4294967296;
 };
}
function gauss(rng){
 let u=0,v=0;
 while(u===0)u=rng();
 while(v===0)v=rng();
 return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}
function g(t,mu,sigma){
 const z=(t-mu)/sigma;
 return Math.exp(-.5*z*z);
}
function template(t,amp=1,lat=0){
 return amp*(-4.2*g(t,105+lat,24)+5.0*g(t,195+lat,34)+12.5*g(t,340+lat,58));
}
function buildEpoch(trial){
 const rng=mulberry32(0x5EED1234+trial*7919);
 const alphaF=9.3+rng()*2.4;
 const thetaF=4.5+rng()*2.0;
 const betaF=17+rng()*8;
 const alphaA=4+rng()*7;
 const thetaA=2+rng()*4;
 const betaA=1+rng()*2.5;
 const driftA=2+rng()*4;
 const phaseA=rng()*Math.PI*2,phaseT=rng()*Math.PI*2,phaseB=rng()*Math.PI*2,phaseD=rng()*Math.PI*2;
 const erpAmp=.82+rng()*.36;
 const erpLat=(rng()-.5)*22;
 const out=[];
 let colored=0;
 for(let i=0;i<ERP_POINTS;i++){
  const ms=ERP_T0+i/(ERP_POINTS-1)*(ERP_T1-ERP_T0);
  const sec=ms/1000;
  colored=.78*colored+gauss(rng)*3.6;
  const background=
   alphaA*Math.sin(2*Math.PI*alphaF*sec+phaseA)+
   thetaA*Math.sin(2*Math.PI*thetaF*sec+phaseT)+
   betaA*Math.sin(2*Math.PI*betaF*sec+phaseB)+
   driftA*Math.sin(2*Math.PI*.65*sec+phaseD)+
   colored;
  out.push(background+template(ms,erpAmp,erpLat));
 }
 const baselineN=Math.max(1,Math.floor(ERP_POINTS*(0-ERP_T0)/(ERP_T1-ERP_T0)));
 const baseline=out.slice(0,baselineN).reduce((a,b)=>a+b,0)/baselineN;
 return out.map(v=>v-baseline);
}
function ensureEpochs(){
 if(epochs.length===ERP_MAX_TRIALS)return;
 epochs=Array.from({length:ERP_MAX_TRIALS},(_,i)=>buildEpoch(i));
}
function averageEpochs(n){
 const avg=new Array(ERP_POINTS).fill(0);
 for(let tr=0;tr<n;tr++)for(let i=0;i<ERP_POINTS;i++)avg[i]+=epochs[tr][i];
 for(let i=0;i<ERP_POINTS;i++)avg[i]/=n;
 return avg;
}
function drawAxes(ctx,w,h){
 const line=css('--line','#d5e0e3'),muted=css('--muted','#5a7077'),well=css('--well','#f0f4f5');
 ctx.clearRect(0,0,w,h);ctx.fillStyle=well;ctx.fillRect(0,0,w,h);
 const left=54,right=w-18,top=18,bottom=h-36,mid=(top+bottom)/2;
 ctx.strokeStyle=line;ctx.lineWidth=1;ctx.fillStyle=muted;ctx.font='11px IBM Plex Mono';ctx.textAlign='center';
 [-200,0,200,400,600,800].forEach(v=>{const x=left+(v-ERP_T0)/(ERP_T1-ERP_T0)*(right-left);ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();ctx.fillText(String(v),x,h-16)});
 [-30,-15,0,15,30].forEach(v=>{const y=mid-v/30*(bottom-top)/2;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();ctx.textAlign='right';ctx.fillText(String(v),left-7,y+4);ctx.textAlign='center'});
 ctx.textAlign='right';ctx.fillText('ms',right,h-3);ctx.textAlign='left';ctx.fillText('µV',6,top+3);
 const zeroX=left+(0-ERP_T0)/(ERP_T1-ERP_T0)*(right-left);ctx.strokeStyle=css('--danger','#c43c31');ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(zeroX,top);ctx.lineTo(zeroX,bottom);ctx.stroke();ctx.fillStyle=css('--danger','#c43c31');ctx.fillText('bodziec',zeroX+5,top+12);
 return{left,right,top,bottom,mid};
}
function drawTrace(ctx,a,axes,color,width=1,alpha=1){
 ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();
 for(let i=0;i<a.length;i++){
  const x=axes.left+i/(a.length-1)*(axes.right-axes.left);
  const y=axes.mid-Math.max(-30,Math.min(30,a[i]))/30*(axes.bottom-axes.top)/2;
  i?ctx.lineTo(x,y):ctx.moveTo(x,y);
 }
 ctx.stroke();ctx.restore();
}
function rmsBaseline(avg){
 const n=Math.floor(ERP_POINTS*.2);
 const a=avg.slice(0,n);
 return Math.sqrt(a.reduce((s,v)=>s+v*v,0)/Math.max(1,a.length));
}
function renderTrueERP(){
 const m=$('#mpostx');
 if(!m||m.dataset.post!=='erp')return;
 const cv=$('#postcanvas',m),range=$('#postnr',m);if(!cv||!range)return;
 ensureEpochs();
 const n=Math.max(1,Math.min(ERP_MAX_TRIALS,+range.value||1));
 const avg=averageEpochs(n),ctx=cv.getContext('2d'),axes=drawAxes(ctx,cv.width,cv.height);
 const single=css('--muted','#5a7077'),accent=css('--accent','#087f70');
 const shown=Math.min(n,10);
 for(let k=0;k<shown;k++)drawTrace(ctx,epochs[k],axes,single,.75,.16);
 drawTrace(ctx,avg,axes,accent,2.6,1);
 const desc=$('#postdesc',m),read=$('#postread',m),nout=$('#postn',m);
 if(nout)nout.textContent=n;
 if(desc)desc.textContent='ERP: rzeczywista średnia punkt po punkcie z epok −200 do 800 ms, po korekcji linii podstawowej.';
 if(read)read.innerHTML=`Średnia z <b>${n}</b> niezależnych epok. Cienkie przebiegi pokazują ${shown} pojedynczych prób, a gruba linia ich średnią wraz z pozostałymi próbami. RMS przed bodźcem: <b>${rmsBaseline(avg).toFixed(1)} µV</b>.`;
}
function bind(){
 const m=$('#mpostx');if(!m||m.dataset.trueErpBound)return;m.dataset.trueErpBound='1';
 ensureEpochs();
 const r=$('#postnr',m);if(r){
  r.min='1';r.max=String(ERP_MAX_TRIALS);r.step='1';
  r.addEventListener('input',()=>requestAnimationFrame(renderTrueERP));
  r.addEventListener('change',()=>requestAnimationFrame(renderTrueERP));
 }
 $$('[data-post]',m).forEach(b=>b.addEventListener('click',()=>requestAnimationFrame(renderTrueERP)));
 renderTrueERP();
}
window.addEventListener('load',()=>setTimeout(bind,80),{once:true});
window.addEventListener('eeg:module',e=>{if(e.detail==='mpostx')requestAnimationFrame(renderTrueERP)});
window.addEventListener('eeg:theme',()=>requestAnimationFrame(renderTrueERP));
