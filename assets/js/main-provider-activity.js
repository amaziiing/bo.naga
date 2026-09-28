(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let page=0,totalPages=0,pageSize=20,autoPageSize=null,resizeTimer=null;
const PAGE=20;
const pageSizeEl=$('mpaEntriesPageSize');
const tableWrap=document.querySelector('.mad-table-wrap');
const tbody=$('mpaRows');

function isAutoPageSize(value){
  const v=String(value??'-').trim();
  return v===''||v==='-'||/^auto$/i.test(v);
}
function measureAutoPageSize(){
  if(!tableWrap) return PAGE;
  const head=tableWrap.querySelector('thead');
  const sample=tableWrap.querySelector('tbody tr:not(.mad-empty)');
  const rowHeight=sample?Math.max(36,Math.round(sample.getBoundingClientRect().height)):48;
  const available=Math.max(0,Math.floor(tableWrap.clientHeight)-(head?Math.ceil(head.getBoundingClientRect().height):0));
  return Math.max(5,Math.min(200,Math.floor(available/rowHeight)||PAGE));
}
function resolvePageSize(){
  const raw=String(pageSizeEl&&pageSizeEl.value||'-').trim();
  if(/^all$/i.test(raw)) return 10000;
  if(isAutoPageSize(raw)){
    if(autoPageSize==null) autoPageSize=measureAutoPageSize();
    return autoPageSize;
  }
  const n=Number(raw);
  return Number.isFinite(n)&&n>0?n:PAGE;
}
function resetEvenFill(){
  if(!tbody) return;
  const table=tbody.closest('table');
  if(table){ table.classList.remove('bo-tx-evenfill'); table.style.height=''; }
  if(tableWrap) tableWrap.removeAttribute('data-bo-autofit');
  [...tbody.querySelectorAll('tr')].forEach(tr=>{
    tr.style.height='';
    tr.querySelectorAll('td').forEach(td=>{td.style.height='';td.style.minHeight='';});
  });
}
function evenFillRowHeights(){
  if(!tbody||!tableWrap) return;
  resetEvenFill();
  if(!pageSizeEl||!isAutoPageSize(pageSizeEl.value)) return;
  const table=tbody.closest('table');
  if(!table) return;
  const rows=[...tbody.querySelectorAll('tr')].filter(tr=>!tr.querySelector('.mad-empty'));
  if(!rows.length) return;
  void table.offsetHeight;
  const head=tableWrap.querySelector('thead');
  const avail=Math.max(0,Math.floor(tableWrap.clientHeight)-(head?Math.ceil(head.getBoundingClientRect().height):0));
  const natural=rows.reduce((sum,tr)=>sum+Math.ceil(tr.getBoundingClientRect().height),0);
  const rowH=Math.max(36,Math.round(natural/rows.length)||48);
  if(natural>avail+1&&autoPageSize!=null&&autoPageSize>5){
    autoPageSize=Math.max(5,autoPageSize-1);
    load();
    return;
  }
  const gap=avail-natural;
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
  table.style.height=(avail+(head?Math.ceil(head.getBoundingClientRect().height):0))+'px';
  tableWrap.setAttribute('data-bo-autofit','');
  if(tableWrap.scrollHeight>tableWrap.clientHeight){
    const over=tableWrap.scrollHeight-tableWrap.clientHeight;
    const shrink=Math.ceil(over/rows.length)||1;
    rows.forEach(tr=>{
      const h=Math.max(rowH,(parseFloat(tr.style.height)||base)-shrink);
      tr.style.height=h+'px';
      tr.querySelectorAll('td').forEach(td=>{td.style.height=h+'px';});
    });
  }
}
function scheduleEvenFill(){requestAnimationFrame(()=>requestAnimationFrame(evenFillRowHeights))}

async function api(path){const base=String(API_CONFIG.BASE_URL||'').replace(/\/$/,'');const r=await fetch(base+path,{headers:{...BO_AUTH.authHeader(),'X-Brand-Id':'1'},cache:'no-store'});const j=await r.json().catch(()=>({}));if(!r.ok||j.status==='error')throw Error(j.message||'Request failed');return j.data??j}
function dt(v){return window.BO_FORMAT?.dateTime?BO_FORMAT.dateTime(v):(v?String(v).replace('T',' ').slice(0,19):'-')}

/* Time visible, date in the hover tip — the presentation the Security & Audit log uses.
   Both halves come from BO_FORMAT, which is what applies the bo_timezone setting; parsing
   the raw value here would ignore it. Splitting its output keeps the two in step. */
function dtParts(v){const f=String(dt(v)),i=f.indexOf(' ');return i>0?{date:f.slice(0,i),time:f.slice(i+1)}:{date:'',time:f}}
function whenCell(v){const p=dtParts(v);if(!p.date)return '<span class="mad-time">'+esc(p.time)+'</span>';return '<span class="mad-time mad-time-tip" data-date="'+esc(p.date)+'" tabindex="0">'+esc(p.time)+'</span>'}
function parseAfter(x){try{return JSON.parse(x.afterJson||'{}')}catch(e){return {}}}
function ctx(x){const a=parseAfter(x);return a.businessContext||{}}
function fields(x){return ctx(x).fields||{}}
function providerTarget(x){const a=parseAfter(x),f=fields(x),c=ctx(x);return a.providerName||a.providerCode||f.providerName||f.providerCode||f.counterpartyName||f.counterpartyKey||c.providerCode||c.providerName||'Provider'}
function action(x){return String(x.action||'UPDATE').replaceAll('_',' ')}
function status(x){const a=parseAfter(x),ok=a.success!==false&&Number(a.httpStatus||200)<400;return `<span class="settlement-status ${ok?'success':'danger'}">${ok?'Success':'Failed'}</span>`}
function detail(x){const a=parseAfter(x),parts=[];if(a.settlementCostPercent!=null)parts.push('Provider rate: '+a.settlementCostPercent+'%');if(a.settlementCostBasis)parts.push('Basis: '+a.settlementCostBasis);if(a.currency)parts.push('Currency: '+a.currency);if(a.status)parts.push('Status: '+a.status);const e=a.extra||{};if(e.direction)parts.push(e.direction==='PAY'?'Pay to provider':'Collect from provider');if(e.amount!=null)parts.push('Amount: '+e.amount);if(e.month)parts.push('Month: '+e.month);if(e.paymentDate)parts.push('Payment: '+e.paymentDate);if(e.toMonth)parts.push('Carried to: '+e.toMonth);if(a.balance!=null)parts.push('Balance: '+a.balance);return parts.length?parts.join(' · '):(x.detail||'-')}
/* Same ladder the sibling Providers list paints in .mad-pager .smart-page (main-provider-detail.js):
   first and last page always present, a -2/+2 window around the current one, gap collapsed to an
   ellipsis. Kept identical on purpose so the two tabs of this family read as one control. */
function pageButtons(total){total=Math.max(1,Number(total)||1);const cur=page+1,pages=[],add=n=>{if(n>=1&&n<=total&&!pages.includes(n))pages.push(n)};add(1);for(let n=cur-2;n<=cur+2;n++)add(n);add(total);pages.sort((a,b)=>a-b);let html='<button type="button" class="smart-page nav-text" data-page="'+Math.max(1,cur-1)+'" '+(cur<=1?'disabled':'')+'>Previous</button>',prev=0;pages.forEach(n=>{if(prev&&n-prev>1)html+='<span class="smart-page-ellipsis">…</span>';html+='<button type="button" class="smart-page'+(n===cur?' active':'')+'" data-page="'+n+'"'+(n===cur?' aria-current="page"':'')+'>'+n+'</button>';prev=n});html+='<button type="button" class="smart-page nav-text" data-page="'+Math.min(total,cur+1)+'" '+(cur>=total?'disabled':'')+'>Next</button>';return html}
function pager(){const box=$('mpaPager');if(!box)return;box.innerHTML=totalPages>1?pageButtons(totalPages):''}
async function load(){
  const body=$('mpaRows');
  pageSize=resolvePageSize();
  const size=pageSize;
  body.innerHTML='<tr><td colspan="7" class="mad-empty">Loading activity...</td></tr>';
  try{
    const q=new URLSearchParams({page:String(page),size:String(size)});
    if($('mpaActor')?.value.trim())q.set('actor',$('mpaActor').value.trim());
    if($('reportDateFrom')?.value)q.set('from',$('reportDateFrom').value);
    if($('reportDateTo')?.value)q.set('to',$('reportDateTo').value);
    const d=await api('/admin/main/provider-activity?'+q),a=d.content||[];
    totalPages=Number(d.totalPages||0);
    if(!a.length){
      resetEvenFill();
      body.innerHTML='<tr><td colspan="7" class="mad-empty">No provider business activity found.</td></tr>';
    }else{
      body.innerHTML=a.map(x=>`<tr><td class="mad-time-cell">${whenCell(x.createdAt)}</td><td><b>${esc(providerTarget(x))}</b></td><td>${esc(action(x))}</td><td><b>${esc(x.actor||'SYSTEM')}</b></td><td>${esc(detail(x))}</td><td>${esc(x.ipAddress||'-')}</td><td>${status(x)}</td></tr>`).join('');
      scheduleEvenFill();
    }
    const total=Number(d.totalElements||0),from=total?page*size+1:0,to=Math.min(total,(page+1)*size);
    $('mpaInfo').textContent=`Showing ${from} to ${to} of ${total} entries`;
    pager();
  }catch(e){
    resetEvenFill();
    body.innerHTML=`<tr><td colspan="7" class="mad-empty text-danger">${esc(e.message)}</td></tr>`;
    $('mpaInfo').textContent='Showing 0 to 0 of 0 entries';
    $('mpaPager').innerHTML='';
  }
}
/* ---------------------------------------------------------------------------
   Date-range picker — the fifth copy of the family calendar (the settlement ledger,
   security, profit and the merchant report each carry one; a shared driver is the
   eventual cleanup). The class contract is identical to its siblings so one stylesheet
   serves them all: This Month by default, `in-range` / `selected` / `is-start` /
   `is-end` / `is-preview`, and the panel stays open after the first click so a range
   can be completed. Replaces this page's two native input[type=date] fields.
   --------------------------------------------------------------------------- */
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const pickerState={view:new Date(),mode:'days',yearPageStart:new Date().getFullYear()-5,hover:''};
function p2(n){return String(n).padStart(2,'0')}
function ymd(d){return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())}
function dmy(v){if(!v)return '';const a=String(v).split('-');return a.length===3?`${a[2]} ${MONTHS[Number(a[1])-1]} ${a[0]}`:v}
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
  const monthBtn=$('reportCalMonth'),yearBtn=$('reportCalYear'),monthGrid=$('reportCalMonthGrid'),yearGrid=$('reportCalYearGrid'),dayView=$('reportCalDayView'),days=$('reportCalDays');
  if(!monthBtn||!yearBtn||!monthGrid||!yearGrid||!dayView||!days) return;
  monthBtn.innerHTML=MONTHS[pickerState.view.getMonth()]+' <i class="bi bi-chevron-down"></i>';
  yearBtn.innerHTML=pickerState.view.getFullYear()+' <i class="bi bi-chevron-down"></i>';
  monthGrid.innerHTML=MONTHS.map((m,i)=>`<button type="button" data-report-month="${i}" class="${i===pickerState.view.getMonth()?'active':''}">${m}</button>`).join('');
  yearGrid.innerHTML=Array.from({length:12},(_,i)=>pickerState.yearPageStart+i).map(y=>`<button type="button" data-report-year="${y}" class="${y===pickerState.view.getFullYear()?'active':''}">${y}</button>`).join('');
  monthGrid.classList.toggle('show',pickerState.mode==='months');
  yearGrid.classList.toggle('show',pickerState.mode==='years');
  dayView.classList.toggle('hide',pickerState.mode!=='days');
  const y=pickerState.view.getFullYear(),m=pickerState.view.getMonth(),first=new Date(y,m,1),last=new Date(y,m+1,0),start=first.getDay(),total=last.getDate(),from=$('reportDateFrom').value,to=$('reportDateTo').value;
  let html='',prevLast=new Date(y,m,0).getDate();
  for(let i=0;i<start;i++) html+=`<button type="button" class="muted" disabled>${prevLast-start+i+1}</button>`;
  // While only the start is picked, the hovered day previews the far end so the range reads
  // as one continuous strip before anything is committed. Hovering before the start is
  // deliberately ignored: a click there restarts the range, so the preview must not promise
  // something the click will not do.
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
function onRangeApplied(){page=0;load()}
function setupDatePicker(){
  if(!$('reportDateTrigger')) return;
  const [a,b]=presetRange('today');
  pickerState.view=new Date(a+'T00:00:00');
  setRange(a,b,'today');
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
    if($('reportDateFrom').value&&!$('reportDateTo').value) renderCalendar();
  });
  $('reportCalDays').addEventListener('mouseleave',()=>{
    if(!pickerState.hover) return;
    pickerState.hover='';
    if($('reportDateFrom').value&&!$('reportDateTo').value) renderCalendar();
  });
  $('reportCalDays').addEventListener('click',e=>{
    e.stopPropagation();
    const b=e.target.closest('[data-report-day]');
    if(!b) return;
    const val=b.dataset.reportDay,f=$('reportDateFrom'),t=$('reportDateTo');
    if(!f.value||(f.value&&t.value)||val<f.value){
      f.value=val;t.value='';pickerState.hover='';markPreset('');updateDateLabel();renderCalendar();
      return; // stays open for the second click
    }
    t.value=val;pickerState.hover='';markPreset('');updateDateLabel();renderCalendar();
    $('reportRangePicker').classList.remove('show');
    onRangeApplied();
  });
}

