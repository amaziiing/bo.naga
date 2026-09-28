(function(){
  'use strict';

  const requestedTab=new URLSearchParams(location.search).get('tab');
  const state={type:['deposit','withdraw','all'].includes(requestedTab)?requestedTab:'deposit',page:1,totalPages:1,rows:[]};
  let reloadGeneration=0;
  let countGeneration=0;
  const $=id=>document.getElementById(id);
  const domPrefix=document.getElementById('depositBody')?'deposit':'withdraw';
  const id=name=>domPrefix+name;
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const date=v=>window.BO_FORMAT?.dateTime?window.BO_FORMAT.dateTime(v):(v?String(v).replace('T',' ').slice(0,19):'-');
  const endpoint=k=>API_CONFIG.BASE_URL+API_CONFIG.ENDPOINTS[k];
  async function api(url){
    const res=await fetch(url,{headers:{...BO_AUTH.authHeader()}});
    const json=await res.json().catch(()=>({}));
    if(!res.ok||json.status==='error')throw new Error(json.message||'Request failed');
    return json;
  }
  function controls(){
    return {
      from:$(id('From'))?.value||'',to:$(id('To'))?.value||'',
      keyword:$(id('Keyword'))?.value.trim()||'',status:(()=>{const v=$(id('Status'))?.value||'';return v==='ALL'?'':v;})(),
      size:$(id('Size'))?.value||'-'
    };
  }
  function pageSize(){
    const n=Number(controls().size);
    return Number.isFinite(n)&&n>0?n:(String(controls().size).toLowerCase()==='all'?10000:20);
  }
  function pageButtons(){
    const out=[];const add=n=>{if(n>=1&&n<=state.totalPages&&!out.includes(n))out.push(n);};
    add(1);for(let n=state.page-2;n<=state.page+2;n++)add(n);add(state.totalPages);
    out.sort((a,b)=>a-b);
    let html='',prev=0;
    out.forEach(n=>{if(prev&&n-prev>1)html+='<span class="smart-page-ellipsis">…</span>';html+=`<button type="button" class="smart-page${n===state.page?' active':''}" data-tab-page="${n}"${n===state.page?' aria-current="page"':''}>${n}</button>`;prev=n;});
    return html;
  }
  function installCleanListeners(){
    // IMPORTANT: never clone/replace the real filter controls here.
    // bo-ui-standard/custom select keeps a live reference to the original
    // <select>. Replacing #depositStatus after a tab click left the visible
    // dropdown bound to the detached old select while this switcher read the
    // new clone (still PENDING). That is why Status=All worked before touching
    // a transaction tab, but snapped back to Pending after any tab click.
    //
    // Keep every existing DOM control intact and use capture-phase guards to
    // stop the page-specific Deposit handler only while All/Withdraw owns the
    // shared table.
    const bindOnce=(el,key,event,handler,opts)=>{
      if(!el||el.dataset[key]==='1')return;
      el.dataset[key]='1';
      el.addEventListener(event,handler,opts);
    };

    [id('From'),id('To')].forEach(controlId=>{
      bindOnce($(controlId),'boTxDateGuard','change',e=>{
        if(state.type==='deposit')return;
        e.stopImmediatePropagation();
        state.page=1;
        reload();
      },true);
    });

    bindOnce($(id('Status')),'boTxStatusGuard','change',e=>{
      if(state.type==='deposit')return;
      e.stopImmediatePropagation();
      state.page=1;
      reload();
    },true);

    bindOnce($(id('Size')),'boTxSizeGuard','change',e=>{
      if(state.type==='deposit')return;
      e.stopImmediatePropagation();
      state.page=1;
      reload();
    },true);

    let timer=0;
    bindOnce($(id('Keyword')),'boTxKeywordKeyGuard','keydown',e=>{
      if(state.type==='deposit')return;
      if(e.key==='Enter'){
        e.preventDefault();e.stopImmediatePropagation();clearTimeout(timer);
        state.page=1;reload();
      }
    },true);
    bindOnce($(id('Keyword')),'boTxKeywordInputGuard','input',e=>{
      if(state.type==='deposit')return;
      e.stopImmediatePropagation();clearTimeout(timer);
      timer=setTimeout(()=>{state.page=1;reload();},350);
    },true);

    bindOnce($(id('PrevBtn')),'boTxPrevGuard','click',e=>{
      if(state.type==='deposit')return;
      e.preventDefault();e.stopImmediatePropagation();
      if(state.page>1){state.page--;reload();}
    },true);
    bindOnce($(id('NextBtn')),'boTxNextGuard','click',e=>{
      if(state.type==='deposit')return;
      e.preventDefault();e.stopImmediatePropagation();
      if(state.page<state.totalPages){state.page++;reload();}
    },true);
    bindOnce($(id('Pager')),'boTxPagerGuard','click',e=>{
      if(state.type==='deposit')return;
      const b=e.target.closest('[data-tab-page]');
      if(!b)return;
      e.preventDefault();e.stopImmediatePropagation();
      state.page=Number(b.dataset.tabPage);reload();
    },true);
  }
  function setTableShape(){
    const withdraw=state.type==='withdraw';
    const withRemark=withdraw||state.type==='all';
    const cols=withRemark
      ? '<col class="bo-tx-col-date"/><col class="bo-tx-col-member"/><col class="bo-tx-col-amount"/><col class="bo-tx-col-bank"/><col class="bo-tx-col-ref"/><col class="bo-tx-col-remark"/><col class="bo-tx-col-status"/><col class="bo-tx-col-processed"/><col class="bo-tx-col-action"/>'
      : '<col class="bo-tx-col-date"/><col class="bo-tx-col-member"/><col class="bo-tx-col-amount"/><col class="bo-tx-col-method"/><col class="bo-tx-col-ref"/><col class="bo-tx-col-status"/><col class="bo-tx-col-processed"/><col class="bo-tx-col-action"/>';
    document.querySelectorAll('.bo-tx-head-table colgroup,.bo-tx-body-table colgroup').forEach(c=>c.innerHTML=cols);
    const head=document.querySelector('.bo-tx-head-table thead');
    if(head)head.innerHTML=withRemark
      ? '<tr><th>Date</th><th>Member</th><th>Amount</th><th>Bank</th><th>Reference</th><th>Remark</th><th>Status</th><th>Processed</th><th>Action</th></tr>'
      : '<tr><th>Date</th><th>Member</th><th>Amount</th><th>Bank</th><th>Reference</th><th>Status</th><th>Processed</th><th>Action</th></tr>';
    const body=$(id('Body'));if(body)body.innerHTML=`<tr><td colspan="${withRemark?9:8}">Loading...</td></tr>`;
  }
  function render(rows,pagination){
    const withdraw=state.type==='withdraw',withRemark=withdraw||state.type==='all',body=$(id('Body'));
    if(!body)return;
    state.rows=rows;state.totalPages=Math.max(1,Number(pagination?.totalPages)||1);
    if(!rows.length){body.innerHTML=`<tr><td colspan="${withRemark?9:8}">No ${state.type==='all'?'transaction':withdraw?'withdraw':'deposit'} request found.</td></tr>`;}
    else body.innerHTML=rows.map(r=>{
      const status=String(r.status||'-').toUpperCase(),pending=status==='PENDING';
      const actions=pending
        ? `<div class="bo-tx-actions"><button type="button" class="bo-tx-action-btn is-approve" data-tab-approve="${esc(r.id)}" title="Approve" aria-label="Approve"><i class="bi bi-check-lg"></i></button><button type="button" class="bo-tx-action-btn is-reject" data-tab-reject="${esc(r.id)}" title="Reject" aria-label="Reject"><i class="bi bi-x-lg"></i></button></div>`
        : '-';
      const common=`<td>${date(r.createdAt||r.created_at)}</td><td>${esc(r.username||'-')}</td><td>${money(r.amount)}</td>`;
      const bank=withdraw?(r.bankName||'-'):(r.bankName||r.paymentMethodDisplayName||r.paymentMethodBankName||r.paymentMethod||'-');
      const cells=withRemark
        ? `${common}<td><b>${esc(bank)}</b></td><td>${esc(r.referenceNo||'-')}</td><td>${esc(r.remark||'-')}</td>`
        : `${common}<td><b>${esc(bank)}</b></td><td>${esc(r.referenceNo||'-')}</td>`;
      return `<tr>${cells}<td><span class="status-pill ${status==='APPROVED'?'active':status==='REJECTED'?'off':''}">${esc(r.status||'-')}</span></td><td>${esc(date(r.processedAt))}</td><td>${actions}</td></tr>`;
    }).join('');
    $(id('Pager')).innerHTML=pageButtons();
    $(id('PrevBtn')).disabled=state.page<=1;$(id('NextBtn')).disabled=state.page>=state.totalPages;
  }
  async function refreshTabCounts(){
    const generation=++countGeneration;
    // Keep the three tab totals independent from whichever table currently owns
    // the shared controls.  After a tab switch the Deposit page listeners are
    // intentionally suppressed for All/Withdraw, so its old counter refresher
    // no longer runs.  Query both list endpoints directly using the current
    // date/status filters and update only the existing count spans.
    const c=controls();
    const params=new URLSearchParams({page:'1',size:'1'});
    if(c.status)params.set('status',c.status);
    if(c.from)params.set('dateFrom',c.from);
    if(c.to)params.set('dateTo',c.to);
    if(c.keyword)params.set('keyword',c.keyword);
    const count=async key=>{
      const json=await api(endpoint(key)+'?'+params);
      const data=json.data||{};
      const pg=json.pagination||data.pagination||data||{};
      const n=Number(pg.totalElements);
      if(Number.isFinite(n))return Math.max(0,n);
      const rows=Array.isArray(data)?data:(data.content||data.items||data.list||json.content||[]);
      return Array.isArray(rows)?rows.length:0;
    };
    try{
      const [depositTotal,withdrawTotal]=await Promise.all([
        count('MEMBER_DEPOSIT_LIST'),count('MEMBER_WITHDRAW_LIST')
      ]);
      if(generation!==countGeneration)return;
      const set=(elId,value)=>{const el=$(elId);if(el)el.textContent=String(value);};
      set('boTxCountDeposit',depositTotal);
      set('boTxCountWithdraw',withdrawTotal);
      set('boTxCountAll',depositTotal+withdrawTotal);
    }catch(_e){
      // A count failure must never break the transaction table itself.
    }
  }
  async function reload(){
    const generation=++reloadGeneration;
    const c=controls(),requestedSize=pageSize();
    const params=new URLSearchParams({page:String(state.type==='all'?1:state.page),size:String(state.type==='all'?10000:requestedSize)});
    if(c.keyword)params.set('keyword',c.keyword);if(c.status)params.set('status',c.status);
    if(c.from)params.set('dateFrom',c.from);if(c.to)params.set('dateTo',c.to);
    const body=$(id('Body'));if(body)body.innerHTML=`<tr><td colspan="${state.type==='withdraw'||state.type==='all'?9:8}">Loading...</td></tr>`;
    try{
      const keys=state.type==='all'?['MEMBER_DEPOSIT_LIST','MEMBER_WITHDRAW_LIST']:[state.type==='withdraw'?'MEMBER_WITHDRAW_LIST':'MEMBER_DEPOSIT_LIST'];
      const responses=await Promise.all(keys.map(key=>api(endpoint(key)+'?'+params).then(json=>({json,key}))));
      if(generation!==reloadGeneration)return;
      let rows=responses.flatMap(({json,key})=>{
        const data=json.data||{};
        const values=Array.isArray(data)?data:(data.content||data.items||data.list||json.content||[]);
        return values.map(row=>({...row,__transactionType:key==='MEMBER_WITHDRAW_LIST'?'withdraw':'deposit'}));
      });

      // Defensive client-side filter for the combined All tab. The list API has
      // occasionally returned rows outside the requested date/status window when
      // All is entered through normal tab navigation, even though the count request
      // for the same controls is already correct. A hard refresh then looks correct,
      // which made the table and tab totals appear to randomly disagree.
      //
      // Keep the server filters (they are still required for efficiency), but never
      // render a row that does not match the exact control snapshot used for this
      // request. This also makes date/status/search deterministic if a stale/cached
      // list response is ever received.
      if(state.type==='all'){
        const needle=String(c.keyword||'').trim().toLowerCase();
        const wantedStatus=String(c.status||'').trim().toUpperCase();
        rows=rows.filter(row=>{
          const created=String(row.createdAt||row.created_at||'');
          const day=created.length>=10?created.slice(0,10):'';
          if(c.from&&day&&day<c.from)return false;
          if(c.to&&day&&day>c.to)return false;
          if(wantedStatus&&String(row.status||'').toUpperCase()!==wantedStatus)return false;
          if(needle){
            const hay=[row.username,row.mobile,row.phone,row.bankName,row.paymentMethodDisplayName,row.paymentMethodBankName,row.paymentMethod,row.referenceNo,row.remark]
              .map(v=>String(v==null?'':v).toLowerCase()).join(' ');
            if(!hay.includes(needle))return false;
          }
          return true;
        });
      }
      rows.sort((a,b)=>String(b.createdAt||b.created_at||'').localeCompare(String(a.createdAt||a.created_at||'')));
      let pagination=responses[0]?.pagination||responses[0]?.data?.pagination||responses[0]?.data||{};
      if(state.type==='all'){
        const total=rows.length,totalPages=Math.max(1,Math.ceil(total/requestedSize)),start=(state.page-1)*requestedSize;
        rows=rows.slice(start,start+requestedSize);
        pagination={totalElements:total,totalPages,page:state.page,size:requestedSize};
      }
      render(rows,pagination);
      refreshTabCounts();
    }catch(e){if(generation!==reloadGeneration)return;if(body)body.innerHTML=`<tr><td colspan="${state.type==='withdraw'||state.type==='all'?9:8}" class="text-danger">${esc(e.message)}</td></tr>`;}
  }
  function switchTab(type){
    if(type===state.type)return;
    const current=controls();
    state.type=type;state.page=1;
    history.replaceState(null,'',`member-deposit.html?tab=${type}`);
    document.querySelectorAll('.bo-tx-tab[data-bo-tx-type]').forEach(a=>{
      const active=a.dataset.boTxType===type;a.classList.toggle('is-active',active);
      if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
    setTableShape();installCleanListeners();
    const from=$(id('From')),to=$(id('To')),keyword=$(id('Keyword')),status=$(id('Status'));
    if(from)from.value=current.from;if(to)to.value=current.to;if(keyword)keyword.value=current.keyword;
    if(status)status.value=current.status||'ALL';
    reload();
  }
  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('.bo-tx-tab[data-bo-tx-type]');
    if(!tab)return;
    const type=tab.dataset.boTxType;
    if(type==='all'){
      e.preventDefault();
      if(state.type!=='all')switchTab('all');
    }
    // Deposit and Withdraw deliberately use their normal href. This prevents
    // stale listeners / late requests from one tab overwriting another tab.
  },true);
  async function waitForDateRangeReady(){
    // Dashboard pinned pages run inside an iframe. On an iframe tab navigation the
    // dynamically appended transaction script can execute while bo-date-range is
    // still building the hidden From/To controls. The visible picker may already
    // say "Today" while the hidden values are still blank for a few frames. An All
    // request made in that gap is unfiltered and returns historical rows.
    //
    // Do not guess a date here: wait for the shared date-range component to finish
    // so the table, counters and right-side filters all use the exact same values.
    const from=$(id('From')),to=$(id('To'));
    if(!from||!to)return;
    const allowEmpty=from.dataset.rangeAllowEmpty==='1';
    if(allowEmpty)return;
    const started=Date.now();
    while((!from.value||!to.value) && Date.now()-started<1500){
      await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
    }
    // This page's default range is Today. If a browser history/BFCache restore
    // brings the document back before bo-date-range has re-synchronised the
    // hidden inputs, never allow an unfiltered All request to escape.
    if(!from.value||!to.value){
      const now=new Date();
      const pad=n=>String(n).padStart(2,'0');
      const today=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
      if(!from.value)from.value=today;
      if(!to.value)to.value=today;
    }
  }
  async function init(){
    if(state.type!=='all')return;
    setTableShape();
    installCleanListeners();
    await waitForDateRangeReady();
    reload();
  }
  // A normal tab click can restore member-deposit.html from the browser's
  // back/forward cache. In that case the old table DOM is restored too, while
  // the header/tab counters may already refresh to the current filters. That
  // produced e.g. All (1) with old Aug/Sep rows until Ctrl+F5. Always rebuild
  // the All table from the current controls after a BFCache restore.
  window.addEventListener('pagehide',()=>{reloadGeneration++;countGeneration++;});
  window.addEventListener('pageshow',async e=>{
    if(!e.persisted||state.type!=='all')return;
    await waitForDateRangeReady();
    state.page=1;
    reload();
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
