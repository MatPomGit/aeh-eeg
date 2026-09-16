import{ELECTRODES,clamp,rand}from'./signal.js';

const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const C=()=>({accent:css('--accent'),danger:css('--danger'),warn:css('--warn'),muted:css('--muted'),line:css('--line'),violet:css('--violet')});

const SYSTEMS={
 '10-20':{
  label:'System 10–20',desc:'Podstawowy międzynarodowy system o stosunkowo małej liczbie elektrod. Dobry do nauki orientacji anatomicznej i klasycznych montaży.',
  points:ELECTRODES.map(e=>({id:e.id,x:e.x,y:e.y,region:e.region}))
 },
 '10-10':{
  label:'System 10–10',desc:'Gęstsze rozmieszczenie elektrod pomiędzy punktami 10–20. Ułatwia analizę topografii i daje lepsze próbkowanie przestrzenne.',
  points:[
   ...ELECTRODES.map(e=>({id:e.id,x:e.x,y:e.y,region:e.region})),
   {id:'AF7',x:48,y:43},{id:'AF3',x:76,y:40},{id:'AFz',x:100,y:39},{id:'AF4',x:124,y:40},{id:'AF8',x:152,y:43},
   {id:'FT7',x:27,y:78},{id:'FC5',x:48,y:78},{id:'FC3',x:70,y:77},{id:'FC1',x:88,y:76},{id:'FCz',x:100,y:76},{id:'FC2',x:112,y:76},{id:'FC4',x:130,y:77},{id:'FC6',x:152,y:78},{id:'FT8',x:173,y:78},
   {id:'CP5',x:48,y:122},{id:'CP3',x:70,y:123},{id:'CP1',x:88,y:124},{id:'CPz',x:100,y:124},{id:'CP2',x:112,y:124},{id:'CP4',x:130,y:123},{id:'CP6',x:152,y:122},
   {id:'TP7',x:27,y:122},{id:'TP8',x:173,y:122},{id:'PO7',x:49,y:157},{id:'PO3',x:76,y:160},{id:'POz',x:100,y:161},{id:'PO4',x:124,y:160},{id:'PO8',x:151,y:157}
  ]
 },
 '10-5':{
  label:'System 10–5',desc:'Bardzo gęste próbkowanie przestrzenne. W praktyce wykorzystywane przy high-density EEG i dokładniejszej analizie topograficznej.',
  points:[]
 }
};

function make105(){
 const pts=[];const rows=[
  [34,['Fp1h','Fpz','Fp2h']],
  [45,['AFp7','AFp3','AFpz','AFp4','AFp8']],
  [56,['AFF9h','AFF7h','AFF5h','AFF3h','AFF1h','AFFz','AFF2h','AFF4h','AFF6h','AFF8h','AFF10h']],
  [72,['FFT9h','FFT7h','FFC5h','FFC3h','FFC1h','FFCz','FFC2h','FFC4h','FFC6h','FFT8h','FFT10h']],
  [90,['FTT9h','FTT7h','FCC5h','FCC3h','FCC1h','FCCz','FCC2h','FCC4h','FCC6h','FTT8h','FTT10h']],
  [108,['TTP9h','TTP7h','CCP5h','CCP3h','CCP1h','CCPz','CCP2h','CCP4h','CCP6h','TTP8h','TTP10h']],
  [126,['TPP9h','TPP7h','CPP5h','CPP3h','CPP1h','CPPz','CPP2h','CPP4h','CPP6h','TPP8h','TPP10h']],
  [144,['PPO9h','PPO7h','PPO5h','PPO3h','PPO1h','PPOz','PPO2h','PPO4h','PPO6h','PPO8h','PPO10h']],
  [160,['POO9h','POO7h','POO3h','POOz','POO4h','POO8h','POO10h']],
  [173,['OI1h','Oz','OI2h']]
 ];
 for(const [y,names] of rows){const span=Math.min(156,38+(100-Math.abs(103-y))*.9),x0=100-span/2;names.forEach((id,i)=>pts.push({id,x:x0+(names.length===1?span/2:i/(names.length-1)*span),y}))}
 // retain canonical 10-20 labels so students can relate systems
 return pts.concat(ELECTRODES.map(e=>({id:e.id,x:e.x,y:e.y,canonical:true})));
}
SYSTEMS['10-5'].points=make105();

