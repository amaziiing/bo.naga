(()=>{'use strict';
const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Number(v||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
const num=v=>Number(v||0).toLocaleString('en-MY');
let merchantPageSize=10;
const MARKS=['','teal','violet','amber','rose','slate'];
/** Temporary: hide report rows until real data is ready. Set false to restore API display. */
const FORCE_EMPTY_UI=false;

let currentMerchants=[];
let merchantMeta=[];
let filteredMerchants=[];
let merchantPage=1;
let statusPill='all';
let syncedAt=Date.now();
let currency=(sessionStorage.getItem('bo_main_report_currency')||'MYR').toUpperCase();

async function api(path,opt={}){
  const base=String((window.API_CONFIG&&window.API_CONFIG.BASE_URL)||'').replace(/\/$/,'');
  if(!base) throw new Error('API base URL is not configured');
  const method=opt.method||'GET';
  const headers={...BO_AUTH.authHeader(),'X-Brand-Id':'1'};
  if(opt.body!==undefined) headers['Content-Type']='application/json';
  const r=await fetch(base+path,{method,headers,body:opt.body===undefined?undefined:JSON.stringify(opt.body),cache:'no-store'});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.status==='error') throw new Error(j.message||'Request failed');
  return j.data??j;
}

function addDay(v){
  const a=String(v||'').split('-').map(Number);
  if(a.length!==3||!a[0]) return v;
  return new Date(Date.UTC(a[0],a[1]-1,a[2]+1)).toISOString().slice(0,10);
}
function qs(){return '?from='+encodeURIComponent($('reportDateFrom').value)+'&to='+encodeURIComponent(addDay($('reportDateTo').value));}

function currencyLabel(){
  return currency||window.BO_MAIN_CURRENCY?.code?.()||'MYR';
}
function updateCurrencyLabels(){
  document.querySelectorAll('.mre-cur-label').forEach(el=>{el.textContent='('+currencyLabel()+')';});
}

function setupTabs(){
  document.querySelectorAll('[data-report-tab]').forEach(b=>b.addEventListener('click',()=>{
    if(b.tagName==='A' && b.getAttribute('href')) return;
    document.querySelectorAll('.mre-tabs .mad-tab').forEach(x=>{
      const on=x===b;
      x.classList.toggle('is-active',on);
      x.setAttribute('aria-selected',on?'true':'false');
    });
    document.querySelectorAll('[data-report-panel]').forEach(x=>{
      x.classList.toggle('d-none',x.dataset.reportPanel!==b.dataset.reportTab);
    });

  }));
}

function initials(name,code){
  const raw=String(name||code||'MC').trim();
  const parts=raw.split(/\s+/).filter(Boolean);
  if(parts.length>=2) return (parts[0].charAt(0)+parts[1].charAt(0)).toUpperCase();
  const c=String(code||raw).replace(/[^A-Za-z0-9]/g,'');
  return (c.substring(0,2)||'MC').toUpperCase();
}
function markClass(i){const m=MARKS[i%MARKS.length];return m?(' is-'+m):'';}

function tierKey(x){
  const t=x.tier??x.merchantTier??x.brandTier??x.level;
  if(t===1||t==='1'||/tier\s*1|enterprise/i.test(String(t))) return '1';
  if(t===2||t==='2'||/tier\s*2|growth/i.test(String(t))) return '2';
  if(t===3||t==='3'||/tier\s*3|standard/i.test(String(t))) return '3';
  const charge=Math.abs(Number(x.brandCharge||x.turnover||0));
  if(charge>=1000000) return '1';
  if(charge>=100000) return '2';
  return '3';
}
function tierLabel(key){
  return ({1:'Tier 1 Enterprise',2:'Tier 2 Growth',3:'Tier 3 Standard'})[key]||'Tier 3 Standard';
}
function merchantStatus(x){
  const s=String(x.status||x.brandStatus||x.merchantStatus||'').toLowerCase();
  if(s==='suspended'||s==='suspend'||s==='disabled'||s==='0'||s==='2') return 'suspended';
  if(s==='active'||s==='1'||s==='enabled') return 'active';
  return Number(x.turnover||x.totalBet||0)===0 ? 'suspended' : 'active';
}

function normalizeMerchants(rows){
  const meta=new Map((merchantMeta||[]).map(x=>[String(x.id??x.brandId??''),x]));
  const grouped=new Map();
  (rows||[]).forEach(x=>{
    const id=x.brandId??x.merchantId??x.id??x.brandCode??x.merchantCode??x.code??'';
    const key=String(id);
    let g=grouped.get(key);
    if(!g){
      g={...x,brandId:x.brandId??x.merchantId??x.id,brandCode:x.brandCode||x.merchantCode||x.code||'',brandName:x.brandName||x.merchantName||x.name||'',totalBet:0,validBet:0,totalIn:0,totalOut:0,houseResult:0,betCount:0};
      grouped.set(key,g);
    }
    const bet=Number(x.totalBet!=null?x.totalBet:(x.turnover||0));
    const valid=Number(x.validBet!=null?x.validBet:(x.totalValidBet!=null?x.totalValidBet:bet));
    const wl=Number(x.houseResult!=null?x.houseResult:(x.winLose!=null?x.winLose:(x.totalWinLose||0)));
    const out=Number(x.totalOut!=null?x.totalOut:Math.max(valid-wl,0));
    const inn=Number(x.totalIn!=null?x.totalIn:(out+wl));
    g.totalBet+=bet; g.validBet+=valid; g.totalIn+=inn; g.totalOut+=Math.max(out,0); g.houseResult+=wl; g.betCount+=Number(x.betCount||x.txnCount||x.transactionCount||0);
  });
  return [...grouped.values()].map((x,i)=>{
    const id=x.brandId??x.merchantId??x.id??x.brandCode;
    const m=meta.get(String(id))||{};
    const code=String(m.code||m.brandCode||x.brandCode||x.merchantCode||x.code||'');
    const name=m.name||m.brandName||x.brandName||x.merchantName||code||'-';
    const statusRaw=m.status??m.brandStatus??x.status??x.brandStatus;
    const status=(statusRaw===0||statusRaw==='0'||/suspend|disable/i.test(String(statusRaw||'')))?'suspended':'active';
    const tier=tierKey({...x,...m});
    const validBet=Number(x.validBet||0), winLose=Number(x.houseResult||0);
    return {raw:x,id,code,name,initials:initials(name,code),mark:markClass(i),tier,tierLabel:tierLabel(tier),status,totalBet:Number(x.totalBet||0),validBet,totalIn:Number(x.totalIn||0),totalOut:Number(x.totalOut||0),winLose,winLosePct:validBet?(winLose/validBet*100):0,txns:Number(x.betCount||0)};
  });
}
function updateSyncLabel(){
  const el=$('reportSyncLabel');
  if(!el) return;
  const mins=Math.max(0,Math.floor((Date.now()-syncedAt)/60000));
  const text=mins<1?'Synced just now':('Synced '+mins+' min ago');
  el.innerHTML='<i class="bi bi-arrow-repeat" aria-hidden="true"></i> '+text;
}

function updateCounts(){
  const total=currentMerchants.length;
  const active=currentMerchants.filter(r=>r.status==='active').length;
  const suspended=currentMerchants.filter(r=>r.status==='suspended').length;
  const set=(id,v)=>{const el=$(id); if(el) el.textContent=v;};
  set('mmrCountAll',total);
  set('mmrCountActive',active);
  set('mmrCountSuspended',suspended);
}

function pageButtons(current,total){
  total=Math.max(1,Number(total)||1);
  current=Math.max(1,Math.min(Number(current)||1,total));
  const pages=[];
  const addPage=n=>{if(n>=1&&n<=total&&!pages.includes(n)) pages.push(n);};
  addPage(1);
  for(let n=current-2;n<=current+2;n++) addPage(n);
  addPage(total);
  pages.sort((a,b)=>a-b);
  let html='<button type="button" class="smart-page nav-text" data-page="'+Math.max(1,current-1)+'" '+(current<=1?'disabled':'')+'>Previous</button>';
  let prev=0;
  pages.forEach(n=>{
    if(prev&&n-prev>1) html+='<span class="smart-page-ellipsis">…</span>';
    html+='<button type="button" class="smart-page '+(n===current?'active':'')+'" data-page="'+n+'" '+(n===current?'aria-current="page"':'')+'>'+n+'</button>';
    prev=n;
  });
  html+='<button type="button" class="smart-page nav-text" data-page="'+Math.min(total,current+1)+'" '+(current>=total?'disabled':'')+'>Next</button>';
  return html;
}

function winLoseHtml(v,pct){
  const n=Number(v||0);
  const cls=n>0?'is-pos':n<0?'is-neg':'is-flat';
  const sign=n>0?'+':'';
  return `<span class="mmr-wl ${cls}"><b>${sign}${money(n)}</b><em>${money(Math.abs(pct))}%</em></span>`;
}

function applyFilters(){
  const q=($('mmrSearchInput')?.value||'').trim().toLowerCase();
  const tier=$('mmrTierFilter')?.value||'';
  const st=$('mmrStatusFilter')?.value||'';
  filteredMerchants=currentMerchants.filter(row=>{
    if(statusPill!=='all'&&row.status!==statusPill) return false;
    if(st&&row.status!==st) return false;
    if(tier&&row.tier!==tier) return false;
    if(q){
      const hay=[row.name,row.code,row.tierLabel].join(' ').toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  merchantPage=1;
  renderTable();
}

function renderTable(){
  const tbody=$('mmrTableRows');
  const foot=$('mmrTableFoot');
  const pager=$('mmrPager');
  const info=$('mmrTableInfo');
  if(!tbody) return;

  const total=filteredMerchants.length;
  const totalPages=Math.max(1,Math.ceil(total/merchantPageSize)||1);
  merchantPage=Math.max(1,Math.min(merchantPage,totalPages));
  const start=(merchantPage-1)*merchantPageSize;
  const rows=filteredMerchants.slice(start,start+merchantPageSize);

  if(pager) pager.innerHTML=pageButtons(merchantPage,totalPages);
  if(info){
    info.textContent=total
      ? ('Showing '+(start+1)+' to '+(start+rows.length)+' of '+total+' merchants')
      : 'Showing 0 to 0 of 0 merchants';
  }

  const sumBet=filteredMerchants.reduce((s,r)=>s+r.totalBet,0);
  const sumValid=filteredMerchants.reduce((s,r)=>s+r.validBet,0);
  const sumIn=filteredMerchants.reduce((s,r)=>s+r.totalIn,0);
  const sumOut=filteredMerchants.reduce((s,r)=>s+r.totalOut,0);
  const sumWl=filteredMerchants.reduce((s,r)=>s+r.winLose,0);
  if($('mmrTotalBet')) $('mmrTotalBet').textContent=money(sumBet);
  if($('mmrTotalValid')) $('mmrTotalValid').textContent=money(sumValid);
  if($('mmrTotalIn')) $('mmrTotalIn').textContent=money(sumIn);
  if($('mmrTotalOut')) $('mmrTotalOut').textContent=money(sumOut);
  if($('mmrTotalWinLose')){
    const el=$('mmrTotalWinLose');
    const sign=sumWl>0?'+':'';
    el.textContent=sign+money(sumWl);
    el.classList.toggle('is-pos',sumWl>0);
    el.classList.toggle('is-neg',sumWl<0);
  }
  if(foot) foot.hidden=!total;

  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="7" class="mad-empty">No merchant report data for this date range.</td></tr>';
    return;
  }

  tbody.innerHTML=rows.map(r=>{
    const codeLabel=r.code?('#'+r.code):'';
    const txnLabel=r.txns? (num(r.txns)+' txns') : '';
    return `<tr>
      <td><div class="mmr-merchant"><span class="mmr-mark${r.mark}">${esc(r.initials)}</span>
        <div class="mmr-merchant-copy"><b>${esc(r.name)}${codeLabel?` <span class="mmr-code">${esc(codeLabel)}</span>`:''}</b>
        <small>${esc(r.tierLabel)}</small></div></div></td>
      <td class="mre-num"><b>${money(r.totalBet)}</b></td>
      <td class="mre-num"><b>${money(r.validBet)}</b></td>
      <td class="mre-num"><div class="mmr-stack"><b>${money(r.totalIn)}</b>${txnLabel?`<small>${esc(txnLabel)}</small>`:''}</div></td>
      <td class="mre-num"><b>${money(r.totalOut)}</b></td>
      <td class="mre-num">${winLoseHtml(r.winLose,r.winLosePct)}</td>
      <td><div class="mmr-actions mad-actions">
        <button class="mad-icon-btn" type="button" title="View" data-mmr-view="${esc(String(r.id||''))}"><i class="bi bi-eye"></i></button>
        <button class="mad-icon-btn" type="button" title="Download" data-mmr-dl="${esc(String(r.id||r.code||''))}"><i class="bi bi-download"></i></button>
      </div></td>
    </tr>`;
  }).join('');
}

function showEmpty(){
  currentMerchants=[];
  filteredMerchants=[];
  updateCounts();
  applyFilters();
}

async function load(){
  if(FORCE_EMPTY_UI){
    showEmpty();
    syncedAt=Date.now();
    updateSyncLabel();
    return;
  }
  try{
    const [d,merchants]=await Promise.all([api('/admin/main/reports/provider-settlement'+qs()),api('/admin/merchants').catch(()=>api('/admin/brands').catch(()=>[]))]);
    merchantMeta=Array.isArray(merchants)?merchants:(merchants?.rows||merchants?.items||[]);
    currentMerchants=normalizeMerchants(d.brands||[]);
    updateCounts();
    applyFilters();
    syncedAt=Date.now();
    updateSyncLabel();
    document.dispatchEvent(new CustomEvent('merchant-report-range-changed'));
  }catch(e){
    console.error(e);
    currentMerchants=[];
    filteredMerchants=[];
    updateCounts();
    const tbody=$('mmrTableRows');
    if(tbody) tbody.innerHTML=`<tr><td colspan="7" class="mad-empty text-danger">${esc((/failed to fetch|networkerror|load failed/i.test(String(e.message||''))?'Unable to reach server. Start local API on :8080 or open the BO on the same host as /api.':e.message)||'Unable to load merchant report')}</td></tr>`;
    const foot=$('mmrTableFoot');
    if(foot) foot.hidden=true;
    const info=$('mmrTableInfo');
    if(info) info.textContent='Showing 0 to 0 of 0 merchants';
    const pager=$('mmrPager');
    if(pager) pager.innerHTML='';
  }
}

function exportCsv(){
  const head=['Merchant','Code','Tier','Status','Total Bet','Total ValidBet','Total In','Total Out','Total Win/Lose','Win/Lose %'];
  const lines=[head,...filteredMerchants.map(r=>[r.name,r.code,r.tierLabel,r.status,r.totalBet,r.validBet,r.totalIn,r.totalOut,r.winLose,r.winLosePct.toFixed(2)])];
  const blob=new Blob([lines.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`merchant-report-${$('reportDateFrom').value}-${$('reportDateTo').value}.csv`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
}

function setupFilters(){
  document.querySelectorAll('[data-mmr-status]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      statusPill=btn.getAttribute('data-mmr-status')||'all';
      document.querySelectorAll('[data-mmr-status]').forEach(b=>b.classList.toggle('is-active',b===btn));
      applyFilters();
    });
  });
  let searchTimer=null;
  $('mmrSearchInput')?.addEventListener('input',()=>{
    clearTimeout(searchTimer);
    searchTimer=setTimeout(applyFilters,180);
  });
  $('mmrSearchInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyFilters();}});
  $('mmrTierFilter')?.addEventListener('change',applyFilters);
  $('mmrStatusFilter')?.addEventListener('change',applyFilters);
  $('mmrResetBtn')?.addEventListener('click',()=>{
    if($('mmrSearchInput')) $('mmrSearchInput').value='';
    if($('mmrTierFilter')) $('mmrTierFilter').value='';
    if($('mmrStatusFilter')) $('mmrStatusFilter').value='';
    statusPill='all';
    document.querySelectorAll('[data-mmr-status]').forEach(b=>b.classList.toggle('is-active',b.getAttribute('data-mmr-status')==='all'));
    applyFilters();
  });
  $('mmrPager')?.addEventListener('click',e=>{
    const b=e.target.closest('[data-page]');
    if(!b||b.disabled) return;
    const totalPages=Math.max(1,Math.ceil(filteredMerchants.length/merchantPageSize));
    const n=Number(b.dataset.page);
    if(n>=1&&n<=totalPages&&n!==merchantPage){merchantPage=n;renderTable();}
  });
  $('mmrPageSize')?.addEventListener('change',e=>{merchantPageSize=Math.max(1,Number(e.target.value)||10);merchantPage=1;renderTable();});
  document.querySelectorAll('[data-currency]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      currency=btn.getAttribute('data-currency')||window.BO_MAIN_CURRENCY?.code?.()||'MYR';
      document.querySelectorAll('[data-currency]').forEach(b=>{
        const on=b===btn;
        b.classList.toggle('is-active',on);
        b.setAttribute('aria-pressed',on?'true':'false');
      });
      updateCurrencyLabels();
    });
  });
  $('reportExport')?.addEventListener('click',exportCsv);
  $('reportSyncLabel')?.addEventListener('click',()=>{load();});
  document.addEventListener('click',e=>{
    const view=e.target.closest('[data-mmr-view]');
    if(view){
      const id=view.getAttribute('data-mmr-view');
      const u=new URL('main-merchant-detail.html',location.href);
      if(id) u.searchParams.set('brandId',id);
      location.href=u.toString();
      return;
    }
    const dl=e.target.closest('[data-mmr-dl]');
    if(dl){
      const id=dl.getAttribute('data-mmr-dl');
      const row=filteredMerchants.find(r=>String(r.id)===String(id)||r.code===id);
      if(!row) return;
      const lines=[['Merchant','Code','Total Bet','Total ValidBet','Total In','Total Out','Total Win/Lose'],[row.name,row.code,row.totalBet,row.validBet,row.totalIn,row.totalOut,row.winLose]];
      const blob=new Blob([lines.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n')],{type:'text/csv'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=`merchant-${row.code||id||'row'}.csv`;
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),500);
    }
  });
}

const pickerState={view:new Date(),mode:'days',yearPageStart:new Date().getFullYear()-5,hover:''};
function pad2(n){return String(n).padStart(2,'0')}
function ymd(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())}
function dmy(v){if(!v)return '';const a=String(v).split('-');return a.length===3?`${a[2]} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(a[1])-1]} ${a[0]}`:v}
function startOfWeek(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-x.getDay());return x}
function endOfWeek(d){const x=startOfWeek(d);x.setDate(x.getDate()+6);return x}
function updateDateLabel(){
  const f=$('reportDateFrom').value,t=$('reportDateTo').value;
  $('reportDateLabel').textContent=f&&t?`${dmy(f)} - ${dmy(t)}`:f?`${dmy(f)} - Select end date`:'Select date range';
}
function markPreset(key){document.querySelectorAll('[data-report-preset]').forEach(b=>b.classList.toggle('active',b.dataset.reportPreset===key))}
function presetRange(key){
  const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  let a=new Date(today),b=new Date(today);
  if(key==='yesterday'){a.setDate(a.getDate()-1);b=new Date(a)}
  if(key==='thisWeek'){a=startOfWeek(today);b=endOfWeek(today)}
  if(key==='lastWeek'){a=startOfWeek(today);a.setDate(a.getDate()-7);b=new Date(a);b.setDate(b.getDate()+6)}
  if(key==='thisMonth'){a=new Date(today.getFullYear(),today.getMonth(),1);b=new Date(today)}
  if(key==='lastMonth'){a=new Date(today.getFullYear(),today.getMonth()-1,1);b=new Date(today.getFullYear(),today.getMonth(),0)}
  if(key==='thisYear'){a=new Date(today.getFullYear(),0,1);b=new Date(today.getFullYear(),11,31)}
  if(key==='lastYear'){a=new Date(today.getFullYear()-1,0,1);b=new Date(today.getFullYear()-1,11,31)}
  return [ymd(a),ymd(b)];
}
function renderCalendar(){
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthBtn=$('reportCalMonth'),yearBtn=$('reportCalYear'),monthGrid=$('reportCalMonthGrid'),yearGrid=$('reportCalYearGrid'),dayView=$('reportCalDayView'),days=$('reportCalDays');
  monthBtn.innerHTML=months[pickerState.view.getMonth()]+' <i class="bi bi-chevron-down"></i>';
  yearBtn.innerHTML=pickerState.view.getFullYear()+' <i class="bi bi-chevron-down"></i>';
  monthGrid.innerHTML=months.map((m,i)=>`<button type="button" data-report-month="${i}" class="${i===pickerState.view.getMonth()?'active':''}">${m}</button>`).join('');
  yearGrid.innerHTML=Array.from({length:12},(_,i)=>pickerState.yearPageStart+i).map(y=>`<button type="button" data-report-year="${y}" class="${y===pickerState.view.getFullYear()?'active':''}">${y}</button>`).join('');
  monthGrid.classList.toggle('show',pickerState.mode==='months');
  yearGrid.classList.toggle('show',pickerState.mode==='years');
  dayView.classList.toggle('hide',pickerState.mode!=='days');
  const y=pickerState.view.getFullYear(),m=pickerState.view.getMonth(),first=new Date(y,m,1),last=new Date(y,m+1,0),start=first.getDay(),total=last.getDate(),from=$('reportDateFrom').value,to=$('reportDateTo').value;
  let html='',prevLast=new Date(y,m,0).getDate();
  for(let i=0;i<start;i++) html+=`<button type="button" class="muted" disabled>${prevLast-start+i+1}</button>`;
  // While only the start is picked, the hovered day previews the far end so the range
  // reads as one continuous strip before anything is committed. Hovering before the start
  // is deliberately ignored: a click there restarts the range, and the preview must not
  // promise something the click will not do.
  const hover=(!to&&from&&pickerState.hover&&pickerState.hover>=from)?pickerState.hover:'';
  const bandEnd=to||hover||'', hasBand=!!(from&&bandEnd);
  for(let d=1;d<=total;d++){
    const val=ymd(new Date(y,m,d));
    const inBand=!!(hasBand&&val>=from&&val<=bandEnd);
    // The anchor is marked as soon as it is picked, band or no band — otherwise the first
    // click looks like it did nothing.
    const isStart=!!(from&&val===from),isEnd=!!(bandEnd&&val===bandEnd);
    const isPreview=!!(hover&&val===hover);
    html+=`<button type="button" data-report-day="${val}" class="${inBand?'in-range':''} ${isStart||isEnd?'selected':''} ${isStart?'is-start':''} ${isEnd?'is-end':''} ${isPreview?'is-preview':''}">${d}</button>`;
  }
  for(let i=1;i<=42-(start+total);i++) html+=`<button type="button" class="muted" disabled>${i}</button>`;
  days.innerHTML=html;
}
function setRange(a,b,preset){
  $('reportDateFrom').value=a||'';
  $('reportDateTo').value=b||'';
  updateDateLabel();
  markPreset(preset||'');
  renderCalendar();
}
function setupDatePicker(){
  const [a,b]=presetRange('today');
  pickerState.view=new Date(a+'T00:00:00');
  setRange(a,b,'today');
  $('reportDateTrigger').addEventListener('click',e=>{e.stopPropagation();$('reportRangePicker').classList.toggle('show');pickerState.mode='days';pickerState.hover='';renderCalendar();});
  document.addEventListener('click',e=>{if(!e.target.closest('.ref-range-wrap')) $('reportRangePicker').classList.remove('show');});
  document.querySelectorAll('[data-report-preset]').forEach(btn=>btn.addEventListener('click',e=>{
    e.stopPropagation();
    const key=btn.dataset.reportPreset,[aa,bb]=presetRange(key);
    pickerState.view=new Date(aa+'T00:00:00');
    setRange(aa,bb,key);
    $('reportRangePicker').classList.remove('show');
    load();
  }));
  $('reportCalPrev').onclick=()=>{if(pickerState.mode==='years') pickerState.yearPageStart-=12; else pickerState.view=new Date(pickerState.view.getFullYear(),pickerState.view.getMonth()-1,1);renderCalendar();};
  $('reportCalNext').onclick=()=>{if(pickerState.mode==='years') pickerState.yearPageStart+=12; else pickerState.view=new Date(pickerState.view.getFullYear(),pickerState.view.getMonth()+1,1);renderCalendar();};
  $('reportCalMonth').onclick=()=>{pickerState.mode=pickerState.mode==='months'?'days':'months';renderCalendar();};
  $('reportCalYear').onclick=()=>{pickerState.mode=pickerState.mode==='years'?'days':'years';renderCalendar();};
  $('reportCalMonthGrid').onclick=e=>{const b=e.target.closest('[data-report-month]');if(!b)return;pickerState.view=new Date(pickerState.view.getFullYear(),Number(b.dataset.reportMonth),1);pickerState.mode='days';renderCalendar();};
  $('reportCalYearGrid').onclick=e=>{const b=e.target.closest('[data-report-year]');if(!b)return;pickerState.view=new Date(Number(b.dataset.reportYear),pickerState.view.getMonth(),1);pickerState.mode='days';renderCalendar();};
  $('reportCalDays').addEventListener('mouseover',e=>{
    const b=e.target.closest('[data-report-day]');
    const v=b?b.dataset.reportDay:'';
    if(pickerState.hover===v) return;
    pickerState.hover=v;
    const f=$('reportDateFrom'),t=$('reportDateTo');
    if(f.value&&!t.value) renderCalendar();
  });
  $('reportCalDays').addEventListener('mouseleave',()=>{
    if(!pickerState.hover) return;
    pickerState.hover='';
    const f=$('reportDateFrom'),t=$('reportDateTo');
    if(f.value&&!t.value) renderCalendar();
  });
  $('reportCalDays').onclick=e=>{
    const b=e.target.closest('[data-report-day]');
    if(!b) return;
    // renderCalendar() replaces the grid's innerHTML, so by the time this event reaches
    // document the clicked button is detached and closest('.ref-range-wrap') fails -- the
    // outside-click handler then read a pick inside the calendar as a click outside it and
    // closed the picker. That made the second click of a range impossible. Keep calendar
    // clicks inside the picker.
    e.stopPropagation();
    const val=b.dataset.reportDay,f=$('reportDateFrom'),t=$('reportDateTo');
    if(!f.value||(f.value&&t.value)||val<f.value){f.value=val;t.value='';pickerState.hover='';markPreset('');updateDateLabel();renderCalendar();return;}
    t.value=val;pickerState.hover='';markPreset('');updateDateLabel();renderCalendar();$('reportRangePicker').classList.remove('show');load();
  };
}

document.addEventListener('DOMContentLoaded',()=>{
  setupTabs();
  setupFilters();

  setupDatePicker();

  updateCurrencyLabels();
  load();
  setInterval(updateSyncLabel,30000);
});
})();
