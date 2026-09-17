const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];

const GROUPS=[
 {name:'Sygnał',desc:'EEG, pasma i częstotliwość',items:[['m1x','Sygnał EEG i pasma'],['mfft','FFT'],['mlobes','Płat–funkcja–pasmo']]},
 {name:'Pomiar',desc:'elektrody i rejestracja',items:[['m2x','Montaż'],['msimlive2','SimLive'],['mphys2','EMG · EKG · GSR'],['meye2','Eye Tracking']]},
 {name:'Eksperyment',desc:'paradygmaty i zdarzenia',items:[['m3','Paradygmat oddball'],['mstroop','Eksperyment Stroopa']]},
 {name:'Przetwarzanie',desc:'czyszczenie i przygotowanie',items:[['m5','PreProcessing'],['mica','ICA'],['mpostx','PostProcessing']]},
 {name:'Analiza',desc:'qEEG, topografia i interpretacja',items:[['mqeeg','qEEG'],['mheat','qEEG HeatMap'],['m7','Źródła EEG'],['mclinical','EEG klinicznie'],['mquiz','Sprawdź się']]},
 {name:'Zapis',desc:'formaty i organizacja danych',items:[['mformats','Formaty plików'],['mbids','BIDS']]}
];
const handlers=new Map();let openGroup=0,lastScan='';

function navigate(id){
 const fn=handlers.get(id);
 if(typeof fn==='function')fn();
 else{
  $$('.module').forEach(m=>m.classList.toggle('active',m.id===id));
  window.dispatchEvent(new CustomEvent('eeg:module',{detail:id}));
  window.scrollTo({top:0,behavior:'smooth'});
 }
 renderGroups();
}
function renderGroups(){
 const nav=$('#nav');if(!nav)return;
 $$('.nav-group',nav).forEach((g,i)=>g.classList.toggle('open',i===openGroup));
 const active=$('.module.active')?.id;
 $$('.nav-sub',nav).forEach(b=>b.classList.toggle('active',b.dataset.go===active));
}
function buildGroupedNav(){
 const nav=$('#nav');if(!nav)return;
 $$('button[data-go]',nav).forEach(b=>handlers.set(b.dataset.go,b.onclick));
 nav.dataset.grouped='1';nav.innerHTML='';
 GROUPS.forEach((g,gi)=>{
  const box=document.createElement('section');box.className='nav-group';box.dataset.group=String(gi);
  const head=document.createElement('button');head.className='nav-group-head';head.innerHTML=`<span class="n">${gi+1}</span><span><div class="t">${g.name}</div><div class="d">${g.desc}</div></span><i>⌄</i>`;
  const body=document.createElement('div');body.className='nav-group-items';
  g.items.forEach(([id,label])=>{const b=document.createElement('button');b.className='nav-sub';b.dataset.go=id;b.textContent=label;b.onclick=e=>{e.stopPropagation();openGroup=gi;navigate(id)};body.appendChild(b)});
  head.onclick=()=>{openGroup=openGroup===gi?-1:gi;renderGroups()};box.append(head,body);nav.appendChild(box);
 });
 renderGroups();navigate('m1x');
}

