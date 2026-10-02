(function(){
 /* A swap re-runs this file against a fresh frame; the document/window bindings and the
    even-fill observer below were added again on each entry. Release the previous run's. */
 if(window.__boVipExpUnbind) window.__boVipExpUnbind();
 const unbinds=[];
 const listen=(target,type,fn,opt)=>{ target.addEventListener(type,fn,opt); unbinds.push(()=>target.removeEventListener(type,fn,opt)); };
 window.__boVipExpUnbind=()=>{ unbinds.forEach(fn=>fn()); unbinds.length=0; };
 const $=s=>document.querySelector(s), esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let page=1,totalPages=1,totalElements=0,pageSize=20,lockedAutoSize=null,autofitReloading=false,autofitSettled=false;
 const endpoint=k=>API_CONFIG.BASE_URL+API_CONFIG.ENDPOINTS[k];
 const headers=()=>Object.assign({'Content-Type':'application/json'},window.BO_AUTH?BO_AUTH.authHeader():{});
 const pad=n=>String(n).padStart(2,'0');
 const COLS=8;

 /* Show N entries: - · 10 · 20 · 50 · 100 · all
    `-` = auto-fit rows into viewport — no vertical scrollbar. */
 function tableBodyScroll(){
  return document.getElementById('vipLogTableScroll')
    || document.querySelector('.vip-tx-table-body')
    || document.querySelector('.vip-admin-table-wrap');
 }
 function tableHeadScroll(){
  return document.querySelector('.vip-admin-table-wrap .vip-tx-table-head');
 }
 function naturalRowHeight(scroll){
  const sample=scroll?.querySelector('tbody tr:not(.bo-table-fill) td');
  /* VIP rows are often 2-line (member + mobile). */
  return sample?Math.max(44,Math.round(sample.getBoundingClientRect().height)):52;
 }
 function measureAutoPageSize(){
  const scroll=tableBodyScroll();
  if(!scroll) return 12;
  /* Body-only scrollport — do not subtract thead (head is outside). */
  const avail=Math.max(0,Math.floor(scroll.clientHeight));
  const rowH=naturalRowHeight(scroll);
  /* Floor only — never add a row that would overflow and go invisible under overflow:hidden. */
  return Math.max(5,Math.min(200,Math.floor(avail/rowH)||12));
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
  const v=String(raw??$('#vipLogPageSize')?.value??'-').trim();
  if(isAutoPageSize(v)) return autoFitPageSize();
  if(/^all$/i.test(v)) return 10000;
  const n=Number(v);
  return Number.isFinite(n)&&n>0?n:autoFitPageSize();
 }
 function syncPageSize(){
  pageSize=resolvePageSize($('#vipLogPageSize')?.value);
  return pageSize;
 }
 function syncAutofitMode(){
  const auto=isAutoPageSize($('#vipLogPageSize')?.value);
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
  return !t || /loading|no exp|unable to load/.test(t);
 }
 function resetEvenFill(){
  const body=$('#vipExpLogBody');
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
  if(!isAutoPageSize($('#vipLogPageSize')?.value)) return;
  const scroll=tableBodyScroll();
  const body=$('#vipExpLogBody');
  if(!scroll||!body) return;
  resetEvenFill();
  void scroll.offsetHeight;
  const rows=[...body.querySelectorAll('tr')].filter(tr=>!isPlaceholderRow(tr));
  if(!rows.length) return;
  const avail=scrollAvail(scroll);
  const natural=rows.reduce((sum,tr)=>sum+Math.ceil(tr.getBoundingClientRect().height),0);
  const rowH=Math.max(44,Math.round(natural/rows.length)||52);
  const overflow=scroll.scrollHeight>scroll.clientHeight+1||natural>avail+1;
  /* Floor only — never ceil a row that overflow:hidden would clip. */
  let target=Math.max(5,Math.min(200,Math.floor(avail/rowH)||rows.length));
  if(overflow) target=Math.max(5,Math.min(target,rows.length-1));
  /* Stop only when this paint IS the floor count. A matching lock with fewer
     painted rows (All → `-`) must reload, not freeze the short set. */
  /* Verify with a real post-paint overflow check before locking, on EVERY path — a cold first
     paint (F5) can under-measure avail/rowH and settle one row too many even when target already
     equals the current row count, which the old "already matches → lock immediately" shortcut
     never re-checked. Recurses, shrinking by 1 each frame, until no overflow remains. */
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
  const body=$('#vipExpLogBody');
  const scroll=tableBodyScroll();
  const table=body?.closest('table');
  if(!body||!scroll||!table) return;
  resetEvenFill();
  if(!isAutoPageSize($('#vipLogPageSize')?.value)) return;
  const rows=[...body.querySelectorAll('tr')].filter(tr=>!isPlaceholderRow(tr));
  if(!rows.length) return;
  void table.offsetHeight;
  const avail=Math.max(0,Math.floor(scroll.clientHeight));
  const natural=rows.reduce((sum,tr)=>sum+Math.ceil(tr.getBoundingClientRect().height),0);
  const rowH=Math.max(44,Math.round(natural/rows.length)||52);
  const gap=avail-natural;
  /* Stretch leftover seam only when it's smaller than one full row — grow/shrink is settleAutofitFromPaint. */
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
   if(isAutoPageSize($('#vipLogPageSize')?.value)&&!autofitSettled){
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
   if(!isAutoPageSize($('#vipLogPageSize')?.value)) return;
   clearTimeout(scroll._boEvenFillTimer);
   scroll._boEvenFillTimer=setTimeout(()=>{
    const prev=lockedAutoSize;
    clearLockedAutoSize();
    const next=autoFitPageSize();
    syncAutofitMode();
    if(next!==prev) load(1);
    else scheduleEvenFill();
   },32);
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
 function emptyRow(msg){return `<tr><td class="vip-log-empty" colspan="${COLS}">${esc(msg)}</td></tr>`;}
 async function load(p){
  page=p||1;
  syncPageSize();
  syncAutofitMode();
  const q=new URLSearchParams({page:String(page),size:String(pageSize)}),kw=$('#vipLogKeyword')?.value.trim(),src=$('#vipLogSource')?.value;
  if(kw)q.set('keyword',kw);if(src)q.set('source',src);
  const body=$('#vipExpLogBody');
  try{
   const r=await fetch(endpoint('VIP_EXP_LOGS')+'?'+q,{headers:headers()});
   const j=await r.json();
   const d=j.data||{},rows=d.content||[],pg=d.pagination||{};
   totalPages=Number(pg.totalPages||1);totalElements=Number(pg.totalElements??pg.total??rows.length);
   if(body)body.innerHTML=rows.length?rows.map(x=>{
    const dt=splitDate(x.createdAt);
    const change=Number(x.experienceChange||0);
    const pos=change>=0;
    const mobile=x.mobile?`<small>${esc(x.mobile)}</small>`:'';
    return `<tr>
      <td><span class="vip-log-datetime" title="${dt.title}"><span class="vip-log-date">${dt.day}</span><span class="vip-log-time">${dt.time}</span></span></td>
      <td class="vip-log-member"><b>${esc(x.username||('ID '+x.memberId))}</b>${mobile}</td>
      <td><span class="vip-source-pill">${esc(x.sourceType||'—')}</span></td>
      <td class="${pos?'vip-exp-positive':'vip-exp-negative'}">${pos?'+':''}${change.toLocaleString()}</td>
      <td class="vip-log-num">${Number(x.balanceBefore||0).toLocaleString()}</td>
      <td class="vip-log-num">${Number(x.balanceAfter||0).toLocaleString()}</td>
      <td class="vip-col-reference"><span class="vip-log-clip" title="${esc(x.referenceId||'')}">${esc(x.referenceId||'—')}</span></td>
      <td class="vip-col-remark"><span class="vip-log-clip" title="${esc(x.remark||'')}">${esc(x.remark||'—')}</span></td>
    </tr>`;
   }).join(''):emptyRow('No EXP logs found.');
   renderPages();renderInfo(rows.length);
   scheduleEvenFill();
  }catch(err){
   if(body)body.innerHTML=emptyRow('Unable to load VIP EXP logs.');
   renderPages();renderInfo(0);
   resetEvenFill();
  }
 }
 function renderInfo(rowCount){const info=$('#vipLogPageInfo');if(!info)return;const from=totalElements&&rowCount?((page-1)*pageSize+1):0;const to=totalElements?Math.min((page-1)*pageSize+rowCount,totalElements):0;info.textContent=`Showing ${from} to ${to} of ${totalElements} entries`;}
 function renderPages(){
  const w=$('#vipLogPagination');if(!w)return;
  const total=Math.max(1,Number(totalPages)||1);
  const current=Math.max(1,Math.min(Number(page)||1,total));
  const pages=[]; const add=n=>{if(n>=1&&n<=total&&!pages.includes(n))pages.push(n);};
  add(1); for(let n=current-2;n<=current+2;n++) add(n); add(total); pages.sort((a,b)=>a-b);
  let html='';
  html+=`<button type="button" class="smart-page first" data-log-page="1" ${current<=1?'disabled':''} title="First page" aria-label="First page"><i class="bi bi-chevron-bar-left" aria-hidden="true"></i></button>`;
  html+=`<button type="button" data-log-page="${current-1}" ${current<=1?'disabled':''} aria-label="Previous page">‹</button>`;
  let prev=0;
  pages.forEach(n=>{
   if(prev&&n-prev>1) html+='<span class="smart-page-ellipsis" aria-hidden="true">…</span>';
   html+=`<button type="button" class="${n===current?'active':''}" data-log-page="${n}" ${n===current?'aria-current="page"':''}>${n}</button>`;
   prev=n;
  });
  html+=`<button type="button" data-log-page="${current+1}" ${current>=total?'disabled':''} aria-label="Next page">›</button>`;
  html+=`<button type="button" class="smart-page last" data-log-page="${total}" ${current>=total?'disabled':''} title="Last page" aria-label="Last page"><i class="bi bi-chevron-bar-right" aria-hidden="true"></i></button>`;
  w.innerHTML=html;
 }
 function modal(show){
  const m=$('#vipAdjustModal');if(!m)return;
  m.classList.toggle('show',show);
  m.hidden=!show;
  document.body.classList.toggle('vip-modal-open',show||document.querySelector('#vipModal.show'));
  if(show) setTimeout(()=>$('#vipAdjustMemberId')?.focus(),40);
 }
 listen(document,'click',e=>{
  if(e.target.closest('#vipAdjustOpen'))modal(true);
  if(e.target.closest('[data-close-adjust]'))modal(false);
  const b=e.target.closest('[data-log-page]');
  if(b&&!b.disabled)load(Number(b.dataset.logPage));
  if(e.target===$('#vipAdjustModal'))modal(false);
 });
 listen(document,'keydown',e=>{
  if(e.key==='Escape' && $('#vipAdjustModal')?.classList.contains('show')) modal(false);
  if(e.key==='Enter' && e.target && e.target.id==='vipLogKeyword'){e.preventDefault();reloadForFilterChange(1);}
 });
 /* Any filter change can swap in taller or shorter rows — re-settle autofit for the new content
    instead of reusing a size locked in for the previous dataset. */
 function reloadForFilterChange(p){
  if(isAutoPageSize($('#vipLogPageSize')?.value)) clearLockedAutoSize();
  load(p||1);
 }
 $('#vipLogSource')?.addEventListener('change',()=>reloadForFilterChange(1));
 $('#vipLogKeyword')?.addEventListener('search',()=>reloadForFilterChange(1));
 $('#vipLogPageSize')?.addEventListener('change',()=>{
  clearLockedAutoSize();
  syncAutofitMode();
  /* All → `-`: drop tall All content first so the flex scrollport
     reports the real viewport height before we measure. */
  const body=$('#vipExpLogBody');
  if(isAutoPageSize($('#vipLogPageSize')?.value)&&body){
   body.innerHTML=emptyRow('Loading…');
   resetEvenFill();
  }
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   clearLockedAutoSize();
   syncPageSize();
   load(1);
  }));
 });
 $('#vipAdjustForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const data={memberId:Number($('#vipAdjustMemberId').value),amount:Number($('#vipAdjustAmount').value),reason:$('#vipAdjustReason').value.trim()};
  if(!data.amount)return alert('EXP amount cannot be 0');
  const r=await fetch(endpoint('VIP_EXP_ADJUST'),{method:'POST',headers:headers(),body:JSON.stringify(data)}),j=await r.json();
  if(!r.ok||j.status==='error')return alert(j.message||'Adjustment failed');
  modal(false);e.target.reset();load(1);alert(j.message||'VIP EXP adjusted');
 });

 bindHeadBodyScrollSync();
 const evenFillObs=bindEvenFillObserver();
 if(evenFillObs) unbinds.push(()=>evenFillObs.disconnect());
 let resizeTimer=0;
 listen(window,'resize',()=>{
  if(!isAutoPageSize($('#vipLogPageSize')?.value)) return;
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

 /* Wait for layout so auto-fit measures the real body height, not a collapsed shell. */
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  clearLockedAutoSize();
  syncAutofitMode();
  load(1);
 }));
})();

