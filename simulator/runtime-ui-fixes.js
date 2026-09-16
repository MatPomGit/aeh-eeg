const $=(s,r=document)=>r.querySelector(s);

function fixSourceLabel(){
 const b=$('#nav [data-go="m7"]');
 if(b&&b.textContent!=='Analiza źródłowa')b.textContent='Analiza źródłowa';
}
function redrawSource(){
 const input=$('#m7 #srcDepth');
 if(input)input.dispatchEvent(new Event('input',{bubbles:true}));
}
function init(){
 fixSourceLabel();
 const nav=$('#nav');
 if(nav)new MutationObserver(fixSourceLabel).observe(nav,{childList:true,subtree:true,characterData:true});
 setTimeout(fixSourceLabel,1200);
}
window.addEventListener('load',init,{once:true});
window.addEventListener('eeg:theme',()=>requestAnimationFrame(redrawSource));
window.addEventListener('eeg:module',e=>{if(e.detail==='m7'){fixSourceLabel();requestAnimationFrame(redrawSource)}});