function addStroop(){
 if($('#mstroop'))return;
 const m=document.createElement('section');m.id='mstroop';m.className='module';
 m.innerHTML=`<div class="head"><div><div class="eyebrow">EKSPERYMENT · STROOP</div><h1>Test Stroopa</h1><p>Nazwij kolor czcionki, ignorując znaczenie słowa. Porównanie prób zgodnych i niezgodnych pozwala zobaczyć efekt interferencji poznawczej.</p></div></div><div class="grid g2"><div><div class="panel"><h2><span class="dot"></span>Próba</h2><div class="stroop-stage"><div class="stroop-word" id="stroopWord">GOTOWY</div></div><div class="stroop-actions"><button class="btn" data-color="red">Czerwony</button><button class="btn" data-color="green">Zielony</button><button class="btn" data-color="blue">Niebieski</button><button class="btn" data-color="yellow">Żółty</button></div><div id="stroopFeedback" class="stroop-feedback"></div></div></div><div><div class="panel"><h2><span class="dot"></span>Wyniki</h2><div class="stroop-metrics"><div class="metric"><div class="k">PRÓBY</div><div class="v" id="stroopN">0</div></div><div class="metric"><div class="k">POPRAWNE</div><div class="v" id="stroopOk">0</div></div><div class="metric"><div class="k">ŚR. CZAS</div><div class="v" id="stroopRt">—</div></div><div class="metric"><div class="k">INTERFERENCJA</div><div class="v" id="stroopInt">—</div></div></div><div class="row" style="margin-top:12px"><button class="btn primary" id="stroopStart">Rozpocznij / nowa próba</button><button class="btn" id="stroopReset">Wyzeruj wyniki</button></div></div><div class="panel"><h2><span class="dot"></span>Zasada</h2><p class="stroop-help">Reaguj na <b>kolor czcionki</b>, a nie na treść słowa. Próba zgodna ma tę samą nazwę i barwę, a niezgodna zawiera konflikt między znaczeniem słowa i kolorem zapisu.</p></div></div></div>`;
 $('#main').appendChild(m);
 const names={red:'CZERWONY',green:'ZIELONY',blue:'NIEBIESKI',yellow:'ŻÓŁTY'},colors={red:'#d33b32',green:'#168a55',blue:'#2563c7',yellow:'#d59a00'},keys=Object.keys(names);let current=null,start=0,stats={n:0,ok:0,con:[],inc:[]};
 function render(){const all=[...stats.con,...stats.inc];$('#stroopN',m).textContent=stats.n;$('#stroopOk',m).textContent=stats.ok;$('#stroopRt',m).textContent=all.length?Math.round(all.reduce((a,b)=>a+b,0)/all.length)+' ms':'—';if(stats.con.length&&stats.inc.length){const a=stats.con.reduce((x,y)=>x+y,0)/stats.con.length,b=stats.inc.reduce((x,y)=>x+y,0)/stats.inc.length;$('#stroopInt',m).textContent=Math.round(b-a)+' ms'}else $('#stroopInt',m).textContent='—'}
 function trial(){const ink=keys[Math.floor(Math.random()*4)],congruent=Math.random()<.5,word=congruent?ink:keys.filter(k=>k!==ink)[Math.floor(Math.random()*3)];current={ink,congruent};$('#stroopWord',m).textContent=names[word];$('#stroopWord',m).style.color=colors[ink];$('#stroopFeedback',m).textContent='';start=performance.now()}
 $$('[data-color]',m).forEach(b=>b.onclick=()=>{if(!current)return;const rt=performance.now()-start,good=b.dataset.color===current.ink;stats.n++;if(good){stats.ok++;(current.congruent?stats.con:stats.inc).push(rt)}const f=$('#stroopFeedback',m);f.textContent=good?`Poprawnie · ${Math.round(rt)} ms`:`Błędnie · poprawna odpowiedź: ${names[current.ink].toLowerCase()}`;f.className='stroop-feedback '+(good?'ok':'bad');current=null;render();setTimeout(trial,550)});
 $('#stroopStart',m).onclick=trial;$('#stroopReset',m).onclick=()=>{stats={n:0,ok:0,con:[],inc:[]};current=null;$('#stroopWord',m).textContent='GOTOWY';$('#stroopWord',m).style.color='';$('#stroopFeedback',m).textContent='';render()};render();
}

function compactTeaching(){
 const q=$('#mqeeg');q?.querySelector('.grid.g2')?.classList.add('qeeg-compare-row');
 const p=$('#m5'),intro=p?.querySelector('.teaching-intro'),pipe=p?.querySelector('#pipe')?.closest('.panel');if(intro&&pipe&&!intro.parentElement?.classList.contains('prep-top-row')){intro.innerHTML='<h2><span class="dot"></span>Co masz zrobić?</h2><p><b>Cel:</b> przygotować surowy EEG do analizy bez usuwania użytecznej aktywności. <b>Kolejność:</b> jakość kanałów → zakłócenia → filtry → referencja → segmentacja/odrzucanie → ICA → korekcja linii podstawowej.</p>';pipe.classList.add('pipeline-panel');const row=document.createElement('div');row.className='prep-top-row';intro.before(row);row.append(intro,pipe)}
 const ica=$('#mica');if(ica&&!ica.dataset.compactFinal){ica.dataset.compactFinal='1';ica.querySelector('.teaching-intro')?.remove();const p2=ica.querySelector('.head p');if(p2)p2.textContent='ICA rozkłada wielokanałowy EEG na możliwie niezależne komponenty, aby rozpoznać m.in. EOG i EMG. Oceń komponenty, usuń tylko dobrze uzasadnione artefakty i sprawdź rekonstrukcję.';ica.querySelector('.pipeline')?.closest('.panel')?.classList.add('ica-pipeline-compact')}
}

