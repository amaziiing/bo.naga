(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Number(v||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});

let settlementRows=[],settlementPage=1,settlementPageSize=10,syncedAt=Date.now();
let providerDirectory=[];

async function api(path,opt={}){
  const base=String((window.API_CONFIG&&window.API_CONFIG.BASE_URL)||'').replace(/\/$/,'');
  if(!base) throw Error('API base URL is not configured');
  const method=opt.method||'GET',headers={...BO_AUTH.authHeader(),'X-Brand-Id':'1'};
  if(opt.body!==undefined) headers['Content-Type']='application/json';
  const r=await fetch(base+path,{method,headers,body:opt.body===undefined?undefined:JSON.stringify(opt.body),cache:'no-store'});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.status==='error') throw Error(j.message||'Request failed');
  return j.data??j;
}

function today(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}
function monthFromDate(v){return /^\d{4}-\d{2}/.test(String(v||''))?String(v).slice(0,7):today().slice(0,7)}
function pageButtons(current,total){
  total=Math.max(1,Number(total)||1);current=Math.max(1,Math.min(Number(current)||1,total));
  const pages=[],addPage=n=>{if(n>=1&&n<=total&&!pages.includes(n))pages.push(n)};
  addPage(1);for(let n=current-2;n<=current+2;n++)addPage(n);addPage(total);pages.sort((a,b)=>a-b);
  let h=`<button type="button" class="smart-page nav-text" data-page="${Math.max(1,current-1)}" ${current<=1?'disabled':''}>Previous</button>`,prev=0;
  pages.forEach(n=>{if(prev&&n-prev>1)h+='<span class="smart-page-ellipsis">…</span>';h+=`<button type="button" class="smart-page ${n===current?'active':''}" data-page="${n}" ${n===current?'aria-current="page"':''}>${n}</button>`;prev=n});
  return h+`<button type="button" class="smart-page nav-text" data-page="${Math.min(total,current+1)}" ${current>=total?'disabled':''}>Next</button>`;
}
function statusBadge(v){const s=String(v||'OPEN'),c=/paid|settled|completed/i.test(s)?'success':/pending|open|partial/i.test(s)?'warning':'primary';return `<span class="settlement-status ${c}">${esc(s)}</span>`}
function directionChip(v){return `<span class="direction-chip ${v==='COLLECT'?'collect':'pay'}">${v==='COLLECT'?'To Collect':'To Pay'}</span>`}
function providerOnly(rows){return(rows||[]).filter(x=>/provider/i.test(String(x.counterpartyType||x.entityType||'')))}
function providerNameById(id,fallback=''){const m=providerDirectory.find(x=>String(x.id??x.providerId??x.code??'')===String(id??''));return m?(m.name||m.providerName||m.code||m.providerCode||fallback):fallback}

async function ensureDirectory(){
  if(providerDirectory.length) return;
  const d=await api('/admin/main/provider-directory');
  providerDirectory=Array.isArray(d)?d:(d.rows||d.items||[]);
}

