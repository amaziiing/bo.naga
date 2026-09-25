(function(){
  let page = 1;
  let totalPages = 1;
  let pageSize = 20;
  let lockedAutoSize = null;
  let currentRows = [];
  let sortKey = null;
  let sortDir = 'asc'; /* asc = A→Z / low→high */
  const TEXT_SORT_KEYS = new Set(['username']);
  const SORT_KEYS = [
    'username','mainWalletBalance','providerWalletBalance','totalBalance',
    'totalDeposit','totalWithdraw','totalTransferIn','totalTransferOut',
    'totalBet','totalWin','totalLose','winLoss','totalAdjustment','totalBonus','dailyRebate'
  ];

  /* Same Show N entries contract as Deposit / Wallet Ledger: - · 10 · 20 · 50 · 100 · All
     `-` = auto-fit rows into viewport — no vertical scrollbar. */
  function tableBodyScroll(){
    return document.getElementById('walletTableScroll')
      || document.querySelector('.table-card .bo-tx-table-body')
      || document.querySelector('.table-card .table-wrap')
      || document.querySelector('.table-wrap');
  }
  function measureAutoPageSize(){
    const scroll=tableBodyScroll();
    if(!scroll) return 12;
    const avail=Math.max(0,Math.floor(scroll.clientHeight));
    const sample=scroll.querySelector('tbody tr:not(.bo-table-fill) td');
    const rowH=sample?Math.max(38,Math.round(sample.getBoundingClientRect().height)):41;
    /* Floor only — never add a row that would overflow and create a scrollbar. */
    return Math.max(5,Math.min(200,Math.floor(avail/rowH)||12));
  }
  function autoFitPageSize(){
    if(lockedAutoSize!=null) return lockedAutoSize;
    lockedAutoSize=measureAutoPageSize();
    return lockedAutoSize;
  }
  function clearLockedAutoSize(){ lockedAutoSize=null; }
  function isAutoPageSize(raw){
    const v=String(raw??'-').trim();
    return v===''||v==='-'||/^auto$/i.test(v);
  }
  function resolvePageSize(raw){
    const v=String(raw??document.getElementById('walletSize')?.value??'-').trim();
    if(isAutoPageSize(v)) return autoFitPageSize();
    if(/^all$/i.test(v)) return 10000;
    const n=Number(v);
    return Number.isFinite(n)&&n>0?n:autoFitPageSize();
  }
  function syncAutofitMode(){
    const auto=isAutoPageSize(document.getElementById('walletSize')?.value);
    const card=document.querySelector('.table-card');
    const scroll=tableBodyScroll();
    if(card) card.toggleAttribute('data-bo-autofit', auto);
    if(scroll) scroll.toggleAttribute('data-bo-autofit', auto);
    if(!auto) resetEvenFill();
  }
  function isPlaceholderRow(tr){
    const t=(tr?.textContent||'').trim().toLowerCase();
    return !t || /loading|no wallet|no records|failed/.test(t);
  }
  function resetEvenFill(){
    const body=document.getElementById('memberWalletBody');
    const table=body?.closest('table');
    if(!body||!table) return;
    delete table.dataset.boEvenKey;
    table.classList.remove('bo-tx-evenfill');
    table.style.height='';
    body.querySelectorAll('tr.bo-table-fill').forEach(r=>r.remove());
    [...body.querySelectorAll('tr')].forEach(tr=>{
      tr.style.height='';
      /* Clear any legacy per-cell heights from older builds. */
      tr.querySelectorAll('td').forEach(td=>{td.style.height='';td.style.minHeight='';});
    });
  }
  let autofitReloading=false;
  /* Mute ResizeObserver-driven evenFill during first paint / reveal — reset→restretch is the remaining flicker. */
  let evenFillPaused=false;
  let evenFillPauseTimer=0;
  function pauseEvenFill(ms){
    evenFillPaused=true;
    clearTimeout(evenFillPauseTimer);
    if(ms>0) evenFillPauseTimer=setTimeout(function(){ evenFillPaused=false; }, ms);
  }
  function shrinkAutofitIfOverflow(){
    if(evenFillPaused || autofitReloading) return;
    if(!isAutoPageSize(document.getElementById('walletSize')?.value)) return;
    const scroll=tableBodyScroll();
    if(!scroll) return;
    if(scroll.scrollHeight<=scroll.clientHeight+1) return;
    if(lockedAutoSize==null||lockedAutoSize<=5) return;
    lockedAutoSize=Math.max(5, lockedAutoSize-1);
    pageSize=lockedAutoSize;
    autofitReloading=true;
    page=1;
    Promise.resolve(load()).finally(()=>{ autofitReloading=false; });
  }
  function evenFillRowHeights(){
    const body=document.getElementById('memberWalletBody');
    const scroll=tableBodyScroll();
    const table=body?.closest('table');
    if(!body||!scroll||!table) return;
    if(!isAutoPageSize(document.getElementById('walletSize')?.value)){ resetEvenFill(); return; }
    const rows=[...body.querySelectorAll('tr')].filter(tr=>!isPlaceholderRow(tr));
    if(!rows.length){ resetEvenFill(); return; }
    const avail=Math.max(0, Math.floor(scroll.clientHeight));
    if(avail<40) return;
    const evenKey=avail+'|'+rows.length+'|'+page+'|'+pageSize;
    /* Same viewport + row count: skip reset→restretch (visible flicker source). */
    if(table.dataset.boEvenKey===evenKey && table.classList.contains('bo-tx-evenfill')) return;
    body.querySelectorAll('tr.bo-table-fill').forEach(r=>r.remove());
    /* Clear only row height — do not touch td (Provider Balance buttons reflow/flash otherwise). */
    rows.forEach(tr=>{ tr.style.height=''; });
    table.classList.remove('bo-tx-evenfill');
    table.style.height='';
    void table.offsetHeight;
    const natural=rows.reduce((sum,tr)=>sum+Math.ceil(tr.getBoundingClientRect().height),0);
    const rowH=Math.max(38, Math.round(natural/rows.length)||44);
    const gap=avail-natural;
    /* Overflow: too many rows for viewport — drop one and reload (Show `-` must not scroll). */
    if(natural>avail+1){
      delete table.dataset.boEvenKey;
      shrinkAutofitIfOverflow();
      return;
    }
    /* Stretch only when leftover is a seam (not enough for one more full row). */
    if(gap<2||gap>=rowH){
      delete table.dataset.boEvenKey;
      return;
    }
    const base=Math.floor(avail/rows.length);
    let rem=avail-(base*rows.length);
    if(base<=0) return;
    rows.forEach(tr=>{
      const h=base+(rem>0?1:0);
      if(rem>0) rem-=1;
      tr.style.height=h+'px';
    });
    table.classList.add('bo-tx-evenfill');
    table.style.height=avail+'px';
    if(scroll.scrollHeight>scroll.clientHeight){
      const over=scroll.scrollHeight-scroll.clientHeight;
      const shrink=Math.ceil(over/rows.length)||1;
      rows.forEach(tr=>{
        const h=Math.max(rowH, (parseFloat(tr.style.height)||base)-shrink);
        tr.style.height=h+'px';
      });
      table.style.height=Math.max(0, avail-over)+'px';
    }
    table.dataset.boEvenKey=evenKey;
  }
  function scheduleEvenFill(){
    if(evenFillPaused) return;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(evenFillPaused) return;
      evenFillRowHeights();
      shrinkAutofitIfOverflow();
    }));
  }

  function bindHorizontalDragScroll(scrollEl, grabEls){
    if(!scrollEl || scrollEl._boHDrag) return;
    scrollEl._boHDrag = true;
    let down=false, moved=false, startX=0, startLeft=0, pid=null;
    const interactive='a,button,input,select,textarea,label,.bo-tx-sort-btn,.bo-tx-action-btn,.wallet-total-link,[data-provider-wallet-detail]';
    const onDown=(e)=>{
      if(e.button!=null && e.button!==0) return;
      if(e.target.closest(interactive)) return;
      down=true; moved=false; startX=e.clientX; startLeft=scrollEl.scrollLeft; pid=e.pointerId;
      try{ e.currentTarget.setPointerCapture?.(e.pointerId); }catch(_){}
      grabEls.forEach(el=>el.classList.add('is-hdrag'));
    };
    const onMove=(e)=>{
      if(!down) return;
      const dx=e.clientX-startX;
      if(Math.abs(dx)>4) moved=true;
      scrollEl.scrollLeft=startLeft-dx;
      e.preventDefault();
    };
    const onUp=()=>{
      if(!down) return;
      down=false;
      grabEls.forEach(el=>el.classList.remove('is-hdrag'));
    };
    grabEls.forEach(el=>{
      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
      el.addEventListener('lostpointercapture', onUp);
    });
    scrollEl.addEventListener('click', e=>{
      if(!moved) return;
      e.preventDefault();
      e.stopPropagation();
      moved=false;
    }, true);
  }
  function bindEvenFillObserver(){
    const scroll=tableBodyScroll();
    if(!scroll||scroll._boEvenFillObs) return;
    scroll._boEvenFillObs=new ResizeObserver(()=>{
      if(evenFillPaused) return;
      clearTimeout(scroll._boEvenFillTimer);
      scroll._boEvenFillTimer=setTimeout(function(){
        if(evenFillPaused) return;
        evenFillRowHeights();
      },48);
    });
    scroll._boEvenFillObs.observe(scroll);
  }
  function publishPagerMeta(pagination,size){
    const card=document.querySelector('.table-card');
    if(!card) return;
    const total=Number(pagination?.totalElements);
    if(Number.isFinite(total)&&total>=0) card.dataset.boTotal=String(total);
    else delete card.dataset.boTotal;
    const n=Number(size);
    if(Number.isFinite(n)&&n>0) card.dataset.boPageSize=String(n);
    else delete card.dataset.boPageSize;
    card.dataset.boPage=String(page);
  }

  function pageButtons(current,total){
    total=Math.max(1,Number(total)||1); current=Math.max(1,Math.min(Number(current)||1,total));
    const pages=[]; const add=n=>{if(n>=1&&n<=total&&!pages.includes(n))pages.push(n);};
    add(1); for(let n=current-2;n<=current+2;n++) add(n); add(total); pages.sort((a,b)=>a-b);
    let html='<div class="smart-pagination" role="navigation" aria-label="Table pagination">';
    html+='<button type="button" class="smart-page first" data-page="1" '+(current<=1?'disabled':'')+' title="First page"><i class="bi bi-chevron-bar-left"></i></button>';
    let prev=0; pages.forEach(n=>{if(prev&&n-prev>1)html+='<span class="smart-page-ellipsis">…</span>'; html+='<button type="button" class="smart-page '+(n===current?'active':'')+'" data-page="'+n+'" '+(n===current?'aria-current="page"':'')+'>'+n+'</button>'; prev=n;});
    html+='<button type="button" class="smart-page last" data-page="'+total+'" '+(current>=total?'disabled':'')+' title="Last page"><i class="bi bi-chevron-bar-right"></i></button>';
    html+='</div><span class="smart-page-summary">Page '+current+' / '+total+'</span>'; return html;
  }
  function url(key){ return API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS[key]; }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function num(v){ const n = Number(v || 0); return Number.isFinite(n) ? n : 0; }
  function money(v){ return num(v).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}); }
  function dt(v){
    if(v==null||v==='') return '-';
    if(window.BO_FORMAT && typeof window.BO_FORMAT.dateTime==='function'){
      const f=window.BO_FORMAT.dateTime(v);
      if(f) return f;
    }
    const s=String(v).trim();
    const m=s.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2}(?::\d{2})?)/);
    if(m) return m[1]+' '+m[2].slice(0,8);
    return s.replace('T',' ').slice(0,19);
  }
  async function api(endpoint){
    const res = await fetch(endpoint, {headers:{...BO_AUTH.authHeader()}});
    const json = await res.json().catch(()=>({}));
    if(!res.ok || json.status === 'error') throw new Error(json.message || 'Request failed');
    return json;
  }
  function query(opts){
    const all = !!(opts && opts.all);
    const params = new URLSearchParams();
    const keyword = document.getElementById('walletKeyword')?.value.trim();
    pageSize = resolvePageSize(document.getElementById('walletSize')?.value);
    if(keyword) params.set('keyword', keyword);
    params.set('page', all ? 1 : page);
    params.set('size', String(all ? 10000 : pageSize));
    if(sortKey){
      params.set('sort', sortKey);
      params.set('order', sortDir);
      params.set('sortBy', sortKey);
      params.set('sortDir', sortDir);
    }
    return params.toString();
  }
  function sortValue(row, key){
    if(TEXT_SORT_KEYS.has(key)) return String(row?.[key] ?? '').trim().toLocaleLowerCase();
    return num(row?.[key]);
  }
  function compareRows(a, b, key, dir){
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    let cmp = 0;
    if(typeof av === 'string' || typeof bv === 'string'){
      cmp = String(av).localeCompare(String(bv), undefined, {numeric:true, sensitivity:'base'});
    }else{
      cmp = av === bv ? 0 : (av < bv ? -1 : 1);
    }
    if(cmp === 0){
      const ida = num(a?.memberId);
      const idb = num(b?.memberId);
      cmp = ida === idb ? String(a?.username||'').localeCompare(String(b?.username||'')) : (ida < idb ? -1 : 1);
    }
    return dir === 'desc' ? -cmp : cmp;
  }
  function sortRows(rows){
    if(!sortKey || !SORT_KEYS.includes(sortKey)) return rows.slice();
    return rows.slice().sort((a,b)=>compareRows(a,b,sortKey,sortDir));
  }
  function syncSortHeaders(){
    document.querySelectorAll('.bo-tx-head-table th.bo-tx-sortable').forEach(th=>{
      const key = th.getAttribute('data-sort');
      const active = key && key === sortKey;
      const state = active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';
      th.setAttribute('aria-sort', state);
      th.classList.toggle('is-sorted', active);
      th.classList.toggle('is-asc', active && sortDir === 'asc');
      th.classList.toggle('is-desc', active && sortDir === 'desc');
      
    });
  }
  function setSort(key){
    if(!SORT_KEYS.includes(key)) return;
    if(sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortKey = key; sortDir = 'asc'; }
    syncSortHeaders();
    page = 1;
    load();
  }
  function bindSortHeaders(){
    const head = document.querySelector('.bo-tx-head-table thead');
    if(!head || head._boSortBound) return;
    head._boSortBound = true;
    head.addEventListener('click', e=>{
      const th = e.target.closest('th.bo-tx-sortable[data-sort]');
      if(!th) return;
      e.preventDefault();
      setSort(th.getAttribute('data-sort'));
    });
  }
  function metric(id, v){ const el=document.getElementById(id); if(el) el.textContent = money(v); }
  function updateMetrics(rows){
    metric('mwMainTotal', rows.reduce((s,r)=>s+num(r.mainWalletBalance),0));
    metric('mwProviderTotal', rows.reduce((s,r)=>s+num(r.providerWalletBalance),0));
    metric('mwBetTotal', rows.reduce((s,r)=>s+num(r.totalBet),0));
    metric('mwWinLossTotal', rows.reduce((s,r)=>s+num(r.winLoss),0));
  }
  function notifyDashboardReady(){
    try{
      document.documentElement.classList.add('bo-embed-ready');
      if(window.parent && window.parent !== window){
        window.parent.postMessage({type:'bo:dashboard-panel-ready', page:'member-wallet'}, '*');
      }
    }catch(_e){
      document.documentElement.classList.add('bo-embed-ready');
    }
  }

  function settleAndReveal(rows){
    const embedded=document.documentElement.classList.contains('dashboard-embedded-page');
    pauseEvenFill(0);
    const table=document.getElementById('memberWalletBody')?.closest('table');
    if(table) delete table.dataset.boEvenKey;
    evenFillRowHeights();
    requestAnimationFrame(function(){
      evenFillRowHeights();
      notifyDashboardReady();
      pauseEvenFill(embedded?200:80);
      refreshVisibleProviderBalances(rows||[]);
    });
  }

  function render(rows, pagination){
    const body = document.getElementById('memberWalletBody');
    if(!body) return;
    currentRows = rows;
    syncSortHeaders();
    updateMetrics(rows);
    if(!rows.length){ body.innerHTML = '<tr><td colspan="16">No wallet records found.</td></tr>'; }
    else body.innerHTML = rows.map(r => {
      const wl = num(r.winLoss);
      const mid = encodeURIComponent(r.memberId);
      return `<tr data-member-wallet-row="${esc(r.memberId)}">
        <td><b>${esc(r.username || '-')}</b></td>
        <td><b>${money(r.mainWalletBalance)}</b></td>
        <td><button class="wallet-total-link provider-wallet-total-link" type="button" data-provider-wallet-detail="${esc(r.memberId)}" data-provider-wallet-user="${esc(r.username||'')}" data-provider-total-cell="${esc(r.memberId)}" title="View provider wallet detail">${money(r.providerWalletBalance)}</button></td>
        <td><b data-total-balance-cell="${esc(r.memberId)}">${money(r.totalBalance)}</b></td>
        <td>${money(r.totalDeposit)}</td>
        <td>${money(r.totalWithdraw)}</td>
        <td>${money(r.totalTransferIn)}</td>
        <td>${money(r.totalTransferOut)}</td>
        <td>${money(r.totalBet)}</td>
        <td>${money(r.totalWin)}</td>
        <td>${money(r.totalLose)}</td>
        <td><span class="status-pill ${wl >= 0 ? 'active' : 'off'}">${money(wl)}</span></td>
        <td><a class="wallet-total-link" href="wallet-ledger.html?memberId=${mid}&type=ADJUSTMENT&scope=all" title="View adjustment detail">${money(r.totalAdjustment)}</a></td>
        <td><a class="wallet-total-link" href="wallet-ledger.html?memberId=${mid}&type=BONUS&scope=all" title="View bonus detail">${money(r.totalBonus)}</a></td>
        <td><a class="wallet-total-link" href="daily-rebate-report.html?memberId=${mid}" title="View daily rebate detail">${money(r.dailyRebate)}</a></td>
        <td><div class="d-flex gap-1 flex-nowrap justify-content-center">
          <a class="bo-tx-action-btn is-ledger" href="wallet-ledger.html?memberId=${mid}" title="Ledger" aria-label="Ledger"><i class="bi bi-journal-text" aria-hidden="true"></i></a>
          <a class="bo-tx-action-btn is-edit" href="member-detail.html?memberId=${mid}" title="Adjust" aria-label="Adjust"><i class="bi bi-sliders" aria-hidden="true"></i></a>
        </div></td>
      </tr>`;
    }).join('');
    totalPages = Number(pagination && pagination.totalPages) || 1;
    publishPagerMeta(pagination, pageSize);
    document.getElementById('walletPager').innerHTML = pageButtons(page, totalPages);
    const pageInfo = document.getElementById('walletPageInfo');
    if(pageInfo) pageInfo.textContent = `${Number(pagination && pagination.totalElements || rows.length).toLocaleString()} record(s)`;
    document.getElementById('walletPrevBtn').disabled = page <= 1;
    document.getElementById('walletNextBtn').disabled = page >= totalPages;
    syncAutofitMode();
    settleAndReveal(rows);
  }

  async function syncMemberProviderBalance(row,opts){
    if(!row || num(row.providerWalletBalance) <= 0) return false;
    const quiet=!!(opts&&opts.quiet);
    try{
      const json = await api(url('PROVIDER_WALLET_BALANCE')+'?memberId='+encodeURIComponent(row.memberId));
      const data = json.data || {};
      const providerTotal = num(data.providerWalletBalance);
      row.providerWalletBalance = providerTotal;
      row.totalBalance = num(row.mainWalletBalance) + providerTotal;
      const providerCell=document.querySelector('[data-provider-total-cell="'+CSS.escape(String(row.memberId))+'"]');
      const totalCell=document.querySelector('[data-total-balance-cell="'+CSS.escape(String(row.memberId))+'"]');
      if(providerCell){
        const next=money(providerTotal);
        if(providerCell.textContent!==next) providerCell.textContent=next;
      }
      if(totalCell){
        const next=money(row.totalBalance);
        if(totalCell.textContent!==next) totalCell.textContent=next;
      }
      if(!quiet) updateMetrics(currentRows);
      return true;
    }catch(e){
      console.warn('Provider balance live sync failed for member', row.memberId, e);
      return false;
    }
  }

  async function refreshVisibleProviderBalances(rows){
    // Only members with a locally tracked provider balance need an external refresh.
    // Keep sequential to avoid bursting provider APIs; update KPI totals once at the end
    // so the summary cards do not flicker per row.
    const targets=(rows||[]).filter(row=>num(row.providerWalletBalance)>0);
    if(!targets.length) return;
    let changed=false;
    for(const row of targets){
      if(await syncMemberProviderBalance(row,{quiet:true})) changed=true;
    }
    if(changed) updateMetrics(currentRows);
  }

  async function load(){
    const body=document.getElementById('memberWalletBody');
    const embedded=document.documentElement.classList.contains('dashboard-embedded-page');
    const hasRows=!!(body&&body.querySelector('tr[data-member-wallet-row]'));
    /* Embedded: stay blank while hidden. Standalone: keep rows on refetch, else show Loading. */
    if(body && !hasRows && !embedded) body.innerHTML='<tr><td colspan="16">Loading wallet list...</td></tr>';
    const card=document.querySelector('.table-card');
    if(card && !embedded){card.classList.add('is-tx-busy');card.setAttribute('aria-busy','true');}
    try{
      /* When a column sort is active, fetch the full filtered set once, sort A↔Z locally,
         then paginate — so order is correct across pages even if the API ignores sort. */
      if(sortKey){
        pageSize = resolvePageSize(document.getElementById('walletSize')?.value);
        const json = await api(url('MEMBER_WALLET_LIST') + '?' + query({all:true}));
        const data = json.data || {};
        const all = sortRows(Array.isArray(data.content) ? data.content : []);
        const total = all.length;
        totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
        page = Math.max(1, Math.min(page, totalPages));
        const start = (page - 1) * pageSize;
        const slice = all.slice(start, start + pageSize);
        render(slice, {totalElements: total, totalPages, number: page - 1, size: pageSize});
        return;
      }
      const json = await api(url('MEMBER_WALLET_LIST') + '?' + query());
      const data = json.data || {};
      render(sortRows(Array.isArray(data.content) ? data.content : []), data.pagination || {});
    }catch(e){
      updateMetrics([]);
      if(body) body.innerHTML='<tr><td colspan="16" class="text-danger">'+esc(e.message || 'Load failed')+'</td></tr>';
      notifyDashboardReady();
    }finally{
      if(card){card.classList.remove('is-tx-busy');card.setAttribute('aria-busy','false');}
    }
  }

  async function showProviderWalletDetail(memberId, username){
    const modal=document.getElementById('providerWalletDetailModal'), body=document.getElementById('providerWalletDetailBody');
    if(!modal||!body)return;
    document.getElementById('providerWalletDetailTitle').textContent=`Provider Wallet Detail — ${username||('Member #'+memberId)}`;
    modal.hidden=false;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
    body.innerHTML='<tr><td colspan="6">Loading provider accounts...</td></tr>';
    try{
      const json=await api(url('PROVIDER_WALLET_BALANCE')+'?memberId='+encodeURIComponent(memberId));
      const data=json.data||{};
      const rows = Array.isArray(data.providers)
        ? data.providers
        : (Array.isArray(data.accounts)
            ? data.accounts
            : (Array.isArray(data.content) ? data.content : []));

      const listedRow=currentRows.find(r=>String(r.memberId)===String(memberId));
      if(listedRow){
        listedRow.providerWalletBalance=num(data.providerWalletBalance);
        listedRow.totalBalance=num(listedRow.mainWalletBalance)+listedRow.providerWalletBalance;
        const providerCell=document.querySelector('[data-provider-total-cell="'+CSS.escape(String(memberId))+'"]');
        const totalCell=document.querySelector('[data-total-balance-cell="'+CSS.escape(String(memberId))+'"]');
        if(providerCell) providerCell.textContent=money(listedRow.providerWalletBalance);
        if(totalCell) totalCell.textContent=money(listedRow.totalBalance);
        updateMetrics(currentRows);
      }
      const sorted=rows.slice().sort((a,b)=>num(b.balance??b.providerBalance??b.walletBalance)-num(a.balance??a.providerBalance??a.walletBalance));
      const totalLeft=sorted.reduce((sum,r)=>sum+num(r.balance??r.providerBalance??r.walletBalance),0);
      body.innerHTML=sorted.length?(sorted.map(r=>{
        const balance=num(r.balance??r.providerBalance??r.walletBalance);
        return `<tr><td><b>${esc(r.providerName||r.providerCode||'-')}</b><br><small>${esc(r.providerCode||'')}</small></td><td>${esc(r.providerUsername||r.accountId||r.playerId||'-')}</td><td><b>${money(balance)}</b>${balance>0?' <span class="status-pill active">Balance inside</span>':''}</td><td>${esc(r.status||r.sessionStatus||'-')}</td><td class="provider-wallet-updated">${esc(dt(r.updatedAt||r.lastSyncAt||r.lastUpdatedAt||'-'))}</td><td>${esc(r.sessionId||r.activeSessionId||'-')}</td></tr>`;
      }).join('')+`<tr class="provider-wallet-detail-total"><td colspan="2"><b>Provider Wallet Total</b></td><td><b>${money(totalLeft)}</b></td><td colspan="3"></td></tr>`):'<tr><td colspan="6">No provider wallet account found for this member.</td></tr>';
    }catch(e){ body.innerHTML='<tr><td colspan="6" class="text-danger">'+esc(e.message||'Unable to load provider wallet details')+'</td></tr>'; }
  }
  function closeProviderWalletDetail(){
    const m=document.getElementById('providerWalletDetailModal');
    if(m){ m.classList.remove('show'); m.setAttribute('aria-hidden','true'); m.hidden=true; }
    document.body.classList.remove('modal-open');
  }

  document.addEventListener('DOMContentLoaded', function(){
    bindSortHeaders();
    syncSortHeaders();
    document.getElementById('walletSearchBtn')?.addEventListener('click', ()=>{ page=1; load(); });
    document.getElementById('walletKeyword')?.addEventListener('keydown', e=>{ if(e.key==='Enter'){ page=1; load(); } });
    // Footer "Show N entries" mirrors #walletSize (Deposit / Wallet Ledger contract)
    syncAutofitMode();
    pageSize = resolvePageSize(document.getElementById('walletSize')?.value);
    document.getElementById('walletSize')?.addEventListener('change', ()=>{
      clearLockedAutoSize();
      syncAutofitMode();
      pageSize = resolvePageSize(document.getElementById('walletSize')?.value);
      page = 1;
      load();
    });
    document.getElementById('walletResetBtn')?.addEventListener('click', ()=>{
      document.getElementById('walletKeyword').value='';
      const sizeEl=document.getElementById('walletSize');
      if(sizeEl) sizeEl.value='-';
      sortKey=null; sortDir='asc';
      syncSortHeaders();
      clearLockedAutoSize();
      syncAutofitMode();
      page=1;
      load();
    });
    document.getElementById('walletPrevBtn')?.addEventListener('click', ()=>{ if(page>1){ page--; load(); } });
    document.getElementById('walletNextBtn')?.addEventListener('click', ()=>{ if(page<totalPages){ page++; load(); } });
    document.getElementById('memberWalletBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-provider-wallet-detail]');if(b)showProviderWalletDetail(b.dataset.providerWalletDetail,b.dataset.providerWalletUser);});
    document.getElementById('providerWalletDetailClose')?.addEventListener('click',closeProviderWalletDetail);
    document.getElementById('providerWalletDetailClose2')?.addEventListener('click',closeProviderWalletDetail);
    document.getElementById('providerWalletDetailModal')?.addEventListener('click',e=>{if(e.target.id==='providerWalletDetailModal')closeProviderWalletDetail();});
    document.getElementById('walletPager')?.addEventListener('click', e=>{ const b=e.target.closest('[data-page]'); if(!b)return; const n=Number(b.dataset.page); if(n>=1&&n<=totalPages&&n!==page){page=n;load();} });
    // Keep fixed thead horizontally aligned with body scroll
    const tableBody=tableBodyScroll();
    const tableHead=tableBody?.closest('.table-wrap')?.querySelector('.bo-tx-table-head');
    if(tableBody&&tableHead){
      tableBody.addEventListener('scroll',()=>{tableHead.scrollLeft=tableBody.scrollLeft;},{passive:true});
    }
    bindEvenFillObserver();
    let resizeTimer=0;
    window.addEventListener('resize',()=>{
      if(!isAutoPageSize(document.getElementById('walletSize')?.value)) return;
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(()=>{
        const prev=lockedAutoSize;
        clearLockedAutoSize();
        const next=autoFitPageSize();
        syncAutofitMode();
        if(next!==prev){page=1;load();}
        else evenFillRowHeights();
      },180);
    });
    /* Wait for layout so auto-fit measures the real body height, not a collapsed shell. */
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      clearLockedAutoSize();
      syncAutofitMode();
      load();
    }));
  });
})();
