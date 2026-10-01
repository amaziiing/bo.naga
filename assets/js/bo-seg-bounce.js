(function(global){
  'use strict';

  /* Both registries live on `window` on purpose: a new EXECUTION of this file (the router runs
     it whenever the page we come from did not load it) would otherwise create fresh, empty ones
     and lose track of the listeners the previous execution had installed on `window` itself. */
  const mounts=global.__boSegBounceMounted||(global.__boSegBounceMounted=new WeakMap());
  const live=global.__boSegBounceLive||(global.__boSegBounceLive=new Set());
  const reduce=()=>!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* One place that writes the thumb's geometry, so "where it sits" is the same statement
     wherever it is decided. */
  function place(thumb,btn){
    thumb.style.transform='';
    thumb.style.left=btn.offsetLeft+'px';
    thumb.style.width=btn.offsetWidth+'px';
    thumb.style.opacity='1';
  }

  /* Where the thumb is BORN, and whether it has anywhere to travel.

     Written before the element enters the tree, this is simply the style the thumb is born
     with, so the first frame paints it there on its own. Doing it after insertion does NOT
     work, and that is not a guess - it was measured: the inline geometry read back as
     `0px|127px` (correct) while the box itself measured `293x2`, because an inline write on a
     fresh element is a CHANGE, and the transition therefore ran from the sheet's `width:0` /
     `left:0` instead of from the seeded box. That is also what the old first frames were -
     `293x2 -> 420x24 -> 619x63 -> 823x102`, the capsule stretching out of the row's left edge -
     and the owner read exactly that: the capsule never went to the first segment, Account
     Activity.

     So: the first segment when it is not the active one (the capsule starts ON Account
     Activity and bounces over to All Logs - the travel is the existing transition, this only
     decides where it starts from), and the active segment otherwise - which also retires the
     old grow-in-from-nothing on every page whose first pill is the active one. Under reduced
     motion it is born on the active segment as well: there is no transition to travel with, so
     a seeded first segment would be one frame of the wrong segment. A group that already has a
     thumb is being re-mounted - its geometry is already where it belongs and re-animating it
     would be a lie. */
  function bornPlacement(track,buttonSelector,activeClass){
    if(track.querySelector(':scope > .bo-seg-thumb')) return null;
    const first=track.querySelector(buttonSelector);
    const active=track.querySelector(buttonSelector+'.'+activeClass)||first;
    if(!active||!active.offsetWidth) return null;
    if(reduce()||!first||first===active) return {on:active,travel:false};
    return {on:first,travel:true};
  }

  function ensureThumb(track,born){
    let thumb=track.querySelector(':scope > .bo-seg-thumb');
    if(!thumb){
      thumb=document.createElement('span');
      thumb.className='bo-seg-thumb';
      thumb.setAttribute('aria-hidden','true');
      if(born) place(thumb,born);
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
    place(thumb,active);
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
    const activeClass=opts.activeClass||'is-active';
    const born=bornPlacement(track,buttonSelector,activeClass);
    const state={
      thumb:ensureThumb(track,born&&born.on),
      track:track,
      buttonSelector:buttonSelector,
      activeClass:activeClass,
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

    /* On a seeded group the thumb is already painted where it starts, so the write that begins
       the travel is the only one this frame needs; a group born on its active segment has
       nothing to travel to and only needs to confirm the geometry. Either way the movement is
       the existing transition - nothing here animates by hand. */
    if(born&&born.travel) requestAnimationFrame(function(){sync(track);});
    else schedule(track);
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

  /* The listener is registered on BOTH paths - the 'already parsed' case only adds the
     immediate call on top. Registering it is not bookkeeping: it is the ONLY record the
     router has of this file's boot work, and that record is what re-mounts the next page's
     groups.

     bo-spa does not re-execute a file the page we are leaving also loaded, and this file is
     loaded by every page that carries a pill group. What it re-plays instead is the
     DOMContentLoaded listener the file registered in this document. An execution that lands
     in the middle of a swap (readyState is already 'complete') used to register nothing at
     all, so from that navigation on, every swap into a pill page was skipped twice over and
     its `.mad-pills` / `.mp-scope` groups were never mounted: arriving at Security & Audit by
     clicking the module tab left the category pills with no capsule - no frame on the active
     pill, and nothing moving when one was clicked - until a full reload. */
  document.addEventListener('DOMContentLoaded',autoMount);
  if(document.readyState!=='loading') autoMount();

  global.BO_SEG_BOUNCE={mount:mount,mountAll:mountAll,sync:sync,autoMount:autoMount};
})(window);
