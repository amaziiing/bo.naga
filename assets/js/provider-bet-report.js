(function(){
  let page = 1;
  let totalPages = 1;
  let totalElements = 0;
  let pageSize = 20;
  let pageSizeLock = null;
  let autofitSettled = false;
  let autofitReloading = false;
  let fitWroteAt = 0;
  let memberMap = {};

  const $ = (id) => document.getElementById(id);

  function noteFitWrite(){ fitWroteAt = Date.now(); }

  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function num(v){
    const n = Number(String(v == null ? 0 : v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  function money(v){
    return num(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function dt(v){
    return window.BO_FORMAT && window.BO_FORMAT.dateTime
      ? window.BO_FORMAT.dateTime(v)
      : (v ? String(v).replace('T', ' ').slice(0, 19) : '-');
  }

  function tableBodyScroll(){
    return document.querySelector('.provider-bet-report-page .table-card > .table-wrap')
      || document.querySelector('.table-card .table-wrap')
      || document.querySelector('.table-wrap');
  }

  function isAutoPageSize(raw){
    const v = String(raw ?? $('betSize')?.value ?? '-').trim();
    return v === '' || v === '-' || /^auto$/i.test(v);
  }

  function clearLockedAutoSize(){
    pageSizeLock = null;
    autofitSettled = false;
  }

  /* Prefer the card's body slot over wrap.clientHeight — if the wrap collapsed to
     content, clientHeight ≈ natural rows and even-fill sees gap≈0 while a cream
     band still shows above the footer. */
  function bodyAvail(scroll){
    if (!scroll) return 0;
    const card = scroll.closest('.table-card');
    const inScrollHead = scroll.querySelector('thead');
    const inScrollHeadH = inScrollHead ? Math.ceil(inScrollHead.getBoundingClientRect().height) : 0;
    const fromScroll = Math.max(0, Math.floor(scroll.clientHeight) - inScrollHeadH);
    if (!card) return fromScroll;
    const head = card.querySelector(':scope > .bo-report-head');
    const footer = card.querySelector(':scope > .mad-footer');
    const cardH = Math.floor(card.getBoundingClientRect().height);
    const headH = head ? Math.ceil(head.getBoundingClientRect().height) : 0;
    const footH = footer ? Math.ceil(footer.getBoundingClientRect().height) : 0;
    const fromCard = Math.max(0, cardH - headH - footH);
    return Math.max(fromScroll, fromCard);
  }

  function measureAutoPageSize(){
    const scroll = tableBodyScroll();
    if (!scroll) return 12;
    const avail = bodyAvail(scroll);
    let sample = null;
    const trs = scroll.querySelectorAll('tbody tr');
    for (let i = 0; i < trs.length; i++) {
      if (trs[i].querySelector('td[colspan]')) continue;
      sample = trs[i].querySelector('td');
      if (sample) break;
    }
    if (!sample) sample = scroll.querySelector('tbody tr td');
    const rowH = sample ? Math.max(40, Math.round(sample.getBoundingClientRect().height)) : 44;
    return Math.max(5, Math.min(200, Math.floor(avail / rowH) || 12));
  }

  function resolvePageSize(){
    const raw = String($('betSize')?.value ?? '-').trim();
    if (/^all$/i.test(raw)) return 10000;
    if (isAutoPageSize(raw)) {
      if (pageSizeLock != null) return pageSizeLock;
      pageSizeLock = measureAutoPageSize();
      return pageSizeLock;
    }
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 20;
  }

  function syncAutofitMode(){
    const auto = isAutoPageSize();
    const card = document.querySelector('.provider-bet-report-page .table-card') || document.querySelector('.table-card');
    const wrap = tableBodyScroll();
    if (card) card.toggleAttribute('data-bo-autofit', auto);
    if (wrap) wrap.toggleAttribute('data-bo-autofit', auto);
    if (!auto) resetEvenFill();
  }

  function isPlaceholderRow(tr){
    const cells = tr.querySelectorAll('td');
    if (cells.length <= 1) return true;
    const text = (tr.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return !text || text === 'loading...' || text.startsWith('no records');
  }

  function lastRowClipped(scroll, rows){
    if (!scroll || !rows || !rows.length) return false;
    const last = rows[rows.length - 1];
    const wrapBox = scroll.getBoundingClientRect();
    const rowBox = last.getBoundingClientRect();
    return rowBox.bottom > wrapBox.bottom + 0.5;
  }

  function autofitOverflows(scroll, rows){
    if (!scroll) return false;
    if (scroll.scrollHeight > scroll.clientHeight + 1) return true;
    if (!rows || !rows.length) return false;
    const avail = bodyAvail(scroll);
    const natural = rows.reduce((sum, tr) => sum + Math.ceil(tr.getBoundingClientRect().height), 0);
    if (natural > avail + 1) return true;
    return lastRowClipped(scroll, rows);
  }

  function setRowHeight(tr, h){
    tr.style.setProperty('height', h + 'px', 'important');
    tr.querySelectorAll('td').forEach(td => {
      td.style.setProperty('height', h + 'px', 'important');
      td.style.setProperty('min-height', h + 'px', 'important');
    });
  }

  function resetEvenFill(){
    const body = $('betBody');
    const table = body?.closest('table');
    const scroll = tableBodyScroll();
    if (scroll) {
      scroll.style.removeProperty('height');
      scroll.style.removeProperty('min-height');
    }
    if (!body || !table) return;
    table.classList.remove('bo-tx-evenfill');
    table.style.removeProperty('height');
    body.querySelectorAll('tr').forEach(tr => {
      tr.style.removeProperty('height');
      tr.querySelectorAll('td').forEach(td => {
        td.style.removeProperty('height');
        td.style.removeProperty('min-height');
      });
    });
  }

  /* Show `-`: after settle, stretch any leftover seam so rows fill the body scroller. */
  function evenFillRowHeights(){
    try {
      evenFillCore();
    } finally {
      noteFitWrite();
    }
  }
  function evenFillCore(){
    const body = $('betBody');
    const scroll = tableBodyScroll();
    const table = body?.closest('table');
    if (!body || !scroll || !table) return;
    resetEvenFill();
    if (!isAutoPageSize()) return;
    const rows = [...body.querySelectorAll('tr')].filter(tr => !isPlaceholderRow(tr));
    if (!rows.length) return;
    void table.offsetHeight;
    const avail = bodyAvail(scroll);
    if (avail < 40) return;
    const natural = rows.reduce((sum, tr) => sum + Math.ceil(tr.getBoundingClientRect().height), 0);
    const rowH = Math.max(40, Math.round(natural / rows.length) || 44);
    const gap = avail - natural;
    if (natural > avail + 1) return;
    /* Only stretch when leftover is smaller than one full row — never force-fill a ≥1-row gap. */
    if (gap < 2 || gap >= rowH) return;
    /* Pin the wrap to the card body slot so a content-sized wrap cannot hide the gap. */
    scroll.style.setProperty('height', avail + 'px', 'important');
    scroll.style.setProperty('min-height', avail + 'px', 'important');
    noteFitWrite();
    void scroll.offsetHeight;
    const base = Math.floor(avail / rows.length);
    let rem = avail - (base * rows.length);
    if (base <= 0) return;
    rows.forEach(tr => {
      const h = base + (rem > 0 ? 1 : 0);
      if (rem > 0) rem -= 1;
      setRowHeight(tr, h);
    });
    table.classList.add('bo-tx-evenfill');
    table.style.setProperty('height', avail + 'px', 'important');
    if (scroll.scrollHeight > scroll.clientHeight + 1) {
      const over = Math.max(1, scroll.scrollHeight - scroll.clientHeight);
      const shrink = Math.ceil(over / rows.length) || 1;
      rows.forEach(tr => {
        const h = Math.max(rowH, (parseFloat(tr.style.height) || base) - shrink);
        setRowHeight(tr, h);
      });
      table.style.setProperty('height', Math.max(0, avail - over) + 'px', 'important');
    }
  }

  function settleAutofitFromPaint(){
    if (autofitReloading || autofitSettled) return;
    if (!isAutoPageSize()) return;
    const scroll = tableBodyScroll();
    const body = $('betBody');
    if (!scroll || !body) return;
    resetEvenFill();
    void scroll.offsetHeight;
    const rows = [...body.querySelectorAll('tr')].filter(tr => !isPlaceholderRow(tr));
    if (!rows.length) return;
    const avail = bodyAvail(scroll);
    const natural = rows.reduce((sum, tr) => sum + Math.ceil(tr.getBoundingClientRect().height), 0);
    const rowH = Math.max(40, Math.round(natural / rows.length) || 44);
    const overflow = autofitOverflows(scroll, rows);
    let target = Math.max(5, Math.min(200, Math.floor(avail / rowH) || rows.length));
    if (overflow) target = Math.max(5, Math.min(target, rows.length - 1));
    const reloadAt = (size) => {
      pageSizeLock = size;
      pageSize = size;
      page = 1;
      autofitReloading = true;
      return Promise.resolve(load()).finally(() => {
        autofitReloading = false;
        verifyAndLock();
      });
    };
    const verifyAndLock = () => {
      requestAnimationFrame(() => {
        const sc = tableBodyScroll();
        const bodyEl = $('betBody');
        const painted = bodyEl
          ? [...bodyEl.querySelectorAll('tr')].filter(tr => !isPlaceholderRow(tr))
          : [];
        if (autofitOverflows(sc, painted) && pageSizeLock > 5) {
          reloadAt(Math.max(5, pageSizeLock - 1));
          return;
        }
        autofitSettled = true;
        evenFillRowHeights();
        /* Late pass after report-table-split column sync settles heights. */
        setTimeout(evenFillRowHeights, 48);
        setTimeout(evenFillRowHeights, 140);
      });
    };
    if (target === rows.length) {
      pageSizeLock = rows.length;
      pageSize = pageSizeLock;
      verifyAndLock();
      return;
    }
    if (target > rows.length && totalElements > rows.length) {
      reloadAt(Math.min(target, totalElements));
      return;
    }
    reloadAt(target);
  }

  function scheduleEvenFill(){
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (isAutoPageSize() && !autofitSettled) {
        settleAutofitFromPaint();
        return;
      }
      evenFillRowHeights();
    }));
  }

  function bindEvenFillObserver(){
    const scroll = tableBodyScroll();
    if (!scroll || scroll._boEvenFillObs || typeof ResizeObserver === 'undefined') return;
    scroll._boEvenFillObs = new ResizeObserver(() => {
      if (!isAutoPageSize()) return;
      if (Date.now() - fitWroteAt < 400) return;
      clearTimeout(scroll._boEvenFillTimer);
      scroll._boEvenFillTimer = setTimeout(() => {
        if (Date.now() - fitWroteAt < 400) return;
        clearLockedAutoSize();
        pageSize = resolvePageSize();
        page = 1;
        load();
      }, 120);
    });
    scroll._boEvenFillObs.observe(scroll);
  }

  function memberName(x){
    const direct = x.username || x.memberUsername || x.memberName || x.mobile || x.memberMobile;
    if (direct) return direct;
    const m = memberMap[String(x.memberId || '')];
    return (m && (m.username || m.mobile || m.name || m.fullName)) || x.memberId || '-';
  }

  async function loadMemberMap(){
    try {
      const res = await fetch(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MEMBER_LIST, {
        headers: { ...BO_AUTH.authHeader() }
      });
      const json = await res.json().catch(() => ({}));
      const rows = Array.isArray(json.data)
        ? json.data
        : (json.data && Array.isArray(json.data.content) ? json.data.content : []);
      memberMap = {};
      rows.forEach(m => {
        const id = m.id || m.memberId || m.userId;
        if (id != null) memberMap[String(id)] = m;
      });
    } catch (e) {
      memberMap = {};
    }
  }

  function endpoint(key){
    return API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS[key];
  }

  async function get(url){
    const res = await fetch(url, { headers: { ...BO_AUTH.authHeader() } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status === 'error') throw new Error(json.message || 'Request failed');
    return json.data || {};
  }

  function readList(data){
    return data.items || data.list || data.content || data.rows || (Array.isArray(data) ? data : []);
  }
  function readTotalPages(data){
    return Number((data.pagination && data.pagination.totalPages) || data.totalPages || data.pages || 1) || 1;
  }
  function readTotalElements(data, rowCount){
    return Number(
      (data.pagination && data.pagination.totalElements)
      || data.totalElements || data.total || data.count || rowCount
    ) || 0;
  }

  function setFromUrl(){
    const sp = new URLSearchParams(location.search);
    const mid = sp.get('memberId') || sp.get('keyword');
    if (mid && $('betKeyword')) $('betKeyword').value = mid;
  }

  /* One search bar → route like Provider Transactions: digits = memberId,
     short token = providerCode, otherwise gameCode. */
  function applyKeyword(p, raw){
    const kw = String(raw || '').trim();
    if (!kw) return;
    if (/^\d+$/.test(kw)) {
      p.set('memberId', kw);
      return;
    }
    if (!/\s/.test(kw) && kw.length <= 24) {
      p.set('providerCode', kw.toUpperCase());
      return;
    }
    p.set('gameCode', kw);
  }

  function query(){
    const p = new URLSearchParams();
    applyKeyword(p, $('betKeyword') && $('betKeyword').value);
    const eventType = $('betEventType')?.value.trim();
    if (eventType) p.set('eventType', eventType);
    const from = $('betFrom')?.value.trim();
    if (from) p.set('from', from);
    const to = $('betTo')?.value.trim();
    if (to) p.set('to', to);
    pageSize = resolvePageSize();
    p.set('page', page);
    p.set('size', String(pageSize));
    return p.toString();
  }

  function toBetRow(x){
    const bet = num(x.betAmount ?? x.transferAmount ?? x.amount ?? 0);
    const back = num(x.winAmount ?? x.transferBackAmount ?? x.payoutAmount ?? 0);
    const net = x.netAmount != null ? num(x.netAmount) : (back - bet);
    return {
      id: x.id,
      memberId: x.memberId,
      memberUsername: x.memberUsername || x.username || x.mobile,
      providerCode: x.providerCode || x.provider,
      gameName: x.gameName || x.gameCode || x.gameId || '-',
      betId: x.providerBetId || x.betId || x.providerTxId || x.txId || x.roundId || (x.id || '-'),
      eventType: x.eventType || x.status || 'SESSION',
      betAmount: bet,
      validBetAmount: x.validBetAmount != null ? x.validBetAmount : bet,
      winAmount: back,
      netAmount: net,
      createdAt: x.createdAt || x.startedAt || x.betTime,
      endedAt: x.endedAt
    };
  }

  function renderPages(){
    const w = $('betPager');
    if (!w) return;
    const total = Math.max(1, Number(totalPages) || 1);
    const current = Math.max(1, Math.min(Number(page) || 1, total));
    const pages = [];
    const add = n => { if (n >= 1 && n <= total && !pages.includes(n)) pages.push(n); };
    add(1);
    for (let n = current - 2; n <= current + 2; n++) add(n);
    add(total);
    pages.sort((a, b) => a - b);
    let html = '';
    html += '<button type="button" class="smart-page first" data-page="1" ' + (current <= 1 ? 'disabled' : '') + ' title="First page" aria-label="First page"><i class="bi bi-chevron-bar-left" aria-hidden="true"></i></button>';
    html += '<button type="button" class="smart-page" data-page="' + (current - 1) + '" ' + (current <= 1 ? 'disabled' : '') + ' aria-label="Previous page">‹</button>';
    let prev = 0;
    pages.forEach(n => {
      if (prev && n - prev > 1) html += '<span class="smart-page-ellipsis" aria-hidden="true">…</span>';
      html += '<button type="button" class="smart-page ' + (n === current ? 'active' : '') + '" data-page="' + n + '" ' + (n === current ? 'aria-current="page"' : '') + '>' + n + '</button>';
      prev = n;
    });
    html += '<button type="button" class="smart-page" data-page="' + (current + 1) + '" ' + (current >= total ? 'disabled' : '') + ' aria-label="Next page">›</button>';
    html += '<button type="button" class="smart-page last" data-page="' + total + '" ' + (current >= total ? 'disabled' : '') + ' title="Last page" aria-label="Last page"><i class="bi bi-chevron-bar-right" aria-hidden="true"></i></button>';
    w.innerHTML = html;
  }

  function renderInfo(rowCount){
    const info = $('betPageInfo');
    if (!info) return;
    const from = totalElements && rowCount ? ((page - 1) * pageSize + 1) : 0;
    const to = totalElements ? Math.min((page - 1) * pageSize + rowCount, totalElements) : 0;
    info.textContent = 'Showing ' + from + ' to ' + to + ' of ' + totalElements + ' entries';
  }

  let betLoadSeq=0;
  async function load(){
    const loadSeq=++betLoadSeq;
    pageSize = resolvePageSize();
    syncAutofitMode();
    try {
      const data = await get(endpoint('PROVIDER_BET_REPORT_LIST') + '?' + query());
      if(loadSeq!==betLoadSeq)return;
      const rows = readList(data).map(toBetRow);
      totalPages = readTotalPages(data);
      totalElements = readTotalElements(data, rows.length);
      $('betBody').innerHTML = rows.length ? rows.map(x => `<tr>
        <td>${esc(x.id)}</td>
        <td><b>${esc(memberName(x))}</b><br><small>ID: ${esc(x.memberId || '-')}</small></td>
        <td>${esc(x.providerCode)}</td>
        <td>${esc(x.gameName || '-')}</td>
        <td>${esc(x.betId || '-')}</td>
        <td>${esc(x.eventType || '-')}</td>
        <td>${money(x.betAmount)}</td>
        <td>${money(x.validBetAmount)}</td>
        <td>${money(x.winAmount)}</td>
        <td><b class="${num(x.netAmount) < 0 ? 'text-danger' : 'text-success'}">${money(x.netAmount)}</b></td>
        <td>${esc(dt(x.createdAt || x.endedAt))}</td>
      </tr>`).join('') : '<tr><td colspan="11">No records</td></tr>';
      renderPages();
      renderInfo(rows.length);
      if (!autofitReloading) scheduleEvenFill();
      else if (!isAutoPageSize()) resetEvenFill();
    } catch (e) {
      if(loadSeq!==betLoadSeq)return;
      totalPages = 1;
      totalElements = 0;
      $('betBody').innerHTML = '<tr><td colspan="11" class="text-danger">' + esc(e.message) + '</td></tr>';
      renderPages();
      renderInfo(0);
      resetEvenFill();
    }
  }

  function runSearch(){
    page = 1;
    clearLockedAutoSize();
    loadMemberMap().finally(load);
  }

  document.addEventListener('DOMContentLoaded', () => {
    BO_AUTH.requireLogin();
    BO_AUTH.renderProfile && BO_AUTH.renderProfile();
    BO_AUTH.renderSidebar && BO_AUTH.renderSidebar();
    setFromUrl();

    let keywordTimer = 0;
    const kick = () => {
      clearTimeout(keywordTimer);
      keywordTimer = setTimeout(runSearch, 350);
    };

    ['betKeyword'].forEach(id => {
      $(id)?.addEventListener('input', kick);
      $(id)?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); clearTimeout(keywordTimer); runSearch(); }
      });
    });
    ['betEventType', 'betFrom', 'betTo'].forEach(id => {
      $(id)?.addEventListener('change', runSearch);
    });
    $('betSize')?.addEventListener('change', () => {
      clearLockedAutoSize();
      page = 1;
      load();
    });
    $('betPager')?.addEventListener('click', e => {
      const b = e.target.closest('[data-page]');
      if (!b || b.disabled) return;
      const n = Number(b.dataset.page);
      if (n >= 1 && n <= totalPages && n !== page) { page = n; load(); }
    });

    let fitT = 0;
    window.addEventListener('resize', () => {
      if (!isAutoPageSize()) return;
      clearTimeout(fitT);
      fitT = setTimeout(() => {
        clearLockedAutoSize();
        page = 1;
        load();
      }, 250);
    });

    bindEvenFillObserver();
    loadMemberMap().finally(load);
  });
})();