function directoryRows(raw){return Array.isArray(raw)?raw:(raw?.rows||raw?.items||raw?.providers||[])}
function providerCode(x){return String(x?.code??x?.providerCode??x?.id??'')}
function providerDisplay(x){return String(x?.name??x?.providerName??x?.code??x?.providerCode??'Provider')}
function providerCurrency(x){return String(x?.currency||'MYR').toUpperCase()}
function fillProviderSettlementProviders(){
  const sel=$('providerSettlementProvider');if(!sel)return;
  const rows=directoryRows(providerDirectory);
  sel.innerHTML='<option value="">Select Provider</option>'+rows.map(x=>`<option value="${esc(providerCode(x))}" data-name="${esc(providerDisplay(x))}" data-currency="${esc(providerCurrency(x))}">${esc(providerDisplay(x))} (${esc(providerCode(x))})</option>`).join('');
}
function syncProviderSettlementCurrency(){const o=$('providerSettlementProvider')?.selectedOptions?.[0],u=$('providerSettlementCreateUnit');if(u)u.textContent=o?.dataset?.currency||'MYR'}
async function openProviderSettlementCreate(){
  try{await ensureDirectory();fillProviderSettlementProviders();if($('providerSettlementCreateMonth'))$('providerSettlementCreateMonth').value=$('settlementMonth')?.value||today().slice(0,7);if($('providerSettlementCreateAmount'))$('providerSettlementCreateAmount').value='';if($('providerSettlementCreateNote'))$('providerSettlementCreateNote').value='';syncProviderSettlementCurrency();openMsrModal('providerSettlementCreateModal')}catch(e){alert(e.message)}
}
async function createProviderSettlement(e){
  e.preventDefault();const sel=$('providerSettlementProvider'),o=sel?.selectedOptions?.[0],amount=Number($('providerSettlementCreateAmount')?.value||0),month=$('providerSettlementCreateMonth')?.value,btn=$('providerSettlementCreateSave');
  if(!o?.value){alert('Please select a provider');return}if(!month){alert('Please select a settlement month');return}if(!(amount>0)){alert('Amount due must be greater than 0');return}
  if(btn)btn.disabled=true;
  try{await api('/admin/main/settlements',{method:'POST',body:{month,counterpartyType:'PROVIDER',counterpartyKey:o.value,counterpartyName:o.dataset.name||o.textContent,direction:$('providerSettlementDirection')?.value||'COLLECT',amount,note:$('providerSettlementCreateNote')?.value||'',currency:o.dataset.currency||'MYR'}});closeMsrModal('providerSettlementCreateModal');if($('settlementMonth'))$('settlementMonth').value=month;await loadSettlements()}catch(err){alert(err.message)}finally{if(btn)btn.disabled=false}
}

function updateSyncLabel(){
  const el=$('reportSyncLabel');
  if(!el) return;
  const mins=Math.max(0,Math.floor((Date.now()-syncedAt)/60000));
  el.innerHTML=`<i class="bi bi-arrow-repeat" aria-hidden="true"></i> Synced ${mins===0?'just now':mins===1?'1 min ago':mins+' mins ago'}`;
}

function renderSettlements(){
  const total=settlementRows.length,pages=Math.max(1,Math.ceil(total/settlementPageSize)||1);
  settlementPage=Math.max(1,Math.min(settlementPage,pages));
  const start=(settlementPage-1)*settlementPageSize,shown=settlementRows.slice(start,start+settlementPageSize);
  if($('settlementRows')) $('settlementRows').innerHTML=shown.map(x=>{
    const closed=/paid|settled|carried/i.test(String(x.status||''));
    const name=x.counterpartyName||providerNameById(x.counterpartyKey,'Provider');
    return `<tr><td>${esc(x.month||'')}</td><td><b>${esc(name)}</b><small class="d-block text-muted">Provider</small></td><td>${directionChip(x.direction)}</td><td class="mre-num value-neutral">${money(x.totalDue)}</td><td class="mre-num value-positive">${money(x.paidAmount)}</td><td class="mre-num ${Number(x.balanceAmount)>0?'value-negative':'value-positive'}">${money(x.balanceAmount)}</td><td>${statusBadge(x.status)}</td><td class="msr-action-cell"><div class="settlement-actions msr-actions"><button type="button" class="mad-icon-btn" data-tip="Record Amount" title="Record Amount" aria-label="Record Amount" data-payment-id="${esc(x.id)}" data-payment-name="${esc(name)}" data-payment-balance="${Number(x.balanceAmount||0)}" data-payment-direction="${esc(x.direction||'')}" ${closed?'disabled':''}><i class="bi bi-cash-coin" aria-hidden="true"></i></button><button type="button" class="mad-icon-btn" data-tip="Carry Forward" title="Carry Forward" aria-label="Carry Forward" data-carry-id="${esc(x.id)}" ${closed||Number(x.balanceAmount)<=0?'disabled':''}><i class="bi bi-arrow-right-circle" aria-hidden="true"></i></button><button type="button" class="mad-icon-btn" data-tip="History" title="History" aria-label="History" data-history-id="${esc(x.id)}"><i class="bi bi-clock-history" aria-hidden="true"></i></button></div></td></tr>`;
  }).join('')||'<tr><td colspan="8" class="mad-empty">No Provider settlement records for this period.</td></tr>';
  if($('settlementInfo')) $('settlementInfo').textContent=total?`Showing ${start+1} to ${start+shown.length} of ${total} settlement records`:'Showing 0 settlement records';
  if($('settlementPager')) $('settlementPager').innerHTML=total?pageButtons(settlementPage,pages):'';
}

