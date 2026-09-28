(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));
  const money = (v) => Number(v || 0).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const fmtSlash = (iso) => {
    const s = String(iso || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '—';
    const [y, m, d] = s.split('-');
    return `${y}/${m}/${d}`;
  };
  // Family wording: "01 Sep 2026 - 15 Sep 2026" (was dd/mm/yyyy).
  const niceDate = (v) => {
    if (!v) return '';
    const a = String(v).split('-');
    return a.length === 3 ? `${a[2]} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(a[1]) - 1]} ${a[0]}` : v;
  };
  const addDay = (v) => {
    const a = String(v || '').split('-').map(Number);
    return new Date(Date.UTC(a[0], a[1] - 1, a[2] + 1)).toISOString().slice(0, 10);
  };
  const daysBetween = (from, to) => {
    const a = new Date(from + 'T00:00:00Z');
    const b = new Date(to + 'T00:00:00Z');
    return Math.max(0, Math.round((b - a) / 86400000));
  };
  const shiftRange = (from, to) => {
    const span = daysBetween(from, to);
    const end = new Date(from + 'T00:00:00Z');
    end.setUTCDate(end.getUTCDate() - 1);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - span);
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const reportCurrency = () => String(window.BO_MAIN_CURRENCY?.code?.() || sessionStorage.getItem('bo_main_report_currency') || 'MYR').toUpperCase();

  const state = {
    pricing: [],
    merchants: [],
    rows: [],
    total: 0,
    pricingTotal: 0,
    manualTotal: 0,
    prevTotal: null,
    kind: 'all',
    q: '',
    page: 1,
    pageSize: 10,
    mode: 'oneoff',
    editingPricingId: null
  };

  const pickerState = {
    view: new Date(),
    mode: 'days',
    yearPageStart: new Date().getFullYear() - 5,
    selectingStart: true,
    hover: ''
  };

  async function api(path, opt = {}) {
    const headers = {
      ...BO_AUTH.authHeader(),
      ...(opt.body ? { 'Content-Type': 'application/json' } : {})
    };
    const r = await fetch(API_CONFIG.BASE_URL + path, { ...opt, headers, cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.status === 'error') throw Error(j.message || 'Request failed');
    return j.data ?? j;
  }

  function isMonthly(row) {
    return row.kind === 'MONTHLY_PRICING';
  }

  function filteredRows() {
    const q = state.q.trim().toLowerCase();
    return state.rows.filter((x) => {
      const monthly = isMonthly(x);
      if (state.kind === 'monthly' && !monthly) return false;
      if (state.kind === 'oneoff' && monthly) return false;
      if (!q) return true;
      const hay = [
        x.incomeDate, x.source, x.description, x.createdBy,
        x.merchantName, x.merchantCode
      ].map((v) => String(v || '').toLowerCase()).join(' ');
      return hay.includes(q);
    });
  }

  function pageButtons(current, total) {
    total = Math.max(1, Number(total) || 1);
    current = Math.max(1, Math.min(Number(current) || 1, total));
    const pages = [];
    const add = (n) => { if (n >= 1 && n <= total && !pages.includes(n)) pages.push(n); };
    add(1);
    for (let n = current - 2; n <= current + 2; n++) add(n);
    add(total);
    pages.sort((a, b) => a - b);
    let html = '';
    html += `<button type="button" class="smart-page nav-text" data-page="${Math.max(1, current - 1)}" ${current <= 1 ? 'disabled' : ''}>Previous</button>`;
    let prev = 0;
    pages.forEach((n) => {
      if (prev && n - prev > 1) html += '<span class="smart-page-ellipsis">…</span>';
      html += `<button type="button" class="smart-page ${n === current ? 'active' : ''}" data-page="${n}" ${n === current ? 'aria-current="page"' : ''}>${n}</button>`;
      prev = n;
    });
    html += `<button type="button" class="smart-page nav-text" data-page="${Math.min(total, current + 1)}" ${current >= total ? 'disabled' : ''}>Next</button>`;
    return html;
  }

  function updateTrend() {
    const el = $('mprTrend');
    if (state.prevTotal == null || !Number.isFinite(state.prevTotal)) {
      el.className = 'mpr-kpi-trend is-flat';
      el.innerHTML = '<i class="bi bi-dash" aria-hidden="true"></i> —';
      return;
    }
    const prev = Number(state.prevTotal) || 0;
    const curr = Number(state.total) || 0;
    if (prev === 0) {
      el.className = 'mpr-kpi-trend' + (curr > 0 ? '' : ' is-flat');
      el.innerHTML = curr > 0
        ? '<i class="bi bi-arrow-up-right" aria-hidden="true"></i> New'
        : '<i class="bi bi-dash" aria-hidden="true"></i> —';
      return;
    }
    const pct = ((curr - prev) / Math.abs(prev)) * 100;
    const up = pct >= 0;
    el.className = 'mpr-kpi-trend' + (up ? '' : ' is-down');
    el.innerHTML = `<i class="bi bi-arrow-${up ? 'up' : 'down'}-right" aria-hidden="true"></i> ${up ? '+' : ''}${pct.toFixed(1)}% vs prev`;
  }

  function updateKpis() {
    const rows = state.rows;
    const monthlyRows = rows.filter(isMonthly);
    const oneOffRows = rows.filter((x) => !isMonthly(x));
    const merchants = new Set(
      monthlyRows.map((x) => String(x.merchantId || x.merchantCode || x.merchantName || '')).filter(Boolean)
    );
    const pricingMerchants = new Set(state.pricing.map((x) => String(x.merchantId || '')).filter(Boolean));

    $('mprTotal').textContent = money(state.total);
    $('mprPricingTotal').textContent = money(state.pricingTotal);
    $('mprManualTotal').textContent = money(state.manualTotal);
    $('mprOneOffCount').textContent = `${oneOffRows.length} Entr${oneOffRows.length === 1 ? 'y' : 'ies'}`;
    const mCount = pricingMerchants.size || merchants.size;
    $('mprMerchantCount').textContent = `${mCount} Merchant${mCount === 1 ? '' : 's'}`;
    $('mprSegAll').textContent = String(rows.length);
    $('mprSegMonthly').textContent = String(monthlyRows.length);
    $('mprSegOneOff').textContent = String(oneOffRows.length);
    updateTrend();
  }

  function render() {
    const all = filteredRows();
    const pages = Math.max(1, Math.ceil(all.length / state.pageSize));
    state.page = Math.min(Math.max(1, state.page), pages);
    const start = (state.page - 1) * state.pageSize;
    const slice = all.slice(start, start + state.pageSize);
    const end = start + slice.length;

    if (!slice.length) {
      $('mprRows').innerHTML = `<tr><td colspan="9" class="mad-empty">${state.rows.length ? 'No records match the current filters.' : 'No Merchant profit records for selected period.'}</td></tr>`;
    } else {
      $('mprRows').innerHTML = slice.map((x) => {
        const monthly = isMonthly(x);
        const merchant = x.merchantName || x.merchantCode
          ? `<div class="mpr-merchant">${esc(x.merchantName || 'Merchant')}<small>${esc(x.merchantCode || '—')}</small></div>`
          : '—';
        const actions = monthly
          ? `<button class="mad-icon-btn" type="button" data-edit-schedule="${esc(x.scheduleId)}" data-tip="Edit" aria-label="Edit"><i class="bi bi-pencil" aria-hidden="true"></i></button>
             <button class="mad-icon-btn is-danger" type="button" data-delete-price="${esc(x.scheduleId)}" data-tip="Delete" aria-label="Delete"><i class="bi bi-trash" aria-hidden="true"></i></button>`
          : `<span class="mad-icon-btn is-placeholder" aria-hidden="true"></span>
             <button class="mad-icon-btn is-danger" type="button" data-delete-id="${esc(x.id)}" data-tip="Delete" aria-label="Delete"><i class="bi bi-trash" aria-hidden="true"></i></button>`;
        const createdRaw = String(x.createdAt || '').replace('T', ' ').slice(0, 19);
        const createdDate = createdRaw.slice(0, 10) || '—';
        const createdTime = createdRaw.length >= 19 ? createdRaw.slice(11, 19) : '';
        const createdCell = createdTime
          ? `<span class="mpr-created-at" tabindex="0" data-tip="${esc(createdTime)}">${esc(createdDate)}</span>`
          : esc(createdDate);
        return `<tr>
          <td>${esc(x.incomeDate)}</td>
          <td>${merchant}</td>
          <td><span class="mpr-kind ${monthly ? 'is-monthly' : 'is-oneoff'}">${monthly ? 'Monthly Pricing' : 'One-off'}</span></td>
          <td>${esc(x.source || '—')}</td>
          <td class="num mpr-amount ${String(x.direction||'COLLECT').toUpperCase()==='PAY'?'text-danger':''}">${esc(x.currency || reportCurrency())} ${money(x.signedAmount != null ? x.signedAmount : x.amount)}</td>
          <td>${esc(x.description || '—')}</td>
          <td>${esc(x.createdBy || '—')}</td>
          <td>${createdCell}</td>
          <td class="mpr-actions-cell"><div class="mad-actions mpr-actions">${actions}</div></td>
        </tr>`;
      }).join('');
    }

    $('mprShowing').textContent = all.length
      ? `Showing ${start + 1} to ${end} of ${all.length} records`
      : 'Showing 0 to 0 of 0 records';
    $('mprPager').innerHTML = pageButtons(state.page, pages);
  }

  async function loadPricing() {
    try {
      const d = await api('/admin/main/merchant-profit/pricing');
      const c = reportCurrency();
      state.pricing = (d.rows || []).filter((x) => String(x.currency || c).toUpperCase() === c);
      state.merchants = d.merchants || [];
    } catch (e) {
      state.pricing = [];
      state.merchants = [];
    }
  }

  async function load() {
    const from = $('mprFrom').value;
    const to = $('mprTo').value;
    if (!from || !to) return;
    try {
      const cur = reportCurrency();
      const data = await api(`/admin/main/merchant-profit?from=${encodeURIComponent(from)}&to=${encodeURIComponent(addDay(to))}&currency=${encodeURIComponent(cur)}`);
      state.rows = data.rows || [];
      state.total = Number(data.total || 0);
      state.pricingTotal = Number(data.pricingTotal || 0);
      state.manualTotal = Number(data.manualTotal || 0);
      state.page = 1;
      updateKpis();
      render();
    } catch (e) {
      state.rows = [];
      state.total = state.pricingTotal = state.manualTotal = 0;
      updateKpis();
      $('mprRows').innerHTML = `<tr><td colspan="9" class="mad-empty text-danger">${esc(e.message)}</td></tr>`;
      $('mprShowing').textContent = 'Showing 0 to 0 of 0 records';
      $('mprPager').innerHTML = '';
    }

    try {
      const prev = shiftRange(from, to);
      const cur = reportCurrency();
      const prevData = await api(`/admin/main/merchant-profit?from=${encodeURIComponent(prev.from)}&to=${encodeURIComponent(addDay(prev.to))}&currency=${encodeURIComponent(cur)}`);
      state.prevTotal = Number(prevData.total || 0);
      updateTrend();
    } catch (_) {
      state.prevTotal = null;
      updateTrend();
    }
  }

  function editPricing(id) {
    const x = state.pricing.find((r) => String(r.id) === String(id) || String(r.scheduleId || '') === String(id));
    if (!x) {
      window.BO_DIALOG?.alert
        ? BO_DIALOG.alert('Pricing rule not found. It may have been removed.', { title: 'Unable to Edit', type: 'error' })
        : alert('Pricing rule not found.');
      return;
    }
    location.href = `main-merchant-profit-record.html?mode=monthly&edit=${encodeURIComponent(x.id)}`;
  }

  function exportCsv() {
    const rows = filteredRows();
    const csv = [
      ['Date', 'Merchant', 'Code', 'Type', 'Direction', 'Currency', 'Income Source', 'Amount', 'Description', 'Created By', 'Created At'],
      ...rows.map((x) => [
        x.incomeDate,
        x.merchantName || '',
        x.merchantCode || '',
        isMonthly(x) ? 'Monthly Pricing' : 'One-off',
        String(x.direction || 'COLLECT').toUpperCase(),
        x.currency || reportCurrency(),
        x.source || '',
        Number(x.signedAmount != null ? x.signedAmount : x.amount || 0).toFixed(2),
        x.description || '',
        x.createdBy || '',
        String(x.createdAt || '').replace('T', ' ').slice(0, 19)
      ])
    ].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `merchant-profit-${$('mprFrom').value}_${$('mprTo').value}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function startOfWeek(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - x.getDay());
    return x;
  }
  function endOfWeek(d) {
    const x = startOfWeek(d);
    x.setDate(x.getDate() + 6);
    return x;
  }
  function presetRange(key) {
    const now = new Date();
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let a = new Date(day);
    let b = new Date(day);
    if (key === 'yesterday') { a.setDate(a.getDate() - 1); b = new Date(a); }
    if (key === 'thisWeek') { a = startOfWeek(day); b = endOfWeek(day); }
    if (key === 'lastWeek') { a = startOfWeek(day); a.setDate(a.getDate() - 7); b = new Date(a); b.setDate(b.getDate() + 6); }
    if (key === 'thisMonth') { a = new Date(day.getFullYear(), day.getMonth(), 1); b = new Date(day.getFullYear(), day.getMonth() + 1, 0); }
    if (key === 'lastMonth') { a = new Date(day.getFullYear(), day.getMonth() - 1, 1); b = new Date(day.getFullYear(), day.getMonth(), 0); }
    if (key === 'thisYear') { a = new Date(day.getFullYear(), 0, 1); b = new Date(day.getFullYear(), 11, 31); }
    if (key === 'lastYear') { a = new Date(day.getFullYear() - 1, 0, 1); b = new Date(day.getFullYear() - 1, 11, 31); }
    return [fmt(a), fmt(b)];
  }
  function markPreset(name) {
    document.querySelectorAll('[data-mpr-range-preset]').forEach((b) => b.classList.remove('active'));
    if (name) {
      const el = document.querySelector(`[data-mpr-range-preset="${name}"]`);
      if (el) el.classList.add('active');
    }
  }
  function updateDateLabel() {
    const label = $('mprDateLabel');
    const fromEl = $('mprFrom');
    const toEl = $('mprTo');
    if (!label || !fromEl || !toEl) return;
    const f = fromEl.value || '';
    const t = toEl.value || '';
    label.textContent = f && t
      ? `${niceDate(f)} - ${niceDate(t)}`
      : f ? `${niceDate(f)} - Select end date`
      : 'Select date range';
  }
  function renderCalendar() {
    const monthBtn = $('mprCalMonth');
    const yearBtn = $('mprCalYear');
    const monthGrid = $('mprCalMonthGrid');
    const yearGrid = $('mprCalYearGrid');
    const dayView = $('mprCalDayView');
    const days = $('mprCalDays');
    const fromEl = $('mprFrom');
    const toEl = $('mprTo');
    if (!monthBtn || !yearBtn || !monthGrid || !yearGrid || !dayView || !days) return;

    monthBtn.innerHTML = `${MONTHS[pickerState.view.getMonth()]} <i class="bi bi-chevron-down"></i>`;
    yearBtn.innerHTML = `${pickerState.view.getFullYear()} <i class="bi bi-chevron-down"></i>`;
    monthGrid.innerHTML = MONTHS.map((m, i) =>
      `<button type="button" data-mpr-month="${i}" class="${i === pickerState.view.getMonth() ? 'active' : ''}">${m}</button>`
    ).join('');
    yearGrid.innerHTML = Array.from({ length: 12 }, (_, i) => pickerState.yearPageStart + i).map((y) =>
      `<button type="button" data-mpr-year="${y}" class="${y === pickerState.view.getFullYear() ? 'active' : ''}">${y}</button>`
    ).join('');
    monthGrid.classList.toggle('show', pickerState.mode === 'months');
    yearGrid.classList.toggle('show', pickerState.mode === 'years');
    dayView.classList.toggle('hide', pickerState.mode !== 'days');

    const start = fromEl.value || '';
    const end = toEl.value || '';
    // While only the start is picked, the hovered day previews the far end so the range reads
    // as one continuous strip before anything is committed. Hovering before the start is
    // deliberately ignored: a click there restarts the range, so the preview must not promise
    // something the click will not do.
    const hover = (!end && start && pickerState.hover && pickerState.hover >= start) ? pickerState.hover : '';
    const bandEnd = end || hover || '', hasBand = !!(start && bandEnd);
    const first = new Date(pickerState.view.getFullYear(), pickerState.view.getMonth(), 1);
    const offset = first.getDay();
    let html = '';
    for (let i = 0; i < 42; i++) {
      const d = new Date(pickerState.view.getFullYear(), pickerState.view.getMonth(), i - offset + 1);
      const v = fmt(d);
      const muted = d.getMonth() !== pickerState.view.getMonth() ? ' muted' : '';
      const inBand = !!(hasBand && v >= start && v <= bandEnd);
      // The anchor is marked as soon as it is picked, band or no band — otherwise the first
      // click looks like it did nothing.
      const isStart = !!(start && v === start), isEnd = !!(bandEnd && v === bandEnd);
      const isPreview = !!(hover && v === hover);
      html += `<button type="button" data-mpr-day="${v}" class="${muted}${inBand ? ' in-range' : ''}${isStart || isEnd ? ' selected' : ''}${isStart ? ' is-start' : ''}${isEnd ? ' is-end' : ''}${isPreview ? ' is-preview' : ''}">${d.getDate()}</button>`;
    }
    days.innerHTML = html;
  }
  function setRange(from, to, preset, reload) {
    $('mprFrom').value = from || '';
    $('mprTo').value = to || '';
    markPreset(preset || '');
    updateDateLabel();
    renderCalendar();
    if (reload !== false) load();
  }
  function initDatePicker() {
    const trigger = $('mprDateTrigger');
    const picker = $('mprRangePicker');
    const fromEl = $('mprFrom');
    const toEl = $('mprTo');
    if (!trigger || !picker || !fromEl || !toEl) return;

    const [a, b] = presetRange('today');
    pickerState.view = new Date(a + 'T00:00:00');
    setRange(a, b, 'today', false);

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      picker.classList.toggle('show');
      pickerState.mode = 'days';
      pickerState.hover = '';
      renderCalendar();
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.mpr-date-field')) picker.classList.remove('show');
    });
    document.querySelectorAll('[data-mpr-range-preset]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.getAttribute('data-mpr-range-preset');
        const [x, y] = presetRange(key);
        pickerState.view = new Date(x + 'T00:00:00');
        pickerState.selectingStart = true;
        setRange(x, y, key, true);
        picker.classList.remove('show');
      });
    });
    $('mprCalPrev') && ($('mprCalPrev').onclick = (e) => {
      e.stopPropagation();
      if (pickerState.mode === 'years') pickerState.yearPageStart -= 12;
      else pickerState.view.setMonth(pickerState.view.getMonth() - 1);
      renderCalendar();
    });
    $('mprCalNext') && ($('mprCalNext').onclick = (e) => {
      e.stopPropagation();
      if (pickerState.mode === 'years') pickerState.yearPageStart += 12;
      else pickerState.view.setMonth(pickerState.view.getMonth() + 1);
      renderCalendar();
    });
    $('mprCalMonth') && ($('mprCalMonth').onclick = (e) => {
      e.stopPropagation();
      pickerState.mode = pickerState.mode === 'months' ? 'days' : 'months';
      renderCalendar();
    });
    $('mprCalYear') && ($('mprCalYear').onclick = (e) => {
      e.stopPropagation();
      pickerState.yearPageStart = pickerState.view.getFullYear() - 5;
      pickerState.mode = pickerState.mode === 'years' ? 'days' : 'years';
      renderCalendar();
    });
    $('mprCalMonthGrid') && ($('mprCalMonthGrid').onclick = (e) => {
      e.stopPropagation();
      const b = e.target.closest('[data-mpr-month]');
      if (!b) return;
      pickerState.view.setMonth(Number(b.getAttribute('data-mpr-month')));
      pickerState.mode = 'days';
      renderCalendar();
    });
    $('mprCalYearGrid') && ($('mprCalYearGrid').onclick = (e) => {
      e.stopPropagation();
      const b = e.target.closest('[data-mpr-year]');
      if (!b) return;
      pickerState.view.setFullYear(Number(b.getAttribute('data-mpr-year')));
      pickerState.mode = 'months';
      renderCalendar();
    });
    $('mprCalDays') && ($('mprCalDays').onclick = (e) => {
      e.stopPropagation();
      const b = e.target.closest('[data-mpr-day]');
      if (!b) return;
      const val = b.getAttribute('data-mpr-day');
      if (!fromEl.value || (fromEl.value && toEl.value) || val < fromEl.value) {
        fromEl.value = val;
        toEl.value = '';
        pickerState.selectingStart = false;
        pickerState.hover = '';
        markPreset('');
        updateDateLabel();
        renderCalendar();
        return;
      }
      toEl.value = val;
      pickerState.selectingStart = true;
      pickerState.hover = '';
      markPreset('');
      updateDateLabel();
      renderCalendar();
      picker.classList.remove('show');
      load();
    });
    $('mprCalDays').addEventListener('mouseover', (e) => {
      const b = e.target.closest('[data-mpr-day]');
      const v = b ? b.getAttribute('data-mpr-day') : '';
      if (pickerState.hover === v) return;
      pickerState.hover = v;
      if (fromEl.value && !toEl.value) renderCalendar();
    });
    $('mprCalDays').addEventListener('mouseleave', () => {
      if (!pickerState.hover) return;
      pickerState.hover = '';
      if (fromEl.value && !toEl.value) renderCalendar();
    });
  }

  function monthKeys(count = 3) {
    const out = [];
    const d = new Date();
    for (let i = 0; i < count; i++) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      out.push(`${x.getFullYear()}-${pad2(x.getMonth() + 1)}`);
    }
    return out;
  }

  function isMerchantParty(row) {
    return /brand|merchant/i.test(String(row.counterpartyType || row.entityType || 'BRAND'));
  }

  function isCollectDue(row) {
    const dir = String(row.direction || '').toUpperCase();
    const bal = Number(row.balanceAmount || 0);
    const closed = /paid|settled|carried/i.test(String(row.status || ''));
    return dir === 'COLLECT' && bal > 0.004 && !closed;
  }

  function updateRepayBadge(count) {
    const badge = $('mprRepayBadge');
    if (!badge) return;
    if (count > 0) {
      badge.hidden = false;
      badge.textContent = count > 99 ? '99+' : String(count);
    } else {
      badge.hidden = true;
      badge.textContent = '0';
    }
  }

  async function loadRepayBadge() {
    try {
      const months = monthKeys(1);
      const packs = await Promise.all(
        months.map((m) => api('/admin/main/settlements?month=' + encodeURIComponent(m)).catch(() => ({ rows: [] })))
      );
      const seen = new Set();
      let count = 0;
      packs.forEach((d) => {
        const list = Array.isArray(d) ? d : (d?.rows || []);
        list.forEach((x) => {
          if (!isMerchantParty(x) || !isCollectDue(x)) return;
          if (String(x.sourceType || '').toUpperCase() !== 'MERCHANT_RECURRING') return;
          if (String(x.currency || 'MYR').toUpperCase() !== reportCurrency()) return;
          const key = String(x.id ?? `${x.month}|${x.counterpartyKey}|${x.direction}`);
          if (seen.has(key)) return;
          seen.add(key);
          count += 1;
        });
      });
      updateRepayBadge(count);
    } catch (_) {
      updateRepayBadge(0);
    }
  }

  // Events
  document.querySelectorAll('[data-mpr-kind]').forEach((b) => {
    b.addEventListener('click', () => {
      state.kind = b.dataset.mprKind;
      state.page = 1;
      document.querySelectorAll('[data-mpr-kind]').forEach((x) => {
        const on = x === b;
        x.classList.toggle('is-active', on);
        x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      render();
    });
  });
  $('mprSearch')?.addEventListener('input', () => {
    state.q = $('mprSearch').value || '';
    state.page = 1;
    render();
  });
  $('mprExportBtn')?.addEventListener('click', exportCsv);
  $('mprPager')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-page]');
    if (!b || b.disabled) return;
    state.page = +b.dataset.page;
    render();
  });

  document.addEventListener('click', async (e) => {
    let b = e.target.closest('[data-edit-schedule]');
    if (b) {
      editPricing(b.dataset.editSchedule);
      return;
    }
    b = e.target.closest('[data-delete-price]');
    if (b) {
      const ok = window.BO_DIALOG?.confirm
        ? await BO_DIALOG.confirm('Delete this pricing version? If a later version is removed, the previous Merchant price may become effective again.', {
          title: 'Delete Pricing Version',
          confirmText: 'Delete',
          type: 'danger'
        })
        : false;
      if (!ok) return;
      try {
        await api('/admin/main/merchant-profit/pricing/' + b.dataset.deletePrice, { method: 'DELETE' });
        await loadPricing();
        await load();
      } catch (x) {
        window.BO_DIALOG?.alert
          ? BO_DIALOG.alert(x.message, { title: 'Unable to Delete', type: 'error' })
          : alert(x.message);
      }
      return;
    }
    b = e.target.closest('[data-delete-id]');
    if (!b) return;
    const ok = window.BO_DIALOG?.confirm
      ? await BO_DIALOG.confirm('Delete this one-off Merchant income record? This will immediately update dashboard Net Profit.', {
        title: 'Delete Merchant Income',
        confirmText: 'Delete',
        type: 'danger'
      })
      : false;
    if (!ok) return;
    try {
      await api('/admin/main/merchant-profit/' + b.dataset.deleteId, { method: 'DELETE' });
      await load();
    } catch (x) {
      window.BO_DIALOG?.alert
        ? BO_DIALOG.alert(x.message, { title: 'Unable to Delete', type: 'error' })
        : alert(x.message);
    }
  });

  async function bootstrap() {
    BO_AUTH.requireLogin();
    initDatePicker();
    // Wait until the enabled MAIN currency list is loaded before the first request.
    // Otherwise the Profit Report can silently initialize as MYR and hide native USD/SGD rows.
    try {
      if (window.BO_MAIN_CURRENCY?.ready) await window.BO_MAIN_CURRENCY.ready();
    } catch (_) {}
    await Promise.all([loadPricing(), load(), loadRepayBadge()]);
  }

  bootstrap();
})();
