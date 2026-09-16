(()=>{
  const nativeRAF=window.requestAnimationFrame.bind(window);
  const nativeCAF=window.cancelAnimationFrame.bind(window);
  const pending=new Map();
  let nextId=1;
  let suspended=document.hidden;

  function run(entry){
    if(suspended||entry.handle)return;
    entry.handle=nativeRAF(timestamp=>{
      entry.handle=0;
      if(!pending.has(entry.id))return;
      pending.delete(entry.id);
      entry.callback(timestamp);
    });
  }

  window.requestAnimationFrame=callback=>{
    const id=nextId++;
    const entry={id,callback,handle:0};
    pending.set(id,entry);
    run(entry);
    return id;
  };

  window.cancelAnimationFrame=id=>{
    const entry=pending.get(id);
    if(!entry)return;
    if(entry.handle)nativeCAF(entry.handle);
    pending.delete(id);
  };

  function suspend(){
    if(suspended)return;
    suspended=true;
    pending.forEach(entry=>{
      if(entry.handle){
        nativeCAF(entry.handle);
        entry.handle=0;
      }
    });
    window.dispatchEvent(new CustomEvent('eeg:raf-suspended'));
  }

  function resume(){
    if(!suspended||document.hidden)return;
    suspended=false;
    pending.forEach(run);
    window.dispatchEvent(new CustomEvent('eeg:raf-resumed'));
  }

  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)suspend();
    else resume();
  });
  window.addEventListener('pagehide',suspend);
  window.addEventListener('pageshow',resume);
})();
