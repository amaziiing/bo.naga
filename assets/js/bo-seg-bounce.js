(function(global){
  'use strict';

  /* Both registries live on `window` on purpose: a new EXECUTION of this file (the router runs
     it whenever the page we come from did not load it) would otherwise create fresh, empty ones
     and lose track of the listeners the previous execution had installed on `window` itself. */
  const mounts=global.__boSegBounceMounted||(global.__boSegBounceMounted=new WeakMap());
  const live=global.__boSegBounceLive||(global.__boSegBounceLive=new Set());
  const reduce=()=>!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function ensureThumb(track){
    let thumb=track.querySelector(':scope > .bo-seg-thumb');
    if(!thumb){
      thumb=document.createElement('span');
      thumb.className='bo-seg-thumb';
      thumb.setAttribute('aria-hidden','true');
      track.insertBefore(thumb,track.firstChild);
    }
    return thumb;
  }

  function sync(track){
    const state=mounts.get(track);
    if(!state) return;
    const thumb=state.thumb;
    const active=track.querySelector(state.buttonSelector+'.'+state.activeClass)
      ||track.querySelector(state.buttonSelector);
    if(!active){
      thumb.style.opacity='0';
      return;
    }
    thumb.style.transform='';
    thumb.style.left=active.offsetLeft+'px';
    thumb.style.width=active.offsetWidth+'px';
    thumb.style.opacity='1';
  }

  function schedule(track){
    requestAnimationFrame(function(){sync(track);});
  }

  function mount(track,opts){
    if(!track||mounts.has(track)) {
      if(track&&mounts.has(track)) schedule(track);
      return mounts.get(track)||null;
    }
    opts=opts||{};
    track.classList.add('bo-seg');
    if(!track.getAttribute('data-bo-seg-anim')){
      track.setAttribute('data-bo-seg-anim',opts.anim||'bounce');
    }
    if(reduce()) track.setAttribute('data-bo-seg-anim','slide');

    const buttonSelector=opts.button||':scope > button, :scope > a.mad-pill, :scope > .mad-pill, :scope > .mp-scope-btn';
    const state={
      thumb:ensureThumb(track),
      track:track,
      buttonSelector:buttonSelector,
      activeClass:opts.activeClass||'is-active',
      observer:null
    };
    mounts.set(track,state);
    live.add(state);

    state.observer=new MutationObserver(function(){schedule(track);});
    state.observer.observe(track,{
      attributes:true,
      childList:true,
      subtree:true,
      characterData:true,
      attributeFilter:['class','aria-selected']
    });

    const onResize=function(){schedule(track);};
    window.addEventListener('resize',onResize);
    state.onResize=onResize;

    state.destroy=function(){
      if(state.observer) state.observer.disconnect();
      if(state.onResize) window.removeEventListener('resize',state.onResize);
      mounts.delete(track);
      live.delete(state);
    };

    schedule(track);
    setTimeout(function(){schedule(track);},50);
    setTimeout(function(){schedule(track);},300);

    return {
      sync:function(){sync(track);},
      destroy:state.destroy
    };
  }

  function mountAll(selector,opts){
    return Array.prototype.map.call(document.querySelectorAll(selector),function(el){
      return mount(el,opts);
    });
  }

  /* A swap replaces the content frame: the previous page's pill groups are DETACHED, but their
     MutationObserver and their resize listener (registered on `window`, which outlives the page)
     still hold the element alive. Nothing ever freed them, so every entry added a listener per
     group - measured on the Main provider pages: 5 resize listeners on a direct load, 11 after
     two swaps. Free the detached ones before mounting this page's; anything still in the
     document is left alone (mount() re-schedules it instead of re-binding). */
  function pruneDetached(){
    live.forEach(function(state){
      if(state.track&&state.track.isConnected) return;
      try{state.destroy();}catch(e){ live.delete(state); }
    });
  }

  function autoMount(){
    pruneDetached();
    mountAll('.mad-pills',{button:'.mad-pill',anim:'bounce'});
    mountAll('.mp-scope',{button:'.mp-scope-btn',anim:'bounce'});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',autoMount);
  }else{
    autoMount();
  }

  global.BO_SEG_BOUNCE={mount:mount,mountAll:mountAll,sync:sync,autoMount:autoMount};
})(window);
