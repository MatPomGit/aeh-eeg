const $=(s,r=document)=>r.querySelector(s);
function compactQEEG(){const m=$('#mqeeg');if(!m)return;const first=$('.grid.g2',m);if(first)first.classList.add('qeeg-compare-row')}
function compactPreprocessing(){const m=$('#m5');if(!m)return;const intro=$('.teaching-intro',m),pipe=$('#pipe',m)?.closest('.panel');if(!intro||!pipe)return;intro.innerHTML='<h2><span class="dot"></span>Co masz zrobić?</h2><p><b>Cel:</b> przygotować surowy EEG do analizy bez usuwania użytecznej aktywności. <b>Kolejność:</b> jakość kanałów → zakłócenia → filtry → referencja → epoching/rejection → ICA → baseline. Obserwuj wykres „przed / po” po każdym kroku.</p>';pipe.classList.add('pipeline-panel');if(!intro.parentElement?.classList.contains('prep-top-row')){const row=document.createElement('div');row.className='prep-top-row';intro.before(row);row.append(intro,pipe)}}
function apply(){compactQEEG();compactPreprocessing()}
window.addEventListener('load',()=>setTimeout(apply,700),{once:true});
window.addEventListener('eeg:module',()=>setTimeout(apply,0));
