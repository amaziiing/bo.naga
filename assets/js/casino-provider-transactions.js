/* Provider Transactions - the page the Provider Win/Loss report's row action opens.
   It is a drill page, not a module row: the module tab row is not rendered for it, the Report rail
   row stays lit (auth.js sidebarActivePage), and `Back to list` appears only when the link carried
   one, pointing back at the report with the range it was opened with.

   The date control is `bo-date-range.js`'s own pill (the pair `cptFrom`/`cptTo` is registered
   there), so a picked range behaves exactly as it does on the report page: both hidden inputs are
   written and one `change` is emitted, which reloads the cards and the table together. */
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const SP = new URLSearchParams(location.search);
  const PROVIDER = String(SP.get('providerCode') || '').trim().toUpperCase();
  const URL_FROM = SP.get('from') || '';
  const URL_TO = SP.get('to') || '';
  /* Same rule as the report's own control: a page reached from a menu or by hand has nothing to go
     back to, and the owner called a control on those entries out ("不对 为什么这个tab页面会有back to
     list?"). Relative page targets only. */
  const BACK = (function(){ const b = SP.get('back') || ''; return /^\/?[a-z0-9._-]+\.html(\?|#|$)/i.test(b) ? b : ''; })();
  const TOTALS = [
    ['betAmount', 'cptBet'],
    ['validBetAmount', 'cptValidBet'],
    ['payout', 'cptPayout'],
    ['companyWinLoss', 'cptCompanyWinLoss']
  ];
  const CHUNK = 100;            /* the endpoint's own cap on `size` */
  const MAX_CHUNKS = 50;        /* All is a listing, not an export: 5000 rows is the ceiling */
  let page = 1, totalPages = 1, totalElements = 0, loadSeq = 0, fitLock = null, rangeTimer = 0, fitTimer = 0;

  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function num(v){ const n = Number(v || 0); return Number.isFinite(n) ? n : 0; }
  function money(v){ return num(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}); }
  function dt(v){ const s = String(v || '').replace('T', ' '); return s ? esc(s.slice(0, 19)) : '-'; }
  function endpoint(key){ return API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS[key]; }
  async function get(u){
    const res = await fetch(u, {headers: Object.assign({}, BO_AUTH.authHeader())});
    const json = await res.json().catch(() => ({}));
    if(!res.ok || json.status === 'error') throw new Error(json.message || 'Request failed');
    return json.data || {};
  }
  /* The two shapes this endpoint answers with, as the Provider Bet Report reads them. */
  function readList(data){ return data.items || data.list || data.content || data.rows || (Array.isArray(data) ? data : []); }
  function readTotalPages(data){ return Number((data.pagination && data.pagination.totalPages) || data.totalPages || data.pages || 1) || 1; }
  function readTotalElements(data, rowCount){ return Number((data.pagination && data.pagination.totalElements) || data.totalElements || data.total || data.count || rowCount) || 0; }

  function range(){
    return {from: ($('cptFrom') && $('cptFrom').value) || '', to: ($('cptTo') && $('cptTo').value) || ''};
  }
  function pageSizeOption(){ const el = $('cptPageSize'); return el ? el.value : '-'; }
  function isFitSize(v){ const s = String(v == null ? '-' : v).trim(); return s === '' || s === '-' || /^auto$/i.test(s); }
  function isAllSize(v){ return /^all$/i.test(String(v || '').trim()); }
  /* The family's own idea of `-`: as many rows as the card has room for, measured on the element
     that actually carries them (the head and one body cell), exactly as casino-report.js does it. */
  function measureFitSize(){
    const wrap = document.querySelector('.table-card .table-wrap');
    if(!wrap) return null;
    const head = wrap.querySelector('thead');
    const headH = head ? Math.ceil(head.getBoundingClientRect().height) : 0;
    const cell = wrap.querySelector('tbody tr td');
    if(!cell) return null;
    const rowH = Math.max(34, Math.round(cell.getBoundingClientRect().height)) || 41;
    const avail = Math.floor(wrap.clientHeight) - headH;
    return Math.max(5, Math.min(200, Math.floor(avail / rowH) || 20));
  }
  function fitSize(){
    if(fitLock == null){ const m = measureFitSize(); if(m == null) return 20; fitLock = m; }
    return fitLock;
  }
  function requestSize(){
    const opt = pageSizeOption();
    if(isAllSize(opt)) return CHUNK;
    if(isFitSize(opt)) return fitSize();
    const n = Number(opt);
    return Number.isFinite(n) && n > 0 ? n : fitSize();
  }

  /* One listener per element per entry: the router replays the registry on every swap, so a rerun
     that bound again would fire each click twice. */
  function on(el, type, fn){
    if(!el) return;
    if(el.__cptBound) el.removeEventListener(type, el.__cptBound);
    el.__cptBound = fn;
    el.addEventListener(type, fn);
  }

  function paintHead(){
    if($('cptProvider')) $('cptProvider').textContent = PROVIDER || 'Provider';
    document.title = PROVIDER ? (PROVIDER + ' Transactions') : 'Provider Transactions';
    /* The control is built, not hidden: bo-report-family.css styles `.bo-report-back`, and the
       sibling report page builds its own the same way. No `back` on the link means no control. */
    const row = document.querySelector('.report-main .bo-filter-row');
    if(row && BACK && !$('cptBack')){
      const a = document.createElement('a');
      a.className = 'bo-report-back';
      a.id = 'cptBack';
      a.href = BACK;
      a.innerHTML = '<i class="bi bi-arrow-left" aria-hidden="true"></i> Back to list';
      row.appendChild(a);
    }
  }

  async function loadTotals(){
    const {from, to} = range();
    const p = new URLSearchParams({period:'custom'});
    if(from) p.set('from', from);
    if(to) p.set('to', to);
    try{
      const data = await get(endpoint('CASINO_REPORT_SUMMARY') + '?' + p.toString());
      /* The Provider Win/Loss report's own rows for this provider, summed - the cards cannot
         disagree with the report they were opened from. */
      const rows = (data.providerDaily || data.provider || []).filter(r => String(r.providerCode || '').trim().toUpperCase() === PROVIDER);
      TOTALS.forEach(t => {
        const el = $(t[1]);
        if(!el) return;
        el.textContent = money(rows.reduce((s, r) => s + num(r[t[0]]), 0));
      });
    }catch(e){
      /* not readable for this account: dashes beat zeros that look like real totals */
      TOTALS.forEach(t => { const el = $(t[1]); if(el) el.textContent = '—'; });
    }
  }

  function renderPager(){
    const box = $('cptPager');
    if(!box) return;
    const total = Math.max(1, totalPages);
    const current = Math.max(1, Math.min(page, total));
    const nums = [];
    const add = n => { if(n >= 1 && n <= total && nums.indexOf(n) === -1) nums.push(n); };
    add(1);
    for(let n = current - 2; n <= current + 2; n++) add(n);
    add(total);
    nums.sort((a, b) => a - b);
    let html = '<button type="button" class="smart-page first" data-page="1"' + (current <= 1 ? ' disabled' : '') + ' title="First page" aria-label="First page"><i class="bi bi-chevron-bar-left" aria-hidden="true"></i></button>';
    html += '<button type="button" class="smart-page nav-text" data-page="' + (current - 1) + '"' + (current <= 1 ? ' disabled' : '') + ' title="Previous page" aria-label="Previous page"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>';
    let prev = 0;
    nums.forEach(n => {
      if(prev && n - prev > 1) html += '<span class="smart-page-ellipsis" aria-hidden="true">…</span>';
      html += '<button type="button" class="smart-page' + (n === current ? ' active' : '') + '" data-page="' + n + '"' + (n === current ? ' aria-current="page"' : '') + '>' + n + '</button>';
      prev = n;
    });
    html += '<button type="button" class="smart-page nav-text" data-page="' + (current + 1) + '"' + (current >= total ? ' disabled' : '') + ' title="Next page" aria-label="Next page"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>';
    html += '<button type="button" class="smart-page last" data-page="' + total + '"' + (current >= total ? ' disabled' : '') + ' title="Last page" aria-label="Last page"><i class="bi bi-chevron-bar-right" aria-hidden="true"></i></button>';
    box.innerHTML = html;
  }

  function rowHtml(x, index){
    const bet = num(x.betAmount != null ? x.betAmount : (x.transferAmount != null ? x.transferAmount : x.amount));
    const back = num(x.winAmount != null ? x.winAmount : (x.transferBackAmount != null ? x.transferBackAmount : x.payoutAmount));
    const net = x.netAmount != null ? num(x.netAmount) : (back - bet);
    const member = x.memberUsername || x.username || x.mobile || '-';
    const game = x.gameName || x.gameCode || x.gameId || '-';
    const betId = x.providerBetId || x.betId || x.providerTxId || x.txId || x.roundId || x.id || '-';
    return '<tr>' +
      '<td>' + index + '</td>' +
      '<td><b>' + esc(member) + '</b><br><small>ID: ' + esc(x.memberId || '-') + '</small></td>' +
      '<td>' + esc(game) + '</td>' +
      '<td>' + esc(betId) + '</td>' +
      '<td>' + esc(x.eventType || x.status || '-') + '</td>' +
      '<td>' + money(bet) + '</td>' +
      '<td>' + money(x.validBetAmount != null ? x.validBetAmount : bet) + '</td>' +
      '<td>' + money(back) + '</td>' +
      '<td><b class="' + (net < 0 ? 'text-danger' : 'text-success') + '">' + money(net) + '</b></td>' +
      '<td>' + dt(x.createdAt || x.startedAt || x.betTime || x.endedAt) + '</td>' +
      '</tr>';
  }

  function paint(rows, firstIndex, total){
    const body = $('cptRows');
    totalElements = total;
    if(body) body.innerHTML = rows.length ? rows.map((x, i) => rowHtml(x, firstIndex + i)).join('')
      : '<tr><td colspan="10">No transactions for this provider and period.</td></tr>';
    const info = $('cptInfo');
    if(info){
      const from = rows.length ? firstIndex : 0;
      const to = rows.length ? firstIndex + rows.length - 1 : 0;
      info.textContent = 'Showing ' + from + ' to ' + to + ' of ' + total + ' entries';
    }
    renderPager();
  }

  function listQuery(from, to, pageNo, sizeNo){
    const p = new URLSearchParams({providerCode:PROVIDER, page:String(pageNo), size:String(sizeNo)});
    if(from) p.set('from', from);
    if(to) p.set('to', to);
    return p.toString();
  }

  /* `All` is one listing of everything the report holds for this provider. The endpoint caps `size`
     at 100, so the pages are pulled one after another and shown as a single page - asking for
     `size=10000` would silently print "Showing 1 to 100 of N" under the real count. */
  async function loadAll(from, to){
    const out = [];
    let total = 0;
    for(let chunk = 1; chunk <= MAX_CHUNKS; chunk++){
      const data = await get(endpoint('PROVIDER_BET_REPORT_LIST') + '?' + listQuery(from, to, chunk, CHUNK));
      const rows = readList(data);
      total = readTotalElements(data, out.length + rows.length);
      out.push.apply(out, rows);
      if(!rows.length || rows.length < CHUNK || out.length >= total) break;
    }
    return {rows:out, total:Math.max(total, out.length)};
  }

  async function loadRows(){
    const seq = ++loadSeq;
    const {from, to} = range();
    const opt = pageSizeOption();
    const body = $('cptRows');
    if(body) body.innerHTML = '<tr><td colspan="10">Loading...</td></tr>';
    try{
      if(isAllSize(opt)){
        const all = await loadAll(from, to);
        if(seq !== loadSeq) return;
        page = 1; totalPages = 1;
        paint(all.rows, 1, all.total);
        return;
      }
      const size = requestSize();
      const data = await get(endpoint('PROVIDER_BET_REPORT_LIST') + '?' + listQuery(from, to, page, size));
      if(seq !== loadSeq) return;
      const rows = readList(data);
      totalPages = readTotalPages(data);
      const total = readTotalElements(data, rows.length);
      page = Math.min(Math.max(1, page), Math.max(1, totalPages));
      paint(rows, (page - 1) * size + 1, total);
    }catch(e){
      if(seq !== loadSeq) return;
      totalPages = 1;
      page = 1;
      if(body) body.innerHTML = '<tr><td colspan="10" class="text-danger">' + esc(e.message) + '</td></tr>';
      totalElements = 0;
      renderPager();
      const info = $('cptInfo');
      if(info) info.textContent = 'Showing 0 to 0 of 0 entries';
    }
  }

  function reload(){ page = 1; fitLock = null; loadTotals(); loadRows(); }

  function bind(){
    on($('cptPageSize'), 'change', function(){
      /* A new page size is a new fit: the measured count belongs to the old one. */
      fitLock = null;
      page = 1;
      loadRows();
    });
    on($('cptPager'), 'click', function(e){
      const b = e.target.closest('[data-page]');
      if(!b || b.disabled || isAllSize(pageSizeOption())) return;
      const n = Number(b.dataset.page);
      if(n >= 1 && n <= totalPages && n !== page){ page = n; loadRows(); }
    });
    /* The range auto-applies as soon as a complete range is chosen - same binding and same 120ms
       debounce as the report page's `autoLoadSelectedRange`. */
    const onRange = function(){
      const {from, to} = range();
      if(!from || !to) return;
      clearTimeout(rangeTimer);
      rangeTimer = setTimeout(reload, 120);
    };
    on($('cptFrom'), 'change', onRange);
    on($('cptTo'), 'change', onRange);
    /* In `-` mode the row count is the card's own height, so it is re-measured when that changes. */
    if(window.__cptResizeBound) window.removeEventListener('resize', window.__cptResizeBound);
    window.__cptResizeBound = function(){
      if(!isFitSize(pageSizeOption())) return;
      clearTimeout(fitTimer);
      fitTimer = setTimeout(function(){ fitLock = null; page = 1; loadRows(); }, 250);
    };
    window.addEventListener('resize', window.__cptResizeBound);
  }

  function boot(){
    /* No provider in the URL means the page has nothing to show - it is only ever reached from the
       report's row action. Send the reader to the report it belongs to, range and all. */
    if(!PROVIDER){
      const q = new URLSearchParams();
      if(URL_FROM) q.set('from', URL_FROM);
      if(URL_TO) q.set('to', URL_TO);
      location.replace('casino-provider-winloss-report.html' + (q.toString() ? ('?' + q.toString()) : ''));
      return;
    }
    /* The range the report was showing goes into the two inputs before anything reads them, and one
       native `change` is emitted so `bo-date-range.js` re-labels the pill it built from the (empty)
       inputs at parse time - the same two steps the report page takes. My own handlers are bound
       afterwards, so this cannot queue a second load. */
    if(URL_FROM && $('cptFrom') && URL_TO && $('cptTo')){
      $('cptFrom').value = URL_FROM;
      $('cptTo').value = URL_TO;
      $('cptTo').dispatchEvent(new Event('change', {bubbles:true}));
    }
    paintHead();
    bind();
    loadTotals();
    loadRows();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
