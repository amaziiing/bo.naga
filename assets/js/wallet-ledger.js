(function(){
  let page = 1;
  let totalPages = 1;
  let pageSize = 20;
  let lockedAutoSize = null;
  let loadGeneration = 0;
  const initialParams = new URLSearchParams(location.search);
  const allTimeScope = initialParams.get('scope') === 'all';
  const LEDGER_TYPES = ['DEPOSIT','WITHDRAW','ADJUSTMENT','BONUS','ADMIN_DEPOSIT','ADMIN_WITHDRAW','ADMIN_ADJUSTMENT','BULK_ADJUSTMENT','REFERRAL_REWARD','REBATE','REBATE_ADJUSTMENT','BET','WIN','LOSE','SETTLE','ROLLBACK'];
  const WALLET_TO_WALLET_TYPES = new Set(['TRANSFER_IN','TRANSFER_OUT']);
  const selectedTypes = new Set();

  /* Same Show N entries contract as Deposit / Withdraw: - · 10 · 20 · 50 · 100 · All
     `-` = auto-fit rows into viewport — no vertical scrollbar · even-fill seam when gap < one row.
     Fixed sizes / All may scroll (MD: VIP EXP specimen). */
  function tableBodyScroll(){
    return document.querySelector('.table-card .bo-tx-table-body')
      || document.querySelector('#ledgerTableScroll')
      || document.querySelector('.bo-tx-table-body')
      || document.querySelector('.table-card .table-wrap')
      || document.querySelector('.table-wrap');
  }
  function tableHeadScroll(){
    return document.querySelector('.table-card .bo-tx-table-head')
      || document.querySelector('.bo-tx-table-head');
  }
  /* The 15-column ledger cannot fit the card: the H axis is live (Member Wallet recipe).
     The body scrolls, the head mirrors it, and both can be dragged sideways. There is no
     scrollLeft clamp any more — clamping here is why the head could never follow. */
  function syncLedgerHScroll(){
    const body=tableBodyScroll();
    const head=tableHeadScroll();
    if(!body||!head) return;
    if(head.scrollLeft!==body.scrollLeft) head.scrollLeft=body.scrollLeft;
  }
  /* Drag-to-scroll — same helper as member-wallet.js. A mouse can pan the wide table
     without reaching for the 6px bar. */
  function bindLedgerDragScroll(scrollEl, grabEls){
    if(!scrollEl || scrollEl._boLedgerHDrag) return;
    scrollEl._boLedgerHDrag = true;
    let down=false, moved=false, startX=0, startLeft=0;
    const interactive='a,button,input,select,textarea,label,.bo-tx-action-btn';
    const onDown=(e)=>{
      if(e.button!=null && e.button!==0) return;
      if(e.target.closest(interactive)) return;
      down=true; moved=false; startX=e.clientX; startLeft=scrollEl.scrollLeft;
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
  function scrollBodyAvail(scroll){
    /* Head lives outside the scroller — full clientHeight is row room. */
    if(!scroll) return 0;
    return Math.max(0,Math.floor(scroll.clientHeight));
  }
  function measureAutoPageSize(){
    const scroll=tableBodyScroll();
    if(!scroll) return 12;
    const avail=scrollBodyAvail(scroll);
    const sample=scroll.querySelector('tbody tr:not(.bo-table-fill) td');
    const rowH=sample?Math.max(38,Math.round(sample.getBoundingClientRect().height)):41;
    /* Floor only — never add a row that overflow:hidden would clip. */
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
    const v=String(raw??document.getElementById('ledgerSize')?.value??'-').trim();
    if(isAutoPageSize(v)) return autoFitPageSize();
    if(/^all$/i.test(v)) return 10000;
    const n=Number(v);
    return Number.isFinite(n)&&n>0?n:autoFitPageSize();
  }
  function syncAutofitMode(){
    const auto=isAutoPageSize(document.getElementById('ledgerSize')?.value);
    const card=document.querySelector('.table-card');
    const scroll=tableBodyScroll();
    if(card) card.toggleAttribute('data-bo-autofit', auto);
    if(scroll) scroll.toggleAttribute('data-bo-autofit', auto);
    if(!auto) resetEvenFill();
  }
  function isPlaceholderRow(tr){
    const cells=tr?.querySelectorAll?.('td');
    if(cells&&cells.length<=1) return true;
    const text=(tr?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    return !text||text.startsWith('loading')||text.startsWith('no ledger')||text.includes('load failed');
  }
  function resetEvenFill(){
    const body=document.getElementById('walletLedgerBody');
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
  let autofitReloading=false;
  function shrinkAutofitIfOverflow(){
    if(autofitReloading) return;
    if(!isAutoPageSize(document.getElementById('ledgerSize')?.value)) return;
    const scroll=tableBodyScroll();
    if(!scroll) return;
    if(scroll.scrollHeight<=scroll.clientHeight+1) return;
    if(lockedAutoSize==null||lockedAutoSize<=5) return;
    lockedAutoSize=Math.max(5,lockedAutoSize-1);
    pageSize=lockedAutoSize;
    autofitReloading=true;
    page=1;
    Promise.resolve(load()).finally(()=>{ autofitReloading=false; });
  }
  function evenFillRowHeights(){
    const body=document.getElementById('walletLedgerBody');
    const scroll=tableBodyScroll();
    const table=body?.closest('table');
    if(!body||!scroll||!table) return;
    resetEvenFill();
    if(!isAutoPageSize(document.getElementById('ledgerSize')?.value)) return;
    const rows=[...body.querySelectorAll('tr')].filter(tr=>!isPlaceholderRow(tr));
    if(!rows.length) return;
    void table.offsetHeight;
    const avail=scrollBodyAvail(scroll);
    const natural=rows.reduce((sum,tr)=>sum+Math.ceil(tr.getBoundingClientRect().height),0);
    const rowH=Math.max(38,Math.round(natural/rows.length)||44);
    const gap=avail-natural;
    /* Overflow: too many rows — drop one and reload (Show `-` must not scroll). */
    if(natural>avail+1){
      shrinkAutofitIfOverflow();
      return;
    }
    /* Stretch only when leftover is a seam (not enough for one more full row). */
    if(gap<2||gap>=rowH) return;
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
    table.style.height=Math.floor(scroll.clientHeight)+'px';
    if(scroll.scrollHeight>scroll.clientHeight){
      const over=scroll.scrollHeight-scroll.clientHeight;
      const shrink=Math.ceil(over/rows.length)||1;
      rows.forEach(tr=>{
        const h=Math.max(rowH,(parseFloat(tr.style.height)||base)-shrink);
        tr.style.height=h+'px';
        tr.querySelectorAll('td').forEach(td=>{td.style.height=h+'px';});
      });
      table.style.height=Math.max(0,Math.floor(scroll.clientHeight)-over)+'px';
    }
  }
  function scheduleEvenFill(){
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      evenFillRowHeights();
      shrinkAutofitIfOverflow();
      growAutofitIfRoom();
    }));
  }
  function growAutofitIfRoom(){
    if(autofitReloading) return;
    if(!isAutoPageSize(document.getElementById('ledgerSize')?.value)) return;
    const body=document.getElementById('walletLedgerBody');
    const scroll=tableBodyScroll();
    if(!body||!scroll) return;
    const rows=[...body.querySelectorAll('tr')].filter(tr=>!isPlaceholderRow(tr));
    if(!rows.length) return;
    const avail=scrollBodyAvail(scroll);
    const natural=rows.reduce((sum,tr)=>sum+Math.ceil(tr.getBoundingClientRect().height),0);
    const rowH=Math.max(38,Math.round(natural/rows.length)||44);
    const gap=avail-natural;
    /* Room for at least one more full row → remeasure and reload (MD: stretch only when gap < one row). */
    if(gap<rowH) return;
    const next=Math.max(5,Math.min(200,Math.floor(avail/rowH)||rows.length));
    if(next<=rows.length) return;
    lockedAutoSize=next;
    pageSize=next;
    autofitReloading=true;
    page=1;
    Promise.resolve(load()).finally(()=>{ autofitReloading=false; });
  }
  function bindEvenFillObserver(){
    const scroll=tableBodyScroll();
    if(!scroll||scroll._boEvenFillObs) return;
    scroll._boEvenFillObs=new ResizeObserver(()=>{
      clearTimeout(scroll._boEvenFillTimer);
      scroll._boEvenFillTimer=setTimeout(evenFillRowHeights,32);
    });
    scroll._boEvenFillObs.observe(scroll);
    return scroll._boEvenFillObs;
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
  function dt(v){ return window.BO_FORMAT && window.BO_FORMAT.dateTime ? window.BO_FORMAT.dateTime(v) : (v ? String(v).replace('T',' ').slice(0,19) : '-'); }
  function dtParts(v){
    const full=dt(v);
    if(!full||full==='-') return {full:'-',day:'-',time:''};
    const m=String(full).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(.+)$/);
    if(m){
      const raw=String(m[4]).trim();
      const tm=raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      const time=tm
        ? `${String(tm[1]).padStart(2,'0')}:${tm[2]}:${tm[3]||'00'}`
        : raw.slice(0,8);
      // DD/MM/YYYY — same as Admin Last Login tip text
      const day=`${String(m[3]).padStart(2,'0')}/${String(m[2]).padStart(2,'0')}/${m[1]}`;
      return {full,day,time};
    }
    return {full,day:full,time:''};
  }
  function dtCell(v){
    const p=dtParts(v);
    if(p.full==='-') return '<span class="mad-muted">-</span>';
    // Cell = date (DD/MM/YYYY) · cream pill tip (no arrow) = HH:MM:SS
    if(!p.time) return `<span class="bo-tx-datetime">${esc(p.day)}</span>`;
    return `<span class="bo-tx-datetime" tabindex="0" data-tip="${esc(p.time)}">${esc(p.day)}</span>`;
  }
  function ensureTimeTip(){
    let tip=document.getElementById('wlTimeTip');
    if(tip) return tip;
    tip=document.createElement('div');
    tip.id='wlTimeTip';
    tip.className='wl-time-tip';
    tip.setAttribute('role','tooltip');
    tip.setAttribute('aria-hidden','true');
    document.body.appendChild(tip);
    return tip;
  }
  function placeTimeTip(el){
    const tip=ensureTimeTip();
    const text=el.getAttribute('data-tip')||'';
    if(!text){ hideTimeTip(); return; }
    tip.textContent=text;
    tip.classList.add('is-on');
    tip.classList.remove('is-below');
    const r=el.getBoundingClientRect();
    const tr=tip.getBoundingClientRect();
    let top=r.top-tr.height-8;
    let below=false;
    if(top<8){
      below=true;
      top=r.bottom+8;
    }
    tip.classList.toggle('is-below', below);
    // Center over the date cell
    const left=Math.max(8,Math.min(r.left+r.width/2-tr.width/2, window.innerWidth-tr.width-8));
    tip.style.left=Math.round(left)+'px';
    tip.style.top=Math.round(top)+'px';
  }
  function hideTimeTip(){
    const tip=document.getElementById('wlTimeTip');
    if(tip) tip.classList.remove('is-on','is-below');
  }
  function bindTimeTips(on){
    const body=document.getElementById('walletLedgerBody');
    if(!body||body.dataset.tipBound==='1') return;
    body.dataset.tipBound='1';
    body.addEventListener('mouseover',e=>{
      const el=e.target.closest?.('.bo-tx-datetime[data-tip]');
      if(el) placeTimeTip(el);
    });
    body.addEventListener('mouseout',e=>{
      const el=e.target.closest?.('.bo-tx-datetime[data-tip]');
      if(!el) return;
      const next=e.relatedTarget;
      if(next&&el.contains(next)) return;
      hideTimeTip();
    });
    body.addEventListener('focusin',e=>{
      const el=e.target.closest?.('.bo-tx-datetime[data-tip]');
      if(el) placeTimeTip(el);
    });
    body.addEventListener('focusout',e=>{
      const el=e.target.closest?.('.bo-tx-datetime[data-tip]');
      if(!el) return;
      const next=e.relatedTarget;
      if(next&&el.contains(next)) return;
      hideTimeTip();
    });
    on(window,'scroll',hideTimeTip,true);
    on(window,'resize',hideTimeTip);
  }
  async function api(endpoint){
    const res = await fetch(endpoint, {headers:{...BO_AUTH.authHeader()}});
    const json = await res.json().catch(()=>({}));
    if(!res.ok || json.status === 'error') throw new Error(json.message || 'Request failed');
    return json;
  }
  function selectedTypeList(){ return [...selectedTypes].filter(type => !WALLET_TO_WALLET_TYPES.has(type)); }
  function effectiveTypeList(){
    const selected = selectedTypeList();
    // Wallet Ledger intentionally excludes wallet-to-wallet transfers. When no
    // individual type is selected, explicitly request every supported non-transfer
    // type so the backend can keep pagination and totals accurate.
    return selected.length ? selected : [...LEDGER_TYPES];
  }
  function typeDisplayLabel(type){
    return String(type||'')
      .split('_')
      .filter(Boolean)
      .map(part=>part.charAt(0)+part.slice(1).toLowerCase())
      .join(' ');
  }
  function syncTypeControl(){
    const list=selectedTypeList();
    const hidden=document.getElementById('ledgerType');
    const label=document.getElementById('ledgerTypeLabel');
    const all=document.getElementById('ledgerTypeAll');
    if(hidden) hidden.value=list.join(',');
    if(all) all.checked=list.length===0;
    document.querySelectorAll('[data-ledger-type]').forEach(cb=>{cb.checked=selectedTypes.has(cb.dataset.ledgerType);});
    if(label) label.textContent=list.length===0?'All types':(list.length===1?typeDisplayLabel(list[0]):`${list.length} selected`);
  }
  function statusPillClass(status){
    const s=String(status||'').toUpperCase();
    if(s==='SUCCESS'||s==='APPROVED'||s==='COMPLETED'||s==='DONE') return 'active';
    if(s==='FAILED'||s==='REJECTED'||s==='CANCELLED'||s==='CANCELED'||s==='ERROR') return 'off';
    return '';
  }
  function amtClass(v){
    const n=num(v);
    if(n<0) return 'is-neg';
    if(n===0) return 'is-zero';
    return 'is-pos';
  }
  function setSelectedTypes(values){
    selectedTypes.clear();
    (values||[]).map(v=>String(v||'').trim().toUpperCase()).filter(v=>LEDGER_TYPES.includes(v)).forEach(v=>selectedTypes.add(v));
    syncTypeControl();
  }
  function initTypeMulti(on){
    const options=document.getElementById('ledgerTypeOptions');
    const wrap=document.getElementById('ledgerTypeMulti');
    const trigger=document.getElementById('ledgerTypeTrigger');
    const menu=document.getElementById('ledgerTypeMenu');
    if(!options||!wrap||!trigger||!menu)return;
    options.innerHTML=LEDGER_TYPES.map(t=>`<label class="ledger-type-option"><input type="checkbox" data-ledger-type="${t}"><span>${typeDisplayLabel(t)}</span></label>`).join('');
    trigger.addEventListener('click',()=>{const open=menu.hidden;menu.hidden=!open;wrap.classList.toggle('open',open);trigger.setAttribute('aria-expanded',String(open));});
    options.addEventListener('change',e=>{const cb=e.target.closest('[data-ledger-type]');if(!cb)return;cb.checked?selectedTypes.add(cb.dataset.ledgerType):selectedTypes.delete(cb.dataset.ledgerType);syncTypeControl();});
    document.getElementById('ledgerTypeAll')?.addEventListener('change',e=>{if(e.target.checked)setSelectedTypes([]);});
    on(document,'click',e=>{if(!wrap.contains(e.target)){menu.hidden=true;wrap.classList.remove('open');trigger.setAttribute('aria-expanded','false');}});
    on(document,'keydown',e=>{if(e.key==='Escape'){menu.hidden=true;wrap.classList.remove('open');trigger.setAttribute('aria-expanded','false');}});
    syncTypeControl();
  }
  function ensureDefaultDates(){
    const sp=new URLSearchParams(location.search);
    if(sp.get('scope')==='all') return; // explicit all-time drill-down remains supported
    const from=document.getElementById('ledgerFrom'),to=document.getElementById('ledgerTo');
    const now=new Date(),pad=n=>String(n).padStart(2,'0');
    const today=window.BO_FORMAT?.today?BO_FORMAT.today():`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    if(from&&!from.value) from.value=today;
    if(to&&!to.value) to.value=today;
  }
  let urlMemberId='';
  function keywordInput(){ return document.getElementById('ledgerKeyword'); }
  function keywordValue(){ return keywordInput()?.value.trim() || ''; }
  /* One search bar, the house route (provider-wallet-transaction.js / provider-bet-report.js):
     digits = memberId, anything else = providerCode. The code is uppercased before it leaves,
     as the sibling pages do — typing `live22` used to travel verbatim and match nothing when
     the backend stores provider codes uppercase. */
  function applyKeyword(p, raw){
    const kw=String(raw||'').trim();
    if(!kw) return;
    if(/^\d+$/.test(kw)){ p.set('memberId', kw); return; }
    p.set('providerCode', kw.toUpperCase());
  }
  /* The MEMBER column shows the member's `username` while the ledger endpoint filters on the
     internal `memberId` — so a support user who types the value they can actually see ("用户
     没有搜索到他想要的数据", 2026-10-02) searched for a number the ledger never matches. The
     value is resolved through the Member Wallet listing, whose keyword search IS the sibling
     page's user-facing "Username / name / mobile / referrer" field; a match turns into the
     internal id before the ledger request leaves. Cache per typed value; on any failure the
     house classifier above applies unchanged. */
  const resolvedMemberIds=new Map();
  async function resolveLedgerMemberId(value){
    const key=String(value||'').trim().toLowerCase();
    if(!key) return null;
    if(resolvedMemberIds.has(key)) return resolvedMemberIds.get(key);
    let found=null;
    try{
      const p=new URLSearchParams({keyword:String(value).trim(), page:'1', size:'10'});
      const res=await fetch(url('MEMBER_WALLET_LIST')+'?'+p.toString(), {headers:{...BO_AUTH.authHeader()}});
      const json=await res.json().catch(()=>({}));
      if(res.ok && json.status!=='error'){
        const data=json.data||{};
        const rows=Array.isArray(data)?data:(Array.isArray(data.content)?data.content:[]);
        const exact=rows.find(r=>{
          if(!r) return false;
          return [r.username,r.mobile,r.memberUsername].some(v=>String(v==null?'':v).trim().toLowerCase()===key)
            || String(r.memberId==null?'':r.memberId).trim()===String(value).trim();
        });
        if(exact && exact.memberId!=null && String(exact.memberId).trim()) found=String(exact.memberId).trim();
      }
    }catch(e){ found=null; }
    resolvedMemberIds.set(key, found);
    return found;
  }
  function setFromUrl(){
    const sp = new URLSearchParams(location.search);
    const mid = sp.get('memberId') || '';
    if(mid){
      /* A `?memberId=` link (Member Wallet / User Management / Dashboard) pins the value as a
         memberId even when it is not all digits — only a typed value is classified. */
      urlMemberId = mid;
      if(keywordInput()) keywordInput().value = mid;
    } else if(sp.get('keyword')){
      if(keywordInput()) keywordInput().value = sp.get('keyword');
    }
    const rawTypes = sp.get('types') || sp.get('type') || '';
    if(rawTypes) setSelectedTypes(rawTypes.split(','));
    if(sp.get('scope') === 'all'){
      document.body.dataset.walletLedgerAllTime = '1';
      const from = document.getElementById('ledgerFrom');
      const to = document.getElementById('ledgerTo');
      if(from) from.value = '';
      if(to) to.value = '';
    }
  }
  function params(resolvedMemberId){
    const p = new URLSearchParams();
    const keyword = keywordValue();
    const types = selectedTypeList();
    const from = document.getElementById('ledgerFrom')?.value;
    const to = document.getElementById('ledgerTo')?.value;
    pageSize = resolvePageSize(document.getElementById('ledgerSize')?.value);
    if(keyword && keyword === urlMemberId) p.set('memberId', urlMemberId);
    else if(keyword && resolvedMemberId) p.set('memberId', resolvedMemberId);
    else applyKeyword(p, keyword);
    p.set('types', effectiveTypeList().join(','));
    if(from) p.set('from', from);
    if(to) p.set('to', to);
    p.set('page', page);
    p.set('size', String(pageSize));
    return p.toString();
  }
  function metric(id, v){ const el=document.getElementById(id); if(el) el.textContent = money(v); }
  function updateMetrics(rows){
    const byType = rows.reduce((m,r)=>{ m[r.ledgerType] = (m[r.ledgerType] || 0) + num(r.amount); return m; },{});
    metric('wlDeposit', (byType.DEPOSIT || 0) + (byType.ADMIN_DEPOSIT || 0));
    metric('wlWithdraw', Math.abs((byType.WITHDRAW || 0) + (byType.ADMIN_WITHDRAW || 0)));
    metric('wlTransfer', (byType.TRANSFER_IN || 0) + (byType.TRANSFER_OUT || 0));
    metric('wlBetWinLose', (byType.BET || 0) + (byType.WIN || 0) + (byType.LOSE || 0) + (byType.SETTLE || 0));
  }
  function render(rows, pagination, meta){
    const body=document.getElementById('walletLedgerBody'); if(!body) return;
    updateMetrics(rows);
    if(!rows.length){ body.innerHTML='<tr><td colspan="15">No ledger records found.</td></tr>'; }
    else body.innerHTML = rows.map(r => {
      const amt = num(r.amount);
      const status = r.status || '-';
      const statusCls = statusPillClass(status);
      return `<tr>
        <td>${dtCell(r.createdAt || r.created_at)}</td>
        <td>${dtCell(r.postedAt || r.posted_at || r.completedAt || r.approvedAt)}</td>
        <td>${esc(r.username || '-')}</td>
        <td>${esc(r.providerCode || '-')}</td>
        <td><span class="status-pill ledger-type-chip">${esc(r.ledgerType || '-')}</span></td>
        <td class="ledger-amt ${amtClass(amt)}">${money(amt)}</td>
        <td class="ledger-amt">${money(r.beforeBalance)}</td>
        <td class="ledger-amt">${money(r.afterBalance)}</td>
        <td>${esc(r.gameCode || '-')}</td>
        <td>${esc(r.createdBy || r.adjustedBy || '-')}</td>
        <td>${esc(r.approvedBy || r.reviewedBy || '-')}</td>
        <td>${esc(r.reasonCode || r.reason || '-')}</td>
        <td title="${esc(r.relatedId || r.referenceNo || r.depositId || r.withdrawalId || r.bonusId || r.rebateId || '-')}">${esc(r.relatedId || r.referenceNo || r.depositId || r.withdrawalId || r.bonusId || r.rebateId || '-')}</td>
        <td title="${esc(r.remark || '-')}">${esc(r.remark || '-')}</td>
        <td><span class="status-pill ${statusCls}">${esc(status)}</span></td>
      </tr>`;
    }).join('');
    totalPages = Number(pagination && pagination.totalPages) || 1;
    publishPagerMeta(pagination, pageSize);
    document.getElementById('ledgerPager').innerHTML = pageButtons(page, totalPages);
    document.getElementById('ledgerPrevBtn').disabled = page <= 1;
    document.getElementById('ledgerNextBtn').disabled = page >= totalPages;
    scheduleEvenFill();
    syncLedgerHScroll();
  }
  async function load(){
    const body=document.getElementById('walletLedgerBody');
    const generation=++loadGeneration;
    const hasRenderedRows=!!body?.querySelector('tr:not(.bo-table-fill) td:not([colspan])');
    /* Keep already-rendered rows in place while a refresh/autofit request is in flight.
       This prevents the table flashing to a Loading row and back (the visible "jump"). */
    if(body && !hasRenderedRows) body.innerHTML='<tr><td colspan="15">Loading ledger...</td></tr>';
    try{
      /* Resolve the typed value to the internal member id before the ledger request; a
         provider code / raw id falls through unchanged when no member matches. */
      const typedKeyword=keywordValue();
      const resolved=(typedKeyword && typedKeyword!==urlMemberId) ? await resolveLedgerMemberId(typedKeyword) : null;
      if(generation!==loadGeneration) return;
      const requestParams=params(resolved);
      const json = await api(url('WALLET_LEDGER_LIST') + '?' + requestParams);
      /* A newer filter/page/autofit request owns the table. Never let an older,
         slower response overwrite newer data. */
      if(generation!==loadGeneration) return;
      const data = json.data || {};
      render(Array.isArray(data.content) ? data.content : [], data.pagination || {}, data);
    }catch(e){
      if(generation!==loadGeneration) return;
      updateMetrics([]);
      if(body) body.innerHTML='<tr><td colspan="15" class="text-danger">'+esc(e.message || 'Load failed')+'</td></tr>';
    }
  }
  document.addEventListener('DOMContentLoaded', function(){
    /* A swap re-runs this block against a fresh frame, so every window/document binding added
       below was added again on each entry: N entries meant N type-menu handles and N resize
       handlers, and the autofit one issues a ledger request - one resize could fire several
       loads. Release the previous run's bindings first; the handlers then always close over
       the state of the frame that is on screen. */
    if(window.__boWalletLedgerUnbind) window.__boWalletLedgerUnbind();
    const unbinds=[];
    const on=(target,type,fn,opt)=>{ target.addEventListener(type,fn,opt); unbinds.push(()=>target.removeEventListener(type,fn,opt)); };
    window.__boWalletLedgerUnbind=()=>{ unbinds.forEach(fn=>fn()); unbinds.length=0; };
    initTypeMulti(on);
    bindTimeTips(on);
    ensureDefaultDates();
    setFromUrl();
    syncLedgerHScroll();
    const bodyScroll=tableBodyScroll();
    const headScroll=tableHeadScroll();
    if(bodyScroll){
      bodyScroll.addEventListener('scroll', ()=>{
        if(headScroll) headScroll.scrollLeft=bodyScroll.scrollLeft;
      }, {passive:true});
      if(headScroll) bindLedgerDragScroll(bodyScroll,[bodyScroll,headScroll]);
      if(typeof ResizeObserver!=='undefined'){
        const hscrollObs=new ResizeObserver(()=>syncLedgerHScroll());
        hscrollObs.observe(bodyScroll);
        unbinds.push(()=>hscrollObs.disconnect());
      }
    }
    on(window,'resize',syncLedgerHScroll);
    const runSearch=()=>{ page=1; clearLockedAutoSize(); syncAutofitMode(); load(); };
    document.getElementById('ledgerSearchBtn')?.addEventListener('click', runSearch);
    document.getElementById('ledgerKeyword')?.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); runSearch(); } });
    ['ledgerFrom','ledgerTo'].forEach(id=>document.getElementById(id)?.addEventListener('change', runSearch));
    // Footer "Show N entries" mirrors #ledgerSize (Deposit/Withdraw / MD contract)
    syncAutofitMode();
    pageSize = resolvePageSize(document.getElementById('ledgerSize')?.value);
    document.getElementById('ledgerSize')?.addEventListener('change', ()=>{
      clearLockedAutoSize();
      syncAutofitMode();
      pageSize = resolvePageSize(document.getElementById('ledgerSize')?.value);
      page = 1;
      load();
    });
    document.getElementById('ledgerResetBtn')?.addEventListener('click', ()=>{
      if(keywordInput()) keywordInput().value='';
      urlMemberId='';
      setSelectedTypes([]);
      const sizeEl=document.getElementById('ledgerSize');
      if(sizeEl) sizeEl.value='-';
      clearLockedAutoSize();
      syncAutofitMode();
      const now=new Date(), pad=n=>String(n).padStart(2,'0');
      const today=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
      document.getElementById('ledgerFrom').value=today;
      document.getElementById('ledgerTo').value=today;
      /* Reset used to dispatch two change events and then call load() again,
         creating three competing ledger requests. Apply the reset once. */
      pageSize=resolvePageSize(sizeEl?.value);
      page=1;
      load();
    });
    document.getElementById('ledgerPrevBtn')?.addEventListener('click', ()=>{ if(page>1){ page--; load(); } });
    document.getElementById('ledgerNextBtn')?.addEventListener('click', ()=>{ if(page<totalPages){ page++; load(); } });
    document.getElementById('ledgerPager')?.addEventListener('click', e=>{ const b=e.target.closest('[data-page]'); if(!b)return; const n=Number(b.dataset.page); if(n>=1&&n<=totalPages&&n!==page){page=n;load();} });
    const evenFillObs=bindEvenFillObserver();
    if(evenFillObs) unbinds.push(()=>evenFillObs.disconnect());
    let resizeTimer=0;
    on(window,'resize',()=>{
      if(!isAutoPageSize(document.getElementById('ledgerSize')?.value)) return;
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(()=>{
        const prev=lockedAutoSize;
        clearLockedAutoSize();
        const next=autoFitPageSize();
        syncAutofitMode();
        if(next!==prev){ page=1; load(); }
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
