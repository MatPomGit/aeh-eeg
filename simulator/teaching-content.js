const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const C=()=>({accent:css('--accent')||'#087f70',muted:css('--muted')||'#66777d',line:css('--line')||'#d9e0e2',well:css('--well')||'#fff'});
const rnd=(a,b)=>a+Math.random()*(b-a);

function prepCanvas(cv,label){
 const ctx=cv.getContext('2d'),c=C();ctx.clearRect(0,0,cv.width,cv.height);ctx.fillStyle=c.well;ctx.fillRect(0,0,cv.width,cv.height);ctx.strokeStyle=c.line;ctx.lineWidth=1;
 for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(46,i*cv.height/5);ctx.lineTo(cv.width-8,i*cv.height/5);ctx.stroke()}
 ctx.fillStyle=c.muted;ctx.font='10px IBM Plex Mono';ctx.fillText(label,cv.width-68,cv.height-8);
}

const PIPE_HELP=[
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

function drawPreprocessingExample(){
 const m=$('#m5'),cv=$('#preproc',m);if(!cv)return;const ctx=cv.getContext('2d'),c=C(),W=cv.width,n=900;prepCanvas(cv,'6 s');
 const draw=(mid,color,clean)=>{ctx.strokeStyle=color;ctx.lineWidth=1.4;ctx.beginPath();for(let i=0;i<n;i++){const t=i/150,v=18*Math.sin(2*Math.PI*10*t)+6*Math.sin(2*Math.PI*.18*t)+(clean?0:6*Math.sin(2*Math.PI*50*t))+(i>300&&i<365?(clean?18:70)*Math.exp(-((i-335)**2)/350):0)+rnd(-4,4),x=44+i/(n-1)*(W-58),y=mid-v/95*58;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()};
 ctx.fillStyle=c.muted;ctx.font='10px IBM Plex Mono';ctx.fillText('SUROWY',6,82);ctx.fillText('PO PRZETWARZANIU',6,235);draw(82,c.muted,false);draw(235,c.accent,true);
 const r=$('#prepread',m);if(r&&!r.textContent.trim())r.textContent='Porównuj przebieg przed i po każdym etapie. Celem jest ograniczenie artefaktów bez deformowania użytecznej aktywności EEG.';
}
function enhancePreprocessing(){
 const m=$('#m5');if(!m||m.dataset.teachingContent)return;m.dataset.teachingContent='1';
 const head=$('.head',m),intro=document.createElement('div');intro.className='panel teaching-intro';intro.innerHTML='<h2><span class="dot"></span>Co masz zrobić?</h2><p><b>Cel:</b> przygotować surowy zapis EEG do analizy, ograniczając artefakty bez usuwania użytecznej aktywności. Przechodź przez kolejne etapy od oceny jakości kanałów, przez filtrację i referencję, po segmentację, ICA i korekcję linii podstawowej.</p>';
 head?.after(intro);$$('[data-step]',m).forEach((b,i)=>{const x=PIPE_HELP[i];if(!x)return;b.title=x[1];b.setAttribute('aria-label',`${x[0]}: ${x[1]}`)});drawPreprocessingExample();
}

const ICA_STEPS=[
 ['1. Centrowanie','Od każdego kanału odejmowana jest średnia, aby dane były skupione wokół zera.'],
 ['2. Whitening','Dane są przekształcane tak, aby usunąć korelacje drugiego rzędu i ujednolicić skalę osi.'],
 ['3. W · X','Algorytm wyznacza macierz rozdzielającą W i przekształca sygnały kanałowe X w kandydatów na niezależne komponenty.'],
 ['4. Ocena IC','Komponent ocenia się na podstawie przebiegu czasowego, topografii, widma i związku z EOG/EMG.'],
 ['5. Odrzucenie artefaktów','Usuwa się wyłącznie komponenty dobrze uzasadnione jako artefaktowe.'],
 ['6. Rekonstrukcja','Pozostałe komponenty są mieszane z powrotem do przestrzeni kanałów, tworząc oczyszczony zapis.']
];
function enhanceICA(){
 const m=$('#mica');if(!m||m.dataset.teachingContent)return;m.dataset.teachingContent='1';const pipe=$('.pipeline',m);if(!pipe)return;
 if(!$('.ica-step-grid',m)){const expl=document.createElement('div');expl.className='ica-step-grid';expl.innerHTML=ICA_STEPS.map(([a,b])=>`<article><strong>${a}</strong><p>${b}</p></article>`).join('');pipe.after(expl)}
}

function formatSection(title,ext,stores,tree,example,note=''){
 return `<section class="panel format-lesson"><h2><span class="dot"></span>${title} <code>${ext}</code></h2><p>${stores}</p><h3>Struktura</h3><pre class="format-tree">${tree}</pre><h3>Praktyczny przykład</h3><pre class="format-example">${example}</pre>${note?`<div class="module-note">${note}</div>`:''}</section>`;
}
function enhanceFormats(){
 const m=$('#mformats');if(!m||m.dataset.teachingContent)return;m.dataset.teachingContent='1';
 m.innerHTML=`<div class="head"><div><div class="eyebrow">FORMATY PLIKÓW EEG</div><h1>Formaty plików EEG</h1><p>Rejestratory EEG zapisują próbki i metadane w różnych formatach. W zależności od formatu nazwy kanałów, jednostki, częstotliwość próbkowania, markery zdarzeń i dane aparatury mogą znajdować się w jednym pliku albo w kilku plikach powiązanych ze sobą.</p></div></div>
 ${formatSection('EDF / EDF+','.edf','Jeden plik może zawierać nagłówek badania, opisy kanałów i kolejne rekordy próbek. EDF+ rozszerza mechanizm adnotacji.','recording.edf\n├─ nagłówek badania\n├─ nagłówki kanałów\n└─ rekordy danych','pacjent: X Synthetic\nkanały: 19\nfs: 250 Hz\nFp1: ...')}
 ${formatSection('BDF / BDF+','.bdf','Format wywodzący się z EDF, stosowany m.in. przez BioSemi. Przechowuje próbki z większą rozdzielczością cyfrową.','recording.bdf\n├─ nagłówek\n├─ opisy kanałów\n└─ próbki 24-bit','kanał: Cz\nfs: 512 Hz\nzakres cyfrowy: 24 bit')}
 ${formatSection('BrainVision','.eeg + .vhdr + .vmrk','Dane są rozdzielone na plik binarny z próbkami, tekstowy nagłówek oraz plik markerów.','recording.eeg  → próbki\nrecording.vhdr → metadane\nrecording.vmrk → zdarzenia','[Common Infos]\nDataFile=recording.eeg\nMarkerFile=recording.vmrk\nSamplingInterval=4000')}
 ${formatSection('Formaty producentów','.eeg i inne','Rozszerzenie .eeg nie definiuje jednego uniwersalnego standardu. Znaczenie struktury zależy od producenta i towarzyszącej dokumentacji.','recording.eeg\n+ opcjonalny nagłówek\n+ opcjonalny plik zdarzeń\n+ dokumentacja producenta','00 7F 21 ...\n→ bez specyfikacji nie wiadomo, które bajty oznaczają próbki, kanały lub markery','Samo rozszerzenie pliku nie wystarcza do bezpiecznej interpretacji danych.')}
 <div class="panel history-note"><h2><span class="dot"></span>Dlaczego standaryzacja jest ważna?</h2><p>Przez lata producenci aparatury tworzyli własne formaty i konwencje. Wymiana danych między laboratoriami bywała przez to bardzo uciążliwa: trzeba było ręcznie dopasowywać nazwy kanałów, markery, jednostki, kolejność próbek i metadane albo pisać konwertery dla konkretnego systemu. Rozwój otwartych formatów, bibliotek importujących dane i standardów organizacji zbiorów, takich jak BIDS, znacząco ograniczył ten problem.</p></div>`;
}

function apply(){enhancePreprocessing();enhanceICA();enhanceFormats()}
window.addEventListener('load',()=>setTimeout(apply,300),{once:true});
window.addEventListener('eeg:module',e=>{if(e.detail==='m5')setTimeout(()=>{enhancePreprocessing();drawPreprocessingExample()},0);if(e.detail==='mica')setTimeout(enhanceICA,0);if(e.detail==='mformats')setTimeout(enhanceFormats,0)});
