const LEGACY_MODULES=['m1','m2','m4','m6','mfiles','msimlive','mphys','meye'];

function removeLegacyModules(){
  for(const id of LEGACY_MODULES) document.getElementById(id)?.remove();
}

// Earlier modules register their load handlers before this file is evaluated,
// so the superseded views exist by the time this handler runs. The final
// controller initializes later and builds the replacement modules afterwards.
window.addEventListener('load',removeLegacyModules,{once:true});
