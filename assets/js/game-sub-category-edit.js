function adminApi(pathKey) {
  return API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS[pathKey];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { ...(BO_AUTH.authHeader ? BO_AUTH.authHeader() : {}) } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === 'error') throw new Error(json.message || 'Request failed');
  return json;
}

const GAME_API_CATEGORY_SUB_EDIT = { list: adminApi('GAME_CATEGORY_LIST') };
const GAME_API_PROVIDER_SUB_EDIT = { list: adminApi('GAME_PROVIDER_LIST') };
const GAME_API_SUB_CATEGORY_EDIT = {
  list: adminApi('GAME_SUB_CATEGORY_LIST'),
  create: adminApi('GAME_SUB_CATEGORY_CREATE'),
  update: adminApi('GAME_SUB_CATEGORY_UPDATE')
};

(function () {
  const $ = id => document.getElementById(id);
  const form = $('subCategoryForm');
  if (!form) return;

  BO_AUTH.requireLogin && BO_AUTH.requireLogin();
  BO_AUTH.renderProfile && BO_AUTH.renderProfile();
  BO_AUTH.renderSidebar && BO_AUTH.renderSidebar();

  const tenantPresentation = !!(window.BO_BRAND && !window.BO_BRAND.isMaster());
  const pageTitle = $('subCategoryEditPageTitle');
  const id = $('subCategoryId');
  const categoryId = $('subCategoryCategoryId');
  const providerCode = $('subCategoryProviderCode');
  const name = $('subCategoryName');
  const nameZh = $('subCategoryNameZh');
  const sortOrder = $('subCategorySortOrder');
  const status = $('subCategoryStatus');
  const statusSeg = $('subCategoryStatusSeg');
  const saveBtn = $('saveSubCategoryBtn');
  const resetBtn = $('resetSubCategoryBtn');
  const statusBox = $('subCategoryStatusBox');

  let categories = [];
  let providers = [];
  let editMode = false;
  let loadedItem = null;

  function qs() {
    try { return new URLSearchParams(location.search); }
    catch (_) { return new URLSearchParams(); }
  }

  function setStatus(message, type) {
    if (!statusBox) return;
    statusBox.textContent = message || '';
    statusBox.className = 'upload-status' + (type ? ' ' + type : '');
  }

  function setBusy(isBusy) {
    if (saveBtn) {
      saveBtn.disabled = isBusy;
      saveBtn.innerHTML = isBusy
        ? '<i class="bi bi-hourglass-split" aria-hidden="true"></i> Saving...'
        : '<i class="bi bi-check-lg" aria-hidden="true"></i> Save Sub Category';
    }
    if (resetBtn) resetBtn.disabled = isBusy;
  }

  function setChrome(title) {
    if (pageTitle) pageTitle.textContent = title;
    document.title = title;
  }

  function syncStatusSeg(value) {
    const v = String(value ?? '1');
    if (status) status.value = v;
    if (!statusSeg) return;
    statusSeg.querySelectorAll('[data-status]').forEach(btn => {
      btn.classList.toggle('is-active', String(btn.dataset.status) === v);
    });
  }

  function syncRoundedSelect(select) {
    if (!select) return;
    select.dispatchEvent(new Event('change', { bubbles: false }));
  }

  function providerCodeOf(item) {
    return String(item?.code || item?.providerCode || item?.provider_code || '').trim().toUpperCase();
  }

  function firstValue(item, keys) {
    for (const key of keys) {
      const value = item && item[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
  }

  function fillOptions() {
    if (categoryId) {
      categoryId.innerHTML = categories.map(item =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`
      ).join('') || '<option value="">No category found</option>';
    }
    if (providerCode) {
      providerCode.innerHTML = providers.map(item =>
        `<option value="${escapeHtml(providerCodeOf(item))}">${escapeHtml(item.name || providerCodeOf(item))}</option>`
      ).join('') || '<option value="">No provider found</option>';
    }
  }

  async function loadSetup() {
    const [catJson, providerJson] = await Promise.all([
      fetchJson(GAME_API_CATEGORY_SUB_EDIT.list),
      fetchJson(GAME_API_PROVIDER_SUB_EDIT.list).catch(() => ({ data: [] }))
    ]);
    categories = catJson.data || [];
    providers = (providerJson.data || []).filter(x => Number(x.status) === 1 || x.status == null);
    fillOptions();
  }

  function resetForm() {
    if (editMode && loadedItem) {
      applyItem(loadedItem);
      setStatus('Form reset to saved values.', 'success');
      return;
    }
    id.value = '';
    if (categories[0]) categoryId.value = String(categories[0].id);
    if (providers[0]) providerCode.value = providerCodeOf(providers[0]);
    name.value = '';
    if (nameZh) nameZh.value = '';
    sortOrder.value = '0';
    syncStatusSeg('1');
    syncRoundedSelect(categoryId);
    syncRoundedSelect(providerCode);
    setChrome('Create Sub Category');
    setStatus('', '');
  }

  function applyItem(item) {
    loadedItem = item;
    editMode = true;
    id.value = firstValue(item, ['id', 'subCategoryId', 'sub_category_id']);
    categoryId.value = String(firstValue(item, ['categoryId', 'category_id', 'gameCategoryId', 'game_category_id']));
    providerCode.value = String(firstValue(item, ['providerCode', 'provider_code', 'code'])).trim().toUpperCase();
    name.value = firstValue(item, ['name', 'subCategoryName', 'sub_category_name']) || '';
    if (nameZh) nameZh.value = firstValue(item, ['nameZh', 'name_zh', 'chineseName']) || '';
    sortOrder.value = firstValue(item, ['sortOrder', 'sort_order']) || 0;
    syncStatusSeg(String(firstValue(item, ['status']) || 1));
    syncRoundedSelect(categoryId);
    syncRoundedSelect(providerCode);
    setChrome('Edit Sub Category #' + id.value);
    setStatus(
      tenantPresentation
        ? 'Branding mode: presentation fields may be limited.'
        : 'Editing sub category.',
      'success'
    );
  }

  async function loadExisting() {
    const editId = qs().get('id');
    if (!editId) {
      editMode = false;
      setChrome('Create Sub Category');
      resetForm();
      return;
    }
    try {
      const json = await fetchJson(GAME_API_SUB_CATEGORY_EDIT.list);
      const items = json.data || [];
      const item = items.find(x => String(x.id) === String(editId));
      if (!item) throw new Error('Sub category not found.');
      applyItem(item);
    } catch (err) {
      setStatus(err.message || 'Unable to load sub category.', 'error');
    }
  }

  async function saveSubCategory(e) {
    e.preventDefault();
    const isUpdate = !!id.value;
    if (tenantPresentation && !isUpdate) {
      setStatus('Brand sub categories are inherited from TitanX. Edit an existing sub category.', 'error');
      return;
    }
    if (!categoryId.value) {
      setStatus('Please select parent category.', 'error');
      categoryId.focus();
      return;
    }
    if (!providerCode.value) {
      setStatus('Please select provider.', 'error');
      providerCode.focus();
      return;
    }
    if (!name.value.trim()) {
      setStatus('Please enter sub category name.', 'error');
      name.focus();
      return;
    }

    const fd = new FormData();
    if (isUpdate) fd.append('id', id.value);
    if (!tenantPresentation) {
      fd.append('categoryId', categoryId.value);
      fd.append('providerCode', providerCode.value);
      fd.append('name', name.value.trim());
      if (nameZh) fd.append('nameZh', nameZh.value.trim());
      fd.append('sortOrder', sortOrder.value || '0');
      fd.append('status', status.value || '1');
    }

    setBusy(true);
    setStatus(isUpdate ? 'Updating sub category...' : 'Creating sub category...', '');
    try {
      const res = await fetch(isUpdate ? GAME_API_SUB_CATEGORY_EDIT.update : GAME_API_SUB_CATEGORY_EDIT.create, {
        method: 'POST',
        body: fd,
        headers: { ...(BO_AUTH.authHeader ? BO_AUTH.authHeader() : {}) }
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Save failed');
      setStatus(json.message || 'Sub category saved successfully.', 'success');
      window.setTimeout(() => { location.href = 'game-sub-category.html'; }, 450);
    } catch (err) {
      setStatus(err.message || 'Save failed. Please check API URL / CORS.', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (tenantPresentation) {
    [categoryId, providerCode, name, nameZh, sortOrder].forEach(el => { if (el) el.disabled = true; });
    statusSeg?.querySelectorAll('button').forEach(btn => { btn.disabled = true; });
    if (resetBtn) resetBtn.style.display = 'none';
  }

  statusSeg?.addEventListener('click', e => {
    const btn = e.target.closest('[data-status]');
    if (!btn || btn.disabled) return;
    syncStatusSeg(btn.dataset.status);
  });

  form.addEventListener('submit', saveSubCategory);
  resetBtn?.addEventListener('click', resetForm);

  (async function boot() {
    try {
      await loadSetup();
      await loadExisting();
    } catch (err) {
      setStatus(err.message || 'Unable to load setup data.', 'error');
    }
  })();
})();
