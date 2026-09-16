export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const gauss=(x,m,s)=>Math.exp(-((x-m)**2)/(2*s*s));
export const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
export const sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(v=>(v-m)**2)))}
export const rand=(a,b)=>a+Math.random()*(b-a);
export function seeded(seed=1){let s=seed>>>0;return()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296)}

export const ELECTRODES=[
{id:'Fp1',x:70,y:38,region:'frontal'},{id:'Fp2',x:130,y:38,region:'frontal'},
{id:'F7',x:32,y:60,region:'frontal'},{id:'F3',x:70,y:58,region:'frontal'},{id:'Fz',x:100,y:56,region:'frontal'},{id:'F4',x:130,y:58,region:'frontal'},{id:'F8',x:168,y:60,region:'frontal'},
{id:'T7',x:20,y:100,region:'temporal',alias:'T3'},{id:'C3',x:65,y:100,region:'central'},{id:'Cz',x:100,y:100,region:'central'},{id:'C4',x:135,y:100,region:'central'},{id:'T8',x:180,y:100,region:'temporal',alias:'T4'},
{id:'P7',x:32,y:140,region:'parietal',alias:'T5'},{id:'P3',x:70,y:142,region:'parietal'},{id:'Pz',x:100,y:144,region:'parietal'},{id:'P4',x:130,y:142,region:'parietal'},{id:'P8',x:168,y:140,region:'parietal',alias:'T6'},
{id:'O1',x:75,y:168,region:'occipital'},{id:'O2',x:125,y:168,region:'occipital'}];

export class EEGEngine{
 constructor(){
  this.fs=250;this.seconds=8;this.eyesClosed=true;this.reference='average';this.alphaPeak=rand(9.2,10.8);
  this.noise=8;this.lineNoise=4;this.bands={delta:45,theta:38,alpha:62,beta:34,gamma:18};
  this.artifacts=[];this.phase=new Map();this.badChannels=new Set();
  for(const e of ELECTRODES)this.phase.set(e.id,[rand(0,6.28),rand(0,6.28),rand(0,6.28),rand(0,6.28),rand(0,6.28)]);
 }
 setFs(v){this.fs=Number(v)}
 setBand(name,value){if(name in this.bands)this.bands[name]=clamp(Number(value),0,100)}
 artifact(type){const now=performance.now()/1000;this.artifacts=this.artifacts.filter(a=>now-a.t0<3);this.artifacts.push({type,t0:now})}
 lineCoupling(e){let h=0;for(const ch of e.id)h=(h*31+ch.charCodeAt(0))%101;return .35+1.3*h/100}
 lineRaw(e,t,amp=this.lineNoise){const p=this.phase.get(e.id),phase=.12*p[4];return amp*this.lineCoupling(e)*Math.sin(2*Math.PI*50*t+phase)}
 lineReferenced(id,t,amp=this.lineNoise){const e=ELECTRODES.find(x=>x.id===id);if(!e)return 0;const v=this.lineRaw(e,t,amp);if(this.reference==='Cz'){const r=ELECTRODES.find(x=>x.id==='Cz');return v-this.lineRaw(r,t,amp)}if(this.reference==='mastoids'){const l=ELECTRODES.find(x=>x.id==='T7'),r=ELECTRODES.find(x=>x.id==='T8');return v-(this.lineRaw(l,t,amp)+this.lineRaw(r,t,amp))/2}const avg=mean(ELECTRODES.map(x=>this.lineRaw(x,t,amp)));return v-avg}
 sample(e,t){
  const p=this.phase.get(e.id),occ=e.region==='occipital'?1:0,par=e.region==='parietal'?1:0,front=e.region==='frontal'?1:0,temp=e.region==='temporal'?1:0;
  const b=this.bands,alphaEnv=(.65+.35*Math.sin(2*Math.PI*.18*t+p[0]))*(this.eyesClosed?(1+1.7*occ+.6*par):(.58+.18*occ));
  let v=0;
  v+=(b.delta/100)*20*Math.sin(2*Math.PI*2.1*t+p[0]);
  v+=(b.theta/100)*16*Math.sin(2*Math.PI*6.2*t+p[1]);
  v+=(b.alpha/100)*23*alphaEnv*Math.sin(2*Math.PI*this.alphaPeak*t+p[2]);
  v+=(b.beta/100)*15*(1+.35*front)*Math.sin(2*Math.PI*19*t+p[3]);
  v+=(b.gamma/100)*7*(1+.35*temp)*Math.sin(2*Math.PI*38*t+p[4]);
  v+=this.lineRaw(e,t)+this.pinkish(t,e.id)*this.noise;
  const now=performance.now()/1000;
  const xn=(e.x-100)/80,yn=(e.y-103)/70;
  const moveGain=.78+.34*xn-.22*yn+.12*Math.sin(p[0]);
  const cableGain=.35+1.15*Math.exp(-((e.x-42)**2+(e.y-72)**2)/(2*58**2));
  const ecgGain=.45+.55*(1-front)+.28*temp+.12*xn;
  const sweatGain=.42+.72*front+.20*temp+.12*(1-yn);
  const burstGain=.45+.72*((e.id.charCodeAt(0)+2*e.id.length)%9)/8;
  for(const a of this.artifacts){
   const d=now-a.t0;if(d<0||d>3)continue;
   if(a.type==='blink'&&front)v+=105*gauss(d,.24,.09);
   if(a.type==='saccade'&&front)v+=(e.id.endsWith('1')||e.id==='F7'?-1:1)*65*gauss(d,.28,.16);
   if(a.type==='emg')v+=(front||temp?1:.25)*rand(-46,46)*Math.exp(-d/1.1);
   if(a.type==='jaw')v+=(temp?1:.35)*rand(-58,58)*Math.exp(-d/.8)*Math.sin(2*Math.PI*rand(35,70)*t);
   if(a.type==='move')v+=78*moveGain*Math.exp(-d/.85)*(1+.28*Math.sin(2*Math.PI*2.4*t+p[1]));
   if(a.type==='cable')v+=46*cableGain*Math.sin(2*Math.PI*7.2*t+.35*p[2])*Math.exp(-d/1.25);
   if(a.type==='pop')v+=(d<.08?120:35*Math.exp(-d/.6))*(e.id==='Fp1'||e.id==='F7'?1:.15);
   if(a.type==='ecg')v+=18*ecgGain*(gauss(d%0.82,.075,.022)-.42*gauss(d%0.82,.17,.045));
   if(a.type==='sweat')v+=38*sweatGain*Math.sin(2*Math.PI*.18*t+.24*p[0])*Math.exp(-d/2.7);
   if(a.type==='lineburst')v+=38*burstGain*Math.sin(2*Math.PI*50*t+.22*p[4])*Math.exp(-d/1.35);
  }
  if(this.badChannels.has(e.id))v+=rand(-65,65);
  return v;
 }
 pinkish(t,id){return Math.sin(2*Math.PI*.7*t+id.length)+.65*Math.sin(2*Math.PI*3.1*t+id.charCodeAt(0))+.35*Math.sin(2*Math.PI*17*t)+rand(-.55,.55)}
 generate(seconds=this.seconds,startTime=0){const n=Math.round(seconds*this.fs),out={};for(const e of ELECTRODES){const a=new Array(n);for(let i=0;i<n;i++)a[i]=this.sample(e,startTime+i/this.fs);out[e.id]=a}return this.rereference(out)}
 rereference(data){const ids=Object.keys(data),n=data[ids[0]].length,res={};if(this.reference==='Cz'){const ref=data.Cz;for(const id of ids)res[id]=data[id].map((v,i)=>v-ref[i]);return res}if(this.reference==='mastoids'){const pseudo=data.T7.map((v,i)=>(v+data.T8[i])/2);for(const id of ids)res[id]=data[id].map((v,i)=>v-pseudo[i]);return res}for(const id of ids)res[id]=new Array(n);for(let i=0;i<n;i++){const m=mean(ids.map(id=>data[id][i]));for(const id of ids)res[id][i]=data[id][i]-m}return res}
 qc(impedances={}){const vals=ELECTRODES.map(e=>impedances[e.id]??12);const bad=ELECTRODES.filter(e=>(impedances[e.id]??12)>20||this.badChannels.has(e.id)).map(e=>e.id);return{median:[...vals].sort((a,b)=>a-b)[Math.floor(vals.length/2)],bad,line:this.lineNoise,clipping:bad.length>2,ready:bad.length===0&&mean(vals)<15&&this.lineNoise<8}}
}

