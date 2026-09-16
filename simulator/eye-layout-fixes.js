const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
let raf=0,lastSig='';
function removeIntro(){const m=$('#meye2');if(!m)return;const p=$('.head p',m);if(p&&p.textContent.includes('Śledź fiksacje na przykładowym interfejsie'))p.remove()}
function rebuildScanpath(){const m=$('#meye2');if(!m||!m.classList.contains('active'))return;const layer=$('#eyeOverlayLayer',m);if(!layer||getComputedStyle(layer).display==='none')return;const fixes=$$('.eye-fix',layer);const sig=fixes.map(f=>`${f.style.left},${f.style.top},${f.style.width}`).join('|')+`@${layer.clientWidth}x${layer.clientHeight}`;if(sig===lastSig)return;lastSig=sig;$$('.eye-saccade',layer).forEach(x=>x.remove());const w=layer.clientWidth,h=layer.clientHeight;if(!w||!h)return;const pts=fixes.map(f=>({x:parseFloat(f.style.left)/100*w,y:parseFloat(f.style.top)/100*h}));for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],dx=b.x-a.x,dy=b.y-a.y,s=document.createElement('i');s.className='eye-saccade eye-saccade-fixed';s.style.left=a.x+'px';s.style.top=a.y+'px';s.style.width=Math.hypot(dx,dy)+'px';s.style.transform=`rotate(${Math.atan2(dy,dx)*180/Math.PI}deg)`;layer.insertBefore(s,layer.firstChild)}}
function loop(){removeIntro();rebuildScanpath();raf=requestAnimationFrame(loop)}
window.addEventListener('load',()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)},{once:true});
window.addEventListener('beforeunload',()=>cancelAnimationFrame(raf));
window.addEventListener('resize',()=>{lastSig=''});
window.addEventListener('eeg:module',e=>{if(e.detail==='meye2')lastSig=''});
