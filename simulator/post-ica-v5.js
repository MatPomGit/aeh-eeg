const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const C=()=>({accent:css('--accent')||'#087f70',violet:css('--violet')||'#6954b8',muted:css('--muted')||'#5a7077',line:css('--line')||'#d5e0e3',well:css('--well')||'#f0f4f5',text:css('--text')||'#182529'});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function compactICA(){
 const m=$('#mica');if(!m||m.dataset.v5ica)return;m.dataset.v5ica='1';
 const intro=$('.teaching-intro',m);intro?.remove();
 const p=$('.head p',m);if(p)p.textContent='ICA rozkłada wielokanałowy EEG na możliwie niezależne komponenty, aby rozpoznać m.in. EOG i EMG. Oceń komponenty, usuń tylko dobrze uzasadnione artefakty i sprawdź rekonstrukcję sygnału.';
 const pipe=$('.pipeline',m);pipe?.closest('.panel')?.classList.add('ica-pipeline-compact');
}

function deterministicNoise(i){
 return .48*Math.sin(i*1.731)+.31*Math.sin(i*.437+1.2)+.21*Math.cos(i*2.117+.4);
}
function prep(ctx,w,h){
 const c=C();ctx.clearRect(0,0,w,h);ctx.fillStyle=c.well;ctx.fillRect(0,0,w,h);ctx.strokeStyle=c.line;ctx.lineWidth=1;
}
function axisX(ctx,w,h,min,max,ticks,unit){
 const c=C(),left=52,right=w-18,bottom=h-34,top=18;ctx.strokeStyle=c.line;ctx.fillStyle=c.muted;ctx.font='11px IBM Plex Mono';ctx.textAlign='center';
 ticks.forEach(v=>{const x=left+(v-min)/(max-min)*(right-left);ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();ctx.fillText(String(v),x,h-15)});
 ctx.textAlign='right';ctx.fillText(unit,right,h-3);ctx.textAlign='left';return{left,right,top,bottom};
}
function drawERP(ctx,w,h,n){
 prep(ctx,w,h);const c=C(),a=axisX(ctx,w,h,-200,800,[-200,0,200,400,600,800],'ms'),mid=(a.top+a.bottom)/2;
 ctx.strokeStyle=c.line;ctx.beginPath();ctx.moveTo(a.left,mid);ctx.lineTo(a.right,mid);ctx.stroke();
 const noiseAmp=34/Math.sqrt(Math.max(n,1));ctx.strokeStyle=c.accent;ctx.lineWidth=2;ctx.beginPath();
 for(let i=0;i<600;i++){const ms=-200+i/599*1000;const p300=12*Math.exp(-((ms-340)**2)/(2*52**2));const n100=-3.6*Math.exp(-((ms-105)**2)/(2*25**2));const p200=4*Math.exp(-((ms-205)**2)/(2*35**2));const noise=noiseAmp*deterministicNoise(i);const v=n100+p200+p300+noise;const x=a.left+i/599*(a.right-a.left),y=mid-v/22*(a.bottom-a.top)/2;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();
 return noiseAmp;
}
function drawPSD(ctx,w,h,n){
 prep(ctx,w,h);const c=C(),a=axisX(ctx,w,h,0,60,[0,10,20,30,40,50,60],'Hz'),noiseAmp=26/Math.sqrt(Math.max(n,1));ctx.strokeStyle=c.violet;ctx.lineWidth=2;ctx.beginPath();
 for(let i=0;i<=240;i++){const f=i/4;const base=4+43*Math.exp(-((f-10)**2)/5.5)+12*Math.exp(-((f-20)**2)/20)+5*Math.exp(-((f-4.5)**2)/7);const p=clamp(base+noiseAmp*(.8*deterministicNoise(i)+.2*Math.sin(i*.19)),0,65);const x=a.left+f/60*(a.right-a.left),y=a.bottom-p/65*(a.bottom-a.top);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();
 return noiseAmp;
}
function drawFeatures(ctx,w,h,n){
 prep(ctx,w,h);const c=C(),bands=[['δ',18],['θ',25],['α',48],['β',31],['γ',12]],dev=28/Math.sqrt(Math.max(n,1)),left=58,right=w-24,top=24,bottom=h-48,bw=(right-left)/bands.length;
 ctx.strokeStyle=c.line;for(let j=0;j<=4;j++){const y=top+j/4*(bottom-top);ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke()}
 bands.forEach(([lab,base],i)=>{const v=clamp(base+dev*deterministicNoise(i*37+5),2,70),x=left+i*bw+bw*.18,height=v/70*(bottom-top);ctx.fillStyle=i===2?c.accent:c.violet;ctx.fillRect(x,bottom-height,bw*.62,height);ctx.fillStyle=c.text;ctx.font='700 18px IBM Plex Mono';ctx.textAlign='center';ctx.fillText(lab,x+bw*.31,h-17)});ctx.textAlign='left';return dev;
}
function renderPost(){
 const m=$('#mpostx');if(!m)return;const cv=$('#postcanvas',m),nEl=$('#postnr',m);if(!cv||!nEl)return;const n=+nEl.value||30,mode=m.dataset.post||'erp',ctx=cv.getContext('2d'),read=$('#postread',m),desc=$('#postdesc',m);$('#postn',m).textContent=n;
 if(mode==='erp'){const noise=drawERP(ctx,cv.width,cv.height,n);if(desc)desc.textContent='ERP: średnia epok od −200 do 800 ms względem triggera. Wzrost N redukuje nieskorelowaną aktywność i uwidacznia składowe związane ze zdarzeniem.';if(read)read.innerHTML=`Uśredniono <b>${n}</b> prób. Modelowy poziom szumu średniej: <b>${noise.toFixed(1)} a.u.</b> — maleje wyraźnie wraz z N.`}
 else if(mode==='psd'){const noise=drawPSD(ctx,cv.width,cv.height,n);if(desc)desc.textContent='PSD: moc w funkcji częstotliwości, tutaj w zakresie 0–60 Hz. Większa liczba segmentów zmniejsza wariancję estymacji.';if(read)read.innerHTML=`Uśredniono <b>${n}</b> segmentów. Zakres: <b>0–60 Hz</b>. Modelowa niestabilność PSD: <b>${noise.toFixed(1)}</b>.`}
 else{const dev=drawFeatures(ctx,cv.width,cv.height,n);if(desc)desc.textContent='Cechy pasmowe: moc zagregowana w pasmach δ, θ, α, β i γ. Więcej segmentów daje stabilniejsze wartości cech.';if(read)read.innerHTML=`N=<b>${n}</b> segmentów. Modelowa zmienność cech: <b>${dev.toFixed(1)}</b>; przy większym N słupki stabilizują się wokół wartości bazowych.`}
}
function improvePost(){
 const m=$('#mpostx');if(!m||m.dataset.v5post)return;m.dataset.v5post='1';const range=$('#postnr',m);if(!range)return;range.max='120';range.min='1';range.step='1';if(+range.value>120)range.value='120';
 range.oninput=()=>renderPost();$$('[data-post]',m).forEach(b=>{b.onclick=()=>{$$('[data-post]',m).forEach(x=>x.classList.toggle('on',x===b));m.dataset.post=b.dataset.post;renderPost()}});renderPost();
}
function init(){setTimeout(()=>{compactICA();improvePost()},420)}
window.addEventListener('load',init,{once:true});
window.addEventListener('eeg:module',e=>{if(e.detail==='mica')setTimeout(compactICA,0);if(e.detail==='mpostx')setTimeout(()=>{improvePost();renderPost()},0)});
