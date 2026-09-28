(()=>{'use strict';
const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Number(v||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
const num=v=>Number(v||0).toLocaleString('en-MY');
const add=(a,b)=>Number(a||0)+Number(b||0), pos=v=>Math.max(Number(v||0),0), neg=v=>Math.max(-Number(v||0),0);
/** Rows per page — Show `-` fills available table height; fixed sizes use the select. */
let pageSize=10;
const MIN_PAGE_SIZE=5;
const MAX_PAGE_SIZE=200;
const ROW_HEIGHT_EST=52;
const pageSizeEl=$('mreEntriesPageSize');
let brandPageSize=10;
let historyPageSize=10;
const MARKS=['','teal','violet','amber','rose','slate'];
/** Temporary: hide report rows until real data is ready. Set false to restore API display. */
const FORCE_EMPTY_UI=false;

function isAutoPageSize(value){
  const v=String(value==null?'-':value).trim();
  return v===''||v==='-'||/^auto$/i.test(v);
}

let currentProviders=[], currentBrands=[], merchantDirectory=[];
let currentHistoryRows=[], filteredHistoryRows=[], historyType='all';
let filteredProviders=[];
let providerPage=1;
let brandPage=1;
let historyPage=1;
let statusPill='all';
let syncedAt=Date.now();
let currency=(sessionStorage.getItem('bo_main_report_currency')||'MYR').toUpperCase();

function showEmptyProviders(){
  currentProviders=[];
  filteredProviders=[];
  currentBrands=[];
  updateCounts();
  applyProviderFilters();
  if($('reportSummary')) $('reportSummary').innerHTML='';
  const brandRows=$('brandReportRows');
  if(brandRows) brandRows.innerHTML='<tr><td colspan="11" class="mad-empty">No brand report data for this date range.</td></tr>';
}

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

function summaryCard(label,value,note){
  return `<div class="report-summary-card"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(note||'')}</span></div>`;
}
function renderSummary(s){
  const brandCharge=Number(s.brandCharge||0), payable=Number(s.upstreamProviderPayable||0), margin=Number(s.providerMargin||0), house=Number(s.houseResult||0);
  const box=$('reportSummary');
  if(!box) return;
  box.innerHTML=[
    summaryCard('Turnover',money(s.turnover),'Selected date range'),
    summaryCard('House Result',money(house),house>=0?'House win / customer loss':'House loss / player win'),
    summaryCard('Collect from Brands',money(pos(brandCharge)),'Brand receivable'),
    summaryCard('Pay to Providers',money(pos(payable)),'Upstream provider payable'),
    summaryCard('Company Earn',money(margin),'Brand charge − provider payable')
  ].join('');
}

function settleAction(type,key,name,direction,amount){
  const a=Number(amount||0);
  if(a<=0) return '<span class="text-muted">-</span>';
  return `<button class="btn-mini-settle" type="button" data-settle-type="${esc(type)}" data-settle-key="${esc(key)}" data-settle-name="${esc(name)}" data-settle-direction="${esc(direction)}" data-settle-amount="${a}"><i class="bi bi-journal-plus"></i> Settle</button>`;
}

function initials(name,code){
  const raw=String(name||code||'PR').trim();
  const parts=raw.split(/\s+/).filter(Boolean);
  if(parts.length>=2) return (parts[0].charAt(0)+parts[1].charAt(0)).toUpperCase();
  const c=String(code||raw).replace(/[^A-Za-z0-9]/g,'');
  return (c.substring(0,2)||'PR').toUpperCase();
}

function categoryKey(x){
  const hint=String(x.category||x.gameCategory||x.providerType||x.desc||'').toLowerCase();
  if(/live/.test(hint)&&/slot/.test(hint)) return 'mixed';
  if(/live|casino/.test(hint)) return 'live';
  if(/sport/.test(hint)) return 'sports';
  if(/slot/.test(hint)) return 'slots';
  const brands=Number(x.brandCount||0);
  if(brands>=4) return 'mixed';
  if(brands>=2) return 'live';
  return 'slots';
}
function categoryLabel(key){
  return ({slots:'Slots',live:'Live Casino',sports:'Sports',mixed:'Slots & Live Casino'})[key]||'Game Provider';
}
function providerStatus(x){
  const s=String(x.status||x.providerStatus||'').toLowerCase();
  if(s==='maintenance'||s==='maint'||s==='2') return 'maintenance';
  if(s==='active'||s==='1'||s==='enabled') return 'active';
  return Number(x.turnover||0)===0 ? 'maintenance' : 'active';
}
function markClass(i){const m=MARKS[i%MARKS.length];return m?(' is-'+m):'';}

function normalizeProviders(rows){
  return (rows||[]).map((x,i)=>{
    const turnover=Number(x.turnover||0);
    const ggr=Number(x.houseResult||0);
    const totalOut=Number(x.totalOut!=null?x.totalOut:(turnover-ggr));
    const totalIn=Number(x.totalIn!=null?x.totalIn:(totalOut+ggr));
    const txns=Number(x.betCount||x.txnCount||x.transactionCount||0);
    const cat=categoryKey(x);
    const code=String(x.providerCode||'');
    return {
      raw:x,
      code,
      name:x.providerName||code||'-',
      initials:initials(x.providerName,code),
      mark:markClass(i),
      category:cat,
      categoryLabel:categoryLabel(cat),
      status:providerStatus(x),
      validBet:turnover,
      totalIn,
      totalOut:Math.max(totalOut,0),
      ggr,
      ggrPct:turnover? (ggr/turnover*100) : 0,
      txns,
      brandCount:Number(x.brandCount||0),
      gross:ggr,
      payable:Number(x.upstreamProviderPayable||0),
      margin:Number(x.providerMargin||0),
      receivable:Number(x.brandCharge||0)
    };
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
  const total=currentProviders.length;
  const active=currentProviders.filter(r=>r.status==='active').length;
  const maintenance=currentProviders.filter(r=>r.status==='maintenance').length;
  const set=(id,v)=>{const el=$(id); if(el) el.textContent=v;};
  set('mreCountAll',total);
  set('mreCountActive',active);
  set('mreCountMaintenance',maintenance);
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

function amountHtml(v){
  const n=Number(v||0);
  const cls=n>0?'is-pos':n<0?'is-neg':'is-flat';
  const sign=n>0?'+':'';
  return `<span class="mre-ggr ${cls}"><b>${sign}${money(n)}</b></span>`;
}

function applyProviderFilters(){
  const q=($('mreSearchInput')?.value||'').trim().toLowerCase();
  const cat=$('mreCategoryFilter')?.value||'';
  const st=$('mreStatusFilter')?.value||'';
  filteredProviders=currentProviders.filter(row=>{
    if(statusPill!=='all'&&row.status!==statusPill) return false;
    if(st&&row.status!==st) return false;
    if(cat&&row.category!==cat) return false;
    if(q){
      const hay=[row.name,row.code,row.categoryLabel].join(' ').toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  providerPage=1;
  renderProviders();
}

function measureProviderPageSize(){
  const wrap=document.querySelector('.mre-panel[data-report-panel="provider"] .mad-table-wrap');
  if(!wrap) return pageSize;
  const thead=wrap.querySelector('thead');
  const sample=wrap.querySelector('tbody tr:not(.mad-empty)');
  const rowH=sample?Math.max(36,Math.round(sample.getBoundingClientRect().height)):ROW_HEIGHT_EST;
  const headH=thead?Math.ceil(thead.getBoundingClientRect().height):48;
  // Use natural row estimate (not stretched height) so leftover gap can be shared evenly
  const avail=Math.max(0,wrap.clientHeight-headH-2);
  const n=Math.floor(avail/rowH);
  return Math.max(MIN_PAGE_SIZE,Math.min(MAX_PAGE_SIZE,n||MIN_PAGE_SIZE));
}

function resolveProviderPageSize(){
  const raw=String(pageSizeEl&&pageSizeEl.value||'-').trim();
  if(/^all$/i.test(raw)) return 10000;
  if(isAutoPageSize(raw)) return measureProviderPageSize();
  const n=Number(raw);
  return Number.isFinite(n)&&n>0?n:10;
}

function syncProviderPageSize(){
  if(!isAutoPageSize(pageSizeEl&&pageSizeEl.value)) return false;
  const next=measureProviderPageSize();
  if(next===pageSize) return false;
  pageSize=next;
  return true;
}

function clearProviderRowStretch(){
  const wrap=document.querySelector('.mre-panel[data-report-panel="provider"] .mad-table-wrap');
  const table=wrap?.querySelector('.mre-table');
  const tbody=$('providerReportRows');
  wrap?.classList.remove('is-row-fill');
  table?.classList.remove('is-row-fill');
  if(table) table.style.height='';
  tbody?.querySelectorAll('tr').forEach(tr=>{tr.style.height='';});
}

/** Stretch body rows only when leftover space is a little (not enough for another full row). */
function distributeProviderRows(){
  const wrap=document.querySelector('.mre-panel[data-report-panel="provider"] .mad-table-wrap');
  const table=wrap?.querySelector('.mre-table');
  const thead=table?.querySelector('thead');
  const tbody=$('providerReportRows');
  if(!wrap||!table||!tbody) return;

  const trs=[...tbody.querySelectorAll('tr')].filter(tr=>tr.querySelector('.mre-provider'));
  clearProviderRowStretch();
  if(!trs.length) return;

  const headH=thead?thead.getBoundingClientRect().height:0;
  const avail=Math.max(0,wrap.clientHeight-headH);
  const naturalHeights=trs.map(tr=>tr.getBoundingClientRect().height);
  const naturalTotal=naturalHeights.reduce((sum,h)=>sum+h,0);
  const leftover=avail-naturalTotal;
  const rowH=Math.max(ROW_HEIGHT_EST, Math.min(...naturalHeights));
  // Only absorb a small remainder — never stretch into a large empty page gap
  if(leftover<=1||leftover>=rowH) return;

  const each=avail/trs.length;
  wrap.classList.add('is-row-fill');
  table.classList.add('is-row-fill');
  table.style.height=wrap.clientHeight+'px';
  trs.forEach(tr=>{tr.style.height=each+'px';});
}

function renderProviders(){
  const tbody=$('providerReportRows');
  const pager=$('mrePager');
  const info=$('mreTableInfo');
  if(!tbody) return;

  const auto=isAutoPageSize(pageSizeEl&&pageSizeEl.value);
  if(auto) syncProviderPageSize();
  else pageSize=resolveProviderPageSize();
  const total=filteredProviders.length;
  const totalPages=Math.max(1,Math.ceil(total/pageSize)||1);
  providerPage=Math.max(1,Math.min(providerPage,totalPages));
  const start=(providerPage-1)*pageSize;
  const rows=filteredProviders.slice(start,start+pageSize);

  if(pager) pager.innerHTML=pageButtons(providerPage,totalPages);
  if(info){
    info.textContent=total
      ? ('Showing '+(start+1)+' to '+(start+rows.length)+' of '+total+' providers')
      : 'Showing 0 to 0 of 0 providers';
  }

  if(!rows.length){
    clearProviderRowStretch();
    tbody.innerHTML='<tr><td colspan="6" class="mad-empty">No provider report data for this date range.</td></tr>';
    return;
  }

  tbody.innerHTML=rows.map(r=>{
    const codeLabel=r.code?('#'+r.code):'';
    return `<tr>
      <td><div class="mre-provider"><span class="mre-mark${r.mark}">${esc(r.initials)}</span>
        <div class="mre-provider-copy"><b>${esc(r.name)}</b>${codeLabel?`<span class="mre-code">${esc(codeLabel)}</span>`:''}</div></div></td>
      <td class="mre-category">${esc(r.categoryLabel||'—')}</td>
      <td class="mre-num">${amountHtml(r.gross)}</td>
      <td class="mre-num">${money(r.payable)}</td>
      <td class="mre-num">${amountHtml(r.margin)}</td>
      <td class="mre-num">${money(r.receivable)}</td>
    </tr>`;
  }).join('');

  if(!auto){
    clearProviderRowStretch();
    return;
  }

  // Refine page size once, then evenly stretch rows to fill leftover space
  if(!renderProviders._refining){
    requestAnimationFrame(()=>{
      clearProviderRowStretch();
      const wrap=document.querySelector('.mre-panel[data-report-panel="provider"] .mad-table-wrap');
      if(wrap&&wrap.scrollHeight>wrap.clientHeight+2){
        pageSize=Math.max(MIN_PAGE_SIZE,pageSize-1);
        renderProviders._refining=true;
        renderProviders();
        renderProviders._refining=false;
        return;
      }
      if(syncProviderPageSize()){
        renderProviders._refining=true;
        renderProviders();
        renderProviders._refining=false;
        return;
      }
      distributeProviderRows();
    });
  }else{
    requestAnimationFrame(()=>distributeProviderRows());
  }
}

function aggregateBrands(rows){
  const map=new Map();
  (rows||[]).forEach(x=>{
    const key=String(x.brandId??x.brandName??'');
    let r=map.get(key);
    if(!r){
      r={brandId:x.brandId,brandName:x.brandName||'-',brandCode:x.brandCode||'',providers:new Set(),turnover:0,houseResult:0,brandCharge:0,providerPayable:0,companyEarn:0,betCount:0};
      map.set(key,r);
    }
    if(x.providerCode) r.providers.add(String(x.providerCode));
    r.turnover=add(r.turnover,x.turnover);
    r.houseResult=add(r.houseResult,x.houseResult);
    r.brandCharge=add(r.brandCharge,x.brandCharge);
    r.providerPayable=add(r.providerPayable,x.providerPayableShare);
    r.companyEarn=add(r.companyEarn,x.platformMargin);
    r.betCount=add(r.betCount,x.betCount);
  });
  return [...map.values()];
}

function mergeBrandDetails(baseRows, accountingRows, overviewRows){
  const acc=new Map((accountingRows||[]).map(x=>[String(x.brandId??x.id??''),x]));
  const ov=new Map((overviewRows||[]).map(x=>[String(x.brandId??x.id??''),x]));
  return aggregateBrands(baseRows).map(x=>{
    const a=acc.get(String(x.brandId))||{};
    const o=ov.get(String(x.brandId))||{};
    const revenue=Number(a.netGamingResult??x.houseResult??0);
    const bonus=Number(a.bonusGiven||0);
    const vendorCost=Number(x.providerPayable||0);
    return {...x,revenue,bonus,vendorCost,netProfit:revenue-bonus-vendorCost,activePlayers:Number(o.activePlayers??o.activeBettors??o.playerCount??0)};
  });
}

function renderBrands(rows, accountingRows, overviewRows){
  if(Array.isArray(rows)) currentBrands=mergeBrandDetails(rows,accountingRows,overviewRows);
  const box=$('brandReportRows');
  if(!box) return;
  const total=currentBrands.length;
  const totalPages=Math.max(1,Math.ceil(total/brandPageSize)||1);
  brandPage=Math.max(1,Math.min(brandPage,totalPages));
  const start=(brandPage-1)*brandPageSize;
  const shown=currentBrands.slice(start,start+brandPageSize);
  box.innerHTML=shown.map(x=>{
    const dir=x.brandCharge>=0?'COLLECT':'PAY';
    return `<tr><td><b>${esc(x.brandName)}</b><small class="d-block text-muted">${esc(x.brandCode)}</small></td><td>${num(x.providers.size)}</td><td class="mre-num">${money(x.turnover)}</td><td class="mre-num value-positive">${money(pos(x.houseResult))}</td><td class="mre-num value-negative">${money(neg(x.houseResult))}</td><td class="mre-num value-positive">${money(pos(x.brandCharge))}</td><td class="mre-num value-negative">${money(neg(x.brandCharge))}</td><td class="mre-num value-negative">${money(pos(x.providerPayable))}</td><td class="mre-num ${x.companyEarn>=0?'value-positive':'value-negative'}">${money(x.companyEarn)}</td><td class="mre-num value-negative">${money(x.bonus)}</td><td class="mre-num value-negative">${money(x.vendorCost)}</td><td class="mre-num ${x.netProfit>=0?'value-positive':'value-negative'}">${money(x.netProfit)}</td><td>${num(x.activePlayers)}</td><td>${num(x.betCount)}</td><td><div class="mre-actions mad-actions"><button class="mad-icon-btn" type="button" title="View merchant records" data-mre-brand-view="${esc(x.brandId)}"><i class="bi bi-eye"></i></button>${settleAction('BRAND',x.brandId,x.brandName,dir,Math.abs(x.brandCharge))}</div></td></tr>`;
  }).join('')||'<tr><td colspan="15" class="mad-empty">No merchant balance data for this date range.</td></tr>';
  const brandInfoText=total?`Showing ${start+1} to ${start+shown.length} of ${total} merchants`:'Showing 0 to 0 of 0 merchants';
  ['mreBrandInfo','mreBrandInfoTop'].forEach(id=>{const el=$(id);if(el)el.textContent=brandInfoText;});
  const brandPagerHtml=total?pageButtons(brandPage,totalPages):'';
  {const el=$('mreBrandPager');if(el)el.innerHTML=brandPagerHtml;}
  refreshSettlementParties();
  refreshHistoryMerchantOptions();
}

function historyRecord(type,r){
  const amount=Number(r.value??r.amount??r.houseResult??r.totalDeposit??r.totalWithdraw??r.before??0);
  const rawDate=String(r.time??r.processedAt??r.updatedAt??r.createdAt??r.settlementAt??'').replace('T',' ');
  const date=rawDate?rawDate.slice(0,19):'-';
  const description=String(r.description??r.remark??r.reference??r.referenceNo??r.game??r.provider??r.member??r.type??`${type.charAt(0).toUpperCase()+type.slice(1)} record`);
  const status=String(r.status??(type==='settlement'?'Pending':'Completed'));
  return {type,amount,date,description,status,brandId:r.brandId??r.merchantId??'',brandName:r.brandName??r.merchantName??r.companyName??'',raw:r};
}
async function historyDetail(source,metric,type,brandId){
  try{
    const u=new URLSearchParams({source,metric,from:$('reportDateFrom').value,to:addDay($('reportDateTo').value),limit:'300'});
    if(brandId) u.set('brandId',String(brandId));
    const d=await api('/admin/main/reports/detail?'+u.toString());
    return (d.rows||[]).map(r=>historyRecord(type,r));
  }catch(e){console.warn('Transaction history source unavailable',source,metric,e);return [];}
}
function refreshHistoryMerchantOptions(){
  const sel=$('mreHistoryMerchant'); if(!sel) return;
  const old=sel.value;
  const rows=merchantDirectory.length?merchantDirectory:currentBrands.map(x=>({id:x.brandId,name:x.brandName,code:x.brandCode}));
  sel.innerHTML='<option value="">All Merchants</option>'+rows.map(x=>`<option value="${esc(x.id??x.brandId)}">${esc(x.name??x.brandName??x.code??'Merchant')} (${esc(x.code??x.brandCode??x.id??'')})</option>`).join('');
  if([...sel.options].some(o=>o.value===old)) sel.value=old;
}
function historyTypeBadge(type){const icon=type==='transaction'?'arrow-left-right':type==='settlement'?'cash-stack':'sliders';return `<span class="mre-history-type ${esc(type)}"><i class="bi bi-${icon}"></i> ${esc(type.charAt(0).toUpperCase()+type.slice(1))}</span>`;}
function applyHistoryFilters(){
  const q=($('mreHistorySearch')?.value||'').trim().toLowerCase();
  filteredHistoryRows=currentHistoryRows.filter(r=>{
    if(historyType!=='all'&&r.type!==historyType) return false;
    if(q&&![r.brandName,r.description,r.status].join(' ').toLowerCase().includes(q)) return false;
    return true;
  }).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const count=t=>currentHistoryRows.filter(r=>r.type===t).length;
  if($('mreHistoryCountAll')) $('mreHistoryCountAll').textContent=currentHistoryRows.length;
  if($('mreHistoryCountTxn')) $('mreHistoryCountTxn').textContent=count('transaction');
  if($('mreHistoryCountSettlement')) $('mreHistoryCountSettlement').textContent=count('settlement');
  if($('mreHistoryCountAdjustment')) $('mreHistoryCountAdjustment').textContent=count('adjustment');
  const total=filteredHistoryRows.length;
  const totalPages=Math.max(1,Math.ceil(total/historyPageSize)||1);
  historyPage=Math.max(1,Math.min(historyPage,totalPages));
  const start=(historyPage-1)*historyPageSize;
  const shown=filteredHistoryRows.slice(start,start+historyPageSize);
  const box=$('mreHistoryRows');
  if(box) box.innerHTML=shown.map(r=>`<tr><td>${esc(r.date)}</td><td><b>${esc(r.brandName||'All / Platform')}</b></td><td>${historyTypeBadge(r.type)}</td><td>${esc(r.description)}</td><td class="mre-num ${r.amount>0?'value-positive':r.amount<0?'value-negative':''}">${r.amount===0?'—':(r.amount>0?'+':'')+money(r.amount)}</td><td><span class="settlement-status ${/approved|completed|success|settled/i.test(r.status)?'success':/pending|submitted|open/i.test(r.status)?'warning':'primary'}">${esc(r.status)}</span></td></tr>`).join('')||'<tr><td colspan="6" class="mad-empty">No transaction history for the selected date range and filters.</td></tr>';
  const historyInfoText=total?`Showing ${start+1} to ${start+shown.length} of ${total} filtered records (${currentHistoryRows.length} total)`:`Showing 0 of ${currentHistoryRows.length} records`;
  {const el=$('mreHistoryInfo');if(el)el.textContent=historyInfoText;}
  const historyPagerHtml=total?pageButtons(historyPage,totalPages):'';
  {const el=$('mreHistoryPager');if(el)el.innerHTML=historyPagerHtml;}
  if($('mreHistorySummary')){
    const txn=currentHistoryRows.filter(r=>r.type==='transaction').reduce((a,r)=>a+r.amount,0);
    const sett=currentHistoryRows.filter(r=>r.type==='settlement').reduce((a,r)=>a+r.amount,0);
    const adj=currentHistoryRows.filter(r=>r.type==='adjustment').reduce((a,r)=>a+r.amount,0);
    $('mreHistorySummary').innerHTML=[summaryCard('Transactions',money(txn),'Deposit / transaction records'),summaryCard('Settlements',money(sett),'Merchant settlement records'),summaryCard('Adjustments',money(adj),'Credit adjustment records')].join('');
  }
}
async function loadHistory(){
  const brandId=$('mreHistoryMerchant')?.value||'';
  const box=$('mreHistoryRows'); if(box) box.innerHTML='<tr><td colspan="6" class="mad-empty">Loading transaction history...</td></tr>';
  const [t,s,a]=await Promise.all([historyDetail('overview','depositAmount','transaction',brandId),historyDetail('settlement','upstreamProviderPayable','settlement',brandId),historyDetail('credit','creditIn','adjustment',brandId)]);
  currentHistoryRows=[...t,...s,...a];
  applyHistoryFilters();
}

function setupHistory(){
  document.querySelectorAll('[data-history-type]').forEach(btn=>btn.addEventListener('click',()=>{historyType=btn.dataset.historyType||'all';historyPage=1;document.querySelectorAll('[data-history-type]').forEach(b=>b.classList.toggle('is-active',b===btn));applyHistoryFilters();}));
  let timer; $('mreHistorySearch')?.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{historyPage=1;applyHistoryFilters();},150);});
  $('mreHistoryMerchant')?.addEventListener('change',()=>{historyPage=1;loadHistory();});
  $('mreHistoryReset')?.addEventListener('click',()=>{historyType='all';historyPage=1;if($('mreHistorySearch')) $('mreHistorySearch').value='';if($('mreHistoryMerchant')) $('mreHistoryMerchant').value='';document.querySelectorAll('[data-history-type]').forEach(b=>b.classList.toggle('is-active',b.dataset.historyType==='all'));loadHistory();});
}

function monthFromDate(v){return String(v||'').slice(0,7)}
function todayYmd(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

function refreshSettlementParties(){
  const type=$('settlementType')?.value||'BRAND', sel=$('settlementParty');
  if(!sel) return;
  const old=sel.value;
  const rows=type==='BRAND'?currentBrands:currentProviders.map(p=>p.raw);
  sel.innerHTML=rows.map(x=>{
    const key=type==='BRAND'?x.brandId:(x.providerCode||x.code);
    const name=type==='BRAND'?x.brandName:(x.providerName||x.providerCode||x.name);
    return `<option value="${esc(key)}" data-name="${esc(name)}">${esc(name)}</option>`;
  }).join('')||'<option value="">No data in selected report range</option>';
  if([...sel.options].some(o=>o.value===old)) sel.value=old;
}

function settlementSummaryCard(label,value,note){
  return `<div class="settlement-summary-card"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(note)}</span></div>`;
}
function renderSettlementSummary(s){
  if(!$('settlementSummary')) return;
  $('settlementSummary').innerHTML=[
    settlementSummaryCard('Outstanding to Collect',money(s.outstandingCollect),'Receivable from brands/providers'),
    settlementSummaryCard('Outstanding to Pay',money(s.outstandingPay),'Payable to brands/providers'),
    settlementSummaryCard('Paid This Ledger',money(s.paid),'Recorded partial/full payments'),
    settlementSummaryCard('Carried Forward',money(s.carriedForward),'Moved into following month'),
    settlementSummaryCard('Open Items',num(s.openCount),'Open or partially paid')
  ].join('');
}
function statusBadge(v){
  const x=String(v||'OPEN').toUpperCase(), c=x==='SETTLED'?'success':x==='PARTIAL'?'warning':x==='CARRIED'?'info':'primary';
  return `<span class="settlement-status ${c}">${esc(x)}</span>`;
}
function renderSettlements(rows){
  $('settlementRows').innerHTML=(rows||[]).map(x=>{
    const closed=['SETTLED','CARRIED'].includes(String(x.status));
    return `<tr><td>${esc(x.month)}</td><td><b>${esc(x.counterpartyName)}</b><small class="d-block text-muted">${esc(x.counterpartyType)}</small></td><td><span class="direction-chip ${x.direction==='COLLECT'?'collect':'pay'}">${x.direction==='COLLECT'?'Collect From':'Pay To'}</span></td><td>${money(x.sourceAmount)}</td><td>${money(x.carryInAmount)}</td><td class="value-neutral">${money(x.totalDue)}</td><td class="value-positive">${money(x.paidAmount)}</td><td class="${Number(x.balanceAmount)>0?'value-negative':'value-positive'}">${money(x.balanceAmount)}</td><td>${statusBadge(x.status)}</td><td><div class="settlement-actions"><button type="button" class="btn-mini-action" data-payment-id="${x.id}" data-payment-name="${esc(x.counterpartyName)}" data-payment-balance="${Number(x.balanceAmount||0)}" ${closed?'disabled':''}><i class="bi bi-cash-coin"></i> Payment</button><button type="button" class="btn-mini-action" data-history-id="${x.id}"><i class="bi bi-clock-history"></i> History</button><button type="button" class="btn-mini-action danger-soft" data-carry-id="${x.id}" ${closed||Number(x.balanceAmount)<=0?'disabled':''}><i class="bi bi-arrow-right-circle"></i> Carry Forward</button></div></td></tr>`;
  }).join('')||'<tr><td colspan="10" class="mad-empty">No settlement records for this month.</td></tr>';
}

async function loadSettlements(){
  if(!$('settlementMonth')) return;
  const month=$('settlementMonth').value||monthFromDate($('reportDateFrom').value)||todayYmd().slice(0,7);
  $('settlementMonth').value=month;
  if(FORCE_EMPTY_UI){
    if($('settlementSummary')) $('settlementSummary').innerHTML='';
    renderSettlements([]);
    return;
  }
  try{
    const d=await api('/admin/main/settlements?month='+encodeURIComponent(month));
    renderSettlementSummary(d.summary||{});
    renderSettlements(d.rows||[]);
  }catch(e){console.error(e);alert(e.message);}
}

function prefillSettlement(type,key,name,direction,amount){
  document.querySelector('[data-report-tab="settlement"]')?.click();
  $('settlementType').value=type;
  refreshSettlementParties();
  $('settlementParty').value=String(key);
  $('settlementDirection').value=direction;
  $('settlementAmount').value=Number(amount||0).toFixed(2);
  $('settlementMonth').value=monthFromDate($('reportDateFrom').value)||todayYmd().slice(0,7);
  $('settlementNote').focus();
  loadSettlements();
}

async function submitSettlement(){
  const party=$('settlementParty'), opt=party.options[party.selectedIndex];
  if(!party.value){alert('Please select a brand or provider');return;}
  const body={month:$('settlementMonth').value,counterpartyType:$('settlementType').value,counterpartyKey:party.value,counterpartyName:opt?.dataset.name||opt?.textContent||party.value,direction:$('settlementDirection').value,amount:$('settlementAmount').value,note:$('settlementNote').value};
  const btn=$('settlementSubmit');
  btn.disabled=true;
  try{
    await api('/admin/main/settlements',{method:'POST',body});
    $('settlementAmount').value='';
    $('settlementNote').value='';
    await loadSettlements();
  }catch(e){alert(e.message);}
  finally{btn.disabled=false;}
}

function openPayment(btn){
  $('settlementPaymentId').value=btn.dataset.paymentId;
  $('settlementPaymentContext').innerHTML=`<b>${esc(btn.dataset.paymentName)}</b><span>Outstanding balance: ${(window.BO_MAIN_CURRENCY?.code?.()||currency||'MYR')} ${money(btn.dataset.paymentBalance)}</span>`;
  $('settlementPaymentAmount').value=Number(btn.dataset.paymentBalance||0).toFixed(2);
  $('settlementPaymentAmount').max=btn.dataset.paymentBalance;
  $('settlementPaymentDate').value=todayYmd();
  $('settlementPaymentReference').value='';
  $('settlementPaymentNote').value='';
  bootstrap.Modal.getOrCreateInstance($('settlementPaymentModal')).show();
}

async function savePayment(){
  const id=$('settlementPaymentId').value, btn=$('settlementPaymentSave');
  btn.disabled=true;
  try{
    await api(`/admin/main/settlements/${id}/payment`,{method:'POST',body:{amount:$('settlementPaymentAmount').value,paymentDate:$('settlementPaymentDate').value,referenceNo:$('settlementPaymentReference').value,note:$('settlementPaymentNote').value}});
    bootstrap.Modal.getOrCreateInstance($('settlementPaymentModal')).hide();
    await loadSettlements();
  }catch(e){alert(e.message);}
  finally{btn.disabled=false;}
}

async function showHistory(id){
  try{
    const rows=await api(`/admin/main/settlements/${id}/payments`);
    $('settlementHistoryRows').innerHTML=(rows||[]).map(x=>`<tr><td>${esc(x.paymentDate||'')}</td><td>${money(x.amount)}</td><td>${esc(x.referenceNo||'-')}</td><td>${esc(x.note||'-')}</td><td>${esc(x.createdBy||'-')}</td></tr>`).join('')||'<tr><td colspan="5">No payments recorded yet.</td></tr>';
    bootstrap.Modal.getOrCreateInstance($('settlementHistoryModal')).show();
  }catch(e){alert(e.message);}
}

async function carryForward(id){
  if(!confirm('Carry only the unpaid balance into the next month? The current settlement will be closed as CARRIED.')) return;
  try{await api(`/admin/main/settlements/${id}/carry-forward`,{method:'POST',body:{}});await loadSettlements();}
  catch(e){alert(e.message);}
}

function setupSettlement(){
  if(!$('settlementMonth')) return;
  $('settlementMonth').value=monthFromDate($('reportDateFrom').value)||todayYmd().slice(0,7);
  $('settlementType').onchange=refreshSettlementParties;
  $('settlementMonth').onchange=loadSettlements;
  $('settlementSubmit').onclick=submitSettlement;
  $('settlementRefresh').onclick=loadSettlements;
  $('settlementPaymentSave').onclick=savePayment;
  document.addEventListener('click',e=>{
    const s=e.target.closest('[data-settle-type]');
    if(s) prefillSettlement(s.dataset.settleType,s.dataset.settleKey,s.dataset.settleName,s.dataset.settleDirection,s.dataset.settleAmount);
    const p=e.target.closest('[data-payment-id]');
    if(p&&!p.disabled) openPayment(p);
    const h=e.target.closest('[data-history-id]');
    if(h) showHistory(h.dataset.historyId);
    const c=e.target.closest('[data-carry-id]');
    if(c&&!c.disabled) carryForward(c.dataset.carryId);
  });
  refreshSettlementParties();
}

async function load(){
  if(FORCE_EMPTY_UI){
    showEmptyProviders();
    syncedAt=Date.now();
    updateSyncLabel();
    return;
  }
  try{
    const [d,acc,ov,merchants]=await Promise.all([api('/admin/main/reports/provider-settlement'+qs()),api('/admin/main/reports/accounting'+qs()).catch(()=>({brands:[]})),api('/admin/main/overview'+qs()).catch(()=>({brands:[]})),api('/admin/merchants').catch(()=>api('/admin/brands').catch(()=>[]))]);
    merchantDirectory=Array.isArray(merchants)?merchants:(merchants?.rows||merchants?.items||[]);
    renderSummary(d.summary||{});
    currentProviders=normalizeProviders(d.providers||[]);
    updateCounts();
    applyProviderFilters();
    brandPage=1;renderBrands(d.brands||[],acc.brands||[],ov.brands||[]);
    syncedAt=Date.now();
    updateSyncLabel();
  }catch(e){
    console.error(e);
    currentProviders=[];
    filteredProviders=[];
    currentBrands=[];
    updateCounts();
    const tbody=$('providerReportRows');
    if(tbody) tbody.innerHTML=`<tr><td colspan="6" class="mad-empty text-danger">${esc((/failed to fetch|networkerror|load failed/i.test(String(e.message||''))?'Unable to reach server. Start local API on :8080 or open the BO on the same host as /api.':e.message)||'Unable to load provider report')}</td></tr>`;
    const info=$('mreTableInfo');
    if(info) info.textContent='Showing 0 to 0 of 0 providers';
    const pager=$('mrePager');
    if(pager) pager.innerHTML='';
    if($('reportSummary')) $('reportSummary').innerHTML='';
  }
}

function exportCsv(){
  const head=['Provider','Code','Game Category','Gross Amount','Provider Payable','Company Margin','Merchant Receivable'];
  const lines=[head,...filteredProviders.map(r=>[r.name,r.code,r.categoryLabel,r.gross,r.payable,r.margin,r.receivable])];
  const blob=new Blob([lines.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`provider-report-${$('reportDateFrom').value}-${$('reportDateTo').value}.csv`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
}


function setupExtraPagination(){
  const bindPager=(id,kind)=>$(id)?.addEventListener('click',e=>{
    const b=e.target.closest('[data-page]');if(!b||b.disabled)return;
    if(kind==='brand'){brandPage=Number(b.dataset.page||1);renderBrands(null,null,null);}
    else{historyPage=Number(b.dataset.page||1);applyHistoryFilters();}
  });
  bindPager('mreBrandPager','brand');
  bindPager('mreHistoryPager','history');
  $('mreBrandPageSize')?.addEventListener('change',e=>{brandPageSize=Math.max(1,Number(e.target.value)||10);brandPage=1;renderBrands(null,null,null);});
  $('mreHistoryPageSize')?.addEventListener('change',e=>{historyPageSize=Math.max(1,Number(e.target.value)||10);historyPage=1;applyHistoryFilters();});
}

function setupTabs(){
  document.querySelectorAll('[data-report-tab]').forEach(b=>b.addEventListener('click',()=>{
    if(b.tagName==='A' && b.getAttribute('href')) return;
    document.querySelectorAll('[data-report-tab]').forEach(x=>{
      const on=x===b;
      x.classList.toggle('is-active',on);
      x.classList.toggle('active',on);
      x.setAttribute('aria-selected',on?'true':'false');
    });
    document.querySelectorAll('[data-report-panel]').forEach(x=>{
      x.classList.toggle('d-none',x.dataset.reportPanel!==b.dataset.reportTab);
    });
    if(b.dataset.reportTab==='settlement') loadSettlements();
    if(b.dataset.reportTab==='history') loadHistory();
  }));
}

function setupFilters(){
  document.querySelectorAll('[data-mre-status]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      statusPill=btn.getAttribute('data-mre-status')||'all';
      document.querySelectorAll('[data-mre-status]').forEach(b=>b.classList.toggle('is-active',b===btn));
      applyProviderFilters();
    });
  });
  let searchTimer=null;
  $('mreSearchInput')?.addEventListener('input',()=>{
    clearTimeout(searchTimer);
    searchTimer=setTimeout(applyProviderFilters,180);
  });
  $('mreSearchInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyProviderFilters();}});
  $('mreCategoryFilter')?.addEventListener('change',applyProviderFilters);
  $('mreStatusFilter')?.addEventListener('change',applyProviderFilters);
  $('mreResetBtn')?.addEventListener('click',()=>{
    if($('mreSearchInput')) $('mreSearchInput').value='';
    if($('mreCategoryFilter')) $('mreCategoryFilter').value='';
    if($('mreStatusFilter')) $('mreStatusFilter').value='';
    statusPill='all';
    document.querySelectorAll('[data-mre-status]').forEach(b=>b.classList.toggle('is-active',b.getAttribute('data-mre-status')==='all'));
    applyProviderFilters();
  });
  $('mrePager')?.addEventListener('click',e=>{
    const b=e.target.closest('[data-page]');
    if(!b||b.disabled) return;
    const totalPages=Math.max(1,Math.ceil(filteredProviders.length/pageSize));
    const n=Number(b.dataset.page);
    if(n>=1&&n<=totalPages&&n!==providerPage){providerPage=n;renderProviders();}
  });
  pageSizeEl?.addEventListener('change',()=>{
    providerPage=1;
    pageSize=resolveProviderPageSize();
    renderProviders();
  });
  const tableWrap=document.querySelector('.mre-panel[data-report-panel="provider"] .mad-table-wrap');
  if(tableWrap&&typeof ResizeObserver!=='undefined'){
    let resizeTimer=0;
    const ro=new ResizeObserver(()=>{
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(()=>{
        if(!isAutoPageSize(pageSizeEl&&pageSizeEl.value)){
          clearProviderRowStretch();
          return;
        }
        if(syncProviderPageSize()) renderProviders();
        else distributeProviderRows();
      },80);
    });
    ro.observe(tableWrap);
  }
  $('reportCurrency')?.addEventListener('change',()=>{
    currency=$('reportCurrency').value||'MYR';
    updateCurrencyLabels();
  });
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
    const view=e.target.closest('[data-mre-view]');
    if(view){
      const code=view.getAttribute('data-mre-view');
      const u=new URL('provider-detail.html',location.href);
      u.searchParams.set('providerCode',code||'');
      u.searchParams.set('from',$('reportDateFrom').value);
      u.searchParams.set('to',$('reportDateTo').value);
      location.href=u.toString();
      return;
    }
    const brandView=e.target.closest('[data-mre-brand-view]');
    if(brandView){
      const id=String(brandView.getAttribute('data-mre-brand-view')||'');
      document.querySelector('[data-report-tab="history"]')?.click();
      setTimeout(()=>{if($('mreHistoryMerchant')){$('mreHistoryMerchant').value=id;loadHistory();}},0);
      return;
    }
    const dl=e.target.closest('[data-mre-dl]');
    if(dl){
      const code=dl.getAttribute('data-mre-dl');
      const row=filteredProviders.find(r=>r.code===code);
      if(!row) return;
      const lines=[['Provider','Code','Game Category','Gross Amount','Provider Payable','Company Margin','Merchant Receivable'],[row.name,row.code,row.categoryLabel,row.gross,row.payable,row.margin,row.receivable]];
      const blob=new Blob([lines.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n')],{type:'text/csv'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=`provider-${code||'row'}.csv`;
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),500);
      return;
    }
    const hist=e.target.closest('[data-mre-hist]');
    if(hist){
      document.querySelector('[data-report-tab="settlement"]')?.click();
    }
  });
}

/* Date range picker (preserved) */
const pickerState={view:new Date(),selectingStart:true,mode:'days',yearPageStart:new Date().getFullYear()-5};
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
  for(let d=1;d<=total;d++){
    const val=ymd(new Date(y,m,d)),inRange=from&&to&&val>=from&&val<=to,isEdge=val===from||val===to;
    html+=`<button type="button" data-report-day="${val}" class="${inRange?'in-range':''} ${isEdge?'selected':''}">${d}</button>`;
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
  $('reportDateTrigger').addEventListener('click',e=>{e.stopPropagation();$('reportRangePicker').classList.toggle('show');pickerState.mode='days';renderCalendar();});
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
  $('reportCalDays').onclick=e=>{
    const b=e.target.closest('[data-report-day]');
    if(!b) return;
    const val=b.dataset.reportDay;
    if(pickerState.selectingStart||!$('reportDateFrom').value||($('reportDateFrom').value&&$('reportDateTo').value)){
      setRange(val,'','');
      pickerState.selectingStart=false;
    }else{
      let aa=$('reportDateFrom').value,z=val;
      if(z<aa){const t=aa;aa=z;z=t;}
      setRange(aa,z,'');
      pickerState.selectingStart=true;
      $('reportRangePicker').classList.remove('show');
      load();
    }
  };
}

BO_AUTH.requireLogin();
setupTabs();
setupFilters();
setupDatePicker();
setupSettlement();
setupHistory();
setupExtraPagination();
updateCurrencyLabels();
updateSyncLabel();
setInterval(updateSyncLabel,30000);
load().then(()=>{
  const view=String(document.body?.dataset?.reportView||'provider');
  if(view==='settlement') loadSettlements();
  if(view==='history') loadHistory();
}).catch(()=>{});
})();
