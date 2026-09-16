const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];

const LOBE_GUIDE={
 frontal:{name:'Płat czołowy',short:'Czołowy',band:'Beta',range:'13–30 Hz',fun:'Myślenie, planowanie, kontrola ruchu, koncentracja, mowa, emocje i ruchy dowolne.',state:'Stan aktywnego myślenia, skupienia uwagi i rozwiązywania zadań.',note:'W praktyce EEG okolice czołowe pokazują również aktywność w innych pasmach; wskazane pasmo jest uproszczeniem dydaktycznym zależnym od stanu i zadania.'},
 parietal:{name:'Płat ciemieniowy',short:'Ciemieniowy',band:'Alfa / Beta',range:'8–13 Hz / 13–30 Hz',fun:'Przetwarzanie czucia (dotyk, ból), orientacja przestrzenna oraz integracja sensoryczna i czuciowa.',state:'Współtworzy podstawowy rytm spoczynkowy alfa tylnych okolic głowy.',note:'Aktywność rejestrowana nad okolicą ciemieniową zależy od sieci korowych, stanu czuwania i wykonywanego zadania.'},
 temporal:{name:'Płat skroniowy',short:'Skroniowy',band:'Beta / Theta',range:'13–30 Hz / 4–7 Hz',fun:'Przetwarzanie słuchu, rozumienie mowy, pamięć związana z hipokampem oraz rozpoznawanie obiektów.',state:'U dorosłych theta występuje tu fizjologicznie głównie podczas senności lub relaksu.',note:'Sygnał ze skalpu nad okolicą skroniową jest szczególnie podatny na domieszkę aktywności mięśniowej, dlatego beta i gamma wymagają ostrożnej interpretacji.'},
 occipital:{name:'Płat potyliczny',short:'Potyliczny',band:'Alfa',range:'8–13 Hz',fun:'Przetwarzanie i analiza bodźców wzrokowych.',state:'Rytm alfa jest wyraźny w spoczynku, szczególnie przy zamkniętych oczach, i ulega osłabieniu po otwarciu oczu.',note:'Potyliczny rytm alfa jest klasycznym przykładem zależności między stanem funkcjonalnym, topografią i mocą pasma.'}
};

function renderDetail(m,key){
 const d=LOBE_GUIDE[key];
 $$('[data-lobe]',m).forEach(b=>b.classList.toggle('active',b.dataset.lobe===key));
 $$('[data-lobe-card]',m).forEach(b=>b.classList.toggle('active',b.dataset.lobeCard===key));
 const box=$('#lobe-detail',m);if(!box)return;
 box.innerHTML=`<div class="lobe-detail-head"><div><div class="eyebrow">WYBRANY OBSZAR</div><h2>${d.name}</h2></div><div class="lobe-primary-band"><span>dominujące pasmo</span><strong>${d.band}</strong><small>${d.range}</small></div></div><div class="lobe-facts"><article><span>GŁÓWNA FUNKCJA</span><p>${d.fun}</p></article><article><span>STAN / CHARAKTERYSTYKA RYTMU</span><p>${d.state}</p></article></div><div class="readout lobe-caveat"><b>Kontekst EEG:</b> ${d.note}</div>`;
}

function rebuild(){
 const m=$('#mlobes');if(!m||m.dataset.guideRebuilt)return;m.dataset.guideRebuilt='1';
 const head=m.querySelector('.head');if(head){const p=head.querySelector('p');if(p)p.textContent='Porównaj cztery główne płaty mózgu pod kątem ich funkcji oraz typowych pasm EEG obserwowanych w czuwaniu. Kliknij obszar na mapie lub kartę poniżej.';}
 m.innerHTML=`${head?.outerHTML||''}<div class="lobe-layout lobe-guide-layout"><div class="lobe-map" aria-label="Schemat płatów mózgu"><button class="lobe-shape lobe-frontal active" data-lobe="frontal">czołowy</button><button class="lobe-shape lobe-parietal" data-lobe="parietal">ciemieniowy</button><button class="lobe-shape lobe-temporal" data-lobe="temporal">skroniowy</button><button class="lobe-shape lobe-occipital" data-lobe="occipital">potyliczny</button></div><div><div class="panel lobe-detail-panel" id="lobe-detail"></div><div class="panel lobe-rule-panel"><div class="callout"><b>Ważne:</b> związek „płat – funkcja – pasmo” jest schematem dydaktycznym. EEG skalpowe rejestruje sumę aktywności wielu generatorów, dlatego pasmo nie jest przypisane wyłącznie do jednego płata.</div></div></div></div><div class="panel lobe-summary-panel"><div class="lobe-summary-head"><h2>Porównanie płatów</h2><span>funkcja · pasmo · charakterystyka</span></div><div class="lobe-summary-grid">${Object.entries(LOBE_GUIDE).map(([k,d])=>`<button class="lobe-summary-card ${k==='frontal'?'active':''}" data-lobe-card="${k}"><span>${d.short}</span><strong>${d.band}</strong><small>${d.range}</small><p>${d.fun}</p></button>`).join('')}</div></div>`;
 $$('[data-lobe]',m).forEach(b=>b.onclick=()=>renderDetail(m,b.dataset.lobe));
 $$('[data-lobe-card]',m).forEach(b=>b.onclick=()=>renderDetail(m,b.dataset.lobeCard));
 renderDetail(m,'frontal');
}

window.addEventListener('load',()=>setTimeout(rebuild,320),{once:true});
