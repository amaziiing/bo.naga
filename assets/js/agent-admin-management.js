(function(){'use strict';
const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])), money=v=>Number(v||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2}), whole=v=>Number(v||0).toLocaleString('en-US');
const API=window.API_CONFIG?.BASE_URL||'';
function apiUrl(path){
  const base=String(API||'').replace(/\/+$/,'');
  let p=String(path||'');
  // API_CONFIG.BASE_URL already ends with /api in BO. Older Agent Management
  // calls were also prefixed with /api, producing /api/api/... and a 404.
  if(/\/api$/i.test(base) && /^\/api\//i.test(p)) p=p.replace(/^\/api/i,'');
  if(p && !p.startsWith('/')) p='/'+p;
  return base+p;
}
async function req(path,opt={}){const r=await fetch(apiUrl(path),{...opt,headers:{...(opt.headers||{}),...BO_AUTH.authHeader(),...(opt.body?{'Content-Type':'application/json'}:{})}}),j=await r.json().catch(()=>({}));if(!r.ok||j.status==='error')throw Error(j.message||'Request failed');return j.data;}
function d(v){
  const s=String(v||'').trim();
  if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){const [day,month,year]=s.slice(0,10).split('/');return year+'-'+month+'-'+day}
  return s.slice(0,10)
}
function dt(v){return String(v||'').replace('T',' ').slice(0,19)||'-'}
function range(from,to){return [$(from)?.value||'',$(to)?.value||''];}
function inRange(v,from,to){const x=d(v);return(!from||x>=from)&&(!to||x<=to)}
function metric(icon,label,value,small){return `<div class="metric agent-admin-metric"><div class="bo-summary-icon"><i class="bi ${icon}"></i></div><span>${esc(label)}</span><strong>${esc(value)}</strong>${small?`<div class="bo-summary-note">${esc(small)}</div>`:''}</div>`}
function status(s){s=String(s||'').toUpperCase();const active=['ACTIVE','APPROVED','PAID'].includes(s);return `<span class="status-pill agent-status-pill ${active?'active':(s==='SUSPENDED'||s==='REJECTED'?'off':'')}">${esc(s||'-')}</span>`}
function moneyCell(v){const n=Number(v||0);return `<span class="${n<0?'money-negative':'money-positive'}">RM ${money(n)}</span>`}
const AGENT_ADMIN_AUTO_SIZE={};
const AGENT_ADMIN_AUTOFIT_BUSY={};
function isAutoPageSize(raw){const v=String(raw??'-').trim();return v===''||v==='-'||/^auto$/i.test(v);}
function syncAutofitAttr(bodyId,selectId){
  const body=$(bodyId);
  const wrap=body?.closest('.table-wrap');
  const auto=isAutoPageSize($(selectId)?.value);
  wrap?.toggleAttribute('data-bo-autofit',!!auto);
  if(!auto){
    const table=body?.closest('table');
    if(table){table.classList.remove('bo-tx-evenfill');table.style.height='';}
    if(body)[...body.querySelectorAll('tr')].forEach(tr=>{tr.style.height='';tr.querySelectorAll('td').forEach(td=>{td.style.height=''});});
  }
}
function measureAutoPageSize(bodyId){
  const body=$(bodyId);
  const wrap=body?.closest('.table-wrap');
  if(!wrap) return 10;
  const table=wrap.querySelector('table');
  const head=table?.querySelector('thead');
  const headH=head?Math.ceil(head.getBoundingClientRect().height):44;
  const avail=Math.max(0,Math.floor(wrap.clientHeight)-headH);
  const sampleRows=[...wrap.querySelectorAll('tbody tr')].filter(tr=>!tr.querySelector('.table-empty'));
  const sample=sampleRows[0];
  const rowH=sample?Math.max(38,Math.round(sample.getBoundingClientRect().height)):48;
  /* Floor only — never add a row that overflow:hidden would clip (VIP Log recipe). */
  return Math.max(5,Math.min(200,Math.floor(avail/rowH)||10));
}
function autoFitPageSize(bodyId){
  if(AGENT_ADMIN_AUTO_SIZE[bodyId]!=null) return AGENT_ADMIN_AUTO_SIZE[bodyId];
  AGENT_ADMIN_AUTO_SIZE[bodyId]=measureAutoPageSize(bodyId);
  return AGENT_ADMIN_AUTO_SIZE[bodyId];
}
function clearLockedAutoSize(bodyId){
  delete AGENT_ADMIN_AUTO_SIZE[bodyId];
  delete AGENT_ADMIN_AUTOFIT_BUSY[bodyId];
  delete $(bodyId)?.dataset.boAutofitSettled;
}
function pageSizeOf(selectId,bodyId){
  const raw=$(selectId)?.value||'-';
  if(/^all$/i.test(raw))return Infinity;
  if(isAutoPageSize(raw))return autoFitPageSize(bodyId);
  const n=Number(raw);
  return Number.isFinite(n)&&n>0?n:autoFitPageSize(bodyId);
}
/* Show "-" = autofit: grow/shrink until rows exactly fill the wrap with no
   scrollbar (VIP EXP Log / Member Management recipe). data-bo-autofit on the
   wrap forces overflow-y:hidden so a 1px rounding seam never paints a bar. */
