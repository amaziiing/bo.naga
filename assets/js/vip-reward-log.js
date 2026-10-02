(function(){
 /* A swap re-runs this file against a fresh frame; the document/window bindings and the
    even-fill observer below were added again on each entry. Release the previous run's. */
 if(window.__boVipRwUnbind) window.__boVipRwUnbind();
 const unbinds=[];
 const listen=(target,type,fn,opt)=>{ target.addEventListener(type,fn,opt); unbinds.push(()=>target.removeEventListener(type,fn,opt)); };
 window.__boVipRwUnbind=()=>{ unbinds.forEach(fn=>fn()); unbinds.length=0; };
 const $=s=>document.querySelector(s), esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let page=1,totalPages=1,totalElements=0,pageSize=20,lockedAutoSize=null,autofitReloading=false,autofitSettled=false;
 const endpoint=k=>API_CONFIG.BASE_URL+API_CONFIG.ENDPOINTS[k];
 const headers=()=>Object.assign({'Content-Type':'application/json'},window.BO_AUTH?BO_AUTH.authHeader():{});
 const pad=n=>String(n).padStart(2,'0');
 const COLS=10;
 const money=v=>(window.BO_CURRENCY?.code?.()||'MYR')+' '+Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});

 /* Show N entries: - · 10 · 20 · 50 · 100 · All
    `-` = auto-fit row count, no body scroll (like VIP EXP Log).
    `All` = size 10000, body scrolls (like VIP EXP Log). */
 function tableBodyScroll(){
  return document.getElementById('rewardTableScroll')
    || document.querySelector('.vip-tx-table-body')
    || document.querySelector('.vip-admin-table-wrap');
 }
 function tableHeadScroll(){
  return document.querySelector('.vip-admin-table-wrap .vip-tx-table-head');
 }
 function naturalRowHeight(scroll){
  const sample=scroll?.querySelector('tbody tr:not(.bo-table-fill) td');
  return sample?Math.max(44,Math.round(sample.getBoundingClientRect().height)):52;
 }
 function measureAutoPageSize(){
  const scroll=tableBodyScroll();
  if(!scroll) return 12;
  const avail=Math.max(0,Math.floor(scroll.clientHeight));
  const rowH=naturalRowHeight(scroll);
  /* Floor only — never add a row that would overflow and go invisible under overflow:hidden. */
  const n=Math.floor(avail/rowH)||12;
  return Math.max(5,Math.min(200,n));
 }
 function autoFitPageSize(){
  if(lockedAutoSize!=null) return lockedAutoSize;
  lockedAutoSize=measureAutoPageSize();
  return lockedAutoSize;
 }
 function clearLockedAutoSize(){
  lockedAutoSize=null;
  autofitSettled=false;
 }
 function isAutoPageSize(raw){
  const v=String(raw??'-').trim();
  return v===''||v==='-'||/^auto$/i.test(v);
 }
 function resolvePageSize(raw){
  const v=String(raw??$('#rewardPageSize')?.value??'-').trim();
  if(isAutoPageSize(v)) return autoFitPageSize();
  if(/^all$/i.test(v)) return 10000;
  const n=Number(v);
  return Number.isFinite(n)&&n>0?n:autoFitPageSize();
 }
 function syncPageSize(){
  pageSize=resolvePageSize($('#rewardPageSize')?.value);
  syncAutofitLabel();
  return pageSize;
 }
 function syncAutofitLabel(){
  /* Keep trigger as `-` while autofit. Never paint fitted count. */
  const sel=$('#rewardPageSize');
  if(!sel||!isAutoPageSize(sel.value)) return;
  const btn=sel.closest('.rounded-select-wrap')?.querySelector('.rounded-select-btn span');
  if(btn) btn.textContent='-';
 }
 function syncAutofitMode(){
  /* Match VIP EXP Log: only `-` locks no-scroll. All / 10 / 20 / … may scroll. */
  const auto=isAutoPageSize($('#rewardPageSize')?.value);
  const card=document.querySelector('.vip-log-card');
  const wrap=document.querySelector('.vip-admin-table-wrap');
  const scroll=tableBodyScroll();
  if(card) card.toggleAttribute('data-bo-autofit', auto);
  if(wrap) wrap.toggleAttribute('data-bo-autofit', auto);
  if(scroll) scroll.toggleAttribute('data-bo-autofit', auto);
  if(!auto) resetEvenFill();
 }
 function isPlaceholderRow(tr){
  const t=(tr?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
  return !t || /loading|no vip reward|unable to load/.test(t);
 }
 function resetEvenFill(){
  const body=$('#rewardBody');
  const table=body?.closest('table');
  if(!body||!table) return;
  table.classList.remove('bo-tx-evenfill');
  table.style.height='';
  body.querySelectorAll('tr.bo-table-fill').forEach(r=>r.remove());
  [...body.querySelectorAll('tr')].forEach(tr=>{
   tr.style.height='';
   tr.querySelectorAll('td').forEach(td=>{td.style.height='';td.style.minHeight='';});
  });
 }
 /* MD Show `-`: floor(avail/rowH). Gap ≥ one row → load more. Gap < one row → stretch.
    Never keep a stale locked count from All / the previous dataset. */
 function scrollAvail(scroll){
  const wrap=scroll.closest('.vip-admin-table-wrap');
  const head=wrap?.querySelector('.vip-tx-table-head');
  const wrapRoom=wrap?Math.max(0,Math.floor(wrap.clientHeight-(head?.offsetHeight||0))):0;
  return Math.max(Math.floor(scroll.clientHeight)||0, wrapRoom);
 }
 function settleAutofitFromPaint(){
  if(autofitReloading||autofitSettled) return;
  if(!isAutoPageSize($('#rewardPageSize')?.value)) return;
  const scroll=tableBodyScroll();
  const body=$('#rewardBody');
  if(!scroll||!body) return;
  resetEvenFill();
  void scroll.offsetHeight;
  const rows=[...body.querySelectorAll('tr')].filter(tr=>!isPlaceholderRow(tr));
  if(!rows.length) return;
  const avail=scrollAvail(scroll);
  const natural=rows.reduce((sum,tr)=>sum+Math.ceil(tr.getBoundingClientRect().height),0);
  const rowH=Math.max(44,Math.round(natural/rows.length)||52);
  const overflow=scroll.scrollHeight>scroll.clientHeight+1||natural>avail+1;
  let target=Math.max(5,Math.min(200,Math.floor(avail/rowH)||rows.length));
  if(overflow) target=Math.max(5,Math.min(target,rows.length-1));
  /* Verify with a real post-paint overflow check before locking, on EVERY path — a cold first
     paint (F5) can under-measure avail/rowH and settle one row too many even when target already
     equals the current row count, which the old "already matches → lock immediately" shortcut
     never re-checked (manual reselect happened to route through the reload branch and got the
     check; F5 didn't). Recurses, shrinking by 1 each frame, until no overflow remains. */
  const verifyAndLock=()=>{
   requestAnimationFrame(()=>{
    const sc=tableBodyScroll();
    if(sc&&sc.scrollHeight>sc.clientHeight+1&&lockedAutoSize>5){
     lockedAutoSize=Math.max(5,lockedAutoSize-1);
     pageSize=lockedAutoSize;
     autofitReloading=true;
     Promise.resolve(load(1)).finally(()=>{autofitReloading=false;verifyAndLock();});
     return;
    }
    autofitSettled=true;
    evenFillRowHeights();
   });
  };
  if(target===rows.length){
   lockedAutoSize=rows.length;
   pageSize=lockedAutoSize;
   verifyAndLock();
   return;
  }
  lockedAutoSize=target;
  pageSize=target;
  autofitReloading=true;
  Promise.resolve(load(1)).finally(()=>{autofitReloading=false;verifyAndLock();});
 }
 function evenFillRowHeights(){
  const body=$('#rewardBody');
  const scroll=tableBodyScroll();
  const table=body?.closest('table');
  if(!body||!scroll||!table) return;
  resetEvenFill();
  if(!isAutoPageSize($('#rewardPageSize')?.value)) return;
  const rows=[...body.querySelectorAll('tr')].filter(tr=>!isPlaceholderRow(tr));
  if(!rows.length) return;
  void table.offsetHeight;
  const avail=Math.max(0,Math.floor(scroll.clientHeight));
  const natural=rows.reduce((sum,tr)=>sum+Math.ceil(tr.getBoundingClientRect().height),0);
  const rowH=Math.max(44,Math.round(natural/rows.length)||52);
  const gap=avail-natural;
  /* Stretch leftover seam only when it's smaller than one full row — never reload from here. */
  if(natural>avail+1||gap<2||gap>=rowH) return;
  const base=Math.floor(avail/rows.length);
  let rem=avail-(base*rows.length);
  if(base<=0) return;
  rows.forEach(tr=>{
   const h=base+(rem>0?1:0);
   if(rem>0) rem-=1;
   tr.style.height=h+'px';
   tr.querySelectorAll('td').forEach(td=>{td.style.height=h+'px';});
  });
  table.classList.add('bo-tx-evenfill');
  table.style.height=avail+'px';
  if(scroll.scrollHeight>scroll.clientHeight){
   const over=scroll.scrollHeight-scroll.clientHeight;
   const shrink=Math.ceil(over/rows.length)||1;
   rows.forEach(tr=>{
    const h=Math.max(rowH,(parseFloat(tr.style.height)||base)-shrink);
    tr.style.height=h+'px';
    tr.querySelectorAll('td').forEach(td=>{td.style.height=h+'px';});
   });
   table.style.height=Math.max(0,avail-over)+'px';
  }
 }
 function scheduleEvenFill(){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(isAutoPageSize($('#rewardPageSize')?.value)&&!autofitSettled){
    settleAutofitFromPaint();
    return;
   }
   evenFillRowHeights();
  }));
 }
 function bindEvenFillObserver(){
  const scroll=tableBodyScroll();
  if(!scroll||scroll._boEvenFillObs) return;
  scroll._boEvenFillObs=new ResizeObserver(()=>{
   if(!isAutoPageSize($('#rewardPageSize')?.value)) return;
   clearTimeout(scroll._boEvenFillTimer);
   scroll._boEvenFillTimer=setTimeout(()=>{
    const prev=lockedAutoSize;
    clearLockedAutoSize();
    const next=autoFitPageSize();
    syncAutofitMode();
    if(next!==prev) load(1);
    else scheduleEvenFill();
   },120);
  });
  scroll._boEvenFillObs.observe(scroll);
  return scroll._boEvenFillObs;
 }
 function bindHeadBodyScrollSync(){
  const body=tableBodyScroll();
  const head=tableHeadScroll();
  if(!body||!head||body._boHeadSync) return;
  body._boHeadSync=true;
  body.addEventListener('scroll',()=>{ head.scrollLeft=body.scrollLeft; },{passive:true});
 }

 function splitDate(v){
  if(!v) return {day:'—',time:'',title:''};
  const d=new Date(v);
  if(Number.isNaN(d.getTime())){const s=esc(v);return {day:s,time:'',title:s};}
  const day=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const time=`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return {day,time,title:`${day} ${time}`};
 }
 function statusClass(status){
  const s=String(status||'').toUpperCase();
  if(s==='PAID') return 'status-pill active';
  if(s==='SKIPPED') return 'status-pill off';
  return 'status-pill'; /* AVAILABLE / unknown → pending amber */
 }
 function memberCell(x){
  const name=String(x.username||('ID '+x.memberId)||'').trim();
  const mobile=String(x.mobile||'').trim();
  const same=mobile && name && mobile===name;
  const sub=(!same && mobile)?`<small>${esc(mobile)}</small>`:'';
  return `<td class="vip-log-member"><b>${esc(name||'—')}</b>${sub}</td>`;
 }
 function emptyRow(msg){return `<tr><td class="vip-log-empty" colspan="${COLS}">${esc(msg)}</td></tr>`;}

 async function load(p){
  page=p||1;
  syncPageSize();
  syncAutofitMode();
  const q=new URLSearchParams({page:String(page),size:String(pageSize)});
  const kw=$('#rewardKeyword')?.value.trim(),type=$('#rewardType')?.value,status=activeStatus();
  if(kw)q.set('keyword',kw); if(type)q.set('type',type); if(status)q.set('status',status);
  const body=$('#rewardBody');
  try{
   const r=await fetch(endpoint('VIP_REWARD_LOGS')+'?'+q,{headers:headers()});
   const j=await r.json();
   if(!r.ok||j.status==='error') throw new Error(j.message||'Unable to load VIP rewards.');
   const d=j.data||{},rows=d.content||[],pg=d.pagination||{};
   totalPages=Number(pg.totalPages||1);totalElements=Number(pg.totalElements??pg.total??rows.length);
   if(body)body.innerHTML=rows.length?rows.map(x=>{
    const dt=splitDate(x.createdAt);
    const period=esc(x.periodKey||'—');
    const cat=x.category?`<small>${esc(x.category)}</small>`:'';
    const ref=esc(x.referenceNo||'—');
    const remark=x.remark?`<small>${esc(x.remark)}</small>`:'';
    return `<tr>
      <td><span class="vip-log-datetime" title="${dt.title}"><span class="vip-log-date">${dt.day}</span><span class="vip-log-time">${dt.time}</span></span></td>
      ${memberCell(x)}
      <td><span class="vip-source-pill">${esc(x.rewardType||'—')}</span></td>
      <td class="vip-col-period"><span class="vip-log-stack"><b>${period}</b>${cat}</span></td>
      <td class="vip-col-base vip-log-num">${money(x.baseAmount)}</td>
      <td class="vip-col-rate vip-log-num">${Number(x.rate||0).toFixed(4)}%</td>
      <td><span class="vip-log-stack"><b class="vip-log-money">${money(x.rewardAmount)}</b><small>Turnover ${money(x.turnoverRequired)}</small></span></td>
      <td class="vip-col-maint vip-log-num">${money(x.maintenanceActual)} / ${money(x.maintenanceRequired)}</td>
      <td><span class="${statusClass(x.status)}">${esc(x.status||'—')}</span></td>
      <td class="vip-col-reference"><span class="vip-log-stack"><span class="vip-log-clip" title="${ref}">${ref}</span>${remark}</span></td>
    </tr>`;
   }).join(''):emptyRow('No VIP reward records found.');
   renderPages();renderInfo(rows.length);
   scheduleEvenFill();
   syncAutofitLabel();
  }catch(err){
   if(body)body.innerHTML=emptyRow('Unable to load VIP rewards.');
   renderPages();renderInfo(0);
   resetEvenFill();
   syncAutofitLabel();
   console.error(err);
  }
 }
 function renderInfo(rowCount){const info=$('#rewardPageInfo');if(!info)return;const from=totalElements&&rowCount?((page-1)*pageSize+1):0;const to=totalElements?Math.min((page-1)*pageSize+rowCount,totalElements):0;info.textContent=`Showing ${from} to ${to} of ${totalElements} entries`;}
 function renderPages(){
  const w=$('#rewardPagination');if(!w)return;
  const total=Math.max(1,Number(totalPages)||1);
  const current=Math.max(1,Math.min(Number(page)||1,total));
  const pages=[]; const add=n=>{if(n>=1&&n<=total&&!pages.includes(n))pages.push(n);};
  add(1); for(let n=current-2;n<=current+2;n++) add(n); add(total); pages.sort((a,b)=>a-b);
  let html='';
  html+=`<button type="button" class="smart-page first" data-reward-page="1" ${current<=1?'disabled':''} title="First page" aria-label="First page"><i class="bi bi-chevron-bar-left" aria-hidden="true"></i></button>`;
  html+=`<button type="button" data-reward-page="${current-1}" ${current<=1?'disabled':''} aria-label="Previous page">‹</button>`;
  let prev=0;
  pages.forEach(n=>{
   if(prev&&n-prev>1) html+='<span class="smart-page-ellipsis" aria-hidden="true">…</span>';
   html+=`<button type="button" class="${n===current?'active':''}" data-reward-page="${n}" ${n===current?'aria-current="page"':''}>${n}</button>`;
   prev=n;
  });
  html+=`<button type="button" data-reward-page="${current+1}" ${current>=total?'disabled':''} aria-label="Next page">›</button>`;
  html+=`<button type="button" class="smart-page last" data-reward-page="${total}" ${current>=total?'disabled':''} title="Last page" aria-label="Last page"><i class="bi bi-chevron-bar-right" aria-hidden="true"></i></button>`;
  w.innerHTML=html;
 }
 /* Any filter/tab change can swap in taller or shorter rows — re-settle autofit for the new content
    instead of reusing a size locked in for the previous dataset (stale lock caused the Paid-tab overflow). */
 function reloadForFilterChange(p){
  if(isAutoPageSize($('#rewardPageSize')?.value)) clearLockedAutoSize();
  load(p||1);
 }
 let keywordTimer=0;
 function scheduleKeywordSearch(){
  clearTimeout(keywordTimer);
  keywordTimer=setTimeout(()=>reloadForFilterChange(1),280);
 }
 function activeStatus(){
  const tab=$('#rewardStatusTabs .bo-tx-tab.is-active');
  return tab?String(tab.getAttribute('data-reward-status')||''):'';
 }
 function setStatusTab(btn){
  const track=$('#rewardStatusTabs');
  if(!track||!btn) return;
  track.querySelectorAll('.bo-tx-tab').forEach(t=>{
   const on=t===btn;
   t.classList.toggle('is-active',on);
   t.setAttribute('aria-pressed',on?'true':'false');
  });
  if(window.BO_SEG_BOUNCE){
   try{window.BO_SEG_BOUNCE.sync(track);}catch(_){}
  }
  reloadForFilterChange(1);
 }
 listen(document,'click',e=>{
  const tab=e.target.closest('#rewardStatusTabs .bo-tx-tab');
  if(tab){e.preventDefault();setStatusTab(tab);return;}
  const b=e.target.closest('[data-reward-page]');
  if(b&&!b.disabled)load(Number(b.dataset.rewardPage));
 });
 listen(document,'keydown',e=>{
  if(e.key==='Enter' && e.target && e.target.id==='rewardKeyword'){
   e.preventDefault();
   clearTimeout(keywordTimer);
   reloadForFilterChange(1);
  }
 });
 $('#rewardKeyword')?.addEventListener('input',scheduleKeywordSearch);
 $('#rewardType')?.addEventListener('change',()=>reloadForFilterChange(1));
 /* reports.js must not shrink .vip-log-filters / page-size to the select width. */
 function unlockRewardFilters(){
  const clear=(el)=>{
   if(!el) return;
   ['width','min-width','max-width','flex'].forEach(p=>el.style.removeProperty(p));
   el.style.removeProperty('--bo-select-width');
  };
  const row=document.querySelector('.vip-log-toolbar .vip-log-filters');
  clear(row);
  row?.querySelectorAll('.rounded-select-wrap,.rounded-select-btn').forEach(clear);
  const entries=document.querySelector('.table-footer .entries-control .rounded-select-wrap');
  clear(entries);
  entries?.querySelectorAll('.rounded-select-btn').forEach(clear);
 }
 unlockRewardFilters();
 requestAnimationFrame(()=>requestAnimationFrame(unlockRewardFilters));
 setTimeout(unlockRewardFilters,0);
 setTimeout(unlockRewardFilters,120);
 $('#rewardPageSize')?.addEventListener('change',()=>{
  clearLockedAutoSize();
  syncPageSize();
  syncAutofitMode();
  load(1);
 });
 $('#rewardPageSize')?.addEventListener('bo:select-sync',()=>{
  requestAnimationFrame(syncAutofitLabel);
 });

 bindHeadBodyScrollSync();
 const evenFillObs=bindEvenFillObserver();
 if(evenFillObs) unbinds.push(()=>evenFillObs.disconnect());
 let resizeTimer=0;
 listen(window,'resize',()=>{
  if(!isAutoPageSize($('#rewardPageSize')?.value)) return;
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{
   const prev=lockedAutoSize;
   clearLockedAutoSize();
   const next=autoFitPageSize();
   syncAutofitMode();
   if(next!==prev) load(1);
   else scheduleEvenFill();
  },180);
 });

 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  const track=$('#rewardStatusTabs');
  if(track&&window.BO_SEG_BOUNCE){
   try{window.BO_SEG_BOUNCE.mount(track,{button:':scope > .bo-tx-tab',anim:'bounce'});}catch(_){}
  }
  clearLockedAutoSize();
  syncAutofitMode();
  load(1).then(()=>{
   setTimeout(()=>settleAutofitFromPaint(),60);
  });
 }));
})();
