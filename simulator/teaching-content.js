const $=(s,r=document)=>r.querySelector(s);

function removeLegacyIntro(){
 const intro=$('#m5 .teaching-intro');
 if(intro)intro.remove();
}

window.addEventListener('load',()=>{
 setTimeout(removeLegacyIntro,250);
 setTimeout(removeLegacyIntro,850);
},{once:true});
window.addEventListener('eeg:module',e=>{if(e.detail==='m5')requestAnimationFrame(removeLegacyIntro)});
