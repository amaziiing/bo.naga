(function(){
  'use strict';

  const STORAGE_KEY='bo_main_report_currency';
  const initialStored=(sessionStorage.getItem(STORAGE_KEY)||'').toUpperCase();
  const state={baseCurrency:'MYR',currency:initialStored,rates:[],ready:false};
  const nativeFetch=window.fetch.bind(window);
  let configPromise=null;

  function token(){return localStorage.getItem('bo_admin_token')||localStorage.getItem('admin_token')||'';}
  function pageIsMain(){
    const file=(location.pathname.split('/').pop()||'').toLowerCase();
    if(file.startsWith('main-')||file.startsWith('main_'))return true;
    try{
      const u=window.BO_AUTH&&typeof BO_AUTH.user==='function'?BO_AUTH.user():JSON.parse(localStorage.getItem('bo_admin_user')||'{}');
      const t=String((u&&u.roleType)||'').toUpperCase();
      return !!(u&&(u.rootAdmin===true||Number(u.rootAdmin)===1||t==='ROOT'||t==='MAIN'));
    }catch(e){return false;}
  }
  function active(){return String(state.currency||state.baseCurrency||'MYR').toUpperCase();}
  function activeRates(){
    return state.rates.filter(x=>Number(x.status??1)===1 && String(x.currencyCode||'').trim());
  }
  function activeCodes(){return activeRates().map(x=>String(x.currencyCode||'').toUpperCase());}
  function chooseCurrency(requested){
    const codes=activeCodes();
    const req=String(requested||'').toUpperCase();
    if(req&&codes.includes(req))return req;
    const base=String(state.baseCurrency||'MYR').toUpperCase();
    if(codes.includes(base))return base;
    return codes[0]||base||'MYR';
  }
  function updateLabels(){
    document.querySelectorAll('.mre-cur-label,.currency-unit').forEach(el=>{
      if(el.classList.contains('mre-cur-label'))el.textContent='('+active()+')';
      else el.textContent=active();
    });
  }
  function renderCurrencySelects(){
    const codes=activeCodes();
    const keep=active();
    document.querySelectorAll('select.mre-currency-select').forEach(sel=>{
      const wrap=sel.closest('.mpr-currency-filter,.mre-currency-filter,.mad-filter-field');
      if(wrap){
        wrap.hidden=codes.length<=1;
        wrap.style.display=codes.length<=1?'none':'';
      }
      sel.innerHTML=codes.map(code=>'<option value="'+code+'"'+(code===keep?' selected':'')+'>'+code+'</option>').join('');
      if(codes.includes(keep)) sel.value=keep;
      else if(codes[0]) sel.value=codes[0];
      if(window.BOSelectSync && typeof BOSelectSync.one==='function') BOSelectSync.one(sel);
      else sel.dispatchEvent(new Event('bo:select-sync',{bubbles:true}));
    });
  }
  function renderCurrencyGroups(){
    const codes=activeCodes();
    document.querySelectorAll('.mre-currency-seg,.np-currency-seg').forEach(group=>{
      const wrapper=group.closest('.mre-currency-group,.np-currency-group');
      if(wrapper){
        wrapper.hidden=codes.length<=1;
        wrapper.style.display=codes.length<=1?'none':'';
      }
      group.innerHTML='';
      codes.forEach(code=>{
        const b=document.createElement('button');
        b.type='button';
        b.className='mre-cur-btn'+(group.classList.contains('np-currency-seg')?' np-cur-btn':'');
        b.dataset.currency=code;
        b.textContent=code;
        const on=code===active();
        b.classList.toggle('is-active',on);
        b.setAttribute('aria-pressed',on?'true':'false');
        group.appendChild(b);
      });
    });
    renderCurrencySelects();
  }
  /** Toggle active state only — do not wipe buttons (preserves listeners, avoids chrome flash). */
  function syncCurrencyButtons(){
    const cur=active();
    document.querySelectorAll('.mre-currency-seg [data-currency],.np-currency-seg [data-currency]').forEach(b=>{
      const on=String(b.dataset.currency||'').toUpperCase()===cur;
      b.classList.toggle('is-active',on);
      b.setAttribute('aria-pressed',on?'true':'false');
    });
    renderCurrencySelects();
  }
  function softCurrencyPage(){
    return !!(document.body&&document.body.classList.contains('main-dashboard-page'));
  }
  function applyConfig(data){
    state.baseCurrency=String((data&&data.baseCurrency)||'MYR').toUpperCase();
    state.rates=Array.isArray(data&&data.rates)?data.rates:[];
    const next=chooseCurrency(state.currency||initialStored);
    const changed=next!==String(state.currency||'').toUpperCase();
    state.currency=next;
    state.ready=true;
    sessionStorage.setItem(STORAGE_KEY,next);
    renderCurrencyGroups();
    updateLabels();
    window.dispatchEvent(new CustomEvent('bo:main-currency-ready',{detail:{...state,currency:next,corrected:changed}}));
    return state;
  }
  function ensureConfig(){
    if(state.ready)return Promise.resolve(state);
    if(configPromise)return configPromise;
    configPromise=(async()=>{
      try{
        if(!window.API_CONFIG)return applyConfig({baseCurrency:'MYR',rates:[{currencyCode:'MYR',status:1}]});
        const h={};const t=token();if(t)h.Authorization='Bearer '+t;
        const r=await nativeFetch(API_CONFIG.BASE_URL+'/admin/currency/public-options',{headers:h,cache:'no-store'});
        const j=await r.json().catch(()=>({}));
        const d=j&&j.data;
        if(!r.ok||!d)throw new Error((j&&j.message)||'Unable to load currency settings');
        return applyConfig(d);
      }catch(e){
        console.error('Currency settings load failed:',e);
        return applyConfig({baseCurrency:'MYR',rates:[{currencyCode:'MYR',status:1}]});
      }
    })();
    return configPromise;
  }
  function setCurrency(code,reload){
    const next=chooseCurrency(code);
    if(!next)return;
    const changed=next!==active();
    state.currency=next;
    sessionStorage.setItem(STORAGE_KEY,next);
    const hasBtns=!!document.querySelector('.mre-currency-seg [data-currency],.np-currency-seg [data-currency]');
    if(hasBtns)syncCurrencyButtons();
    else renderCurrencyGroups();
    updateLabels();
    window.dispatchEvent(new CustomEvent('bo:main-currency-change',{detail:{...state,currency:next}}));
    // Dashboard soft-updates chart data only — never full reload (sidebar/chrome stay put).
    if(reload&&changed&&!softCurrencyPage())location.reload();
  }

  window.fetch=function(input,init){
    let url='';
    try{url=typeof input==='string'?input:(input&&input.url)||'';}catch(e){}
    let u;
    try{u=new URL(url,location.href);}catch(e){return nativeFetch(input,init);}
    if(!u.pathname.startsWith('/api/admin/main/'))return nativeFetch(input,init);

    // MAIN financial requests must wait for the current enabled-currency configuration.
    // Always overwrite stale/hardcoded currency query parameters with the validated active currency.
    return ensureConfig().then(()=>{
      u.searchParams.set('currency',active());
      let out;
      if(typeof input==='string')out=u.toString();
      else out=new Request(u.toString(),input);
      const nextInit=init?Object.assign({},init):{};
      const method=String(nextInit.method||(input&&input.method)||'GET').toUpperCase();
      if(method!=='GET'&&method!=='HEAD'&&nextInit.body&&typeof nextInit.body==='string'){
        const headers=new Headers(nextInit.headers||(input&&input.headers)||{});
        const ct=String(headers.get('Content-Type')||'');
        if(ct.includes('application/json')||/^[\[{]/.test(nextInit.body.trim())){
          try{
            const b=JSON.parse(nextInit.body);
            if(b&&typeof b==='object'&&!Array.isArray(b)){
              // Preserve an explicitly selected native transaction currency (e.g. Merchant Profit).
              // Only inject the MAIN report currency when the request body did not define one.
              if(!b.currency)b.currency=active();
              nextInit.body=JSON.stringify(b);
            }
          }catch(e){}
        }
      }
      return nativeFetch(out,nextInit);
    });
  };

  window.BO_MAIN_CURRENCY={state,code:active,set:setCurrency,load:ensureConfig,ready:ensureConfig};

  document.addEventListener('click',e=>{
    const b=e.target.closest&&e.target.closest('.mre-currency-seg [data-currency],.np-currency-seg [data-currency]');
    if(!b)return;
    e.preventDefault();
    setCurrency(b.dataset.currency,true);
  });
  document.addEventListener('change',e=>{
    const sel=e.target.closest&&e.target.closest('select.mre-currency-select');
    if(!sel)return;
    setCurrency(sel.value,true);
  });

  /* SPA swap (bo-spa.js): ~158 pages load this file, so the router owns it as a SHARED script and
     never runs it again on a hop - it is absent from BO_SPA's __boScriptTimes for a swap and
     present for a fresh load. The target page's CURRENCY row therefore kept its
     <span class="mre-cur-loading">…</span> skeleton: measured on
     main-win-lose-report.html -> main_provider_report.html and back, 3 buttons -> 0 buttons ->
     0 buttons, `skeleton: PRESENT` both times, `navlog phase:"ok"`, 0 JS errors - "切过去 currency
     要刷新才出来".

     The document outlives a swap even though the content frame does not, so one document-level
     listener registered on the first load is enough: re-render into whatever markup the router
     has just put in the document. Re-running this file instead (data-bo-spa-rerun) would stack a
     fresh window.fetch wrapper on every hop and re-register the click/change listeners below on
     a shared runtime - the reason the router skips it in the first place. */
  if(!window.__boMainCurrencySwapHook){
    window.__boMainCurrencySwapHook=1;
    document.addEventListener('bo:spa:content',()=>{
      if(!state.ready){ensureConfig().then(()=>{renderCurrencyGroups();updateLabels();});return;}
      renderCurrencyGroups();
      updateLabels();
    });
  }

  // MAIN pages initialize immediately. Other pages initialize only for MAIN/ROOT account context.
  if(pageIsMain())ensureConfig();
  else document.addEventListener('DOMContentLoaded',()=>{if(pageIsMain())ensureConfig();});
})();
