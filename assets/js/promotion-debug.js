(function(){
  const $=id=>document.getElementById(id); const tbody=$('dbgRows'), msg=$('dbgMsg');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>v==null||v===''?'-':Number(v).toFixed(2);
  const api=p=>API_CONFIG.BASE_URL+p;
  let statusTimer=0;
  let statusFilter='ACTIVE';
  let lastRows=[];
  let page=0;

  function set(m,t){
    if(!msg) return;
    window.clearTimeout(statusTimer);
    const text=m||'';
    const tone=t||'';
    /* Idle success ("Loaded 0…") stays quiet — only show loading, errors, and sync outcomes. */
    const keep=!!text && (tone==='err' || tone==='' || /sync|updated|check/i.test(text));
    if(!keep){
      msg.textContent='';
      msg.className='debug-status';
      msg.hidden=true;
      return;
    }
    msg.hidden=false;
    msg.textContent=text;
    msg.className='debug-status'+(tone?' '+tone:'');
    if(tone==='ok'){
      statusTimer=window.setTimeout(function(){
        msg.textContent='';
        msg.className='debug-status';
        msg.hidden=true;
      },4200);
    }
  }
  function auth(){return window.BO_AUTH?BO_AUTH.authHeader():{};}
  function pct(cur,req){cur=Number(cur||0);req=Number(req||0);return req>0?Math.min(100,(cur/req)*100):100;}
  function dt(v){return window.BO_FORMAT&&window.BO_FORMAT.dateTime?window.BO_FORMAT.dateTime(v):(v?String(v).replace('T',' ').slice(0,19):'-');}
  function statusPill(s){
    const v=String(s||'');
    const cls=v==='FORFEITED'?'status-pill off':'status-pill active';
    return '<span class="'+cls+'">'+esc(v||'-')+'</span>';
  }
  function emptyState(){
    return '<tr><td colspan="9" class="pl-empty-cell">No claims found.</td></tr>';
  }
  function resolvePageSize(raw){
    const v=String(raw??'-').trim();
    if(v==='-'||v==='') return 20;
    if(/^all$/i.test(v)) return 10000;
    const n=Number(v);
    return Number.isFinite(n)&&n>0?n:20;
  }
  async function request(path, opt){const res=await fetch(api(path),{headers:{'Content-Type':'application/json',...auth()},...opt});const json=await res.json().catch(()=>({}));if(!res.ok||json.status==='error')throw new Error(json.message||'Request failed');return json.data;}
  function endpoint(){
    const qs=new URLSearchParams();
    if($('dbgFrom')?.value) qs.set('from',$('dbgFrom').value);
    if($('dbgTo')?.value) qs.set('to',$('dbgTo').value);
    const q=($('dbgKeyword').value||'').trim();
    if(q){
      /* Pure digits → promotion ID; otherwise member / mobile keyword */
      if(/^\d+$/.test(q)) qs.set('promotionId',q);
      else qs.set('keyword',q);
    }
    return '/admin/promotion/debug/claims?'+qs.toString();
  }
  function statusTrack(){return document.getElementById('dbgStatusTabs');}
  function syncStatusTabs(){
    const track=statusTrack();
    if(track&&window.BO_SEG_BOUNCE){
      try{window.BO_SEG_BOUNCE.sync(track);}catch(_){}
    }
  }
  function setStatusFilter(next){
    const v=String(next||'').toUpperCase();
    statusFilter=v==='ACTIVE'||v==='COMPLETED'||v==='FORFEITED'?v:'';
    document.querySelectorAll('[data-pl-status]').forEach(btn=>{
      const on=String(btn.getAttribute('data-pl-status')||'')===statusFilter;
      btn.classList.toggle('is-active',on);
      btn.setAttribute('aria-pressed',on?'true':'false');
    });
    syncStatusTabs();
    page=0;
    paintRows(lastRows);
  }
  function updateCounts(rows){
    const active=rows.filter(x=>x.status==='ACTIVE').length;
    const completed=rows.filter(x=>x.status==='COMPLETED').length;
    const forfeited=rows.filter(x=>x.status==='FORFEITED').length;
    $('dbgTotal').textContent=rows.length;
    $('dbgActive').textContent=active;
    $('dbgCompleted').textContent=completed;
    $('dbgForfeited').textContent=forfeited;
    const setCount=(id,n)=>{const el=$(id); if(el) el.textContent=String(n);};
    setCount('plTabCountActive',active);
    setCount('plTabCountCompleted',completed);
    setCount('plTabCountForfeited',forfeited);
    setCount('plTabCountAll',rows.length);
  }
  function renderPager(cur,totalPages,empty){
    const pager=$('dbgPager');
    if(!pager) return;
    const pages=Math.max(1,Number(totalPages)||0);
    const p=Math.max(0,Math.min(Number(cur)||0,Math.max(0,pages-1)));
    const btn=(label,target,disabled,active,icon)=>'<button type="button" class="page-btn'+(active?' active':'')+'" data-page="'+target+'" '+(disabled?'disabled':'')+' aria-label="'+label+'"'+(active?' aria-current="page"':'')+'>'+(icon?'<i class="bi '+icon+'"></i>':label)+'</button>';
    let h=btn('First',0,p<=0||empty,false,'bi-chevron-bar-left')+btn('Previous',p-1,p<=0||empty,false,'bi-chevron-left');
    if(empty){h+=btn('1',0,true,true);}
    else{
      const lo=Math.max(0,p-2),hi=Math.min(pages-1,p+2);
      for(let i=lo;i<=hi;i++) h+=btn(String(i+1),i,false,i===p);
    }
    h+=btn('Next',p+1,p>=pages-1||empty,false,'bi-chevron-right')+btn('Last',pages-1,p>=pages-1||empty,false,'bi-chevron-bar-right');
    pager.innerHTML=h;
  }
  function updateShowing(from,to,total){
    const el=$('dbgShowing');
    if(el) el.textContent='Showing '+from+' to '+to+' of '+total+' entries';
  }
  function paintRows(rows){
    rows=Array.isArray(rows)?rows:[];
    updateCounts(rows);
    const view=statusFilter?rows.filter(x=>x.status===statusFilter):rows;
    const size=resolvePageSize($('dbgPageSize')?.value);
    const total=view.length;
    const totalPages=total?Math.ceil(total/size):0;
    if(page>=totalPages) page=Math.max(0,totalPages-1);
    const start=page*size;
    const pageRows=view.slice(start,start+size);
    const from=pageRows.length?start+1:0;
    const to=start+pageRows.length;
    updateShowing(from,to,total);
    renderPager(page,totalPages,!total);
    if(!pageRows.length){tbody.innerHTML=emptyState();return;}
    tbody.innerHTML=pageRows.map(r=>{
      const tp=pct(r.currentTurnover,r.requiredTurnover), rp=pct(r.currentRollover,r.requiredRollover);
      const bar=(ratio,meta)=>'<div class="pl-progress">'
        +'<div class="pl-progress-val nowrap">'+money(ratio.cur)+' <span class="pl-progress-sep">/</span> '+money(ratio.req)+'</div>'
        +'<div class="progress-mini" role="progressbar" aria-valuenow="'+ratio.p.toFixed(0)+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+ratio.p+'%"></span></div>'
        +'<div class="pl-progress-meta">'+meta+'</div></div>';
      return '<tr data-id="'+esc(r.id)+'" data-status="'+esc(r.status||'')+'">'+
        '<td><span class="pl-id">#'+esc(r.id)+'</span></td>'+
        '<td><div class="pl-cell"><b class="pl-primary">'+esc(r.username||('- member '+r.memberId))+'</b><span class="pl-meta">'+esc(r.mobile||'')+'</span></div></td>'+
        '<td><div class="pl-cell"><b class="pl-primary pl-promo">'+esc(r.promotionName||('Promotion '+r.promotionId))+'</b><span class="pl-meta">'+esc(r.promotionRule||'')+'</span></div></td>'+
        '<td class="nowrap"><div class="pl-cell"><b class="pl-primary pl-money">'+money(r.bonusAmount)+'</b><span class="pl-meta">Base '+money(r.baseAmount)+'</span></div></td>'+
        '<td>'+bar({cur:r.currentTurnover,req:r.requiredTurnover,p:tp},tp.toFixed(1)+'% · logs '+esc(r.progressCount||0))+'</td>'+
        '<td>'+bar({cur:r.currentRollover,req:r.requiredRollover,p:rp},rp.toFixed(1)+'%')+'</td>'+
        '<td>'+statusPill(r.status)+'</td>'+
        '<td class="nowrap"><span class="pl-time">'+esc(dt(r.createdAt))+'</span></td>'+
        '<td><div class="bo-tx-actions debug-actions">'
          +'<button type="button" class="bo-tx-action-btn is-progress" data-act="progress" data-tip="Add Progress" aria-label="Add Progress"><i class="bi bi-plus-lg" aria-hidden="true"></i></button>'
          +'<button type="button" class="bo-tx-action-btn is-approve" data-act="complete" data-tip="Complete" aria-label="Complete"><i class="bi bi-check-lg" aria-hidden="true"></i></button>'
          +'<button type="button" class="bo-tx-action-btn is-recalc" data-act="recalculate" data-tip="Recalculate" aria-label="Recalculate"><i class="bi bi-arrow-clockwise" aria-hidden="true"></i></button>'
          +'<button type="button" class="bo-tx-action-btn is-forfeit" data-act="forfeit" data-tip="Forfeit" aria-label="Forfeit"><i class="bi bi-slash-circle" aria-hidden="true"></i></button>'
          +'<button type="button" class="bo-tx-action-btn is-reject" data-act="reset" data-tip="Reset Claim" aria-label="Reset Claim"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i></button>'
        +'</div></td>'+
      '</tr>';
    }).join('');
  }
  function render(rows){
    lastRows=Array.isArray(rows)?rows:[];
    page=0;
    paintRows(lastRows);
  }
  async function load(){try{set('Loading claims…','');const rows=await request(endpoint());render(rows);set('','ok');}catch(e){tbody.innerHTML='<tr><td colspan="9" class="pl-empty-cell">'+esc(e.message)+'</td></tr>';updateShowing(0,0,0);renderPager(0,0,true);set(e.message,'err');}}
  async function syncBetLogs(){try{set('Syncing provider bet logs…','');const data=await request('/admin/promotion/debug/sync-bet-logs',{method:'POST',body:JSON.stringify({})});set('Synced · checked '+(data.checked||0)+' · applied '+(data.applied||0)+' · skipped '+(data.skipped||0),'ok');await load();}catch(e){set(e.message,'err');}}
  async function action(id,act){try{let path='/admin/promotion/debug/'+act, body={claimId:id}; if(act==='progress'){let amount=await BO_DIALOG.prompt('Enter the valid bet / winover amount:','10',{title:'Add Progress',inputLabel:'Amount',confirmText:'Add'}); if(amount===null)return; body.amount=Number(amount||0); path='/admin/promotion/debug/add-progress';} if(act==='reset'&&!(await BO_DIALOG.confirm('Reset will DELETE this claim, then member can claim again. Continue?', {title:'Reset Claim', confirmText:'Reset'})))return; if(act==='forfeit'&&!(await BO_DIALOG.confirm('Forfeit this promotion claim?', {title:'Forfeit Claim', confirmText:'Forfeit'})))return; await request(path,{method:'POST',body:JSON.stringify(body)}); set('Claim updated','ok'); await load();}catch(e){set(e.message,'err');}}
  function ensureActTip(){
    let tip=document.getElementById('plActTip');
    if(tip) return tip;
    tip=document.createElement('div');
    tip.id='plActTip';
    tip.className='pl-act-tip mad-float-tip';
    tip.setAttribute('role','tooltip');
    tip.setAttribute('aria-hidden','true');
    document.body.appendChild(tip);
    return tip;
  }
  function placeActTip(el){
    const tip=ensureActTip();
    const text=el.getAttribute('data-tip')||'';
    if(!text){ hideActTip(); return; }
    tip.textContent=text;
    tip.classList.add('is-on');
    tip.classList.remove('is-below');
    const r=el.getBoundingClientRect();
    const tr=tip.getBoundingClientRect();
    let top=r.top-tr.height-8;
    let below=false;
    if(top<8){ below=true; top=r.bottom+8; }
    tip.classList.toggle('is-below', below);
    const left=Math.max(8,Math.min(r.left+r.width/2-tr.width/2, window.innerWidth-tr.width-8));
    tip.style.left=Math.round(left)+'px';
    tip.style.top=Math.round(top)+'px';
  }
  function hideActTip(){
    const tip=document.getElementById('plActTip');
    if(tip) tip.classList.remove('is-on','is-below');
  }
  function bindActTips(){
    if(!tbody||tbody.dataset.tipBound==='1') return;
    tbody.dataset.tipBound='1';
    tbody.addEventListener('mouseover',e=>{
      const el=e.target.closest?.('.bo-tx-action-btn[data-tip]');
      if(el) placeActTip(el);
    });
    tbody.addEventListener('mouseout',e=>{
      const el=e.target.closest?.('.bo-tx-action-btn[data-tip]');
      if(!el) return;
      const next=e.relatedTarget;
      if(next&&el.contains(next)) return;
      hideActTip();
    });
    tbody.addEventListener('focusin',e=>{
      const el=e.target.closest?.('.bo-tx-action-btn[data-tip]');
      if(el) placeActTip(el);
    });
    tbody.addEventListener('focusout',e=>{
      const el=e.target.closest?.('.bo-tx-action-btn[data-tip]');
      if(!el) return;
      const next=e.relatedTarget;
      if(next&&el.contains(next)) return;
      hideActTip();
    });
  }
  document.addEventListener('click',e=>{
    const statusTab=e.target.closest('[data-pl-status]');
    if(statusTab&&statusTrack()?.contains(statusTab)){
      e.preventDefault();
      setStatusFilter(statusTab.getAttribute('data-pl-status'));
      return;
    }
    const pageBtn=e.target.closest('#dbgPager [data-page]');
    if(pageBtn&&!pageBtn.disabled){
      e.preventDefault();
      page=Number(pageBtn.getAttribute('data-page'))||0;
      paintRows(lastRows);
      return;
    }
    const b=e.target.closest('[data-act]');
    if(b){hideActTip();const tr=b.closest('tr');action(tr.dataset.id,b.dataset.act);}
  });
  window.addEventListener('scroll',hideActTip,true);
  window.addEventListener('resize',hideActTip);
  $('dbgRefreshBtn')?.addEventListener('click',load);
  $('dbgSyncBetLogsBtn')?.addEventListener('click',syncBetLogs);
  $('dbgKeyword')?.addEventListener('keydown',e=>{if(e.key==='Enter'){page=0;load();}});
  $('dbgPageSize')?.addEventListener('change',()=>{page=0;paintRows(lastRows);});

  // The shared date-range picker updates the hidden dbgFrom/dbgTo inputs.
  // Promotion Log previously never reloaded when those values changed, so the
  // page could stay on the initial (today) empty result even after selecting
  // This Year / another range. Coalesce the picker's two change events into
  // one API reload.
  let dateReloadTimer=0;
  function queueDateReload(){
    window.clearTimeout(dateReloadTimer);
    dateReloadTimer=window.setTimeout(()=>{
      page=0;
      load();
    },0);
  }
  $('dbgFrom')?.addEventListener('change',queueDateReload);
  $('dbgTo')?.addEventListener('change',queueDateReload);

  document.addEventListener('DOMContentLoaded',()=>{
    const track=statusTrack();
    if(track&&window.BO_SEG_BOUNCE){
      window.BO_SEG_BOUNCE.mount(track,{button:':scope > .bo-tx-tab',anim:'bounce'});
    }
    bindActTips();
    load();
  });
})();