BO_AUTH.requireLogin();setupDatePicker();
load().then(()=>requestAnimationFrame(()=>{
  if(pageSizeEl&&isAutoPageSize(pageSizeEl.value)){
    autoPageSize=null;
    page=0;
    load();
  }
}));
$('mpaRefresh')?.addEventListener('click',()=>{page=0;load()});
$('mpaActor')?.addEventListener('change',()=>{page=0;load()});
$('mpaPager')?.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(!b||b.disabled)return;const p=Number(b.dataset.page)-1;if(!Number.isFinite(p)||p===page)return;page=p;load()});
pageSizeEl?.addEventListener('change',()=>{autoPageSize=null;page=0;load()});
window.addEventListener('resize',()=>{
  if(!pageSizeEl||!isAutoPageSize(pageSizeEl.value)) return;
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{autoPageSize=null;page=0;load()},120);
});
})();


/* Float tip for the Date & Time column. The cell's own ::after tip is unusable here for the
   same reason as on the Security log: the table sits inside clipping ancestors, so a tip drawn
   above the first row is cut. A fixed-position element escapes the clip and paints over
   everything, and it flips below the cell when there is no room above. Same runtime as
   main-admin-security.js / main-merchant-security.js — the repo already carries several copies
   of the date picker for the same reason, and a shared driver is the eventual cleanup. */
