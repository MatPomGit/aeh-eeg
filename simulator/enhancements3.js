import'./physiology-eye.js';
import'./clinical-learning.js';
import'./qeeg-workflow.js';
import'./qeeg-heatmap-v2.js';
import'./flashcards.js';

const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const NAV=[
 ['m0','Start','workflow i zasady'],
 ['m1x','Sygnał i pasma','rytmy, artefakty, próbkowanie'],
 ['mfft','FFT','czas → częstotliwość'],
 ['m2x','Montaż','10–20, 10–10, 10–5'],
 ['m3','Eksperyment oddball','bodźce, triggery, reakcje'],
 ['m5','PreProcessing','kontrola i czyszczenie'],
 ['mpostx','PostProcessing','ERP, PSD, cechy'],
 ['mfiles','Zapis danych EEG','EDF, BDF, EEG, BIDS'],
 ['msimlive','SimLive','oczy + mięśnie → EEG'],
 ['mphys','EMG · EKG · GSR','fizjologia obwodowa'],
 ['meye','Eye-Tracking','ręcznie + MediaPipe Live'],
 ['mlobes','Płat–funkcja–pasmo','anatomia i rytmy'],
 ['mqeeg','qEEG','kolejne kroki analizy'],
 ['mheat','qEEG HeatMap','topografia cech'],
 ['mclinical','EEG klinicznie','wzorce i ograniczenia'],
 ['mquiz','Sprawdź się','flash cards'],
 ['m7','Źródła','forward/inverse problem']
];
function activate(id){$$('.module').forEach(m=>m.classList.toggle('active',m.id===id));$$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.go===id));window.dispatchEvent(new CustomEvent('eeg:module',{detail:id}));window.scrollTo({top:0,behavior:'smooth'})}
function rebuild(){const old=$('#m6');if(old){old.classList.remove('active');old.classList.add('hidden')}const nav=$('#nav');if(!nav)return;nav.innerHTML='<h4>Wirtualne laboratorium</h4>';NAV.forEach((x,i)=>{const b=document.createElement('button');b.dataset.go=x[0];b.innerHTML=`<span class="n">${i}</span><span><div class="t">${x[1]}</div><div class="d">${x[2]}</div></span>`;b.onclick=()=>activate(x[0]);nav.appendChild(b)});activate('m0')}
window.addEventListener('load',rebuild,{once:true});
