(()=>{
  'use strict';
  const base=(window.API_BASE_URL||window.API_BASE||'').replace(/\/$/,'');
  const localToday=()=>window.BO_FORMAT?.today?BO_FORMAT.today():(()=>{const d=new Date(),pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;})();
  const today=localToday();
  const from=document.getElementById('reportFrom'),to=document.getElementById('reportTo');
  const bodyEl=document.getElementById('reportBody'),headEl=document.getElementById('reportHead');
  const pageSizeEl=document.getElementById('reportPageSize'),showingEl=document.getElementById('reportShowing'),pagerEl=document.getElementById('reportPager');
  const tableWrap=document.querySelector('.transaction-report-page .table-wrap')||document.querySelector('.table-wrap');
  const tableHeadEl=document.getElementById('reportTableHead')||tableWrap?.querySelector?.('.bo-tx-table-head');
  const tableBodyEl=document.getElementById('reportTableBody')||tableWrap?.querySelector?.('.bo-tx-table-body');
  const headColsEl=document.getElementById('reportHeadCols');
  const bodyColsEl=document.getElementById('reportBodyCols');
  const scrollHost=tableBodyEl||tableWrap;
  const pageRoot=document.body;
  let allRows=[],page=1,lockedAutoSize=null;
  /* The fit writes row heights and the table's height, and on this page the scroller's own box
     follows its content — so a ResizeObserver on that scroller reads our own write as a panel
     change and asks for another fit, forever: measured rows 47↔50px, scroller 448↔446px,
     ~500 mutation records a second, for as long as the page stays open
     (owner: "点选日期后 一直闪 不知道为什么"). Two things shut the loop: a short window after our
     own write during which notifications are ignored, and a tolerance on HEIGHT only — a genuine
     panel change is tens of pixels where this feedback is 2. Width is the real input to a fit and
     is compared strictly; it measured a constant 977 while the loop ran. */
  let fitBox=null,fitWroteAt=0;
  // Every BO report now opens on Today by default. Wider ranges are opt-in via the picker.
  from.value=today;to.value=today;
  if(window.OP_REPORT_KIND==='promotion-report')document.getElementById('typeBox').style.display='none';
  const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  // Date/time cell — DD/MM/YYYY on the cell, HH:MM:SS on hover (Wallet Ledger locked pattern).
  const dt=v=>window.BO_FORMAT&&window.BO_FORMAT.dateTime?window.BO_FORMAT.dateTime(v):(v?String(v).replace('T',' ').slice(0,19):'-');
  function dtParts(v){
    const full=dt(v);
    if(!full||full==='-')return{full:'-',day:'-',time:''};
    const m=String(full).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(.+)$/);
    if(m){
      const raw=String(m[4]).trim();
      const tm=raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      const time=tm?`${String(tm[1]).padStart(2,'0')}:${tm[2]}:${tm[3]||'00'}`:raw.slice(0,8);
      const day=`${String(m[3]).padStart(2,'0')}/${String(m[2]).padStart(2,'0')}/${m[1]}`;
      return{full,day,time};
    }
    return{full,day:full,time:''};
  }
  function dtCell(v){
    const p=dtParts(v);
    if(p.full==='-')return emptyCell();
    if(!p.time)return `<span class="tr-dt">${esc(p.day)}</span>`;
    return `<span class="tr-dt" tabindex="0" data-tip="${esc(p.time)}">${esc(p.day)}</span>`;
  }
  function remarkCell(v){
    const s=String(v??'').trim();
    if(!s)return emptyCell();
    return `<span class="tr-remark" tabindex="0" data-tip="${esc(s)}">${esc(s)}</span>`;
  }
  // Shared floating tip (position:fixed) so it can never be clipped by the table's
  // overflow:hidden scroll container — same recipe as Wallet Ledger `.wl-time-tip`.
  function ensureFloatTip(){
    let tip=document.getElementById('trFloatTip');
    if(tip)return tip;
    tip=document.createElement('div');
    tip.id='trFloatTip';
    tip.className='tr-float-tip';
    tip.setAttribute('role','tooltip');
    tip.setAttribute('aria-hidden','true');
    document.body.appendChild(tip);
    return tip;
  }
  function placeFloatTip(el){
    const tip=ensureFloatTip();
    const text=el.getAttribute('data-tip')||'';
    if(!text){hideFloatTip();return;}
    tip.textContent=text;
    tip.classList.toggle('is-wide',el.classList.contains('tr-remark'));
    tip.classList.add('is-on');
    const r=el.getBoundingClientRect();
    const tr=tip.getBoundingClientRect();
    let top=r.top-tr.height-8,below=false;
    if(top<8){below=true;top=r.bottom+8;}
    tip.classList.toggle('is-below',below);
    const left=Math.max(8,Math.min(r.left+r.width/2-tr.width/2,window.innerWidth-tr.width-8));
    tip.style.left=Math.round(left)+'px';
    tip.style.top=Math.round(top)+'px';
  }
  function hideFloatTip(){
    const tip=document.getElementById('trFloatTip');
    if(tip)tip.classList.remove('is-on','is-below');
  }
  function bindFloatTips(){
    if(!bodyEl||bodyEl.dataset.tipBound==='1')return;
    bodyEl.dataset.tipBound='1';
    bodyEl.addEventListener('mouseover',e=>{const el=e.target.closest?.('.tr-dt[data-tip],.tr-remark[data-tip]');if(el)placeFloatTip(el);});
    bodyEl.addEventListener('mouseout',e=>{const el=e.target.closest?.('.tr-dt[data-tip],.tr-remark[data-tip]');if(!el)return;const next=e.relatedTarget;if(next&&el.contains(next))return;hideFloatTip();});
    bodyEl.addEventListener('focusin',e=>{const el=e.target.closest?.('.tr-dt[data-tip],.tr-remark[data-tip]');if(el)placeFloatTip(el);});
    bodyEl.addEventListener('focusout',e=>{const el=e.target.closest?.('.tr-dt[data-tip],.tr-remark[data-tip]');if(!el)return;const next=e.relatedTarget;if(next&&el.contains(next))return;hideFloatTip();});
    window.addEventListener('scroll',hideFloatTip,true);
    window.addEventListener('resize',hideFloatTip);
  }
  const cols=window.OP_REPORT_KIND==='promotion-report'
    ?[['name','Promotion'],['promotionCode','Code'],['claimCount','Claims'],['uniqueClaimers','Unique Claimers'],['repeatedClaimCount','Repeated Claims'],['payoutAmount','Payouts']]
    :[['id','ID'],['memberId','Member'],['ledgerType','Type'],['walletBucket','Wallet'],['amount','In / Out'],['beforeBalance','Before'],['afterBalance','After'],['createdBy','Created By'],['approvedBy','Approved By'],['reasonCode','Reason'],['referenceNo','Reference'],['remark','Remark'],['createdAt','Created'],['postedAt','Posted']];
  /* Deposit Approval recipe: shared colgroup keeps head/body columns locked together. */
  const colClassByKey={
    id:'tr-col-id',memberId:'tr-col-member',ledgerType:'tr-col-type',walletBucket:'tr-col-wallet',
    amount:'tr-col-amount',beforeBalance:'tr-col-before',afterBalance:'tr-col-after',
    createdBy:'tr-col-created-by',approvedBy:'tr-col-approved-by',reasonCode:'tr-col-reason',
    referenceNo:'tr-col-ref',remark:'tr-col-remark',createdAt:'tr-col-created',postedAt:'tr-col-posted',
    name:'tr-col-name',promotionCode:'tr-col-code',claimCount:'tr-col-claims',
    uniqueClaimers:'tr-col-unique',repeatedClaimCount:'tr-col-repeat',payoutAmount:'tr-col-payout'
  };
  function noteFitWrite(){
    fitWroteAt=Date.now();
    if(tableBodyEl)fitBox={w:tableBodyEl.clientWidth,h:tableBodyEl.clientHeight};
  }
  function paintColgroups(){
    const html=cols.map(c=>`<col class="${colClassByKey[c[0]]||'tr-col'}"/>`).join('');
    if(headColsEl)headColsEl.innerHTML=html;
    if(bodyColsEl)bodyColsEl.innerHTML=html;
  }
  /* 8.7's `.tr-col-*` widths are px values measured from a sample of the data, and production
     values are longer than that sample: the id ellipsised itself down to "2…" in a 40px column
     whose padding alone is 24px (owner: "我的id也没有展示完整"), and the balances read "58,2…".
     Under `table-layout:fixed` the head and body colgroups must carry identical widths, so the
     widest rendered content per column is measured and written to BOTH colgroups as an inline
     width — inline `!important`, because the sheet's own `.tr-col-*` widths are important and
     would otherwise win. Grows only, and remembers the widest it has seen so paging through a
     report never pulls a column back in. Remark is exempt: it truncates on purpose, at a width it
     was designed for, and carries its own hover tip. */
  const fitNeed=[];
  function colNeed(td){
    const cs=getComputedStyle(td);
    const pad=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0);
    const range=document.createRange();
    range.selectNodeContents(td);
    return Math.min(Math.ceil(range.getBoundingClientRect().width+pad)+1,420);
  }
  function fitColumns(){
    if(window.OP_REPORT_KIND!=='transaction-report')return;
    if(!bodyEl||!bodyColsEl||!headColsEl)return;
    const rows=[...bodyEl.querySelectorAll('tr')].filter(tr=>!isPlaceholderRow(tr));
    if(!rows.length)return;
    let grew=false;
    for(let i=0;i<cols.length;i++){
      if(cols[i][0]==='remark')continue;
      let need=fitNeed[i]||0;
      for(const tr of rows){const td=tr.children[i];if(td)need=Math.max(need,colNeed(td));}
      fitNeed[i]=need;
      const cell=rows[0].children[i];
      const now=cell?Math.round(cell.getBoundingClientRect().width):0;
      const target=Math.max(now,need);
      if(target>now+0.5){
        const col=bodyColsEl.children[i],hcol=headColsEl.children[i];
        if(col)col.style.setProperty('width',target+'px','important');
        if(hcol)hcol.style.setProperty('width',target+'px','important');
        grew=true;
      }
    }
    if(!grew)return;
    /* No `min-width` bookkeeping: under `table-layout:fixed` the table's used width is the greater
       of its specified width and the minimum its columns require, so growing a column grows the
       table with it. Writing a `min-width` from the measured cell widths instead re-fed the layout
       into itself — each pass summed the surplus the previous pass had distributed and pushed the
       table ~10px wider, forever. */
    noteFitWrite();
  }
  function bindHeadBodyScroll(){
    if(!tableHeadEl||!tableBodyEl||tableBodyEl.dataset.scrollBound==='1')return;
    tableBodyEl.dataset.scrollBound='1';
    tableBodyEl.addEventListener('scroll',()=>{tableHeadEl.scrollLeft=tableBodyEl.scrollLeft;},{passive:true});
  }
  function token(){return localStorage.getItem('bo_admin_token')||localStorage.getItem('admin_token')||localStorage.getItem('token')||'';}
  function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
  function money(v){return num(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}
  function amtClass(v){const n=num(v);if(n<0)return 'is-neg';if(n===0)return 'is-zero';return 'is-pos';}
  function emptyCell(){return '<span class="tr-empty">-</span>';}
  function textCell(v){
    const s=String(v??'').trim();
    if(!s||s==='-')return emptyCell();
    return esc(s);
  }
  function typeCell(v){
    const s=String(v??'').trim();
    if(!s||s==='-')return emptyCell();
    /* Deposit Approval status-pill recipe: bare = amber, .active = in, .off = out. */
    const kind=/OUT/i.test(s)?'off':/IN/i.test(s)?'active':'';
    return `<span class="status-pill ${kind}">${esc(s)}</span>`;
  }
  function moneyCell(v,{signed=false}={}){
    if(v==null||v===''||v==='-')return emptyCell();
    const n=num(v);
    const cls=signed?amtClass(n):'';
    return `<span class="tr-amt ${cls}">${esc(money(n))}</span>`;
  }
  function cellHtml(key,v){
    if(key==='createdAt'||key==='postedAt')return dtCell(v);
    if(key==='remark')return remarkCell(v);
    if(key==='ledgerType')return typeCell(v);
    if(key==='amount')return moneyCell(v,{signed:true});
    if(key==='beforeBalance'||key==='afterBalance')return moneyCell(v);
    if(key==='id'||key==='memberId'){
      const s=String(v??'').trim();
      return s?`<span class="tr-id">${esc(s)}</span>`:emptyCell();
    }
    return textCell(v);
  }
  function tdClass(key){
    if(key==='amount'||key==='beforeBalance'||key==='afterBalance')return ' class="tr-num"';
    if(key==='ledgerType')return ' class="tr-type"';
    if(key==='createdAt'||key==='postedAt')return ' class="tr-date"';
    if(key==='remark')return ' class="tr-remark-col"';
    return '';
  }
  function rawPageSize(){return String(pageSizeEl?.value??'-').trim();}
  function isAutofit(){const r=rawPageSize();return r===''||r==='-'||/^auto$/i.test(r);}
  function isAll(){return /^all$/i.test(rawPageSize());}
  function measureAutoPageSize(){
    if(!scrollHost)return lockedAutoSize||10;
    /* `scrollHost` (already `tableBodyEl || tableWrap`) rather than `tableBodyEl` alone: on
       promotion-report neither `#reportTableBody` nor `.bo-tx-table-body` exists, so the old
       branch test fell through to the `tableWrap` path and `settleAutofit()` — whose guard also
       required `tableBodyEl` — could not run at all, which is why that page kept a dead band
       above its footer.
       The head is subtracted only while it is INSIDE the measured scroller: the split head
       (`report-table-split.js`) and the transaction page's own head table both live outside the
       body scroller, and the `44` that used to stand in for "no head found" was subtracted
       anyway — worth exactly one row (measured: 681px of panel at 38px rows, `(681-44)/38 = 16.7
       → 16` rows, leaving 67px of empty panel). */
    const head=scrollHost.querySelector('thead');
    const headH=head?Math.ceil(head.getBoundingClientRect().height):0;
    const avail=Math.max(0,Math.floor(scrollHost.clientHeight)-headH);
    const sample=scrollHost.querySelector('tbody tr td:not(.table-empty)');
    const rowH=sample?Math.max(36,Math.round(sample.getBoundingClientRect().height)):41;
    return Math.max(5,Math.min(200,Math.floor(avail/rowH)||10));
  }
  function resolvePageSize(){
    if(isAll())return 10000;
    if(isAutofit()){
      if(lockedAutoSize)return lockedAutoSize;
      lockedAutoSize=measureAutoPageSize();
      return lockedAutoSize;
    }
    const n=Number(rawPageSize());
    return Number.isFinite(n)&&n>0?n:10;
  }
  function syncAutofitClass(){
    if(!pageRoot)return;
    pageRoot.classList.toggle('tr-autofit',isAutofit());
  }
  function paintSelectLabel(){
    /* Autofit trigger always paints literal "-" (VIP EXP contract), never the fitted count. */
    const wrap=pageSizeEl?.closest?.('.rounded-select-wrap');
    const btn=wrap?.querySelector?.('.rounded-select-btn span');
    if(isAutofit()&&btn)btn.textContent='-';
  }
  /* MD (Member Deposit) Show "-" recipe: measure the rows actually painted, then either
     grow (gap ≥ one row → more data fits), shrink (overflow → drop one row), or stretch
     the leftover seam evenly across rows so a row is never left half-clipped. */
  function isPlaceholderRow(tr){
    const cells=tr.querySelectorAll('td');
    if(cells.length<=1)return true;
    const text=(tr.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    return !text||text==='loading...'||text.startsWith('no records');
  }
  function evenFillTable(){return bodyEl?.closest?.('table')||null;}
  function resetEvenFill(){
    const table=evenFillTable();
    if(!table)return;
    table.classList.remove('bo-tx-evenfill');
    table.style.height='';
    bodyEl.querySelectorAll('tr').forEach(tr=>{
      tr.style.height='';
      tr.querySelectorAll('td').forEach(td=>{td.style.height='';});
    });
  }
  function evenFillRowHeights(){try{evenFillCore();}finally{noteFitWrite();}}
  function evenFillCore(){
    const table=evenFillTable();
    if(!scrollHost||!table||!bodyEl)return;
    resetEvenFill();
    if(!isAutofit())return;
    const rows=[...bodyEl.querySelectorAll('tr')].filter(tr=>!isPlaceholderRow(tr));
    if(!rows.length)return;
    void table.offsetHeight;
    /* Prefer the inner content box after any horizontal scrollbar has claimed space —
       otherwise stretch targets a height that still overflows once the X bar appears. */
    const avail=Math.max(0,Math.floor(scrollHost.clientHeight));
    const natural=rows.reduce((sum,tr)=>sum+Math.ceil(tr.getBoundingClientRect().height),0);
    const rowH=Math.max(30,Math.round(natural/rows.length)||36);
    const gap=avail-natural;
    /* Stretch leftover seam only when it's smaller than one full row — grow/shrink is settleAutofit. */
    if(natural>avail+1||gap<2||gap>=rowH){
      /* Still clamp any 1–2px paint overflow so overflow-y:hidden isn't fighting a thumb. */
      if(scrollHost.scrollHeight>scrollHost.clientHeight&&rows.length){
        const over=scrollHost.scrollHeight-scrollHost.clientHeight;
        const shrink=Math.ceil(over/rows.length)||1;
        rows.forEach(tr=>{
          const h=Math.max(rowH,Math.round(tr.getBoundingClientRect().height)-shrink);
          tr.style.height=h+'px';
          tr.querySelectorAll('td').forEach(td=>{td.style.height=h+'px';});
        });
        table.classList.add('bo-tx-evenfill');
        table.style.height=Math.max(0,avail-over)+'px';
      }
      return;
    }
    const base=Math.floor(avail/rows.length);
    let rem=avail-(base*rows.length);
    if(base<=0)return;
    rows.forEach(tr=>{
      const h=base+(rem>0?1:0);
      if(rem>0)rem-=1;
      tr.style.height=h+'px';
      tr.querySelectorAll('td').forEach(td=>{td.style.height=h+'px';});
    });
    table.classList.add('bo-tx-evenfill');
    table.style.height=avail+'px';
    if(scrollHost.scrollHeight>scrollHost.clientHeight){
      const over=scrollHost.scrollHeight-scrollHost.clientHeight;
      const shrink=Math.ceil(over/rows.length)||1;
      rows.forEach(tr=>{
        const h=Math.max(rowH,(parseFloat(tr.style.height)||base)-shrink);
        tr.style.height=h+'px';
        tr.querySelectorAll('td').forEach(td=>{td.style.height=h+'px';});
      });
      table.style.height=Math.max(0,avail-over)+'px';
    }
  }
  function bindAutofitResizeObserver(){
    if(!tableBodyEl||tableBodyEl._boAutofitObs||typeof ResizeObserver==='undefined')return;
    tableBodyEl._boAutofitObs=new ResizeObserver(()=>{
      if(!isAutofit())return;
      /* A notification this soon after our own fit write is that write, not a panel change. */
      if(Date.now()-fitWroteAt<400)return;
      const box={w:tableBodyEl.clientWidth,h:tableBodyEl.clientHeight};
      if(fitBox&&Math.abs(box.w-fitBox.w)<1&&Math.abs(box.h-fitBox.h)<=4)return;
      clearTimeout(tableBodyEl._boAutofitTimer);
      tableBodyEl._boAutofitTimer=setTimeout(()=>{lockedAutoSize=null;render();},120);
    });
    tableBodyEl._boAutofitObs.observe(tableBodyEl);
  }
  function render(){
    syncAutofitClass();
    paintColgroups();
    bindHeadBodyScroll();
    bindAutofitResizeObserver();
    const size=resolvePageSize(),total=allRows.length,pages=Math.max(1,Math.ceil(total/Math.max(1,size)));
    page=Math.min(Math.max(1,page),pages);
    const start=(page-1)*size,rows=allRows.slice(start,start+size);
    if(headEl)headEl.innerHTML='<tr>'+cols.map(c=>`<th title="${esc(c[1])}">${c[1]}</th>`).join('')+'</tr>';
    bodyEl.innerHTML=rows.length?rows.map(x=>'<tr>'+cols.map(c=>{
      return `<td${tdClass(c[0])}>${cellHtml(c[0],x[c[0]])}</td>`;
    }).join('')+'</tr>').join(''):`<tr><td colspan="${cols.length}" class="table-empty">No records found.</td></tr>`;
    fitColumns();
    if(showingEl)showingEl.textContent=`Showing ${total?start+1:0} to ${Math.min(start+size,total)} of ${total} entries`;
    bindFloatTips();
    paintSelectLabel();
    if(isAutofit())requestAnimationFrame(()=>settleAutofit());
    else resetEvenFill();
    if(!pagerEl)return;
    const btn=(label,target,disabled,active=false,icon='',cls='page-btn')=>`<button type="button" class="${cls}${active?' active':''}" data-page="${target}" ${disabled?'disabled':''} aria-label="${label}"${active?' aria-current="page"':''}>${icon?`<i class="bi ${icon}"></i>`:label}</button>`;
    /* Locked pager anatomy (VIP EXP Log / Wallet Ledger specimen):
       First · Previous · numbered window (±2 around current, always 1 and last, gaps > 1
       collapsed to an ellipsis) · Next · Last. Never a prev/next-only pager. */
    const pageList=(()=>{
      const list=[];const add=n=>{if(n>=1&&n<=pages&&!list.includes(n))list.push(n);};
      add(1);for(let n=page-2;n<=page+2;n++)add(n);add(pages);list.sort((a,b)=>a-b);return list;
    })();
    let h=btn('First page',1,page<=1,false,'bi-chevron-bar-left','smart-page first');
    h+=btn('Previous page',page-1,page<=1,false,'bi-chevron-left');
    let prevN=0;
    pageList.forEach(n=>{
      if(prevN&&n-prevN>1)h+='<span class="smart-page-ellipsis" aria-hidden="true">…</span>';
      h+=btn(String(n),n,false,n===page);
      prevN=n;
    });
    h+=btn('Next page',page+1,page>=pages,false,'bi-chevron-right');
    h+=btn('Last page',pages,page>=pages,false,'bi-chevron-bar-right','smart-page last');
    pagerEl.innerHTML=h;
  }
  function settleAutofit(){try{settleCore();}finally{noteFitWrite();}}
  function settleCore(){
    if(!isAutofit()||!scrollHost||!bodyEl)return;
    /* Measure the rows actually painted (natural height), not a guessed sample —
       clears any stale evenFill inline heights from the previous settle first. */
    resetEvenFill();
    void scrollHost.offsetHeight;
    const rows=[...bodyEl.querySelectorAll('tr')].filter(tr=>!isPlaceholderRow(tr));
    if(!rows.length)return;
    const avail=Math.max(0,Math.floor(scrollHost.clientHeight));
    const natural=rows.reduce((sum,tr)=>sum+Math.ceil(tr.getBoundingClientRect().height),0);
    const rowH=Math.max(30,Math.round(natural/rows.length)||36);
    const overflow=scrollHost.scrollHeight>scrollHost.clientHeight+1||natural>avail+1;
    let target=Math.max(5,Math.min(200,Math.floor(avail/rowH)||rows.length));
    if(overflow){
      /* Shrink by (at least) one — a clipped row must never stay half-visible. */
      target=Math.max(5,Math.min(target,rows.length-1));
    }else{
      /* Grow only up to what this page actually has left — never invent rows that
         don't exist (last/short page), which would loop forever. */
      const size=lockedAutoSize||rows.length;
      const start=(page-1)*size;
      const availableOnPage=Math.max(0,allRows.length-start)||rows.length;
      target=Math.min(target,Math.max(rows.length,availableOnPage));
    }
    if(target!==rows.length){
      lockedAutoSize=target;
      render();
      return;
    }
    lockedAutoSize=rows.length;
    /* Verify with a real post-paint overflow check before locking — a cold first paint
       can under-measure avail/rowH and settle one row too many. Recurses, shrinking by
       1 each frame, until no overflow remains (VIP EXP verifyAndLock). */
    requestAnimationFrame(()=>{
      if(scrollHost.scrollHeight>scrollHost.clientHeight+1&&lockedAutoSize>5){
        lockedAutoSize=lockedAutoSize-1;
        render();
        return;
      }
      evenFillRowHeights();
    });
  }
  async function fetchRows(type){
    let u=`${base}${window.OP_REPORT_ENDPOINT}?from=${encodeURIComponent(from.value)}&to=${encodeURIComponent(to.value)}`;
    if(type)u+=`&type=${encodeURIComponent(type)}`;
    const r=await fetch(u,{headers:{Authorization:'Bearer '+token(),'Cache-Control':'no-cache, no-store'}});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||j.status==='error')throw new Error(j.message||`Unable to load report (${r.status})`);
    return Array.isArray(j.data)?j.data:(j.data?.content||[]);
  }
  let reportLoadSeq=0;
  async function load(){
    const loadSeq=++reportLoadSeq;
    bodyEl.innerHTML=`<tr><td colspan="${cols.length}" class="table-empty">Loading...</td></tr>`;
    try{
      if(window.OP_REPORT_KIND==='transaction-report'){
        const [outRows,inRows]=await Promise.all([fetchRows('TRANSFER_OUT'),fetchRows('TRANSFER_IN')]);
        const seen=new Set();
        allRows=[...outRows,...inRows].filter(row=>{
          const key=String(row.id??`${row.memberId}|${row.ledgerType}|${row.referenceNo}|${row.createdAt}|${row.amount}`);
          if(seen.has(key))return false; seen.add(key); return true;
        }).sort((a,b)=>String(b.createdAt||b.postedAt||'').localeCompare(String(a.createdAt||a.postedAt||'')));
      }else{
        const type=window.OP_REPORT_KIND==='promotion-report'?'':document.getElementById('reportType').value;
        allRows=await fetchRows(type);
      }
      if(loadSeq!==reportLoadSeq)return;
      page=1;if(isAutofit())lockedAutoSize=null;render();
    }catch(e){if(loadSeq!==reportLoadSeq)return;allRows=[];if(isAutofit())lockedAutoSize=null;render();if(window.BO_DIALOG)await BO_DIALOG.alert(e.message||'Unable to load report.',{title:'Report Error',type:'error'});}
  }
  /* No Search / Reset buttons on this family (owner: "report的所有reset，search，refresh按键
     全去除"). Every control below reloads on its own change event, which is what those buttons
     used to trigger. */
  const reload=()=>{lockedAutoSize=null;load();};
  from?.addEventListener('change',reload);
  to?.addEventListener('change',reload);
  document.getElementById('reportType')?.addEventListener('change',reload);
  pageSizeEl?.addEventListener('change',()=>{lockedAutoSize=null;page=1;render();});
  pagerEl?.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(!b||b.disabled)return;page=Number(b.dataset.page)||1;render();});
  let resizeTimer=0;
  window.addEventListener('resize',()=>{
    if(!isAutofit())return;
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{lockedAutoSize=null;render();},120);
  });
  /* Re-paint "-" after reports.js wraps #reportPageSize in .rounded-select-wrap. */
  document.addEventListener('DOMContentLoaded',paintSelectLabel);
  setTimeout(paintSelectLabel,0);
  setTimeout(paintSelectLabel,120);
  /* The first measurement can run before the sheet's own type is in force — measured 120px of text
     for an id that is really 134px, so the column came out 13px short until the next render. Both
     passes are idempotent (a column only ever grows), so re-measuring costs nothing when it is
     already right. */
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>fitColumns()).catch(()=>{});
  setTimeout(fitColumns,250);
  setTimeout(fitColumns,900);
  load();
})();
