(function(){
  const REPORT_TITLES = {
    overview: 'Overview Report',
    breakdown: 'Breakdown Report',
    depositWithdraw: 'Deposit / Withdraw Report',
    provider: 'Provider Win/Loss Report',
    bonus: 'Bonus Report'
  };
  function pageType(){
    return document.body.getAttribute('data-report-page') || document.querySelector('[data-report-page]')?.getAttribute('data-report-page') || 'overview';
  }
  function url(){ return API_CONFIG.BASE_URL + (API_CONFIG.ENDPOINTS.CASINO_REPORT_SUMMARY || '/admin/casino-report/summary'); }
  /* A link may carry what it was opened for - the Win/Lose merchant page's provider rows send
     `providerCode` plus the range they were looking at. The range goes into the two hidden
     inputs (`bo-date-range.js` listens on their `change` to re-label its pill), and the provider
     filters the daily rows before they are paged, so the count and the ladder follow it. */
  const LINK_PARAMS = new URLSearchParams(location.search);
  const LINK_PROVIDER = String(LINK_PARAMS.get('providerCode') || '').trim().toUpperCase();
  const LINK_FROM = LINK_PARAMS.get('from') || '';
  const LINK_TO = LINK_PARAMS.get('to') || '';
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function num(v){ const n = Number(v || 0); return Number.isFinite(n) ? n : 0; }
  function money(v){ return num(v).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}); }
  function whole(v){ return Math.round(num(v)).toLocaleString(); }
  function statusAmount(group, status){ return group && group[status] ? num(group[status].amount) : 0; }
  function statusCount(group, status){ return group && group[status] ? num(group[status].count) : 0; }
  async function api(endpoint){
    const res = await fetch(endpoint, {headers:{...BO_AUTH.authHeader()}});
    const json = await res.json().catch(()=>({}));
    if(!res.ok || json.status === 'error') throw new Error(json.message || 'Request failed');
    return json;
  }
  function params(opts){
    const p = new URLSearchParams();
    const from = document.getElementById('casinoFrom')?.value || '';
    const to = document.getElementById('casinoTo')?.value || '';
    // Date Range is now the single source of truth for every casino report.
    p.set('period', 'custom');
    /* allTime: the KPI strips are all time (owner: 卡片 total 显示所有 不会被 date Range 和 Entry 影响);
       the tables keep the range. */
    if(!(opts && opts.allTime)){
    if(from) p.set('from', from);
    if(to) p.set('to', to);
    }
    return p.toString();
  }
  function setMetric(id, value, isMoney){ const el=document.getElementById(id); if(el) el.textContent = isMoney ? money(value) : whole(value); }
  function approvedAmount(group){ return statusAmount(group,'APPROVED') + statusAmount(group,'COMPLETED') + statusAmount(group,'SUCCESS'); }
  function pendingAmount(group){ return statusAmount(group,'PENDING'); }
  function failedAmount(group){ return statusAmount(group,'REJECTED') + statusAmount(group,'FAILED'); }
  function approvedCount(group){ return statusCount(group,'APPROVED') + statusCount(group,'COMPLETED') + statusCount(group,'SUCCESS'); }
  function pendingCount(group){ return statusCount(group,'PENDING'); }
  function failedCount(group){ return statusCount(group,'REJECTED') + statusCount(group,'FAILED'); }
  function hasAnyData(row, fields){
    return fields.some(function(k){ return num(row && row[k]) !== 0; });
  }

  /* ------------------------------------------------------------------ paging
     Each report page mounts exactly one of these bodies. The column counts are the
     real <thead> widths of the page that carries the body; a loading / empty / error
     row that claims a different colspan tears the table apart. */
  const COLS = {
    crBreakdownBody: 12,
    crProviderBody: 10,
    crStatusBody: 14,
    crDepositStatusBody: 8,
    crWithdrawStatusBody: 8,
    crBonusBody: 5
  };
  const TABLES = new Map();
  let pageSizeLock = null;
  let autoSteps = 0;
  let activeTableId = null;

  function tableState(id){
    if(!TABLES.has(id)) TABLES.set(id, { bodyId: id, cols: COLS[id] || 1, rows: [], empty: 'No data.', page: 1 });
    return TABLES.get(id);
  }
  function pageSizeOption(){ const el = document.getElementById('crPageSize'); return el ? el.value : '-'; }
  function isAutoPageSize(raw){ const v = String(raw == null ? '' : raw).trim(); return v === '' || v === '-' || /^auto$/i.test(v); }
  function measureAutoPageSize(){
    const wrap = document.querySelector('.table-card .table-wrap');
    if(!wrap) return null;
    /* `report-table-split.js` lifts the thead OUT of the scroller at ≥992px, so a missing thead
       means the wrap is body-only and there is no head to subtract. The `44` that used to stand in
       for "no thead" was subtracted anyway and cost the fit exactly one row: measured 676px of
       panel at 38px rows, `(676 - 44) / 38 = 16.6 → 16` rows, leaving a 68px dead band above the
       footer on all four casino reports. */
    const head = wrap.querySelector('thead');
    const headH = head ? Math.ceil(head.getBoundingClientRect().height) : 0;
    const cell = wrap.querySelector('tbody tr td');
    if(!cell) return null;
    const rowH = Math.max(34, Math.round(cell.getBoundingClientRect().height)) || 41;
    const avail = Math.floor(wrap.clientHeight) - headH;
    return Math.max(5, Math.min(200, Math.floor(avail / rowH) || 20));
  }
  function autoPageSize(){
    if(pageSizeLock == null){ const m = measureAutoPageSize(); if(m == null) return 20; pageSizeLock = m; }
    return pageSizeLock;
  }
  function resolvePageSize(raw){
    const v = String(raw == null ? '-' : raw).trim();
    if(/^all$/i.test(v)) return Infinity;
    if(isAutoPageSize(v)) return autoPageSize();
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : autoPageSize();
  }
  /* Numbered window: ±2 around the current page, plus the first and last page,
     with a gap of more than one collapsed into an ellipsis. */
  function pagerNumbers(current, total){
    const out = [];
    const add = n => { if(n >= 1 && n <= total && out.indexOf(n) < 0) out.push(n); };
    add(1);
    for(let n = current - 2; n <= current + 2; n++) add(n);
    add(total);
    return out.sort((a, b) => a - b);
  }
  function renderPager(state, totalPages){
    const nav = document.getElementById('crPager');
    if(!nav) return;
    const current = state.page;
    let html = '';
    html += '<button type="button" class="smart-page first" data-cr-page="1" ' + (current <= 1 ? 'disabled' : '') + ' title="First page" aria-label="First page"><i class="bi bi-chevron-bar-left" aria-hidden="true"></i></button>';
    html += '<button type="button" class="smart-page nav-text" data-cr-page="' + (current - 1) + '" ' + (current <= 1 ? 'disabled' : '') + ' title="Previous page" aria-label="Previous page"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>';
    let prev = 0;
    pagerNumbers(current, totalPages).forEach(function(n){
      if(prev && n - prev > 1) html += '<span class="smart-page-ellipsis" aria-hidden="true">\u2026</span>';
      html += '<button type="button" class="smart-page' + (n === current ? ' active' : '') + '" data-cr-page="' + n + '" ' + (n === current ? 'aria-current="page"' : '') + '>' + n + '</button>';
      prev = n;
    });
    html += '<button type="button" class="smart-page nav-text" data-cr-page="' + (current + 1) + '" ' + (current >= totalPages ? 'disabled' : '') + ' title="Next page" aria-label="Next page"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>';
    html += '<button type="button" class="smart-page last" data-cr-page="' + totalPages + '" ' + (current >= totalPages ? 'disabled' : '') + ' title="Last page" aria-label="Last page"><i class="bi bi-chevron-bar-right" aria-hidden="true"></i></button>';
    nav.innerHTML = html;
  }
  function renderTablePage(state){
    const body = document.getElementById(state.bodyId);
    if(!body) return;
    const size = resolvePageSize(pageSizeOption());
    const total = state.rows.length;
    const totalPages = size === Infinity ? 1 : Math.max(1, Math.ceil(total / size));
    if(state.page > totalPages) state.page = totalPages;
    if(state.page < 1) state.page = 1;
    const start = size === Infinity ? 0 : (state.page - 1) * size;
    const slice = state.rows.slice(start, start + (size === Infinity ? total : size));
    body.innerHTML = slice.length ? slice.join('') : '<tr><td colspan="' + state.cols + '">' + esc(state.empty) + '</td></tr>';
    const info = document.getElementById('crFooterInfo');
    if(info){
      const to = total ? Math.min(start + slice.length, total) : 0;
      info.textContent = 'Showing ' + (total ? start + 1 : 0) + ' to ' + to + ' of ' + total + ' entries';
    }
    renderPager(state, totalPages);
    /* The Show N entries default (`-`) fits the rows to the panel — and the fit is settled
       against the rows that were ACTUALLY painted, not against the first estimate. That first
       estimate runs while the body still holds the `Loading...` placeholder (42px against the
       38px a real row renders), and because the first measurement also set the lock, the fit was
       never re-derived: the panel kept one row of dead space under the last row on all four
       casino reports. Re-measuring after the paint costs nothing here — this page slices
       client-side, so a correction is a re-render, not a request. */
    if(isAutoPageSize(pageSizeOption()) && autoSteps < 3){
      const fitted = measureAutoPageSize();
      if(fitted != null && fitted !== size){ autoSteps++; pageSizeLock = fitted; return renderTablePage(state); }
      autoSteps = 0;
    }
  }
  function mountRows(id, rows, emptyText){
    const body = document.getElementById(id);
    if(!body) return;
    const state = tableState(id);
    state.rows = rows || [];
    state.empty = emptyText || 'No data.';
    state.page = 1;
    activeTableId = id;
    renderTablePage(state);
  }

  function renderCommon(data){
    const title = REPORT_TITLES[pageType()] || 'Casino Report';
    const h = document.querySelector('[data-report-title]');
    if(h) h.textContent = title;
    const range = document.getElementById('casinoRangeText');
    if(range) range.textContent = `Showing report from ${data.from || '-'} to ${data.to || '-'}`;
  }
  function renderOverview(data, opts){
    const dw = data.depositWithdraw || {};
    const deposit = dw.deposit || {};
    const withdraw = dw.withdraw || {};
    const betting = data.betting || {};
    const overview = data.overview || {};
    const adjustment = data.adjustment || {};
    const bonusRows = Array.isArray(data.bonus) ? data.bonus : [];
    const bonusTotal = bonusRows.reduce((s,r)=>s+num(r.bonusAmount),0);
    if(!(opts && opts.skipTiles)){
    setMetric('crDeposit', approvedAmount(deposit), true);
    setMetric('crAdjustmentIn', adjustment.adjustmentIn, true);
    setMetric('crAdjustmentOut', adjustment.adjustmentOut, true);
    setMetric('crWithdraw', approvedAmount(withdraw), true);
    setMetric('crBetAmount', betting.betAmount, true);
    setMetric('crValidBet', betting.validBetAmount, true);
    setMetric('crMemberWin', betting.memberWin, true);
    setMetric('crMemberLose', betting.memberLose, true);
    setMetric('crCompanyWinLoss', betting.companyWinLoss, true);
    setMetric('crNewMembers', overview.newMembers, false);
    setMetric('crActiveBetMembers', overview.activeBetMembers, false);
    setMetric('crBonus', bonusTotal, true);
    setMetric('crBetCount', betting.betCount, false);
    setMetric('crPendingDeposit', pendingAmount(deposit), true);
    setMetric('crPendingWithdraw', pendingAmount(withdraw), true);
    setMetric('crFailedDeposit', failedAmount(deposit), true);
    setMetric('crFailedWithdraw', failedAmount(withdraw), true);
    }
    const missing = Array.isArray(data.missingReports) ? data.missingReports : [];
    const el = document.getElementById('crReportsCovered');
    if(el){
      const reports = missing.length ? missing : ['Casino Overview Report','Daily / Weekly / Monthly Report','Deposit Status Report','Withdraw Status Report','Provider Win/Loss Report','Bonus Cost Report','Member Activity Report'];
      el.innerHTML = reports.map(x=>`<span class="badge bg-light text-dark border me-2 mb-2">${esc(x)}</span>`).join('');
    }
  }
  function renderBreakdown(rows){
    rows = (rows || []).filter(function(r){ return hasAnyData(r, ['newMembers','depositMembers','depositCount','depositAmount','withdrawMembers','withdrawCount','withdrawAmount','activeBetMembers','validBetAmount','memberWinLoss','companyWinLoss']); });
    mountRows('crBreakdownBody', rows.map(r=>`<tr>
      <td><b>${esc(r.date || r.label)}</b></td>
      <td>${whole(r.newMembers)}</td>
      <td>${whole(r.depositMembers)}</td>
      <td>${whole(r.depositCount)}</td>
      <td>${money(r.depositAmount)}</td>
      <td>${whole(r.withdrawMembers)}</td>
      <td>${whole(r.withdrawCount)}</td>
      <td>${money(r.withdrawAmount)}</td>
      <td>${whole(r.activeBetMembers)}</td>
      <td>${money(r.validBetAmount)}</td>
      <td class="${num(r.memberWinLoss)<0?'text-danger':'text-success'}">${money(r.memberWinLoss)}</td>
      <td class="${num(r.companyWinLoss)<0?'text-danger':'text-success'}"><b>${money(r.companyWinLoss)}</b></td>
    </tr>`), 'No data.');
  }
  /* The eye leaves the list for one provider's transactions (casino-provider-transactions.html reads
     `providerCode` plus a range from the URL). It carries the range the report is showing, not the
     row's single day: the owner asked for "一个 provider 的所有流水交易", so every transaction that
     provider had in the period on screen, alongside that page's totals for the same period. `back`
     returns to this exact view, filters and all - the drill page builds its Back control from it. */
  function providerDrillUrl(code){
    const u = new URL('casino-provider-transactions.html', location.href);
    u.searchParams.set('providerCode', String(code || '').trim().toUpperCase());
    const from = (document.getElementById('casinoFrom') || {}).value || '';
    const to = (document.getElementById('casinoTo') || {}).value || '';
    if(from) u.searchParams.set('from', from);
    if(to) u.searchParams.set('to', to);
    u.searchParams.set('back', location.pathname + location.search);
    return u.toString();
  }
  function renderProvider(rows){
    rows = (rows || []).filter(function(r){ return hasAnyData(r, ['activeMembers','betCount','betAmount','validBetAmount','payout','memberWinLoss','companyWinLoss']); });
    if(LINK_PROVIDER) rows = rows.filter(function(r){ return String(r.providerCode || '').toUpperCase() === LINK_PROVIDER; });
    mountRows('crProviderBody', rows.map(r=>`<tr><td><b>${esc(r.date || '-')}</b></td><td><b>${esc(r.providerCode)}</b></td><td>${whole(r.activeMembers)}</td><td>${whole(r.betCount)}</td><td>${money(r.betAmount)}</td><td>${money(r.validBetAmount)}</td><td>${money(r.payout)}</td><td class="${num(r.memberWinLoss)<0?'text-danger':'text-success'}">${money(r.memberWinLoss)}</td><td class="${num(r.companyWinLoss)<0?'text-danger':'text-success'}"><b>${money(r.companyWinLoss)}</b></td><td><a class="icon-action view icon-action-btn" href="${esc(providerDrillUrl(r.providerCode))}" title="View transactions" aria-label="View ${esc(r.providerCode)} transactions"><i class="bi bi-eye" aria-hidden="true"></i></a></td></tr>`), 'No provider bet records.');
  }
  /* The deposit/withdraw row set, in one place: the table below and the KPI strip above it have to
     agree on which rows count, so they share this list rather than each spelling it out. */
  const DW_ROW_FIELDS = ['depositApprovedMembers','depositApprovedCount','depositApprovedAmount','depositPendingAmount','depositFailedCount','depositFailedAmount','withdrawApprovedMembers','withdrawApprovedCount','withdrawApprovedAmount','withdrawPendingAmount','withdrawFailedCount','withdrawFailedAmount','netCashflow'];
  function renderStatus(rows){
    const depositBody=document.getElementById('crDepositStatusBody');
    const withdrawBody=document.getElementById('crWithdrawStatusBody');
    const legacyBody=document.getElementById('crStatusBody');
    rows = rows || [];

    if(depositBody){
      const depositRows = rows.filter(function(r){ return hasAnyData(r, ['depositApprovedMembers','depositApprovedCount','depositApprovedAmount','depositPendingCount','depositPendingAmount','depositFailedCount','depositFailedAmount']); });
      mountRows('crDepositStatusBody', depositRows.map(r=>`<tr>
        <td><b>${esc(r.date)}</b></td>
        <td>${whole(r.depositApprovedMembers)}</td>
        <td>${whole(r.depositApprovedCount)}</td>
        <td>${money(r.depositApprovedAmount)}</td>
        <td>${whole(r.depositPendingCount)}</td>
        <td>${money(r.depositPendingAmount)}</td>
        <td>${whole(r.depositFailedCount)}</td>
        <td>${money(r.depositFailedAmount)}</td>
      </tr>`), 'No deposit request data.');
    }

    if(withdrawBody){
      const withdrawRows = rows.filter(function(r){ return hasAnyData(r, ['withdrawApprovedMembers','withdrawApprovedCount','withdrawApprovedAmount','withdrawPendingCount','withdrawPendingAmount','withdrawFailedCount','withdrawFailedAmount']); });
      mountRows('crWithdrawStatusBody', withdrawRows.map(r=>`<tr>
        <td><b>${esc(r.date)}</b></td>
        <td>${whole(r.withdrawApprovedMembers)}</td>
        <td>${whole(r.withdrawApprovedCount)}</td>
        <td>${money(r.withdrawApprovedAmount)}</td>
        <td>${whole(r.withdrawPendingCount)}</td>
        <td>${money(r.withdrawPendingAmount)}</td>
        <td>${whole(r.withdrawFailedCount)}</td>
        <td>${money(r.withdrawFailedAmount)}</td>
      </tr>`), 'No withdraw request data.');
    }

    if(legacyBody){
      const combinedRows = rows.filter(function(r){ return hasAnyData(r, DW_ROW_FIELDS); });
      mountRows('crStatusBody', combinedRows.map(r=>`<tr>
        <td><b>${esc(r.date)}</b></td>
        <td>${whole(r.depositApprovedMembers)}</td>
        <td>${whole(r.depositApprovedCount)}</td>
        <td>${money(r.depositApprovedAmount)}</td>
        <td>${money(r.depositPendingAmount)}</td>
        <td>${whole(r.depositFailedCount)}</td>
        <td>${money(r.depositFailedAmount)}</td>
        <td>${whole(r.withdrawApprovedMembers)}</td>
        <td>${whole(r.withdrawApprovedCount)}</td>
        <td>${money(r.withdrawApprovedAmount)}</td>
        <td>${money(r.withdrawPendingAmount)}</td>
        <td>${whole(r.withdrawFailedCount)}</td>
        <td>${money(r.withdrawFailedAmount)}</td>
        <td class="${num(r.netCashflow)<0?'text-danger':'text-success'}"><b>${money(r.netCashflow)}</b></td>
      </tr>`), 'No deposit / withdraw request data.');
    }
  }
  /* The Deposit / Withdraw page's own KPI strip (`dwDepositApproved` exists only on that page):
     the four tiles the Overview report leads with, so the two pages read the same at a glance.
     Every tile is summed from the SAME daily rows the table renders, filtered by the same rule, so
     the strip cannot disagree with the table underneath it - a strip fed from a different aggregate
     is the classic "the numbers do not add up" report. `setMetric` is a no-op for an id that is not
     on the page, so the other four casino reports run through this harmlessly. */
  function sumField(rows, key){ return rows.reduce(function(s, r){ return s + num(r && r[key]); }, 0); }
  function renderDepositWithdrawStats(rows){
    if(!document.getElementById('dwDepositApproved')) return;
    const list = (rows || []).filter(function(r){ return hasAnyData(r, DW_ROW_FIELDS); });
    setMetric('dwDepositApproved', sumField(list, 'depositApprovedAmount'), true);
    setMetric('dwWithdrawApproved', sumField(list, 'withdrawApprovedAmount'), true);
    setMetric('dwDepositPending', sumField(list, 'depositPendingAmount'), true);
    setMetric('dwWithdrawPending', sumField(list, 'withdrawPendingAmount'), true);
  }
  function renderBonus(rows){
    rows = (rows || []).filter(function(r){ return hasAnyData(r, ['memberCount','claimCount','bonusAmount']); });
    mountRows('crBonusBody', rows.map(r=>`<tr><td><b>${esc(r.date || '-')}</b></td><td><b>${esc(r.referenceNo || r.promotionName || '-')}</b></td><td>${whole(r.memberCount)}</td><td>${whole(r.claimCount)}</td><td>${money(r.bonusAmount)}</td></tr>`), 'No bonus ledger data.');
  }
  function render(data){
    renderCommon(data);
    const dw = data.depositWithdraw || {};
    renderOverview(data, {skipTiles:true});
    renderBreakdown(data.breakdown || []);
    renderProvider(data.providerDaily || data.provider || []);
    renderStatus(data.depositWithdrawDaily || []);
    /* Tiles: loadAllTimeTiles (all time). The dated rows still fill every table above. */
    renderBonus(Array.isArray(data.bonusDaily) ? data.bonusDaily : (Array.isArray(data.bonus) ? data.bonus : []));
  }
  let reportLoadSeq = 0;
  async function load(){
    const loadSeq = ++reportLoadSeq;
    Object.keys(COLS).forEach(id=>{ const el=document.getElementById(id); if(el) el.innerHTML='<tr><td colspan="'+COLS[id]+'">Loading...</td></tr>'; });
    try{ const json = await api(url() + '?' + params()); if(loadSeq !== reportLoadSeq) return; render(json.data || {}); }
    catch(e){
      if(loadSeq !== reportLoadSeq) return;
      const target = document.querySelector('tbody[id^="cr"]');
      const cols = target ? (COLS[target.id] || 1) : 1;
      if(target) target.innerHTML='<tr><td colspan="'+cols+'" class="text-danger">'+esc(e.message)+'</td></tr>';
      const state = activeTableId ? TABLES.get(activeTableId) : null;
      if(state){ state.rows=[]; state.page=1; renderPager(state, 1); }
      const info = document.getElementById('crFooterInfo');
      if(info) info.textContent='Showing 0 to 0 of 0 entries';
    }
  }

  function initDepositWithdrawTabs(){
    document.querySelectorAll('[data-dw-tab]').forEach(function(btn){
      btn.addEventListener('click', function(){
        const tab = btn.getAttribute('data-dw-tab');
        document.querySelectorAll('[data-dw-tab]').forEach(function(b){ b.classList.toggle('active', b === btn); });
        const dep = document.getElementById('dwDepositPanel');
        const wd = document.getElementById('dwWithdrawPanel');
        if(dep) dep.classList.toggle('active', tab === 'deposit');
        if(wd) wd.classList.toggle('active', tab === 'withdraw');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    /* A swap replays this listener, so the two document handlers further down were added
       again on every entry while the old ones stayed bound to the previous run's state - a
       stale pager handler could render an old table's page into the new first table. Release
       the previous run's bindings first, then bind this one. */
    if(window.__boCasinoReportUnbind) window.__boCasinoReportUnbind();
    const unbinds=[];
    const on=(target,type,fn,opt)=>{ target.addEventListener(type,fn,opt); unbinds.push(()=>target.removeEventListener(type,fn,opt)); };
    window.__boCasinoReportUnbind=()=>{ unbinds.forEach(fn=>fn()); unbinds.length=0; };

    /* The range a link carried: fill the hidden inputs, then let `bo-date-range.js` re-label its
       pill (it listens on their `change`). Deliberately BEFORE `autoLoadSelectedRange` is bound
       below, so presetting the range is not a second load. */
    if(LINK_FROM && LINK_TO){
      const f=document.getElementById('casinoFrom'), t=document.getElementById('casinoTo');
      if(f && t){
        f.value=LINK_FROM; t.value=LINK_TO;
        f.dispatchEvent(new Event('change',{bubbles:true}));
        t.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }
    // No Search / Reset buttons on this family (owner: "report的所有reset，search，refresh按键
    // 全去除"). The date range auto-applies as soon as a complete range is chosen — see
    // autoLoadSelectedRange below — so the row needs no trigger at all.

    /* `Back to list`, and only when the link came from somewhere: `back=<path+query>` is what the
       Win/Lose merchant page's provider rows send (and what this report's own row action sends), and
       it decides the target - one step back, with that page's own state. Opened from the module's tab
       instead there is nothing to go back to, and the owner called the control out there:
       "不对 为什么这个tab页面会有back to list?".
       This reverses e290feef, which made it unconditional the other way round: an owner report of
       "没有back to list 按键" on a drill-down URL from an older build (one without `back`), answered by
       falling back to a page the account's menus hold. Every drill-down link sends `back` now, so that
       fallback only ever fired on tab entries - the case the owner has since called wrong. Relative
       page targets only. */
    const backParam=LINK_PARAMS.get('back')||'';
    const backTarget=/^\/?[a-z0-9._-]+\.html(\?|#|$)/i.test(backParam)?backParam:'';
    if(backTarget && !document.querySelector('.bo-report-back')){
      const row=document.querySelector('.report-main .bo-filter-row');
      if(row){
        const a=document.createElement('a');
        a.className='bo-report-back';
        a.href=backTarget;
        a.innerHTML='<i class="bi bi-arrow-left" aria-hidden="true"></i> Back to list';
        row.appendChild(a);
      }
    }

    // Match Referral Network behaviour: once a complete date range is selected,
    // refresh the report immediately without requiring the Search button.
    let dateRangeLoadTimer = null;
    function autoLoadSelectedRange(){
      const from = document.getElementById('casinoFrom')?.value || '';
      const to = document.getElementById('casinoTo')?.value || '';
      if(!from || !to) return; // wait until both start and end dates are chosen
      clearTimeout(dateRangeLoadTimer);
      dateRangeLoadTimer = setTimeout(load, 120);
    }
    document.getElementById('casinoFrom')?.addEventListener('change', autoLoadSelectedRange);
    document.getElementById('casinoTo')?.addEventListener('change', autoLoadSelectedRange);

    // Pager + Show N entries live in the page footer. One table is mounted per page,
    // so the pager only has to resolve the body that actually rendered.
    on(document,'click', function(e){
      const btn = e.target.closest('[data-cr-page]');
      if(!btn || btn.disabled || !activeTableId) return;
      const state = TABLES.get(activeTableId);
      if(!state) return;
      const next = Number(btn.getAttribute('data-cr-page'));
      if(!Number.isFinite(next) || next === state.page) return;
      state.page = next;
      renderTablePage(state);
    });
    on(document,'change', function(e){
      if(!e.target || e.target.id !== 'crPageSize') return;
      pageSizeLock = null;
      autoSteps = 0;
      const state = activeTableId ? TABLES.get(activeTableId) : null;
      if(!state) return;
      state.page = 1;
      renderTablePage(state);
    });

    /* Strips only: the same endpoints without from/to (owner's rule; see paintOverviewTiles' callers).
       The ranged response keeps rendering every table. */
    async function loadAllTimeTiles(){
      try{
        const json = await api(url() + '?' + params({allTime:true}));
        const d = json.data || {};
        renderOverview(d);
        renderDepositWithdrawStats(d.depositWithdrawDaily || []);
      }catch(e){/* leave the strips rather than show a partial total */}
    }

    load();
    loadAllTimeTiles();
  });
})();
