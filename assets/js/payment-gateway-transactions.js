(function(){
  const $=id=>document.getElementById(id);
  const ep=k=>API_CONFIG.BASE_URL+API_CONFIG.ENDPOINTS[k];
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const auth=()=>({...BO_AUTH.authHeader(),'Content-Type':'application/json','X-Admin-Username':String(BO_AUTH.user()?.username||'ADMIN')});
  async function api(url,opt={}){const res=await fetch(url,{...opt,headers:{...auth(),...(opt.headers||{})}});const j=await res.json().catch(()=>({}));if(!res.ok||j.status==='error')throw new Error(j.message||'Request failed');return j;}
  function notify(msg,type){if(window.BO_DIALOG)BO_DIALOG.alert(msg,{title:type==='error'?'Gateway Transaction Error':'Gateway Transactions',type:type||'success'});else alert(msg);}
  function statusClass(status){const s=String(status||'').toUpperCase();if(s==='SUCCESS')return 'on';if(['FAILED','REJECTED','VOIDED'].includes(s))return 'off';return '';}

  /* ---- the listing toolbar and footer its siblings carry -----------------------------------------
     Same three slots (`table-footer bo-pagination-standard`: Show / Showing / ladder) and the same `-`
     size meaning "as many rows as the panel can hold", measured from the table head to the footer. The
     status pills are the module's segmented control, so switching filters also moves its thumb - the
     control only works when a track is mounted, which is why that is done on load and not on demand. */
  let rows=[], status='', page=1;
  const ST_OK='SUCCESS', ST_RUN=['PENDING','PROCESSING'], ST_BAD=['FAILED','REJECTED','VOIDED'];
  function bucket(s){s=String(s||'').toUpperCase();if(s===ST_OK)return 'SUCCESS';if(ST_RUN.includes(s))return 'PENDING';if(ST_BAD.includes(s))return 'FAILED';return 'OTHER';}
  function keyword(){return String(($('pgTxSearch')||{}).value||'').trim().toLowerCase();}
  function matching(){
    const q=keyword();
    return rows.filter(r=>!q||[r.referenceId,r.memberId,r.providerTransactionId,r.direction].some(v=>String(v||'').toLowerCase().includes(q)));
  }
  function setCounts(base){
    const counts={SUCCESS:0,PENDING:0,FAILED:0};
    base.forEach(r=>{const b=bucket(r.status);if(b in counts)counts[b]++;});
    const all=$('pgTxCountAll'),su=$('pgTxCountSuccess'),pe=$('pgTxCountPending'),fa=$('pgTxCountFailed');
    /* bare numbers: the component draws the parentheses (.bo-tx-tab-count::before/:after) */
    if(all) all.textContent=String(base.length);
    if(su) su.textContent=String(counts.SUCCESS);
    if(pe) pe.textContent=String(counts.PENDING);
    if(fa) fa.textContent=String(counts.FAILED);
  }
  function autoRows(){
    const head=document.querySelector('.pg-tx-table thead'), foot=document.querySelector('.pg-tx-filter')&&document.querySelector('.gateway-transaction-card .table-footer');
    const row=$('pgTxBody')&&$('pgTxBody').querySelector('tr');
    if(!head||!foot) return 10;
    const rowH=(row&&row.getBoundingClientRect().height)||52;
    const fit=Math.floor((foot.getBoundingClientRect().top-head.getBoundingClientRect().bottom)/rowH);
    return Math.max(5,Math.min(100,fit||10));
  }
  function pageSize(){
    const v=String(($('pgTxPageSize')||{}).value||'-');
    if(v==='All') return Infinity;
    const n=Number(v);
    return Number.isFinite(n)&&n>0?n:autoRows();
  }
  function syncFooter(total,from,to){
    if($('pgTxShowing')) $('pgTxShowing').textContent='Showing '+(total?from:0)+' to '+(total?to:0)+' of '+total+' entries';
    const pager=$('pgTxPager'); if(!pager) return;
    const size=pageSize(), pages=Number.isFinite(size)?Math.max(1,Math.ceil(total/size)):1;
    if(pages<2){pager.innerHTML='';return;}
    let html='<button type="button" class="page-btn" data-pg-tx-page="'+Math.max(1,page-1)+'"'+(page<=1?' disabled':'')+' aria-label="Previous page"><i class="bi bi-chevron-left"></i></button>';
    for(let i=1;i<=pages;i++) html+='<button type="button" class="page-btn'+(i===page?' active':'')+'" data-pg-tx-page="'+i+'"'+(i===page?' aria-current="page"':'')+'>'+i+'</button>';
    html+='<button type="button" class="page-btn" data-pg-tx-page="'+Math.min(pages,page+1)+'"'+(page>=pages?' disabled':'')+' aria-label="Next page"><i class="bi bi-chevron-right"></i></button>';
    pager.innerHTML=html;
  }
  function renderTx(){
    const body=$('pgTxBody'); if(!body) return;
    const base=matching();
    setCounts(base);
    const list=status===''?base:base.filter(r=>bucket(r.status)===status);
    if(!list.length){
      body.innerHTML='<tr><td colspan="8" class="pg-empty">'+(rows.length?'No transaction matches this filter.':'No gateway transactions yet.')+'</td></tr>';
      syncFooter(0,0,0); return;
    }
    const size=pageSize();
    const pages=Number.isFinite(size)?Math.max(1,Math.ceil(list.length/size)):1;
    if(page>pages) page=pages;
    const start=Number.isFinite(size)?(page-1)*size:0;
    const shown=Number.isFinite(size)?list.slice(start,start+size):list;
    body.innerHTML=shown.map(t=>`<tr><td>${esc(String(t.createdAt||'').replace('T',' ').slice(0,19))}</td><td>${esc(t.direction||'-')}</td><td class="gateway-tx-ref">${esc(t.referenceId||'-')}</td><td>${esc(t.memberId||'-')}</td><td>${esc(t.amount)} ${esc(t.currency||'')}</td><td><span class="pg-pill gateway-tx-status ${statusClass(t.status)}">${esc(t.status||'-')}</span></td><td class="gateway-tx-ref">${esc(t.providerTransactionId||'-')}</td><td><button class="clean-btn gateway-tx-action" type="button" data-check-status="${t.id}"><i class="bi bi-arrow-repeat"></i> Check</button></td></tr>`).join('');
    syncFooter(list.length,start+1,start+shown.length);
  }
  function mountSegs(){
    if(!window.BO_SEG_BOUNCE||typeof window.BO_SEG_BOUNCE.mount!=='function') return;
    document.querySelectorAll('.pg-tx-filter .bo-tx-tabs').forEach(track=>{
      if(track.dataset.pgSegMounted==='1') return;
      track.dataset.pgSegMounted='1';
      try{ window.BO_SEG_BOUNCE.mount(track,{button:':scope > .bo-tx-tab',anim:'bounce'}); }catch(e){}
    });
  }
  async function loadTx(){
    const body=$('pgTxBody');
    body.innerHTML='<tr><td colspan="8" class="pg-empty">Loading...</td></tr>';
    if($('pgTxShowing')) $('pgTxShowing').textContent='Loading records...';
    try{
      const j=await api(ep('PAYMENT_GATEWAY_TRANSACTIONS')+'?page=1&size=30');
      rows=(j.data&&j.data.content)||[];
      renderTx();
    }catch(e){
      rows=[];
      body.innerHTML='<tr><td colspan="8" class="pg-empty">'+esc(e.message)+'</td></tr>';
      if($('pgTxShowing')) $('pgTxShowing').textContent='Unable to load records';
      syncFooter(0,0,0);
    }
  }
  async function checkStatus(id){try{const j=await api(ep('PAYMENT_GATEWAY_STATUS_CHECK')+'/'+encodeURIComponent(id)+'/status',{method:'POST',body:'{}'});notify(j.message||'Status checked.');await loadTx();}catch(e){notify(e.message,'error');}}

  document.addEventListener('click',e=>{
    const st=e.target.closest('[data-check-status]');
    if(st){e.preventDefault();checkStatus(st.dataset.checkStatus);return;}
    const pg=e.target.closest('[data-pg-tx-page]');
    if(pg){page=Number(pg.dataset.pgTxPage)||1;renderTx();return;}
    const pill=e.target.closest('[data-pg-tx-status]');
    if(pill){
      status=String(pill.dataset.pgTxStatus||'');page=1;
      document.querySelectorAll('.pg-tx-filter [data-pg-tx-status]').forEach(x=>{
        const on=x===pill;x.classList.toggle('is-active',on);x.setAttribute('aria-pressed',on?'true':'false');
      });
      renderTx();
    }
  });

  document.addEventListener('DOMContentLoaded',()=>{
    if($('pgTxRefresh')) $('pgTxRefresh').addEventListener('click',loadTx);
    if($('pgTxPageSize')) $('pgTxPageSize').addEventListener('change',()=>{page=1;renderTx();});
    if($('pgTxSearch')) $('pgTxSearch').addEventListener('input',()=>{page=1;renderTx();});
    /* `-` is a measurement, so a resize can change it. One slot on window: this file re-runs on every
       router entry and a second listener would page twice per resize. */
    if(window.__boPgTxResize) window.removeEventListener('resize',window.__boPgTxResize);
    window.__boPgTxResize=()=>{if(String(($('pgTxPageSize')||{}).value||'-')==='-'){page=1;renderTx();}};
    window.addEventListener('resize',window.__boPgTxResize);
    loadTx().then(mountSegs);
    mountSegs();
  });
})();
