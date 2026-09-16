import{ELECTRODES,clamp}from'./signal.js';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const C=()=>({accent:css('--accent')||'#087f70',violet:css('--violet')||'#6656d9',danger:css('--danger')||'#b53e35',warn:css('--warn')||'#c47b18',muted:css('--muted')||'#66777d',line:css('--line')||'#d9e0e2',well:css('--well')||'#fff'});
function head(t,d,l){return`<div class="head source-head"><div><div class="eyebrow">${l}</div><h1>${t}</h1><p>${d}</p></div></div>`}
const pts=ELECTRODES.map(e=>({...e,x:(e.x-100)/88,y:(e.y-100)/88}));
const state={radius:.24,dragging:false};

function build(){
 const old=$('#m7');if(old)old.remove();
 const m=document.createElement('section');m.id='m7';m.className='module';
 m.innerHTML=head('Analiza źródłowa — forward i inverse problem','Elektrody rejestrują potencjały na skalpie, nie bezpośrednio aktywność źródła. Moduł pokazuje, jak położenie, głębokość i rozmiar generatora wpływają na mapę oraz dlaczego inverse problem nie ma jednego rozwiązania.','MODUŁ 7 · ANALIZA ŹRÓDŁOWA')+`<div class="grid g2 source-main-grid" style="margin-top:14px"><div><div class="panel source-intro compact-source-intro"><div class="source-concepts"><div><b>Forward problem</b><p>Znane źródło i model głowy → przewidywane napięcia na elektrodach.</p><div class="source-arrow">źródło → tkanki → elektrody</div></div><div><b>Inverse problem</b><p>Znane napięcia na elektrodach → szukamy możliwego źródła; wynik jest niejednoznaczny.</p><div class="source-arrow">elektrody → ? → źródła</div></div></div></div><div class="panel"><h2><span class="dot"></span>1. Ustaw źródło</h2><div class="field"><label>Głębokość źródła <output id="srcDepthOut">35%</output></label><input id="srcDepth" type="range" min="5" max="95" value="35"></div><div class="field"><label>Pozycja lewo–prawo <output id="srcXOut">0</output></label><input id="srcX" type="range" min="-70" max="70" value="0"></div><div class="field"><label>Pozycja przód–tył <output id="srcYOut">+25</output></label><input id="srcY" type="range" min="-65" max="65" value="25"></div><div class="field"><label>Średnica obszaru <output id="srcSizeOut">48%</output></label><input id="srcSize" type="range" min="8" max="70" value="48"></div><div class="readout" id="srcExplain"></div></div><div class="panel"><h2><span class="dot"></span>Co ma zauważyć student?</h2><ul class="source-lessons"><li>Płytsze źródło daje bardziej ogniskową topografię i zwykle większą amplitudę na najbliższych elektrodach.</li><li>Głębsze źródło daje słabszy i bardziej rozległy przestrzennie wzorzec na skalpie.</li><li>Przesunięcie źródła zmienia lokalizację maksimum na mapie elektrod.</li><li>Ta sama mapa sensorowa nie wskazuje jednoznacznie jednego generatora.</li></ul></div></div><div><div class="panel source-forward-panel"><h2><span class="dot"></span>2. Forward model — co zobaczą elektrody?</h2><div class="source-metrics source-metrics-top"><div class="metric"><div class="k">MAX ELEKTRODA</div><div class="v" id="srcMax">—</div></div><div class="metric"><div class="k">MAX |µV|</div><div class="v" id="srcAmp">—</div></div><div class="metric"><div class="k">ZASIĘG PRZESTRZENNY</div><div class="v" id="srcSpread">—</div></div></div><canvas id="srcHead" width="650" height="520"></canvas><div class="source-interaction-legend"><span><b>LPM + przeciąganie</b> — przesuń źródło</span><span><b>Kółko myszy</b> — zmień średnicę</span></div></div></div></div><div class="panel" style="margin-top:14px"><h2><span class="dot"></span>3. Inverse problem — dlaczego wynik nie jest jednoznaczny?</h2><p class="readout">Poniżej są trzy różne hipotetyczne rozwiązania, które mogą stosunkowo dobrze wyjaśniać podobny wzorzec na skalpie. Algorytm lokalizacji musi użyć dodatkowych założeń: geometrii głowy, orientacji dipoli, regularizacji, ograniczeń anatomicznych albo priors.</p><div class="inverse-cards"><article><b>Rozwiązanie A · pojedynczy dipol</b><p>Jedno zwarte źródło pod maksimum mapy. Proste i interpretowalne, ale może być zbyt uproszczone.</p><div class="invscore" id="invA"></div></article><article><b>Rozwiązanie B · dwa źródła</b><p>Dwa słabsze źródła mogą razem wytworzyć podobny rozkład potencjału.</p><div class="invscore" id="invB"></div></article><article><b>Rozwiązanie C · źródło rozległe</b><p>Rozległy obszar kory o mniejszej amplitudzie również może pasować do danych sensorowych.</p><div class="invscore" id="invC"></div></article></div><div class="callout" style="margin-top:12px"><b>Wniosek:</b> topografia EEG mówi, gdzie na skalpie potencjał jest największy. Lokalizacja źródła pyta, jakie generatory wewnątrz głowy mogły tę topografię wytworzyć. To nie jest to samo.</div></div>`;
 $('#main').appendChild(m);
 const nav=$('[data-go="m7"]');if(nav)nav.textContent='Analiza źródłowa';
 ['srcDepth','srcX','srcY','srcSize'].forEach(id=>$('#'+id,m).addEventListener('input',()=>{if(id==='srcSize')state.radius=+$('#srcSize',m).value/200;draw(m)}));
 bindCanvasInteraction(m);
 draw(m);
}

