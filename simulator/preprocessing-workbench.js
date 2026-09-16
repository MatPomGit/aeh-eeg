const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const FS=250,DURATION=10,CHANNELS=['Fp1','Fz','Cz','Pz','O1'];
const EVENTS=[1.5,3.5,5.5,7.5];
let seed=20260916,dataset=null;
const state={channel:'Cz',interpolate:true,notch:true,hp:.5,lp:40,reference:'average',threshold:100,baseline:true};

function css(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
function colors(){return{accent:css('--accent')||'#087f70',violet:css('--violet')||'#6656d9',danger:css('--danger')||'#b53e35',warn:css('--warn')||'#c47b18',muted:css('--muted')||'#66777d',line:css('--line')||'#d9e0e2',well:css('--well')||'#fff',text:css('--text')||'#20343a'}}
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function normal(r){return(r()+r()+r()+r()+r()+r()-3)*.82}
function gauss(t,c,w){const d=t-c;return Math.exp(-(d*d)/(2*w*w))}
function cloneSignals(x){return Object.fromEntries(CHANNELS.map(ch=>[ch,x[ch].slice()]))}

function generateData(){
 const r=rng(seed),n=FS*DURATION,data=Object.fromEntries(CHANNELS.map(ch=>[ch,new Array(n)])),ocular=new Array(n),muscle=new Array(n);
 const alpha={Fp1:3,Fz:4,Cz:6,Pz:10,O1:15},theta={Fp1:6,Fz:7,Cz:5,Pz:4,O1:3},beta={Fp1:5,Fz:5,Cz:6,Pz:4,O1:3},eog={Fp1:1,Fz:.55,Cz:.18,Pz:.07,O1:.03},emg={Fp1:.65,Fz:.55,Cz:.35,Pz:.16,O1:.08};
 const phase=Object.fromEntries(CHANNELS.map(ch=>[ch,r()*Math.PI*2]));
 const linePhase=Object.fromEntries(CHANNELS.map(ch=>[ch,r()*.75]));
 const lineGain=Object.fromEntries(CHANNELS.map(ch=>[ch,.7+r()*.65]));
 for(let i=0;i<n;i++){
  const t=i/FS;
  ocular[i]=90*gauss(t,2.2,.075)+72*gauss(t,6.35,.09);
  muscle[i]=(gauss(t,4.75,.32)+.8*gauss(t,8.2,.22))*(14*Math.sin(2*Math.PI*36*t)+9*Math.sin(2*Math.PI*72*t));
  for(const ch of CHANNELS){
   const drift=16*Math.sin(2*Math.PI*.22*t+phase[ch]*.3)+5*Math.sin(2*Math.PI*.07*t+phase[ch]);
   const line=8.5*lineGain[ch]*Math.sin(2*Math.PI*50*t+linePhase[ch]);
   const fast=7*Math.sin(2*Math.PI*68*t+phase[ch]*1.8)+4*Math.sin(2*Math.PI*92*t+phase[ch]*.4);
   const brain=alpha[ch]*Math.sin(2*Math.PI*10*t+phase[ch])+theta[ch]*Math.sin(2*Math.PI*6*t+phase[ch]*.7)+beta[ch]*Math.sin(2*Math.PI*20*t+phase[ch]*1.3);
   let v=brain+drift+line+fast+ocular[i]*eog[ch]+muscle[i]*emg[ch]+normal(r)*4.2;
   if(ch==='Cz'&&t>7.05&&t<7.85)v+=normal(r)*34+18*Math.sin(2*Math.PI*27*t);
   data[ch][i]=v;
  }
 }
 return{data,ocular,muscle};
}

function biquadNotch(x,f=50,q=28){
 const w=2*Math.PI*f/FS,alpha=Math.sin(w)/(2*q),c=Math.cos(w),a0=1+alpha;
 const b0=1/a0,b1=-2*c/a0,b2=1/a0,a1=-2*c/a0,a2=(1-alpha)/a0;
 const y=new Array(x.length);let x1=0,x2=0,y1=0,y2=0;
 for(let i=0;i<x.length;i++){const v=b0*x[i]+b1*x1+b2*x2-a1*y1-a2*y2;y[i]=v;x2=x1;x1=x[i];y2=y1;y1=v}return y;
}
function highpass(x,fc){if(fc<=0)return x.slice();const dt=1/FS,rc=1/(2*Math.PI*fc),a=rc/(rc+dt),y=new Array(x.length);y[0]=0;for(let i=1;i<x.length;i++)y[i]=a*(y[i-1]+x[i]-x[i-1]);return y}
function lowpass(x,fc){if(fc>=FS/2)return x.slice();const dt=1/FS,rc=1/(2*Math.PI*fc),a=dt/(rc+dt),y=new Array(x.length);y[0]=x[0];for(let i=1;i<x.length;i++)y[i]=y[i-1]+a*(x[i]-y[i-1]);return y}
function applyReference(data,mode){
 if(mode==='original')return cloneSignals(data);
 const out=Object.fromEntries(CHANNELS.map(ch=>[ch,new Array(data[ch].length)]));
 for(let i=0;i<data[CHANNELS[0]].length;i++){
  const ref=mode==='average'?CHANNELS.reduce((s,ch)=>s+data[ch][i],0)/CHANNELS.length:data.Fz[i];
  for(const ch of CHANNELS)out[ch][i]=data[ch][i]-ref;
 }
 return out;
}
function processData(){
 let d=cloneSignals(dataset.data);
 if(state.interpolate)d.Cz=d.Fz.map((v,i)=>(v+d.Pz[i])/2);
 for(const ch of CHANNELS){let x=d[ch];if(state.notch)x=biquadNotch(x);x=highpass(x,state.hp);x=lowpass(x,state.lp);d[ch]=x}
 d=applyReference(d,state.reference);
 return d;
}
function rms(x){return Math.sqrt(x.reduce((s,v)=>s+v*v,0)/Math.max(1,x.length))}
function p2p(x){return Math.max(...x)-Math.min(...x)}
function toneAmplitude(x,f){let cs=0,sn=0;for(let i=0;i<x.length;i++){const a=2*Math.PI*f*i/FS;cs+=x[i]*Math.cos(a);sn+=x[i]*Math.sin(a)}return 2*Math.hypot(cs,sn)/x.length}
function mean(a){return a.reduce((s,v)=>s+v,0)/Math.max(1,a.length)}
function peakAbs(a){return a.reduce((m,v)=>Math.max(m,Math.abs(v)),0)}
function epochs(data,ch){
 const pre=.2,post=.8,nPre=Math.round(pre*FS),nPost=Math.round(post*FS),list=[];
 for(const t of EVENTS){const center=Math.round(t*FS),seg=data[ch].slice(center-nPre,center+nPost);if(seg.length!==nPre+nPost)continue;let y=seg.slice();if(state.baseline){const b=mean(y.slice(0,nPre));y=y.map(v=>v-b)}const pk=peakAbs(y);list.push({time:t,data:y,peak:pk,accepted:pk<=state.threshold})}
 return list;
}
function dftPower(x,maxF=60){
 const step=1,rows=[];for(let f=0;f<=maxF;f+=step){let re=0,im=0;for(let i=0;i<x.length;i++){const a=2*Math.PI*f*i/FS;re+=x[i]*Math.cos(a);im-=x[i]*Math.sin(a)}rows.push({f,p:(re*re+im*im)/(x.length*x.length)})}return rows;
}

function build(){
 const old=$('#m5');if(old)old.remove();
 dataset=generateData();
 const m=document.createElement('section');m.id='m5';m.className='module preprocessing-workbench';
 m.innerHTML=`<div class="head"><div><div class="eyebrow">PRZETWARZANIE WSTĘPNE</div><h1>Przetwarzanie wstępne EEG</h1><p><b>Cel:</b> przygotować surowy zapis EEG do analizy, ograniczając artefakty bez usuwania użytecznej aktywności. Przechodź kolejno przez kontrolę kanałów, filtrację, referencję, segmentację, kontrolę jakości epok, ICA i korekcję linii podstawowej. Każda zmiana parametru przelicza ten sam wielokanałowy sygnał i aktualizuje przebieg, widmo, metryki oraz kwalifikację epok.</p></div></div>
 <div class="prep-pipeline" id="prepPipeline">
  <button data-prep-focus="prepInspect"><b>1</b><span>Kontrola danych<small>kanał i interpolacja</small></span></button>
  <button data-prep-focus="prepFilters"><b>2</b><span>Filtry<small>notch + pasmowy</small></span></button>
  <button data-prep-focus="prepReference"><b>3</b><span>Referencja<small>oryginalna / CAR / Fz</small></span></button>
  <button data-prep-focus="prepEpochs"><b>4</b><span>Segmentacja<small>−200…800 ms</small></span></button>
  <button data-prep-focus="prepEpochs"><b>5</b><span>QC epok<small>próg amplitudy</small></span></button>
  <button data-prep-focus="prepResults"><b>6</b><span>Weryfikacja<small>sygnał + widmo + metryki</small></span></button>
 </div>
 <div class="prep-layout">
  <div class="prep-controls">
   <section class="panel" id="prepInspect"><h2><span class="dot"></span>1. Kontrola danych</h2>
    <div class="field"><label>Kanał do podglądu</label><select id="prepChannel">${CHANNELS.map(ch=>`<option ${ch==='Cz'?'selected':''}>${ch}</option>`).join('')}</select></div>
    <label class="prep-check"><input id="prepInterpolate" type="checkbox" checked><span><b>Interpoluj kanał Cz</b><small>W symulacji Cz zawiera celowo dodany fragment o bardzo dużym szumie. Interpolacja = średnia Fz i Pz.</small></span></label>
    <button class="btn" id="prepRegenerate">Wygeneruj nową próbkę</button>
   </section>
   <section class="panel" id="prepFilters"><h2><span class="dot"></span>2. Filtry</h2>
    <label class="prep-check"><input id="prepNotch" type="checkbox" checked><span><b>Notch 50 Hz</b><small>Filtr IIR biquad, Q = 28.</small></span></label>
    <div class="field"><label>High-pass filter (filtr górnoprzepustowy) <output id="prepHpOut">0,5 Hz</output></label><input id="prepHp" type="range" min="0" max="5" step="0.1" value="0.5"></div>
    <div class="field"><label>Low-pass filter (filtr dolnoprzepustowy) <output id="prepLpOut">40 Hz</output></label><input id="prepLp" type="range" min="10" max="100" step="1" value="40"></div>
    <div class="prep-warning" id="prepFilterWarning"></div>
   </section>
   <section class="panel" id="prepReference"><h2><span class="dot"></span>3. Referencja</h2>
    <div class="segmented prep-reference"><button data-ref="original">Oryginalna</button><button data-ref="average" class="on">Średnia (CAR)</button><button data-ref="fz">Fz</button></div>
    <p class="readout" id="prepReferenceNote"></p>
   </section>
   <section class="panel" id="prepEpochs"><h2><span class="dot"></span>4–5. Segmentacja i QC</h2>
    <div class="prep-window"><span>−200 ms</span><b>0 ms · bodziec</b><span>+800 ms</span></div>
    <label class="prep-check"><input id="prepBaseline" type="checkbox" checked><span><b>Korekcja linii podstawowej</b><small>Średnia z −200…0 ms jest odejmowana od całej epoki.</small></span></label>
    <div class="field"><label>Odrzuć epokę, gdy |amplituda| &gt; <output id="prepThrOut">100 µV</output></label><input id="prepThreshold" type="range" min="50" max="200" step="5" value="100"></div>
    <div id="prepEpochList" class="prep-epoch-list"></div>
   </section>
  </div>
  <div class="prep-results" id="prepResults">
   <section class="panel prep-signal-panel"><div class="prep-panel-head"><h2><span class="dot"></span>Sygnał przed / po</h2><div class="prep-legend"><span class="raw">surowy</span><span class="processed">po preprocessingu</span></div></div><canvas id="prepSignal" width="1100" height="430"></canvas><div class="readout" id="prepSignalNote"></div></section>
   <div class="prep-metrics" id="prepMetrics"></div>
   <section class="panel"><div class="prep-panel-head"><h2><span class="dot"></span>Widmo mocy 0–60 Hz</h2><div class="prep-legend"><span class="raw">surowy</span><span class="processed">po preprocessingu</span></div></div><canvas id="prepSpectrum" width="1100" height="280"></canvas></section>
   <section class="panel"><h2><span class="dot"></span>Co zmienił pipeline?</h2><div id="prepSummary" class="prep-summary"></div></section>
  </div>
 </div>`;
 $('#main').appendChild(m);
 const nav=$('#nav [data-go="m5"]');if(nav)nav.textContent='Przetwarzanie wstępne';
 bind(m);render(m);
}

function bind(m){
 $('#prepChannel',m).onchange=e=>{state.channel=e.target.value;render(m)};
 $('#prepInterpolate',m).onchange=e=>{state.interpolate=e.target.checked;render(m)};
 $('#prepNotch',m).onchange=e=>{state.notch=e.target.checked;render(m)};
 $('#prepHp',m).oninput=e=>{state.hp=+e.target.value;$('#prepHpOut',m).textContent=state.hp.toFixed(1).replace('.',',')+' Hz';render(m)};
 $('#prepLp',m).oninput=e=>{state.lp=+e.target.value;$('#prepLpOut',m).textContent=state.lp+' Hz';render(m)};
 $('#prepBaseline',m).onchange=e=>{state.baseline=e.target.checked;render(m)};
 $('#prepThreshold',m).oninput=e=>{state.threshold=+e.target.value;$('#prepThrOut',m).textContent=state.threshold+' µV';render(m)};
 $$('[data-ref]',m).forEach(b=>b.onclick=()=>{state.reference=b.dataset.ref;$$('[data-ref]',m).forEach(x=>x.classList.toggle('on',x===b));render(m)});
 $$('[data-prep-focus]',m).forEach(b=>b.onclick=()=>$('#'+b.dataset.prepFocus,m)?.scrollIntoView({behavior:'smooth',block:'center'}));
 $('#prepRegenerate',m).onclick=()=>{seed++;dataset=generateData();render(m)};
}

function render(m){
 if(!m||!dataset)return;
 const raw=dataset.data[state.channel],procAll=processData(),proc=procAll[state.channel],eps=epochs(procAll,state.channel),accepted=eps.filter(e=>e.accepted);
 drawSignal($('#prepSignal',m),raw,proc);
 drawSpectrum($('#prepSpectrum',m),raw,proc);
 renderMetrics(m,raw,proc,accepted.length,eps.length);
 renderEpochs(m,eps);
 renderSummary(m,raw,proc,accepted.length,eps.length);
 const warnings=[];if(state.hp>1)warnings.push('HP > 1 Hz może zniekształcać wolne składowe ERP');if(state.lp<30)warnings.push('LP < 30 Hz może tłumić szybsze składowe');if(state.hp>=state.lp)warnings.push('High-pass musi być niższy niż low-pass');
 $('#prepFilterWarning',m).innerHTML=warnings.length?warnings.map(x=>`<div>⚠ ${x}</div>`).join(''):'Zakres filtrów jest typowy dla demonstracyjnego EEG/ERP.';
 const refText={original:'Brak ponownego referencjonowania: zachowane są potencjały względem referencji symulowanego rejestratora.',average:'CAR: w każdej próbce odejmowana jest średnia ze wszystkich pięciu kanałów.',fz:'Referencja Fz: od każdego kanału odejmowany jest jednoczesny potencjał Fz.'};
 $('#prepReferenceNote',m).textContent=refText[state.reference];
 $('#prepSignalNote',m).innerHTML=`Kanał <b>${state.channel}</b> · ${DURATION} s · ${FS} Hz · ${FS*DURATION} próbek. Pionowe znaczniki oznaczają zdarzenia używane do segmentacji.`;
}

function renderMetrics(m,raw,proc,ok,total){
 const before={rms:rms(raw),pp:p2p(raw),line:toneAmplitude(raw,50)},after={rms:rms(proc),pp:p2p(proc),line:toneAmplitude(proc,50)};
 const drop=before.line?100*(1-after.line/before.line):0;
 $('#prepMetrics',m).innerHTML=`
  <div class="metric"><div class="k">RMS</div><div class="v">${after.rms.toFixed(1)} µV</div><div class="s">surowy ${before.rms.toFixed(1)} µV</div></div>
  <div class="metric"><div class="k">PEAK-TO-PEAK</div><div class="v">${after.pp.toFixed(1)} µV</div><div class="s">surowy ${before.pp.toFixed(1)} µV</div></div>
  <div class="metric"><div class="k">50 Hz</div><div class="v">${after.line.toFixed(2)} µV</div><div class="s">redukcja ${drop.toFixed(0)}%</div></div>
  <div class="metric"><div class="k">EPOKI</div><div class="v">${ok}/${total}</div><div class="s">zaakceptowane</div></div>`;
}
function renderEpochs(m,eps){
 $('#prepEpochList',m).innerHTML=eps.map((e,i)=>`<div class="prep-epoch ${e.accepted?'ok':'bad'}"><b>#${i+1}</b><span>${e.time.toFixed(1)} s</span><span>max |µV| ${e.peak.toFixed(1)}</span><strong>${e.accepted?'AKCEPTUJ':'ODRZUĆ'}</strong></div>`).join('');
}
function renderSummary(m,raw,proc,ok,total){
 const line0=toneAmplitude(raw,50),line1=toneAmplitude(proc,50),items=[];
 if(state.interpolate)items.push('Cz: uszkodzony fragment zastąpiono interpolacją Fz/Pz.');
 if(state.notch)items.push(`Notch 50 Hz: amplituda składowej sieciowej ${line0.toFixed(2)} → ${line1.toFixed(2)} µV.`);
 if(state.hp>0)items.push(`High-pass ${state.hp.toFixed(1)} Hz: redukcja wolnego dryfu.`);
 if(state.lp<100)items.push(`Low-pass ${state.lp} Hz: ograniczenie szybkiej aktywności i szumu powyżej pasma.`);
 items.push(`Referencja: ${state.reference==='average'?'średnia wspólna (CAR)':state.reference==='fz'?'Fz':'oryginalna'}.`);
 items.push(`Segmentacja: ${total} epoki −200…800 ms; zaakceptowano ${ok}, odrzucono ${total-ok} przy progu ${state.threshold} µV.`);
 if(state.baseline)items.push('Korekcja linii podstawowej: włączona dla każdej epoki.');
 $('#prepSummary',m).innerHTML=items.map(x=>`<div>${x}</div>`).join('');
}

function axes(ctx,w,h){const c=colors();ctx.clearRect(0,0,w,h);ctx.fillStyle=c.well;ctx.fillRect(0,0,w,h);ctx.strokeStyle=c.line;ctx.lineWidth=1;for(let i=1;i<5;i++){const y=20+i*(h-55)/5;ctx.beginPath();ctx.moveTo(48,y);ctx.lineTo(w-16,y);ctx.stroke()}return{left:48,right:w-16,top:20,bottom:h-35}}
function drawSignal(cv,raw,proc){
 const ctx=cv.getContext('2d'),c=colors(),a=axes(ctx,cv.width,cv.height),mid1=a.top+(a.bottom-a.top)*.27,mid2=a.top+(a.bottom-a.top)*.73,maxAbs=Math.max(35,peakAbs(raw),peakAbs(proc)),scale=(a.bottom-a.top)*.19/maxAbs;
 for(const t of EVENTS){const x=a.left+t/DURATION*(a.right-a.left);ctx.strokeStyle=c.warn;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(x,a.top);ctx.lineTo(x,a.bottom);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=c.warn;ctx.font='10px IBM Plex Mono';ctx.fillText('S',x+3,a.top+10)}
 const draw=(arr,mid,color)=>{ctx.strokeStyle=color;ctx.lineWidth=1.4;ctx.beginPath();for(let i=0;i<arr.length;i+=2){const x=a.left+i/(arr.length-1)*(a.right-a.left),v=Math.max(-maxAbs,Math.min(maxAbs,arr[i])),y=mid-v*scale;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()};
 draw(raw,mid1,c.muted);draw(proc,mid2,c.accent);ctx.fillStyle=c.text;ctx.font='700 11px IBM Plex Mono';ctx.fillText('SUROWY',8,mid1+4);ctx.fillText('PO',18,mid2+4);ctx.fillStyle=c.muted;ctx.font='10px IBM Plex Mono';for(let s=0;s<=DURATION;s+=2){const x=a.left+s/DURATION*(a.right-a.left);ctx.fillText(s+' s',x-7,cv.height-12)}
}
function drawSpectrum(cv,raw,proc){
 const ctx=cv.getContext('2d'),c=colors(),a=axes(ctx,cv.width,cv.height),r=dftPower(raw),p=dftPower(proc),max=Math.max(...r.map(x=>x.p),...p.map(x=>x.p),1);
 const draw=(rows,color)=>{ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.beginPath();rows.forEach((d,i)=>{const x=a.left+d.f/60*(a.right-a.left),y=a.bottom-Math.min(1,d.p/max)*(a.bottom-a.top);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()};draw(r,c.muted);draw(p,c.accent);
 ctx.strokeStyle=c.warn;ctx.setLineDash([5,5]);const x50=a.left+50/60*(a.right-a.left);ctx.beginPath();ctx.moveTo(x50,a.top);ctx.lineTo(x50,a.bottom);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=c.muted;ctx.font='10px IBM Plex Mono';for(let f=0;f<=60;f+=10){const x=a.left+f/60*(a.right-a.left);ctx.fillText(f+' Hz',x-10,cv.height-12)}
}

window.addEventListener('load',()=>setTimeout(build,700),{once:true});
window.addEventListener('eeg:theme',()=>{const m=$('#m5');if(m)requestAnimationFrame(()=>render(m))});
window.addEventListener('eeg:module',e=>{if(e.detail==='m5'){const m=$('#m5');if(m)requestAnimationFrame(()=>render(m))}});
