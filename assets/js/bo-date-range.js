(function(){
  /* A swap re-runs this file against a fresh frame, and build() binds one outside-click handler
     per date-range field to the document; the old handlers outlived their fields (detached, but
     still called on every click, and one more per field per entry). One registry per run: the
     previous run's handlers are released before this one binds its own. */
  if(window.__boDateRangeUnbind) window.__boDateRangeUnbind();
  const unbinds=[];
  window.__boDateRangeUnbind=()=>{ unbinds.forEach(fn=>fn()); unbinds.length=0; };
  const PAIRS=[['betFrom','betTo'],['txFrom','txTo'],['sessionFrom','sessionTo'],['ledgerFrom','ledgerTo'],['casinoFrom','casinoTo'],['reportFrom','reportTo'],['manualFrom','manualTo'],['wlFrom','wlTo'],['depositFrom','depositTo'],['withdrawFrom','withdrawTo'],['usageFrom','usageTo'],['agentDashFrom','agentDashTo'],['agentPlayerFrom','agentPlayerTo'],['agentBetFrom','agentBetTo'],['agentSettlementFrom','agentSettlementTo'],['agentWalletFrom','agentWalletTo'],['agentProductFrom','agentProductTo'],['agentReportFrom','agentReportTo'],['agentBonusFrom','agentBonusTo'],['adminAgentBetFrom','adminAgentBetTo'],['accFrom','accTo'],['detailFrom','detailTo'],['adminAgentFrom','adminAgentTo'],['agentCommissionFrom','agentCommissionTo'],['agentSettlementAdminFrom','agentSettlementAdminTo'],['agentClaimFrom','agentClaimTo'],['agentPayoutFrom','agentPayoutTo'],['agentPromotionFrom','agentPromotionTo'],['perfFrom','perfTo'],['memberFrom','memberTo']];
  const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const fmt=v=>{if(!v)return '';const [y,m,d]=v.split('-');return `${d}/${m}/${y}`};
  const startOfWeek=d=>{const x=new Date(d);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);return x};
  const endOfWeek=d=>{const x=startOfWeek(d);x.setDate(x.getDate()+6);return x};
  function rangeFor(key){const now=new Date();let a=new Date(now),b=new Date(now);switch(key){case'today':break;case'yesterday':a.setDate(a.getDate()-1);b=new Date(a);break;case'this-week':a=startOfWeek(now);b=endOfWeek(now);break;case'last-week':a=startOfWeek(now);a.setDate(a.getDate()-7);b=endOfWeek(a);break;case'this-month':a=new Date(now.getFullYear(),now.getMonth(),1);b=new Date(now.getFullYear(),now.getMonth(),now.getDate());break;case'last-month':a=new Date(now.getFullYear(),now.getMonth()-1,1);b=new Date(now.getFullYear(),now.getMonth(),0);break;case'this-year':a=new Date(now.getFullYear(),0,1);b=new Date(now.getFullYear(),11,31);break;case'last-year':a=new Date(now.getFullYear()-1,0,1);b=new Date(now.getFullYear()-1,11,31);break;}return[a,b]}
  function build(from,to){
    if(!from||!to||from.dataset.rangeBuilt||to.dataset.rangeBuilt)return;
    from.dataset.rangeBuilt=to.dataset.rangeBuilt='1';
    const fField=from.closest('.field'),tField=to.closest('.field');if(!fField||!tField)return;
    const host=document.createElement('div');host.className='bo-range-field field bo-filter-item bo-filter-range-item';
    host.innerHTML='<label>Date Range</label><button type="button" class="bo-range-trigger"><span class="bo-range-icon"><i class="bi bi-calendar3"></i></span><span class="bo-range-text">Select date range</span><i class="bi bi-chevron-down bo-range-arrow"></i></button><div class="bo-range-pop"><div class="bo-range-presets">'+
      [['today','Today'],['yesterday','Yesterday'],['this-week','This Week'],['last-week','Last Week'],['this-month','This Month'],['last-month','Last Month'],['this-year','This Year'],['last-year','Last Year']].map(x=>`<button type="button" data-preset="${x[0]}">${x[1]}</button>`).join('')+
      '</div><div class="bo-range-calendar"><div class="bo-range-cal-head"><button type="button" data-nav="-1"><i class="bi bi-chevron-left"></i></button><button type="button" class="bo-range-head-pick bo-range-month-btn"></button><button type="button" class="bo-range-head-pick bo-range-year-btn"></button><button type="button" data-nav="1"><i class="bi bi-chevron-right"></i></button></div><div class="bo-range-month-grid"></div><div class="bo-range-year-grid"></div><div class="bo-range-day-view"><div class="bo-range-week"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div class="bo-range-days"></div></div></div></div>';
    fField.parentNode.insertBefore(host,fField);fField.classList.add('bo-filter-item','bo-filter-hidden-item');tField.classList.add('bo-filter-item','bo-filter-hidden-item');fField.style.display='none';tField.style.display='none';
    const trig=host.querySelector('.bo-range-trigger'),pop=host.querySelector('.bo-range-pop'),txt=host.querySelector('.bo-range-text'),days=host.querySelector('.bo-range-days'),monthBtn=host.querySelector('.bo-range-month-btn'),yearBtn=host.querySelector('.bo-range-year-btn'),monthGrid=host.querySelector('.bo-range-month-grid'),yearGrid=host.querySelector('.bo-range-year-grid'),dayView=host.querySelector('.bo-range-day-view');
    const todayValue=iso(new Date());
    const isLedgerAllTime = from.id === 'ledgerFrom' && new URLSearchParams(location.search).get('scope') === 'all';
    const allowEmpty = from.dataset.rangeAllowEmpty === '1';
    const defaultPreset=from.dataset.rangeDefault||'';
    if(!isLedgerAllTime && !allowEmpty){
      if(!from.value||!to.value){const r=defaultPreset?rangeFor(defaultPreset):null;if(r){from.value=iso(r[0]);to.value=iso(r[1]);}else{if(!from.value)from.value=todayValue;if(!to.value)to.value=todayValue;}}
    } else if(isLedgerAllTime){
      from.value=''; to.value=''; host.classList.add('bo-range-all-time');
    } else if(allowEmpty && (!from.value || !to.value)){
      from.value=''; to.value='';
    }
    let view=new Date(),start=(isLedgerAllTime||allowEmpty)&&!from.value?'':(from.value||todayValue),end=(isLedgerAllTime||allowEmpty)&&!to.value?'':(to.value||todayValue),mode='days',yearPageStart=view.getFullYear()-5;
    function syncText(){txt.textContent=isLedgerAllTime && !start && !end ? 'All Time' : (start?(fmt(start)+(end?' - '+fmt(end):' - Select end date')):'Select date range')}
    function syncPresetActive(){
      host.querySelectorAll('[data-preset]').forEach(b=>{
        const r=rangeFor(b.dataset.preset);
        const match=!!start&&!!end&&start===iso(r[0])&&end===iso(r[1]);
        b.classList.toggle('active',match);
        if(match)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');
      });
    }
    function commit(a,b){
      const nextStart=iso(a),nextEnd=iso(b);
      // Re-clicking the active preset/month/year must be idempotent. Previously it
      // dispatched two change events even when the range was unchanged, which made
      // report pages reload and visibly jump for a no-op click.
      const changed=start!==nextStart||end!==nextEnd||from.value!==nextStart||to.value!==nextEnd;
      start=nextStart;end=nextEnd;from.value=start;to.value=end;
      syncText();syncPresetActive();
      if(!changed)return false;
      // A completed range is one logical filter change. Both hidden values are
      // already updated above, so emit exactly ONE native change event. Emitting
      // one event for each hidden input made report pages load twice for a single
      // preset click and allowed their loading/render paths to visibly jump.
      to.dispatchEvent(new Event('change',{bubbles:true}));
      return true;
    }
    function setMode(next){mode=next;monthGrid.classList.toggle('show',mode==='months');yearGrid.classList.toggle('show',mode==='years');dayView.classList.toggle('hide',mode!=='days')}
    function renderMonthGrid(){monthGrid.innerHTML=MONTHS.map((m,i)=>`<button type="button" data-month="${i}" class="${i===view.getMonth()?'active':''}">${m}</button>`).join('')}
    function renderYearGrid(){yearGrid.innerHTML=Array.from({length:12},(_,i)=>yearPageStart+i).map(y=>`<button type="button" data-year="${y}" class="${y===view.getFullYear()?'active':''}">${y}</button>`).join('')}
    function render(){monthBtn.innerHTML=`${MONTHS[view.getMonth()]} <i class="bi bi-chevron-down"></i>`;yearBtn.innerHTML=`${view.getFullYear()} <i class="bi bi-chevron-down"></i>`;renderMonthGrid();renderYearGrid();days.innerHTML='';const first=new Date(view.getFullYear(),view.getMonth(),1),offset=first.getDay();for(let i=0;i<42;i++){const d=new Date(view.getFullYear(),view.getMonth(),i-offset+1),v=iso(d),b=document.createElement('button');b.type='button';b.textContent=d.getDate();b.className='bo-range-day'+(d.getMonth()!==view.getMonth()?' muted':'')+(v===start?' start':'')+(v===end?' end':'')+(start&&end&&v>start&&v<end?' in-range':'');b.addEventListener('click',(e)=>{
        // Keep the same picker open after choosing the start date so the user can
        // immediately choose the end date without reopening it. render() replaces
        // the clicked day button, therefore stopping propagation here also prevents
        // the document outside-click handler from treating that removed button as
        // an outside click.
        e.preventDefault();
        e.stopPropagation();
        if(!start||end){
          start=v;end='';
          from.value=start;to.value='';
          syncText();syncPresetActive();render();
          pop.classList.add('show');
        }else{
          if(v<start){end=start;start=v}else end=v;
          from.value=start;to.value=end;
          // The range becomes valid only after the end date is chosen. Notify
          // consumers once, after BOTH hidden values contain the final range.
          to.dispatchEvent(new Event('change',{bubbles:true}));
          syncText();syncPresetActive();render();
          setTimeout(()=>pop.classList.remove('show'),120);
        }
      });days.appendChild(b)}syncPresetActive();setMode(mode)}
    trig.addEventListener('click',e=>{e.stopPropagation();document.querySelectorAll('.bo-range-pop.show').forEach(x=>{if(x!==pop)x.classList.remove('show')});pop.classList.toggle('show');mode='days';render()});
    host.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{const r=rangeFor(b.dataset.preset);commit(r[0],r[1]);view=new Date(r[0]);mode='days';render();pop.classList.remove('show')}));
    host.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>{if(mode==='years'){yearPageStart+=Number(b.dataset.nav)*12}else{view.setMonth(view.getMonth()+Number(b.dataset.nav))}render()}));
    monthBtn.addEventListener('click',e=>{e.stopPropagation();mode=mode==='months'?'days':'months';render()});yearBtn.addEventListener('click',e=>{e.stopPropagation();yearPageStart=view.getFullYear()-5;mode=mode==='years'?'days':'years';render()});
    monthGrid.addEventListener('click',e=>{const b=e.target.closest('[data-month]');if(!b)return;const selectedMonth=Number(b.dataset.month),selectedYear=view.getFullYear();view=new Date(selectedYear,selectedMonth,1);commit(new Date(selectedYear,selectedMonth,1),new Date(selectedYear,selectedMonth+1,0));mode='days';render();pop.classList.remove('show')});
    yearGrid.addEventListener('click',e=>{const b=e.target.closest('[data-year]');if(!b)return;const selectedYear=Number(b.dataset.year);view=new Date(selectedYear,0,1);commit(new Date(selectedYear,0,1),new Date(selectedYear,11,31));mode='days';render();pop.classList.remove('show')});
    const syncExternal=()=>{start=from.value||'';end=to.value||'';syncText();syncPresetActive();render()};from.addEventListener('change',syncExternal);to.addEventListener('change',syncExternal);
    const outsideClick=e=>{const path=typeof e.composedPath==='function'?e.composedPath():[];if(!host.contains(e.target)&&!path.includes(host))pop.classList.remove('show')};
    document.addEventListener('click',outsideClick);
    unbinds.push(()=>document.removeEventListener('click',outsideClick));
    syncText();syncPresetActive();render();
  }
  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn();}
  /* Build as soon as this file runs when the DOM is already parsed. The old listener waited for
     DOMContentLoaded, which waits for every external script on the page (the gstatic Firebase pair
     and the livechat notifier among them) - on a real network that left the raw two-box date
     inputs visible in the filter row for seconds. Ranges appended later by other scripts still
     arrive through the DOMContentLoaded call, and build() is idempotent per input pair. */
  ready(()=>PAIRS.forEach(p=>build(document.getElementById(p[0]),document.getElementById(p[1]))));
})();
