(function(){
  'use strict';

  /* A swap re-runs this file against a fresh frame, so every document/window binding below was
     added again on each entry: N entries meant N keydown/click/resize handlers and N tooltip
     handlers, and the sync-label interval started another timer on every visit. Release the
     previous run's bindings first; the handlers then always close over the frame on screen. */
  if(window.__boMadUnbind) window.__boMadUnbind();
  const unbinds=[];
  const listen=(target,type,fn,opt)=>{ target.addEventListener(type,fn,opt); unbinds.push(()=>target.removeEventListener(type,fn,opt)); };
  window.__boMadUnbind=()=>{ unbinds.forEach(fn=>fn()); unbinds.length=0; };

  function pageButtons(current, total){
    total = Math.max(1, Number(total) || 1);
    current = Math.max(1, Math.min(Number(current) || 1, total));
    const pages = [];
    const add = n => { if(n >= 1 && n <= total && !pages.includes(n)) pages.push(n); };
    add(1);
    for(let n = current - 2; n <= current + 2; n++) add(n);
    add(total);
    pages.sort((a, b) => a - b);
    let html = '';
    html += '<button type="button" class="smart-page nav-text" data-page="' + Math.max(1, current - 1) + '" ' + (current <= 1 ? 'disabled' : '') + '>Previous</button>';
    let prev = 0;
    pages.forEach(n => {
      if(prev && n - prev > 1) html += '<span class="smart-page-ellipsis">…</span>';
      html += '<button type="button" class="smart-page ' + (n === current ? 'active' : '') + '" data-page="' + n + '" ' + (n === current ? 'aria-current="page"' : '') + '>' + n + '</button>';
      prev = n;
    });
    html += '<button type="button" class="smart-page nav-text" data-page="' + Math.min(total, current + 1) + '" ' + (current >= total ? 'disabled' : '') + '>Next</button>';
    return html;
  }

  const tbody = document.getElementById('madTableBody');
  const searchInput = document.getElementById('madSearchInput');
  const roleFilter = document.getElementById('madRoleFilter');
  const statusFilter = document.getElementById('madStatusFilter');
  const resetBtn = document.getElementById('madResetBtn');
  const exportBtn = document.getElementById('madExportBtn');
  const pageSizeEl = document.getElementById('madEntriesPageSize');
  let pageSize = 10;
  let autoPageSize = null;
  const pageNoEl = document.getElementById('madPager');
  const infoEl = document.getElementById('madTableInfo');
  const syncLabel = document.getElementById('madSyncLabel');

  let resetPasswordId = null;
  let resetPasswordRow = null;
  let resetPassLastFocus = null;
  let roleMap = {};
  let allAdmins = [];
  let filteredAdmins = [];
  let currentPage = 1;
  let statusPill = 'active';
  let lastSyncedAt = null;
  const selectedAdminIds = new Set();
  const selectAllInput = document.getElementById('madSelectAll');
  const selectAllWrap = document.getElementById('madSelectAllWrap');
  const bulkDeleteBtn = document.getElementById('madBulkDeleteBtn');

  function isAutoPageSize(value){
    const v = String(value == null ? '-' : value).trim();
    return v === '' || v === '-' || /^auto$/i.test(v);
  }

  function measureAutoPageSize(){
    const wrap = document.querySelector('.mad-table-wrap');
    if(!wrap) return 10;
    const head = wrap.querySelector('thead');
    const sample = wrap.querySelector('tbody tr:not(.mad-empty) td');
    const rowHeight = sample ? Math.max(36, Math.round(sample.closest('tr').getBoundingClientRect().height)) : 44;
    const available = Math.max(0, Math.floor(wrap.clientHeight) - (head ? Math.ceil(head.getBoundingClientRect().height) : 0));
    /* Floor only — never add a row that would overflow and clip. Leftover seam
       (< one row height) is stretched evenly by evenFillRowHeights(). */
    return Math.max(5, Math.min(200, Math.floor(available / rowHeight) || 10));
  }

  function resetEvenFill(){
    if(!tbody) return;
    const wrap = document.querySelector('.mad-table-wrap');
    const table = tbody.closest('table');
    if(table){
      table.classList.remove('bo-tx-evenfill');
      table.style.height = '';
    }
    if(wrap) wrap.removeAttribute('data-bo-autofit');
    [...tbody.querySelectorAll('tr')].forEach(tr => {
      tr.style.height = '';
      tr.querySelectorAll('td').forEach(td => { td.style.height = ''; td.style.minHeight = ''; });
    });
  }

  /* Show `-`: stretch leftover seam across painted rows when gap < one full row height. */
  function evenFillRowHeights(){
    if(!tbody) return;
    const wrap = document.querySelector('.mad-table-wrap');
    if(!wrap) return;
    resetEvenFill();
    if(!pageSizeEl || !isAutoPageSize(pageSizeEl.value)) return;
    const table = tbody.closest('table');
    if(!table) return;
    const rows = [...tbody.querySelectorAll('tr.mad-row')];
    if(!rows.length) return;
    void table.offsetHeight;
    const head = wrap.querySelector('thead');
    const avail = Math.max(0, Math.floor(wrap.clientHeight) - (head ? Math.ceil(head.getBoundingClientRect().height) : 0));
    const natural = rows.reduce((sum, tr) => sum + Math.ceil(tr.getBoundingClientRect().height), 0);
    const rowH = Math.max(36, Math.round(natural / rows.length) || 44);
    if(natural > avail + 1 && autoPageSize != null && autoPageSize > 5){
      autoPageSize = Math.max(5, autoPageSize - 1);
      renderAdmins();
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
    table.style.height = (avail + (head ? Math.ceil(head.getBoundingClientRect().height) : 0)) + 'px';
    wrap.setAttribute('data-bo-autofit', '');
    if(wrap.scrollHeight > wrap.clientHeight){
      const over = wrap.scrollHeight - wrap.clientHeight;
      const shrink = Math.ceil(over / rows.length) || 1;
      rows.forEach(tr => {
        const h = Math.max(rowH, (parseFloat(tr.style.height) || base) - shrink);
        tr.style.height = h + 'px';
        tr.querySelectorAll('td').forEach(td => { td.style.height = h + 'px'; });
      });
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
    return Number.isFinite(n) && n > 0 ? n : 10;
  }

  const resetPassModal = document.getElementById('madResetPasswordModal');
  if(resetPassModal){ resetPassModal.classList.remove('show'); resetPassModal.setAttribute('aria-hidden', 'true'); }
  document.body.classList.remove('modal-open');

  function modalFocusables(root){
    if(!root) return [];
    return Array.from(root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(el => el.offsetParent !== null || el === document.activeElement);
  }

  function setStatus(el, message, type){
    if(!el) return;
    el.textContent = message || '';
    el.className = 'upload-status mb-3 ' + (type || '');
  }

  function dt(value){
    if(!value) return '-';
    try{
      const d = new Date(value);
      if(isNaN(d.getTime())) return String(value).replace('T', ' ').replace(/\.\d+.*$/, '');
      const pad = n => String(n).padStart(2, '0');
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }catch(e){ return String(value || '-'); }
  }

  function relativeSync(from){
    if(!from) return 'Synced just now';
    const sec = Math.max(0, Math.floor((Date.now() - from.getTime()) / 1000));
    if(sec < 8) return 'Synced just now';
    if(sec < 60) return 'Synced ' + sec + 's ago';
    const min = Math.floor(sec / 60);
    if(min < 60) return 'Synced ' + min + 'm ago';
    return 'Synced ' + Math.floor(min / 60) + 'h ago';
  }

  function updateSyncLabel(){
    if(!syncLabel) return;
    syncLabel.innerHTML = '<i class="bi bi-arrow-repeat" aria-hidden="true"></i> ' + relativeSync(lastSyncedAt);
  }

  function relativeTime(value){
    if(!value) return '-';
    const d = new Date(value);
    if(isNaN(d.getTime())) return '-';
    const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
    if(sec < 45) return 'Just now';
    if(sec < 3600) return Math.floor(sec / 60) + ' mins ago';
    if(sec < 86400) return Math.floor(sec / 3600) + ' hrs ago';
    if(sec < 86400 * 7) return Math.floor(sec / 86400) + ' days ago';
    return dt(value);
  }

  function timeOnly(value){
    if(!value) return '-';
    try{
      const d = new Date(value);
      if(isNaN(d.getTime())) return '-';
      const pad = n => String(n).padStart(2, '0');
      return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }catch(e){ return '-'; }
  }

  function dateDdMmYyyy(value){
    if(!value) return '';
    try{
      const d = new Date(value);
      if(isNaN(d.getTime())) return '';
      const pad = n => String(n).padStart(2, '0');
      return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
    }catch(e){ return ''; }
  }

  function timeWithDateTip(value){
    if(!value) return '<span class="mad-muted">-</span>';
    const t = timeOnly(value);
    if(t === '-') return '<span class="mad-muted">-</span>';
    const date = dateDdMmYyyy(value);
    if(!date) return '<span class="mad-time">' + esc(t) + '</span>';
    return '<span class="mad-time mad-time-tip" data-date="' + esc(date) + '" tabindex="0">' + esc(t) + '</span>';
  }

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function initials(row){
    const name = String(row.displayName || row.username || 'A').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if(parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    return (name.substring(0, 2) || 'AD').toUpperCase();
  }

  function roleName(row){
    return roleMap[String(row.roleId)] || row.roleName || row.role || (Number(row.roleId) === 1 ? 'Super Admin' : 'Admin');
  }

  function roleTone(name){
    const n = String(name || '').toLowerCase();
    if(n.includes('support') || n.includes('cs ')) return 'is-support';
    if(n.includes('regional')) return 'is-regional';
    if(n.includes('super') || n.includes('root') || n.includes('master') || n.includes('main')) return 'is-super';
    if(n.includes('partner')) return 'is-partner';
    if(n.includes('risk')) return 'is-risk';
    if(n.includes('tech')) return 'is-tech';
    if(n.includes('merchant') || n.includes('brand') || n.includes('sub')) return 'is-merchant';
    return '';
  }

  function isActive(row){
    return Number(row.status == null ? 1 : row.status) === 1;
  }

  function creditBalance(row){
    const v = row.creditBalance != null ? row.creditBalance : (row.credit != null ? row.credit : null);
    if(v == null || v === '') return '-';
    const n = Number(v);
    if(isNaN(n)) return esc(String(v));
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function creditBalanceNumber(row){
    const v = row && (row.creditBalance != null ? row.creditBalance : row.credit);
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  const adjustModal = document.getElementById('macAdjustModal');
  const adjustForm = document.getElementById('macAdjustForm');
  const adjustStatus = document.getElementById('macAdjustStatus');
  const adjustAction = document.getElementById('macAdjustAction');
  const adjustAmount = document.getElementById('macAdjustAmount');
  const adjustRemark = document.getElementById('macAdjustRemark');
  const adjustId = document.getElementById('macAdjustId');
  const adjustCurrent = document.getElementById('macAdjustCurrent');
  let adjustLastFocus = null;

  function openCreditAdjust(id){
    const row = allAdmins.find(r => Number(r.id) === Number(id));
    if(!row){ BO_DIALOG.alert('Administrator not found'); return; }
    adjustLastFocus = document.activeElement;
    if(adjustStatus){ adjustStatus.textContent = ''; adjustStatus.className = 'upload-status mb-3'; }
    if(adjustId) adjustId.value = String(row.id);
    if(adjustCurrent) adjustCurrent.value = String(creditBalanceNumber(row));
    const avatar = document.getElementById('macAdjustAvatar');
    const nameEl = document.getElementById('macAdjustName');
    const uidEl = document.getElementById('macAdjustUid');
    const balEl = document.getElementById('macAdjustBalance');
    const summary = document.getElementById('macAdjustSummary');
    if(avatar) avatar.textContent = initials(row);
    if(nameEl) nameEl.textContent = row.displayName || row.username || '—';
    if(uidEl) uidEl.textContent = uidLabel(row);
    if(balEl) balEl.textContent = creditBalance(row);
    if(summary) summary.classList.add('has-account');
    if(adjustAction){
      adjustAction.value = 'ADD';
      adjustAction.dispatchEvent(new Event('bo:select-sync', { bubbles: true }));
    }
    if(adjustAmount) adjustAmount.value = '';
    if(adjustRemark) adjustRemark.value = '';
    if(adjustModal){
      adjustModal.classList.add('show', 'is-account-locked');
      adjustModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
    }
    if(adjustAmount) setTimeout(function(){ adjustAmount.focus(); }, 40);
  }

  function closeCreditAdjust(){
    if(adjustModal){
      adjustModal.classList.remove('show');
      adjustModal.setAttribute('aria-hidden', 'true');
    }
    if(!document.querySelector('.modal-clean.show')) document.body.classList.remove('modal-open');
    if(adjustLastFocus && typeof adjustLastFocus.focus === 'function'){
      try{ adjustLastFocus.focus(); }catch(e){}
    }
    adjustLastFocus = null;
  }

  function lastActive(row){
    return row.lastActiveAt || row.lastActive || row.lastLoginAt || row.lastLogin || row.loginAt || '';
  }

  function lastLogout(row){
    return row.lastLogoutAt || row.lastLogout || '';
  }

  function uidLabel(row){
    if(row.uid) return '#' + String(row.uid).replace(/^#/, '');
    return '#UID-' + (row.id != null ? row.id : '-');
  }

  function emailLabel(row){
    return row.email || '';
  }

  function isViewerRoot(viewer){
    viewer = viewer || BO_AUTH.user() || {};
    return viewer.rootAdmin === true || Number(viewer.rootAdmin) === 1 || String(viewer.roleType || '').toUpperCase() === 'ROOT' || (Number(viewer.id) === 1 && viewer.brandId == null);
  }

  function isViewerMain(viewer){
    viewer = viewer || BO_AUTH.user() || {};
    return String(viewer.roleType || '').toUpperCase() === 'MAIN' || viewer.mainAdmin === true || Number(viewer.mainAdmin) === 1;
  }

  async function apiJson(url, options){
    const res = await fetch(url, options || {});
    const json = await res.json().catch(() => ({}));
    if(!res.ok || json.status === 'error') throw new Error(json.message || 'Request failed');
    return json;
  }

  async function loadRoles(brandId){
    try{
      const current = BO_AUTH.user() || {};
      const headers = { ...BO_AUTH.authHeader() };
      if(brandId) headers['X-Brand-Id'] = String(brandId);
      const roleUrl = isViewerMain(current) && BO_AUTH.roleListAllUrl ? BO_AUTH.roleListAllUrl() : BO_AUTH.roleListUrl();
      const json = await apiJson(roleUrl, { headers });
      let rows = Array.isArray(json.data) ? json.data : [];
      if(isViewerMain(current)){
        // MAIN/Boss role filters match Create/Edit Admin: every active platform/global role
        // except ROOT and Merchant Brand Owner roles.
        rows = rows.filter(r => {
          const type = String(r.roleType || '').toUpperCase();
          return type !== 'ROOT' && type !== 'BRAND_OWNER' && Number(r.status == null ? 1 : r.status) === 1;
        });
      }else if(current.rootAdmin){
        rows = brandId
          ? rows.filter(r => Number(r.brandId) === Number(brandId) && !['MASTER', 'ROOT'].includes(String(r.roleType || '').toUpperCase()))
          : rows.filter(r => r.brandId == null && String(r.roleType || '').toUpperCase() === 'MASTER');
      }else{
        rows = rows.filter(r => !['MASTER', 'ROOT'].includes(String(r.roleType || 'CUSTOM').toUpperCase()));
      }
      roleMap = Object.assign(roleMap, Object.fromEntries(rows.map(r => [String(r.id), r.name || r.code])));
      const html = rows.map(r => '<option value="' + esc(r.id) + '">' + esc(r.name || r.code) + (r.roleType === 'BRAND_OWNER' ? ' (Owner)' : '') + '</option>').join('')
        || '<option value="">No role available for this selection</option>';
      if(roleFilter) roleFilter.innerHTML = '<option value="">All Roles</option>' + html;
      sizeAdminFilterSelects();
      requestAnimationFrame(sizeAdminFilterSelects);
      return rows;
    }catch(e){
      if(roleFilter) roleFilter.innerHTML = '<option value="">Unable to load roles</option>';
      return [];
    }
  }

  function updatePillCounts(){
    const total = allAdmins.length;
    const active = allAdmins.filter(isActive).length;
    const suspended = total - active;
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    set('madCountAll', total);
    set('madCountActive', active);
    set('madCountSuspended', suspended);
  }

  function applyFilters(){
    const q = (searchInput && searchInput.value || '').trim().toLowerCase();
    const role = roleFilter && roleFilter.value || '';
    const statusSelect = statusFilter && statusFilter.value || '';
    filteredAdmins = allAdmins.filter(row => {
      const hay = [row.username, row.displayName, row.email, uidLabel(row), roleName(row)].join(' ').toLowerCase();
      if(q && !hay.includes(q)) return false;
      if(role && String(row.roleId || '') !== String(role)) return false;
      const active = isActive(row);
      if(statusPill === 'active' && !active) return false;
      if(statusPill === 'suspended' && active) return false;
      if(statusSelect !== '' && String(row.status == null ? 1 : row.status) !== String(statusSelect)) return false;
      return true;
    });
    currentPage = 1;
    renderAdmins();
  }

  function selectableIdsOnPage(){
    return [...tbody.querySelectorAll('[data-admin-select]')].map(el => String(el.getAttribute('data-admin-select')));
  }

  function syncSelectionUi(){
    const showSelect = statusPill === 'suspended' || statusPill === 'all';
    const isActiveView = statusPill === 'active';
    document.body.classList.toggle('mad-view-active', isActiveView);
    document.body.classList.toggle('mad-view-suspended', statusPill === 'suspended');
    document.body.classList.toggle('mad-view-all', statusPill === 'all');
    if(resetBtn) resetBtn.hidden = isActiveView;
    if(selectAllWrap) selectAllWrap.hidden = !showSelect;
    if(bulkDeleteBtn){
      bulkDeleteBtn.hidden = !showSelect;
      bulkDeleteBtn.disabled = !showSelect || selectedAdminIds.size === 0;
    }
    if(!showSelect){
      if(selectAllInput){
        selectAllInput.checked = false;
        selectAllInput.indeterminate = false;
      }
      return;
    }
    const ids = selectableIdsOnPage();
    const selectedOnPage = ids.filter(id => selectedAdminIds.has(id));
    if(selectAllInput){
      selectAllInput.checked = ids.length > 0 && selectedOnPage.length === ids.length;
      selectAllInput.indeterminate = selectedOnPage.length > 0 && selectedOnPage.length < ids.length;
    }
  }

  function clearAdminSelection(){
    selectedAdminIds.clear();
    syncSelectionUi();
  }

  function renderAdmins(){
    if(!tbody) return;
    pageSize = resolvePageSize();
    const total = filteredAdmins.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
    currentPage = Math.max(1, Math.min(currentPage, totalPages));
    const start = (currentPage - 1) * pageSize;
    const rows = filteredAdmins.slice(start, start + pageSize);
    if(pageNoEl) pageNoEl.innerHTML = pageButtons(currentPage, totalPages);
    if(infoEl){
      infoEl.textContent = total
        ? ('Showing ' + (start + 1) + ' to ' + (start + rows.length) + ' of ' + total + ' administrators')
        : 'Showing 0 to 0 of 0 administrators';
    }
    if(!rows.length){
      resetEvenFill();
      tbody.innerHTML = '<tr><td colspan="9" class="mad-empty">No administrators found.</td></tr>';
      syncSelectionUi();
      return;
    }
    const currentId = Number((BO_AUTH.user() || {}).id);
    const viewerRoot = isViewerRoot();
    tbody.innerHTML = rows.map(row => {
      const active = isActive(row);
      const current = Number(row.id) === currentId;
      const protectedRoot = Number(row.id) === 1 && !viewerRoot;
      const rn = roleName(row);
      const credit = creditBalance(row);
      const logout = lastLogout(row);
      const email = emailLabel(row);
      const creditNum = creditBalanceNumber(row);
      const creditHtml = credit === '-'
        ? '<span class="mad-muted">-</span>'
        : ('<span class="mad-money' + (creditNum > 0 ? ' is-positive' : ' is-zero') + '">' + credit + '</span>');
      const moreBtn = '<button type="button" class="mad-more-btn" aria-expanded="false" aria-label="Show details"><i class="bi bi-chevron-down" aria-hidden="true"></i></button>';
      const rowAttr = JSON.stringify(row).replace(/'/g, '&#39;');
      const canDelete = !active && !protectedRoot && !current;
      const idStr = String(row.id);
      const showSelectCol = statusPill === 'suspended' || statusPill === 'all';
      const checked = canDelete && selectedAdminIds.has(idStr) ? ' checked' : '';
      const selectHtml = !showSelectCol
        ? ''
        : (canDelete
          ? '<label class="mad-row-check"><input type="checkbox" class="mad-row-check-input" data-admin-select="' + esc(row.id) + '"' + checked + ' aria-label="Select ' + esc(row.displayName || row.username || 'administrator') + '"><span class="mad-row-check-box" aria-hidden="true"></span></label>'
          : '<span class="mad-row-check mad-row-check-spacer" aria-hidden="true"></span>');
      const deleteBtn = canDelete
        ? '<button class="mad-icon-btn mad-delete-btn is-danger" type="button" data-tip="Delete" aria-label="Delete" data-id="' + esc(row.id) + '"><i class="bi bi-trash3" aria-hidden="true"></i></button>'
        : '';
      const youBadge = current ? '<span class="mad-you">You</span>' : '';
      return '<tr class="mad-row' + (canDelete ? ' is-suspended-row' : '') + (current ? ' is-self' : '') + '">' +
        '<td data-label="Username"><div class="mad-user">' + selectHtml + '<span class="mad-avatar' + (current ? ' is-self' : '') + '">' + esc(initials(row)) + '</span><div class="mad-user-copy"><b>' + esc(row.displayName || row.username || '-') + '</b>' + youBadge + (email ? '<div class="mad-user-meta"><span class="mad-email">' + esc(email) + '</span></div>' : '') + '</div></div></td>' +
        '<td data-label="Role"><span class="mad-role ' + roleTone(rn) + '">' + esc(rn) + '</span></td>' +
        '<td data-label="Credit Balance">' + creditHtml + '</td>' +
        '<td class="mad-detail" data-label="Last Active">' + esc(relativeTime(lastActive(row))) + '</td>' +
        '<td data-label="Status">' + (protectedRoot
          ? '<span class="mad-status ' + (active ? 'is-active' : 'is-suspended') + '" title="Root account cannot be modified by non-root administrators"><i></i>' + (active ? 'Active' : 'Suspended') + '</span>'
          : '<button type="button" class="mad-status mad-toggle-btn ' + (active ? 'is-active' : 'is-suspended') + '" data-id="' + esc(row.id) + '" data-status="' + (active ? 0 : 1) + '" title="' + (active ? 'Click to Suspend' : 'Click to Activate') + '" aria-label="' + (active ? 'Active, click to Suspend' : 'Suspended, click to Activate') + '"><i></i>' + (active ? 'Active' : 'Suspended') + '</button>') + '</td>' +
        '<td class="mad-detail" data-label="Created By">' + esc(row.createdByName || row.createdByUsername || row.createdBy || row.creator || '-') + '</td>' +
        '<td class="mad-time mad-detail" data-label="Last Login">' + timeWithDateTip(row.lastLoginAt || row.lastLogin || row.loginAt) + '</td>' +
        '<td class="mad-time mad-detail" data-label="Last Logout">' + timeWithDateTip(logout) + '</td>' +
        '<td data-label="Actions"><div class="mad-actions">' + moreBtn + (protectedRoot
          ? '<span class="mad-status is-active" title="Root account cannot be modified by non-root administrators">Protected</span>'
          : '<button class="mad-icon-btn mad-credit-btn" type="button" data-tip="Add credit" aria-label="Add credit" data-id="' + esc(row.id) + '"><i class="bi bi-plus-lg" aria-hidden="true"></i></button>' +
            '<button class="mad-icon-btn mad-key-btn" type="button" data-tip="Reset password" aria-label="Reset password" data-id="' + esc(row.id) + '" data-row=\'' + rowAttr + '\'><i class="bi bi-key" aria-hidden="true"></i></button>' +
            '<button class="mad-icon-btn mad-edit-btn" type="button" data-tip="Edit" aria-label="Edit" data-id="' + esc(row.id) + '" data-row=\'' + rowAttr + '\'><i class="bi bi-pencil" aria-hidden="true"></i></button>' +
            deleteBtn) +
        '</div></td>' +
      '</tr>';
    }).join('');
    syncSelectionUi();
    scheduleEvenFill();
  }

  async function loadBrandOptions(){
    const user = BO_AUTH.user() || {};
    // Admin Management under MAIN is platform-scoped. A CS/Leader/etc created by MAIN
    // can operate across Merchants according to its assigned menu/role permissions and
    // delegated credit limit; it must never be pinned to the currently selected Brand.
    if(isViewerMain(user)){
      await loadRoles(null);
      return;
    }
    await loadRoles(user.brandId ? Number(user.brandId) : null);
  }

  async function loadAdmins(){
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" class="mad-empty">Loading administrators...</td></tr>';
    try{
      const json = await apiJson(BO_AUTH.adminListUrl(), { headers: { ...BO_AUTH.authHeader() } });
      allAdmins = Array.isArray(json.data) ? json.data : [];
      lastSyncedAt = new Date();
      updateSyncLabel();
      updatePillCounts();
      applyFilters();
    }catch(err){
      allAdmins = [];
      filteredAdmins = [];
      currentPage = 1;
      if(pageNoEl) pageNoEl.innerHTML = pageButtons(1, 1);
      if(infoEl) infoEl.textContent = 'Showing 0 to 0 of 0 administrators';
      tbody.innerHTML = '<tr><td colspan="9" class="mad-empty text-danger">' + esc(err.message || 'Load admin failed') + '</td></tr>';
    }
  }

  function openEdit(btn){
    let row = {};
    try{ row = JSON.parse(btn.getAttribute('data-row') || '{}'); }catch(err){}
    const id = Number(row.id || btn.dataset.id || 0);
    if(!id){ BO_DIALOG.alert('Missing admin ID'); return; }
    location.href = 'main-admin-edit.html?id=' + encodeURIComponent(String(id));
  }

  function generatePassword(len){
    len = Math.max(12, Number(len) || 14);
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%&*?';
    const all = upper + lower + digits + symbols;
    const pick = (set) => set[Math.floor(Math.random() * set.length)];
    const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
    while(chars.length < len) chars.push(pick(all));
    for(let i = chars.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      const t = chars[i]; chars[i] = chars[j]; chars[j] = t;
    }
    return chars.join('');
  }

  function openResetPassword(btn){
    let row = {};
    try{ row = JSON.parse(btn.getAttribute('data-row') || '{}'); }catch(err){}
    const id = Number(row.id || btn.dataset.id || 0);
    if(!id){ BO_DIALOG.alert('Missing admin ID'); return; }
    resetPasswordId = id;
    resetPasswordRow = row.id ? row : (allAdmins.find(r => Number(r.id) === id) || {});
    resetPassLastFocus = document.activeElement;
    const a = document.getElementById('madResetNewPassword');
    const b = document.getElementById('madResetConfirmPassword');
    if(a){ a.value = ''; a.type = 'password'; }
    if(b){ b.value = ''; b.type = 'password'; }
    resetPassModal && resetPassModal.querySelectorAll('[data-toggle-password]').forEach(function(eye){
      eye.setAttribute('aria-pressed', 'false');
      eye.setAttribute('aria-label', 'Show password');
      const icon = eye.querySelector('i');
      if(icon) icon.className = 'bi bi-eye';
    });
    setStatus(document.getElementById('madResetPassStatus'), '', '');
    const sub = document.getElementById('madResetPassSub');
    if(sub){
      const name = resetPasswordRow.displayName || resetPasswordRow.username || ('UID-' + id);
      sub.textContent = 'Set a new password for ' + name + '.';
    }
    if(resetPassModal){
      resetPassModal.classList.add('show');
      resetPassModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
    }
    if(a) setTimeout(function(){ a.focus(); }, 30);
  }

  function closeResetPassword(){
    if(resetPassModal){
      resetPassModal.classList.remove('show');
      resetPassModal.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('modal-open');
    resetPasswordId = null;
    resetPasswordRow = null;
    const restore = resetPassLastFocus;
    resetPassLastFocus = null;
    if(restore && typeof restore.focus === 'function'){
      setTimeout(function(){ try{ restore.focus(); }catch(e){} }, 0);
    }
  }

  document.querySelectorAll('[data-mad-close-pass]').forEach(btn => btn.addEventListener('click', closeResetPassword));
  resetPassModal && resetPassModal.addEventListener('click', e => { if(e.target === resetPassModal) closeResetPassword(); });
  document.querySelectorAll('[data-mac-close]').forEach(btn => btn.addEventListener('click', closeCreditAdjust));
  adjustModal && adjustModal.addEventListener('click', e => { if(e.target === adjustModal) closeCreditAdjust(); });
  adjustForm && adjustForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const id = adjustId && adjustId.value;
    const action = String(adjustAction && adjustAction.value || 'ADD').toUpperCase();
    const amount = Number(adjustAmount && adjustAmount.value);
    if(!id){ if(adjustStatus){ adjustStatus.textContent = 'Missing account.'; adjustStatus.className = 'upload-status mb-3 error'; } return; }
    if(!['ADD','DEDUCT'].includes(action)){
      if(adjustStatus){ adjustStatus.textContent = 'Select Add Credit or Minus Credit.'; adjustStatus.className = 'upload-status mb-3 error'; }
      return;
    }
    if(!Number.isFinite(amount) || amount <= 0){
      if(adjustStatus){ adjustStatus.textContent = 'Enter an amount greater than 0.'; adjustStatus.className = 'upload-status mb-3 error'; }
      return;
    }
    const row = allAdmins.find(x => Number(x.id) === Number(id));
    if(action === 'DEDUCT' && row && amount > creditBalanceNumber(row)){
      if(adjustStatus){ adjustStatus.textContent = 'Minus amount cannot exceed the current credit balance.'; adjustStatus.className = 'upload-status mb-3 error'; }
      return;
    }
    const submit = document.getElementById('macAdjustSubmit');
    if(submit) submit.disabled = true;
    if(adjustStatus){ adjustStatus.textContent = action === 'ADD' ? 'Adding credit...' : 'Subtracting credit...'; adjustStatus.className = 'upload-status mb-3'; }
    try{
      const remark = (adjustRemark && adjustRemark.value || '').trim();
      const body = { action, amount, remark: remark || undefined };
      const audit = encodeURIComponent(JSON.stringify({page:'Main Admin > Administrators',fields:{adminId:id,action,amount,remark:remark||''}}));
      await apiJson(API_CONFIG.BASE_URL + '/admin/main/admin-credit/adjust/' + encodeURIComponent(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Audit-Context': audit, ...BO_AUTH.authHeader() },
        body: JSON.stringify(body)
      });
      if(adjustStatus){ adjustStatus.textContent = action === 'ADD' ? 'Credit added.' : 'Credit deducted.'; adjustStatus.className = 'upload-status mb-3 success'; }
      await loadAdmins();
      setTimeout(closeCreditAdjust, 450);
    }catch(err){
      if(adjustStatus){ adjustStatus.textContent = err.message || 'Adjustment failed'; adjustStatus.className = 'upload-status mb-3 error'; }
    }finally{
      if(submit) submit.disabled = false;
    }
  });
  listen(document,'keydown', function(e){
    if(e.key !== 'Escape') return;
    if(adjustModal && adjustModal.classList.contains('show')) closeCreditAdjust();
  });
  document.getElementById('madResetGeneratePassword')?.addEventListener('click', function(){
    const pwd = generatePassword(14);
    const a = document.getElementById('madResetNewPassword');
    const b = document.getElementById('madResetConfirmPassword');
    if(a){ a.type = 'text'; a.value = pwd; }
    if(b){ b.type = 'text'; b.value = pwd; }
    setStatus(document.getElementById('madResetPassStatus'), 'Strong password generated. Copy it before applying.', 'success');
  });
  document.getElementById('madResetPassApply')?.addEventListener('click', async function(){
    if(!resetPasswordId){ BO_DIALOG.alert('Missing admin ID'); return; }
    const pass = (document.getElementById('madResetNewPassword') || {}).value || '';
    const confirm = (document.getElementById('madResetConfirmPassword') || {}).value || '';
    const statusEl = document.getElementById('madResetPassStatus');
    if(!pass){ setStatus(statusEl, 'Please enter a new password.', 'error'); return; }
    if(pass.length < 8){ setStatus(statusEl, 'Password must be at least 8 characters.', 'error'); return; }
    if(pass !== confirm){ setStatus(statusEl, 'Confirm password does not match.', 'error'); return; }
    const row = resetPasswordRow || allAdmins.find(r => Number(r.id) === Number(resetPasswordId)) || {};
    const applyBtn = document.getElementById('madResetPassApply');
    if(applyBtn) applyBtn.disabled = true;
    setStatus(statusEl, 'Updating password...', '');
    try{
      const json = await apiJson(BO_AUTH.adminUpdateUrl(resetPasswordId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...BO_AUTH.authHeader() },
        body: JSON.stringify({
          username: row.username || '',
          displayName: row.displayName || row.username || '',
          status: row.status == null ? 1 : Number(row.status),
          roleId: row.roleId != null ? Number(row.roleId) : null,
          brandId: row.brandId != null ? Number(row.brandId) : null,
          password: pass
        })
      });
      closeResetPassword();
      await BO_DIALOG.alert(json.message || 'Password updated successfully');
      await loadAdmins();
    }catch(err){
      setStatus(statusEl, err.message || 'Update password failed', 'error');
    }finally{
      if(applyBtn) applyBtn.disabled = false;
    }
  });
  listen(document,'keydown', function(e){
    if(!resetPassModal || !resetPassModal.classList.contains('show')) return;
    if(e.key === 'Escape'){
      e.preventDefault();
      closeResetPassword();
      return;
    }
    if(e.key !== 'Tab') return;
    const nodes = modalFocusables(resetPassModal);
    if(!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if(e.shiftKey && document.activeElement === first){
      e.preventDefault();
      last.focus();
    }else if(!e.shiftKey && document.activeElement === last){
      e.preventDefault();
      first.focus();
    }
  });

  document.querySelectorAll('[data-mad-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      statusPill = btn.getAttribute('data-mad-status') || 'all';
      document.querySelectorAll('[data-mad-status]').forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      if(statusPill !== 'suspended' && statusPill !== 'all') clearAdminSelection();
      applyFilters();
    });
  });

  tbody && tbody.addEventListener('change', function(e){
    const input = e.target.closest && e.target.closest('[data-admin-select]');
    if(!input) return;
    const id = String(input.getAttribute('data-admin-select') || '');
    if(!id) return;
    if(input.checked) selectedAdminIds.add(id);
    else selectedAdminIds.delete(id);
    syncSelectionUi();
  });

  selectAllInput && selectAllInput.addEventListener('change', function(){
    const ids = selectableIdsOnPage();
    if(selectAllInput.checked) ids.forEach(id => selectedAdminIds.add(id));
    else ids.forEach(id => selectedAdminIds.delete(id));
    tbody.querySelectorAll('[data-admin-select]').forEach(el => {
      el.checked = selectAllInput.checked;
    });
    syncSelectionUi();
  });

  async function deleteAdminsByIds(ids){
    const list = [...new Set((ids || []).map(String).filter(Boolean))];
    if(!list.length) return;
    const currentId = Number((BO_AUTH.user() || {}).id || 0);
    const blocked = list.filter(id => Number(id) === currentId || (Number(id) === 1 && !isViewerRoot()));
    const targets = list.filter(id => !blocked.includes(id));
    if(!targets.length){
      await BO_DIALOG.alert(blocked.length ? 'Selected accounts cannot be deleted.' : 'No accounts selected.');
      return;
    }
    const label = targets.length === 1
      ? 'Delete this administrator account?'
      : ('Delete ' + targets.length + ' administrator accounts?');
    if(!(await BO_DIALOG.confirm(label, { title: 'Delete Administrator', confirmText: 'Delete' }))) return;
    const errors = [];
    for(const id of targets){
      try{
        await apiJson(BO_AUTH.adminDeleteUrl(id), { method: 'POST', headers: { ...BO_AUTH.authHeader() } });
        selectedAdminIds.delete(String(id));
      }catch(err){
        errors.push((err && err.message) || ('Failed to delete #' + id));
      }
    }
    await loadAdmins();
    if(errors.length) await BO_DIALOG.alert(errors[0], { title: 'Delete incomplete', type: 'error' });
    else await BO_DIALOG.alert(targets.length === 1 ? 'Admin deleted successfully' : (targets.length + ' administrators deleted successfully'));
  }

  bulkDeleteBtn && bulkDeleteBtn.addEventListener('click', function(){
    deleteAdminsByIds([...selectedAdminIds]);
  });

  listen(document,'click', function(e){
    const more = e.target.closest && e.target.closest('.mad-more-btn');
    if(more){
      const tr = more.closest('tr.mad-row');
      if(!tr) return;
      const open = tr.classList.toggle('is-open');
      more.setAttribute('aria-expanded', open ? 'true' : 'false');
      more.setAttribute('aria-label', open ? 'Hide details' : 'Show details');
      const icon = more.querySelector('i');
      if(icon) icon.className = open ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
      return;
    }
    const keyBtn = e.target.closest && e.target.closest('.mad-key-btn');
    if(keyBtn){
      if(Number(keyBtn.dataset.id) === 1 && !isViewerRoot()){ BO_DIALOG.alert('Root admin account is protected.'); return; }
      openResetPassword(keyBtn);
      return;
    }
    const edit = e.target.closest && e.target.closest('.mad-edit-btn');
    if(edit){
      if(Number(edit.dataset.id) === 1 && !isViewerRoot()){ BO_DIALOG.alert('Root admin account is protected.'); return; }
      openEdit(edit);
      return;
    }
    const del = e.target.closest && e.target.closest('.mad-delete-btn');
    if(del){
      const id = Number(del.dataset.id || 0);
      if(!id){ BO_DIALOG.alert('Missing admin ID'); return; }
      deleteAdminsByIds([id]);
      return;
    }
    const creditBtn = e.target.closest && e.target.closest('.mad-credit-btn');
    if(creditBtn){
      const id = Number(creditBtn.dataset.id || 0);
      if(!id) return;
      if(id === 1 && !isViewerRoot()){ BO_DIALOG.alert('Root admin account is protected.'); return; }
      openCreditAdjust(id);
      return;
    }
    const toggle = e.target.closest && e.target.closest('.mad-toggle-btn');
    if(toggle){
      const id = Number(toggle.dataset.id || 0);
      const nextStatus = Number(toggle.dataset.status);
      if(!id) return;
      if(id === 1 && !isViewerRoot()){ BO_DIALOG.alert('Root admin account is protected.'); return; }
      const row = allAdmins.find(r => Number(r.id) === id);
      if(!row) return;
      (async()=>{
        try{
          await apiJson(BO_AUTH.adminUpdateUrl(id), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...BO_AUTH.authHeader() },
            body: JSON.stringify({
              username: row.username,
              displayName: row.displayName || row.username,
              status: nextStatus,
              roleId: row.roleId != null ? Number(row.roleId) : null,
              brandId: isViewerMain(BO_AUTH.user() || {}) ? null : (row.brandId != null ? Number(row.brandId) : null),
              password: ''
            })
          });
          await loadAdmins();
        }catch(err){ await BO_DIALOG.alert(err.message || 'Update status failed'); }
      })();
      return;
    }
    const eye = e.target.closest && e.target.closest('[data-toggle-password]');
    if(eye){
      const id = eye.getAttribute('data-toggle-password');
      const input = document.getElementById(id);
      if(!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      eye.setAttribute('aria-pressed', show ? 'true' : 'false');
      eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      const icon = eye.querySelector('i');
      if(icon) icon.className = show ? 'bi bi-eye-slash' : 'bi bi-eye';
    }
  });

  let searchTimer = null;
  searchInput && searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 220);
  });
  searchInput && searchInput.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); applyFilters(); } });
  roleFilter && roleFilter.addEventListener('change', applyFilters);
  statusFilter && statusFilter.addEventListener('change', applyFilters);
  resetBtn && resetBtn.addEventListener('click', () => {
    if(searchInput) searchInput.value = '';
    if(roleFilter) roleFilter.value = '';
    if(statusFilter) statusFilter.value = '';
    statusPill = 'active';
    document.querySelectorAll('[data-mad-status]').forEach(b => {
      const on = b.getAttribute('data-mad-status') === 'active';
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    clearAdminSelection();
    applyFilters();
  });
  pageNoEl && pageNoEl.addEventListener('click', e => {
    const b = e.target.closest('[data-page]');
    if(!b || b.disabled) return;
    const totalPages = Math.max(1, Math.ceil(filteredAdmins.length / pageSize));
    const n = Number(b.dataset.page);
    if(n >= 1 && n <= totalPages && n !== currentPage){ currentPage = n; renderAdmins(); }
  });

  pageSizeEl && pageSizeEl.addEventListener('change', () => {
    autoPageSize = null;
    currentPage = 1;
    renderAdmins();
  });

  let pageSizeResizeTimer = null;
  listen(window,'resize', () => {
    if(!pageSizeEl || !isAutoPageSize(pageSizeEl.value)) return;
    clearTimeout(pageSizeResizeTimer);
    pageSizeResizeTimer = setTimeout(() => {
      autoPageSize = null;
      currentPage = 1;
      renderAdmins();
    }, 150);
  });

  exportBtn && exportBtn.addEventListener('click', () => {
    const csv = [['Username', 'Display Name', 'Role', 'Credit Balance', 'Status', 'Created By', 'Last Login', 'Last Logout', 'Created']]
      .concat(filteredAdmins.map(r => [
        r.username || '',
        r.displayName || '',
        roleName(r),
        r.creditBalance != null ? r.creditBalance : (r.credit != null ? r.credit : ''),
        isActive(r) ? 'Active' : 'Suspended',
        r.createdByName || r.createdByUsername || r.createdBy || r.creator || '',
        dt(r.lastLoginAt || r.lastLogin),
        dt(lastLogout(r)),
        dt(r.createdAt || r.created_at)
      ]));
    const blob = new Blob([csv.map(row => row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'admin-accounts.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  });

  const syncLabelTimer = setInterval(updateSyncLabel, 15000);
  unbinds.push(() => clearInterval(syncLabelTimer));

  function measureLabelWidth(text, reference){
    const canvas = measureLabelWidth._c || (measureLabelWidth._c = document.createElement('canvas'));
    const ctx = canvas.getContext('2d');
    if(!ctx) return String(text || '').length * 7;
    const cs = getComputedStyle(reference || document.body);
    ctx.font = [cs.fontStyle, cs.fontVariant, cs.fontWeight, cs.fontSize, cs.fontFamily].filter(Boolean).join(' ');
    return Math.ceil(ctx.measureText(String(text || '').trim()).width);
  }

  function sizeFilterSelect(select){
    if(!select || !select.options || !select.options.length) return;
    const wrap = select.closest('.rounded-select-wrap');
    const btn = wrap && wrap.querySelector('.rounded-select-btn');
    const ref = btn || select;
    const labels = Array.from(select.options).map(o => String(o.textContent || o.label || '').trim()).filter(Boolean);
    if(!labels.length) return;
    const widest = Math.max.apply(null, labels.map(label => measureLabelWidth(label, ref)));
    /* left pad 14 + right pad/chevron ~38 + breathing room 8 */
    const width = Math.max(120, widest + 60);
    if(wrap){
      wrap.style.setProperty('width', width + 'px', 'important');
      wrap.style.setProperty('min-width', width + 'px', 'important');
      wrap.style.setProperty('max-width', width + 'px', 'important');
      wrap.style.setProperty('flex', '0 0 ' + width + 'px', 'important');
      if(btn){
        btn.style.setProperty('width', width + 'px', 'important');
        btn.style.setProperty('min-width', width + 'px', 'important');
      }
      const menu = wrap.querySelector('.rounded-select-menu');
      if(menu){
        menu.style.setProperty('min-width', width + 'px', 'important');
        menu.style.setProperty('width', 'max-content', 'important');
      }
    }else{
      select.style.setProperty('width', width + 'px', 'important');
      select.style.setProperty('min-width', width + 'px', 'important');
    }
  }

  function sizeAdminFilterSelects(){
    sizeFilterSelect(roleFilter);
    sizeFilterSelect(statusFilter);
  }

  sizeAdminFilterSelects();
  requestAnimationFrame(sizeAdminFilterSelects);
  setTimeout(sizeAdminFilterSelects, 0);
  setTimeout(sizeAdminFilterSelects, 50);
  setTimeout(sizeAdminFilterSelects, 200);

  const filtersRoot = document.querySelector('.mad-filters');
  if(filtersRoot && typeof MutationObserver !== 'undefined'){
    const mo = new MutationObserver(function(){ sizeAdminFilterSelects(); });
    mo.observe(filtersRoot, { childList: true, subtree: true });
    unbinds.push(() => mo.disconnect());
  }

  if(pageNoEl) pageNoEl.innerHTML = pageButtons(1, 1);

  (function bindActionTips(){
    const root = document.documentElement;
    root.classList.add('mad-float-tips');
    let tip = document.getElementById('madFloatTip');
    if(!tip){
      tip = document.createElement('div');
      tip.id = 'madFloatTip';
      tip.className = 'mad-float-tip';
      tip.setAttribute('role', 'tooltip');
      document.body.appendChild(tip);
    }
    let activeBtn = null;
    function hide(){
      activeBtn = null;
      tip.classList.remove('is-on', 'is-below');
    }
    function place(btn){
      if(!btn) return;
      activeBtn = btn;
      tip.textContent = btn.getAttribute('data-tip') || '';
      tip.classList.add('is-on');
      const r = btn.getBoundingClientRect();
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      let left = r.right - tw;
      left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
      let top = r.top - th - 10;
      const below = top < 8;
      if(below) top = r.bottom + 10;
      tip.classList.toggle('is-below', below);
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
      tip.style.setProperty('--mad-tip-arrow-x', Math.max(10, Math.min(tw - 10, r.left + r.width / 2 - left)) + 'px');
    }
    listen(document,'pointerover', function(e){
      const btn = e.target && e.target.closest && e.target.closest('.mad-icon-btn[data-tip]');
      if(btn) place(btn);
    });
    listen(document,'pointerout', function(e){
      const btn = e.target && e.target.closest && e.target.closest('.mad-icon-btn[data-tip]');
      if(!btn) return;
      const next = e.relatedTarget;
      if(next && (btn.contains(next) || (next.closest && next.closest('.mad-icon-btn[data-tip]')))) return;
      hide();
    });
    listen(document,'focusin', function(e){
      const btn = e.target && e.target.closest && e.target.closest('.mad-icon-btn[data-tip]');
      if(btn) place(btn);
    });
    listen(document,'focusout', function(e){
      const btn = e.target && e.target.closest && e.target.closest('.mad-icon-btn[data-tip]');
      if(btn) hide();
    });
    listen(window,'scroll', function(){ if(activeBtn) hide(); }, true);
    listen(window,'resize', hide);
  })();

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
    if(!page || !page.classList.contains('main-admin-detail-page') || page.getAttribute('data-access-page') !== 'main_admin_detail') return;
    const host = page.querySelector('.report-actions [data-bo-profile]');
    if(!host) return;
    const link = host.querySelector('a.bo-account-link');
    if(!link) return;

    // Keep account settings / change-password navigation working
    const href = String(link.getAttribute('href') || '');
    if(!href || href === '#' || href === 'profile.html'){
      link.setAttribute('href', 'profile.html#password');
    }
    link.style.pointerEvents = 'auto';
    link.style.cursor = 'pointer';
    link.setAttribute('title', 'Account settings / Change password');
    link.setAttribute('aria-label', 'Open account settings and change password');

    const already = link.classList.contains('is-mad-amber-profile')
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

    link.classList.add('is-mad-amber-profile');
  }

  function bindAmberTopbarProfile(){
    enhanceAmberTopbarProfile();
    const host = document.querySelector('.report-actions [data-bo-profile]');
    if(!host || host.dataset.madAmberObserved === '1') return;
    host.dataset.madAmberObserved = '1';
    let scheduled = false;
    const run = function(){
      if(scheduled) return;
      scheduled = true;
      requestAnimationFrame(function(){
        scheduled = false;
        enhanceAmberTopbarProfile();
      });
    };
    // Only watch structural reinjects from auth — not text tweaks (avoids killing clicks)
    const profileObs=new MutationObserver(run);
    profileObs.observe(host, { childList: true });
    unbinds.push(()=>profileObs.disconnect());
    listen(document,'bo:profile-updated', run);
    setTimeout(enhanceAmberTopbarProfile, 80);
    setTimeout(enhanceAmberTopbarProfile, 400);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindAmberTopbarProfile);
  }else{
    bindAmberTopbarProfile();
  }

  (async function(){
    // These are independent read-only requests. Starting them together avoids making
    // the administrator table wait for the role filter request on every tab visit.
    await Promise.all([loadBrandOptions(), loadAdmins()]);
    // Re-apply once both are ready so role labels/filtering always use the completed map.
    applyFilters();
  })();
})();
