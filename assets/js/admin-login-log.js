(function(){
  function pageButtons(current,total){
    if (window.boAc && boAc.pageButtons) return boAc.pageButtons(current, total);
    return '<button type="button" class="smart-page" data-ac-page="' + current + '" aria-current="page">' + current + '</button>';
  }

  'use strict';
  BO_AUTH.requireLogin(); BO_AUTH.refreshMe(); BO_AUTH.renderProfile();
  const body=document.getElementById('loginLogBody'), search=document.getElementById('loginLogSearch'), status=document.getElementById('loginLogStatus'), ip=document.getElementById('loginLogIp'), size=document.getElementById('loginLogPageSize');
  let all=[], filtered=[], page=1;
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function dt(value){
    if(!value)return '-';
    const d=new Date(value);
    if(isNaN(d.getTime()))return String(value).replace('T',' ').replace(/\.\d+.*$/,'');
    const pad=n=>String(n).padStart(2,'0');
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
  }
  /* The date in the cell, the time on hover - `boAc.dtCell`, this family's listing pattern
     (Admin Management's Last Login / Created use the same helper). The date stays ISO: this
     family's timestamp format, and the column's own sort compares cell text, so it has to
     read as a date. Falls back to the plain stamp if the shared helper is absent. */
  const dateCell=v=>(window.boAc&&boAc.dtCell)?boAc.dtCell(dt(v)):esc(dt(v));
  async function apiJson(url){const r=await fetch(url,{headers:{...BO_AUTH.authHeader()}}); const j=await r.json().catch(()=>({})); if(!r.ok||j.status==='error')throw new Error(j.message||'Request failed'); return j;}
  function stats(){const today=ymd(new Date()); document.getElementById('logStatTotal').textContent=all.length; document.getElementById('logStatSuccess').textContent=all.filter(x=>x.status==='SUCCESS').length; document.getElementById('logStatFailed').textContent=all.filter(x=>x.status==='FAILED').length; document.getElementById('logStatToday').textContent=all.filter(x=>loginDateKey(x.loginAt)===today).length;}
  function loginDateKey(v){
    if(!v)return '';
    const raw=String(v).trim();
    const iso=raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if(iso)return iso[1];
    const d=new Date(raw);
    return isNaN(d)?'':ymd(d);
  }
  function apply(){
    const q=(search.value||'').trim().toLowerCase(), st=status.value, iq=(ip.value||'').trim().toLowerCase();
    const from=document.getElementById('refDateFrom')?.value||'', to=document.getElementById('refDateTo')?.value||'';
    filtered=all.filter(x=>{
      const date=loginDateKey(x.loginAt);
      const inDate=(!from||!date||date>=from)&&(!to||!date||date<=to);
      return inDate&&(!q||String(x.username||'').toLowerCase().includes(q)||String(x.displayName||'').toLowerCase().includes(q))&&(!st||x.status===st)&&(!iq||String(x.ipAddress||'').toLowerCase().includes(iq));
    });
    page=1; render();
  }
  function render(){const ps=(window.boAc?boAc.resolve(size.value,document.querySelector('.table-card')):(Number(size.value)>0?Number(size.value):10)), pages=Math.max(1,Math.ceil(filtered.length/ps)); page=Math.min(Math.max(1,page),pages); const rows=filtered.slice((page-1)*ps,page*ps); body.innerHTML=rows.length?rows.map((x,i)=>'<tr><td>'+((page-1)*ps+i+1)+'</td><td>'+dateCell(x.loginAt)+'</td><td><b>'+esc(x.username||'-')+'</b><br><small>'+esc(x.displayName||'')+'</small></td><td><span class="admin-status-pill '+(x.status==='SUCCESS'?'active':'disabled')+'"><i></i>'+(x.status==='SUCCESS'?'Success':'Failed')+'</span></td><td>'+esc(x.ipAddress||'-')+'</td><td title="'+esc(x.userAgent||'')+'" style="max-width:320px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(x.userAgent||'-')+'</td><td>'+esc(x.failureReason||'-')+'</td></tr>').join(''):'<tr><td colspan="7">No login records found.</td></tr>'; document.getElementById('loginLogCount').textContent=filtered.length+' Records'; document.getElementById('loginLogInfo').textContent=filtered.length?'Showing '+((page-1)*ps+1)+' to '+Math.min(page*ps,filtered.length)+' of '+filtered.length+' entries':'Showing 0 to 0 of 0 entries'; document.getElementById('loginLogPager').innerHTML=pageButtons(page,pages);
  // settled after the paint: `-` is verified on real rows, not the placeholder
  // one post-paint verification pass so `-` is exact (see access-control-listing.js)
  if (window.boAc && boAc.settle) boAc.settle(document.querySelector('.table-card'), render);if(window.boAc&&String(size.value)===boAc.FIT&&!render._refit&&filtered.length){const fit=boAc.resolve(size.value,document.querySelector('.table-card'));if(fit!==ps){render._refit=true;render();render._refit=false;return;}}}
  async function load(){body.innerHTML='<tr><td colspan="7">Loading...</td></tr>'; try{const j=await apiJson(BO_AUTH.adminLoginLogsUrl()); all=Array.isArray(j.data)?j.data:[]; stats(); apply();}catch(e){body.innerHTML='<tr><td colspan="7" class="text-danger">'+esc(e.message)+'</td></tr>';}}

  const refDatePicker={view:new Date(),selectingStart:true,mode:'days',yearPageStart:new Date().getFullYear()-5};
  function pad2(n){return String(n).padStart(2,'0');}
  function ymd(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}
  function dmy(v){if(!v)return ''; const a=String(v).split('-'); return a.length===3?`${a[2]}/${a[1]}/${a[0]}`:v;}
  function startOfWeek(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()); x.setDate(x.getDate()-x.getDay()); return x;}
  function endOfWeek(d){const x=startOfWeek(d); x.setDate(x.getDate()+6); return x;}
  function updateDateLabel(){
    const f=document.getElementById('refDateFrom')?.value||'', t=document.getElementById('refDateTo')?.value||'', el=document.getElementById('refDateLabel');
    if(!el)return;
    if(f&&t)el.textContent=`${dmy(f)} - ${dmy(t)}`; else if(f)el.textContent=`${dmy(f)} - Select end date`; else el.textContent='Select date range';
  }
  function markPreset(name){document.querySelectorAll('[data-range-preset]').forEach(b=>b.classList.toggle('active',!!name&&b.dataset.rangePreset===name));}
  function presetRange(key){
    const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()); let a=new Date(today),b=new Date(today);
    if(key==='yesterday'){a.setDate(a.getDate()-1);b=new Date(a);}
    if(key==='thisWeek'){a=startOfWeek(today);b=endOfWeek(today);}
    if(key==='lastWeek'){a=startOfWeek(today);a.setDate(a.getDate()-7);b=new Date(a);b.setDate(b.getDate()+6);}
    if(key==='thisMonth'){a=new Date(today.getFullYear(),today.getMonth(),1);b=new Date(today.getFullYear(),today.getMonth()+1,0);}
    if(key==='lastMonth'){a=new Date(today.getFullYear(),today.getMonth()-1,1);b=new Date(today.getFullYear(),today.getMonth(),0);}
    if(key==='thisYear'){a=new Date(today.getFullYear(),0,1);b=new Date(today.getFullYear(),11,31);}
    if(key==='lastYear'){a=new Date(today.getFullYear()-1,0,1);b=new Date(today.getFullYear()-1,11,31);}
    return [ymd(a),ymd(b)];
  }
  function setDateRange(from,to,preset,runFilter=true){
    const f=document.getElementById('refDateFrom'),t=document.getElementById('refDateTo'); if(f)f.value=from||'';if(t)t.value=to||'';
    updateDateLabel();markPreset(preset||'');renderCalendar();if(runFilter)apply();
  }
  function renderCalendar(){
    const monthBtn=document.getElementById('refCalMonth'),yearBtn=document.getElementById('refCalYear'),monthGrid=document.getElementById('refCalMonthGrid'),yearGrid=document.getElementById('refCalYearGrid'),dayView=document.getElementById('refCalDayView'),days=document.getElementById('refCalDays');
    if(!monthBtn||!yearBtn||!monthGrid||!yearGrid||!dayView||!days)return;
    const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    monthBtn.innerHTML=months[refDatePicker.view.getMonth()]+' <i class="bi bi-chevron-down"></i>';yearBtn.innerHTML=refDatePicker.view.getFullYear()+' <i class="bi bi-chevron-down"></i>';
    monthGrid.innerHTML=months.map((m,i)=>`<button type="button" data-ref-month="${i}" class="${i===refDatePicker.view.getMonth()?'active':''}">${m}</button>`).join('');
    yearGrid.innerHTML=Array.from({length:12},(_,i)=>refDatePicker.yearPageStart+i).map(y=>`<button type="button" data-ref-year="${y}" class="${y===refDatePicker.view.getFullYear()?'active':''}">${y}</button>`).join('');
    monthGrid.classList.toggle('show',refDatePicker.mode==='months');yearGrid.classList.toggle('show',refDatePicker.mode==='years');dayView.classList.toggle('hide',refDatePicker.mode!=='days');
    const y=refDatePicker.view.getFullYear(),m=refDatePicker.view.getMonth(),first=new Date(y,m,1),last=new Date(y,m+1,0),start=first.getDay(),total=last.getDate();
    const from=document.getElementById('refDateFrom')?.value||'',to=document.getElementById('refDateTo')?.value||'';let html='',prevLast=new Date(y,m,0).getDate();
    for(let i=0;i<start;i++)html+=`<button type="button" class="muted" disabled>${prevLast-start+i+1}</button>`;
    for(let d=1;d<=total;d++){const val=ymd(new Date(y,m,d)),inRange=from&&to&&val>=from&&val<=to,isEdge=val===from||val===to;html+=`<button type="button" data-cal-day="${val}" class="${inRange?'in-range':''} ${isEdge?'selected':''}">${d}</button>`;}
    const cells=start+total;for(let i=1;i<=42-cells;i++)html+=`<button type="button" class="muted" disabled>${i}</button>`;days.innerHTML=html;
  }
  function initDatePicker(){
    const trigger=document.getElementById('refDateTrigger'),picker=document.getElementById('refRangePicker');if(!trigger||!picker)return;
    const [todayFrom,todayTo]=presetRange('today');refDatePicker.view=new Date(todayFrom+'T00:00:00');setDateRange(todayFrom,todayTo,'today',false);
    trigger.addEventListener('click',e=>{e.stopPropagation();picker.classList.toggle('show');refDatePicker.mode='days';renderCalendar();});
    document.addEventListener('click',e=>{if(!e.target.closest('.ref-range-wrap'))picker.classList.remove('show');});
    document.querySelectorAll('[data-range-preset]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();const key=btn.dataset.rangePreset,[a,b]=presetRange(key);refDatePicker.view=new Date(a+'T00:00:00');setDateRange(a,b,key,true);picker.classList.remove('show');}));
    document.getElementById('refCalPrev')?.addEventListener('click',e=>{e.stopPropagation();if(refDatePicker.mode==='years')refDatePicker.yearPageStart-=12;else refDatePicker.view.setMonth(refDatePicker.view.getMonth()-1);renderCalendar();});
    document.getElementById('refCalNext')?.addEventListener('click',e=>{e.stopPropagation();if(refDatePicker.mode==='years')refDatePicker.yearPageStart+=12;else refDatePicker.view.setMonth(refDatePicker.view.getMonth()+1);renderCalendar();});
    document.getElementById('refCalMonth')?.addEventListener('click',e=>{e.stopPropagation();refDatePicker.mode=refDatePicker.mode==='months'?'days':'months';renderCalendar();});
    document.getElementById('refCalYear')?.addEventListener('click',e=>{e.stopPropagation();refDatePicker.yearPageStart=refDatePicker.view.getFullYear()-5;refDatePicker.mode=refDatePicker.mode==='years'?'days':'years';renderCalendar();});
    document.getElementById('refCalMonthGrid')?.addEventListener('click',e=>{e.stopPropagation();const b=e.target.closest('[data-ref-month]');if(!b)return;refDatePicker.view.setMonth(Number(b.dataset.refMonth));refDatePicker.mode='days';renderCalendar();});
    document.getElementById('refCalYearGrid')?.addEventListener('click',e=>{e.stopPropagation();const b=e.target.closest('[data-ref-year]');if(!b)return;refDatePicker.view.setFullYear(Number(b.dataset.refYear));refDatePicker.mode='months';renderCalendar();});
    document.getElementById('refCalDays')?.addEventListener('click',e=>{
      e.stopPropagation();const btn=e.target.closest('[data-cal-day]');if(!btn)return;const f=document.getElementById('refDateFrom'),t=document.getElementById('refDateTo'),val=btn.dataset.calDay;
      if(!f.value||(f.value&&t.value)||val<f.value){f.value=val;t.value='';refDatePicker.selectingStart=false;markPreset('');updateDateLabel();renderCalendar();picker.classList.add('show');return;}
      t.value=val;refDatePicker.selectingStart=true;markPreset('');updateDateLabel();renderCalendar();picker.classList.remove('show');apply();
    });
  }

    /* No Reset / Search / Refresh in this strip: the fields apply themselves and
     the date range reloads on a complete range, the report family's contract. */

  size.onchange=()=>{page=1;render();};
  // No Reset / Search in the strip any more: the fields drive the query. Text
  // waits out a 400ms debounce, the select and the date range apply at once.
  (function wireLiveFilters(){
    let t = 0;
    const soon = () => { clearTimeout(t); t = setTimeout(apply, 400); };
    [search, ip].forEach(el => { if (!el) return;
      el.addEventListener('input', soon);
      el.addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(t); apply(); } });
    });
    if (status) status.addEventListener('change', apply);
  })();
  document.getElementById('loginLogPager').onclick=e=>{const b=e.target.closest('[data-page]');if(!b||b.disabled)return;page=Number(b.dataset.page)||1;render();};
  search.onkeydown=e=>{if(e.key==='Enter')apply();}; ip.onkeydown=e=>{if(e.key==='Enter')apply();};
  initDatePicker();load();
})();
