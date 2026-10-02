(()=>{'use strict';
const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Number(v||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
const PAGE_SIZE=7;
const MSR_MARKS=['teal','violet','amber','rose','slate','blue'];

let currentSettlements=[];
let filteredSettlements=[];
let settlementPage=1;
let msrStatusPill='all';
let msrCurrency=(sessionStorage.getItem('bo_main_report_currency')||'MYR').toUpperCase();
let syncedAt=Date.now();
let msrPicker={view:new Date(),mode:'days',yearPageStart:new Date().getFullYear()-5};

const DEMO_SETTLEMENTS=[
  {id:'SET-202608-01',cycleFrom:'2026-08-01',cycleTo:'2026-08-15',name:'Pragmatic Play',code:'PP-01',entityType:'Provider',due:'2026-08-20',dueNote:'Paid',payable:2850000,paid:2850000,remaining:0,status:'settled',cycle:'biweekly'},
  {id:'SET-202608-02',cycleFrom:'2026-08-01',cycleTo:'2026-08-31',name:'City Gaming MY',code:'CG-88',entityType:'Merchant',due:'2026-09-05',dueNote:'Pending',payable:1240500.4,paid:600000,remaining:640500.4,status:'pending',cycle:'monthly'},
  {id:'SET-202608-03',cycleFrom:'2026-08-16',cycleTo:'2026-08-31',name:'Evolution Gaming',code:'EVO-02',entityType:'Provider',due:'2026-09-10',dueNote:'Pending',payable:910220.15,paid:0,remaining:910220.15,status:'pending',cycle:'biweekly'},
  {id:'SET-202608-04',cycleFrom:'2026-08-01',cycleTo:'2026-08-31',name:'Naga Digital',code:'ND-11',entityType:'Merchant',due:'2026-08-28',dueNote:'Paid',payable:532880,paid:532880,remaining:0,status:'settled',cycle:'monthly'},
  {id:'SET-202608-05',cycleFrom:'2026-08-01',cycleTo:'2026-08-15',name:'Spadegaming',code:'SG-07',entityType:'Provider',due:'2026-08-22',dueNote:'Disputed',payable:388410.55,paid:120000,remaining:268410.55,status:'disputed',cycle:'biweekly'},
  {id:'SET-202608-06',cycleFrom:'2026-08-01',cycleTo:'2026-08-31',name:'Lotus Bet Asia',code:'LBA-03',entityType:'Merchant',due:'2026-09-02',dueNote:'Paid',payable:276500,paid:276500,remaining:0,status:'settled',cycle:'monthly'},
  {id:'SET-202608-07',cycleFrom:'2026-08-16',cycleTo:'2026-08-31',name:'JILI Soft',code:'JL-19',entityType:'Provider',due:'2026-09-08',dueNote:'Pending',payable:154320.8,paid:50000,remaining:104320.8,status:'pending',cycle:'biweekly'},
  {id:'SET-202608-08',cycleFrom:'2026-08-01',cycleTo:'2026-08-31',name:'Orbit Merchants',code:'OM-22',entityType:'Merchant',due:'2026-08-30',dueNote:'Paid',payable:990000,paid:990000,remaining:0,status:'settled',cycle:'monthly'},
  {id:'SET-202607-12',cycleFrom:'2026-07-01',cycleTo:'2026-07-31',name:'Microgaming',code:'MG-04',entityType:'Provider',due:'2026-08-15',dueNote:'Paid',payable:720150,paid:720150,remaining:0,status:'settled',cycle:'monthly'},
  {id:'SET-202608-09',cycleFrom:'2026-08-01',cycleTo:'2026-08-15',name:'BetConstruct',code:'BC-15',entityType:'Provider',due:'2026-08-25',dueNote:'Disputed',payable:445900,paid:0,remaining:445900,status:'disputed',cycle:'biweekly'},
  {id:'SET-202608-10',cycleFrom:'2026-08-01',cycleTo:'2026-08-31',name:'Skyline Ops',code:'SO-09',entityType:'Merchant',due:'2026-09-04',dueNote:'Pending',payable:318760.25,paid:100000,remaining:218760.25,status:'pending',cycle:'monthly'},
  {id:'SET-202608-11',cycleFrom:'2026-08-16',cycleTo:'2026-08-31',name:'Habanero',code:'HB-06',entityType:'Provider',due:'2026-09-09',dueNote:'Paid',payable:205440,paid:205440,remaining:0,status:'settled',cycle:'biweekly'},
  {id:'SET-202608-12',cycleFrom:'2026-08-01',cycleTo:'2026-08-31',name:'Aurora Brands',code:'AB-14',entityType:'Merchant',due:'2026-08-29',dueNote:'Paid',payable:167890,paid:167890,remaining:0,status:'settled',cycle:'monthly'},
  {id:'SET-202608-13',cycleFrom:'2026-08-01',cycleTo:'2026-08-15',name:'Saba Sports',code:'SB-21',entityType:'Provider',due:'2026-08-21',dueNote:'Paid',payable:512300,paid:512300,remaining:0,status:'settled',cycle:'biweekly'},
  {id:'SET-202608-14',cycleFrom:'2026-08-01',cycleTo:'2026-08-31',name:'Pacific Hub',code:'PH-30',entityType:'Merchant',due:'2026-09-06',dueNote:'Paid',payable:88420.6,paid:88420.6,remaining:0,status:'settled',cycle:'monthly'},
  {id:'SET-202608-15',cycleFrom:'2026-08-16',cycleTo:'2026-08-31',name:'PG Soft',code:'PG-05',entityType:'Provider',due:'2026-09-11',dueNote:'Paid',payable:633780,paid:633780,remaining:0,status:'settled',cycle:'biweekly'},
  {id:'SET-202608-16',cycleFrom:'2026-08-01',cycleTo:'2026-08-31',name:'Nova Retail',code:'NR-17',entityType:'Merchant',due:'2026-09-03',dueNote:'Paid',payable:421150,paid:421150,remaining:0,status:'settled',cycle:'monthly'},
  {id:'SET-202608-17',cycleFrom:'2026-08-01',cycleTo:'2026-08-15',name:'CQ9 Gaming',code:'CQ-08',entityType:'Provider',due:'2026-08-24',dueNote:'Paid',payable:299640,paid:299640,remaining:0,status:'settled',cycle:'biweekly'}
];

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

function pad2(n){return String(n).padStart(2,'0')}
function ymd(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())}
function initials(name,code){
  const raw=String(name||code||'MC').trim();
  const parts=raw.split(/\s+/).filter(Boolean);
  if(parts.length>=2) return (parts[0].charAt(0)+parts[1].charAt(0)).toUpperCase();
  const c=String(code||raw).replace(/[^A-Za-z0-9]/g,'');
  return (c.substring(0,2)||'MC').toUpperCase();
}
function niceShort(v){
  const a=String(v||'').split('-').map(Number);
  if(a.length!==3||!a[0]) return v||'';
  const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(a[2]).padStart(2,'0')} ${m[a[1]-1]} ${a[0]}`;
}
function niceShortRange(a,b){
  const x=String(a||'').split('-').map(Number), y=String(b||'').split('-').map(Number);
  const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if(x.length!==3||y.length!==3||!x[0]||!y[0]) return `${a||''} – ${b||''}`;
  return `${String(x[2]).padStart(2,'0')} ${m[x[1]-1]} – ${String(y[2]).padStart(2,'0')} ${m[y[1]-1]} ${y[0]}`;
}
function updateSyncLabel(){
  const el=$('reportSyncLabel');
  if(!el) return;
  const mins=Math.max(0,Math.floor((Date.now()-syncedAt)/60000));
  el.innerHTML=`<i class="bi bi-arrow-repeat" aria-hidden="true"></i> Synced ${mins===0?'just now':mins===1?'1 min ago':mins+' mins ago'}`;
}
function updateCurrencyLabels(){
  document.querySelectorAll('.msr-cur-label').forEach(el=>{el.textContent='('+msrCurrency+' Summary)';});
}
function mapApiStatus(v){
  const s=String(v||'').toUpperCase();
  if(s==='SETTLED'||s==='PAID'||s==='CARRIED') return 'settled';
  if(s==='DISPUTED'||s==='DISPUTE') return 'disputed';
  return 'pending';
}
function normalizeSettlement(x,i){
  const payable=Number(x.payable??x.totalDue??x.sourceAmount??0);
  const paid=Number(x.paid??x.paidAmount??0);
  const remaining=Number(x.remaining??x.balanceAmount??Math.max(payable-paid,0));
  const status=x.statusKey||mapApiStatus(x.status);
  const name=x.name||x.counterpartyName||'-';
  const code=String(x.code||x.counterpartyKey||'').replace(/^#/,'');
  const entityType=/merchant|brand/i.test(String(x.entityType||x.counterpartyType||''))?'Merchant':'Provider';
  return {
    id:String(x.id||x.settlementId||`SET-${i+1}`).replace(/^#/,''),
    cycleFrom:x.cycleFrom||x.periodFrom||'',
    cycleTo:x.cycleTo||x.periodTo||'',
    name, code, entityType,
    due:x.due||x.dueDate||'',
    dueNote:x.dueNote||(status==='settled'?'Paid':status==='disputed'?'Disputed':'Pending'),
    payable, paid, remaining, status,
    cycle:x.cycle||'monthly',
    initials:initials(name,code),
    markTone:MSR_MARKS[i%MSR_MARKS.length]
  };
}
function demoSettlements(){return DEMO_SETTLEMENTS.map((x,i)=>normalizeSettlement(x,i));}

function updateMsrCounts(){
  if($('msrCountAll')) $('msrCountAll').textContent=currentSettlements.length;
  if($('msrCountSettled')) $('msrCountSettled').textContent=currentSettlements.filter(x=>x.status==='settled').length;
  if($('msrCountPending')) $('msrCountPending').textContent=currentSettlements.filter(x=>x.status==='pending').length;
  if($('msrCountDisputed')) $('msrCountDisputed').textContent=currentSettlements.filter(x=>x.status==='disputed').length;
}
function applySettlementFilters(){
  const q=String($('msrSearchInput')?.value||'').trim().toLowerCase();
  const cycle=$('msrCycleFilter')?.value||'';
  const statusSel=$('msrStatusFilter')?.value||'';
  filteredSettlements=currentSettlements.filter(x=>{
    if(msrStatusPill!=='all'&&x.status!==msrStatusPill) return false;
    if(statusSel&&x.status!==statusSel) return false;
    if(cycle&&x.cycle!==cycle) return false;
    if(q&&![x.id,x.name,x.code,x.entityType].join(' ').toLowerCase().includes(q)) return false;
    return true;
  });
  settlementPage=1;
  renderSettlements();
}
function statusPillHtml(status){
  const map={settled:['is-settled','Settled'],pending:['is-pending','Pending Settlement'],disputed:['is-disputed','Disputed']};
  const [cls,label]=map[status]||map.pending;
  return `<span class="msr-status ${cls}">${label}</span>`;
}
function remainClass(x){
  if(x.status==='disputed'||(x.remaining>0&&x.paid===0&&x.status!=='settled')) return 'is-risk';
  if(x.remaining>0) return 'is-due';
  return '';
}
function renderSettlementPager(total){
  const pages=Math.max(1,Math.ceil(total/PAGE_SIZE)||1);
  settlementPage=Math.min(Math.max(1,settlementPage),pages);
  const nav=$('msrPager');
  if(!nav) return;
  let html=`<button type="button" data-msr-page="${settlementPage-1}" ${settlementPage<=1?'disabled':''} aria-label="Previous"><i class="bi bi-chevron-left"></i></button>`;
  for(let i=1;i<=pages;i++){
    if(pages>7&&Math.abs(i-settlementPage)>2&&i!==1&&i!==pages){
      if(i===2||i===pages-1) html+=`<span class="mad-pager-gap">…</span>`;
      continue;
    }
    html+=`<button type="button" data-msr-page="${i}" class="${i===settlementPage?'is-active':''}">${i}</button>`;
  }
  html+=`<button type="button" data-msr-page="${settlementPage+1}" ${settlementPage>=pages?'disabled':''} aria-label="Next"><i class="bi bi-chevron-right"></i></button>`;
  nav.innerHTML=html;
}
function renderSettlements(){
  const total=filteredSettlements.length;
  const start=(settlementPage-1)*PAGE_SIZE;
  const rows=filteredSettlements.slice(start,start+PAGE_SIZE);
  const body=$('msrTableRows');
  if(!body) return;
  if(!rows.length){
    body.innerHTML='<tr><td colspan="7" class="mad-empty">No settlement records for this filter.</td></tr>';
    if($('msrTableFoot')) $('msrTableFoot').hidden=true;
    if($('msrTableInfo')) $('msrTableInfo').textContent='Showing 0 to 0 of 0 settlement records';
    renderSettlementPager(0);
    return;
  }
  body.innerHTML=rows.map(x=>{
    const paidCls=x.paid>0?' is-paid':'';
    const remCls=remainClass(x);
    const remainNote=x.remaining>0?`<span class="msr-remain-note">${esc(x.dueNote==='Disputed'?'Dispute hold':'Pending / 待付')}</span>`:'';
    return `<tr>
      <td><div class="msr-id-cell"><b>#${esc(x.id)}</b><small>${esc(niceShortRange(x.cycleFrom,x.cycleTo))}</small></div></td>
      <td><div class="msr-entity">
        <span class="msr-mark is-${esc(x.markTone)}">${esc(x.initials)}</span>
        <div class="msr-entity-copy">
          <div class="msr-entity-top"><b>${esc(x.name)}</b><span class="msr-code">#${esc(x.code||'-')}</span><span class="msr-type-tag${x.entityType==='Merchant'?' is-merchant':''}">${esc(x.entityType)}</span></div>
          <div class="msr-due-line">Due: ${esc(niceShort(x.due)||'—')}${x.dueNote?` (${esc(x.dueNote)})`:''}</div>
        </div>
      </div></td>
      <td class="mre-num">${money(x.payable)}</td>
      <td class="mre-num${paidCls}">${money(x.paid)}</td>
      <td class="mre-num ${remCls}"><div class="msr-remain-cell"><b>${money(x.remaining)}</b>${remainNote}</div></td>
      <td>${statusPillHtml(x.status)}</td>
      <td><div class="msr-actions">
        <button type="button" class="mad-icon-btn" title="View" data-msr-action="view" data-id="${esc(x.id)}"><i class="bi bi-eye"></i></button>
        <button type="button" class="mad-icon-btn" title="Edit" data-msr-action="edit" data-id="${esc(x.id)}"><i class="bi bi-pencil"></i></button>
        <button type="button" class="mad-icon-btn" title="Export" data-msr-action="export" data-id="${esc(x.id)}"><i class="bi bi-download"></i></button>
        <button type="button" class="mad-icon-btn" title="More" data-msr-action="more" data-id="${esc(x.id)}"><i class="bi bi-three-dots"></i></button>
      </div></td>
    </tr>`;
  }).join('');

  const sumP=filteredSettlements.reduce((a,x)=>a+x.payable,0);
  const sumPaid=filteredSettlements.reduce((a,x)=>a+x.paid,0);
  const sumRem=filteredSettlements.reduce((a,x)=>a+x.remaining,0);
  const pct=sumP>0?(sumPaid/sumP)*100:0;
  if($('msrTotalPayable')) $('msrTotalPayable').textContent=money(sumP);
  if($('msrTotalPaid')) $('msrTotalPaid').textContent=money(sumPaid);
  if($('msrTotalRemain')) $('msrTotalRemain').textContent=money(sumRem);
  if($('msrPaidPct')) $('msrPaidPct').textContent=`${pct.toFixed(1)}% Paid`;
  if($('msrNextBatch')) $('msrNextBatch').textContent='Next Batch: 18:00 UTC+8';
  if($('msrTableFoot')) $('msrTableFoot').hidden=false;
  const from=total?start+1:0, to=Math.min(start+PAGE_SIZE,total);
  if($('msrTableInfo')) $('msrTableInfo').textContent=`Showing ${from} to ${to} of ${total} settlement records`;
  renderSettlementPager(total);
  updateCurrencyLabels();
}
async function loadSettlements(){
  try{
    const month=String($('msrDateFrom')?.value||'').slice(0,7);
    if(month){
      const d=await api('/admin/main/settlements?month='+encodeURIComponent(month));
      const rows=Array.isArray(d)?d:(d.rows||[]);
      if(rows.length){
        currentSettlements=rows.map((x,i)=>normalizeSettlement(x,i));
        updateMsrCounts();
        applySettlementFilters();
        syncedAt=Date.now();
        updateSyncLabel();
        return;
      }
    }
  }catch(e){console.warn('Settlement API unavailable, using demo rows',e)}
  currentSettlements=demoSettlements();
  updateMsrCounts();
  applySettlementFilters();
  syncedAt=Date.now();
  updateSyncLabel();
}

function presetRange(key){
  const now=new Date(), today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  let a=new Date(today), b=new Date(today);
  const startOfWeek=d=>{const x=new Date(d);x.setDate(x.getDate()-x.getDay());return x;};
  if(key==='yesterday'){a.setDate(a.getDate()-1);b=new Date(a)}
  if(key==='thisWeek'){a=startOfWeek(today);b=new Date(a);b.setDate(b.getDate()+6)}
  if(key==='lastWeek'){a=startOfWeek(today);a.setDate(a.getDate()-7);b=new Date(a);b.setDate(b.getDate()+6)}
  if(key==='thisMonth'){a=new Date(today.getFullYear(),today.getMonth(),1);b=new Date(today)}
  if(key==='lastMonth'){a=new Date(today.getFullYear(),today.getMonth()-1,1);b=new Date(today.getFullYear(),today.getMonth(),0)}
  if(key==='thisYear'){a=new Date(today.getFullYear(),0,1);b=new Date(today.getFullYear(),11,31)}
  if(key==='lastYear'){a=new Date(today.getFullYear()-1,0,1);b=new Date(today.getFullYear()-1,11,31)}
  return [ymd(a),ymd(b)];
}
function msrUpdateDateLabel(){
  const f=$('msrDateFrom')?.value||'', t=$('msrDateTo')?.value||'';
  if(!$('msrDateLabel')) return;
  $('msrDateLabel').textContent=f&&t?`${niceShort(f)} – ${niceShort(t)}`:f?`${niceShort(f)} – Select end date`:'Select date range';
}
function msrMarkPreset(key){document.querySelectorAll('[data-msr-preset]').forEach(b=>b.classList.toggle('active',b.dataset.msrPreset===key))}
function msrRenderCalendar(){
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthBtn=$('msrCalMonth'),yearBtn=$('msrCalYear'),monthGrid=$('msrCalMonthGrid'),yearGrid=$('msrCalYearGrid'),dayView=$('msrCalDayView'),days=$('msrCalDays');
  if(!monthBtn||!days) return;
  monthBtn.innerHTML=months[msrPicker.view.getMonth()]+' <i class="bi bi-chevron-down"></i>';
  yearBtn.innerHTML=msrPicker.view.getFullYear()+' <i class="bi bi-chevron-down"></i>';
  monthGrid.innerHTML=months.map((m,i)=>`<button type="button" data-msr-month="${i}" class="${i===msrPicker.view.getMonth()?'active':''}">${m}</button>`).join('');
  yearGrid.innerHTML=Array.from({length:12},(_,i)=>msrPicker.yearPageStart+i).map(y=>`<button type="button" data-msr-year="${y}" class="${y===msrPicker.view.getFullYear()?'active':''}">${y}</button>`).join('');
  monthGrid.classList.toggle('show',msrPicker.mode==='months');
  yearGrid.classList.toggle('show',msrPicker.mode==='years');
  dayView.classList.toggle('hide',msrPicker.mode!=='days');
  const y=msrPicker.view.getFullYear(),m=msrPicker.view.getMonth(),first=new Date(y,m,1),last=new Date(y,m+1,0),start=first.getDay(),total=last.getDate(),from=$('msrDateFrom').value,to=$('msrDateTo').value;
  let html='',prevLast=new Date(y,m,0).getDate();
  for(let i=0;i<start;i++) html+=`<button type="button" class="muted" disabled>${prevLast-start+i+1}</button>`;
  for(let d=1;d<=total;d++){
    const val=ymd(new Date(y,m,d)),inRange=from&&to&&val>=from&&val<=to,isEdge=val===from||val===to;
    html+=`<button type="button" data-msr-day="${val}" class="${inRange?'in-range':''} ${isEdge?'selected':''}">${d}</button>`;
  }
  for(let i=1;i<=42-(start+total);i++) html+=`<button type="button" class="muted" disabled>${i}</button>`;
  days.innerHTML=html;
}
function msrSetRange(a,b,preset){
  if($('msrDateFrom')) $('msrDateFrom').value=a||'';
  if($('msrDateTo')) $('msrDateTo').value=b||'';
  msrUpdateDateLabel();
  msrMarkPreset(preset||'');
  msrRenderCalendar();
}
function setupSettlementDatePicker(){
  if(!$('msrDateTrigger')) return;
  const [a,b]=presetRange('today');
  msrPicker.view=new Date(a+'T00:00:00');
  msrSetRange(a,b,'today');
  $('msrDateTrigger').addEventListener('click',e=>{e.stopPropagation();$('msrRangePicker').classList.toggle('show');msrPicker.mode='days';msrRenderCalendar();});
  document.addEventListener('click',e=>{if(!e.target.closest('#msrRangePicker')&&!e.target.closest('#msrDateTrigger')) $('msrRangePicker')?.classList.remove('show');});
  document.querySelectorAll('[data-msr-preset]').forEach(btn=>btn.addEventListener('click',e=>{
    e.stopPropagation();
    const key=btn.dataset.msrPreset,[aa,bb]=presetRange(key);
    msrPicker.view=new Date(aa+'T00:00:00');
    msrSetRange(aa,bb,key);
    $('msrRangePicker').classList.remove('show');
    loadSettlements();
  }));
  $('msrCalPrev').onclick=()=>{if(msrPicker.mode==='years') msrPicker.yearPageStart-=12; else msrPicker.view=new Date(msrPicker.view.getFullYear(),msrPicker.view.getMonth()-1,1);msrRenderCalendar();};
  $('msrCalNext').onclick=()=>{if(msrPicker.mode==='years') msrPicker.yearPageStart+=12; else msrPicker.view=new Date(msrPicker.view.getFullYear(),msrPicker.view.getMonth()+1,1);msrRenderCalendar();};
  $('msrCalMonth').onclick=()=>{msrPicker.mode=msrPicker.mode==='months'?'days':'months';msrRenderCalendar();};
  $('msrCalYear').onclick=()=>{msrPicker.mode=msrPicker.mode==='years'?'days':'years';msrRenderCalendar();};
  $('msrCalMonthGrid').onclick=e=>{const b=e.target.closest('[data-msr-month]');if(!b)return;msrPicker.view=new Date(msrPicker.view.getFullYear(),Number(b.dataset.msrMonth),1);msrPicker.mode='days';msrRenderCalendar();};
  $('msrCalYearGrid').onclick=e=>{const b=e.target.closest('[data-msr-year]');if(!b)return;msrPicker.view=new Date(Number(b.dataset.msrYear),msrPicker.view.getMonth(),1);msrPicker.mode='days';msrRenderCalendar();};
  $('msrCalDays').onclick=e=>{
    const b=e.target.closest('[data-msr-day]');
    if(!b) return;
    const val=b.dataset.msrDay,f=$('msrDateFrom'),t=$('msrDateTo');
    if(!f.value||(f.value&&t.value)||val<f.value){f.value=val;t.value='';msrMarkPreset('');msrUpdateDateLabel();msrRenderCalendar();return;}
    t.value=val;msrMarkPreset('');msrUpdateDateLabel();msrRenderCalendar();$('msrRangePicker').classList.remove('show');loadSettlements();
  };
}
function setupSettlementFilters(){
  document.querySelectorAll('[data-msr-status]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      msrStatusPill=btn.getAttribute('data-msr-status')||'all';
      document.querySelectorAll('[data-msr-status]').forEach(b=>b.classList.toggle('is-active',b===btn));
      applySettlementFilters();
    });
  });
  let searchTimer=null;
  $('msrSearchInput')?.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(applySettlementFilters,180);});
  $('msrCycleFilter')?.addEventListener('change',applySettlementFilters);
  $('msrStatusFilter')?.addEventListener('change',applySettlementFilters);
  $('msrResetBtn')?.addEventListener('click',()=>{
    if($('msrSearchInput')) $('msrSearchInput').value='';
    if($('msrCycleFilter')) $('msrCycleFilter').value='';
    if($('msrStatusFilter')) $('msrStatusFilter').value='';
    msrStatusPill='all';
    document.querySelectorAll('[data-msr-status]').forEach(b=>b.classList.toggle('is-active',b.getAttribute('data-msr-status')==='all'));
    applySettlementFilters();
  });
  $('msrPager')?.addEventListener('click',e=>{
    const b=e.target.closest('[data-msr-page]');
    if(!b||b.disabled) return;
    const pages=Math.max(1,Math.ceil(filteredSettlements.length/PAGE_SIZE));
    const n=Number(b.dataset.msrPage);
    if(n>=1&&n<=pages&&n!==settlementPage){settlementPage=n;renderSettlements();}
  });
  document.querySelectorAll('[data-msr-currency]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      msrCurrency=btn.getAttribute('data-msr-currency')||window.BO_MAIN_CURRENCY?.code?.()||'MYR';
      document.querySelectorAll('[data-msr-currency]').forEach(b=>{
        const on=b===btn;
        b.classList.toggle('is-active',on);
        b.setAttribute('aria-pressed',on?'true':'false');
      });
      updateCurrencyLabels();
    });
  });
  $('reportExport')?.addEventListener('click',()=>{
    const head=['Settlement ID','Cycle From','Cycle To','Entity','Code','Type','Payable','Paid','Remaining','Status'];
    const lines=[head,...filteredSettlements.map(x=>[x.id,x.cycleFrom,x.cycleTo,x.name,x.code,x.entityType,x.payable,x.paid,x.remaining,x.status])];
    const blob=new Blob([lines.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`merchant-settlement-${$('msrDateFrom').value}-${$('msrDateTo').value}.csv`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),500);
  });
}
function setupPlaceholderTabs(){
  document.querySelectorAll('[data-report-tab]').forEach(b=>b.addEventListener('click',()=>{
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

document.addEventListener('DOMContentLoaded',()=>{
  BO_AUTH.requireLogin();
  setupPlaceholderTabs();
  setupSettlementFilters();
  setupSettlementDatePicker();
  updateCurrencyLabels();
  loadSettlements();
  setInterval(updateSyncLabel,30000);
});
})();