function deterministicNoise(i){return .48*Math.sin(i*1.731)+.31*Math.sin(i*.437+1.2)+.21*Math.cos(i*2.117+.4)}
function postAxes(ctx,w,h,min,max,ticks,unit){const s=getComputedStyle(document.documentElement),line=s.getPropertyValue('--line').trim(),muted=s.getPropertyValue('--muted').trim(),well=s.getPropertyValue('--well').trim();ctx.clearRect(0,0,w,h);ctx.fillStyle=well;ctx.fillRect(0,0,w,h);const left=52,right=w-18,bottom=h-34,top=18;ctx.strokeStyle=line;ctx.fillStyle=muted;ctx.font='11px IBM Plex Mono';ctx.textAlign='center';ticks.forEach(v=>{const x=left+(v-min)/(max-min)*(right-left);ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();ctx.fillText(String(v),x,h-15)});ctx.textAlign='right';ctx.fillText(unit,right,h-3);ctx.textAlign='left';return{left,right,top,bottom}}
function renderPost(){
 const m=$('#mpostx'),cv=m?.querySelector('#postcanvas'),range=m?.querySelector('#postnr');if(!cv||!range)return;const n=+range.value||30,mode=m.dataset.post||'erp',ctx=cv.getContext('2d'),s=getComputedStyle(document.documentElement),accent=s.getPropertyValue('--accent').trim(),violet=s.getPropertyValue('--violet').trim(),text=s.getPropertyValue('--text').trim(),read=m.querySelector('#postread'),desc=m.querySelector('#postdesc');m.querySelector('#postn').textContent=n;
 if(mode==='erp'){const a=postAxes(ctx,cv.width,cv.height,-200,800,[-200,0,200,400,600,800],'ms'),mid=(a.top+a.bottom)/2,noise=34/Math.sqrt(n);ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<600;i++){const ms=-200+i/599*1000,v=-3.6*Math.exp(-((ms-105)**2)/(2*25**2))+4*Math.exp(-((ms-205)**2)/(2*35**2))+12*Math.exp(-((ms-340)**2)/(2*52**2))+noise*deterministicNoise(i),x=a.left+i/599*(a.right-a.left),y=mid-v/22*(a.bottom-a.top)/2;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();if(desc)desc.textContent='ERP: średnia epok od −200 do 800 ms względem bodźca.';if(read)read.innerHTML=`Uśredniono <b>${n}</b> prób. Modelowy poziom szumu maleje wraz z liczbą prób w przybliżeniu jak 1/√N.`}
 else if(mode==='psd'){const a=postAxes(ctx,cv.width,cv.height,0,60,[0,10,20,30,40,50,60],'Hz'),noise=26/Math.sqrt(n);ctx.strokeStyle=violet;ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<=240;i++){const f=i/4,p=Math.max(0,4+43*Math.exp(-((f-10)**2)/5.5)+12*Math.exp(-((f-20)**2)/20)+noise*deterministicNoise(i)),x=a.left+f/60*(a.right-a.left),y=a.bottom-Math.min(p,65)/65*(a.bottom-a.top);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();if(desc)desc.textContent='PSD: moc w funkcji częstotliwości, tutaj w zakresie 0–60 Hz.';if(read)read.innerHTML=`Uśredniono <b>${n}</b> segmentów. Więcej segmentów zmniejsza wariancję estymacji PSD.`}
 else{const a=postAxes(ctx,cv.width,cv.height,0,70,[0,20,40,60],'a.u.'),bands=[['δ',18],['θ',25],['α',48],['β',31],['γ',12]],dev=28/Math.sqrt(n),bw=(a.right-a.left)/bands.length;bands.forEach(([lab,base],i)=>{const v=Math.max(2,Math.min(70,base+dev*deterministicNoise(i*37+5))),x=a.left+i*bw+bw*.18,height=v/70*(a.bottom-a.top);ctx.fillStyle=i===2?accent:violet;ctx.fillRect(x,a.bottom-height,bw*.62,height);ctx.fillStyle=text;ctx.font='700 18px IBM Plex Mono';ctx.textAlign='center';ctx.fillText(lab,x+bw*.31,cv.height-12)});ctx.textAlign='left';if(desc)desc.textContent='Cechy pasmowe: moc zagregowana w pasmach δ, θ, α, β i γ.';if(read)read.innerHTML=`N=<b>${n}</b> segmentów. Większa liczba segmentów stabilizuje wartości cech.`}
}
function improvePost(){const m=$('#mpostx');if(!m||m.dataset.postFinal)return;m.dataset.postFinal='1';const r=m.querySelector('#postnr');if(!r)return;r.max='120';r.min='1';r.step='1';r.oninput=renderPost;$$('[data-post]',m).forEach(b=>b.onclick=()=>{$$('[data-post]',m).forEach(x=>x.classList.toggle('on',x===b));m.dataset.post=b.dataset.post;renderPost()});renderPost()}

