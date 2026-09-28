(function(){
  'use strict';

  const tbody = document.getElementById('masTableBody');
  const infoEl = document.getElementById('masTableInfo');
  const tableWrap = document.querySelector('.mas-table-wrap');
  const tableScroll = document.getElementById('masTableScroll') || document.querySelector('.mas-table-body-scroll');

  /* Keep the split audit header aligned with the body on horizontal scroll. The body was the
     only scroller until the detail column narrowed the table panel below the table's 1040px
     floor; now both scroll, and the header mirrors the body's scrollLeft. */
  const tableHead = document.querySelector('.mas-table-head');
  if(tableScroll && tableHead){
    tableScroll.addEventListener('scroll', function(){
      tableHead.scrollLeft = tableScroll.scrollLeft;
    }, { passive: true });
  }
  const panelEl = document.querySelector('.mas-panel');
  const searchEl = document.getElementById('masSearch');
  const eventTypeEl = document.getElementById('masEventType');
  const merchantEl = document.getElementById('masMerchantFilter');
  const statusEl = document.getElementById('masStatus');
  const fromEl = document.getElementById('masFrom');
  const toEl = document.getElementById('masTo');
  const resetBtn = document.getElementById('masReset');
  const pagerEl = document.getElementById('masPager');
  const pageSizeEl = document.getElementById('masEntriesPageSize');
  const detailPanel = document.getElementById('masDetailPanel');
  const detailTitle = document.getElementById('masDetailTitle');
  const detailGrid = document.getElementById('masDetailGrid');
  const detailStatus = document.getElementById('masDetailStatus');
  const detailSub = document.getElementById('masDetailSub');
  const detailInfoLabel = document.getElementById('masInfoLabel');
  const detailDeviceLabel = document.getElementById('masDeviceLabel');
  const detailIds = document.getElementById('masDetailIds');
  const detailCards = document.getElementById('masDetailCards');
  const jsonToggle = document.getElementById('masJsonToggle');
  const jsonToggleLabel = document.getElementById('masJsonToggleLabel');
  const payloadBox = document.getElementById('masPayload');
  const detailKv = document.getElementById('masDetailKv');
  const detailHash = document.getElementById('masDetailHash');
  const detailReasonBlock = document.getElementById('masDetailReasonBlock');
  const detailReason = document.getElementById('masDetailReason');
  const detailRaw = document.getElementById('masDetailRaw');
  const rawCopyBtn = document.getElementById('masRawCopy');

  /* In the drawer's field list, these are the values long enough that a half-width column
     would wrap them into a tower — they take the whole row instead. */
  const DETAIL_WIDE_KEY = /ip address|user agent|summary|detail/i;
  const ACTOR_LABEL = 'Merchant';

  let allEvents = [];
  let filtered = [];
  let category = 'all';
  let page = 1;
  let resizeTimer = null;

  const PAGE_SIZE = 10;
  let pageSize = PAGE_SIZE;
  let autoPageSize = null;

  function isAutoPageSize(value){
    const v = String(value == null ? '-' : value).trim();
    return v === '' || v === '-' || /^auto$/i.test(v);
  }

  function measureAutoPageSize(){
    if(!tableScroll) return PAGE_SIZE;
    const head = tableWrap && tableWrap.querySelector('.mas-table-head');
    const sample = tableScroll.querySelector('tbody tr:not(.mad-empty) td');
    const rowHeight = sample ? Math.max(36, Math.round(sample.closest('tr').getBoundingClientRect().height)) : 44;
    const available = tableWrap
      ? Math.max(0, Math.floor(tableWrap.clientHeight) - (head ? Math.ceil(head.getBoundingClientRect().height) : 0))
      : tableScroll.clientHeight;
    /* Floor only — never add a row that would overflow and clip under the scroller.
       Leftover seam (< one row height) is stretched evenly by evenFillRowHeights(). */
    return Math.max(5, Math.min(200, Math.floor(available / rowHeight) || PAGE_SIZE));
  }

  function resetEvenFill(){
    if(!tbody) return;
    const table = tbody.closest('table');
    if(table){
      table.classList.remove('bo-tx-evenfill');
      table.style.height = '';
    }
    if(tableScroll) tableScroll.removeAttribute('data-bo-autofit');
    [...tbody.querySelectorAll('tr')].forEach(tr => {
      tr.style.height = '';
      tr.querySelectorAll('td').forEach(td => { td.style.height = ''; td.style.minHeight = ''; });
    });
  }

  /* Show `-`: stretch leftover seam across painted rows when gap < one full row height. */
  function evenFillRowHeights(){
    if(!tbody || !tableScroll) return;
    resetEvenFill();
    if(!pageSizeEl || !isAutoPageSize(pageSizeEl.value)) return;
    const table = tbody.closest('table');
    if(!table) return;
    const rows = [...tbody.querySelectorAll('tr[data-event-id]')];
    if(!rows.length) return;
    void table.offsetHeight;
    const avail = Math.max(0, Math.floor(tableScroll.clientHeight));
    const natural = rows.reduce((sum, tr) => sum + Math.ceil(tr.getBoundingClientRect().height), 0);
    const rowH = Math.max(36, Math.round(natural / rows.length) || 44);
    /* Painted rows overflow the box (measurement drift / borders) — drop one and re-render. */
    if(natural > avail + 1 && autoPageSize != null && autoPageSize > 5){
      autoPageSize = Math.max(5, autoPageSize - 1);
      renderTable();
      return;
    }
    const gap = avail - natural;
    if(gap < 2 || gap >= rowH) return;
    const base = Math.floor(avail / rows.length);
    let rem = avail - (base * rows.length);
    if(base <= 0) return;
    rows.forEach(tr => {
      const h = base + (rem > 0 ? 1 : 0);
      if(rem > 0) rem -= 1;
      tr.style.height = h + 'px';
      tr.querySelectorAll('td').forEach(td => { td.style.height = h + 'px'; });
    });
    table.classList.add('bo-tx-evenfill');
    table.style.height = avail + 'px';
    tableScroll.setAttribute('data-bo-autofit', '');
    if(tableScroll.scrollHeight > tableScroll.clientHeight){
      const over = tableScroll.scrollHeight - tableScroll.clientHeight;
      const shrink = Math.ceil(over / rows.length) || 1;
      rows.forEach(tr => {
        const h = Math.max(rowH, (parseFloat(tr.style.height) || base) - shrink);
        tr.style.height = h + 'px';
        tr.querySelectorAll('td').forEach(td => { td.style.height = h + 'px'; });
      });
      table.style.height = Math.max(0, avail - over) + 'px';
    }
  }

  function scheduleEvenFill(){
    requestAnimationFrame(() => requestAnimationFrame(evenFillRowHeights));
  }

  function resolvePageSize(){
    const raw = String(pageSizeEl && pageSizeEl.value || '-').trim();
    if(/^all$/i.test(raw)) return 10000;
    if(isAutoPageSize(raw)){
      if(autoPageSize == null) autoPageSize = measureAutoPageSize();
      return autoPageSize;
    }
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : PAGE_SIZE;
  }

  /* Same pager markup and same window as the merchant / admin listings
     (see pageButtons() in main-merchant-detail.js): first page, last page and the two either
     side of the current one, with an ellipsis wherever the run skips. */
  function pageButtons(current, total){
    total = Math.max(1, Number(total) || 1);
    current = Math.max(1, Math.min(Number(current) || 1, total));
    const pages = [];
    const add = n => { if(n >= 1 && n <= total && !pages.includes(n)) pages.push(n); };
    add(1);
    for(let n = current - 2; n <= current + 2; n++) add(n);
    add(total);
    pages.sort((a, b) => a - b);
    let html = '<button type="button" class="smart-page nav-text" data-page="' + Math.max(1, current - 1) + '" ' + (current <= 1 ? 'disabled' : '') + '>Previous</button>';
    let prev = 0;
    pages.forEach(n => {
      if(prev && n - prev > 1) html += '<span class="smart-page-ellipsis">…</span>';
      html += '<button type="button" class="smart-page ' + (n === current ? 'active' : '') + '" data-page="' + n + '" ' + (n === current ? 'aria-current="page"' : '') + '>' + n + '</button>';
      prev = n;
    });
    html += '<button type="button" class="smart-page nav-text" data-page="' + Math.min(total, current + 1) + '" ' + (current >= total ? 'disabled' : '') + '>Next</button>';
    return html;
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pickerState = { view: new Date(), selectingStart: true, mode: 'days', yearPageStart: new Date().getFullYear() - 5, hover: '' };

  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  function apiBase(){
    return (window.API_CONFIG && API_CONFIG.BASE_URL) || (window.API_BASE || '');
  }

  async function apiJson(url, opt){
    const r = await fetch(url, Object.assign({
      headers: Object.assign({}, BO_AUTH.authHeader(), { 'Cache-Control': 'no-cache' }),
      cache: 'no-store'
    }, opt || {}));
    const j = await r.json().catch(() => ({}));
    if(!r.ok || j.status === 'error') throw new Error(j.message || 'Request failed');
    return j;
  }

  function parseDate(v){
    if(!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  function pad2(n){ return String(n).padStart(2, '0'); }

  function formatTime(d){
    if(!d) return { time: '—', date: '—' };
    return {
      time: pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()),
      date: d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
    };
  }

  /* Date for the hover tip — the same dd/mm/yyyy the list pages' Last Login / Last Logout
     tooltips use, so the two presentations match. */
  function dateDdMmYyyy(d){
    if(!(d instanceof Date) || isNaN(d.getTime())) return '';
    return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  /* Time visible, date on hover — mirrors timeWithDateTip() in main-admin-detail.js /
     main-merchant-detail.js. The Time & Date column used to stack both on two lines, which
     made every row twice as tall and repeated the same date 50 times down the column. */
  function timeWithDateTip(d){
    if(!(d instanceof Date) || isNaN(d.getTime())) return '<span class="mad-muted">-</span>';
    const t = formatTime(d);
    const date = dateDdMmYyyy(d);
    if(!date) return '<span class="mad-time">' + esc(t.time) + '</span>';
    return '<span class="mad-time mad-time-tip" data-date="' + esc(date) + '" tabindex="0">' + esc(t.time) + '</span>';
  }
  function initials(name){
    const s = String(name || '').trim();
    if(!s) return '?';
    const parts = s.replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean);
    if(parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return s.slice(0, 2).toUpperCase();
  }

  function prettyAction(action){
    return String(action || '-')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function classifyOpAction(action){
    const a = String(action || '').toLowerCase();
    if(/credit|balance|wallet|adjust|payout|deposit|withdraw/.test(a)) return 'credit';
    if(/role|permission|menu|access|authz|grant|revoke/.test(a)) return 'permission';
    if(/suspend|activate|password|create.?admin|update.?admin|delete.?admin|account|user|login|logout/.test(a)) return 'account';
    return 'account';
  }

  const SENSITIVE_KEY = /password|passwd|token|secret|signature|api.?key|authorization|auth|pin|credential/i;
  const NOISE_KEY = /url|uri|endpoint|image|logo|icon|header|payload|body|raw|json|request|response|user.?agent|cookie|html|content/i;
  const HIGHLIGHT_KEY = /^(id|name|code|type|status|mode|amount|balance|role|username|email|environment|env|category|wallet|currency|enabled|active|success|method|provider|merchant|brand|admin|action)$|(_|^)(name|code|type|status|mode|amount|balance|role|env|environment|wallet|currency|id)$/i;

  function safeParseJson(v){
    if(v == null || v === '') return null;
    if(typeof v === 'object') return v;
    try{ return JSON.parse(v); }catch(e){ return null; }
  }

  function prettyLabel(key){
    return String(key || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function leafKey(path){
    const parts = String(path || '').split(/[.\s/]+/).filter(Boolean);
    return parts[parts.length - 1] || path;
  }

  function displayKey(key){
    const s = String(key || '').trim();
    if(!s) return 'Field';
    if(s.length <= 28 && (s.match(/[\s._/-]/g) || []).length <= 3) return prettyLabel(s);
    return prettyLabel(leafKey(s));
  }

  function shortVal(v, max){
    const limit = max || 36;
    if(v == null) return '—';
    if(typeof v === 'boolean') return v ? 'true' : 'false';
    if(typeof v === 'object'){
      try{ v = JSON.stringify(v); }catch(e){ return '…'; }
    }
    const s = String(v).replace(/\s+/g, ' ').trim();
    if(!s) return '—';
    if(SENSITIVE_KEY.test(s) && s.length > 12) return '••••';
    return s.length > limit ? s.slice(0, limit - 1) + '…' : s;
  }

  function flattenPairs(obj, prefix, out){
    if(!obj || typeof obj !== 'object' || Array.isArray(obj)) return out || [];
    out = out || [];
    Object.keys(obj).forEach(k => {
      const path = prefix ? prefix + '.' + k : k;
      const v = obj[k];
      if(v != null && typeof v === 'object' && !Array.isArray(v)) flattenPairs(v, path, out);
      else out.push([path, v]);
    });
    return out;
  }

  function parseDetailPairs(text){
    const raw = String(text || '').trim();
    if(!raw) return [];
    const asJson = safeParseJson(raw);
    if(asJson && typeof asJson === 'object' && !Array.isArray(asJson)){
      if(asJson.fields && typeof asJson.fields === 'object') return flattenPairs(asJson.fields);
      return flattenPairs(asJson);
    }
    const pairs = [];
    const re = /([A-Za-z][\w.\s/-]{0,40}?)\s*=\s*([^,;]+?)(?=(?:\s*,\s*|\s*;\s*|\s+[A-Za-z][\w.\s/-]{0,40}?=)|$)/g;
    let m;
    while((m = re.exec(raw))){
      const k = m[1].replace(/\s+/g, ' ').trim();
      const v = m[2].replace(/\s+/g, ' ').trim();
      if(k) pairs.push([k, v]);
    }
    return pairs;
  }

  function isHighlightKey(key){
    const leaf = leafKey(key);
    if(SENSITIVE_KEY.test(key) || SENSITIVE_KEY.test(leaf)) return false;
    if(NOISE_KEY.test(key) || NOISE_KEY.test(leaf)) return false;
    return HIGHLIGHT_KEY.test(leaf) || HIGHLIGHT_KEY.test(key);
  }

  function valuesEqual(a, b){
    if(a === b) return true;
    if(a == null || b == null) return a == b;
    if(typeof a === 'object' || typeof b === 'object'){
      try{ return JSON.stringify(a) === JSON.stringify(b); }catch(e){ return false; }
    }
    return String(a) === String(b);
  }

  function businessObject(j){
    if(!j || typeof j !== 'object') return null;
    if(j.fields && typeof j.fields === 'object') return j.fields;
    if(j.before && typeof j.before === 'object') return j.before;
    if(j.after && typeof j.after === 'object') return j.after;
    if(j.data && typeof j.data === 'object' && !Array.isArray(j.data)) return j.data;
    const keys = Object.keys(j);
    if(keys.length && keys.every(k => /^(method|path|success|status|message|timestamp|durationMs|requestId)$/i.test(k))) return null;
    return j;
  }

  function diffPairs(before, after){
    const a = flattenPairs(before || {});
    const bMap = {};
    flattenPairs(after || {}).forEach(([k, v]) => { bMap[k] = v; });
    const aMap = {};
    a.forEach(([k, v]) => { aMap[k] = v; });
    const keys = Array.from(new Set(Object.keys(aMap).concat(Object.keys(bMap))));
    const changes = [];
    keys.forEach(k => {
      if(SENSITIVE_KEY.test(k) || SENSITIVE_KEY.test(leafKey(k))) return;
      if(NOISE_KEY.test(k) || NOISE_KEY.test(leafKey(k))) return;
      if(!(k in aMap)) changes.push({ key: k, from: undefined, to: bMap[k], kind: 'add' });
      else if(!(k in bMap)) changes.push({ key: k, from: aMap[k], to: undefined, kind: 'remove' });
      else if(!valuesEqual(aMap[k], bMap[k])) changes.push({ key: k, from: aMap[k], to: bMap[k], kind: 'change' });
    });
    changes.sort((x, y) => Number(isHighlightKey(y.key)) - Number(isHighlightKey(x.key)));
    return changes;
  }

  function formatChangeBits(changes, limit){
    const max = limit || 3;
    const bits = changes.slice(0, max).map(c => {
      const label = displayKey(c.key);
      if(c.kind === 'add') return label + ': ' + shortVal(c.to);
      if(c.kind === 'remove') return label + ' removed';
      return label + ': ' + shortVal(c.from, 20) + ' → ' + shortVal(c.to, 20);
    });
    if(changes.length > max) bits.push('+' + (changes.length - max) + ' more');
    return bits.join(' · ');
  }

  function pickHighlightBits(pairs, limit){
    const max = limit || 3;
    const scored = pairs
      .filter(([k, v]) => v != null && String(v).trim() !== '' && isHighlightKey(k))
      .map(([k, v]) => ({ k, v, score: /name|code/i.test(leafKey(k)) ? 2 : 1 }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, max).map(x => displayKey(x.k) + ' ' + shortVal(x.v, 28));
  }

  function actionVerb(action){
    const a = String(action || '').toLowerCase();
    if(/^create|add|insert/.test(a)) return 'Created';
    if(/^update|edit|modify|patch|save/.test(a)) return 'Updated';
    if(/^delete|remove|destroy/.test(a)) return 'Deleted';
    if(/^suspend|disable|block/.test(a)) return 'Suspended';
    if(/^activate|enable|unblock/.test(a)) return 'Activated';
    if(/login/.test(a)) return 'Signed in';
    if(/logout/.test(a)) return 'Signed out';
    if(/credit|adjust|deposit|withdraw|payout/.test(a)) return 'Adjusted';
    return prettyAction(action);
  }

  function opDetailText(row){
    const before = businessObject(safeParseJson(row.beforeJson));
    const afterFull = safeParseJson(row.afterJson);
    const after = businessObject(afterFull);

    if(before && after){
      const changes = diffPairs(before, after);
      if(changes.length) return formatChangeBits(changes, 3);
      return 'No field changes';
    }

    const detailPairs = parseDetailPairs(row.detail);
    if(before && detailPairs.length){
      const afterFromDetail = {};
      detailPairs.forEach(([k, v]) => { afterFromDetail[k] = v; });
      const changes = diffPairs(before, afterFromDetail);
      if(changes.length) return formatChangeBits(changes, 3);
    }

    if(detailPairs.length){
      const bits = pickHighlightBits(detailPairs, 3);
      if(bits.length){
        const verb = actionVerb(row.action);
        if(/^(Created|Deleted|Suspended|Activated)/.test(verb)) return verb + ' · ' + bits.join(' · ');
        if(verb === 'Updated') return 'Set ' + bits.join(' · ');
        return bits.join(' · ');
      }
    }

    if(afterFull && afterFull.path){
      const path = String(afterFull.path).replace(/^\/api\//, '/');
      return String(afterFull.method || 'OP') + ' ' + shortVal(path, 48);
    }

    const rich = String(row.detail || '').trim();
    if(rich){
      const oneLine = rich.replace(/\s+/g, ' ');
      return oneLine.length > 72 ? oneLine.slice(0, 71) + '…' : oneLine;
    }
    return actionVerb(row.action);
  }

  function opSuccess(row){
    try{
      const j = JSON.parse(row.afterJson || '{}');
      if(j.success === false) return false;
    }catch(e){}
    return true;
  }

  function mapLogin(row){
    const at = parseDate(row.loginAt || row.createdAt);
    const failed = String(row.status || '').toUpperCase() === 'FAILED';
    const title = failed ? 'Login blocked' : 'Admin login';
    const subtitle = failed
      ? (row.failureReason || 'Authentication failed')
      : 'Successful console sign-in';
    return {
      id: 'login-' + (row.id || (row.username + '-' + (row.loginAt || ''))),
      source: 'login',
      category: failed ? 'security' : 'account',
      eventType: failed ? 'security' : 'login',
      at: at,
      adminName: row.displayName || row.username || 'Unknown',
      username: row.username || '',
      roleLabel: row.roleName || row.role || 'Merchant',
      title: title,
      subtitle: subtitle,
      target: failed ? 'Auth Gateway' : 'Admin Console',
      ip: row.ipAddress || '—',
      location: row.location || row.city || row.country || '—',
      status: failed ? 'blocked' : 'success',
      tone: failed ? 'danger' : 'cyan',
      detail: {
        'Time & Date': at ? (ymd(at) + ' ' + formatTime(at).time) : (row.loginAt || '—'),
        Username: row.username || '—',
        'Display Name': row.displayName || '—',
        Status: failed ? 'Blocked' : 'Success',
        'IP Address': row.ipAddress || '—',
        'User Agent': row.userAgent || '—',
        /* Left empty rather than dashed: the drawer drops the whole Reason section when there
           is nothing to show, and a '—' placeholder would read as a value. */
        Reason: row.failureReason || ''
      },
      merchantId: row.brandId == null ? null : Number(row.brandId),
      raw: row
    };
  }

  function mapOperation(row){
    const ok = opSuccess(row);
    const cat = classifyOpAction(row.action);
    const title = prettyAction(row.action);
    const subtitle = opDetailText(row);
    const target = row.entityType
      ? (prettyAction(row.entityType) + (row.entityId != null ? ': #' + row.entityId : ''))
      : 'System';
    let merchantId = row.brandId == null ? null : Number(row.brandId);
    if(!merchantId){
      try{
        const j = JSON.parse(row.afterJson || '{}');
        merchantId = Number(j.brandId || j.merchantId || 0) || null;
        if(!merchantId && j.path){ const m=String(j.path).match(/\/(?:brands|merchants)\/(\d+)/); if(m) merchantId=Number(m[1]); }
      }catch(e){}
    }
    const fullDetail = String(row.detail || '').trim();
    const opAt = parseDate(row.createdAt);
    const detailMap = {
      'Time & Date': opAt ? (ymd(opAt) + ' ' + formatTime(opAt).time) : (row.createdAt || '—'),
      Actor: row.actor || 'SYSTEM',
      Action: row.action || '—',
      Entity: row.entityType || '—',
      'Entity ID': row.entityId != null ? String(row.entityId) : '—',
      'IP Address': row.ipAddress || '—',
      Summary: subtitle,
      Status: ok ? 'Success' : 'Failed'
    };
    if(fullDetail && fullDetail !== subtitle && fullDetail.length <= 160){
      detailMap.Detail = fullDetail;
    }
    return {
      id: 'op-' + (row.id || (row.actor + '-' + row.createdAt + '-' + row.action)),
      source: 'operation',
      category: cat,
      eventType: cat,
      at: parseDate(row.createdAt),
      adminName: row.actor || 'SYSTEM',
      username: row.actor || '',
      roleLabel: row.roleName || 'Operator',
      title: title,
      subtitle: subtitle,
      target: target,
      ip: row.ipAddress || '—',
      location: row.location || '—',
      status: ok ? 'success' : 'failed',
      tone: ok ? (cat === 'permission' ? 'success' : 'cyan') : 'danger',
      detail: detailMap,
      merchantId: merchantId,
      raw: row
    };
  }

  async function loadOperations(){
    const base = apiBase();
    const rows = [];
    let page = 0, totalPages = 1;
    try{
      do{
        const q = new URLSearchParams({ entityType: 'ADMIN_OPERATION', page: String(page), size: '500' });
        if(fromEl && fromEl.value) q.set('from', fromEl.value);
        if(toEl && toEl.value) q.set('to', toEl.value);
        const data = await apiJson(base.replace(/\/$/, '') + '/admin/rebate/audit?' + q).then(j => j.data || j);
        const batch = Array.isArray(data.content) ? data.content : (Array.isArray(data) ? data : []);
        rows.push(...batch);
        totalPages = Number(data.totalPages || 1);
        page += 1;
      }while(page < totalPages);
      return rows.map(mapOperation);
    }catch(e){
      return [];
    }
  }

  async function loadMerchants(){
    if(!merchantEl) return;
    try{
      const j=await apiJson(apiBase().replace(/\/$/, '') + '/admin/merchants');
      const rows=Array.isArray(j.data)?j.data:[];
      merchantEl.innerHTML='<option value="">All Merchants</option>'+rows.map(b=>'<option value="'+b.id+'">'+esc(b.name||'')+' ('+esc(b.code||'')+')</option>').join('');
      const qp=new URLSearchParams(location.search).get('merchantId'); if(qp) merchantEl.value=qp;
    }catch(e){ merchantEl.innerHTML='<option value="">All Merchants</option>'; }
  }

  async function loadLogins(){
    try{
      const u = new URL(BO_AUTH.adminLoginLogsUrl(), location.href);
      if(fromEl && fromEl.value) u.searchParams.set('from', fromEl.value);
      if(toEl && toEl.value) u.searchParams.set('to', toEl.value);
      const j = await apiJson(u.toString());
      const rows = Array.isArray(j.data) ? j.data : [];
      return rows.map(mapLogin);
    }catch(e){
      throw e;
    }
  }

  function ymd(d){
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  // Family wording: "01 Sep 2026 - 15 Sep 2026" (was dd/mm/yyyy, used by the security pages only).
  function niceDate(v){
    if(!v) return '';
    const a = String(v).split('-');
    return a.length === 3 ? a[2] + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(a[1]) - 1] + ' ' + a[0] : v;
  }
  function startOfWeek(d){
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - x.getDay());
    return x;
  }
  function endOfWeek(d){
    const x = startOfWeek(d);
    x.setDate(x.getDate() + 6);
    return x;
  }
  function presetRange(key){
    const now = new Date();
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let a = new Date(day), b = new Date(day);
    if(key === 'yesterday'){ a.setDate(a.getDate() - 1); b = new Date(a); }
    if(key === 'thisWeek'){ a = startOfWeek(day); b = endOfWeek(day); }
    if(key === 'lastWeek'){ a = startOfWeek(day); a.setDate(a.getDate() - 7); b = new Date(a); b.setDate(b.getDate() + 6); }
    if(key === 'thisMonth'){ a = new Date(day.getFullYear(), day.getMonth(), 1); b = new Date(day.getFullYear(), day.getMonth() + 1, 0); }
    if(key === 'lastMonth'){ a = new Date(day.getFullYear(), day.getMonth() - 1, 1); b = new Date(day.getFullYear(), day.getMonth(), 0); }
    if(key === 'thisYear'){ a = new Date(day.getFullYear(), 0, 1); b = new Date(day.getFullYear(), 11, 31); }
    if(key === 'lastYear'){ a = new Date(day.getFullYear() - 1, 0, 1); b = new Date(day.getFullYear() - 1, 11, 31); }
    return [ymd(a), ymd(b)];
  }
  function markPreset(name){
    document.querySelectorAll('[data-mas-range-preset]').forEach(b => b.classList.remove('active'));
    if(name){
      const el = document.querySelector('[data-mas-range-preset="' + name + '"]');
      if(el) el.classList.add('active');
    }
  }
  function updateDateLabel(){
    const label = document.getElementById('masDateLabel');
    if(!label || !fromEl || !toEl) return;
    const f = fromEl.value || '';
    const t = toEl.value || '';
    label.textContent = f && t
      ? niceDate(f) + ' - ' + niceDate(t)
      : f ? niceDate(f) + ' - Select end date'
      : 'Select date range';
  }
  function renderCalendar(){
    const monthBtn = document.getElementById('masCalMonth');
    const yearBtn = document.getElementById('masCalYear');
    const monthGrid = document.getElementById('masCalMonthGrid');
    const yearGrid = document.getElementById('masCalYearGrid');
    const dayView = document.getElementById('masCalDayView');
    const days = document.getElementById('masCalDays');
    if(!monthBtn || !yearBtn || !monthGrid || !yearGrid || !dayView || !days) return;

    monthBtn.innerHTML = MONTHS[pickerState.view.getMonth()] + ' <i class="bi bi-chevron-down"></i>';
    yearBtn.innerHTML = pickerState.view.getFullYear() + ' <i class="bi bi-chevron-down"></i>';
    monthGrid.innerHTML = MONTHS.map((m, i) =>
      '<button type="button" data-mas-month="' + i + '" class="' + (i === pickerState.view.getMonth() ? 'active' : '') + '">' + m + '</button>'
    ).join('');
    yearGrid.innerHTML = Array.from({ length: 12 }, (_, i) => pickerState.yearPageStart + i).map(y =>
      '<button type="button" data-mas-year="' + y + '" class="' + (y === pickerState.view.getFullYear() ? 'active' : '') + '">' + y + '</button>'
    ).join('');
    monthGrid.classList.toggle('show', pickerState.mode === 'months');
    yearGrid.classList.toggle('show', pickerState.mode === 'years');
    dayView.classList.toggle('hide', pickerState.mode !== 'days');

    const y0 = pickerState.view.getFullYear();
    const m = pickerState.view.getMonth();
    const first = new Date(y0, m, 1);
    const last = new Date(y0, m + 1, 0);
    const start = first.getDay();
    const total = last.getDate();
    const from = fromEl && fromEl.value || '';
    const to = toEl && toEl.value || '';
    let html = '';
    const prevLast = new Date(y0, m, 0).getDate();
    for(let i = 0; i < start; i++) html += '<button type="button" class="muted" disabled>' + (prevLast - start + i + 1) + '</button>';
    // While only the start is picked, the hovered day previews the far end so the range reads
    // as one continuous strip before anything is committed. Hovering before the start is
    // deliberately ignored: a click there restarts the range, so the preview must not promise
    // something the click will not do.
    const hover = (!to && from && pickerState.hover && pickerState.hover >= from) ? pickerState.hover : '';
    const bandEnd = to || hover || '', hasBand = !!(from && bandEnd);
    for(let d = 1; d <= total; d++){
      const val = ymd(new Date(y0, m, d));
      const inBand = !!(hasBand && val >= from && val <= bandEnd);
      // The anchor is marked as soon as it is picked, band or no band — otherwise the first
      // click looks like it did nothing.
      const isStart = !!(from && val === from), isEnd = !!(bandEnd && val === bandEnd);
      const isPreview = !!(hover && val === hover);
      html += '<button type="button" data-mas-day="' + val + '" class="' + (inBand ? 'in-range ' : '') + (isStart || isEnd ? 'selected ' : '') + (isStart ? 'is-start ' : '') + (isEnd ? 'is-end ' : '') + (isPreview ? 'is-preview' : '') + '">' + d + '</button>';
    }
    for(let i = 1; i <= 42 - start - total; i++) html += '<button type="button" class="muted" disabled>' + i + '</button>';
    days.innerHTML = html;
  }
  function setRange(from, to, preset, reload){
    if(fromEl) fromEl.value = from || '';
    if(toEl) toEl.value = to || '';
    markPreset(preset || '');
    updateDateLabel();
    renderCalendar();
    if(reload !== false) loadAll();
  }
  function initDatePicker(){
    const trigger = document.getElementById('masDateTrigger');
    const picker = document.getElementById('masRangePicker');
    if(!trigger || !picker || !fromEl || !toEl) return;

    const [a, b] = presetRange('today');
    pickerState.view = new Date(a + 'T00:00:00');
    setRange(a, b, 'today', false);

    trigger.addEventListener('click', e => {
      e.stopPropagation();
      picker.classList.toggle('show');
      pickerState.mode = 'days';
      pickerState.hover = '';
      renderCalendar();
    });
    document.addEventListener('click', e => {
      if(!e.target.closest('.mas-date-field')) picker.classList.remove('show');
    });
    document.querySelectorAll('[data-mas-range-preset]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const key = btn.getAttribute('data-mas-range-preset');
        const [x, y] = presetRange(key);
        pickerState.view = new Date(x + 'T00:00:00');
        pickerState.selectingStart = true;
        setRange(x, y, key, true);
        picker.classList.remove('show');
      });
    });
    const prev = document.getElementById('masCalPrev');
    const next = document.getElementById('masCalNext');
    const monthBtn = document.getElementById('masCalMonth');
    const yearBtn = document.getElementById('masCalYear');
    const monthGrid = document.getElementById('masCalMonthGrid');
    const yearGrid = document.getElementById('masCalYearGrid');
    const days = document.getElementById('masCalDays');

    prev && (prev.onclick = e => {
      e.stopPropagation();
      if(pickerState.mode === 'years') pickerState.yearPageStart -= 12;
      else pickerState.view.setMonth(pickerState.view.getMonth() - 1);
      renderCalendar();
    });
    next && (next.onclick = e => {
      e.stopPropagation();
      if(pickerState.mode === 'years') pickerState.yearPageStart += 12;
      else pickerState.view.setMonth(pickerState.view.getMonth() + 1);
      renderCalendar();
    });
    monthBtn && (monthBtn.onclick = e => {
      e.stopPropagation();
      pickerState.mode = pickerState.mode === 'months' ? 'days' : 'months';
      renderCalendar();
    });
    yearBtn && (yearBtn.onclick = e => {
      e.stopPropagation();
      pickerState.yearPageStart = pickerState.view.getFullYear() - 5;
      pickerState.mode = pickerState.mode === 'years' ? 'days' : 'years';
      renderCalendar();
    });
    monthGrid && (monthGrid.onclick = e => {
      e.stopPropagation();
      const b = e.target.closest('[data-mas-month]');
      if(!b) return;
      pickerState.view.setMonth(Number(b.getAttribute('data-mas-month')));
      pickerState.mode = 'days';
      renderCalendar();
    });
    yearGrid && (yearGrid.onclick = e => {
      e.stopPropagation();
      const b = e.target.closest('[data-mas-year]');
      if(!b) return;
      pickerState.view.setFullYear(Number(b.getAttribute('data-mas-year')));
      pickerState.mode = 'months';
      renderCalendar();
    });
    days && (days.onclick = e => {
      e.stopPropagation();
      const b = e.target.closest('[data-mas-day]');
      if(!b) return;
      const val = b.getAttribute('data-mas-day');
      if(!fromEl.value || (fromEl.value && toEl.value) || val < fromEl.value){
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
      // Refetch, not just re-filter: a range outside the window fetched at load would
      // otherwise render "No audit events found." instead of loading that period.
      loadAll();
    });
    days.addEventListener('mouseover', e => {
      const b = e.target.closest('[data-mas-day]');
      const v = b ? b.getAttribute('data-mas-day') : '';
      if(pickerState.hover === v) return;
      pickerState.hover = v;
      if(fromEl.value && !toEl.value) renderCalendar();
    });
    days.addEventListener('mouseleave', () => {
      if(!pickerState.hover) return;
      pickerState.hover = '';
      if(fromEl.value && !toEl.value) renderCalendar();
    });
  }

  function dayBounds(fromYmd, toYmd){
    if(!fromYmd || !toYmd) return null;
    const start = new Date(fromYmd + 'T00:00:00');
    const end = new Date(toYmd + 'T23:59:59.999');
    if(isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    return { start, end };
  }

  function updateKpis(events){
    const totalEl = document.getElementById('masStatTotal');
    const deltaEl = document.getElementById('masStatTotalDelta');
    const alertsEl = document.getElementById('masStatAlerts');
    const alertsMeta = document.getElementById('masStatAlertsMeta');
    const sessionsEl = document.getElementById('masStatSessions');
    const sessionsMeta = document.getElementById('masStatSessionsMeta');

    const now = Date.now();
    const d7 = now - 7 * 24 * 60 * 60 * 1000;
    const d14 = now - 14 * 24 * 60 * 60 * 1000;
    const d1 = now - 24 * 60 * 60 * 1000;

    const total = events.length;
    const last7 = events.filter(e => e.at && e.at.getTime() >= d7).length;
    const prev7 = events.filter(e => e.at && e.at.getTime() >= d14 && e.at.getTime() < d7).length;
    let deltaText = '—';
    let deltaTitle = 'No comparison window';
    let deltaClass = 'mas-kpi-meta';
    if(prev7 > 0){
      const pct = Math.round(((last7 - prev7) / prev7) * 100);
      deltaText = (pct >= 0 ? '+' : '') + pct + '%';
      deltaTitle = (pct >= 0 ? '+' : '') + pct + '% vs last 7 days';
      deltaClass = 'mas-kpi-meta ' + (pct >= 0 ? 'is-success' : 'is-danger');
    }else if(last7 > 0){
      deltaText = '+' + last7;
      deltaTitle = '+' + last7 + ' in last 7 days';
      deltaClass = 'mas-kpi-meta is-success';
    }

    const alerts = events.filter(e => e.status === 'blocked' || e.status === 'failed').length;
    const sessionUsers = new Set(
      events
        .filter(e => e.source === 'login' && e.status === 'success' && e.at && e.at.getTime() >= d1)
        .map(e => String(e.username || e.adminName).toLowerCase())
        .filter(Boolean)
    );

    if(totalEl) totalEl.textContent = total.toLocaleString();
    if(deltaEl){
      deltaEl.className = deltaClass;
      deltaEl.textContent = deltaText;
      deltaEl.title = deltaTitle;
    }
    if(alertsEl) alertsEl.textContent = String(alerts);
    if(alertsMeta){
      alertsMeta.className = 'mas-kpi-meta' + (alerts ? ' is-danger' : '');
      alertsMeta.textContent = alerts ? 'review' : 'clear';
      alertsMeta.title = alerts ? (alerts + ' need review') : 'No active alerts';
    }
    if(sessionsEl) sessionsEl.textContent = String(sessionUsers.size);
    if(sessionsMeta){
      sessionsMeta.innerHTML = '<i></i> now';
      sessionsMeta.title = sessionUsers.size + ' active now';
    }

    const catAll = document.getElementById('masCatAll');
    if(catAll) catAll.textContent = String(total);
  }

  function applyFilters(){
    const q = (searchEl && searchEl.value || '').trim().toLowerCase();
    const eventType = eventTypeEl && eventTypeEl.value || '';
    const status = statusEl && statusEl.value || '';
    const merchantId = merchantEl && merchantEl.value || '';
    const bounds = dayBounds(fromEl && fromEl.value, toEl && toEl.value);

    const baseFiltered = allEvents.filter(e => {
      if(merchantId && String(e.merchantId || '') !== String(merchantId)) return false;
      if(bounds){
        if(!e.at) return false;
        const t = e.at.getTime();
        if(t < bounds.start.getTime() || t > bounds.end.getTime()) return false;
      }
      if(eventType && e.eventType !== eventType && !(eventType === 'security' && e.category === 'security')) return false;
      if(status && e.status !== status) return false;
      if(q){
        const hay = [e.adminName, e.username, e.title, e.subtitle, e.target, e.ip].join(' ').toLowerCase();
        if(!hay.includes(q)) return false;
      }
      return true;
    });

    const catAll = document.getElementById('masCatAll');
    if(catAll) catAll.textContent = String(baseFiltered.length);

    filtered = baseFiltered.filter(e => {
      if(category !== 'all' && e.category !== category) return false;
      return true;
    });
    /* Any filter change is a new result set, so the old page number means nothing: back to
       the first page. The pager itself calls renderTable() directly and keeps its page. */
    page = 1;
    renderTable();
  }

  function fitTableArea(){
    if(!tableWrap || !panelEl) return 0;
    const footer = panelEl.querySelector('.mad-footer');
    const footerH = footer ? Math.max(footer.getBoundingClientRect().height, 52) : 56;
    const top = tableWrap.getBoundingClientRect().top;
    const avail = Math.floor(window.innerHeight - top - footerH - 8);
    const h = Math.max(180, avail);
    tableWrap.style.height = h + 'px';
    tableWrap.style.maxHeight = h + 'px';
    if(tableScroll){
      tableScroll.style.height = '';
      tableScroll.style.maxHeight = '';
    }
    return h;
  }

  function renderTable(){
    if(!tbody) return;
    /* The box must be sized before we ask "how many rows fit in it" — otherwise the very
       first auto-fill measurement reads whatever height the wrap happened to have before
       fitTableArea() ever ran (e.g. its unset CSS `height:auto`), undercounting rows and
       leaving a dead gap above the footer. Fitting first mirrors main-admin-detail.js, whose
       .mad-table-wrap never needs a JS-assigned height because CSS flex alone sizes it before
       any row-count math runs. */
    fitTableArea();
    const total = filtered.length;
    pageSize = resolvePageSize();
    const pages = Math.max(1, Math.ceil(total / pageSize));
    if(page > pages) page = pages;
    const start = (page - 1) * pageSize;
    const rows = filtered.slice(start, start + pageSize);

    if(infoEl){
      infoEl.textContent = total
        ? ('Showing ' + (start + 1).toLocaleString() + ' to ' + (start + rows.length).toLocaleString() + ' of ' + total.toLocaleString() + ' records')
        : 'Showing 0 records';
    }
    if(pagerEl) pagerEl.innerHTML = total ? pageButtons(page, pages) : '';

    if(!rows.length){
      resetEvenFill();
      tbody.innerHTML = '<tr><td colspan="6" class="mad-empty">No audit events found.</td></tr>';
      fitTableArea();
      return;
    }

    tbody.innerHTML = rows.map((e, idx) => {
      const blocked = e.status === 'blocked' || e.status === 'failed';
      const statusLabel = e.status === 'blocked' ? 'Blocked' : (e.status === 'failed' ? 'Failed' : 'Success');
      const statusClass = e.status === 'blocked' ? 'is-blocked' : (e.status === 'failed' ? 'is-failed' : 'is-success');
      const dotClass = e.tone === 'danger' ? 'is-danger' : (e.tone === 'success' ? 'is-success' : '');
      /* Row position, not page position: the avatar wash has to keep alternating across a
         page boundary instead of restarting at row 1 on every page. */
      const avClass = (start + idx) % 2 ? ' is-alt' : '';
      return '<tr class="' + (blocked ? 'is-blocked' : '') + '" data-event-id="' + esc(e.id) + '"' +
          ' tabindex="0" aria-label="View detail: ' + esc(e.title) + ' — ' + esc(e.adminName) + '">' +
        '<td class="mad-time mad-detail">' + timeWithDateTip(e.at) + '</td>' +
        '<td><div class="mas-admin"><span class="mas-avatar' + avClass + '">' + esc(initials(e.adminName)) + '</span>' +
          '<div class="mas-admin-copy"><b>' + esc(e.adminName) + '</b><small>' + esc(e.roleLabel) + '</small></div></div></td>' +
        '<td><div class="mas-event"><span class="mas-dot ' + dotClass + '"></span>' +
          '<div class="mas-event-copy"><b>' + esc(e.title) + '</b><small>' + esc(e.subtitle) + '</small></div></div></td>' +
        '<td><span class="mas-target" title="' + esc(e.target) + '">' + esc(e.target) + '</span></td>' +
        '<td><div class="mas-ip"><b>' + esc(e.ip) + '</b><small><i class="bi bi-geo-alt-fill"></i> ' + esc(e.location) + '</small></div></td>' +
        '<td><span class="mas-status ' + statusClass + '"><i></i>' + statusLabel + '</span></td>' +
      '</tr>';
    }).join('');

    fitTableArea();
    scheduleEvenFill();
  }

  function findEvent(id){
    return allEvents.find(e => e.id === id) || filtered.find(e => e.id === id);
  }

  /* One label-over-value pair for the Key-Value tab. A <div> wrapping dt/dd inside a <dl> is the
     valid way to give each pair its own grid cell, which puts two fields side by side on a row. */
  function detailField(label, value, wide){
    return '<div class="mas-field' + (wide ? ' is-wide' : '') + '">' +
      '<dt>' + esc(label) + '</dt>' +
      '<dd>' + esc(value == null || value === '' ? '—' : value) + '</dd>' +
    '</div>';
  }

  function card(label, value, sub, opts){
    opts = opts || {};
    return '<div class="mas-card' + (opts.wide ? ' is-wide' : '') + '">' +
      '<span class="mas-card-label">' + esc(label) + '</span>' +
      '<b class="mas-card-value">' + esc(value) + '</b>' +
      (sub ? '<small class="mas-card-sub">' + esc(sub) + '</small>' : '') +
      (opts.copy
        ? '<button type="button" class="mas-card-copy" data-mas-copy="' + esc(opts.copy) + '"' +
            ' aria-label="Copy ' + esc(label) + '" title="Copy"><i class="bi bi-clipboard"></i></button>'
        : '') +
    '</div>';
  }

  /* Client OS and browser, read out of the user agent the row already carries. Nothing here is
     inferred beyond what that string names: if it does not say, the card is not built. */
  function parseClient(ua){
    const s = String(ua || '');
    let os = '', br = '', m;
    if(!s) return { os: '', browser: '' };
    if((m = s.match(/Windows NT ([\d.]+)/))){
      os = 'Windows NT ' + m[1] + (/Win64|x64/.test(s) ? ' (x64)' : (/WOW64/.test(s) ? ' (x86)' : ''));
    }else if((m = s.match(/Mac OS X ([_\d]+)/))){
      os = 'macOS ' + m[1].replace(/_/g, '.');
    }else if((m = s.match(/(iPhone|iPad)[^)]*OS ([\d_]+)/))){
      os = m[1] + ' ' + m[2].replace(/_/g, '.');
    }else if((m = s.match(/Android ([\d.]+)/))){
      os = 'Android ' + m[1];
    }else if(/Linux/.test(s)){
      os = 'Linux';
    }
    if((m = s.match(/Edg\/([\d.]+)/))) br = 'Edge ' + m[1];
    else if((m = s.match(/OPR\/([\d.]+)/))) br = 'Opera ' + m[1];
    else if((m = s.match(/Chrome\/([\d.]+)/))) br = 'Chrome ' + m[1];
    else if((m = s.match(/Firefox\/([\d.]+)/))) br = 'Firefox ' + m[1];
    else if((m = s.match(/Version\/([\d.]+)[^)]*Safari/))) br = 'Safari ' + m[1];
    return { os: os, browser: br };
  }

  /* Which pane the payload block is showing. The copy button always copies the raw payload, which
     is what its label says, whichever pane is on screen. */
  function setPayloadTab(which){
    const raw = which !== 'kv';
    if(detailRaw) detailRaw.hidden = !raw;
    if(detailKv) detailKv.hidden = raw;
    if(detailPanel){
      detailPanel.querySelectorAll('[data-mas-tab]').forEach(b => {
        const on = b.getAttribute('data-mas-tab') === which;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }
  }

  /* A digest of the payload exactly as this panel is displaying it — not a server-side audit
     chain, and not called one: the label says where it came from. Hidden where crypto.subtle is
     unavailable (a non-secure origin), so it never claims more than it can do. */
  let hashToken = 0;
  function fillHash(text){
    if(!detailHash) return;
    const token = ++hashToken;
    detailHash.hidden = true;
    if(!text || !(window.crypto && window.crypto.subtle && window.crypto.subtle.digest)) return;
    try{
      window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(buf => {
        if(token !== hashToken) return;
        const hex = Array.prototype.map.call(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
        detailHash.textContent = 'SHA-256 ' + hex.slice(0, 12) + '\u2026' + hex.slice(-12) +
          ' \u00b7 computed in your browser from this payload';
        detailHash.hidden = false;
      }).catch(() => {});
    }catch(e){}
  }

  function copyText(text, btn){
    if(!text) return;
    const done = () => {
      if(!btn) return;
      const label = btn.querySelector('.mas-raw-copy-label');
      const icon = btn.querySelector('i');
      btn.classList.add('is-done');
      clearTimeout(btn._t);
      if(label){
        const was = label.textContent;
        label.textContent = 'Copied';
        btn._t = setTimeout(() => { btn.classList.remove('is-done'); label.textContent = was; }, 1400);
      }else{
        const was = icon ? icon.className : '';
        if(icon) icon.className = 'bi bi-check2';
        btn._t = setTimeout(() => { btn.classList.remove('is-done'); if(icon) icon.className = was; }, 1200);
      }
    };
    const fallback = () => {
      try{
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
      }catch(err){}
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    }else{
      fallback();
    }
  }

  /* The panel, as the owner's mockup lays it out: a head that names the event and its result,
     then Login/Event Information, Device & Location, Technical Details with the record's ids and
     a View JSON toggle, the reason when there is one, and the payload digest.
     Everything shown is a field the row actually carries. The Device & Location group is dropped
     whole when an event has neither a user agent nor a location (operation rows have no user
     agent at all), and "Desktop / Mobile" is the only thing classified rather than read out. */
  function formatWhen(e){
    if(!(e.at instanceof Date)) return '';
    return e.at.getFullYear() + '-' + pad2(e.at.getMonth() + 1) + '-' + pad2(e.at.getDate()) +
      ' ' + formatTime(e.at).time;
  }

  function fillDetail(e){
    const isLogin = e.source === 'login';
    const failed = e.status === 'blocked' || e.status === 'failed';
    const statusLabel = e.status === 'blocked' ? 'Blocked' : (e.status === 'failed' ? 'Failed' : 'Success');
    const when = formatWhen(e);
    const ua = String((e.raw && e.raw.userAgent) || '');
    const client = parseClient(ua);

    if(detailTitle) detailTitle.textContent = e.title || 'Audit Log Detail';
    if(detailStatus){
      detailStatus.textContent = statusLabel;
      detailStatus.className = 'mas-head-status ' + (failed ? 'is-bad' : 'is-ok');
      detailStatus.hidden = false;
    }
    if(detailSub){
      detailSub.textContent = [ e.adminName, when ].filter(Boolean).join('  \u00b7  ');
      detailSub.hidden = !detailSub.textContent;
    }

    if(detailInfoLabel) detailInfoLabel.innerHTML =
      '<i class="bi ' + (isLogin ? 'bi-person' : 'bi-activity') + '"></i> ' +
      (isLogin ? 'Login Information' : 'Event Information');
    if(detailGrid){
      const rows = isLogin
        ? [ [ 'Administrator', e.adminName ], [ 'Username', e.username ],
            [ 'IP Address', e.ip ], [ 'Login Time', when ], [ 'Result', statusLabel ] ]
        : [ [ 'Actor', e.adminName ], [ 'Action', e.title ],
            [ 'Target / Resource', e.target ], [ 'IP Address', e.ip ], [ 'Time & Date', when ] ];
      detailGrid.innerHTML = rows
        .filter(([, v]) => v !== '' && v != null)
        .map(([k, v]) => detailField(k, v, /ip|user agent|target/i.test(k)))
        .join('');
    }

    if(detailDeviceLabel && detailCards){
      const cards = [
        client.os ? card('OS', client.os) : '',
        client.browser ? card('Browser', client.browser) : '',
        ua ? card('Device', /Mobile|Android|iPhone|iPad/i.test(ua) ? 'Mobile' : 'Desktop') : '',
        e.location && e.location !== '\u2014' ? card('Location', e.location) : '',
        ua ? card('User Agent', ua, '', { wide: true, copy: ua }) : ''
      ].filter(Boolean);
      detailCards.innerHTML = cards.join('');
      detailDeviceLabel.hidden = !cards.length;
      detailCards.hidden = !cards.length;
    }

    if(detailIds){
      const raw = e.raw || {};
      const ids = [
        [ 'Event ID', raw.id ], [ 'Admin ID', raw.adminId ], [ 'Brand ID', raw.brandId ]
      ].filter(([, v]) => v != null && v !== '');
      detailIds.innerHTML = ids.length
        ? ids.map(([k, v]) => detailField(k, '#' + v, false)).join('')
        : detailField('Event ID', '\u2014', false);
    }

    if(detailKv){
      const rows = [ [ 'Event Type', e.title ], [ 'Target Resource', e.target ], [ ACTOR_LABEL, e.adminName ] ]
        .concat(Object.entries(e.detail || {}).filter(([k]) => k !== 'Reason'));
      detailKv.innerHTML = rows.map(([k, v]) => detailField(k, v, DETAIL_WIDE_KEY.test(k))).join('');
    }

    /* Reason is only worth a section when there is one — a successful event has no failure
       reason, and an empty labelled box is noise. */
    if(detailReason){
      const reason = String((e.detail && e.detail.Reason) || '').trim();
      detailReason.textContent = reason;
      if(detailReasonBlock) detailReasonBlock.hidden = !reason;
    }

    let rawText = '';
    try{ rawText = JSON.stringify(e.raw || {}, null, 2); }catch(err){ rawText = ''; }
    if(detailRaw) detailRaw.textContent = rawText;
    setPayloadTab('raw');
    setPayloadOpen(false);
    fillHash(rawText);
  }

  /* The ids are the compact summary; the payload is one click away, as in the mockup. */
  function setPayloadOpen(open){
    if(payloadBox) payloadBox.hidden = !open;
    if(jsonToggle){
      jsonToggle.classList.toggle('is-open', !!open);
      jsonToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    if(jsonToggleLabel) jsonToggleLabel.textContent = open ? 'Hide JSON' : 'View JSON';
  }

  /* The row is the control now (the Details column it replaced cost 72px of table width).
     is-active is what says which event the panel is showing. */
  function setActiveRow(id){
    if(!tbody) return;
    tbody.querySelectorAll('tr[data-event-id]').forEach(tr => {
      const on = tr.getAttribute('data-event-id') === String(id);
      tr.classList.toggle('is-active', on);
      if(on){ tr.setAttribute('aria-current', 'true'); } else { tr.removeAttribute('aria-current'); }
    });
  }

  /* Opening the detail takes ~158px out of the table, so the sidebar folds to its 72px rail for
     as long as the panel is open — the owner's own suggestion ("我点开audit log detail后 我的sidebar
     自动收起"), and it is also what lets the filter row stay on one line.
     Two rules keep this from fighting the user or reports.js:
       · it is desktop-only (≤800px the sidebar is an off-canvas drawer, not a column);
       · the saved preference (bo_sidebar_mini) is never written, and the collapse is only undone
         if this code is what collapsed it — so a rail the user chose stays a rail.
     While it is a rail, reports.js's own hover-expand still works, so the nav is one hover away. */
  const MINI_CLASS = 'sidebar-mini';
  function foldSidebar(fold){
    if(!window.matchMedia('(min-width:801px)').matches) return;
    const body = document.body;
    if(fold){
      /* Already a rail because of this panel: keep the marker, or closing cannot undo it.
         (Reading it the other way round — "it is a rail, so the user must want one" — cleared the
         marker on the second row the user clicked, and the sidebar then stayed folded for good.) */
      if(body.dataset.masFolded === '1') return;
      if(body.classList.contains(MINI_CLASS)) return;
      body.dataset.masFolded = '1';
      body.classList.add(MINI_CLASS);
    }else{
      const weFolded = body.dataset.masFolded === '1';
      delete body.dataset.masFolded;
      if(weFolded) body.classList.remove(MINI_CLASS);
    }
  }

  function openDetail(id){
    const e = findEvent(id);
    if(!e || !detailPanel) return;
    if(detailTitle) detailTitle.textContent = 'Audit Log Detail';
    fillDetail(e);
    detailPanel.hidden = false;
    document.body.classList.add('mas-detail-open');
    setActiveRow(e.id);
    foldSidebar(true);
  }

  /* The body is only locked at the full-screen breakpoint (see the ≤1439.98px block in
     bo-security-audit.css) — on desktop the panel is a column, not an overlay, and freezing the
     page behind it would hide anything below the fold. */
  function closeDetail(){
    if(!detailPanel) return;
    detailPanel.hidden = true;
    document.body.classList.remove('mas-detail-open');
    setActiveRow(null);
    foldSidebar(false);
  }

  async function loadAll(){
    if(tbody) tbody.innerHTML = '<tr><td colspan="6" class="mad-empty">Loading audit events...</td></tr>';
    try{
      await loadMerchants();
      let loginErr = null;
      const [logins, ops] = await Promise.all([
        loadLogins().catch(err => { loginErr = err; return []; }),
        loadOperations()
      ]);
      if(!logins.length && !ops.length && loginErr) throw loginErr;
      allEvents = logins.concat(ops).filter(Boolean);
      allEvents.sort((a, b) => {
        const ta = a.at ? a.at.getTime() : 0;
        const tb = b.at ? b.at.getTime() : 0;
        return tb - ta;
      });
      updateKpis(allEvents);
      applyFilters();
    }catch(err){
      allEvents = [];
      filtered = [];
      updateKpis([]);
      if(infoEl) infoEl.textContent = 'Showing 0 records';
      if(tbody) tbody.innerHTML = '<tr><td colspan="6" class="mad-empty text-danger">' + esc(err.message || 'Load audit failed') + '</td></tr>';
      fitTableArea();
    }
  }

  document.querySelectorAll('[data-mas-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      category = btn.getAttribute('data-mas-cat') || 'all';
      document.querySelectorAll('[data-mas-cat]').forEach(b => {
        b.classList.toggle('is-active', b === btn);
      });
      applyFilters();
    });
  });

  let searchTimer = null;
  searchEl && searchEl.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 200);
  });
  eventTypeEl && eventTypeEl.addEventListener('change', applyFilters);
  statusEl && statusEl.addEventListener('change', applyFilters);
  resetBtn && resetBtn.addEventListener('click', () => {
    if(searchEl) searchEl.value = '';
    if(eventTypeEl) eventTypeEl.value = '';
    if(statusEl) statusEl.value = '';
    const [a, b] = presetRange('today');
    pickerState.view = new Date(a + 'T00:00:00');
    pickerState.selectingStart = true;
    setRange(a, b, 'today', false);
    category = 'all';
    document.querySelectorAll('[data-mas-cat]').forEach(b => {
      b.classList.toggle('is-active', b.getAttribute('data-mas-cat') === 'all');
    });
    loadAll();
  });

  initDatePicker();

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      fitTableArea();
      if(pageSizeEl && isAutoPageSize(pageSizeEl.value)){
        autoPageSize = null;
        renderTable();
      }
    }, 120);
  });

  tbody && tbody.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-event-id]');
    if(!tr) return;
    openDetail(tr.getAttribute('data-event-id'));
  });
  /* Keyboard parity: the row carries tabindex, so Enter / Space must open it. The time cell's
     hover tip is focusable too, and it must not be treated as "open this row". */
  tbody && tbody.addEventListener('keydown', e => {
    if(e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    const tr = e.target.closest('tr[data-event-id]');
    if(!tr) return;
    e.preventDefault();
    openDetail(tr.getAttribute('data-event-id'));
  });

  document.querySelectorAll('[data-mas-close]').forEach(btn => btn.addEventListener('click', closeDetail));
  rawCopyBtn && rawCopyBtn.addEventListener('click', () => {
    copyText(detailRaw ? detailRaw.textContent || '' : '', rawCopyBtn);
  });
  /* One delegated handler for everything inside the panel that is rebuilt per event: the copy
     buttons on the IP / User Agent cards, and the payload's two tabs. */
  detailPanel && detailPanel.addEventListener('click', e => {
    const copyBtn = e.target.closest('[data-mas-copy]');
    if(copyBtn){ copyText(copyBtn.getAttribute('data-mas-copy'), copyBtn); return; }
    const tab = e.target.closest('[data-mas-tab]');
    if(tab){ setPayloadTab(tab.getAttribute('data-mas-tab')); return; }
    if(e.target.closest('#masJsonToggle')) setPayloadOpen(!!(payloadBox && payloadBox.hidden));
  });
  document.addEventListener('keydown', e => {
    if(e.key !== 'Escape') return;
    if(detailPanel && !detailPanel.hidden) closeDetail();
  });
  pagerEl && pagerEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-page]');
    if(!btn || btn.disabled) return;
    const next = Number(btn.getAttribute('data-page'));
    if(!next || next === page) return;
    page = next;
    renderTable();
    if(tableScroll) tableScroll.scrollTop = 0;
  });
  pageSizeEl && pageSizeEl.addEventListener('change', () => {
    autoPageSize = null;
    page = 1;
    renderTable();
    if(tableScroll) tableScroll.scrollTop = 0;
  });

  fitTableArea();
  loadAll().then(() => requestAnimationFrame(() => {
    fitTableArea();
    /* The auto-fill count from the very first renderTable() (above, inside loadAll) was
       measured against the "Loading audit events..." placeholder row, not a real one, and
       against layout metrics taken before fonts/icons had their final size. Once real rows
       exist and the frame has settled, drop that guess and remeasure — the same recovery the
       resize handler already performs. */
    if(pageSizeEl && isAutoPageSize(pageSizeEl.value)){
      autoPageSize = null;
      page = 1;
      renderTable();
    }
  }));
})();


/* --------------------------------------------------------------------------
   Time & Date float tip.
   The cell's own ::after tip cannot be used in this table: the header and body are two
   separate tables (`.mas-table-head` outside, `.mas-table-body-scroll` scrolling), so the
   first row sits flush with the scroller's top edge and a tip drawn above it is cut off —
   and an overflow clip is not something z-index can paint over. A fixed-position element
   escapes the clip and the header both, which is what gives the list pages' look here.
   Borrows the shared `.mad-float-tip` look (styled for these pages in
   main-admin-detail-executive.css) and flips below the cell when there is no room above.
   -------------------------------------------------------------------------- */
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
  function hide(){
    host = null;
    if(tip){ tip.classList.remove('is-on'); tip.classList.remove('is-below'); }
  }
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
    var below = above < 8;                       /* no room above -> flip under the cell */
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
