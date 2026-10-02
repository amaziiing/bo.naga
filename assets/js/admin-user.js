(function(){
  function pageButtons(current,total){
    // The house ladder (access-control-listing.js -> boAc.pageButtons): First,
    // "Previous page", numbered rungs, "Next page", Last — the same anatomy every
    // other listing renders, from one implementation instead of a copy per page.
    if (window.boAc && boAc.pageButtons) return boAc.pageButtons(current, total);
    return '<button type="button" class="smart-page" data-page="' + current + '" aria-current="page">' + current + '</button>';
  }

  const tbody = document.getElementById('adminTableBody');
  const mobileCards = document.getElementById('adminMobileCards');
  const editModal = document.getElementById('adminEditModal');
  const editForm = document.getElementById('editAdminForm');
  const searchInput = document.getElementById('adminSearchInput');
  const cancelBtn = document.getElementById('cancelCreateAdminBtn');
  const exportBtn = document.getElementById('exportAdminBtn');
  const pageSizeEl = document.getElementById('adminPageSize');
  const prevBtn = document.getElementById('adminPrevPage');
  const nextBtn = document.getElementById('adminNextPage');
  const pageNoEl = document.getElementById('adminPager');
  const infoEl = document.getElementById('adminTableInfo');
  const countBadge = document.getElementById('adminCountBadge');
  const selectAll = document.getElementById('adminSelectAll');
  let editingId = null;
  let roleMap = {};
  let allAdmins = [];
  let filteredAdmins = [];
  let currentPage = 1;

  /* The status filter is a pill group now (Active / Disabled / All) instead of the
     strip's Status select. `statusTerm` is the whole of that control's state, and its
     values are the ones the shared pill recipe already speaks — `active` /
     `suspended` / `all` — so the dots, the cream frame and the dark-theme colours all
     come from `bo-charcoal-shell.css` rather than from a second copy here. */
  let statusTerm = 'active';

  function statusPills(){
    return document.querySelectorAll('.ac-status-pills [data-mad-status]');
  }

  /* A row is `active` or `suspended` (the table calls the second one Disabled). One
     vocabulary for the attribute on both sides, so filtering is a string compare. */
  function rowStatus(row){
    return Number(row.status == null ? 1 : row.status) === 1 ? 'active' : 'suspended';
  }

  function syncStatusPills(){
    statusPills().forEach(function(btn){
      const on = btn.getAttribute('data-mad-status') === statusTerm;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function wireStatusPills(){
    const buttons = statusPills();
    if(!buttons.length) return;
    buttons.forEach(function(btn){
      btn.addEventListener('click', function(){
        statusTerm = btn.getAttribute('data-mad-status') || 'all';
        syncStatusPills();
        applyFilters();
      });
    });
    syncStatusPills();
  }

  // Defensive initial state: neither Create nor Edit modal may open by itself.
  [document.getElementById('adminCreateModal'), editModal].forEach(function(modal){
    if(modal){ modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); }
  });
  document.body.classList.remove('modal-open');

  function setStatus(el, message, type){
    if(!el) return;
    el.textContent = message || '';
    el.className = 'upload-status mb-3 ' + (type || '');
  }

  function dt(value){
    if(!value) return '-';
    try{
      const d = new Date(value);
      if(isNaN(d.getTime())) return String(value).replace('T',' ').replace(/\.\d+.*$/,'');
      const pad = n => String(n).padStart(2,'0');
      return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
    }catch(e){ return String(value || '-'); }
  }

  /* The date in the cell, the time on hover (`boAc.dtCell`, the member listing's own pattern).
     This used to stack the two with a `<br>`, which made every row two lines tall for a column
     that only needs the day. Falls back to the plain stamp if the shared helper is absent. */
  function dateCell(value){
    return (window.boAc && boAc.dtCell) ? boAc.dtCell(dt(value)) : dt(value);
  }

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function initials(row){
    const name = String(row.displayName || row.username || 'A').trim();
    return (name.substring(0,2) || 'AD').toUpperCase();
  }

  function roleName(row){
    return roleMap[String(row.roleId)] || row.roleName || row.role || (Number(row.roleId) === 1 ? 'Super Admin' : 'Admin');
  }

  async function apiJson(url, options){
    const res = await fetch(url, options || {});
    const json = await res.json().catch(() => ({}));
    if(!res.ok || json.status === 'error') throw new Error(json.message || 'Request failed');
    return json;
  }

  async function loadRoles(brandId){
    try{
      const current=BO_AUTH.user()||{};
      const headers={...BO_AUTH.authHeader()};
      if(brandId) headers['X-Brand-Id']=String(brandId);
      const json = await apiJson(BO_AUTH.roleListUrl(), {headers});
      let rows = Array.isArray(json.data) ? json.data : [];
      if(current.rootAdmin){
        rows = brandId ? rows.filter(r=>Number(r.brandId)===Number(brandId) && !['MASTER','ROOT'].includes(String(r.roleType||'').toUpperCase())) : rows.filter(r=>r.brandId==null && String(r.roleType||'').toUpperCase()==='MASTER');
      }else{
        rows = rows.filter(r=>!['MASTER','ROOT'].includes(String(r.roleType||'CUSTOM').toUpperCase()));
      }
      roleMap = Object.assign(roleMap, Object.fromEntries(rows.map(r=>[String(r.id),r.name||r.code])));
      const html = rows.map(r => '<option value="'+esc(r.id)+'">'+esc(r.name || r.code)+(r.roleType==='BRAND_OWNER'?' (Owner)':'')+'</option>').join('') || '<option value="">No role available for this selection</option>';
      ['newAdminRole','editAdminRole'].forEach(id => { const el=document.getElementById(id); if(el) el.innerHTML = html; });
      const pg = document.getElementById('newAdminPermissionGroup'); if(pg) pg.innerHTML = '<option value="">Select permission group (optional)</option>' + html;
      return rows;
    }catch(e){
      ['newAdminRole','editAdminRole'].forEach(id => { const el=document.getElementById(id); if(el) el.innerHTML = '<option value="">Unable to load roles</option>'; });
      return [];
    }
  }

  function updateStats(rows){
    const total = rows.length;
    const active = rows.filter(r => Number(r.status) === 1).length;
    const disabled = total - active;
    const today = new Date().toISOString().slice(0,10);
    const loginToday = rows.filter(r => String(r.lastLoginAt || r.lastLogin || '').slice(0,10) === today).length;
    const set = (id,val) => { const el=document.getElementById(id); if(el) el.textContent = val; };
    set('adminStatTotal', total);
    set('adminStatActive', active);
    set('adminStatDisabled', disabled);
    set('adminStatLoginToday', loginToday);
    /* The pills count the whole roster, not the current view — the same numbers the
       metric cards above them carry, so the two can never disagree. */
    set('adminCountAll', total);
    set('adminCountActive', active);
    set('adminCountDisabled', disabled);
  }

  function applyFilters(){
    const q = (searchInput && searchInput.value || '').trim().toLowerCase();
    const status = statusTerm;
    filteredAdmins = allAdmins.filter(row => {
      const hay = [row.username, row.displayName, roleName(row)].join(' ').toLowerCase();
      if(q && !hay.includes(q)) return false;
      if(status !== 'all' && rowStatus(row) !== status) return false;
      return true;
    });
    currentPage = 1;
    renderAdmins();
  }

  function renderAdmins(){
    if(!tbody) return;
    // `-` (the default) fits the panel; `All` shows every row (boAc, see
    // access-control-listing.js — the app-wide page-size contract).
    const rawSize = pageSizeEl && pageSizeEl.value;
    const pageSize = window.boAc ? boAc.resolve(rawSize, document.querySelector('.table-card'))
                                 : (Number(rawSize) > 0 ? Number(rawSize) : 10);
    const total = filteredAdmins.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    // `-` means "fit the panel": the count needs a painted row to measure, so the
    // first render after the rows arrive re-runs once with the measured fit.
    if (window.boAc && String(rawSize) === boAc.FIT && !renderAdmins._refit && total) {
      const fitted = boAc.resolve(rawSize, document.querySelector('.table-card'));
      if (fitted !== pageSize) { renderAdmins._refit = true; renderAdmins(); renderAdmins._refit = false; return; }
    }
    currentPage = Math.max(1, Math.min(currentPage, totalPages));
    const start = (currentPage - 1) * pageSize;
    const rows = filteredAdmins.slice(start, start + pageSize);
    if(countBadge) countBadge.textContent = total + ' Account' + (total === 1 ? '' : 's');
    if(pageNoEl) pageNoEl.innerHTML = pageButtons(currentPage, totalPages);
    if(infoEl) infoEl.textContent = total ? ('Showing '+(start+1)+' to '+(start+rows.length)+' of '+total+' entries') : 'Showing 0 to 0 of 0 entries';
    if(prevBtn) prevBtn.disabled = currentPage <= 1;
    if(nextBtn) nextBtn.disabled = currentPage >= totalPages;
    if(!rows.length){
      tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4">No admin found.</td></tr>';
      if(mobileCards) mobileCards.innerHTML = '';
      return;
    }
    const currentId = Number((BO_AUTH.user() || {}).id);
    tbody.innerHTML = rows.map(row => {
      const active = Number(row.status) === 1;
      const current = Number(row.id) === currentId;
      const viewer = BO_AUTH.user() || {};
      const viewerRoot = viewer.rootAdmin === true || Number(viewer.rootAdmin) === 1 || String(viewer.roleType||'').toUpperCase() === 'ROOT' || (Number(viewer.id)===1 && viewer.brandId==null);
      const protectedRoot = Number(row.id) === 1 && !viewerRoot;
      return '<tr>'+
        '<td class="admin-check-col"><input type="checkbox" class="admin-row-check" value="'+esc(row.id)+'"></td>'+
        '<td><div class="admin-cell-user"><span class="admin-avatar">'+esc(initials(row))+'</span><div><b>'+esc(row.username)+'</b> '+(current?'<span class="current-login-pill">Current Login</span>':'')+'</div></div></td>'+
        '<td>'+esc(row.displayName || row.username || '-')+'</td>'+
        '<td><span class="role-pill '+(roleName(row).toLowerCase().includes('super')?'super':'')+'">'+esc(roleName(row))+'</span></td>'+
        '<td><span class="admin-status-pill '+(active?'active':'disabled')+'"><i></i>'+(active?'Active':'Disabled')+'</span></td>'+
        '<td>'+dateCell(row.lastLoginAt || row.lastLogin || row.loginAt)+'</td>'+
        '<td>'+dateCell(row.createdAt || row.created_at)+'</td>'+
        '<td><b>'+esc(row.createdByName || row.createdByUsername || row.createdBy || row.creator || '-')+'</b></td>'+
        '<td><div class="user-row-actions admin-actions">'+(protectedRoot?'<span class="status-pill active" title="Root account cannot be modified by non-root administrators">Protected</span>':'<a class="icon-action admin-edit-btn" title="Edit" href="admin-user-create.html?id='+esc(row.id)+'"><i class="bi bi-pencil"></i></a>' + '<button class="icon-action danger admin-delete-btn" title="Delete" type="button" data-id="'+esc(row.id)+'"><i class="bi bi-trash"></i></button>')+'</div></td>'+
      '</tr>';
    }).join('');
    if(mobileCards){
      mobileCards.innerHTML = rows.map(row => { const viewer=BO_AUTH.user()||{}; const viewerRoot=viewer.rootAdmin===true||Number(viewer.rootAdmin)===1||String(viewer.roleType||'').toUpperCase()==='ROOT'||(Number(viewer.id)===1&&viewer.brandId==null); const protectedRoot=Number(row.id)===1&&!viewerRoot; return '<div class="member-card admin-mobile-card"><div class="member-card-head"><h3>'+esc(row.username)+'</h3><span class="admin-status-pill '+(Number(row.status)===1?'active':'disabled')+'"><i></i>'+(Number(row.status)===1?'Active':'Disabled')+'</span></div><div class="member-grid"><span>Display Name</span><b>'+esc(row.displayName || '-')+'</b><span>Role</span><b>'+esc(roleName(row))+'</b><span>Created</span><b>'+esc(dt(row.createdAt || row.created_at))+'</b><span>Created By</span><b>'+esc(row.createdByName || row.createdByUsername || row.createdBy || row.creator || '-')+'</b></div><div class="admin-mobile-actions">'+(protectedRoot?'<span class="status-pill active">Protected</span>':'<a class="clean-btn primary admin-edit-btn" href="admin-user-create.html?id='+esc(row.id)+'">Edit</a>' + '<button class="clean-btn danger admin-delete-btn" data-id="'+esc(row.id)+'">Delete</button>')+'</div></div>'; }).join('');
    }
  // settled after the paint: `-` is verified on real rows, not the placeholder
  // one post-paint verification pass so `-` is exact (see access-control-listing.js)
  if (window.boAc && boAc.settle) boAc.settle(document.querySelector('.table-card'), renderAdmins);
  }

  async function loadBrandOptions(){
    const newSel=document.getElementById('newAdminBrand'), editSel=document.getElementById('editAdminBrand');
    if(!newSel&&!editSel)return;
    const user=BO_AUTH.user()||{};
    if(!user.masterAdmin){
      const bid=user.brandId||''; const label='Current Branding'+(bid?' (#'+bid+')':'');
      const html='<option value="'+esc(bid)+'">'+esc(label)+'</option>';
      if(newSel){newSel.innerHTML=html;newSel.disabled=true;} if(editSel){editSel.innerHTML=html;editSel.disabled=true;}
      await loadRoles(bid); return;
    }
    try{
      const r=await fetch(API_CONFIG.BASE_URL+(API_CONFIG.ENDPOINTS.BRAND_LIST||'/admin/brands'),{headers:{...BO_AUTH.authHeader()}});const j=await r.json();const rows=Array.isArray(j.data)?j.data:[];
      const html=(user.rootAdmin?'<option value="">Platform Master Account</option>':'<option value="">Select Branding</option>')+rows.map(x=>'<option value="'+x.id+'">'+esc(x.name||x.code)+' (#'+x.id+')</option>').join('');
      if(newSel)newSel.innerHTML=html;if(editSel)editSel.innerHTML=html;
      const active=(window.BO_BRAND&&BO_BRAND.activeId?BO_BRAND.activeId():1); if(newSel&&rows.some(x=>Number(x.id)===Number(active))&&!user.rootAdmin)newSel.value=String(active);
      await loadRoles(newSel&&newSel.value?Number(newSel.value):(user.rootAdmin?null:active));
    }catch(e){}
  }

  async function loadAdmins(){
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9">Loading admin accounts...</td></tr>';
    try{
      const json = await apiJson(BO_AUTH.adminListUrl(), {headers: {...BO_AUTH.authHeader()}});
      allAdmins = Array.isArray(json.data) ? json.data : [];
      updateStats(allAdmins);
      filteredAdmins = allAdmins.slice();
      renderAdmins();
    }catch(err){
      tbody.innerHTML = '<tr><td colspan="9" class="text-danger">'+esc(err.message || 'Load admin failed')+'</td></tr>';
    }
  }

  /* Create Admin moved to its own page (admin-user-create.html). The modal, its
     submit handler and its open/close wiring moved with it; this page edits only. */

  /* Edit Admin moved to its own page (admin-user-create.html?id=N): the modal,
     its prefill and its submit handler all went with it. */
  document.addEventListener('click', function(e){
    const del = e.target.closest && e.target.closest('.admin-delete-btn');
    if(del){
      const id=Number(del.dataset.id||0);
      const currentId=Number((BO_AUTH.user()||{}).id||0);
      if(!id){ BO_DIALOG.alert('Missing admin ID'); return; }
      const viewer=BO_AUTH.user()||{}; const viewerRoot=viewer.rootAdmin===true||Number(viewer.rootAdmin)===1||String(viewer.roleType||'').toUpperCase()==='ROOT'||(Number(viewer.id)===1&&viewer.brandId==null);
      if(id===1&&!viewerRoot){ BO_DIALOG.alert('Root admin account is protected.'); return; }
      if(id===currentId){ BO_DIALOG.alert('You cannot delete the admin account currently logged in.'); return; }
      (async()=>{
        if(!(await BO_DIALOG.confirm('Delete this administrator account?', {title:'Delete Administrator',confirmText:'Delete'}))) return;
        try{ const json=await apiJson(BO_AUTH.adminDeleteUrl(id),{method:'POST',headers:{...BO_AUTH.authHeader()}}); await BO_DIALOG.alert(json.message||'Admin deleted successfully'); await loadAdmins(); }
        catch(err){ await BO_DIALOG.alert(err.message||'Delete admin failed'); }
      })();
      return;
    }
    const toggle = e.target.closest && e.target.closest('[data-toggle-password]');
    if(toggle){ const id = toggle.getAttribute('data-toggle-password'); const input = document.getElementById(id); if(input){ input.type = input.type === 'password' ? 'text' : 'password'; } }
  });

  /* The edit form lives on admin-user-create.html?id=N now. */

  // No Reset / Search in the strip any more: the field drives the filter. Text
  // waits out a 400ms debounce (the report family's value). Enter still commits
  // immediately. The Role select went with its own dead option list - the pills
  // and the search field are this page's controls (see admin-user.html).
  (function wireLiveFilters(){
    let t = 0;
    const soon = () => { clearTimeout(t); t = setTimeout(applyFilters, 400); };
    if (searchInput) {
      searchInput.addEventListener('input', soon);
      searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(t); applyFilters(); } });
    }
  })();
  wireStatusPills();
  searchInput && searchInput.addEventListener('keydown', e => { if(e.key === 'Enter') applyFilters(); });
  cancelBtn && cancelBtn.addEventListener('click', closeCreateAdmin);
  pageSizeEl && pageSizeEl.addEventListener('change', () => { currentPage = 1; renderAdmins(); });
  prevBtn && prevBtn.addEventListener('click', () => { currentPage--; renderAdmins(); });
  nextBtn && nextBtn.addEventListener('click', () => { currentPage++; renderAdmins(); });
  pageNoEl && pageNoEl.addEventListener('click', e => { const b=e.target.closest('[data-page]'); if(!b)return; const pageSize=Number(pageSizeEl&&pageSizeEl.value||10); const totalPages=Math.max(1,Math.ceil(filteredAdmins.length/pageSize)); const n=Number(b.dataset.page); if(n>=1&&n<=totalPages&&n!==currentPage){currentPage=n;renderAdmins();} });
  selectAll && selectAll.addEventListener('change', () => document.querySelectorAll('.admin-row-check').forEach(cb => cb.checked = selectAll.checked));
  const remark = document.getElementById('newAdminRemark');
  remark && remark.addEventListener('input', () => { const rc=document.getElementById('adminRemarkCount'); if(rc) rc.textContent = remark.value.length; });
  exportBtn && exportBtn.addEventListener('click', () => {
    const csv = [['Username','Display Name','Role','Status','Last Login','Created']].concat(filteredAdmins.map(r => [r.username||'', r.displayName||'', roleName(r), Number(r.status)===1?'Active':'Disabled', dt(r.lastLoginAt||r.lastLogin), dt(r.createdAt||r.created_at)]));
    const blob = new Blob([csv.map(row => row.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n')], {type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'admin-accounts.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500);
  });

  const newBrandEl=document.getElementById('newAdminBrand');
  const editBrandEl=document.getElementById('editAdminBrand');
  newBrandEl && newBrandEl.addEventListener('change',()=>{ loadRoles(newBrandEl.value?Number(newBrandEl.value):null); });
  editBrandEl && editBrandEl.addEventListener('change',()=>{ loadRoles(editBrandEl.value?Number(editBrandEl.value):null); });
  (async function(){ await loadBrandOptions(); await loadAdmins(); })();
})();
