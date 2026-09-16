const $=(s,r=document)=>r.querySelector(s);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const rand=(a,b)=>a+Math.random()*(b-a);

const odd={active:false,running:false,raf:0,last:0,acc:0,fs:250,duration:4,t:0,buf:[],events:[],markers:[],runToken:0};

function css(n,fallback){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()||fallback}
function initBuffer(){odd.buf=[];odd.events=[];odd.markers=[];odd.t=0;for(let i=0;i<odd.fs*odd.duration;i++)odd.buf.push(sample())}
function g(x,mu,s,a){const z=(x-mu)/s;return a*Math.exp(-.5*z*z)}
function sample(){
 odd.t+=1/odd.fs;
 let v=3.2*Math.sin(2*Math.PI*9.5*odd.t)+2*Math.sin(2*Math.PI*18*odd.t)+rand(-2.2,2.2);
 for(const e of odd.events){
  const d=odd.t-e.t;if(d<0||d>1.15)continue;
  v+=g(d,.09,.022,-8)+g(d,.18,.035,6);
  if(e.target)v+=g(d,.25,.045,-8)+g(d,.35,.065,26);
  else v+=g(d,.30,.055,5);
 }
 odd.events=odd.events.filter(e=>odd.t-e.t<1.2);
 return v;
}
function step(n){for(let i=0;i<n;i++){odd.buf.push(sample());if(odd.buf.length>odd.fs*odd.duration)odd.buf.shift()}}
function draw(){
 const cv=$('#oddballEeg');if(!cv)return;
 const ctx=cv.getContext('2d'),W=cv.width,H=cv.height,left=42,right=W-12,top=16,bottom=H-28,well=css('--well','#fff'),line=css('--line','#ddd'),accent=css('--accent','#087f70'),muted=css('--muted','#667'),danger=css('--danger','#b53e35'),violet=css('--violet','#6954b8');
 ctx.clearRect(0,0,W,H);ctx.fillStyle=well;ctx.fillRect(0,0,W,H);ctx.strokeStyle=line;ctx.lineWidth=1;
 for(let i=1;i<4;i++){const y=top+i*(bottom-top)/4;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke()}
 ctx.fillStyle=muted;ctx.font='10px IBM Plex Mono';ctx.fillText('µV',8,16);ctx.fillText('4 s',W-34,H-8);
 for(const e of odd.markers){const age=odd.t-e.t;if(age<0||age>odd.duration)continue;const x=right-age/odd.duration*(right-left);ctx.strokeStyle=e.target?danger:violet;ctx.globalAlpha=.55;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=e.target?danger:violet;ctx.font='700 10px IBM Plex Mono';ctx.fillText(e.target?'S2':'S1',Math.min(x+3,right-16),top+11)}
 odd.markers=odd.markers.filter(e=>odd.t-e.t<odd.duration+.1);
 ctx.strokeStyle=accent;ctx.lineWidth=1.7;ctx.beginPath();odd.buf.forEach((v,i)=>{const x=left+i/Math.max(odd.buf.length-1,1)*(right-left),y=(top+bottom)/2-Math.max(-40,Math.min(40,v))/40*(bottom-top)*.45;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();
}
function loop(now){
 if(!odd.active){odd.raf=0;return}
 if(!odd.last)odd.last=now;const dt=Math.min((now-odd.last)/1000,.1);odd.last=now;odd.acc+=dt*odd.fs;const n=Math.floor(odd.acc);if(n>0){step(n);odd.acc-=n}draw();odd.raf=requestAnimationFrame(loop)
}
function setActive(on){odd.active=on;if(on){odd.last=performance.now();odd.acc=0;if(!odd.buf.length)initBuffer();if(!odd.raf)odd.raf=requestAnimationFrame(loop)}else{if(odd.raf)cancelAnimationFrame(odd.raf);odd.raf=0;odd.last=0;odd.acc=0}}
function addEvent(target,seq){const e={t:odd.t,target,seq};odd.events.push(e);odd.markers.push(e);return e}
function appendRow(tbody,row){tbody.insertAdjacentHTML('beforeend',`<tr class="oddball-event-row ${row.target?'target':'standard'}"><td>${row.i}</td><td class="mono">${row.time}</td><td>${row.target?'docelowy':'standardowy'}</td><td class="mono"><b>${row.target?'S2':'S1'}</b></td><td>${row.rt??'—'}</td><td>${row.response}</td></tr>`);const wrap=tbody.closest('.tablewrap');if(wrap)wrap.scrollTop=wrap.scrollHeight}

async function runExperiment(m){
 const run=$('#runexp',m);if(!run||run.disabled)return;
 const token=++odd.runToken;run.disabled=true;
 const tbody=$('#events',m),stim=$('#stim',m),beh=$('#beh',m);tbody.innerHTML='';odd.events=[];odd.markers=[];beh.textContent='Eksperyment w toku…';setActive(true);
 const n=+$('#ntrials',m).value,p=+$('#ptarget',m).value/100,isi=+$('#isi',m).value,jit=+$('#jitter',m).value;let targets=0,correct=0,falseAlarms=0,rts=[];const started=performance.now();
 for(let i=0;i<n;i++){
  if(token!==odd.runToken)break;
  const target=Math.random()<p;if(target)targets++;
  addEvent(target,i+1);
  const response=Math.random()<(target?.91:.06),rt=response?Math.round(rand(280,680)):null;if(target&&response){correct++;rts.push(rt)}if(!target&&response)falseAlarms++;
  const onset=performance.now()-started;appendRow(tbody,{i:i+1,time:(onset/1000).toFixed(3)+' s',target,rt,response:response?'SPACE':'—'});
  stim.innerHTML=`<div class="oddball-stim ${target?'target':'standard'}">${target?'●':'○'}</div><div class="oddball-live-label">${target?'BODZIEC DOCELOWY · S2':'BODZIEC STANDARDOWY · S1'}</div>`;
  const shown=Math.min(360,Math.max(190,isi*.30));await wait(shown);if(token!==odd.runToken)break;
  stim.innerHTML='<div class="oddball-fix">+</div><div class="oddball-live-label">przerwa między bodźcami</div>';
  await wait(Math.max(120,isi+rand(-jit,jit)-shown));
 }
 if(token===odd.runToken){beh.innerHTML=`Bodźce docelowe: <b>${targets}</b>; trafienia: <b>${correct}</b>; fałszywe alarmy: <b>${falseAlarms}</b>; poprawność dla bodźców docelowych: <b>${Math.round(100*correct/Math.max(1,targets))}%</b>; średni czas reakcji: <b>${rts.length?Math.round(rts.reduce((a,b)=>a+b,0)/rts.length):'—'} ms</b>.`;stim.textContent='✓'}
 run.disabled=false;
}

function enhance(){
 const m=$('#m3');if(!m||m.dataset.oddballRuntime)return;m.dataset.oddballRuntime='1';
 const params=$('#runexp',m)?.closest('.panel');if(!params)return;
 let panel=$('.oddball-eeg-panel',m);if(!panel){panel=document.createElement('div');panel.className='panel oddball-eeg-panel';params.after(panel)}
 panel.innerHTML=`<h2><span class="dot"></span>Symulacja EEG</h2><canvas id="oddballEeg" width="900" height="250"></canvas><div class="readout">Pionowe znaczniki S1/S2 odpowiadają dokładnie zdarzeniom zapisanym w tabeli. S2 wywołuje wyraźniejszą odpowiedź N2/P3 około 250–400 ms po bodźcu.</div>`;
 if(!odd.buf.length)initBuffer();draw();
 $('#runexp',m).onclick=()=>runExperiment(m);
 if(m.classList.contains('active'))setActive(true);
}

window.addEventListener('load',()=>setTimeout(enhance,360),{once:true});
window.addEventListener('eeg:module',e=>{if(e.detail==='m3')setActive(true);else{setActive(false);if(odd.running){odd.runToken++;odd.running=false}}});
window.addEventListener('eeg:theme',()=>requestAnimationFrame(draw));
window.addEventListener('beforeunload',()=>setActive(false));