function montageSvg(system){
 const s=SYSTEMS[system],small=system==='10-5';
 return `<svg class="montage-map" viewBox="0 0 220 225" role="img" aria-label="${s.label}">
   <circle class="scalp" cx="110" cy="108" r="88"/>
   <path class="feature" d="M98 20L110 7L122 20 M22 98Q12 108 22 118 M198 98Q208 108 198 118"/>
   <g class="landmark nasion"><circle cx="110" cy="7" r="4"/><text x="110" y="3" text-anchor="middle">NASION</text></g>
   <g class="landmark inion"><circle cx="110" cy="196" r="4"/><text x="110" y="214" text-anchor="middle">INION</text></g>
   ${s.points.map(p=>`<g class="montage-electrode ${p.canonical?'canonical':''}"><circle cx="${p.x+10}" cy="${p.y+8}" r="${small?(p.canonical?4.5:2.7):5.7}"/><text x="${p.x+10}" y="${p.y+10}" text-anchor="middle">${small&&!p.canonical?'':p.id}</text><title>${p.id}</title></g>`).join('')}
 </svg>`;
}

function buildMontageSystems(){
 const m=document.createElement('section');m.id='m2x';m.className='module';
 m.innerHTML=`<div class="head"><div><div class="eyebrow">MONTAŻ</div><h1>Systemy rozmieszczenia elektrod EEG</h1><p>Porównuj systemy 10–20, 10–10 i 10–5. Punkty NASION i INION są pokazane jako podstawowe landmarks używane podczas pomiaru głowy i pozycjonowania czepka.</p></div></div>
 <div class="grid g2"><div>
  <div class="panel"><h2><span class="dot"></span>Wybierz system</h2><div class="montage-tabs">${Object.entries(SYSTEMS).map(([k,v])=>`<button class="btn ${k==='10-20'?'primary':''}" data-system="${k}">${v.label}</button>`).join('')}</div><div class="readout" id="system-desc" style="margin-top:12px"></div></div>
  <div class="panel"><h2><span class="dot"></span>Punkty orientacyjne</h2><table><tbody><tr><td><b>NASION</b></td><td>zagłębienie między czołem i nasadą nosa; przedni punkt odniesienia linii środkowej</td></tr><tr><td><b>INION</b></td><td>najbardziej wystający punkt potylicy; tylny punkt odniesienia linii środkowej</td></tr><tr><td>Preauricular L/R</td><td>punkty przed małżowinami usznymi używane do wymiaru poprzecznego</td></tr></tbody></table></div>
  <div class="panel"><h2><span class="dot"></span>Porównanie</h2><div class="readout" id="system-stats"></div><div class="callout" style="margin-top:10px">Rysunek systemu 10–5 jest dydaktycznym schematem zagęszczenia pozycji. W rzeczywistym montażu współrzędne zależą od pomiarów głowy i konkretnego czepka.</div></div>
 </div><div>
  <div class="panel"><h2><span class="dot"></span>Mapa elektrod</h2><div id="montage-map-wrap"></div></div>
  <div class="panel"><h2><span class="dot"></span>Ćwiczenie</h2><p>Przełącz systemy i zwróć uwagę, że kolejne standardy nie zmieniają punktów anatomicznych — zwiększają przede wszystkim gęstość próbkowania powierzchni głowy.</p><div class="row"><button class="btn" id="show-labels">Pokaż/ukryj wszystkie etykiety</button></div></div>
 </div></div>`;
 $('#main').appendChild(m);
 let current='10-20',labels=true;
 function render(){const s=SYSTEMS[current];$('#montage-map-wrap',m).innerHTML=montageSvg(current);$('#system-desc',m).innerHTML=`<b>${s.label}</b> — ${s.desc}`;$('#system-stats',m).innerHTML=`Liczba punktów na schemacie: <b>${s.points.length}</b> · gęstość: <b>${current==='10-20'?'podstawowa':current==='10-10'?'średnia':'wysoka'}</b> · landmarks: <b>NASION / INION</b>`;m.classList.toggle('hide-montage-labels',!labels)}
 $$('[data-system]',m).forEach(b=>b.onclick=()=>{current=b.dataset.system;$$('[data-system]',m).forEach(x=>x.classList.toggle('primary',x===b));render()});
 $('#show-labels',m).onclick=()=>{labels=!labels;m.classList.toggle('hide-montage-labels',!labels)};
 render();
}

