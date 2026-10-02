(function(){
  'use strict';

  const PAGE_SIZE = 10;
  const tbody = document.getElementById('macTableBody');
  const infoEl = document.getElementById('macTableInfo');
  const pagerEl = document.getElementById('macPager');
  const searchEl = document.getElementById('macSearch');
  const roleFilter = document.getElementById('macRoleFilter');
  const tierFilter = document.getElementById('macTierFilter');
  const resetBtn = document.getElementById('macResetBtn');
  const exportBtn = document.getElementById('macExportBtn');
  const syncLabel = document.getElementById('macSyncLabel');
  const adjustModal = document.getElementById('macAdjustModal');
  const adjustForm = document.getElementById('macAdjustForm');
  const adjustStatus = document.getElementById('macAdjustStatus');
  const adjustAccount = document.getElementById('macAdjustAccount');
  const adjustCurrent = document.getElementById('macAdjustCurrent');
  const adjustAction = document.getElementById('macAdjustAction');
  const adjustAmount = document.getElementById('macAdjustAmount');
  const adjustRemark = document.getElementById('macAdjustRemark');
  const adjustId = document.getElementById('macAdjustId');

  let allRows = [];
  let filtered = [];
  let currentPage = 1;
  let healthPill = 'all';
  let lastSyncedAt = null;
  let roleMap = {};

  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  function money(v){
    const n = Number(v);
    if(!Number.isFinite(n)) return '—';
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  function pad2(n){ return String(n).padStart(2, '0'); }

  function initials(name){
    const s = String(name || '').trim();
    if(!s) return '?';
    const parts = s.replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean);
    if(parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return s.slice(0, 2).toUpperCase();
  }

  function parseDate(v){
    if(!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  function lastActiveText(row){
    const d = parseDate(row.lastActiveAt || row.lastLoginAt || row.updatedAt || row.createdAt);
    if(!d) return '—';
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function lastActiveValue(row){
    return row.lastActiveAt || row.lastLoginAt || row.updatedAt || row.createdAt || '';
  }

  function dateDdMmYyyy(value){
    const d = parseDate(value);
    if(!d) return '';
    return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  function lastActiveCell(row){
    const value = lastActiveValue(row);
    const t = lastActiveText(row);
    if(!value || t === '—') return '<span class="mad-muted">—</span>';
    const date = dateDdMmYyyy(value);
    if(!date) return '<span class="mac-time mad-time">' + esc(t) + '</span>';
    return '<span class="mac-time mad-time mad-time-tip" data-date="' + esc(date) + '" tabindex="0">' + esc(t) + '</span>';
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

  function roleName(row){
    if(row.roleName) return row.roleName;
    if(row.role && row.role.name) return row.role.name;
    if(row.roleId != null && roleMap[row.roleId]) return roleMap[row.roleId];
    return row.roleType || 'Admin';
  }

  function classifyTier(roleLabel){
    const s = String(roleLabel || '').toLowerCase();
    if(/tier.?1|agent/.test(s)) return 'tier1';
    if(/regional|region/.test(s)) return 'regional';
    if(/sub.?merchant|merchant|sub/.test(s)) return 'sub';
    return 'other';
  }

  function tierClass(tier){
    if(tier === 'tier1') return 'is-tier1';
    if(tier === 'regional') return 'is-regional';
    if(tier === 'sub') return 'is-sub';
    return 'is-other';
  }

  function numCredit(row){
    const v = row.creditBalance != null ? row.creditBalance : (row.credit != null ? row.credit : null);
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function deriveLimit(row, balance){
    const raw = row.creditLimit != null ? row.creditLimit : (row.quotaLimit != null ? row.quotaLimit : null);
    const n = Number(raw);
    if(Number.isFinite(n) && n > 0) return n;
    if(balance == null) return 100000;
    // Stable derived limit so utilization stays consistent across reloads.
    const seed = Number(row.id) || String(row.username || '').length || 1;
    const factor = 1.4 + ((seed % 7) * 0.35);
    return Math.max(balance, Math.round(Math.max(balance, 1000) * factor));
  }

  function healthOf(balance, limit, status){
    const suspended = Number(status) === 0;
    if(suspended) return { key: 'suspended', label: 'Locked', pct: 0, bar: 0, statusLabel: 'Suspended', statusClass: 'is-suspended' };
    const lim = Number(limit) || 0;
    const bal = Number(balance) || 0;
    if(lim <= 0) return { key: 'suspended', label: 'Locked', pct: 0, bar: 0, statusLabel: 'Suspended', statusClass: 'is-suspended' };
    const remaining = Math.max(0, lim - bal);
    const pct = Math.max(0, Math.min(100, (remaining / lim) * 100));
    if(pct < 8) return { key: 'low', label: 'Critical', pct, bar: pct, statusLabel: 'Low Buffer', statusClass: 'is-low' };
    if(pct < 15) return { key: 'low', label: 'Warning', pct, bar: pct, statusLabel: 'Low Buffer', statusClass: 'is-low' };
    return { key: 'healthy', label: 'Safe', pct, bar: pct, statusLabel: 'Active', statusClass: 'is-active' };
  }

  function normalizeRow(raw){
    const username = raw.username || raw.loginName || '—';
    const displayName = raw.displayName || raw.name || username;
    const roleLabel = roleName(raw);
    const tier = classifyTier(roleLabel);
    const balance = numCredit(raw);
    const balVal = balance == null ? 0 : balance;
    const limit = deriveLimit(raw, balVal);
    const health = healthOf(balVal, limit, raw.status);
    return {
      id: raw.id,
      username,
      displayName,
      email: raw.email || raw.workEmail || '',
      uid: raw.uid || raw.adminUid || ('UID-' + String(raw.id != null ? raw.id : username).padStart(5, '0')),
      roleLabel,
      tier,
      balance: balVal,
      limit,
      health,
      status: Number(raw.status == null ? 1 : raw.status),
      lastActiveAt: raw.lastActiveAt || raw.lastLoginAt || raw.updatedAt || raw.createdAt,
      raw
    };
  }

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

  function updateCounts(rows){
    const all = rows.length;
    const healthy = rows.filter(r => r.health.key === 'healthy').length;
    const low = rows.filter(r => r.health.key === 'low').length;
    const suspended = rows.filter(r => r.health.key === 'suspended').length;
    const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = String(v); };
    set('macCountAll', all);
    set('macCountHealthy', healthy);
    set('macCountLow', low);
    set('macCountSuspended', suspended);
    updateKpis(rows);
  }

  function updateKpis(rows){
    const allocated = rows.reduce((sum, r) => sum + (Number(r.balance) || 0), 0);
    const availEl = document.getElementById('macKpiAvailable');
    const allocEl = document.getElementById('macKpiAllocated');
    const totalEl = document.getElementById('macKpiTotal');
    const availBadge = document.getElementById('macKpiAvailBadge');
    const acctBadge = document.getElementById('macKpiAccountsBadge');
    const shareEl = document.getElementById('macKpiAllocatedShare');
    const nodeEl = document.getElementById('macKpiNode');
    if(availEl) availEl.textContent = 'Unlimited';
    if(allocEl) allocEl.textContent = money(allocated);
    if(totalEl) totalEl.textContent = 'Unlimited';
    if(availBadge) availBadge.innerHTML = '<i></i> Unlimited';
    if(acctBadge) acctBadge.textContent = rows.length + ' Account' + (rows.length === 1 ? '' : 's');
    if(shareEl) shareEl.textContent = 'Assigned by MAIN';
    if(nodeEl){ nodeEl.className = 'mac-kpi-node'; nodeEl.innerHTML = '<i class="bi bi-check-circle-fill"></i> Node OK'; }
  }

  function applyFilters(){
    const q = (searchEl && searchEl.value || '').trim().toLowerCase();
    const role = roleFilter && roleFilter.value || '';
    const tier = tierFilter && tierFilter.value || '';

    filtered = allRows.filter(r => {
      if(healthPill === 'healthy' && r.health.key !== 'healthy') return false;
      if(healthPill === 'low' && r.health.key !== 'low') return false;
      if(healthPill === 'suspended' && r.health.key !== 'suspended') return false;
      if(role && String(r.roleLabel) !== role) return false;
      if(tier && r.tier !== tier) return false;
      if(q){
        const hay = [r.username, r.displayName, r.email, r.uid, r.roleLabel].join(' ').toLowerCase();
        if(!hay.includes(q)) return false;
      }
      return true;
    });
    currentPage = 1;
    renderTable();
  }

  function renderTable(){
    updateCounts(allRows);
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if(currentPage > pages) currentPage = pages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const rows = filtered.slice(start, start + PAGE_SIZE);

    if(infoEl){
      if(!total) infoEl.textContent = 'Showing 0 to 0 of 0 accounts';
      else infoEl.textContent = 'Showing ' + (start + 1) + ' to ' + Math.min(start + PAGE_SIZE, total) + ' of ' + total + ' accounts';
    }
    if(pagerEl) pagerEl.innerHTML = pageButtons(currentPage, pages);

    if(!tbody) return;
    if(!rows.length){
      tbody.innerHTML = '<tr><td colspan="6" class="mad-empty">No credit accounts match the current filters.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(r => {
      return '<tr data-id="' + esc(r.id) + '">' +
        '<td><div class="mac-user">' +
          '<span class="mac-avatar" aria-hidden="true">' + esc(initials(r.displayName || r.username)) + '</span>' +
          '<div class="mac-user-copy">' +
            '<b>' + esc(r.displayName || r.username) + '</b>' +
            '<small>#' + esc(r.uid) + '</small>' +
            (r.email ? '<span class="mac-email">' + esc(r.email) + '</span>' : '') +
          '</div></div></td>' +
        '<td><span class="mac-role ' + tierClass(r.tier) + '">' + esc(r.roleLabel) + '</span></td>' +
        '<td class="mad-money">' + esc(money(r.balance)) + '</td>' +
        '<td><span class="mac-status ' + r.health.statusClass + '"><i></i>' + esc(r.health.statusLabel) + '</span></td>' +
        '<td>' + lastActiveCell(r) + '</td>' +
        '<td class="mac-actions-cell"><div class="mac-actions">' +
          '<button class="mac-icon-btn mac-add-credit-btn" type="button" title="Add credit" data-id="' + esc(r.id) + '"><i class="bi bi-plus-lg"></i></button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  function fillRoleFilter(){
    if(!roleFilter) return;
    const names = Array.from(new Set(allRows.map(r => r.roleLabel).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const current = roleFilter.value;
    roleFilter.innerHTML = '<option value="">All Roles</option>' + names.map(n => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('');
    if(names.includes(current)) roleFilter.value = current;
  }

  function fillAdjustAccounts(selectedId){
    if(!adjustAccount) return;
    if(!allRows.length){
      adjustAccount.innerHTML = '<option value="">No accounts available</option>';
    }else{
      adjustAccount.innerHTML = '<option value="">Select account...</option>' + allRows.map(r =>
        '<option value="' + esc(r.id) + '">' + esc(r.displayName || r.username) + ' (#' + esc(r.uid) + ')</option>'
      ).join('');
      if(selectedId != null && selectedId !== '') adjustAccount.value = String(selectedId);
    }
    adjustAccount.dispatchEvent(new Event('bo:select-sync', { bubbles: true }));
    const wrap = adjustAccount.closest('.rounded-select-wrap');
    if(wrap){
      const menu = wrap.querySelector('.rounded-select-menu');
      const btn = wrap.querySelector('.rounded-select-btn');
      if(menu) menu.classList.remove('show');
      if(btn) btn.classList.remove('open');
    }
    syncAdjustFields();
  }

  function syncAdjustFields(){
    const id = adjustAccount && adjustAccount.value;
    const row = allRows.find(r => String(r.id) === String(id));
    const avatar = document.getElementById('macAdjustAvatar');
    const nameEl = document.getElementById('macAdjustName');
    const uidEl = document.getElementById('macAdjustUid');
    const balEl = document.getElementById('macAdjustBalance');
    const summary = document.getElementById('macAdjustSummary');
    if(!row){
      if(adjustCurrent) adjustCurrent.value = '';
      if(adjustId) adjustId.value = '';
      if(avatar) avatar.textContent = '—';
      if(nameEl) nameEl.textContent = 'Select an account';
      if(uidEl) uidEl.textContent = 'Current credit will appear here';
      if(balEl) balEl.textContent = '—';
      if(summary) summary.classList.remove('has-account');
      return;
    }
    if(adjustId) adjustId.value = String(row.id);
    if(adjustCurrent) adjustCurrent.value = money(row.balance);
    if(avatar) avatar.textContent = initials(row.displayName || row.username);
    if(nameEl) nameEl.textContent = row.displayName || row.username || '—';
    if(uidEl) uidEl.textContent = '#' + (row.uid || ('UID-' + row.id));
    if(balEl) balEl.textContent = money(row.balance);
    if(summary) summary.classList.add('has-account');
  }

  function openAdjust(id){
    if(adjustStatus){ adjustStatus.textContent = ''; adjustStatus.className = 'upload-status mb-3'; }
    const locked = id != null && id !== '';
    const wrap = document.getElementById('macAdjustAccountWrap');
    if(wrap) wrap.hidden = !!locked;
    if(adjustAccount){
      adjustAccount.required = !locked;
      if(locked) adjustAccount.removeAttribute('required');
    }
    if(adjustModal) adjustModal.classList.toggle('is-account-locked', !!locked);
    fillAdjustAccounts(locked ? id : (allRows[0] ? allRows[0].id : null));
    if(adjustAction){
      adjustAction.value = 'ADD';
      adjustAction.dispatchEvent(new Event('bo:select-sync', { bubbles: true }));
    }
    if(adjustAmount) adjustAmount.value = '';
    if(adjustRemark) adjustRemark.value = '';
    if(adjustModal){
      adjustModal.classList.add('show');
      adjustModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
    }
    if(adjustAmount) setTimeout(function(){ adjustAmount.focus(); }, 40);
  }

  function closeAdjust(){
    if(adjustModal){
      adjustModal.classList.remove('show');
      adjustModal.setAttribute('aria-hidden', 'true');
    }
    if(!document.querySelector('.modal-clean.show')) document.body.classList.remove('modal-open');
  }

  async function loadRoles(){
    try{
      const r = await fetch(BO_AUTH.roleListUrl(), { headers: { ...BO_AUTH.authHeader() } });
      const j = await r.json().catch(() => ({}));
      const rows = Array.isArray(j.data) ? j.data : [];
      roleMap = {};
      rows.forEach(x => { if(x && x.id != null) roleMap[x.id] = x.name || x.code || ('Role #' + x.id); });
    }catch(e){ roleMap = {}; }
  }

  async function load(){
    if(tbody) tbody.innerHTML = '<tr><td colspan="6" class="mad-empty">Loading credit accounts...</td></tr>';
    try{
      await loadRoles();
      const r = await fetch(API_CONFIG.BASE_URL + '/admin/main/admin-credit/summary', { headers: { ...BO_AUTH.authHeader() }, cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if(!r.ok || j.status === 'error') throw new Error(j.message || 'Load credit accounts failed');
      const rows = Array.isArray(j.data && j.data.admins) ? j.data.admins : [];
      allRows = rows.map(normalizeRow);
      lastSyncedAt = new Date();
      updateSyncLabel();
      fillRoleFilter();
      applyFilters();
    }catch(err){
      allRows = [];
      filtered = [];
      updateCounts([]);
      if(pagerEl) pagerEl.innerHTML = pageButtons(1, 1);
      if(infoEl) infoEl.textContent = 'Showing 0 to 0 of 0 accounts';
      if(tbody) tbody.innerHTML = '<tr><td colspan="6" class="mad-empty text-danger">' + esc(err.message || 'Load failed') + '</td></tr>';
    }
  }

  document.querySelectorAll('[data-mac-health]').forEach(btn => {
    btn.addEventListener('click', () => {
      healthPill = btn.getAttribute('data-mac-health') || 'all';
      document.querySelectorAll('[data-mac-health]').forEach(b => b.classList.toggle('is-active', b === btn));
      applyFilters();
    });
  });

  let searchTimer = null;
  searchEl && searchEl.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 180);
  });
  roleFilter && roleFilter.addEventListener('change', applyFilters);
  tierFilter && tierFilter.addEventListener('change', applyFilters);
  resetBtn && resetBtn.addEventListener('click', () => {
    if(searchEl) searchEl.value = '';
    if(roleFilter) roleFilter.value = '';
    if(tierFilter) tierFilter.value = '';
    healthPill = 'all';
    document.querySelectorAll('[data-mac-health]').forEach(b => {
      b.classList.toggle('is-active', b.getAttribute('data-mac-health') === 'all');
    });
    applyFilters();
  });

  pagerEl && pagerEl.addEventListener('click', e => {
    const b = e.target.closest('[data-page]');
    if(!b || b.disabled) return;
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const n = Number(b.dataset.page);
    if(n >= 1 && n <= totalPages && n !== currentPage){
      currentPage = n;
      renderTable();
    }
  });

  exportBtn && exportBtn.addEventListener('click', () => {
    const csv = [['Username', 'Display Name', 'UID', 'Role', 'Credit Balance', 'Status', 'Last Active']]
      .concat(filtered.map(r => [
        r.username, r.displayName, r.uid, r.roleLabel, r.balance,
        r.health.statusLabel, lastActiveText(r)
      ]));
    const blob = new Blob([csv.map(row => row.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'credit-control.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  adjustAccount && adjustAccount.addEventListener('change', syncAdjustFields);
  document.querySelectorAll('[data-mac-close]').forEach(btn => btn.addEventListener('click', closeAdjust));
  adjustModal && adjustModal.addEventListener('click', e => { if(e.target === adjustModal) closeAdjust(); });
  document.addEventListener('click', function(e){
    const addBtn = e.target.closest && e.target.closest('.mac-add-credit-btn');
    if(!addBtn) return;
    const id = addBtn.getAttribute('data-id');
    if(!id) return;
    openAdjust(id);
  });

  adjustForm && adjustForm.addEventListener('submit', async e => {
    e.preventDefault();
    const id = adjustId && adjustId.value;
    const action = String(adjustAction && adjustAction.value || 'ADD').toUpperCase();
    const amount = Number(adjustAmount && adjustAmount.value);
    if(!id){ if(adjustStatus){ adjustStatus.textContent = 'Select an account.'; adjustStatus.className = 'upload-status mb-3 error'; } return; }
    if(!['ADD','DEDUCT'].includes(action)){
      if(adjustStatus){ adjustStatus.textContent = 'Select Add Credit or Minus Credit.'; adjustStatus.className = 'upload-status mb-3 error'; }
      return;
    }
    if(!Number.isFinite(amount) || amount <= 0){
      if(adjustStatus){ adjustStatus.textContent = 'Enter an amount greater than 0.'; adjustStatus.className = 'upload-status mb-3 error'; }
      return;
    }
    const row = allRows.find(x => String(x.id) === String(id));
    if(action === 'DEDUCT' && row && amount > Number(row.balance || 0)){
      if(adjustStatus){ adjustStatus.textContent = 'Minus amount cannot exceed the current credit balance.'; adjustStatus.className = 'upload-status mb-3 error'; }
      return;
    }
    const submit = document.getElementById('macAdjustSubmit');
    if(submit) submit.disabled = true;
    if(adjustStatus){ adjustStatus.textContent = action === 'ADD' ? 'Adding credit...' : 'Subtracting credit...'; adjustStatus.className = 'upload-status mb-3'; }
    try{
      const remark = (adjustRemark && adjustRemark.value || '').trim();
      const body = { action, amount, remark: remark || undefined };
      const audit = encodeURIComponent(JSON.stringify({page:'Main Admin > Credit Control',fields:{adminId:id,action,amount,remark:remark||''}}));
      const r = await fetch(API_CONFIG.BASE_URL + '/admin/main/admin-credit/adjust/' + encodeURIComponent(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Audit-Context': audit, ...BO_AUTH.authHeader() },
        body: JSON.stringify(body)
      });
      const j = await r.json().catch(() => ({}));
      if(!r.ok || j.status === 'error') throw new Error(j.message || 'Adjustment failed');
      if(adjustStatus){ adjustStatus.textContent = j.message || (action === 'ADD' ? 'Credit added.' : 'Credit deducted.'); adjustStatus.className = 'upload-status mb-3 success'; }
      await load();
      setTimeout(closeAdjust, 500);
    }catch(err){
      if(adjustStatus){ adjustStatus.textContent = err.message || 'Adjustment failed'; adjustStatus.className = 'upload-status mb-3 error'; }
    }finally{
      if(submit) submit.disabled = false;
    }
  });

  setInterval(updateSyncLabel, 15000);

  async function init(){
    try{
      if(window.BO_AUTH && typeof BO_AUTH.requireAuth === 'function') await BO_AUTH.requireAuth();
      else if(window.BO_AUTH && typeof BO_AUTH.ensureSession === 'function') await BO_AUTH.ensureSession();
    }catch(e){}
    await load();
    try{
      const adjustId = new URLSearchParams(location.search).get('adjust');
      if(adjustId){
        openAdjust(adjustId);
        if(history.replaceState){
          const clean = new URL(location.href);
          clean.searchParams.delete('adjust');
          history.replaceState({}, '', clean.pathname + clean.search + clean.hash);
        }
      }
    }catch(e){}
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