function montageKey(){const wrap=$('#montage-map-wrap');if(!wrap)return;const svg=$('svg[aria-label="System 10–5"]',wrap);wrap.querySelector('.montage-105-key')?.remove();if(!svg)return;const names=[...svg.querySelectorAll('title')].map(x=>x.textContent).filter(Boolean);const box=document.createElement('div');box.className='montage-105-key';box.innerHTML=`<h3>Oznaczenia elektrod systemu 10–5</h3><p>Na mapie pozostawiono przede wszystkim etykiety orientacyjne. Pełny zestaw pozycji znajduje się poniżej; przyrostek <b>h</b> oznacza pozycję pośrednią.</p><div class="montage-105-chips">${names.map(n=>`<span>${n}</span>`).join('')}</div>`;wrap.appendChild(box)}

function eyePolish(){const m=$('#meye2');if(!m)return;const p=$('.head p',m);if(p&&p.textContent.includes('Śledź fiksacje'))p.remove();const seg=$('[data-eye-mode]',m)?.closest('.segmented');if(seg&&!seg.classList.contains('eye-mode-box')){seg.classList.add('eye-mode-box');const lab=document.createElement('span');lab.className='eye-mode-label';lab.textContent='TRYB POMIARU';seg.prepend(lab)}const panel=$('.eye-screen-panel',m);if(panel&&!$('#heatLegend',m)){const l=document.createElement('div');l.id='heatLegend';l.className='heat-legend';l.innerHTML='<span>mniej fiksacji</span><i></i><span>więcej fiksacji</span>';panel.appendChild(l)}}
function rebuildScanpath(){const m=$('#meye2');if(!m?.classList.contains('active'))return;const layer=$('#eyeOverlayLayer',m);if(!layer||getComputedStyle(layer).display==='none')return;const fixes=$$('.eye-fix',layer),sig=fixes.map(f=>`${f.style.left},${f.style.top}`).join('|')+`@${layer.clientWidth}x${layer.clientHeight}`;if(sig===lastScan)return;lastScan=sig;$$('.eye-saccade',layer).forEach(x=>x.remove());const w=layer.clientWidth,h=layer.clientHeight;if(!w||!h)return;const pts=fixes.map(f=>({x:parseFloat(f.style.left)/100*w,y:parseFloat(f.style.top)/100*h}));for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],dx=b.x-a.x,dy=b.y-a.y,s=document.createElement('i');s.className='eye-saccade';s.style.left=a.x+'px';s.style.top=a.y+'px';s.style.width=Math.hypot(dx,dy)+'px';s.style.transform=`rotate(${Math.atan2(dy,dx)*180/Math.PI}deg)`;layer.insertBefore(s,layer.firstChild)}}
function eyeLoop(){rebuildScanpath();requestAnimationFrame(eyeLoop)}

function simplifyHeaders(){ $$('.module .head h1').forEach(h=>h.style.display='none'); }
function init(){addStroop();setTimeout(()=>{buildGroupedNav();compactTeaching();improvePost();montageKey();eyePolish();simplifyHeaders();const wrap=$('#montage-map-wrap');if(wrap)new MutationObserver(montageKey).observe(wrap,{childList:true,subtree:true});new MutationObserver(()=>{renderGroups();simplifyHeaders()}).observe($('#main'),{subtree:true,attributes:true,attributeFilter:['class']})},1050);requestAnimationFrame(eyeLoop)}
window.addEventListener('load',init,{once:true});window.addEventListener('eeg:module',e=>{if(e.detail==='m5'||e.detail==='mica'||e.detail==='mqeeg')setTimeout(compactTeaching,0);if(e.detail==='mpostx')setTimeout(()=>{improvePost();renderPost()},0);if(e.detail==='m2x')setTimeout(montageKey,0);if(e.detail==='meye2'){lastScan='';setTimeout(eyePolish,0)}});window.addEventListener('resize',()=>{lastScan=''});