function rebuildNav2(){
 const items=[['m0','Start','workflow i zasady'],['m1x','Sygnał i pasma','rytmy, artefakty, próbkowanie'],['mfft','FFT','czas → częstotliwość'],['m2x','Montaż','10–20, 10–10, 10–5'],['m3','Eksperyment oddball','bodźce, triggery, reakcje'],['m5','PreProcessing','kontrola i czyszczenie'],['mpostx','PostProcessing','ERP, PSD, cechy'],['mfiles','Zapis danych EEG','EDF, BDF, EEG, BIDS'],['msimlive','SimLive','oczy + mięśnie → EEG'],['m6','Multimodalność','EMG, EKG, EDA, wzrok'],['m7','Źródła','forward/inverse problem']];
 const nav=$('#nav');if(!nav)return;nav.innerHTML='<h4>Wirtualne laboratorium</h4>';
 items.forEach((x,i)=>{const b=document.createElement('button');b.dataset.go=x[0];b.innerHTML=`<span class="n">${i}</span><span><div class="t">${x[1]}</div><div class="d">${x[2]}</div></span>`;b.onclick=()=>{$$('.module').forEach(mm=>mm.classList.toggle('active',mm.id===x[0]));$$('#nav button').forEach(bb=>bb.classList.toggle('active',bb===b));window.scrollTo({top:0,behavior:'smooth'})};nav.appendChild(b)});
 nav.querySelector('[data-go="m0"]')?.classList.add('active');
}

const muscle={enabled:false,landmarker:null,running:false,raf:0,score:0,prevMouth:null,emg:[],modelLoading:false};
function augmentSimLive(){
 const m=$('#msimlive');if(!m)return;
 const status=$('#livestatus',m)?.closest('.panel');
 if(status&&!$('#muscle-toggle',m)){
  const box=document.createElement('div');box.className='muscle-box';box.innerHTML=`<label class="toggle-row"><input type="checkbox" id="muscle-toggle"><span><b>Śledzenie artefaktów mięśniowych</b><small>MediaPipe analizuje ruch ust, żuchwy, policzków i brwi. Wykryta aktywność zwiększa szerokopasmowy komponent EMG w kanałach czołowo-skroniowych.</small></span></label><div class="live-metrics" style="margin-top:10px"><div class="metric"><div class="k">EMG TWARZY</div><div class="v" id="muscle-score">0%</div></div><div class="metric"><div class="k">STAN</div><div class="v" id="muscle-state">wyłączone</div></div></div>`;status.appendChild(box);
  $('#muscle-toggle',m).onchange=e=>{muscle.enabled=e.target.checked;$('#muscle-state',m).textContent=muscle.enabled?'inicjalizacja…':'wyłączone';if(muscle.enabled)startMuscleTracking();else stopMuscleTracking()};
 }
 const base=$('#liveeeg',m);if(base&&!$('#livecombined',m)){
  const combined=document.createElement('canvas');combined.id='livecombined';combined.width=base.width;combined.height=base.height;base.insertAdjacentElement('afterend',combined);base.style.display='none';
  const legend=combined.nextElementSibling;if(legend?.classList.contains('legend'))legend.insertAdjacentHTML('beforeend','<span><i class="swatch" style="background:var(--violet)"></i>EMG twarzy/mowa — opcjonalne</span>');
 }
 muscle.emg=new Array(750).fill(0);drawCombinedLoop();
}