async function loadSettlements(){
  await ensureDirectory();
  const month=$('settlementMonth')?.value||monthFromDate($('reportDateFrom')?.value)||monthFromDate(today());
  if($('settlementMonth')) $('settlementMonth').value=month;
  if($('settlementRows')) $('settlementRows').innerHTML='<tr><td colspan="8" class="mad-empty">Loading settlement records...</td></tr>';
  try{
    const d=await api('/admin/main/settlements?month='+encodeURIComponent(month));
    settlementRows=providerOnly(d.rows||[]);
    settlementPage=1;
    syncedAt=Date.now();
    updateSyncLabel();
    renderSettlements();
  }catch(e){
    if($('settlementRows')) $('settlementRows').innerHTML=`<tr><td colspan="8" class="mad-empty text-danger">${esc(e.message)}</td></tr>`;
    if($('settlementInfo')) $('settlementInfo').textContent='Showing 0 settlement records';
    if($('settlementPager')) $('settlementPager').innerHTML='';
  }
}

function exportCsv(){
  const head=['Period','Provider','Type','Amount Due','Paid','Outstanding','Status'];
  const lines=[head,...settlementRows.map(x=>[
    x.month||'',
    x.counterpartyName||providerNameById(x.counterpartyKey,'Provider'),
    String(x.direction||'').toUpperCase()==='COLLECT'?'To Collect':'To Pay',
    x.totalDue,x.paidAmount,x.balanceAmount,x.status||''
  ])];
  const blob=new Blob([lines.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`provider-settlement-${$('settlementMonth')?.value||today().slice(0,7)}.csv`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
}

function openMsrModal(id){const m=$(id);if(!m)return;m.classList.add('show');m.removeAttribute('hidden');m.setAttribute('aria-hidden','false');document.body.classList.add('modal-open')}
function closeMsrModal(id){const m=$(id);if(!m)return;m.classList.remove('show');m.setAttribute('hidden','');m.setAttribute('aria-hidden','true');if(id==='settlementPaymentModal')closePayDatePicker();if(!document.querySelector('.modal-clean.show'))document.body.classList.remove('modal-open')}

const payDateState={view:new Date(),mode:'days',yearPageStart:new Date().getFullYear()-5,bound:false};
function payDatePad(n){return String(n).padStart(2,'0')}
function payDateYmd(d){return d.getFullYear()+'-'+payDatePad(d.getMonth()+1)+'-'+payDatePad(d.getDate())}
function payDateLabel(v){if(!v)return 'Select date';const a=String(v).split('-');if(a.length!==3)return v;return `${a[2]} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(a[1])-1]} ${a[0]}`}
function setPayDate(v){if($('settlementPaymentDate'))$('settlementPaymentDate').value=v||'';if($('settlementPaymentDateLabel'))$('settlementPaymentDateLabel').textContent=payDateLabel(v)}
function closePayDatePicker(){const p=$('settlementPaymentDatePicker'),t=$('settlementPaymentDateTrigger');if(p)p.classList.remove('show');if(t)t.setAttribute('aria-expanded','false')}
function renderPayDateCalendar(){
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthBtn=$('msrPayCalMonth'),yearBtn=$('msrPayCalYear'),monthGrid=$('msrPayCalMonthGrid'),yearGrid=$('msrPayCalYearGrid'),dayView=$('msrPayCalDayView'),days=$('msrPayCalDays');
  if(!monthBtn||!yearBtn||!monthGrid||!yearGrid||!dayView||!days)return;
  monthBtn.innerHTML=months[payDateState.view.getMonth()]+' <i class="bi bi-chevron-down"></i>';
  yearBtn.innerHTML=payDateState.view.getFullYear()+' <i class="bi bi-chevron-down"></i>';
  monthGrid.innerHTML=months.map((m,i)=>`<button type="button" data-msr-pay-month="${i}" class="${i===payDateState.view.getMonth()?'active':''}">${m}</button>`).join('');
  yearGrid.innerHTML=Array.from({length:12},(_,i)=>payDateState.yearPageStart+i).map(y=>`<button type="button" data-msr-pay-year="${y}" class="${y===payDateState.view.getFullYear()?'active':''}">${y}</button>`).join('');
  monthGrid.classList.toggle('show',payDateState.mode==='months');
  yearGrid.classList.toggle('show',payDateState.mode==='years');
  dayView.classList.toggle('hide',payDateState.mode!=='days');
  const y=payDateState.view.getFullYear(),m=payDateState.view.getMonth(),first=new Date(y,m,1),last=new Date(y,m+1,0),start=first.getDay(),total=last.getDate(),selected=$('settlementPaymentDate')?.value||'';
  let html='',prevLast=new Date(y,m,0).getDate();
  for(let i=0;i<start;i++) html+=`<button type="button" class="muted" disabled>${prevLast-start+i+1}</button>`;
  for(let d=1;d<=total;d++){const val=payDateYmd(new Date(y,m,d));html+=`<button type="button" data-msr-pay-day="${val}" class="${val===selected?'selected':''}">${d}</button>`}
  for(let i=1;i<=42-(start+total);i++) html+=`<button type="button" class="muted" disabled>${i}</button>`;
  days.innerHTML=html;
}
function setupPayDatePicker(){
  if(payDateState.bound||!$('settlementPaymentDateTrigger'))return;
  payDateState.bound=true;
  $('settlementPaymentDateTrigger').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const p=$('settlementPaymentDatePicker');const open=!p?.classList.contains('show');if(open){payDateState.mode='days';const cur=$('settlementPaymentDate')?.value;if(cur)payDateState.view=new Date(cur+'T00:00:00');renderPayDateCalendar();p.classList.add('show');$('settlementPaymentDateTrigger').setAttribute('aria-expanded','true')}else closePayDatePicker()});
  document.addEventListener('click',e=>{if(!e.target.closest('.msr-pay-date-field'))closePayDatePicker()});
  $('msrPayCalPrev')?.addEventListener('click',e=>{e.stopPropagation();if(payDateState.mode==='years')payDateState.yearPageStart-=12;else payDateState.view=new Date(payDateState.view.getFullYear(),payDateState.view.getMonth()-1,1);renderPayDateCalendar()});
  $('msrPayCalNext')?.addEventListener('click',e=>{e.stopPropagation();if(payDateState.mode==='years')payDateState.yearPageStart+=12;else payDateState.view=new Date(payDateState.view.getFullYear(),payDateState.view.getMonth()+1,1);renderPayDateCalendar()});
  $('msrPayCalMonth')?.addEventListener('click',e=>{e.stopPropagation();payDateState.mode=payDateState.mode==='months'?'days':'months';renderPayDateCalendar()});
  $('msrPayCalYear')?.addEventListener('click',e=>{e.stopPropagation();payDateState.mode=payDateState.mode==='years'?'days':'years';renderPayDateCalendar()});
  $('msrPayCalMonthGrid')?.addEventListener('click',e=>{e.stopPropagation();const b=e.target.closest('[data-msr-pay-month]');if(!b)return;payDateState.view=new Date(payDateState.view.getFullYear(),Number(b.dataset.msrPayMonth),1);payDateState.mode='days';renderPayDateCalendar()});
  $('msrPayCalYearGrid')?.addEventListener('click',e=>{e.stopPropagation();const b=e.target.closest('[data-msr-pay-year]');if(!b)return;payDateState.view=new Date(Number(b.dataset.msrPayYear),payDateState.view.getMonth(),1);payDateState.mode='days';renderPayDateCalendar()});
  $('msrPayCalDays')?.addEventListener('click',e=>{e.stopPropagation();const b=e.target.closest('[data-msr-pay-day]');if(!b)return;setPayDate(b.dataset.msrPayDay);closePayDatePicker()});
  document.querySelector('[data-msr-pay-today]')?.addEventListener('click',e=>{e.stopPropagation();const now=new Date();setPayDate(payDateYmd(now));payDateState.view=new Date(now.getFullYear(),now.getMonth(),1);closePayDatePicker()});
}

