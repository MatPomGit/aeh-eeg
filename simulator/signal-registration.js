const $=(s,r=document)=>r.querySelector(s);

function enhance(){
  const m=$('#m1x');
  if(!m||m.dataset.recordingEnhanced)return;
  m.dataset.recordingEnhanced='1';

  const grid=m.querySelector('.grid.g2');
  const left=grid?.firstElementChild;
  const condition=[...m.querySelectorAll('.panel')].find(p=>p.querySelector('h2')?.textContent.trim()==='Warunki rejestracji');
  if(condition&&left){
    condition.classList.add('recording-panel');
    left.prepend(condition);
    const h=condition.querySelector('h2');
    if(h)h.innerHTML='<span class="dot"></span>Warunki rejestracji';
    const fs=$('#xfs',condition),fsLabel=fs?.closest('label');
    if(fsLabel){
      fsLabel.childNodes[0].textContent='Częstotliwość próbkowania (fs) ';
      fsLabel.title='fs oznacza częstotliwość próbkowania: liczbę próbek EEG zapisywanych w ciągu jednej sekundy.';
    }
    $('#xrecinfo',condition)?.remove();
  }

  const eeg=$('#xeeg',m),psd=$('#xpsd',m);
  if(eeg)eeg.height=450;
  if(psd)psd.height=230;
}

window.addEventListener('load',()=>setTimeout(enhance,120),{once:true});