function evenFillTableRows(bodyId,selectId,render){
  const body=$(bodyId);
  if(!body) return;
  const wrap=body.closest('.table-wrap');
  const table=body.closest('table');
  if(!wrap||!table) return;
  syncAutofitAttr(bodyId,selectId);
  table.classList.remove('bo-tx-evenfill');
  table.style.height='';
  [...body.querySelectorAll('tr')].forEach(tr=>{
    tr.style.height='';
    tr.querySelectorAll('td').forEach(td=>{td.style.height=''});
  });
  if(!isAutoPageSize($(selectId)?.value)) return;
  if(AGENT_ADMIN_AUTOFIT_BUSY[bodyId]) return;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(!isAutoPageSize($(selectId)?.value)) return;
    const rows=[...body.querySelectorAll('tr')].filter(tr=>!tr.querySelector('.table-empty'));
    if(!rows.length) return;
    void wrap.offsetHeight;
    const head=table.querySelector('thead');
    const headH=head?Math.ceil(head.getBoundingClientRect().height):0;
    const avail=Math.max(0,Math.floor(wrap.clientHeight)-headH);
    const natural=rows.reduce((sum,tr)=>sum+Math.ceil(tr.getBoundingClientRect().height),0);
    const rowH=Math.max(38,Math.round(natural/rows.length)||48);
    const overflow=wrap.scrollHeight>wrap.clientHeight+1||natural>avail+1;
    let target=Math.max(5,Math.min(200,Math.floor(avail/rowH)||rows.length));
    if(overflow) target=Math.max(5,Math.min(target,rows.length-1));
    if(target!==rows.length&&render&&!body.dataset.boAutofitSettled){
      AGENT_ADMIN_AUTO_SIZE[bodyId]=target;
      AGENT_ADMIN_AUTOFIT_BUSY[bodyId]=true;
      Promise.resolve(render(true)).finally(()=>{
        AGENT_ADMIN_AUTOFIT_BUSY[bodyId]=false;
        requestAnimationFrame(()=>{
          if(wrap.scrollHeight>wrap.clientHeight+1&&AGENT_ADMIN_AUTO_SIZE[bodyId]>5){
            AGENT_ADMIN_AUTO_SIZE[bodyId]=Math.max(5,AGENT_ADMIN_AUTO_SIZE[bodyId]-1);
            AGENT_ADMIN_AUTOFIT_BUSY[bodyId]=true;
            Promise.resolve(render(true)).finally(()=>{AGENT_ADMIN_AUTOFIT_BUSY[bodyId]=false;evenFillTableRows(bodyId,selectId,render);});
            return;
          }
          body.dataset.boAutofitSettled='1';
          evenFillTableRows(bodyId,selectId,render);
        });
      });
      return;
    }
    if(overflow&&AGENT_ADMIN_AUTO_SIZE[bodyId]>5&&render&&!body.dataset.boAutofitSettled){
      AGENT_ADMIN_AUTO_SIZE[bodyId]=Math.max(5,(AGENT_ADMIN_AUTO_SIZE[bodyId]||rows.length)-1);
      AGENT_ADMIN_AUTOFIT_BUSY[bodyId]=true;
      Promise.resolve(render(true)).finally(()=>{AGENT_ADMIN_AUTOFIT_BUSY[bodyId]=false;evenFillTableRows(bodyId,selectId,render);});
      return;
    }
    body.dataset.boAutofitSettled='1';
    const gap=avail-natural;
    if(gap<2||gap>=rowH) return;
    const base=Math.floor(avail/rows.length);
    let rem=avail-(base*rows.length);
    if(base<=0) return;
    rows.forEach(tr=>{
      const h=base+(rem>0?1:0);
      if(rem>0)rem-=1;
      tr.style.height=h+'px';
      tr.querySelectorAll('td').forEach(td=>{td.style.height=h+'px'});
    });
    table.classList.add('bo-tx-evenfill');
    table.style.height=(avail+headH)+'px';
    if(wrap.scrollHeight>wrap.clientHeight){
      const over=wrap.scrollHeight-wrap.clientHeight;
      const shrink=Math.ceil(over/rows.length)||1;
      rows.forEach(tr=>{
        const h=Math.max(rowH,(parseFloat(tr.style.height)||base)-shrink);
        tr.style.height=h+'px';
        tr.querySelectorAll('td').forEach(td=>{td.style.height=h+'px'});
      });
      table.style.height=Math.max(0,avail+headH-over)+'px';
    }
  }));
}
function bindAutoFitPageSize(selectId,bodyId,render){
  syncAutofitAttr(bodyId,selectId);
  $(selectId)?.addEventListener('change',()=>syncAutofitAttr(bodyId,selectId));
  let resizeTimer=0;
  window.addEventListener('resize',()=>{
    if(!isAutoPageSize($(selectId)?.value)) return;
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{
      const prev=AGENT_ADMIN_AUTO_SIZE[bodyId];
      clearLockedAutoSize(bodyId);
      const next=autoFitPageSize(bodyId);
      if(next!==prev) render(true);
      else evenFillTableRows(bodyId,selectId,render);
    },180);
  });
}
function pageButtons(current,total,dataAttr,label){
  total=Math.max(1,Number(total)||1); current=Math.max(1,Math.min(Number(current)||1,total));
  const pages=[]; const add=n=>{if(n>=1&&n<=total&&!pages.includes(n))pages.push(n);};
  add(1); for(let n=current-2;n<=current+2;n++) add(n); add(total); pages.sort((a,b)=>a-b);
  let html=`<div class="smart-pagination" role="navigation" aria-label="${esc(label||'Table')} pagination">`;
  html+=`<button type="button" class="smart-page first" data-${dataAttr}="1" ${current<=1?'disabled':''} title="First page"><i class="bi bi-chevron-bar-left"></i></button>`;
  html+=`<button type="button" class="smart-page prev" data-${dataAttr}="${Math.max(1,current-1)}" ${current<=1?'disabled':''} title="Previous page"><i class="bi bi-chevron-left"></i></button>`;
  let prev=0; pages.forEach(n=>{if(prev&&n-prev>1)html+='<span class="smart-page-ellipsis">…</span>'; html+=`<button type="button" class="smart-page ${n===current?'active':''}" data-${dataAttr}="${n}" ${n===current?'aria-current="page"':''}>${n}</button>`; prev=n;});
  html+=`<button type="button" class="smart-page next" data-${dataAttr}="${Math.min(total,current+1)}" ${current>=total?'disabled':''} title="Next page"><i class="bi bi-chevron-right"></i></button>`;
  html+=`<button type="button" class="smart-page last" data-${dataAttr}="${total}" ${current>=total?'disabled':''} title="Last page"><i class="bi bi-chevron-bar-right"></i></button></div>`;
  return html;
}
function currentRoutePage(){return location.pathname.split('/').pop()||''}
async function loadAgents(){return await req('/api/admin/brand-agent/list')||[]}