async function startMuscleTracking(){
 const m=$('#msimlive'),video=$('#livevideo',m);if(!video||muscle.modelLoading)return;muscle.modelLoading=true;
 try{
  const mp=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/+esm');
  const vision=await mp.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm');
  muscle.landmarker=await mp.FaceLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'},runningMode:'VIDEO',numFaces:1,outputFaceBlendshapes:true,minFaceDetectionConfidence:.5,minTrackingConfidence:.5});
  muscle.running=true;$('#muscle-state',m).textContent='aktywne';muscleLoop();
 }catch(err){$('#muscle-state',m).textContent='błąd';console.error('Muscle tracking:',err)}finally{muscle.modelLoading=false}
}
function stopMuscleTracking(){muscle.running=false;cancelAnimationFrame(muscle.raf);muscle.landmarker?.close?.();muscle.landmarker=null;muscle.score=0;const m=$('#msimlive');if(m){$('#muscle-score',m).textContent='0%';$('#muscle-state',m).textContent='wyłączone'}}
function blendScore(categories){const get=name=>categories.find(c=>c.categoryName===name)?.score||0;const jaw=get('jawOpen');const mouth=Math.max(get('mouthPucker'),get('mouthFunnel'),get('mouthSmileLeft'),get('mouthSmileRight'),get('mouthPressLeft'),get('mouthPressRight'));const cheek=Math.max(get('cheekPuff'),get('cheekSquintLeft'),get('cheekSquintRight'));const brow=Math.max(get('browDownLeft'),get('browDownRight'),get('browInnerUp'));return clamp(.48*jaw+.26*mouth+.16*cheek+.10*brow,0,1)}
function mouthMotion(lm){if(!lm)return 0;const ids=[13,14,61,291,78,308];const c=ids.map(i=>lm[i]);const cur=c.reduce((s,p)=>s+p.x+p.y,0)/c.length;if(muscle.prevMouth==null){muscle.prevMouth=cur;return 0}const d=Math.abs(cur-muscle.prevMouth);muscle.prevMouth=cur;return clamp(d*45,0,1)}
function muscleLoop(){if(!muscle.running)return;const m=$('#msimlive'),video=$('#livevideo',m);if(video?.readyState>=2){const res=muscle.landmarker.detectForVideo(video,performance.now());const cats=res.faceBlendshapes?.[0]?.categories||[];const lm=res.faceLandmarks?.[0];const bs=blendScore(cats),mv=mouthMotion(lm);muscle.score=.8*muscle.score+.2*clamp(bs+mv*.55,0,1);$('#muscle-score',m).textContent=Math.round(muscle.score*100)+'%';$('#muscle-state',m).textContent=muscle.score>.42?'silna aktywność':muscle.score>.18?'umiarkowana':'niska';}muscle.raf=requestAnimationFrame(muscleLoop)}
function drawCombinedLoop(){const m=$('#msimlive');if(!m)return;const src=$('#liveeeg',m),dst=$('#livecombined',m);if(!src||!dst)return;const ctx=dst.getContext('2d'),c=C();ctx.clearRect(0,0,dst.width,dst.height);ctx.drawImage(src,0,0);const amp=muscle.enabled?muscle.score*52:0;muscle.emg.push((rand(-1,1)*amp)+(Math.sin(performance.now()/11)*amp*.22));muscle.emg.shift();if(amp>1){ctx.strokeStyle=c.violet;ctx.lineWidth=1.15;ctx.beginPath();muscle.emg.forEach((v,i)=>{const x=48+i/(muscle.emg.length-1)*(dst.width-62),y=115-clamp(v,-70,70)/70*78;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();}requestAnimationFrame(drawCombinedLoop)}

function init2(){buildMontageSystems();rebuildNav2();augmentSimLive();}
window.addEventListener('load',()=>setTimeout(init2,0),{once:true});
window.addEventListener('beforeunload',stopMuscleTracking);
