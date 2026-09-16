const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const C=()=>({accent:css('--accent')||'#087f70',muted:css('--muted')||'#66777d',line:css('--line')||'#d9e0e2',well:css('--well')||'#fff'});
const rnd=(a,b)=>a+Math.random()*(b-a);
const HELP=[
 ['Ocena kanałów','Najpierw identyfikuje się kanały o niewystarczającej jakości. Wadliwy kanał może zaburzyć referencję, ICA i dalszą analizę.'],
 ['Filtr zaporowy 50 Hz','Tłumi wąskopasmowe zakłócenie sieciowe 50 Hz. Powinien być stosowany tylko wtedy, gdy zakłócenie rzeczywiście występuje.'],
 ['Filtr górnoprzepustowy 0,5 Hz','Ogranicza bardzo wolny dryf. Zbyt wysoka częstotliwość graniczna może deformować wolne składowe ERP.'],
 ['Filtr dolnoprzepustowy 40 Hz','Ogranicza szybkie zakłócenia. Zbyt niska częstotliwość graniczna może usuwać również użyteczną informację.'],
 ['Zmiana referencji','Zmiana elektrody lub zestawu elektrod odniesienia zmienia wartości wszystkich kanałów i obserwowaną topografię.'],
 ['Segmentacja na epoki','Dzieli zapis ciągły na odcinki związane ze zdarzeniami, np. od −200 do 800 ms względem bodźca.'],
 ['Odrzucanie epok','Usuwa epoki niespełniające ustalonego kryterium jakości. Kryteria powinny być określone przed analizą wyniku.'],
 ['ICA','Rozkłada mieszaninę kanałów na komponenty, co ułatwia identyfikację artefaktów EOG lub EMG.'],
 ['Korekcja linii podstawowej','Odejmuje średnią z wybranego okresu odniesienia, zwykle poprzedzającego bodziec.']
];
function background(ctx,w,h){const c=C();ctx.clearRect(0,0,w,h);ctx.fillStyle=c.well;ctx.fillRect(0,0,w,h);ctx.strokeStyle=c.line;for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(44,i*h/4);ctx.lineTo(w-8,i*h/4);ctx.stroke()}}
function draw(){const m=$('#m5'),cv=$('#preproc',m);if(!cv)return;const ctx=cv.getContext('2d'),c=C(),W=cv.width,n=900;background(ctx,W,cv.height);const trace=(mid,color,clean)=>{ctx.strokeStyle=color;ctx.lineWidth=1.4;ctx.beginPath();for(let i=0;i<n;i++){const t=i/150,v=18*Math.sin(2*Math.PI*10*t)+6*Math.sin(2*Math.PI*.18*t)+(clean?0:6*Math.sin(2*Math.PI*50*t))+(i>300&&i<365?(clean?18:70)*Math.exp(-((i-335)**2)/350):0)+rnd(-4,4),x=44+i/(n-1)*(W-58),y=mid-v/95*58;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()};ctx.fillStyle=c.muted;ctx.font='10px IBM Plex Mono';ctx.fillText('SUROWY',6,82);ctx.fillText('PO PRZETWARZANIU',6,235);trace(82,c.muted,false);trace(235,c.accent,true)}
function enhance(){const m=$('#m5');if(!m||m.dataset.teachingContent)return;m.dataset.teachingContent='1';const head=$('.head',m),intro=document.createElement('div');intro.className='panel teaching-intro';intro.innerHTML='<h2><span class="dot"></span>Co masz zrobić?</h2><p><b>Cel:</b> przygotować surowy zapis EEG do analizy, ograniczając artefakty bez usuwania użytecznej aktywności. Przechodź kolejno przez ocenę kanałów, filtrację, referencję, segmentację, ICA i korekcję linii podstawowej.</p>';head?.after(intro);$$('[data-step]',m).forEach((b,i)=>{const x=HELP[i];if(!x)return;b.title=x[1];b.setAttribute('aria-label',`${x[0]}: ${x[1]}`)});draw()}
window.addEventListener('load',()=>setTimeout(enhance,250),{once:true});
window.addEventListener('eeg:module',e=>{if(e.detail==='m5')setTimeout(()=>{enhance();draw()},0)});