(function(){
  'use strict';
  var tip = null, host = null;
  function box(){
    if(!tip || !tip.isConnected){
      tip = document.createElement('div');
      tip.className = 'mad-float-tip';
      tip.setAttribute('aria-hidden', 'true');
      document.body.appendChild(tip);
    }
    return tip;
  }
  function hide(){ host = null; if(tip){ tip.classList.remove('is-on'); tip.classList.remove('is-below'); } }
  function place(target){
    var text = target.getAttribute('data-date');
    if(!text){ hide(); return; }
    host = target;
    var t = box();
    t.textContent = text;
    t.classList.add('is-on');
    var r = target.getBoundingClientRect();
    var tr = t.getBoundingClientRect();
    var above = r.top - tr.height - 10;
    var below = above < 8;
    t.classList.toggle('is-below', below);
    var left = Math.max(8, Math.min(r.left, window.innerWidth - tr.width - 8));
    t.style.left = Math.round(left) + 'px';
    t.style.top = Math.round(below ? r.bottom + 10 : above) + 'px';
  }
  document.addEventListener('mouseover', function(e){
    var el = e.target && e.target.closest ? e.target.closest('.mad-time-tip') : null;
    if(el){ if(el !== host) place(el); return; }
    if(host) hide();
  });
  document.addEventListener('focusin', function(e){
    var el = e.target && e.target.closest ? e.target.closest('.mad-time-tip') : null;
    if(el) place(el);
  });
  document.addEventListener('focusout', hide);
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
})();
