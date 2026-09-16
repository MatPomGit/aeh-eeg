const $=(s,r=document)=>r.querySelector(s);
function applyTheme(theme){document.documentElement.dataset.theme=theme;localStorage.setItem('eeg-theme',theme);const b=$('#themeToggle');if(b)b.textContent=theme==='dark'?'☀ Jasny':'☾ Ciemny';window.dispatchEvent(new CustomEvent('eeg:theme',{detail:theme}))}
function init(){const bar=$('.statusbar');if(!bar||$('#themeToggle'))return;const b=document.createElement('button');b.id='themeToggle';b.className='theme-toggle';b.type='button';bar.appendChild(b);applyTheme(localStorage.getItem('eeg-theme')||'light');b.onclick=()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark')}
window.addEventListener('load',init,{once:true});