function bindCanvasInteraction(m){
 const cv=$('#srcHead',m);
 const updatePos=e=>{
  const r=cv.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*cv.width,py=(e.clientY-r.top)/r.height*cv.height,cx=cv.width/2,cy=cv.height/2,R=205;
  const sx=clamp((px-cx)/(R*.78),-.7,.7),sy=clamp((py-cy)/(R*.78),-.65,.65);
  $('#srcX',m).value=Math.round(sx*100);$('#srcY',m).value=Math.round(sy*100);draw(m);
 };
 cv.addEventListener('pointerdown',e=>{if(e.button!==0)return;state.dragging=true;cv.setPointerCapture?.(e.pointerId);cv.classList.add('dragging-source');updatePos(e)});
 cv.addEventListener('pointermove',e=>{if(state.dragging)updatePos(e)});
 const stop=e=>{state.dragging=false;cv.classList.remove('dragging-source');try{cv.releasePointerCapture?.(e.pointerId)}catch{}};
 cv.addEventListener('pointerup',stop);cv.addEventListener('pointercancel',stop);
 cv.addEventListener('wheel',e=>{e.preventDefault();state.radius=clamp(state.radius+(e.deltaY<0?.025:-.025),.04,.35);$('#srcSize',m).value=Math.round(state.radius*200);draw(m)},{passive:false});
}

function draw(m){
 const depth=+$('#srcDepth',m).value/100,sx=+$('#srcX',m).value/100,sy=+$('#srcY',m).value/100;
 state.radius=clamp(+$('#srcSize',m).value/200,.04,.35);
 $('#srcDepthOut',m).textContent=Math.round(depth*100)+'%';$('#srcXOut',m).textContent=(sx>=0?'+':'')+Math.round(sx*100);$('#srcYOut',m).textContent=(sy>=0?'+':'')+Math.round(sy*100);$('#srcSizeOut',m).textContent=Math.round(state.radius*200)+'%';
 const sigma=.09+.28*depth+state.radius*.55,amp=42*(1-depth*.72)*(1-.22*state.radius/.35),vals={};
 for(const e of pts){const d2=(e.x-sx)**2+(e.y-sy)**2;vals[e.id]=amp*Math.exp(-d2/(2*sigma*sigma))*(1-.12*Math.abs(e.x-sx))}
 const maxEntry=Object.entries(vals).sort((a,b)=>b[1]-a[1])[0],above=Object.values(vals).filter(v=>v>maxEntry[1]*.5).length;
 $('#srcMax',m).textContent=maxEntry[0];$('#srcAmp',m).textContent=maxEntry[1].toFixed(1);$('#srcSpread',m).textContent=above+' el.';
 $('#srcExplain',m).innerHTML=depth<.3?'<b>Płytkie źródło:</b> silniejszy, bardziej skupiony wzorzec.':depth>.7?'<b>Głębokie źródło:</b> słabszy wzorzec o większym zasięgu przestrzennym.':'<b>Pośrednia głębokość:</b> kompromis między amplitudą a zasięgiem przestrzennym.';
 drawHead($('#srcHead',m),sx,sy,depth,state.radius,vals);
 const ambiguity=Math.round(35+depth*45+state.radius*25);$('#invA',m).textContent=`dopasowanie przykładowe: ${92-Math.round(depth*8)}%`;$('#invB',m).textContent=`dopasowanie przykładowe: ${88+Math.round(depth*4)}%`;$('#invC',m).textContent=`dopasowanie przykładowe: ${82+Math.round(depth*10)}% · niejednoznaczność ${Math.min(99,ambiguity)}%`;
}

function drawHead(cv,sx,sy,depth,radius,vals){
 const ctx=cv.getContext('2d'),c=C(),W=cv.width,H=cv.height,cx=W/2,cy=H/2,R=205;ctx.clearRect(0,0,W,H);ctx.fillStyle=c.well;ctx.fillRect(0,0,W,H);ctx.strokeStyle=c.line;ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(cx-25,cy-R+5);ctx.lineTo(cx,cy-R-25);ctx.lineTo(cx+25,cy-R+5);ctx.stroke();
 const sourceX=cx+sx*R*.78,sourceY=cy+sy*R*.78,areaR=18+radius*150;
 ctx.fillStyle=c.danger;ctx.globalAlpha=.16;ctx.beginPath();ctx.arc(sourceX,sourceY,areaR,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle=c.danger;ctx.lineWidth=2;ctx.beginPath();ctx.arc(sourceX,sourceY,areaR,0,Math.PI*2);ctx.stroke();ctx.fillStyle=c.danger;ctx.beginPath();ctx.arc(sourceX,sourceY,10,0,Math.PI*2);ctx.fill();ctx.font='700 12px IBM Plex Mono';ctx.textAlign='center';ctx.fillText('ŹRÓDŁO',sourceX,Math.max(20,sourceY-areaR-8));
 const max=Math.max(...Object.values(vals),1);for(const e of pts){const x=cx+e.x*R,y=cy+e.y*R,q=clamp(vals[e.id]/max,0,1),rr=Math.round(245-(190*q)),gg=Math.round(248-(150*q)),bb=Math.round(248-(120*q));ctx.fillStyle=`rgb(${rr},${gg},${bb})`;ctx.strokeStyle='#40555d';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,13,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=q>.55?'#fff':'#22343a';ctx.font='700 10px IBM Plex Mono';ctx.fillText(e.id,x,y+3)}
 ctx.fillStyle=c.muted;ctx.font='11px IBM Plex Mono';ctx.textAlign='left';ctx.fillText('Obszar = hipotetyczny generator · kolor elektrod = amplituda forward model',18,H-18);
}
window.addEventListener('load',()=>setTimeout(build,220),{once:true});
