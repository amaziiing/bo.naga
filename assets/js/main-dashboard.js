(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const money = v => Number(v || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nearZero = v => Math.abs(Number(v || 0)) < 0.005;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let currency = (sessionStorage.getItem('bo_main_report_currency') || 'MYR').toUpperCase();

  async function api(path) {
    const r = await fetch(API_CONFIG.BASE_URL + path, { headers: BO_AUTH.authHeader(), cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.status === 'error') throw Error(j.message || 'Request failed');
    return j.data ?? j;
  }

  function pad2(n) { return String(n).padStart(2, '0'); }
  function fmt(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
  function parseYmd(v) {
    const a = String(v || '').split('-').map(Number);
    if (a.length !== 3 || a.some(n => !n && n !== 0)) return null;
    return new Date(a[0], a[1] - 1, a[2]);
  }
  function niceDate(v) {
    const d = parseYmd(v);
    if (!d) return v || '';
    return `${pad2(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  function axisDate(v) {
    const d = parseYmd(v);
    if (!d) return v || '';
    return `${pad2(d.getDate())} ${MONTHS[d.getMonth()]}`;
  }
  function addDay(v) {
    const a = String(v || '').split('-').map(Number);
    return new Date(Date.UTC(a[0], a[1] - 1, a[2] + 1)).toISOString().slice(0, 10);
  }
  function shiftDays(v, n) {
    const d = parseYmd(v);
    if (!d) return v;
    d.setDate(d.getDate() + n);
    return fmt(d);
  }
  function inclusiveDays(from, to) {
    const a = parseYmd(from), b = parseYmd(to);
    if (!a || !b) return 0;
    return Math.round((b - a) / 86400000) + 1;
  }
  function previousPeriod(from, to) {
    const days = inclusiveDays(from, to);
    if (days < 1) return null;
    const prevTo = shiftDays(from, -1);
    const prevFrom = shiftDays(prevTo, -(days - 1));
    return { from: prevFrom, to: prevTo, days };
  }
  function qs(from, to) {
    const f = from || $('mainFrom').value;
    const t = to || $('mainTo').value;
    return `?from=${encodeURIComponent(f)}&to=${encodeURIComponent(addDay(t))}&currency=${encodeURIComponent(currency || 'MYR')}`;
  }
  function currencyLabel() {
    return currency || 'MYR';
  }
  function updateCurrencyLabels() {
    document.querySelectorAll('.currency-unit').forEach(el => {
      el.textContent = currencyLabel();
    });
  }
  function prettyDate(v) {
    const a = String(v || '').split('-');
    return a.length === 3 ? `${a[2]}/${a[1]}` : v;
  }
  function dayOfMonth(v) {
    const a = String(v || '').split('-');
    return a.length === 3 ? String(Number(a[2])) : v;
  }
  function dayMonthShort(v) {
    const a = String(v || '').split('-');
    return a.length === 3 ? `${Number(a[2])}/${Number(a[1])}` : v;
  }
  function monthYearLabel(v) {
    const d = parseYmd(v);
    if (!d) return v || '';
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  function isSameMonthRange(from, to) {
    const a = parseYmd(from), b = parseYmd(to);
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }
  function chartAxisMode(from, to) {
    if (!from || !to) return 'month';
    const days = inclusiveDays(from, to);
    /* ≤1 calendar month (same month or ≤31 days): 1, 2, 3… */
    if (isSameMonthRange(from, to) || days <= 31) return 'day';
    /* >1 month and ≤2 months: odd days as 1/8, 3/8… */
    if (days <= 62) return 'odd-dm';
    /* >2 months: Sep 2026, Oct 2026… */
    return 'month';
  }
  function niceStep(span) {
    if (span <= 0) return 1;
    const raw = span / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }
  function shortNum(v) {
    const a = Math.abs(v);
    if (a >= 1000000) return (v / 1000000).toFixed(a >= 10000000 ? 0 : 1) + 'm';
    if (a >= 1000) return (v / 1000).toFixed(a >= 10000 ? 0 : 1) + 'k';
    return Math.round(v).toLocaleString('en-MY');
  }
  function pctChange(curr, prev) {
    const c = Number(curr || 0), p = Number(prev || 0);
    if (nearZero(c) && nearZero(p)) return { pct: 0, dir: 'flat' };
    if (nearZero(p)) return { pct: c > 0 ? 100 : -100, dir: c >= 0 ? 'up' : 'down' };
    const pct = ((c - p) / Math.abs(p)) * 100;
    if (Math.abs(pct) < 0.05) return { pct: 0, dir: 'flat' };
    return { pct, dir: pct > 0 ? 'up' : 'down' };
  }
  function formatPct(pct) {
    const n = Number(pct || 0);
    const sign = n > 0 ? '+' : '';
    const a = Math.abs(n);
    if (a >= 999.95) return `${n < 0 ? '-' : '+'}999%+`;
    if (a >= 100) return `${sign}${n.toFixed(0)}%`;
    return `${sign}${n.toFixed(0)}%`;
  }

  function dayNet(r) {
    if (!r) return 0;
    if (r.netProfit != null) return Number(r.netProfit || 0);
    // MAIN Net Profit is Merchant Profit only; game profit is intentionally excluded.
    if (r.merchantProfit != null) return Number(r.merchantProfit || 0);
    return 0;
  }

  /* Daily series: each calendar day in range; missing days = 0 (no accumulate) */
  function fillDailySeries(from, to, rows) {
    const map = new Map();
    (rows || []).forEach(r => {
      const key = String(r.date || '').slice(0, 10);
      if (!key) return;
      map.set(key, (map.get(key) || 0) + dayNet(r));
    });
    const start = parseYmd(from);
    const end = parseYmd(to);
    if (!start || !end || end < start) {
      return (rows || []).map(r => ({
        date: String(r.date || '').slice(0, 10),
        netProfit: dayNet(r),
        merchantProfit: Number(r.merchantProfit || 0),
        gameProfit: Number(r.gameProfit || 0)
      }));
    }
    const out = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = fmt(d);
      const net = map.has(key) ? map.get(key) : 0;
      out.push({ date: key, netProfit: net, merchantProfit: net, gameProfit: 0 });
    }
    return out;
  }

  function aggregateByMonth(rows) {
    const bucket = new Map();
    (rows || []).forEach(r => {
      const d = parseYmd(r.date);
      if (!d) return;
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
      const cur = bucket.get(key) || { date: `${key}-01`, merchantProfit: 0, gameProfit: 0, netProfit: 0 };
      const net = dayNet(r);
      cur.netProfit += net;
      cur.merchantProfit += Number(r.merchantProfit || 0);
      cur.gameProfit += Number(r.gameProfit || 0);
      bucket.set(key, cur);
    });
    return Array.from(bucket.values());
  }

  function smoothPath(pts) {
    if (!pts.length) return '';
    if (pts.length === 1) return `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
    if (pts.length === 2) {
      return `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)} L${pts[1].x.toFixed(2)},${pts[1].y.toFixed(2)}`;
    }
    /* Low-tension wave; clamp Y so curves don't overshoot past segment endpoints */
    const tension = 0.18;
    let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const yMin = Math.min(p1.y, p2.y);
      const yMax = Math.max(p1.y, p2.y);
      let cp1x = p1.x + (p2.x - p0.x) * tension;
      let cp1y = p1.y + (p2.y - p0.y) * tension;
      let cp2x = p2.x - (p3.x - p1.x) * tension;
      let cp2y = p2.y - (p3.y - p1.y) * tension;
      cp1y = Math.min(yMax, Math.max(yMin, cp1y));
      cp2y = Math.min(yMax, Math.max(yMin, cp2y));
      d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
    }
    return d;
  }

  function dayAxisLabel(v) {
    const d = parseYmd(v);
    if (!d) return v || '';
    return `${pad2(d.getDate())} ${MONTHS[d.getMonth()]}`;
  }

  function buildXAxis(rows, axisMode, xFn, W) {
    const cells = rows.map((r, i) => {
      const isFirst = i === 0;
      const isLast = i === rows.length - 1;
      const cur = parseYmd(r.date);
      let show = false;
      let label = '';
      let modeCls = '';

      if (axisMode === 'day') {
        show = true;
        label = dayOfMonth(r.date);
        modeCls = 'is-day';
      } else if (axisMode === 'odd-dm') {
        const dayNum = cur ? cur.getDate() : (i + 1);
        show = dayNum % 2 === 1 || isLast;
        label = show ? dayMonthShort(r.date) : '';
        modeCls = 'is-odd';
      } else {
        show = true;
        label = monthYearLabel(r.date);
        modeCls = 'is-month';
      }

      const left = ((xFn(i) / W) * 100).toFixed(3);
      const edge = isFirst ? ' is-start' : (isLast ? ' is-end' : '');
      return `<span class="${modeCls}${edge}${isLast ? ' is-active' : ''}${show ? '' : ' is-gap'}" style="left:${left}%" title="${niceDate(r.date)}">${label}</span>`;
    }).join('');
    return `<div class="np-x-axis np-x-axis--${axisMode}">${cells}</div>`;
  }

  function setNetValue(value) {
    const el = $('netProfit');
    if (!el) return;
    el.textContent = money(value);
    const wrap = el.closest('.np-metric-value');
    if (!wrap) return;
    wrap.classList.toggle('is-neg', Number(value) < 0);
    wrap.classList.toggle('is-zero', nearZero(value));
  }

  function setDelta(curr, prev, days) {
    const el = $('netDelta');
    if (!el) return;
    const { pct, dir } = pctChange(curr, prev);
    const dayLabel = days === 1 ? '1 day' : `${days} days`;
    const arrow = dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→';
    el.classList.remove('is-up', 'is-down', 'is-flat');
    el.classList.add(dir === 'up' ? 'is-up' : dir === 'down' ? 'is-down' : 'is-flat');
    el.textContent = `${arrow} ${formatPct(pct)} vs last ${dayLabel}`;
  }

  function plateauNote(rows) {
    if (!rows || rows.length < 2) return '';
    const vals = rows.map(r => Number(r.netProfit || 0));
    const peak = Math.max(...vals);
    if (!Number.isFinite(peak)) return '';
    let start = vals.length - 1;
    while (start > 0 && Math.abs(vals[start - 1] - peak) < Math.max(0.01, Math.abs(peak) * 0.005)) start--;
    if (start >= vals.length - 1) {
      const d = parseYmd(rows[rows.length - 1].date);
      return d ? `(${pad2(d.getDate())} ${MONTHS[d.getMonth()]})` : '';
    }
    const a = parseYmd(rows[start].date);
    const b = parseYmd(rows[rows.length - 1].date);
    if (!a || !b) return '';
    if (a.getMonth() === b.getMonth()) {
      return `(Day ${a.getDate()}–${b.getDate()} plateau)`;
    }
    return `(${pad2(a.getDate())} ${MONTHS[a.getMonth()]}–${pad2(b.getDate())} ${MONTHS[b.getMonth()]})`;
  }

  function updateFooter(rows, days, summaryNet) {
    const vals = (rows || []).map(r => Number(r.netProfit || 0));
    const peak = vals.length ? Math.max(...vals) : Number(summaryNet || 0);
    const avg = days > 0 ? Number(summaryNet || 0) / days : 0;
    if ($('npAvg')) $('npAvg').textContent = `${money(avg)} ${currencyLabel()}`;
    if ($('npPeak')) $('npPeak').textContent = `${money(peak)} ${currencyLabel()}`;
    if ($('npPeakNote')) $('npPeakNote').textContent = plateauNote(rows);
    const sync = $('npSyncLabel');
    if (sync) {
      const now = new Date();
      const hh = pad2(now.getHours());
      const mm = pad2(now.getMinutes());
      sync.innerHTML = `<span class="np-sync-dot" aria-hidden="true"></span> Automatic sync enabled • Last updated today at ${hh}:${mm} MYT`;
    }
  }

  function placeTip(root, tip, clientX, clientY, preferAbove) {
    tip.hidden = false;
    tip.classList.remove('is-below');
    const wrapRect = root.getBoundingClientRect();
    const pad = 10;
    const localX = clientX - wrapRect.left;
    const localY = clientY - wrapRect.top;
    const tipH = tip.offsetHeight || 72;
    const tipW = tip.offsetWidth || 176;
    const half = tipW / 2;
    tip.style.left = `${Math.min(wrapRect.width - half - 4, Math.max(half + 4, localX))}px`;
    const aboveTop = localY - tipH - 16;
    if (preferAbove !== false && aboveTop >= pad) {
      tip.style.top = `${aboveTop}px`;
      tip.classList.remove('is-below');
    } else {
      tip.style.top = `${Math.min(wrapRect.height - tipH - pad, localY + 20)}px`;
      tip.classList.add('is-below');
    }
  }

  function bindChartHover(root, rows, map) {
    const tip = root.querySelector('.trend-tip');
    const band = root.querySelector('.trend-hover-band');
    const svg = root.querySelector('.trend-svg');
    if (!tip || !band || !svg || !rows.length) return;

    const hit = (clientX, clientY) => {
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const svgX = ((clientX - rect.left) / rect.width) * map.W;
      const svgY = ((clientY - rect.top) / rect.height) * map.H;
      const left = map.L;
      const right = map.W - map.R;
      const top = map.T;
      const bottom = map.H - map.B;
      if (svgX < left || svgX > right) return null;
      if (svgY < top - 8 || svgY > bottom + 12) return null;
      if (rows.length === 1) return 0;
      const ratio = (svgX - left) / (right - left);
      return Math.max(0, Math.min(rows.length - 1, Math.round(ratio * (rows.length - 1))));
    };

    const show = (i, clientX, clientY) => {
      const r = rows[i];
      const n = Number(r.netProfit || 0);
      const tipDate = map.labelMode === 'month' ? monthYearLabel(r.date) : niceDate(r.date);
      tip.classList.toggle('is-neg', n < 0);
      tip.innerHTML =
        `<div class="tip-date">${tipDate}</div>` +
        `<div class="tip-net${n < 0 ? ' is-neg' : ''}">${money(n)} <small>${currencyLabel()}</small></div>`;
      const xi = map.x(i);
      const yi = map.y(n);
      const bandW = Math.max(18, map.W / Math.max(rows.length * 1.15, 12));
      band.setAttribute('x', xi - bandW / 2);
      band.setAttribute('width', bandW);
      band.setAttribute('y', map.T);
      band.setAttribute('height', map.H - map.T - map.B);
      band.setAttribute('fill', document.documentElement.getAttribute('data-bo-theme') === 'dark'
        ? 'url(#npNightBand)'
        : 'url(#npLightBand)');
      band.style.opacity = '1';
      const plot = root.querySelector('.np-chart-plot') || root;
      const svgRect = svg.getBoundingClientRect();
      const px = svgRect.left + (xi / map.W) * svgRect.width;
      const py = svgRect.top + (yi / map.H) * svgRect.height;
      placeTip(plot, tip, clientX != null ? clientX : px, clientY != null ? clientY : py, true);
    };

    const hide = () => {
      tip.hidden = true;
      band.style.opacity = '0';
    };

    root.onmousemove = e => {
      const i = hit(e.clientX, e.clientY);
      if (i == null) return hide();
      show(i, e.clientX, e.clientY);
    };
    root.onmouseleave = hide;

    requestAnimationFrame(() => {
      const last = rows.length - 1;
      const svgRect = svg.getBoundingClientRect();
      if (!svgRect.width) return;
      const px = svgRect.left + (map.x(last) / map.W) * svgRect.width;
      const py = svgRect.top + (map.y(Number(rows[last].netProfit || 0)) / map.H) * svgRect.height;
      show(last, px, py);
    });
  }

  function renderChart(rows) {
    const root = $('profitTrend');
    const fromVal = $('mainFrom')?.value;
    const toVal = $('mainTo')?.value;
    const axisMode = chartAxisMode(fromVal, toVal);

    rows = fillDailySeries(fromVal, toVal, rows || []);
    if (axisMode === 'month') rows = aggregateByMonth(rows);

    if (!rows.length) {
      root.innerHTML = '<div class="exec-empty">No data for selected period.</div>';
      return [];
    }

    const W = 1200, H = 360, L = 48, R = 16, T = 22, B = 12, iw = W - L - R, ih = H - T - B;
    const vals = rows.map(x => Number(x.netProfit || 0));
    let min = Math.min(0, ...vals), max = Math.max(0, ...vals);
    if (min === max) { min -= 1; max += 1; }
    const step = niceStep(max - min);
    min = Math.floor(min / step) * step;
    max = Math.ceil(max / step) * step;
    if (min === max) max = min + step;
    const y = v => T + (max - v) / (max - min) * ih;
    const x = i => L + (rows.length === 1 ? iw / 2 : i * iw / (rows.length - 1));

    let grid = '';
    for (let v = min; v <= max + step * .1; v += step) {
      const yy = y(v);
      const zero = Math.abs(v) < step / 100;
      grid += `<line class="${zero ? 'trend-zero' : 'trend-grid'}" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text class="trend-axis-label" x="${L - 8}" y="${yy + 4}" text-anchor="end">${shortNum(v)}</text>`;
    }

    const pts = rows.map((r, i) => ({ x: x(i), y: y(Number(r.netProfit || 0)) }));
    const line = smoothPath(pts);
    const z0 = y(0);
    const area = `${line} L${pts[pts.length - 1].x.toFixed(2)},${z0.toFixed(2)} L${pts[0].x.toFixed(2)},${z0.toFixed(2)} Z`;
    const xAxisHtml = buildXAxis(rows, axisMode, x, W);

    root.innerHTML = `
      <div class="np-chart-plot np-chart-plot--instrument">
        <div class="trend-tip trend-tip--instrument" hidden></div>
        <svg class="trend-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Net profit trend">
          <defs>
            <linearGradient id="npLightArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#D97706" stop-opacity="0.28"/>
              <stop offset="50%" stop-color="#D97706" stop-opacity="0.10"/>
              <stop offset="100%" stop-color="#D97706" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="npNightArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.38"/>
              <stop offset="48%" stop-color="#F59E0B" stop-opacity="0.12"/>
              <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="npLightBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#D97706" stop-opacity="0"/>
              <stop offset="30%" stop-color="#D97706" stop-opacity="0.10"/>
              <stop offset="100%" stop-color="#D97706" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="npNightBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#F59E0B" stop-opacity="0"/>
              <stop offset="22%" stop-color="#F59E0B" stop-opacity="0.16"/>
              <stop offset="50%" stop-color="#FBBF24" stop-opacity="0.10"/>
              <stop offset="78%" stop-color="#F59E0B" stop-opacity="0.12"/>
              <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
            </linearGradient>
          </defs>
          ${grid}
          <path class="trend-fill-light" d="${area}"></path>
          <path class="trend-fill-night" d="${area}"></path>
          <path class="trend-line-instrument" d="${line}"></path>
          <rect class="trend-hover-band" x="0" y="${T}" width="24" height="${H - T - B}" fill="url(#npLightBand)" style="opacity:0"></rect>
        </svg>
      </div>
      ${xAxisHtml}`;

    bindChartHover(root, rows, {
      x, y, T, B, H, L, R, W,
      labelMode: axisMode === 'month' ? 'month' : 'day'
    });
    return rows;
  }

  function render(data, prevSummary, days) {
    const s = data.summary || {};
    const p = prevSummary || {};
    setNetValue(s.netProfit);
    setDelta(s.netProfit, p.netProfit, days);
    const chartRows = renderChart(data.trend || []);
    updateFooter(chartRows, days, s.netProfit);
  }

  async function load() {
    const root = $('mainExec');
    const from = $('mainFrom').value;
    const to = $('mainTo').value;
    if (!from || !to) return;
    const prev = previousPeriod(from, to);
    const days = prev?.days || inclusiveDays(from, to);
    root.classList.add('main-exec-loading');
    try {
      const curr = await api('/admin/main/merchant-profit/dashboard' + qs(from, to));
      let prevSummary = {};
      if (prev) {
        try {
          const prevData = await api('/admin/main/merchant-profit/dashboard' + qs(prev.from, prev.to));
          prevSummary = prevData?.summary || {};
        } catch (_) { /* keep empty previous summary */ }
      }
      render(curr, prevSummary, days);
    } catch (e) {
      console.error(e);
      setNetValue(0);
      setDelta(0, 0, days);
      updateFooter([], days, 0);
      const msg = String(e && e.message || '');
      const friendly = /failed to fetch|networkerror|load failed|localhost:8080|cloudflare/i.test(msg)
        ? (msg || 'Unable to reach server. Check network and try again.')
        : (msg || 'Unable to load dashboard');
      $('profitTrend').innerHTML = `<div class="exec-empty text-danger">${friendly}</div>`;
    } finally {
      root.classList.remove('main-exec-loading');
    }
  }

  const pickerState = { view: new Date(), mode: 'days', yearPageStart: new Date().getFullYear() - 5 };

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
    const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let a = new Date(today), b = new Date(today);
    if (key === 'yesterday') { a.setDate(a.getDate() - 1); b = new Date(a); }
    if (key === 'last7') { a.setDate(a.getDate() - 6); b = new Date(today); }
    if (key === 'thisWeek') { a = startOfWeek(today); b = endOfWeek(today); }
    if (key === 'lastWeek') { a = startOfWeek(today); a.setDate(a.getDate() - 7); b = new Date(a); b.setDate(b.getDate() + 6); }
    if (key === 'thisMonth') {
      // Month-to-date only: first day of current month through TODAY, never month-end
      // and never a rolling 7-day window.
      a = new Date(today.getFullYear(), today.getMonth(), 1);
      b = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }
    if (key === 'lastMonth') { a = new Date(today.getFullYear(), today.getMonth() - 1, 1); b = new Date(today.getFullYear(), today.getMonth(), 0); }
    if (key === 'thisYear') { a = new Date(today.getFullYear(), 0, 1); b = new Date(today.getFullYear(), 11, 31); }
    if (key === 'lastYear') { a = new Date(today.getFullYear() - 1, 0, 1); b = new Date(today.getFullYear() - 1, 11, 31); }
    return [fmt(a), fmt(b)];
  }
  function markPreset(name) {
    document.querySelectorAll('[data-range-preset]').forEach(b => b.classList.remove('active'));
    if (name) {
      const b = document.querySelector(`[data-range-preset="${name}"]`);
      if (b) b.classList.add('active');
    }
  }
  function updateDateLabel() {
    const f = $('mainFrom').value || '', t = $('mainTo').value || '';
    $('mainDateLabel').textContent = f && t
      ? `${niceDate(f)} – ${niceDate(t)}`
      : f ? `${niceDate(f)} – Select end date`
      : 'Select date range';
  }
  function renderCalendar() {
    const monthBtn = $('mainCalMonth'), yearBtn = $('mainCalYear'), monthGrid = $('mainCalMonthGrid'), yearGrid = $('mainCalYearGrid'), dayView = $('mainCalDayView'), days = $('mainCalDays');
    monthBtn.innerHTML = MONTHS[pickerState.view.getMonth()] + ' <i class="bi bi-chevron-down"></i>';
    yearBtn.innerHTML = pickerState.view.getFullYear() + ' <i class="bi bi-chevron-down"></i>';
    monthGrid.innerHTML = MONTHS.map((m, i) => `<button type="button" data-main-month="${i}" class="${i === pickerState.view.getMonth() ? 'active' : ''}">${m}</button>`).join('');
    yearGrid.innerHTML = Array.from({ length: 12 }, (_, i) => pickerState.yearPageStart + i).map(y => `<button type="button" data-main-year="${y}" class="${y === pickerState.view.getFullYear() ? 'active' : ''}">${y}</button>`).join('');
    monthGrid.classList.toggle('show', pickerState.mode === 'months');
    yearGrid.classList.toggle('show', pickerState.mode === 'years');
    dayView.classList.toggle('hide', pickerState.mode !== 'days');
    const y0 = pickerState.view.getFullYear(), m = pickerState.view.getMonth(), first = new Date(y0, m, 1), last = new Date(y0, m + 1, 0), start = first.getDay(), total = last.getDate(), from = $('mainFrom').value || '', to = $('mainTo').value || '';
    let html = '', prevLast = new Date(y0, m, 0).getDate();
    for (let i = 0; i < start; i++) html += `<button type="button" class="muted" disabled>${prevLast - start + i + 1}</button>`;
    for (let d = 1; d <= total; d++) {
      const val = fmt(new Date(y0, m, d)), inRange = from && to && val >= from && val <= to, isEdge = val === from || val === to;
      html += `<button type="button" data-main-day="${val}" class="${inRange ? 'in-range' : ''} ${isEdge ? 'selected' : ''}">${d}</button>`;
    }
    for (let i = 1; i <= 42 - start - total; i++) html += `<button type="button" class="muted" disabled>${i}</button>`;
    days.innerHTML = html;
  }
  function setRange(from, to, preset = '', reload = true) {
    $('mainFrom').value = from || '';
    $('mainTo').value = to || '';
    markPreset(preset);
    updateDateLabel();
    renderCalendar();
    if (reload && from && to) load();
  }
  function initDatePicker() {
    const trigger = $('mainDateTrigger'), picker = $('mainRangePicker');
    // Dashboard opens on today (owner: 全站bo/main 日期 默认当日). It used to open on
    // month-to-date - 01 Sep 2026 - 09 Sep 2026 on Sep 9 - which is what the This Month
    // preset still gives when it is clicked.
    const [a, b] = presetRange('today');
    pickerState.view = new Date(a + 'T00:00:00');
    setRange(a, b, 'today', false);
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      picker.classList.toggle('show');
      pickerState.mode = 'days';
      renderCalendar();
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.main-exec-date-field')) picker.classList.remove('show');
    });
    document.querySelectorAll('[data-range-preset]').forEach(btn => btn.addEventListener('click', e => {
      e.stopPropagation();
      const [x, y] = presetRange(btn.dataset.rangePreset);
      pickerState.view = new Date(x + 'T00:00:00');
      setRange(x, y, btn.dataset.rangePreset, true);
      picker.classList.remove('show');
    }));
    $('mainCalPrev').onclick = e => {
      e.stopPropagation();
      if (pickerState.mode === 'years') pickerState.yearPageStart -= 12;
      else pickerState.view.setMonth(pickerState.view.getMonth() - 1);
      renderCalendar();
    };
    $('mainCalNext').onclick = e => {
      e.stopPropagation();
      if (pickerState.mode === 'years') pickerState.yearPageStart += 12;
      else pickerState.view.setMonth(pickerState.view.getMonth() + 1);
      renderCalendar();
    };
    $('mainCalMonth').onclick = e => {
      e.stopPropagation();
      pickerState.mode = pickerState.mode === 'months' ? 'days' : 'months';
      renderCalendar();
    };
    $('mainCalYear').onclick = e => {
      e.stopPropagation();
      pickerState.yearPageStart = pickerState.view.getFullYear() - 5;
      pickerState.mode = pickerState.mode === 'years' ? 'days' : 'years';
      renderCalendar();
    };
    $('mainCalMonthGrid').onclick = e => {
      e.stopPropagation();
      const b = e.target.closest('[data-main-month]');
      if (!b) return;
      pickerState.view.setMonth(Number(b.dataset.mainMonth));
      pickerState.mode = 'days';
      renderCalendar();
    };
    $('mainCalYearGrid').onclick = e => {
      e.stopPropagation();
      const b = e.target.closest('[data-main-year]');
      if (!b) return;
      pickerState.view.setFullYear(Number(b.dataset.mainYear));
      pickerState.mode = 'months';
      renderCalendar();
    };
    $('mainCalDays').onclick = e => {
      e.stopPropagation();
      const b = e.target.closest('[data-main-day]');
      if (!b) return;
      const val = b.dataset.mainDay, f = $('mainFrom'), t = $('mainTo');
      if (!f.value || (f.value && t.value) || val < f.value) {
        f.value = val;
        t.value = '';
        markPreset('');
        updateDateLabel();
        renderCalendar();
        return;
      }
      t.value = val;
      markPreset('');
      updateDateLabel();
      renderCalendar();
      picker.classList.remove('show');
      load();
    };
  }

  const THEME_KEY = 'bo_theme';
  function currentTheme(){
    try{ return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; }catch(e){ return 'light'; }
  }
  function applyTheme(theme){
    const next = theme === 'dark' ? 'dark' : 'light';
    const isDark = next === 'dark';
    document.documentElement.setAttribute('data-bo-theme', next);
    try{ localStorage.setItem(THEME_KEY, next); }catch(e){}
    const btn = document.getElementById('boThemeToggle');
    if(!btn) return;
    btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    const sun = btn.querySelector('[data-theme-icon="sun"]');
    const moon = btn.querySelector('[data-theme-icon="moon"]');
    if(sun) sun.hidden = isDark;
    if(moon) moon.hidden = !isDark;
  }
  function initThemeToggle(){
    applyTheme(currentTheme());
    document.getElementById('boThemeToggle')?.addEventListener('click', () => {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
  }

  function viewerRoleLabel(user){
    user = user || (window.BO_AUTH && typeof window.BO_AUTH.user === 'function' ? window.BO_AUTH.user() : {}) || {};
    if(user.roleName) return String(user.roleName);
    const type = String(user.roleType || '').toUpperCase();
    if(user.rootAdmin === true || Number(user.rootAdmin) === 1 || type === 'ROOT') return 'Root';
    if(type === 'MAIN' || user.mainAdmin === true || Number(user.mainAdmin) === 1) return 'Superadmin';
    if(type === 'MASTER') return 'Master';
    if(type === 'BRAND_OWNER') return 'Brand Owner';
    if(user.role) return String(user.role);
    return 'Admin';
  }

  function enhanceAmberTopbarProfile(){
    const page = document.body;
    if(!page || !page.classList.contains('main-dashboard-page')) return;
    const host = page.querySelector('.report-actions [data-bo-profile]');
    if(!host) return;
    const link = host.querySelector('a.bo-account-link');
    if(!link) return;

    const href = String(link.getAttribute('href') || '');
    if(!href || href === '#' || href === 'profile.html'){
      link.setAttribute('href', 'profile.html#password');
    }
    link.style.pointerEvents = 'auto';
    link.style.cursor = 'pointer';
    link.setAttribute('title', 'Account settings / Change password');
    link.setAttribute('aria-label', 'Open account settings and change password');

    const already = link.classList.contains('is-dash-amber-profile')
      && link.querySelector('.bo-account-meta')
      && link.querySelector('.report-avatar i.bi-person');
    if(already){
      const roleEl = link.querySelector('[data-admin-role]');
      const nextRole = viewerRoleLabel();
      if(roleEl && roleEl.textContent !== nextRole) roleEl.textContent = nextRole;
      return;
    }

    const avatar = link.querySelector('.report-avatar');
    let name = link.querySelector('.bo-account-name');
    const gear = link.querySelector('.bo-account-setting-icon');
    if(gear) gear.setAttribute('hidden', '');

    let meta = link.querySelector('.bo-account-meta');
    if(!meta && name){
      meta = document.createElement('span');
      meta.className = 'bo-account-meta';
      name.replaceWith(meta);
      meta.appendChild(name);
    }
    name = link.querySelector('.bo-account-name');

    let role = link.querySelector('[data-admin-role]');
    if(!role && meta){
      role = document.createElement('span');
      role.className = 'bo-account-role';
      role.setAttribute('data-admin-role', '');
      meta.appendChild(role);
    }
    if(role) role.textContent = viewerRoleLabel();

    if(avatar){
      avatar.removeAttribute('data-admin-avatar');
      if(!avatar.querySelector('i.bi-person')){
        avatar.textContent = '';
        const icon = document.createElement('i');
        icon.className = 'bi bi-person';
        icon.setAttribute('aria-hidden', 'true');
        avatar.appendChild(icon);
      }
      if(meta && (meta.parentNode !== link || avatar.previousElementSibling !== meta)){
        link.appendChild(meta);
        link.appendChild(avatar);
      }
    }

    link.classList.add('is-dash-amber-profile');
  }

  function bindAmberTopbarProfile(){
    enhanceAmberTopbarProfile();
    const host = document.querySelector('.report-actions [data-bo-profile]');
    if(!host || host.dataset.dashAmberObserved === '1') return;
    host.dataset.dashAmberObserved = '1';
    let scheduled = false;
    const run = function(){
      if(scheduled) return;
      scheduled = true;
      requestAnimationFrame(function(){
        scheduled = false;
        enhanceAmberTopbarProfile();
      });
    };
    new MutationObserver(run).observe(host, { childList: true });
    document.addEventListener('bo:profile-updated', run);
    setTimeout(enhanceAmberTopbarProfile, 80);
    setTimeout(enhanceAmberTopbarProfile, 400);
  }

  function initCurrencyPicker() {
    const syncFromRuntime = () => {
      try {
        const next = (window.BO_MAIN_CURRENCY && typeof BO_MAIN_CURRENCY.code === 'function'
          ? BO_MAIN_CURRENCY.code()
          : sessionStorage.getItem('bo_main_report_currency') || currency || 'MYR'
        ).toUpperCase();
        if (next) currency = next;
      } catch (_) { /* keep local */ }
      updateCurrencyLabels();
    };

    // Soft path: currency runtime updates chrome + dispatches event; we only refetch metrics.
    window.addEventListener('bo:main-currency-change', (e) => {
      const next = String((e.detail && e.detail.currency) || '').toUpperCase();
      if (!next || next === currency) {
        updateCurrencyLabels();
        return;
      }
      currency = next;
      updateCurrencyLabels();
      load();
    });
    window.addEventListener('bo:main-currency-ready', syncFromRuntime);

    // Fallback if runtime is absent: toggle + load without page refresh.
    document.addEventListener('click', (e) => {
      if (window.BO_MAIN_CURRENCY) return;
      const btn = e.target.closest && e.target.closest('.np-currency-seg [data-currency], .mre-currency-seg [data-currency]');
      if (!btn) return;
      const next = (btn.getAttribute('data-currency') || 'MYR').toUpperCase();
      if (next === currency) return;
      currency = next;
      sessionStorage.setItem('bo_main_report_currency', currency);
      document.querySelectorAll('.np-currency-seg [data-currency], .mre-currency-seg [data-currency]').forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      updateCurrencyLabels();
      load();
    });

    syncFromRuntime();
  }

  BO_AUTH.requireLogin();
  initThemeToggle();
  bindAmberTopbarProfile();
  initDatePicker();
  initCurrencyPicker();
  load();
})();