function openPayment(btn){
  $('settlementPaymentId').value=btn.dataset.paymentId;
  const unit=window.BO_MAIN_CURRENCY?.code?.()||'MYR';
  if($('settlementPaymentUnit')) $('settlementPaymentUnit').textContent=unit;
  $('settlementPaymentContext').innerHTML=`<div class="msr-pay-context-main"><strong>${esc(btn.dataset.paymentName)}</strong><small>${String(btn.dataset.paymentDirection||'').toUpperCase()==='PAY'?'To Pay':'To Collect'}</small></div><div class="msr-pay-context-bal"><span>Outstanding</span><b>${esc(unit)} ${money(btn.dataset.paymentBalance)}</b></div>`;
  $('settlementPaymentAmount').value=Number(btn.dataset.paymentBalance||0).toFixed(2);
  $('settlementPaymentAmount').max=btn.dataset.paymentBalance;
  setPayDate(today());
  $('settlementPaymentNote').value='';
  setupPayDatePicker();
  openMsrModal('settlementPaymentModal');
  setTimeout(()=>$('settlementPaymentAmount')?.focus(),40);
}
async function savePayment(e){
  if(e&&e.preventDefault)e.preventDefault();
  const id=$('settlementPaymentId').value,date=$('settlementPaymentDate')?.value||'',btn=$('settlementPaymentSave');
  if(!date){alert('Please select a payment date');return}
  if(btn)btn.disabled=true;
  try{
    await api(`/admin/main/settlements/${id}/payment`,{method:'POST',body:{amount:$('settlementPaymentAmount').value,paymentDate:date,referenceNo:'',note:$('settlementPaymentNote').value}});
    closeMsrModal('settlementPaymentModal');
    await loadSettlements();
  }catch(err){alert(err.message)}
  finally{if(btn)btn.disabled=false}
}
async function showPaymentHistory(id){
  try{
    const rows=await api(`/admin/main/settlements/${id}/payments`);
    $('settlementHistoryRows').innerHTML=(rows||[]).map(x=>`<tr><td>${esc(x.paymentDate||'')}</td><td class="mre-num">${money(x.amount)}</td><td>${esc(x.referenceNo||'-')}</td><td>${esc(x.note||'-')}</td><td>${esc(x.createdBy||'-')}</td></tr>`).join('')||'<tr><td colspan="5" class="mad-empty">No payments recorded yet.</td></tr>';
    openMsrModal('settlementHistoryModal');
  }catch(e){alert(e.message)}
}
async function carryForward(id){
  const ok=window.BO_DIALOG?.confirm
    ? await BO_DIALOG.confirm('Carry only the unpaid balance into the next month? The current settlement will be closed as CARRIED.',{title:'Carry Forward',confirmText:'Carry Forward',cancelText:'Cancel',type:'warning',icon:'bi-box-arrow-right'})
    : confirm('Carry only the unpaid balance into the next month?');
  if(!ok) return;
  try{
    await api(`/admin/main/settlements/${id}/carry-forward`,{method:'POST',body:{}});
    await loadSettlements();
  }catch(e){
    if(window.BO_DIALOG?.alert) BO_DIALOG.alert(e.message,{title:'Unable to Carry Forward',type:'error'});
    else alert(e.message);
  }
}