export function dftPower(signal,fs,maxHz=60){const n=Math.min(signal.length,1024),out=[];for(let f=1;f<=maxHz;f++){let re=0,im=0;for(let i=0;i<n;i++){const a=2*Math.PI*f*i/fs;re+=signal[i]*Math.cos(a);im-=signal[i]*Math.sin(a)}out.push({f,p:(re*re+im*im)/n})}return out}
export function welch(signal,fs){const seg=Math.min(512,signal.length),step=Math.floor(seg/2),acc=[];let k=0;for(let s=0;s+seg<=signal.length;s+=step){const x=signal.slice(s,s+seg).map((v,i)=>v*(.5-.5*Math.cos(2*Math.PI*i/(seg-1))));const p=dftPower(x,fs,Math.min(60,Math.floor(fs/2)-1));if(!acc.length)p.forEach(q=>acc.push({f:q.f,p:0}));p.forEach((q,i)=>acc[i].p+=q.p);k++}return acc.map(q=>({f:q.f,p:q.p/Math.max(k,1)}))}
export function bandPower(psd,a,b){return psd.filter(q=>q.f>=a&&q.f<b).reduce((s,q)=>s+q.p,0)}
export function makeEpoch(isTarget,noise=7,latency=340){const fs=500,n=500,arr=[];for(let i=0;i<n;i++){const ms=i/fs*1000-200;let v=rand(-noise,noise)+2*Math.sin(2*Math.PI*6*i/fs);if(isTarget)v+=11*gauss(ms,latency,48);else v+=2.2*gauss(ms,190,32);arr.push(v)}return arr}
export function baselineCorrect(epoch,fs=500){const n=Math.round(.2*fs),b=mean(epoch.slice(0,n));return epoch.map(v=>v-b)}
export function averageEpochs(epochs){if(!epochs.length)return[];return epochs[0].map((_,i)=>mean(epochs.map(e=>e[i])))}
export function semEpochs(epochs){if(!epochs.length)return[];return epochs[0].map((_,i)=>sd(epochs.map(e=>e[i]))/Math.sqrt(epochs.length))}
export function aliasFrequency(f,fs){const ny=fs/2;return Number(Math.abs(((f+ny)%fs)-ny).toFixed(2))}
