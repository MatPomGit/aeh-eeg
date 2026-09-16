const $=(s,r=document)=>r.querySelector(s);

function fixSourceLabel(){
 const b=$('#nav [data-go="m7"]');
 if(b&&b.textContent!=='Analiza źródłowa')b.textContent='Analiza źródłowa';
}
function redrawSource(){
 const input=$('#m7 #srcDepth');
 if(input)input.dispatchEvent(new Event('input',{bubbles:true}));
}
function parseColor(value){
 const s=(value||'').trim();
 if(/^#[0-9a-f]{6}$/i.test(s))return[parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)];
 const m=s.match(/rgba?\((\d+)\D+(\d+)\D+(\d+)/i);return m?[+m[1],+m[2],+m[3]]:null;
}
function recolorIdleSimLive(){
 const cv=$('#msimlive2 #simeeg');if(!cv)return;
 const ctx=cv.getContext('2d',{willReadFrequently:true});
 try{
  const sample=ctx.getImageData(0,0,1,1).data,old=[sample[0],sample[1],sample[2]],next=parseColor(getComputedStyle(document.documentElement).getPropertyValue('--well'));if(!next)return;
  if(Math.hypot(old[0]-next[0],old[1]-next[1],old[2]-next[2])<5)return;
  const img=ctx.getImageData(0,0,cv.width,cv.height),d=img.data;
  for(let i=0;i<d.length;i+=4){if(d[i+3]===0)continue;const dist=Math.hypot(d[i]-old[0],d[i+1]-old[1],d[i+2]-old[2]);if(dist<10){d[i]=next[0];d[i+1]=next[1];d[i+2]=next[2]}}
  ctx.putImageData(img,0,0);
 }catch{}
}
function init(){
 fixSourceLabel();
 const nav=$('#nav');
 if(nav)new MutationObserver(fixSourceLabel).observe(nav,{childList:true,subtree:true,characterData:true});
 setTimeout(fixSourceLabel,1200);
}
window.addEventListener('load',init,{once:true});
window.addEventListener('eeg:theme',()=>requestAnimationFrame(()=>{redrawSource();recolorIdleSimLive()}));
window.addEventListener('eeg:module',e=>{if(e.detail==='m7'){fixSourceLabel();requestAnimationFrame(redrawSource)}});