const pickerState={view:new Date(),mode:'days',yearPageStart:new Date().getFullYear()-5,hover:''};
function pad2(n){return String(n).padStart(2,'0')}
function ymd(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())}
function dmy(v){if(!v)return '';const a=String(v).split('-');return a.length===3?`${a[2]} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(a[1])-1]} ${a[0]}`:v}
function startOfWeek(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-x.getDay());return x}
function endOfWeek(d){const x=startOfWeek(d);x.setDate(x.getDate()+6);return x}
function updateDateLabel(){
  const f=$('reportDateFrom').value,t=$('reportDateTo').value;
  if($('reportDateLabel')) $('reportDateLabel').textContent=f&&t?`${dmy(f)} - ${dmy(t)}`:f?`${dmy(f)} - Select end date`:'Select date range';
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
  if(!monthBtn||!yearBtn||!monthGrid||!yearGrid||!dayView||!days) return;
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
  const bandEnd=to||hover||'',hasBand=!!(from&&bandEnd);
  for(let d=1;d<=total;d++){
    const val=ymd(new Date(y,m,d));
    const inBand=!!(hasBand&&val>=from&&val<=bandEnd);
    // The anchor is marked as soon as it is picked, band or no band - otherwise the first
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
function onRangeApplied(){
  if($('settlementMonth')) $('settlementMonth').value=monthFromDate($('reportDateFrom').value);
  loadSettlements();
}
function setupDatePicker(){
  if(!$('reportDateTrigger')) return;
  const [a,b]=presetRange('today');
  pickerState.view=new Date(a+'T00:00:00');
  setRange(a,b,'today');
  if($('settlementMonth')) $('settlementMonth').value=monthFromDate(a);
  $('reportDateTrigger').addEventListener('click',e=>{e.stopPropagation();$('reportRangePicker').classList.toggle('show');pickerState.mode='days';pickerState.hover='';renderCalendar();});
  document.addEventListener('click',e=>{if(!e.target.closest('.ref-range-wrap')) $('reportRangePicker')?.classList.remove('show');});
  document.querySelectorAll('[data-report-preset]').forEach(btn=>btn.addEventListener('click',e=>{
    e.stopPropagation();
    const key=btn.dataset.reportPreset,[aa,bb]=presetRange(key);
    pickerState.view=new Date(aa+'T00:00:00');
    setRange(aa,bb,key);
    $('reportRangePicker').classList.remove('show');
    onRangeApplied();
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
    // clicks inside the picker. (Same trap as Merchant Detail, DESIGN.md.)
    e.stopPropagation();
    const val=b.dataset.reportDay,f=$('reportDateFrom'),t=$('reportDateTo');
    // First click only anchors the range: the picker stays open (no `show` removal here) so
    // the second click can complete it.
    if(!f.value||(f.value&&t.value)||val<f.value){f.value=val;t.value='';pickerState.hover='';markPreset('');updateDateLabel();renderCalendar();return;}
    t.value=val;pickerState.hover='';markPreset('');updateDateLabel();renderCalendar();$('reportRangePicker').classList.remove('show');onRangeApplied();
  };
}

function bind(){
  $('settlementPager')?.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(!b||b.disabled)return;settlementPage=Number(b.dataset.page||1);renderSettlements()});
  $('settlementPageSize')?.addEventListener('change',e=>{settlementPageSize=Number(e.target.value)||10;settlementPage=1;renderSettlements()});
  $('settlementMonth')?.addEventListener('change',loadSettlements);
  $('settlementRefresh')?.addEventListener('click',loadSettlements);
  $('reportExport')?.addEventListener('click',exportCsv);
  $('reportSyncLabel')?.addEventListener('click',loadSettlements);
  $('settlementPaymentForm')?.addEventListener('submit',savePayment);
  $('providerSettlementAdd')?.addEventListener('click',openProviderSettlementCreate);
  $('providerSettlementCreateForm')?.addEventListener('submit',createProviderSettlement);
  $('providerSettlementProvider')?.addEventListener('change',syncProviderSettlementCurrency);
  document.querySelectorAll('[data-provider-settlement-create-close]').forEach(b=>b.addEventListener('click',()=>closeMsrModal('providerSettlementCreateModal')));
  $('providerSettlementCreateModal')?.addEventListener('click',e=>{if(e.target===$('providerSettlementCreateModal'))closeMsrModal('providerSettlementCreateModal')});
  document.querySelectorAll('[data-msr-payment-close]').forEach(b=>b.addEventListener('click',()=>closeMsrModal('settlementPaymentModal')));
  document.querySelectorAll('[data-msr-history-close]').forEach(b=>b.addEventListener('click',()=>closeMsrModal('settlementHistoryModal')));
  $('settlementPaymentModal')?.addEventListener('click',e=>{if(e.target===$('settlementPaymentModal'))closeMsrModal('settlementPaymentModal')});
  $('settlementHistoryModal')?.addEventListener('click',e=>{if(e.target===$('settlementHistoryModal'))closeMsrModal('settlementHistoryModal')});
  document.addEventListener('click',e=>{
    const p=e.target.closest('[data-payment-id]');
    if(p&&!p.disabled){openPayment(p);return}
    const h=e.target.closest('[data-history-id]');
    if(h){showPaymentHistory(h.dataset.historyId);return}
    const c=e.target.closest('[data-carry-id]');
    if(c&&!c.disabled) carryForward(c.dataset.carryId);
  });
}

document.addEventListener('DOMContentLoaded',()=>{
  setupDatePicker();
  bind();
  ensureDirectory().catch(console.warn);
  loadSettlements();
  setInterval(updateSyncLabel,30000);
});
})();
