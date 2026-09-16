const $=(s,r=document)=>r.querySelector(s);

function updateRecordingInfo(m){
  const fs=+($('#xfs',m)?.value||250);
  const seconds=4;
  const samples=fs*seconds;
  const dt=1000/fs;
  const nyquist=fs/2;
  const line=+($('#xline',m)?.value||0);
  const eyes=$('#xeyes',m)?.textContent.includes('zamknięte')?'zamknięte':'otwarte';
  const out=$('#xrecinfo',m);
  if(out)out.innerHTML=`<b>${fs} Hz</b> = ${samples} próbek/kanał w oknie ${seconds} s · Δt = <b>${dt.toFixed(dt<2?2:1)} ms</b> · Nyquist = <b>${nyquist.toFixed(1)} Hz</b> · oczy: <b>${eyes}</b> · zakłócenie 50 Hz: <b>${line} µV</b>.`;
}

function enhance(){
  const m=$('#m1x');
  if(!m||m.dataset.recordingEnhanced)return;
  m.dataset.recordingEnhanced='1';

  const grid=m.querySelector('.grid.g2');
  const condition=[...m.querySelectorAll('.panel')].find(p=>p.querySelector('h2')?.textContent.trim()==='Warunki rejestracji');
  if(condition&&grid){
    condition.classList.add('recording-panel');
    grid.before(condition);
    const h=condition.querySelector('h2');
    if(h)h.innerHTML='<span class="dot"></span>Warunki rejestracji';
    const fsLabel=$('#xfs',condition)?.closest('label');
    if(fsLabel){
      fsLabel.childNodes[0].textContent='Częstotliwość próbkowania (fs) ';
      fsLabel.title='Liczba próbek rejestrowanych w ciągu jednej sekundy. Wyższe fs zwiększa rozdzielczość czasową i częstotliwość Nyquista.';
    }
    if(!$('#xrecinfo',condition)){
      const info=document.createElement('div');
      info.id='xrecinfo';info.className='readout recording-readout';
      condition.appendChild(info);
    }
  }

  const eeg=$('#xeeg',m),psd=$('#xpsd',m);
  if(eeg)eeg.height=450;
  if(psd)psd.height=230;

  ['xfs','xline','xscale'].forEach(id=>$('#'+id,m)?.addEventListener('input',()=>updateRecordingInfo(m)));
  $('#xfs',m)?.addEventListener('change',()=>updateRecordingInfo(m));
  $('#xeyes',m)?.addEventListener('click',()=>setTimeout(()=>updateRecordingInfo(m),0));
  window.addEventListener('eeg:signal-settings',()=>updateRecordingInfo(m));
  updateRecordingInfo(m);
}

window.addEventListener('load',()=>setTimeout(enhance,120),{once:true});
