export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const gauss=(x,m,s)=>Math.exp(-((x-m)**2)/(2*s*s));
export const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
export const sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(v=>(v-m)**2)))};
export const rand=(a,b)=>a+Math.random()*(b-a);
export function seeded(seed=1){let s=seed>>>0;return()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296)}

export const ELECTRODES=[
{id:'Fp1',x:70,y:38,region:'frontal'},{id:'Fp2',x:130,y:38,region:'frontal'},
{id:'F7',x:32,y:60,region:'frontal'},{id:'F3',x:70,y:58,region:'frontal'},{id:'Fz',x:100,y:56,region:'frontal'},{id:'F4',x:130,y:58,region:'frontal'},{id:'F8',x:168,y:60,region:'frontal'},
{id:'T7',x:20,y:100,region:'temporal',alias:'T3'},{id:'C3',x:65,y:100,region:'central'},{id:'Cz',x:100,y:100,region:'central'},{id:'C4',x:135,y:100,region:'central'},{id:'T8',x:180,y:100,region:'temporal',alias:'T4'},
{id:'P7',x:32,y:140,region:'parietal',alias:'T5'},{id:'P3',x:70,y:142,region:'parietal'},{id:'Pz',x:100,y:144,region:'parietal'},{id:'P4',x:130,y:142,region:'parietal'},{id:'P8',x:168,y:140,region:'parietal',alias:'T6'},
{id:'O1',x:75,y:168,region:'occipital'},{id:'O2',x:125,y:168,region:'occipital'}];

export class EEGEngine{
 constructor(){this.fs=250;this.seconds=8;this.eyesClosed=true;this.reference='average';this.alphaPeak=rand(9.2,10.8);this.noise=8;this.lineNoise=4;this.artifacts=[];this.phase=new Map();for(const e of ELECTRODES)this.phase.set(e.id,[rand(0,6.28),rand(0,6.28),rand(0,6.28),rand(0,6.28)]);this.badChannels=new Set();}
 setFs(v){this.fs=Number(v)}
 artifact(type){this.artifacts.push({type,t0:performance.now()/1000})}
 sample(e,t){const p=this.phase.get(e.id);const occ=e.region==='occipital'?1:0;const par=e.region==='parietal'?1:0;const front=e.region==='frontal'?1:0;const alphaEnv=(.65+.35*Math.sin(2*Math.PI*.18*t+p[0]))*(this.eyesClosed?(1+1.7*occ+.6*par):(.6+.2*occ));let v=0;v+=10*Math.sin(2*Math.PI*2.1*t+p[0]);v+=7*Math.sin(2*Math.PI*6.2*t+p[1]);v+=13*alphaEnv*Math.sin(2*Math.PI*this.alphaPeak*t+p[2]);v+=5*(1+.35*front)*Math.sin(2*Math.PI*19*t+p[3]);v+=this.lineNoise*Math.sin(2*Math.PI*50*t);v+=this.pinkish(t,e.id)*this.noise;const now=performance.now()/1000;for(const a of this.artifacts){const d=now-a.t0;if(d<0||d>2)continue;if(a.type==='blink'&&front)v+=95*gauss(d,.24,.09);if(a.type==='emg')v+=(front?1:.35)*rand(-40,40)*Math.exp(-d/1.1);if(a.type==='move')v+=65*Math.exp(-d/.7);}if(this.badChannels.has(e.id))v+=rand(-65,65);return v}
 pinkish(t,id){const n=Math.sin(2*Math.PI*.7*t+id.length)+.65*Math.sin(2*Math.PI*3.1*t+id.charCodeAt(0))+.35*Math.sin(2*Math.PI*17*t);return n+rand(-.55,.55)}
 generate(seconds=this.seconds){const n=Math.round(seconds*this.fs),out={};for(const e of ELECTRODES){const a=new Array(n);for(let i=0;i<n;i++)a[i]=this.sample(e,i/this.fs);out[e.id]=a}return this.rereference(out)}
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
export function aliasFrequency(f,fs){const ny=fs/2;let a=Math.abs(((f+ny)%fs)-ny);return Number(a.toFixed(2))}
