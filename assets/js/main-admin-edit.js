(function(){
  'use strict';

  /* A swap re-runs this file against a fresh frame, so the document bindings below were added
     again on each entry: N entries meant N password-toggle / role-menu / Escape handlers.
     Release the previous run's bindings first; they always close over the frame on screen. */
  if(window.__boMaeUnbind) window.__boMaeUnbind();
  const unbinds=[];
  const listen=(target,type,fn,opt)=>{ target.addEventListener(type,fn,opt); unbinds.push(()=>target.removeEventListener(type,fn,opt)); };
  window.__boMaeUnbind=()=>{ unbinds.forEach(fn=>fn()); unbinds.length=0; };

  const form = document.getElementById('madEditForm');
  const statusEl = document.getElementById('madEditStatus');
  const submitBtn = document.getElementById('madEditSubmit');
  const roleSelect = document.getElementById('madEditRole');
  const brandSelect = document.getElementById('madEditBrand');
  const statusSelect = document.getElementById('madEditStatus');
  const changeRoleBtn = document.getElementById('madRolePickBtn');
  const roleMenu = document.getElementById('madRoleMenu');
  let roleRows = [];
  let roleMenuOpen = false;
  let menuMap = {};
  let rolePermCache = {};
  let permLoadToken = 0;
  let editingId = null;
  let loadedAdmin = null;

  function qsId(){
    try{ return Number(new URLSearchParams(location.search).get('id') || 0) || null; }catch(e){ return null; }
  }

  function setStatus(message, type){
    if(!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.className = 'upload-status mb-3 ' + (type || '');
  }

  function esc(v){
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtMeta(v){
    if(!v) return '—';
    const s = String(v).replace('T', ' ');
    return s.length > 16 ? s.slice(0, 16) : s;
  }

  async function apiJson(url, options){
    const res = await fetch(url, options || {});
    const json = await res.json().catch(() => ({}));
    if(!res.ok || json.status === 'error') throw new Error(json.message || 'Request failed');
    return json;
  }

  function actorFlags(user){
    user = user || BO_AUTH.user() || {};
    const role = String(user.roleType || '').toUpperCase();
    const mainAdmin = role === 'MAIN';
    const rootAdmin = !mainAdmin && (
      user.rootAdmin === true || Number(user.rootAdmin) === 1 ||
      role === 'ROOT' || (Number(user.id) === 1 && user.brandId == null)
    );
    const masterAdmin = !mainAdmin && !rootAdmin && (
      user.masterAdmin === true || Number(user.masterAdmin) === 1 || role === 'MASTER'
    );
    const platformAdmin = rootAdmin || masterAdmin || mainAdmin || user.brandId == null;
    return { user, role, mainAdmin, rootAdmin, masterAdmin, platformAdmin };
  }

  async function loadMenuCatalog(){
    if(Object.keys(menuMap).length) return menuMap;
    try{
      const json = await apiJson(BO_AUTH.menuListUrl(), { headers: { ...BO_AUTH.authHeader() } });
      const rows = Array.isArray(json.data) ? json.data : [];
      menuMap = Object.fromEntries(rows.map(m => [String(m.id), m]));
    }catch(e){ menuMap = {}; }
    return menuMap;
  }

  async function fetchRolePermissions(roleId){
    const key = String(roleId || '');
    if(!key) return [];
    if(rolePermCache[key]) return rolePermCache[key];
    await loadMenuCatalog();
    try{
      const json = await apiJson(BO_AUTH.roleMenusUrl(key), { headers: { ...BO_AUTH.authHeader() } });
      const ids = Array.isArray(json.data && json.data.menuIds) ? json.data.menuIds : (Array.isArray(json.data) ? json.data : []);
      const labels = ids.map(id => {
        const m = menuMap[String(id)];
        return m ? (m.title || m.menuKey || ('Menu #' + id)) : null;
      }).filter(Boolean);
      rolePermCache[key] = labels;
      return labels;
    }catch(e){
      rolePermCache[key] = [];
      return [];
    }
  }

  function renderPermissionTags(labels, opts){
    const tagsEl = document.getElementById('madRoleTags');
    if(!tagsEl) return;
    if(opts && opts.loading){
      tagsEl.innerHTML = '<span class="mac-tag-empty">Loading permissions...</span>';
      return;
    }
    if(!labels || !labels.length){
      tagsEl.innerHTML = '<span class="mac-tag-empty">No menu permissions assigned to this role</span>';
      return;
    }
    const max = 10;
    const shown = labels.slice(0, max);
    const rest = labels.length - shown.length;
    tagsEl.innerHTML = shown.map(t => '<span class="mac-tag" title="' + esc(t) + '">' + esc(t) + '</span>').join('')
      + (rest > 0 ? '<span class="mac-tag mac-tag-more">+' + rest + ' more</span>' : '');
  }

  async function updateRolePermissions(row){
    const token = ++permLoadToken;
    if(!row || !row.id){ renderPermissionTags([]); return; }
    renderPermissionTags([], { loading: true });
    const labels = await fetchRolePermissions(row.id);
    if(token !== permLoadToken) return;
    renderPermissionTags(labels);
  }

  function renderRoleMenu(){
    if(!roleMenu) return;
    const current = roleSelect && roleSelect.value;
    if(!roleRows.length){
      roleMenu.innerHTML = '<span class="mac-tag-empty">No roles available</span>';
      return;
    }
    roleMenu.innerHTML = roleRows.map(r => {
      const id = String(r.id);
      const label = (r.name || r.code || ('Role #' + id)) + (r.roleType === 'BRAND_OWNER' ? ' (Owner)' : '');
      const active = id === String(current);
      return '<button type="button" class="mac-role-option' + (active ? ' is-active' : '') + '" role="option" data-role-id="' + esc(id) + '"' + (active ? ' aria-selected="true"' : ' aria-selected="false"') + '>' + esc(label) + '</button>';
    }).join('');
  }

  function setRoleMenuOpen(open){
    roleMenuOpen = !!open;
    if(roleMenu) roleMenu.hidden = !roleMenuOpen;
    if(changeRoleBtn){
      changeRoleBtn.setAttribute('aria-expanded', roleMenuOpen ? 'true' : 'false');
      changeRoleBtn.classList.toggle('is-open', roleMenuOpen);
    }
    if(roleMenuOpen) renderRoleMenu();
  }

  function updateRoleCard(){
    const id = roleSelect && roleSelect.value;
    const row = roleRows.find(r => String(r.id) === String(id));
    const nameEl = document.getElementById('madRoleName');
    const primaryEl = document.getElementById('madRolePrimary');
    const countEl = document.getElementById('madRoleCount');
    const tierEl = document.getElementById('maeTierBadge');
    if(!row){
      if(nameEl) nameEl.textContent = 'Select a role';
      if(primaryEl) primaryEl.hidden = true;
      if(countEl) countEl.textContent = '';
      if(tierEl) tierEl.hidden = true;
      renderPermissionTags([]);
      if(roleMenuOpen) renderRoleMenu();
      return;
    }
    const name = row.name || row.code || 'Role';
    const type = String(row.roleType || '').toUpperCase();
    if(nameEl) nameEl.textContent = name;
    if(primaryEl){
      const isPrimary = type === 'ROOT' || type === 'MASTER' || type === 'BRAND_OWNER' || type === 'MAIN';
      primaryEl.hidden = !isPrimary;
    }
    if(countEl){
      const n = Number(row.adminCount || row.activeAdmins || row.userCount || 0);
      countEl.textContent = n > 0 ? '(' + n + ' active admins)' : '';
    }
    if(tierEl){
      const isTier = type === 'ROOT' || type === 'MASTER' || type === 'MAIN';
      tierEl.hidden = !isTier;
      tierEl.textContent = isTier ? 'Tier 1 Authority' : '';
    }
    updateRolePermissions(row);
    if(roleMenuOpen) renderRoleMenu();
  }

  function selectRole(id){
    if(!roleSelect) return;
    roleSelect.value = String(id);
    updateRoleCard();
    setRoleMenuOpen(false);
  }

  function setAccountStatus(v){
    const status = String(v == null ? 1 : v);
    if(statusSelect) statusSelect.value = status;
    document.querySelectorAll('[data-mae-status]').forEach(btn => {
      btn.classList.toggle('is-active', btn.getAttribute('data-mae-status') === status);
    });
    const pill = document.getElementById('maeStatusPill');
    if(pill){
      const on = status === '1';
      pill.textContent = on ? 'Active Account' : 'Suspended';
      pill.classList.toggle('is-active', on);
      pill.classList.toggle('is-suspended', !on);
    }
  }

  function fillHero(row){
    const uid = document.getElementById('maeUidBadge');
    if(uid) uid.textContent = '#UID-' + String(row.id || '—');
    const created = document.getElementById('maeCreatedMeta');
    if(created){
      const by = row.createdByName || row.createdByUsername || row.createdBy || row.createBy || '';
      created.textContent = fmtMeta(row.createdAt || row.createTime) + (by ? (' by ' + by) : '');
    }
    const updated = document.getElementById('maeUpdatedMeta');
    if(updated) updated.textContent = fmtMeta(row.updatedAt || row.updateTime || row.lastLoginAt);
    setAccountStatus(row.status == null ? 1 : row.status);
  }

  async function loadRoles(brandId){
    try{
      const flags = actorFlags();
      const headers = { ...BO_AUTH.authHeader() };
      if(brandId) headers['X-Brand-Id'] = String(brandId);
      const roleUrl = flags.mainAdmin && BO_AUTH.roleListAllUrl ? BO_AUTH.roleListAllUrl() : BO_AUTH.roleListUrl();
      const json = await apiJson(roleUrl, { headers });
      let rows = Array.isArray(json.data) ? json.data : [];
      if(flags.rootAdmin){
        rows = brandId
          ? rows.filter(r => Number(r.brandId) === Number(brandId) && !['MASTER', 'ROOT', 'MAIN'].includes(String(r.roleType || '').toUpperCase()))
          : rows.filter(r => r.brandId == null && ['MASTER','MAIN','CUSTOM'].includes(String(r.roleType || '').toUpperCase()));
      }else if(flags.mainAdmin){
        // Keep Edit Admin consistent with Create Admin: every active platform/global role
        // except ROOT and Merchant Brand Owner roles.
        rows = rows.filter(r => { const type=String(r.roleType||'').toUpperCase(); return type!=='ROOT'&&type!=='BRAND_OWNER'&&Number(r.status==null?1:r.status)===1; });
      }else{
        rows = rows.filter(r => !['MASTER', 'ROOT', 'MAIN'].includes(String(r.roleType || 'CUSTOM').toUpperCase()));
        if(brandId) rows = rows.filter(r => Number(r.brandId) === Number(brandId));
      }
      roleRows = rows;
      if(roleSelect){
        const keep = rows.some(r => String(r.id) === String(roleSelect.value));
        if(!keep && rows[0]) roleSelect.value = String(rows[0].id);
      }
      updateRoleCard();
      return rows;
    }catch(e){
      roleRows = [];
      updateRoleCard();
      return [];
    }
  }

  async function loadAdmin(id){
    const json = await apiJson(BO_AUTH.adminListUrl(), { headers: { ...BO_AUTH.authHeader() } });
    const rows = Array.isArray(json.data) ? json.data : [];
    const row = rows.find(r => Number(r.id) === Number(id));
    if(!row) throw new Error('Administrator not found.');
    return row;
  }

  function applyAdmin(row){
    loadedAdmin = row;
    editingId = row.id;
    document.getElementById('madEditId').value = String(row.id || '');
    document.getElementById('madEditUsername').value = row.username || '';
    document.getElementById('madEditDisplayName').value = row.displayName || '';
    const emailEl = document.getElementById('madEditEmail');
    if(emailEl){
      const remark = String(row.remark || '');
      const m = remark.match(/Email:\s*([^·]+)/i);
      emailEl.value = row.email || (m ? m[1].trim() : '');
    }
    if(brandSelect) brandSelect.value = row.brandId == null ? '' : String(row.brandId);
    if(roleSelect) roleSelect.value = row.roleId != null ? String(row.roleId) : '';
    const ip = document.getElementById('madIpWhitelist');
    if(ip) ip.checked = /IP whitelist/i.test(String(row.remark || ''));
    fillHero(row);
    document.getElementById('madEditPassword').value = '';
    document.getElementById('madEditConfirmPassword').value = '';
    syncResetPassBtn();
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

  function setPassModalStatus(msg, type){
    const el = document.getElementById('maePassModalStatus');
    if(!el) return;
    el.textContent = msg || '';
    el.className = 'upload-status mb-3' + (type ? (' ' + type) : '');
  }

  function syncResetPassBtn(){
    const btn = document.getElementById('maeOpenResetPassword');
    const pass = (document.getElementById('madEditPassword') || {}).value || '';
    if(!btn) return;
    btn.classList.toggle('is-pending', !!pass);
    btn.innerHTML = pass
      ? '<i class="bi bi-key-fill"></i> Password Ready'
      : '<i class="bi bi-key"></i> Reset Password';
  }

  function openResetPasswordModal(){
    const modal = document.getElementById('maeResetPasswordModal');
    if(!modal) return;
    setPassModalStatus('', '');
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    const pass = document.getElementById('madEditPassword');
    if(pass) setTimeout(function(){ pass.focus(); }, 30);
  }

  function closeResetPasswordModal(opts){
    opts = opts || {};
    const modal = document.getElementById('maeResetPasswordModal');
    if(modal){
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
    }
    if(!document.querySelector('.modal-clean.show')) document.body.classList.remove('modal-open');
    if(opts.clear){
      const a = document.getElementById('madEditPassword');
      const b = document.getElementById('madEditConfirmPassword');
      if(a){ a.value = ''; a.type = 'password'; }
      if(b){ b.value = ''; b.type = 'password'; }
    }
    syncResetPassBtn();
  }

  document.getElementById('madGeneratePassword')?.addEventListener('click', function(){
    const pwd = generatePassword(14);
    const a = document.getElementById('madEditPassword');
    const b = document.getElementById('madEditConfirmPassword');
    if(a){ a.type = 'text'; a.value = pwd; }
    if(b){ b.type = 'text'; b.value = pwd; }
    setPassModalStatus('Strong password generated. Copy it before applying.', 'success');
  });

  document.getElementById('maeOpenResetPassword')?.addEventListener('click', openResetPasswordModal);
  document.getElementById('maeApplyPassword')?.addEventListener('click', function(){
    const pass = document.getElementById('madEditPassword').value || '';
    const confirm = document.getElementById('madEditConfirmPassword').value || '';
    if(!pass){ setPassModalStatus('Please enter a new password.', 'error'); return; }
    if(pass.length < 8){ setPassModalStatus('Password must be at least 8 characters.', 'error'); return; }
    if(pass !== confirm){ setPassModalStatus('Confirm password does not match.', 'error'); return; }
    closeResetPasswordModal();
    setStatus('New password ready. Click Save Changes to apply.', 'success');
  });
  document.querySelectorAll('[data-mae-close-pass]').forEach(btn => {
    btn.addEventListener('click', function(){ closeResetPasswordModal({ clear: true }); });
  });
  document.getElementById('maeResetPasswordModal')?.addEventListener('click', function(e){
    if(e.target === this) closeResetPasswordModal({ clear: true });
  });
  listen(document,'keydown', function(e){
    if(e.key !== 'Escape') return;
    const modal = document.getElementById('maeResetPasswordModal');
    if(modal && modal.classList.contains('show')) closeResetPasswordModal({ clear: true });
  });

  listen(document,'click', function(e){
    const toggle = e.target.closest && e.target.closest('[data-toggle-password]');
    if(!toggle) return;
    const id = toggle.getAttribute('data-toggle-password');
    const input = document.getElementById(id);
    if(!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    const icon = toggle.querySelector('i');
    if(icon) icon.className = show ? 'bi bi-eye-slash' : 'bi bi-eye';
  });

  document.querySelectorAll('[data-mae-status]').forEach(btn => {
    btn.addEventListener('click', () => setAccountStatus(btn.getAttribute('data-mae-status')));
  });

  changeRoleBtn && changeRoleBtn.addEventListener('click', function(){
    setRoleMenuOpen(!roleMenuOpen);
  });
  roleMenu && roleMenu.addEventListener('click', function(e){
    const opt = e.target.closest && e.target.closest('.mac-role-option');
    if(!opt) return;
    selectRole(opt.getAttribute('data-role-id'));
  });
  listen(document,'click', function(e){
    if(!roleMenuOpen) return;
    if(e.target.closest && (e.target.closest('#madRoleMenu') || e.target.closest('#madRolePickBtn') || e.target.closest('.mac-role-dd'))) return;
    setRoleMenuOpen(false);
  });
  listen(document,'keydown', function(e){
    if(e.key === 'Escape' && roleMenuOpen) setRoleMenuOpen(false);
  });

  form && form.addEventListener('submit', async function(e){
    e.preventDefault();
    if(!editingId){ setStatus('Missing administrator id.', 'error'); return; }
    const pass = document.getElementById('madEditPassword').value || '';
    const confirm = document.getElementById('madEditConfirmPassword').value || '';
    if(pass || confirm){
      if(pass !== confirm){ setStatus('Confirm password does not match.', 'error'); return; }
      if(pass.length < 8){ setStatus('Password must be at least 8 characters.', 'error'); return; }
    }
    if(!roleSelect || !roleSelect.value){ setStatus('Please select a role.', 'error'); return; }

    submitBtn.disabled = true;
    setStatus('Saving changes...', '');
    try{
      const flags = actorFlags();
      if(Number(editingId) === 1 && !flags.rootAdmin) throw new Error('Root admin account is protected.');
      const email = (document.getElementById('madEditEmail') || {}).value || '';
      const ipOn = !!(document.getElementById('madIpWhitelist') || {}).checked;
      const remarkParts = [];
      if(email.trim()) remarkParts.push('Email: ' + email.trim());
      if(ipOn) remarkParts.push('IP whitelist: requested');
      const body = {
        username: document.getElementById('madEditUsername').value.trim(),
        displayName: document.getElementById('madEditDisplayName').value.trim(),
        status: Number(statusSelect.value || 1),
        roleId: Number(roleSelect.value),
        brandId: brandSelect && brandSelect.value ? Number(brandSelect.value) : null,
        password: pass,
        remark: remarkParts.join(' · ').slice(0, 200)
      };
      const json = await apiJson(BO_AUTH.adminUpdateUrl(editingId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...BO_AUTH.authHeader() },
        body: JSON.stringify(body)
      });
      setStatus(json.message || 'Admin updated successfully', 'success');
      if(Number(editingId) === Number((BO_AUTH.user() || {}).id) && json.data) BO_AUTH.saveUser(json.data);
      setTimeout(function(){ location.href = 'main-admin-detail.html'; }, 700);
    }catch(err){
      setStatus(err.message || 'Update admin failed', 'error');
      submitBtn.disabled = false;
    }
  });

  async function init(){
    try{
      if(window.BO_AUTH && typeof BO_AUTH.requireAuth === 'function') await BO_AUTH.requireAuth();
      else if(window.BO_AUTH && typeof BO_AUTH.ensureSession === 'function') await BO_AUTH.ensureSession();
    }catch(e){}

    editingId = qsId();
    if(!editingId){
      setStatus('Missing administrator id. Open this page from the admin list.', 'error');
      return;
    }
    setStatus('Loading administrator...', '');
    try{
      loadMenuCatalog();
      const row = await loadAdmin(editingId);
      applyAdmin(row);
      await loadRoles(row.brandId != null ? Number(row.brandId) : null);
      if(roleSelect && row.roleId != null) roleSelect.value = String(row.roleId);
      updateRoleCard();
      setStatus('', '');
      if(new URLSearchParams(location.search).get('focus') === 'password'){
        openResetPasswordModal();
      }
    }catch(err){
      setStatus(err.message || 'Unable to load administrator', 'error');
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
