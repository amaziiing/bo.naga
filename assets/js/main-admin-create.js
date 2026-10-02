(function(){
  'use strict';

  /* A swap re-runs this file against a fresh frame, so the document bindings below were added
     again on each entry. Release the previous run's bindings first. */
  if(window.__boMacUnbind) window.__boMacUnbind();
  const unbinds=[];
  const listen=(target,type,fn,opt)=>{ target.addEventListener(type,fn,opt); unbinds.push(()=>target.removeEventListener(type,fn,opt)); };
  window.__boMacUnbind=()=>{ unbinds.forEach(fn=>fn()); unbinds.length=0; };

  const form = document.getElementById('madCreateForm');
  const statusEl = document.getElementById('madCreateStatus');
  const submitBtn = document.getElementById('madCreateSubmit');
  const roleSelect = document.getElementById('madNewRole');
  const brandSelect = document.getElementById('madNewBrand');
  const changeRoleBtn = document.getElementById('madRolePickBtn');
  const roleMenu = document.getElementById('madRoleMenu');
  let roleRows = [];
  let roleMenuOpen = false;
  let menuMap = {};
  let rolePermCache = {};
  let permLoadToken = 0;

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

  async function apiJson(url, options){
    const res = await fetch(url, options || {});
    const json = await res.json().catch(() => ({}));
    if(!res.ok || json.status === 'error') throw new Error(json.message || 'Request failed');
    return json;
  }

  async function loadMenuCatalog(){
    if(Object.keys(menuMap).length) return menuMap;
    try{
      const json = await apiJson(BO_AUTH.menuListUrl(), { headers: { ...BO_AUTH.authHeader() } });
      const rows = Array.isArray(json.data) ? json.data : [];
      menuMap = Object.fromEntries(rows.map(m => [String(m.id), m]));
    }catch(e){
      menuMap = {};
    }
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
    if(!row || !row.id){
      renderPermissionTags([]);
      return;
    }
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
    if(!row){
      if(nameEl) nameEl.textContent = 'Select a role';
      if(primaryEl) primaryEl.hidden = true;
      if(countEl) countEl.textContent = '';
      renderPermissionTags([]);
      if(roleMenuOpen) renderRoleMenu();
      return;
    }
    const name = row.name || row.code || 'Role';
    const type = String(row.roleType || '').toUpperCase();
    if(nameEl) nameEl.textContent = name;
    if(primaryEl){
      const isPrimary = type === 'ROOT' || type === 'MASTER' || type === 'BRAND_OWNER';
      primaryEl.hidden = !isPrimary;
    }
    if(countEl){
      const n = Number(row.adminCount || row.activeAdmins || row.userCount || 0);
      countEl.textContent = n > 0 ? '(' + n + ' active admins)' : '';
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
    // MAIN operates as platform admin for branding (same as Master), even when
    // legacy masterAdmin boolean is missing/false on the cached user object.
    const platformAdmin = rootAdmin || masterAdmin || mainAdmin || user.brandId == null;
    return { user, role, mainAdmin, rootAdmin, masterAdmin, platformAdmin };
  }

  function activeBrandId(){
    if(window.BO_BRAND && typeof BO_BRAND.activeId === 'function'){
      const id = Number(BO_BRAND.activeId());
      if(Number.isFinite(id) && id > 0) return id;
    }
    const stored = Number(localStorage.getItem('bo_active_brand_id') || 0);
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  }

  function resolveCreateBrandId(roleRow){
    if(brandSelect && brandSelect.value) return Number(brandSelect.value);
    if(roleRow && roleRow.brandId != null && roleRow.brandId !== '') return Number(roleRow.brandId);
    const active = activeBrandId();
    if(active) return active;
    const user = BO_AUTH.user() || {};
    if(user.brandId != null && user.brandId !== '') return Number(user.brandId);
    return null;
  }

  async function loadRoles(brandId){
    try{
      const flags = actorFlags();
      const headers = { ...BO_AUTH.authHeader() };
      if(brandId) headers['X-Brand-Id'] = String(brandId);
      // Create Admin must use the same complete platform role catalogue as
      // Roles & Permissions. ROLE_LIST (/roles) can be scope-filtered depending on
      // the current session/brand header, which caused this page to show
      // "No roles available" while menu-permission.html could still see the roles.
      // Platform actors therefore load /roles/all first, with /roles as a safe
      // fallback for tenant-scoped administrators.
      const primaryRoleUrl = flags.platformAdmin && BO_AUTH.roleListAllUrl
        ? BO_AUTH.roleListAllUrl()
        : BO_AUTH.roleListUrl();
      let json;
      try{
        json = await apiJson(primaryRoleUrl, { headers });
      }catch(primaryError){
        if(primaryRoleUrl === BO_AUTH.roleListUrl()) throw primaryError;
        json = await apiJson(BO_AUTH.roleListUrl(), { headers });
      }
      let rows = Array.isArray(json.data) ? json.data : [];
      if(flags.rootAdmin){
        rows = brandId
          ? rows.filter(r => Number(r.brandId) === Number(brandId) && !['MASTER', 'ROOT', 'MAIN'].includes(String(r.roleType || '').toUpperCase()))
          : rows.filter(r => r.brandId == null && String(r.roleType || '').toUpperCase() !== 'ROOT');
      }else if(flags.mainAdmin){
        // MAIN/Boss can assign every active platform/global role except ROOT.
        // Merchant Brand Owner accounts are managed from the Merchant-specific flow.
        rows = rows.filter(r => {
          const type = String(r.roleType || '').toUpperCase();
          return type !== 'ROOT' && type !== 'BRAND_OWNER' && Number(r.status == null ? 1 : r.status) === 1;
        });
      }else{
        rows = rows.filter(r => !['MASTER', 'ROOT', 'MAIN'].includes(String(r.roleType || 'CUSTOM').toUpperCase()));
        if(brandId){
          rows = rows.filter(r => Number(r.brandId) === Number(brandId));
        }
      }
      roleRows = rows;
      if(roleSelect){
        const keep = rows.some(r => String(r.id) === String(roleSelect.value));
        roleSelect.value = keep ? String(roleSelect.value) : (rows[0] ? String(rows[0].id) : '');
      }
      updateRoleCard();
      if(roleMenuOpen) renderRoleMenu();
      return rows;
    }catch(e){
      roleRows = [];
      if(roleSelect) roleSelect.value = '';
      updateRoleCard();
      return [];
    }
  }

  async function loadBrandOptions(){
    if(!brandSelect) return;
    const flags = actorFlags();
    // MAIN-created admins are platform-scoped and do not require Brand Management
    // permission just to load the administrator-create screen.
    if(flags.mainAdmin){
      brandSelect.value = '';
      await loadRoles(null);
      return;
    }
    // Tenant brand admins are pinned to their own brand.
    if(!flags.platformAdmin){
      const bid = flags.user.brandId || '';
      brandSelect.value = bid ? String(bid) : '';
      await loadRoles(bid || null);
      return;
    }
    try{
      const r = await fetch(API_CONFIG.BASE_URL + (API_CONFIG.ENDPOINTS.BRAND_LIST || '/admin/brands'), {
        headers: { ...BO_AUTH.authHeader() }
      });
      const j = await r.json();
      const rows = Array.isArray(j.data) ? j.data : [];
      const active = activeBrandId() || 1;
      if(flags.rootAdmin || flags.mainAdmin){
        brandSelect.value = '';
        await loadRoles(null);
      }else{
        const pick = rows.some(x => Number(x.id) === Number(active)) ? active : (rows[0] && rows[0].id);
        brandSelect.value = pick != null ? String(pick) : '';
        await loadRoles(brandSelect.value ? Number(brandSelect.value) : null);
      }
    }catch(e){
      const fallback = activeBrandId();
      if(fallback && !flags.rootAdmin){
        brandSelect.value = String(fallback);
        await loadRoles(fallback);
      }else{
        await loadRoles(null);
      }
    }
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

  document.getElementById('madGeneratePassword') && document.getElementById('madGeneratePassword').addEventListener('click', function(){
    const pwd = generatePassword(14);
    const a = document.getElementById('madNewPassword');
    const b = document.getElementById('madNewConfirmPassword');
    if(a){ a.type = 'text'; a.value = pwd; }
    if(b){ b.type = 'text'; b.value = pwd; }
    setStatus('Strong password generated. Copy it before leaving this page.', 'success');
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

  roleSelect && roleSelect.addEventListener('change', updateRoleCard);

  form && form.addEventListener('submit', async function(e){
    e.preventDefault();
    const pass = document.getElementById('madNewPassword').value;
    const confirm = document.getElementById('madNewConfirmPassword').value;
    if(pass !== confirm){ setStatus('Confirm password does not match.', 'error'); return; }
    if(pass.length < 8){ setStatus('Password must be at least 8 characters.', 'error'); return; }
    submitBtn.disabled = true;
    setStatus('Creating admin...', '');
    try{
      const flags = actorFlags();
      const token = BO_AUTH.token();
      if(!token) throw new Error('Session expired. Please log in again.');

      if(!roleSelect || !roleSelect.value){
        throw new Error(flags.rootAdmin
          ? 'Please select a role.'
          : (flags.mainAdmin ? 'Please select an administrator role.' : 'Please select a branding role.'));
      }
      const roleRow = roleRows.find(r => String(r.id) === String(roleSelect.value));
      const roleType = String((roleRow && roleRow.roleType) || '').toUpperCase();
      let brandId = flags.mainAdmin ? null : resolveCreateBrandId(roleRow);
      if(!flags.mainAdmin && roleType !== 'MASTER' && roleType !== 'ROOT' && roleType !== 'MAIN' && !brandId){
        throw new Error('Please select the branding for this administrator.');
      }
      if(flags.mainAdmin || roleType === 'MASTER' || roleType === 'ROOT' || roleType === 'MAIN') brandId = null;
      if(brandSelect && brandId != null) brandSelect.value = String(brandId);

      const email = (document.getElementById('madNewEmail') || {}).value || '';
      const remarkBase = (document.getElementById('madNewRemark') || {}).value || '';
      const ipOn = !!(document.getElementById('madIpWhitelist') || {}).checked;
      const remarkParts = [String(remarkBase || '').trim()];
      if(email.trim()) remarkParts.push('Email: ' + email.trim());
      if(ipOn) remarkParts.push('IP whitelist: requested');
      const remark = remarkParts.filter(Boolean).join(' · ').slice(0, 200);

      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      };
      if(brandId) headers['X-Brand-Id'] = String(brandId);

      const json = await apiJson(BO_AUTH.createAdminUrl(), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username: document.getElementById('madNewUsername').value.trim(),
          displayName: document.getElementById('madNewDisplayName').value.trim(),
          password: pass,
          status: Number(document.getElementById('madNewStatus').value || 1),
          roleId: Number(roleSelect.value),
          brandId: brandId,
          remark: remark
        })
      });
      setStatus(json.message || 'Admin created successfully', 'success');
      setTimeout(function(){ location.href = 'main-admin-detail.html'; }, 700);
    }catch(err){
      let msg = err.message || 'Create admin failed';
      if(/Admin Management permission required/i.test(msg)){
        const menus = Array.isArray((BO_AUTH.user() || {}).menus) ? BO_AUTH.user().menus : [];
        const hasLegacyAdmin = menus.some(m => String(m.menuKey || '').toLowerCase() === 'admin');
        const hasMainDetail = menus.some(m => {
          const k = String(m.menuKey || '').toLowerCase();
          return k === 'main_admin_detail' || k === 'admin_detail';
        });
        if(hasMainDetail && !hasLegacyAdmin){
          msg = 'Create requires Admin Management API permission. Your role has Admin → Details only — ask ROOT to also grant Admin Management (admin), or update the create API to accept main_admin_detail.';
        }
      }
      setStatus(msg, 'error');
      submitBtn.disabled = false;
    }
  });

  async function init(){
    try{
      if(window.BO_AUTH && typeof BO_AUTH.requireAuth === 'function') await BO_AUTH.requireAuth();
      else if(window.BO_AUTH && typeof BO_AUTH.ensureSession === 'function') await BO_AUTH.ensureSession();
    }catch(e){ /* auth scripts handle redirect */ }
    loadMenuCatalog();
    await loadBrandOptions();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
