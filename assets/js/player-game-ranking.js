(function(){
  let page=0,totalPages=0,totalElements=0,loading=false,lastFit=0,resizeT=0;
  const COLS=10;
  const $=id=>document.getElementById(id), esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const dt=v=>window.BO_FORMAT?.dateTime?BO_FORMAT.dateTime(v):(v?String(v).replace('T',' ').slice(0,19):'-');
  function endpoint(){return window.GAME_RANKING_MODE==='frequent'?API_CONFIG.ENDPOINTS.FREQUENT_GAME_PLAYERS:API_CONFIG.ENDPOINTS.HIGHEST_TURNOVER_PLAYERS;}
  /* Footer "Show N entries" (locked listing recipe): "-" = auto-fit — the trigger always paints
     "-" and the row count is whatever the viewport can show, so the page does not scroll;
     "All" = the locked 10000 ceiling and the page may scroll; a number is that size.
     The panel on this page is not a viewport-locked .mad-panel, so auto-fit pins the fitted
     height on .table-wrap itself; if the measurement is unusable the request falls back to 20. */
  const ROW_H=41, MIN_ROWS=5, MAX_ROWS=100;
  const wrapEl=()=>document.querySelector('.table-card .table-wrap');
  const footEl=()=>document.querySelector('.mad-footer');
  /* The row height is MEASURED, not assumed. It was the literal 40 while these rows render at 41
     (13px text, 10px cell padding, the provider pill), so `floor(avail / 40)` asked the server for
     exactly one row more than the panel can show: the fitted page ran past the panel's own cap and
     the last row sat half-cut behind a scrollbar while the control still read its default `-`.
     Owner: "没调整好他的默认 entries 但能scroll的问题". */
  function measureRowH(wrap){
    const tr=wrap&&wrap.querySelector('tbody tr');
    if(tr){const h=Math.round(tr.getBoundingClientRect().height);if(h>20&&h<120)return h;}
    return ROW_H;
  }
  function fitPlan(){
    const wrap=wrapEl(); if(!wrap)return null;
    const rowH=measureRowH(wrap);
    const head=wrap.querySelector('thead'), headH=head?head.getBoundingClientRect().height:0;
    const foot=footEl(), footH=foot?foot.getBoundingClientRect().height:0;
    const avail=Math.floor(window.innerHeight-wrap.getBoundingClientRect().top-footH-14);
    if(avail<headH+MIN_ROWS*rowH)return null;
    const size=Math.min(MAX_ROWS,Math.floor((avail-headH)/rowH));
    return size<MIN_ROWS?null:{size:size,maxHeight:avail};
  }
  /* The fit, settled against the rows that were actually painted — the same shape the other family
     pages use. A single guess can still be off (the panel's cap and a horizontal scrollbar both
     move the real capacity after the request is made), so the painted page is measured and the size
     stepped once in whichever direction is wrong, at most three times. On this page that costs one
     extra request on the first paint, and nothing on a later one. */
  let fitLock=0, settleSteps=0, verifyPending=false;
  function settleFit(rows,size){
    const sel=$('gameRankSize'), auto=!sel||sel.value==='-'||sel.value==='';
    if(!auto||!rows.length||settleSteps>=3)return;
    const wrap=wrapEl(); if(!wrap)return;
    const tr=wrap.querySelector('tbody tr'); if(!tr)return;
    const rowH=Math.max(28,Math.round(tr.getBoundingClientRect().height));
    const cap=wrap.clientHeight;                    // applyFit() has already capped the wrap
    /* The target is computed from the painted row's own height, not stepped by one: an exact
       measurement makes the first correction the last one (measured: 18 rows from the placeholder
       row's 38px, then straight to 16 at the real 41px — `floor(681/41)` — instead of 18→17→16). */
    const target=Math.max(MIN_ROWS,Math.min(MAX_ROWS,Math.floor(cap/rowH)));
    if(target===size){
      /* Converged — but verify one frame later. The panel's cap still moves while the page lays
         itself out (`applyFit` writes `maxHeight` off a viewport measurement taken earlier), and a
         1px-under cap leaves the fitted page scrolling for a 1px sliver: measured at 1280×760,
         12 rows at 41px = 492 in a 491px panel. */
      if(verifyPending)return;
      verifyPending=true;
      requestAnimationFrame(()=>{
        verifyPending=false;
        const sel2=$('gameRankSize');
        if(!sel2||sel2.value!=='-')return;
        const w2=wrapEl();
        if(!w2||w2.scrollHeight<=w2.clientHeight+1)return;
        const cur=fitLock||size;
        if(cur<=MIN_ROWS)return;
        settleSteps=0;
        fitLock=cur-1;
        setTimeout(()=>load(false),0);
      });
      return;
    }
    settleSteps++;
    fitLock=target;
    /* Deferred: this runs inside load()'s try block, where `loading` is still true, and load()
       bails on that guard — calling it directly made the correction a silent no-op and left the
       fitted page one row too long (measured: 18 rows at 41px = 738 in a 681px panel, the last
       row cut behind the scrollbar). */
    setTimeout(()=>load(false),0);
  }
  function applyFit(plan){const wrap=wrapEl();if(!wrap)return;wrap.style.maxHeight=plan?plan.maxHeight+'px':'';wrap.style.overflowY=plan?'auto':'';}
  function requestedSize(){
    const sel=$('gameRankSize'), v=sel?sel.value:'';
    if(v==='All')return 10000;
    if(v==='-'||!v){ if(fitLock)return fitLock; const p=fitPlan();return p?p.size:20; }
    return Number(v)||20;
  }
  function info(rows,size){
    const el=$('gameRankInfo');if(!el)return;
    const total=Number(totalElements)||0, n=Array.isArray(rows)?rows.length:0;
    const from=(total&&n)?page*size+1:0, to=(total&&n)?Math.min(page*size+n,total):0;
    el.textContent='Showing '+from+' to '+to+' of '+total+' members';
  }
  /* Table footer pager — locked anatomy: First · Previous · numbered window (±2 around the
     current page, always including 1 and the last page, a gap > 1 collapsed into an ellipsis)
     · Next · Last, all on the locked .smart-page chrome emitted into nav.mad-pager. */
  function pager(){
    const box=$('gameRankPager');if(!box)return;
    const total=Math.max(1,Number(totalPages)||1), cur=Math.max(1,Math.min(page+1,total));
    /* no early return: the ladder renders on a single page too, ends disabled (family contract) */
    const nums=[], add=n=>{if(n>=1&&n<=total&&nums.indexOf(n)<0)nums.push(n);};
    add(1);for(let n=cur-2;n<=cur+2;n++)add(n);add(total);nums.sort((a,b)=>a-b);
    let h='';
    h+='<button type="button" class="smart-page first" id="gameRankFirst" data-page="1" title="First page" aria-label="First page"'+(cur<=1?' disabled':'')+'><i class="bi bi-chevron-bar-left" aria-hidden="true"></i></button>';
    h+='<button type="button" class="smart-page" id="gameRankPrev" data-page="'+(cur-1)+'" title="Previous page" aria-label="Previous page"'+(cur<=1?' disabled':'')+'><i class="bi bi-chevron-left" aria-hidden="true"></i></button>';
    let prev=0;
    nums.forEach(n=>{if(prev&&n-prev>1)h+='<span class="smart-page-ellipsis" aria-hidden="true">…</span>';h+='<button type="button" class="smart-page'+(n===cur?' active':'')+'" data-page="'+n+'"'+(n===cur?' aria-current="page"':'')+'>'+n+'</button>';prev=n;});
    h+='<button type="button" class="smart-page" id="gameRankNext" data-page="'+(cur+1)+'" title="Next page" aria-label="Next page"'+(cur>=total?' disabled':'')+'><i class="bi bi-chevron-right" aria-hidden="true"></i></button>';
    h+='<button type="button" class="smart-page last" id="gameRankLast" data-page="'+total+'" title="Last page" aria-label="Last page"'+(cur>=total?' disabled':'')+'><i class="bi bi-chevron-bar-right" aria-hidden="true"></i></button>';
    box.innerHTML=h;
  }
  async function load(reset){
    if(loading)return;
    if(reset)page=0;
    loading=true;
    const body=$('gameRankBody');
    body.innerHTML='<tr><td colspan="'+COLS+'">Loading...</td></tr>';
    const sel=$('gameRankSize'), auto=!sel||sel.value==='-'||sel.value==='';
    const plan=auto?fitPlan():null;
    /* `requestedSize()` in BOTH paths: it is the one place that knows about `fitLock`, and the
       auto path used to read `plan.size` directly — so the settled size was computed, stored and
       then ignored on the very next request, which looped (eight identical size=18 calls) while
       the panel stayed one row too long. */
    const size=requestedSize();
    const qs=new URLSearchParams({page:String(page),size:String(size)});
    const q=$('gameRankSearch').value.trim(),p=$('gameRankProvider').value.trim();if(q)qs.set('search',q);if(p)qs.set('providerCode',p);
    try{
      const r=await fetch(API_CONFIG.BASE_URL+endpoint()+'?'+qs,{headers:BO_AUTH.authHeader()});
      const j=await r.json().catch(()=>({}));
      if(!r.ok||j.status==='error')throw new Error(j.message||'Request failed');
      const d=j.data||{},rows=d.content||[];
      totalPages=Number(d.totalPages||0);totalElements=Number(d.totalElements||0);
      const pageSize=Number(d.size||size)||size;
      $('gameRankCount').textContent=totalElements+' Members';
      info(rows,pageSize);pager();
      body.innerHTML=rows.length?rows.map((r,i)=>`<tr><td>${page*pageSize+i+1}</td><td>${esc(r.memberId)}</td><td>${esc(r.username||'-')}</td><td>${esc(r.fullName||'-')}</td><td>${esc(r.mobile||'-')}</td><td><span class="status-pill info">${esc(r.providerCode||'-')}</span></td><td>${esc(r.gameCode||'-')}</td><td><strong>${money(r.totalTurnover)}</strong></td><td>${Number(r.playCount||0)}</td><td>${dt(r.lastPlayedAt)}</td></tr>`).join(''):'<tr><td colspan="'+COLS+'">No settled game records found.</td></tr>';
      lastFit=plan?plan.size:0;applyFit(plan);
      settleFit(rows,pageSize);
    }catch(e){
      totalPages=0;totalElements=0;$('gameRankCount').textContent='0 Members';info([],size);pager();lastFit=0;applyFit(null);
      body.innerHTML='<tr><td colspan="'+COLS+'">'+esc(e.message)+'</td></tr>';
    }finally{loading=false;}
  }
  /* No Search / Reset / Refresh buttons on this family (owner: "report的所有reset，search，
     refresh按键全去除"). The filters apply themselves: the two text fields on a debounce, the
     footer page-size on change. The three `.onclick` assignments that used to live here were
     unguarded, so deleting the buttons without this would have thrown on load. */
  let rankInputT=0;
  /* Any explicit action re-opens the fit: only the settled value is discarded with it, never the
     user's own page-size choice. */
  const userLoad=reset=>{fitLock=0;settleSteps=0;load(reset)};
  /* Every binding below is once per ELEMENT: this file serves two pages
     (frequently-played-games.html and highest-turnover-games.html) and the router re-runs it on
     each entry - which is what re-renders the ladder - so an unguarded addEventListener would
     fire every debounce, key and pager click twice. The elements are fresh clones per entry, so
     the mark goes on them, not on the body. */
  ['gameRankSearch','gameRankProvider'].forEach(id=>{
    const el=$(id); if(!el||el.dataset.rankInputBound==='1') return;
    el.dataset.rankInputBound='1';
    el.addEventListener('input',()=>{clearTimeout(rankInputT);rankInputT=setTimeout(()=>userLoad(true),400)});
  });
  $('gameRankSize').onchange=()=>userLoad(true);
  /* One delegated handler for the whole ladder (page rungs carry data-page); #gameRankPrev and
     #gameRankNext keep their ids so anything clicking them still lands here through the nav. */
  const rankPager=$('gameRankPager');
  if(rankPager&&rankPager.dataset.rankPagerBound!=='1'){
    rankPager.dataset.rankPagerBound='1';
    rankPager.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(!b||b.disabled)return;const n=Number(b.getAttribute('data-page'));if(!(n>=1)||n>totalPages||n===page+1)return;page=n-1;load(false);});
  }
  ['gameRankSearch','gameRankProvider'].forEach(id=>{
    const el=$(id); if(!el||el.dataset.rankKeysBound==='1') return;
    el.dataset.rankKeysBound='1';
    el.addEventListener('keydown',e=>{if(e.key==='Enter')userLoad(true)});
  });
  /* `window` outlives a swap, so this one is a single slot rather than a guard: the previous
     page's closure must be dropped, not kept (it would drive the previous ladder's state). */
  const onRankResize=()=>{const sel=$('gameRankSize');if(!sel||sel.value!=='-')return;clearTimeout(resizeT);resizeT=setTimeout(()=>{const p=fitPlan();if(p&&p.size!==lastFit)userLoad(false)},250)};
  if(window.__boRankResize) window.removeEventListener('resize',window.__boRankResize);
  window.__boRankResize=onRankResize;
  window.addEventListener('resize',onRankResize);
  userLoad(true);
})();