function stabilizeAgentAdminDropdowns(){
  const closeCard=card=>{
    if(!card)return;
    card.classList.remove('agent-admin-select-open');
    card.style.removeProperty('--agent-admin-menu-space');
  };
  const openWrap=wrap=>{
    if(window.innerWidth<=1100||!wrap)return;
    const card=wrap.closest('.filter-card');
    if(!card)return;
    document.querySelectorAll('.filter-card.agent-admin-select-open').forEach(x=>{if(x!==card)closeCard(x)});
    requestAnimationFrame(()=>{
      const menu=wrap.querySelector('.rounded-select-menu');
      const menuHeight=Math.max(96,Math.min(260,menu?.scrollHeight||menu?.getBoundingClientRect?.().height||112));
      card.style.setProperty('--agent-admin-menu-space',(menuHeight+18)+'px');
      card.classList.add('agent-admin-select-open');
    });
  };

  // Reports.js converts native <select> controls to the approved rounded dropdown.
  // Bind both forms so async-created/rebuilt dropdowns behave exactly like Agent Performance.
  document.querySelectorAll('.filter-card select').forEach(sel=>{
    if(sel.dataset.agentAdminMenuBound==='1')return;
    sel.dataset.agentAdminMenuBound='1';
    const card=sel.closest('.filter-card');
    const openNative=()=>{if(window.innerWidth>1100){card?.style.setProperty('--agent-admin-menu-space','130px');card?.classList.add('agent-admin-select-open')}};
    const closeNative=()=>setTimeout(()=>closeCard(card),100);
    sel.addEventListener('mousedown',openNative);
    sel.addEventListener('keydown',e=>{if(['Enter',' ','ArrowDown','ArrowUp'].includes(e.key))openNative()});
    sel.addEventListener('change',closeNative);
    sel.addEventListener('blur',closeNative);
  });

  if(document.documentElement.dataset.agentAdminRoundedBound!=='1'){
    document.documentElement.dataset.agentAdminRoundedBound='1';
    document.addEventListener('click',e=>{
      const btn=e.target.closest('.filter-card .rounded-select-btn');
      if(btn){
        const wrap=btn.closest('.rounded-select-wrap');
        setTimeout(()=>{
          const menu=wrap?.querySelector('.rounded-select-menu');
          if(menu?.classList.contains('show'))openWrap(wrap);else closeCard(wrap?.closest('.filter-card'));
        },0);
        return;
      }
      if(e.target.closest('.filter-card .rounded-select-option')){
        const card=e.target.closest('.filter-card');
        setTimeout(()=>closeCard(card),0);
        return;
      }
      document.querySelectorAll('.filter-card.agent-admin-select-open').forEach(closeCard);
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.filter-card.agent-admin-select-open').forEach(closeCard)});
  }
}

function agentPageActive(runToken,page){return window.__boAgentAdminRunToken===runToken&&currentRoutePage()===page;}

async function agentsPage(runToken){
  let rows=await loadAgents();
  const isActive=()=>agentPageActive(runToken,'agent-management.html');
  if(!isActive())return;
  let currentPage=1;
  const render=(resetPage)=>{
    if(!isActive())return;
    if(resetPage)currentPage=1;
    const q=($('adminAgentSearch')?.value||'').toLowerCase(),st=$('adminAgentStatus')?.value||'', [from,to]=range('adminAgentFrom','adminAgentTo');
    const base=rows.filter(a=>(!q||[a.code,a.name,a.loginUsername].some(v=>String(v||'').toLowerCase().includes(q)))&&inRange(a.createdAt,from,to));
    const activeCount=base.filter(a=>Number(a.status)===1).length;
    const suspendedCount=base.filter(a=>Number(a.status)!==1).length;
    document.querySelector('[data-agent-status-count="1"]')?.replaceChildren(document.createTextNode(`(${activeCount})`));
    document.querySelector('[data-agent-status-count="0"]')?.replaceChildren(document.createTextNode(`(${suspendedCount})`));
    document.querySelector('[data-agent-status-count="all"]')?.replaceChildren(document.createTextNode(`(${base.length})`));
    const all=base.filter(a=>!st||String(a.status)===st);
    /* Tiles read the RAW set (every agent, all time), never the keyword/date-range filtered `all`:
       the owner's rule is that the cards show everything and must not move when the date range or the
       "Show N entries" size changes - only the table follows those. The captions that promised a
       period say "All time" now. */
    const active=rows.filter(a=>Number(a.status)===1).length,pending=rows.reduce((n,a)=>n+(Number(a.pendingSettlement||0)>0?1:0),0),suspended=rows.filter(a=>Number(a.status)!==1).length;
    $('agentAdminMetrics').innerHTML=metric('bi-people','Total Agents',whole(rows.length),'All time')+metric('bi-person-check','Active Agents',whole(active),'Selected period')+metric('bi-hourglass-split','Pending Review',whole(pending),'Settlement pending')+metric('bi-person-x','Suspended',whole(suspended),'Current status');
    const total=all.length,size=pageSizeOf('adminAgentsPageSize','adminAgentsRows'),totalPages=Math.max(1,Math.ceil(total/(Number.isFinite(size)?size:Math.max(total,1))));
    if(currentPage>totalPages)currentPage=totalPages;
    const start=Number.isFinite(size)?(currentPage-1)*size:0;
    const pageRows=Number.isFinite(size)?all.slice(start,start+size):all;
    $('adminAgentsRows').innerHTML=pageRows.map(a=>`<tr><td class="agent-name-cell"><b>${esc(a.code||('AGT'+a.id))}</b><small class="d-block">${esc(a.name||'-')}</small></td><td>${whole(a.memberCount)}</td><td>${whole(a.memberCount)}</td><td>${moneyCell(a.totalBetMtd)}</td><td>${moneyCell(a.commissionMtd)}</td><td>${moneyCell(a.pendingSettlement)}</td><td>${status(Number(a.status)===1?'Active':'Suspended')}</td><td>${esc(d(a.createdAt)||'-')}</td><td><a class="agent-admin-action" title="View Details" href="agent-detail.html?id=${encodeURIComponent(a.id)}"><i class="bi bi-eye"></i></a></td></tr>`).join('')||'<tr><td colspan="9" class="table-empty">No agents found.</td></tr>';
    const from2=total?start+1:0,to2=total?Math.min(start+pageRows.length,total):0;
    $('adminAgentsShowing').textContent=`Showing ${from2} to ${to2} of ${total} entries`;
    $('adminAgentsPager').innerHTML=pageButtons(currentPage,totalPages,'agent-page','Agent table');
    evenFillTableRows('adminAgentsRows','adminAgentsPageSize',render);
  };
  if(!isActive()||!$('adminAgentsPager'))return;
  $('adminAgentsPager').addEventListener('click',e=>{const b=e.target.closest('[data-agent-page]');if(!b||b.disabled)return;currentPage=Number(b.dataset.agentPage)||1;render(false);});
  $('adminAgentsPageSize')?.addEventListener('change',()=>{clearLockedAutoSize('adminAgentsRows');render(true);});
  bindAutoFitPageSize('adminAgentsPageSize','adminAgentsRows',render);
  ['adminAgentFrom','adminAgentTo','adminAgentStatus'].forEach(id=>$(id)?.addEventListener('change',()=>render(true)));
  $('adminAgentSearch')?.addEventListener('input',()=>render(true));
  document.querySelectorAll('[data-agent-status]').forEach(tab=>tab.addEventListener('click',()=>{
    const value=tab.dataset.agentStatus??'';
    const select=$('adminAgentStatus');
    if(select) {
      select.value=value;
      select.dispatchEvent(new Event('change',{bubbles:true}));
    }
    document.querySelectorAll('[data-agent-status]').forEach(x=>{
      const active=x===tab;
      x.classList.toggle('is-active',active);
      x.setAttribute('aria-pressed',String(active));
    });
  }));
  const agentStatusTrack=document.querySelector('.agent-status-tabs');
  if(agentStatusTrack&&window.BO_SEG_BOUNCE){
    window.BO_SEG_BOUNCE.mount(agentStatusTrack,{button:':scope > .bo-tx-tab',anim:'bounce'});
  }
  render(true);
}

async function commissionPage(runToken){
  const agents=await loadAgents();
  const isActive=()=>agentPageActive(runToken,'agent-commission-admin.html');
  if(!isActive())return;
  let currentPage=1;
  async function render(resetPage){
    if(!isActive())return;
    if(resetPage)currentPage=1;
    const q=($('agentCommissionSearch')?.value||'').toLowerCase(),[from,to]=range('agentCommissionFrom','agentCommissionTo');
    const list=agents.filter(a=>!q||[a.code,a.name].some(v=>String(v||'').toLowerCase().includes(q)));
    const startDate=from||new Date().toISOString().slice(0,10),endDate=to&&to>=startDate?to:startDate;
    const dates=[];let cursor=new Date(startDate+'T00:00:00Z'),lastDate=new Date(endDate+'T00:00:00Z');
    while(cursor<=lastDate&&dates.length<366){dates.push(cursor.toISOString().slice(0,10));cursor.setUTCDate(cursor.getUTCDate()+1);}
    const reports=await Promise.all(list.map(async a=>{
      const daily=await Promise.all(dates.map(day=>req('/api/admin/brand-agent/'+a.id+'/report?date='+encodeURIComponent(day)).catch(()=>({}))));
      const r=daily.reduce((sum,item)=>{
        ['totalTurnover','customerLoss','availableCommission'].forEach(key=>{sum[key]=(Number(sum[key])||0)+(Number(item?.[key])||0);});
        return sum;
      },{});
      return {a,r};
    }));
    if(!isActive())return;
    let totalBet=0,pl=0,com=0;
    reports.forEach(x=>{totalBet+=Number(x.r.totalTurnover||0);pl+=Number(x.r.customerLoss||0);com+=Number(x.r.availableCommission||0)});
    $('agentCommissionMetrics').innerHTML=metric('bi-cash-stack','Total Bet','RM '+money(totalBet),'Selected KPI cycles')+metric('bi-graph-up-arrow','Customer P/L','RM '+money(pl),'Loss + / Win -')+metric('bi-percent','Commission','RM '+money(com),'Available commission')+metric('bi-people','Agents',whole(reports.length),'Selected agents');
    const size=pageSizeOf('agentCommissionPageSize','agentCommissionRows'),total=reports.length,totalPages=Math.max(1,Math.ceil(total/(Number.isFinite(size)?size:Math.max(total,1))));
    if(currentPage>totalPages)currentPage=totalPages;
    const start=Number.isFinite(size)?(currentPage-1)*size:0;
    const pageReports=Number.isFinite(size)?reports.slice(start,start+size):reports;
    $('agentCommissionRows').innerHTML=pageReports.map(({a,r})=>
      '<tr><td><b>'+esc(a.code)+'</b><small class="d-block">'+esc(a.name)+'</small></td><td>'+whole(a.memberCount)+'</td><td>RM '+money(r.totalTurnover)+'</td><td class="'+(Number(r.customerLoss||0)>=0?'money-positive':'money-negative')+'">RM '+money(r.customerLoss)+'</td><td>'+money(a.commissionPercent)+'%</td><td>RM '+money(r.availableCommission)+'</td><td>RM '+money(a.walletBalance)+'</td></tr>'
    ).join('')||'<tr><td colspan="7" class="table-empty">No commission records.</td></tr>';
    const from2=total?start+1:0,to2=total?Math.min(start+pageReports.length,total):0;
    $('agentCommissionShowing').textContent='Showing '+from2+' to '+to2+' of '+total+' entries';
    $('agentCommissionPager').innerHTML=pageButtons(currentPage,totalPages,'commission-page','Commission table');
    evenFillTableRows('agentCommissionRows','agentCommissionPageSize',render);
  }
  $('agentCommissionSearch')?.addEventListener('input',()=>render(true));
  $('agentCommissionFrom')?.addEventListener('change',()=>render(true));
  $('agentCommissionTo')?.addEventListener('change',()=>render(true));
  $('agentCommissionPageSize')?.addEventListener('change',()=>{clearLockedAutoSize('agentCommissionRows');render(true);});
  $('agentCommissionPager')?.addEventListener('click',e=>{const b=e.target.closest('[data-commission-page]');if(!b||b.disabled)return;currentPage=Number(b.dataset.commissionPage)||1;render(false);});
  bindAutoFitPageSize('agentCommissionPageSize','agentCommissionRows',render);
  await render(true);
}
/* One row's action cell. The settlement queue has two steps and they used to live on two pages:
   PENDING -> Approve / Reject was the Agent Settlement tab, APPROVED -> Mark Paid was the
   Withdraw / Payout tab. That tab was deleted on the grounds that both screens read the same rows
   (they do - `settlementData()`), but only the rows were carried over, so the mark-paid step had no
   button on the screen that kept the table: an APPROVED row's Action cell rendered empty and the
   status could not leave APPROVED. Both steps are here now, and PAID / REJECTED are final. */
function settlementActionButtons(x){
  const st=String(x.settlementStatus||'').toUpperCase();
  if(st==='PENDING')return `<button class="approve-btn" data-settle-approve="${x.id}" title="Approve"><i class="bi bi-check-lg"></i></button><button class="reject-btn" data-settle-reject="${x.id}" title="Reject"><i class="bi bi-x-lg"></i></button>`;
  if(st==='APPROVED')return `<button class="pay-btn" data-settle-pay="${x.id}" title="Mark Paid"><i class="bi bi-cash-stack"></i></button>`;
  return '';
}
async function settlementData(){return await req('/api/admin/brand-agent/settlements')||[]}
async function settlementPage(runToken){let rows=await settlementData();const isActive=()=>agentPageActive(runToken,'agent-settlement-admin.html');if(!isActive())return;let currentPage=1;const render=resetPage=>{if(!isActive())return;if(resetPage)currentPage=1;const q=($('agentSettlementAdminSearch')?.value||'').toLowerCase(),st=$('agentSettlementAdminStatus')?.value||'', [from,to]=range('agentSettlementAdminFrom','agentSettlementAdminTo');const base=rows.filter(x=>(!q||[x.id,x.agentCode,x.agentName].some(v=>String(v||'').toLowerCase().includes(q)))&&inRange(x.createdAt,from,to));const stOf=x=>String(x.settlementStatus||'').toUpperCase();['PENDING','APPROVED','PAID','REJECTED'].forEach(s=>{document.querySelector('[data-status-count="'+s+'"]')?.replaceChildren(document.createTextNode('('+base.filter(x=>stOf(x)===s).length+')'))});document.querySelector('[data-status-count="all"]')?.replaceChildren(document.createTextNode('('+base.length+')'));const filtered=base.filter(x=>!st||stOf(x)===st);const pending=filtered.filter(x=>String(x.settlementStatus).toUpperCase()==='PENDING');/* Tiles: all time (raw rows), not the filtered/paged view - see agentsPage above. */const tileSt=x=>String(x.settlementStatus).toUpperCase();const tile=rows;$('agentSettlementMetrics').innerHTML=metric('bi-people','Pending Count',whole(tile.filter(x=>tileSt(x)==='PENDING').length),'Overview total')+metric('bi-cash-stack','Pending Amount','RM '+money(tile.filter(x=>tileSt(x)==='PENDING').reduce((a,x)=>a+Number(x.requestedAmount||0),0)),'Overview total')+metric('bi-check2-circle','Approved',whole(tile.filter(x=>tileSt(x)==='APPROVED').length),'All time')+metric('bi-wallet2','Paid',whole(tile.filter(x=>tileSt(x)==='PAID').length),'All time');const size=pageSizeOf('agentSettlementAdminPageSize','agentSettlementAdminRows'),total=filtered.length,totalPages=Math.max(1,Math.ceil(total/(Number.isFinite(size)?size:Math.max(total,1))));if(currentPage>totalPages)currentPage=totalPages;const start=Number.isFinite(size)?(currentPage-1)*size:0,pageRows=Number.isFinite(size)?filtered.slice(start,start+size):filtered;$('agentSettlementAdminRows').innerHTML=pageRows.map(x=>`<tr><td>${esc(dt(x.createdAt))}</td><td><b>${esc(x.agentName||'-')}</b><small class="d-block">${esc(x.agentCode||'')}</small></td><td>${esc(x.periodFrom||x.settlementMonth)} - ${esc(x.periodTo||'')}</td><td>RM ${money(x.totalTurnover)}</td><td class="${Number(x.houseWin||0)>=0?'money-positive':'money-negative'}">RM ${money(x.houseWin)}</td><td><b>RM ${money(x.requestedAmount)}</b></td><td>${x.bankName?esc(x.bankName)+(x.bankAccountNumber?'<small class="d-block">**** '+esc(String(x.bankAccountNumber).slice(-4))+'</small>':''):'Registered payout account'}</td><td>${status(x.settlementStatus)}</td><td>${esc(x.paymentReference||'-')}</td><td><div class="agent-approval-actions">${settlementActionButtons(x)}</div></td></tr>`).join('')||'<tr><td colspan="10" class="table-empty">No settlement requests.</td></tr>';$('agentSettlementAdminShowing').textContent='Showing '+(total?start+1:0)+' to '+(total?Math.min(start+pageRows.length,total):0)+' of '+total+' entries';$('agentSettlementAdminPager').innerHTML=pageButtons(currentPage,totalPages,'settlement-page','Settlement table');evenFillTableRows('agentSettlementAdminRows','agentSettlementAdminPageSize',render);};['agentSettlementAdminSearch','agentSettlementAdminFrom','agentSettlementAdminTo','agentSettlementAdminStatus'].forEach(id=>$(id)?.addEventListener(id==='agentSettlementAdminSearch'?'input':'change',()=>render(true)));$('agentSettlementAdminPageSize')?.addEventListener('change',()=>{clearLockedAutoSize('agentSettlementAdminRows');render(true);});$('agentSettlementAdminPager')?.addEventListener('click',e=>{const b=e.target.closest('[data-settlement-page]');if(!b||b.disabled)return;currentPage=Number(b.dataset.settlementPage)||1;render(false);});bindAutoFitPageSize('agentSettlementAdminPageSize','agentSettlementAdminRows',render);document.querySelectorAll('[data-status-pill]').forEach(tab=>tab.addEventListener('click',()=>{const value=tab.dataset.statusPill??'';const select=$('agentSettlementAdminStatus');if(select){select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelectorAll('[data-status-pill]').forEach(x=>{const on=x===tab;x.classList.toggle('is-active',on);x.setAttribute('aria-pressed',String(on));});}));const settlementStatusTrack=document.querySelector('.agent-status-tabs');if(settlementStatusTrack&&window.BO_SEG_BOUNCE){window.BO_SEG_BOUNCE.mount(settlementStatusTrack,{button:':scope > .bo-tx-tab',anim:'bounce'});}$('agentSettlementAdminRows').onclick=async e=>{const ap=e.target.closest('[data-settle-approve]'),rj=e.target.closest('[data-settle-reject]'),pay=e.target.closest('[data-settle-pay]');if(ap){await req('/api/admin/brand-agent/settlement/'+ap.dataset.settleApprove+'/approve',{method:'POST',body:'{}'});rows=await settlementData();render(true)}if(rj){const reason=await BO_DIALOG.prompt('Enter rejection reason','',{title:'Reject Settlement',inputLabel:'Reason'});if(reason){await req('/api/admin/brand-agent/settlement/'+rj.dataset.settleReject+'/reject',{method:'POST',body:JSON.stringify({reason})});rows=await settlementData();render(true)}}if(pay){const ref=await BO_DIALOG.prompt('Enter payment reference','',{title:'Mark Settlement Paid',inputLabel:'Payment reference'});if(ref==null)return;await req('/api/admin/brand-agent/settlement/'+pay.dataset.settlePay+'/pay',{method:'POST',body:JSON.stringify({paymentReference:ref})});rows=await settlementData();render(true)}};render(true);}

async function claimPage(runToken){
  let rows=await req('/api/admin/brand-agent/ad-claims')||[];
  const isActive=()=>agentPageActive(runToken,'agent-reimbursement-admin.html');
  if(!isActive())return;
  let currentPage=1;
  const claimDate=x=>x.createdAt||x.created_at||x.submittedAt||x.submitted_at||x.claimDate||x.claim_date||x.date;
  const render=resetPage=>{
    if(!isActive())return;
    if(resetPage)currentPage=1;
    const q=($('agentClaimSearch')?.value||'').toLowerCase(),st=$('agentClaimStatus')?.value||'', [from,to]=range('agentClaimFrom','agentClaimTo');
    const base=rows.filter(x=>(!q||[x.id,x.agentCode,x.agentName].some(v=>String(v||'').toLowerCase().includes(q)))&&inRange(claimDate(x),from,to));
    const clStOf=x=>String(x.status||'').toUpperCase();
    ['PENDING','APPROVED','REJECTED'].forEach(s=>{document.querySelector('[data-status-count="'+s+'"]')?.replaceChildren(document.createTextNode('('+base.filter(x=>clStOf(x)===s).length+')'))});
    document.querySelector('[data-status-count="all"]')?.replaceChildren(document.createTextNode('('+base.length+')'));
    const filtered=base.filter(x=>!st||clStOf(x)===st);
    const clPending=filtered.filter(x=>clStOf(x)==='PENDING');
    /* Tiles: all time (raw rows), not the filtered/paged view - see agentsPage above. */
    const tile=rows;
    $('agentClaimMetrics').innerHTML=metric('bi-people','Pending Count',whole(tile.filter(x=>clStOf(x)==='PENDING').length),'Overview total')+metric('bi-cash-stack','Pending Amount','RM '+money(tile.filter(x=>clStOf(x)==='PENDING').reduce((a,x)=>a+Number(x.amount||0),0)),'Overview total')+metric('bi-check2-circle','Approved',whole(tile.filter(x=>clStOf(x)==='APPROVED').length),'All time')+metric('bi-x-octagon','Rejected',whole(tile.filter(x=>clStOf(x)==='REJECTED').length),'All time');
    const size=pageSizeOf('agentClaimPageSize','agentClaimRows'),total=filtered.length,totalPages=Math.max(1,Math.ceil(total/(Number.isFinite(size)?size:Math.max(total,1))));
    if(currentPage>totalPages)currentPage=totalPages;
    const start=Number.isFinite(size)?(currentPage-1)*size:0;
    const pageRows=Number.isFinite(size)?filtered.slice(start,start+size):filtered;
    $('agentClaimRows').innerHTML=pageRows.map(x=>'<tr><td>'+esc(dt(claimDate(x)))+'</td><td><b>'+esc(x.agentName||'-')+'</b><small class="d-block">ID: '+esc(x.agentId)+' ? '+esc(x.agentCode||'')+'</small></td><td><span class="badge text-bg-light">Ad Claim</span></td><td><b>'+money(x.amount)+'</b></td><td>AD-'+esc(x.id)+'</td><td>'+status(x.status)+'</td><td>'+(x.proofImageUrl?'<a class="agent-proof-link" href="'+esc(x.proofImageUrl)+'" target="_blank"><i class="bi bi-image"></i> View proof</a>':'-')+'</td><td><div class="agent-approval-actions">'+(String(x.status).toUpperCase()==='PENDING'?'<button class="approve-btn" data-claim-approve="'+x.id+'"><i class="bi bi-check-lg"></i></button><button class="reject-btn" data-claim-reject="'+x.id+'"><i class="bi bi-x-lg"></i></button>':'')+'</div></td></tr>').join('')||'<tr><td colspan="8" class="table-empty">No reimbursement / ad claim requests.</td></tr>';
    const from2=total?start+1:0,to2=total?Math.min(start+pageRows.length,total):0;
    $('agentClaimShowing').textContent='Showing '+from2+' to '+to2+' of '+total+' entries';
    $('agentClaimPager').innerHTML=pageButtons(currentPage,totalPages,'claim-page','Claim table');
    evenFillTableRows('agentClaimRows','agentClaimPageSize',render);
  };
  $('agentClaimSearch')?.addEventListener('input',()=>render(true));
  $('agentClaimFrom')?.addEventListener('change',()=>render(true));
  $('agentClaimTo')?.addEventListener('change',()=>render(true));
  $('agentClaimStatus')?.addEventListener('change',()=>render(true));
  $('agentClaimPageSize')?.addEventListener('change',()=>{clearLockedAutoSize('agentClaimRows');render(true);});
  $('agentClaimPager')?.addEventListener('click',e=>{const b=e.target.closest('[data-claim-page]');if(!b||b.disabled)return;currentPage=Number(b.dataset.claimPage)||1;render(false);});
  bindAutoFitPageSize('agentClaimPageSize','agentClaimRows',render);
  document.querySelectorAll('[data-status-pill]').forEach(tab=>tab.addEventListener('click',()=>{const value=tab.dataset.statusPill??'';const select=$('agentClaimStatus');if(select){select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelectorAll('[data-status-pill]').forEach(x=>{const on=x===tab;x.classList.toggle('is-active',on);x.setAttribute('aria-pressed',String(on));});}));
  const claimStatusTrack=document.querySelector('.agent-status-tabs');
  if(claimStatusTrack&&window.BO_SEG_BOUNCE){window.BO_SEG_BOUNCE.mount(claimStatusTrack,{button:':scope > .bo-tx-tab',anim:'bounce'});}
  $('agentClaimRows').onclick=async e=>{
    const ap=e.target.closest('[data-claim-approve]'),rj=e.target.closest('[data-claim-reject]');
    if(ap){await req('/api/admin/brand-agent/ad-claim/'+ap.dataset.claimApprove+'/approve',{method:'POST',body:'{}'});rows=await req('/api/admin/brand-agent/ad-claims')||[];render(true);}
    if(rj){const reason=await BO_DIALOG.prompt('Enter rejection reason','',{title:'Reject Ad Claim',inputLabel:'Reason'});if(reason){await req('/api/admin/brand-agent/ad-claim/'+rj.dataset.claimReject+'/reject',{method:'POST',body:JSON.stringify({reason})});rows=await req('/api/admin/brand-agent/ad-claims')||[];render(true);}}
  };
  render(true);
}
async function promotionPage(runToken){
  const isActive=()=>agentPageActive(runToken,'agent-promotion-admin.html');
  if(!isActive())return;
  let currentPage=1,rows=[];
  const render=async resetPage=>{
    if(!isActive())return;
    if(resetPage)currentPage=1;
    const [from,to]=range('agentPromotionFrom','agentPromotionTo'),q=($('agentPromotionSearch')?.value||'').toLowerCase();
    try{rows=await req('/api/admin/operations/promotion-report?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to))||[]}catch(e){rows=[];}
    if(!isActive())return;
    const filtered=rows.filter(x=>!q||[x.name,x.promotionCode].some(v=>String(v||'').toLowerCase().includes(q)));
    const size=pageSizeOf('agentPromotionPageSize','agentPromotionRows'),total=filtered.length,totalPages=Math.max(1,Math.ceil(total/(Number.isFinite(size)?size:Math.max(total,1))));
    if(currentPage>totalPages)currentPage=totalPages;
    const start=Number.isFinite(size)?(currentPage-1)*size:0,pageRows=Number.isFinite(size)?filtered.slice(start,start+size):filtered;
    $('agentPromotionRows').innerHTML=pageRows.map(x=>'<tr><td><b>'+esc(x.name||'-')+'</b><small class="d-block">'+esc(x.promotionCode||'')+'</small></td><td>'+whole(x.claimCount)+'</td><td>'+whole(x.uniqueClaimers)+'</td><td>RM '+money(x.payoutAmount)+'</td><td>'+whole(x.repeatedClaimCount)+'</td></tr>').join('')||'<tr><td colspan="5" class="table-empty">No promotion activity.</td></tr>';
    $('agentPromotionShowing').textContent='Showing '+(total?start+1:0)+' to '+(total?Math.min(start+pageRows.length,total):0)+' of '+total+' entries';
    $('agentPromotionPager').innerHTML=pageButtons(currentPage,totalPages,'promotion-page','Promotion table');
    evenFillTableRows('agentPromotionRows','agentPromotionPageSize',render);
  };
  ['agentPromotionFrom','agentPromotionTo'].forEach(id=>$(id)?.addEventListener('change',()=>render(true)));
  $('agentPromotionSearch')?.addEventListener('input',()=>render(true));
  $('agentPromotionPageSize')?.addEventListener('change',()=>{clearLockedAutoSize('agentPromotionRows');render(true);});
  $('agentPromotionPager')?.addEventListener('click',e=>{const b=e.target.closest('[data-promotion-page]');if(!b||b.disabled)return;currentPage=Number(b.dataset.promotionPage)||1;render(false);});
  bindAutoFitPageSize('agentPromotionPageSize','agentPromotionRows',render);
  await render(true);
}

const AGENT_ADMIN_PAGES={'agent-management.html':1,'agent-commission-admin.html':1,'agent-settlement-admin.html':1,'agent-reimbursement-admin.html':1,'agent-promotion-admin.html':1};
async function init(){
  const requestedPage=currentRoutePage();
  const runToken=(window.__boAgentAdminRunToken||0)+1;
  window.__boAgentAdminRunToken=runToken;
  /* Shared by six pages, so a swap between two of them keeps the already-executed copy and runs
     only its registered listeners - and the listener below fires on EVERY swap, including into
     pages that are not ours. Leave before any DOM work when the document that just arrived is
     not one of the six. */
  if(!AGENT_ADMIN_PAGES[requestedPage])return;
  BO_AUTH.requireLogin();await BO_AUTH.refreshMe();
  /* refreshMe() is asynchronous. A fast SPA tab/page switch can complete before it returns;
     in that case this is an old page boot and must not touch the newly mounted page. */
  if(currentRoutePage()!==requestedPage||window.__boAgentAdminRunToken!==runToken)return;
  stabilizeAgentAdminDropdowns();const p=requestedPage;try{if(p==='agent-management.html')await agentsPage(runToken);else if(p==='agent-commission-admin.html')await commissionPage(runToken);else if(p==='agent-settlement-admin.html')await settlementPage(runToken);else if(p==='agent-reimbursement-admin.html')await claimPage(runToken);else if(p==='agent-promotion-admin.html')await promotionPage(runToken);}catch(e){console.error(e);window.BO_DIALOG?.alert?.(e.message,{title:'Agent Management',type:'error'});}finally{if(agentPageActive(runToken,requestedPage))stabilizeAgentAdminDropdowns();}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
/* Every entry, not only the first. Measured from promotion.html -> Agents -> its tabs: the FIRST
   tab rendered, and every later one showed no cards and no rows until a reload. This file had
   first run during that first swap - readyState was already complete, so it registered no
   DOMContentLoaded listener - and the next swaps skipped it as "shared on both pages" with
   nothing in the registry to replay. `bo:spa:content` fires once per swap after the target's
   scripts, so init() runs for every entry; one slot per document and a fresh execution of this
   file replaces the previous closure's listener instead of stacking another one. */
if(window.__boAgentAdminSpaBound)document.removeEventListener('bo:spa:content',window.__boAgentAdminSpaBound);
window.__boAgentAdminSpaBound=init;
document.addEventListener('bo:spa:content',window.__boAgentAdminSpaBound);
})();
