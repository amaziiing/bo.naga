(function () {

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

function statusText(value) {
  return Number(value) === 1 ? 'Active' : 'Inactive';
}

function statusPill(value) {
  const active = Number(value) === 1;
  return `<span class="slider-pill ${active ? 'active' : 'inactive'}"><i class="bi ${active ? 'bi-check-circle' : 'bi-pause-circle'}"></i>${active ? 'Active' : 'Inactive'}</span>`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === 'error') throw new Error(json.message || 'Request failed');
  return json;
}

function setupImagePicker(input, dropZone, preview, placeholder, onFile, setStatus) {
  if (!input || !dropZone || !preview || !placeholder) return;

  function showPreview(src) {
    preview.src = src;
    preview.hidden = false;
    placeholder.hidden = true;
  }

  function clearPreview() {
    input.value = '';
    preview.src = '';
    preview.hidden = true;
    placeholder.hidden = false;
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      setStatus && setStatus('Please choose image file only.', 'error');
      return;
    }
    onFile(file, showPreview, clearPreview);
  }

  input.addEventListener('change', () => handleFile(input.files[0]));

  ['dragenter', 'dragover'].forEach(evt => {
    dropZone.addEventListener(evt, e => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    dropZone.addEventListener(evt, e => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));

  return { showPreview, clearPreview };
}

const GAME_API_CATEGORY_HUB = {
  list: adminApi('GAME_CATEGORY_LIST')
};

const GAME_API_SUB_CATEGORY_HUB = {
  list: adminApi('GAME_SUB_CATEGORY_LIST')
};

const GAME_API_PROVIDER_HUB = {
  list: adminApi('GAME_PROVIDER_LIST')
};

const GAME_API_HUB = {
  list: adminApi('GAME_LIST'),
  create: adminApi('GAME_CREATE'),
  update: adminApi('GAME_UPDATE'),
  delete: adminApi('GAME_DELETE'),
  downloadImages: adminApi('GAME_DOWNLOAD_IMAGES')
};

(function () {
  const tenantReadOnly = !!(window.BO_BRAND && !window.BO_BRAND.isMaster());
  if (tenantReadOnly && document.body) document.body.dataset.crudNoAdd = '1';
  const form = document.getElementById('gameForm');
  if (!form) return;

  const formTitle = document.getElementById('gameFormTitle');
  const id = document.getElementById('gameId');
  const categoryId = document.getElementById('gameCategoryId');
  const subCategoryId = document.getElementById('gameSubCategoryId');
  const subCategoryValue = document.getElementById('gameSubCategoryValue');
  const name = document.getElementById('gameName');
  const gameUrl = document.getElementById('gameUrl');
  const providerCode = document.getElementById('gameProviderCode');
  const gameCode = document.getElementById('gameCode');
  const customVariablesBox = document.getElementById('gameCustomVariables');
  const addCustomVariableBtn = document.getElementById('addGameCustomVariableBtn');
  const sortOrder = document.getElementById('gameSortOrder');
  const status = document.getElementById('gameStatus');
  const imageInput = document.getElementById('gameImage');
  const dropZone = document.getElementById('gameDropZone');
  const preview = document.getElementById('gamePreview');
  const placeholder = document.getElementById('gameUploadPlaceholder');
  const currentImage = document.getElementById('gameCurrentImage');
  const saveBtn = document.getElementById('saveGameBtn');
  const resetBtn = document.getElementById('resetGameBtn');
  const refreshBtn = document.getElementById('refreshGameBtn');
  const downloadImagesBtn = document.getElementById('downloadGameImagesBtn');
  const statusBox = document.getElementById('gameStatusBox');
  if (tenantReadOnly) {
    const formCard = form.closest('.slider-form-card,.manage-form-card,.card') || form.parentElement;
    if (formCard) formCard.style.display = 'none';
    if (downloadImagesBtn) downloadImagesBtn.style.display = 'none';
  }
  const categoryFilter = document.getElementById('gameCategoryFilter');
  const subCategoryFilter = document.getElementById('gameSubCategoryFilter');
  const providerFilter = document.getElementById('gameProviderFilter');
  const list = document.getElementById('gameList');
  const empty = document.getElementById('gameEmpty');
  const searchInput = document.getElementById('gameSearchInput');
  const sortFilter = document.getElementById('gameSortFilter');
  const applyFiltersBtn = document.getElementById('applyGameFilters');
  const resetFiltersBtn = document.getElementById('resetGameFilters');
  const totalCountEl = document.getElementById('gameTotalCount');
  const activeCountEl = document.getElementById('gameActiveCount');
  const showingTextEl = document.getElementById('gameShowingText');
  const paginationEl = document.getElementById('gamePagination');
  const pageSizeEl = document.getElementById('gamePageSize');

  let selectedFile = null;
  let currentItems = [];
  let currentPage = 1;
  let categories = [];
  let subCategories = [];
  let providers = [];
  let picker;
  let isRestoringSelection = false;
  let lockedAutoSize = null;
  let autofitReloading = false;
  let autofitSettled = false;
  const tableWrap = document.querySelector('.game-table-wrap');
  const panel = document.querySelector('.game-panel');

  function valueOf(obj, keys) {
    for (const key of keys) {
      if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
    }
    return '';
  }

  function primitiveId(value) {
    if (value && typeof value === 'object') {
      return valueOf(value, ['id', 'categoryId', 'subCategoryId', 'category_id', 'sub_category_id']);
    }
    return value;
  }

  function getCategoryId(item) {
    return primitiveId(valueOf(item, ['categoryId', 'gameCategoryId', 'category_id', 'game_category_id', 'parentCategoryId', 'gameCategory', 'category']));
  }

  function getSubCategoryId(item) {
    return primitiveId(valueOf(item, ['subCategoryId', 'gameSubCategoryId', 'sub_category_id', 'game_sub_category_id', 'subcategoryId', 'gameSubCategory', 'subCategory', 'subcategory']));
  }

  function nestedName(value) {
    if (!value || typeof value !== 'object') return '';
    return valueOf(value, ['name', 'title', 'categoryName', 'subCategoryName', 'category_name', 'sub_category_name']);
  }

  function getCategoryName(item) {
    return valueOf(item, ['categoryName', 'gameCategoryName', 'category_name', 'game_category_name'])
      || nestedName(valueOf(item, ['gameCategory', 'category']));
  }

  function getSubCategoryName(item) {
    return valueOf(item, ['subCategoryName', 'gameSubCategoryName', 'sub_category_name', 'game_sub_category_name', 'subcategoryName'])
      || nestedName(valueOf(item, ['gameSubCategory', 'subCategory', 'subcategory']));
  }

  function normalizeCategory(item) {
    return Object.assign({}, item, {
      id: valueOf(item, ['id', 'categoryId', 'category_id']),
      name: valueOf(item, ['name', 'title', 'categoryName'])
    });
  }

  function normalizeSubCategory(item) {
    return Object.assign({}, item, {
      id: valueOf(item, ['id', 'subCategoryId', 'sub_category_id']),
      categoryId: valueOf(item, ['categoryId', 'gameCategoryId', 'category_id', 'game_category_id', 'parentCategoryId']),
      providerCode: valueOf(item, ['providerCode', 'provider_code']).toString().toUpperCase(),
      name: valueOf(item, ['name', 'title', 'subCategoryName'])
    });
  }

  function getProviderCode(item) {
    return valueOf(item, ['providerCode', 'provider_code', 'provider', 'provider_code_name']);
  }

  function getGameCode(item) {
    return valueOf(item, ['gameCode', 'game_code', 'code', 'launchCode', 'launch_code', 'providerGameCode', 'provider_game_code']);
  }

  function normalizeGame(item) {
    return Object.assign({}, item, {
      categoryId: getCategoryId(item),
      subCategoryId: getSubCategoryId(item),
      providerCode: getProviderCode(item),
      gameCode: getGameCode(item)
    });
  }

  function setStatus(message, type) {
    statusBox.textContent = message || '';
    statusBox.className = 'upload-status' + (type ? ' ' + type : '');
  }

  function setBusy(isBusy) {
    saveBtn.disabled = isBusy;
    refreshBtn.disabled = isBusy;
    if (downloadImagesBtn) downloadImagesBtn.disabled = isBusy;
    saveBtn.innerHTML = isBusy ? '<i class="bi bi-hourglass-split"></i> Saving...' : '<i class="bi bi-save"></i> Save Game';
  }

  function categoryName(catId) {
    const item = categories.find(x => String(x.id) === String(catId));
    return item ? item.name : '-';
  }

  function subCategoryName(subId) {
    const item = subCategories.find(x => String(x.id) === String(subId));
    return item ? item.name : '-';
  }


  // Sub category is OPTIONAL. The hidden field is the single value submitted to Spring Boot.
  // 0 means "no sub category" and must be preserved instead of being converted to blank.
  function getSelectedSubCategoryId() {
    const hiddenValue = String(subCategoryValue?.value ?? '0').trim();
    if (hiddenValue !== '' && Number(hiddenValue) >= 0) return hiddenValue;
    const nativeValue = String(subCategoryId.value ?? '0').trim();
    return nativeValue !== '' && Number(nativeValue) >= 0 ? nativeValue : '0';
  }

  function setSelectedSubCategoryId(value, syncNative = true) {
    const clean = String(value ?? '0').trim();
    const valid = clean !== '' && Number(clean) > 0 ? clean : '0';
    if (subCategoryValue) subCategoryValue.value = valid;
    if (syncNative) {
      const exists = Array.from(subCategoryId.options).some(option => String(option.value) === valid);
      subCategoryId.value = exists ? valid : '0';
    }
    if (window.BOSelectSync) window.BOSelectSync.one(subCategoryId);
    return valid;
  }

  function selectedSubCategory() {
    const selectedId = getSelectedSubCategoryId();
    return subCategories.find(item => String(item.id) === String(selectedId)) || null;
  }

  function uniqueLegacySubCategory(categoryValue, providerValue) {
    const category = String(categoryValue || '').trim();
    const provider = String(providerValue || '').trim().toUpperCase();
    if (!category || !provider) return null;
    const matches = subCategories.filter(item =>
      String(item.categoryId) === category &&
      String(item.providerCode || '').trim().toUpperCase() === provider
    );
    return matches.length === 1 ? matches[0] : null;
  }

  function syncProviderFromSubCategory(options = {}) {
    if (!providerCode || !subCategoryId) return;
    const selected = selectedSubCategory();
    const code = selected ? String(selected.providerCode || '').trim().toUpperCase() : '';
    if (!code) {
      if (options.clearWhenMissing) providerCode.value = '';
      return;
    }

    providerCode.value = code;
    const provider = providers.find(item => providerCodeOf(item) === code);
    const providerName = provider ? String(provider.name || '').trim() : '';
    providerCode.title = providerName && providerName.toUpperCase() !== code
      ? `${providerName} (${code}) - auto-filled from sub category`
      : `${code} - auto-filled from sub category`;
    providerCode.dataset.autoFilledFromSubCategory = '1';
    providerCode.dispatchEvent(new Event('input', { bubbles: true }));
    providerCode.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function categoryOptions(withAll) {
    const options = categories.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('');
    return (withAll ? '<option value="">All Categories</option>' : '<option value="">No Category (Optional)</option>') + options;
  }

  function subCategoryOptions(catId, withAll, providerVal) {
    const cleanProvider = String(providerVal || '').trim().toUpperCase();
    const filtered = subCategories.filter(x => {
      const categoryOk = !catId || String(x.categoryId) === String(catId);
      const providerOk = !cleanProvider || !x.providerCode || String(x.providerCode).toUpperCase() === cleanProvider;
      return categoryOk && providerOk;
    });
    const options = filtered.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}${item.providerCode ? ' - ' + escapeHtml(item.providerCode) : ''}</option>`).join('');
    return (withAll ? '<option value="">All Sub Categories</option>' : '<option value="0">Select Sub Category</option>') + (options || (withAll ? '' : '<option value="" disabled>No sub category found</option>'));
  }

  function providerCodeOf(item) {
    return valueOf(item, ['code', 'providerCode', 'provider_code']).toString().toUpperCase();
  }

  function fillProviderFilter() {
    if (!providerFilter) return;
    const options = providers.map(item => `<option value="${escapeHtml(providerCodeOf(item))}">${escapeHtml(item.name || providerCodeOf(item))}</option>`).join('');
    providerFilter.innerHTML = '<option value="">All Providers</option>' + options;
  }

  function fillOptions() {
    categoryId.innerHTML = categoryOptions(false);
    categoryFilter.innerHTML = categoryOptions(true);
    fillProviderFilter();
    refreshSubCategoryOptions();
    refreshFilterSubCategoryOptions();
  }

  function refreshSubCategoryOptions(keepValue) {
    // Explicit '' means clear. Omitting the argument keeps the confirmed ID.
    const oldValue = arguments.length ? String(keepValue ?? '0') : getSelectedSubCategoryId();
    subCategoryId.innerHTML = subCategoryOptions(categoryId.value, false, '');
    setSelectedSubCategoryId(oldValue, true);
    if (!isRestoringSelection) syncProviderFromSubCategory({ clearWhenMissing: false });
  }

  function refreshFilterSubCategoryOptions() {
    const oldValue = subCategoryFilter.value;
    subCategoryFilter.innerHTML = subCategoryOptions(categoryFilter.value, true, providerFilter?.value || "");
    if (oldValue && Array.from(subCategoryFilter.options).some(o => o.value === String(oldValue))) {
      subCategoryFilter.value = String(oldValue);
    }
  }

  async function loadSetup() {
    const [catJson, subJson, providerJson] = await Promise.all([
      fetchJson(GAME_API_CATEGORY_HUB.list),
      fetchJson(GAME_API_SUB_CATEGORY_HUB.list),
      fetchJson(GAME_API_PROVIDER_HUB.list).catch(() => ({ data: [] }))
    ]);
    categories = (catJson.data || []).map(normalizeCategory);
    subCategories = (subJson.data || []).map(normalizeSubCategory);
    providers = (providerJson.data || []);
    fillOptions();
  }

  function resolveImageUrl(url, filename, fallbackUrl) {
    if (url) return url;
    if (!filename) return '';
    const value = String(filename).trim();
    if (!value) return '';
    if (/^(https?:)?\/\//i.test(value) || value.startsWith('/') || value.startsWith('data:') || value.startsWith('blob:')) {
      return value;
    }
    if (fallbackUrl) {
      const cleanFallback = String(fallbackUrl).split('?')[0];
      const slashIndex = cleanFallback.lastIndexOf('/');
      if (slashIndex >= 0) return cleanFallback.substring(0, slashIndex + 1) + value;
    }
    return value;
  }

  function addCustomVariableRow(item = {}) {
    if (!customVariablesBox) return;
    const row = document.createElement('div');
    row.className = 'game-custom-variable-row';
    row.innerHTML = `
      <label class="gcv-enabled-label"><input type="checkbox" class="gcv-enabled" ${item.enabled === false ? '' : 'checked'}><span>On</span></label>
      <input type="text" class="gcv-key" maxlength="64" placeholder="Key" value="${escapeHtml(item.key || '')}" aria-label="Custom key">
      <input type="text" class="gcv-value" placeholder="Value" value="${escapeHtml(item.value || '')}" aria-label="Custom value">
      <button type="button" class="clean-btn gcv-remove" title="Remove" aria-label="Remove custom value"><i class="bi bi-trash" aria-hidden="true"></i></button>`;
    row.querySelector('.gcv-remove').addEventListener('click', () => row.remove());
    customVariablesBox.appendChild(row);
  }

  function setCustomVariables(raw) {
    if (!customVariablesBox) return;
    customVariablesBox.innerHTML = '';
    let items = raw;
    if (typeof raw === 'string' && raw.trim()) { try { items = JSON.parse(raw); } catch (_) { items = []; } }
    if (!Array.isArray(items)) items = [];
    items.forEach(addCustomVariableRow);
  }

  function collectCustomVariables() {
    if (!customVariablesBox) return [];
    return Array.from(customVariablesBox.querySelectorAll('.game-custom-variable-row')).map(row => ({
      key: row.querySelector('.gcv-key').value.trim(),
      value: row.querySelector('.gcv-value').value.trim(),
      enabled: row.querySelector('.gcv-enabled').checked
    })).filter(item => item.key && item.value);
  }

  function resetForm() {
    id.value = '';
    providerCode.value = '';
    providerCode.removeAttribute('title');
    delete providerCode.dataset.autoFilledFromSubCategory;
    categoryId.value = '';
    refreshSubCategoryOptions();
    syncProviderFromSubCategory({ clearWhenMissing: true });
    name.value = '';
    gameUrl.value = '';
    if (gameCode) gameCode.value = '';
    setCustomVariables([]);
    sortOrder.value = '0';
    status.value = '1';
    selectedFile = null;
    picker && picker.clearPreview();
    currentImage.hidden = true;
    formTitle.textContent = 'Create Game';
    setStatus('', '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function normalizeCompareValue(value) {
    return String(value ?? '').trim().toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ');
  }

  function findOptionValue(select, desiredId, desiredName) {
    const idText = String(desiredId ?? '').trim();
    if (idText) {
      const idMatch = Array.from(select.options).find(option => String(option.value).trim() === idText);
      if (idMatch) return idMatch.value;
    }

    const nameText = normalizeCompareValue(desiredName);
    if (!nameText) return '';
    const match = Array.from(select.options).find(option => {
      const optionText = normalizeCompareValue(option.textContent.replace(/\s+-\s+[^-]+$/, ''));
      return optionText === nameText;
    });
    return match ? match.value : '';
  }

  function notifySelectChanged(select) {
    // Keep the native select and the rounded visual dropdown in sync.
    // reports.js redraws the visible button/menu when a change event is fired.
    select.dispatchEvent(new Event('change', { bubbles: false }));
  }

  function applySavedCategorySelection(item) {
    // Game list API returns the exact database foreign keys as categoryId and
    // subCategoryId. Always prefer those normalized values instead of guessing
    // from the displayed category/sub-category names.
    const wantedCategoryId = String(item.categoryId ?? getCategoryId(item) ?? '').trim();
    const wantedSubCategoryId = String(item.subCategoryId ?? getSubCategoryId(item) ?? '').trim();

    isRestoringSelection = true;
    try {
      const categoryExists = Array.from(categoryId.options).some(option => String(option.value) === wantedCategoryId);
      categoryId.value = categoryExists ? wantedCategoryId : '';

      // Rebuild only after the exact category ID and provider code are assigned.
      // This guarantees the sub-category dropdown contains the database row that
      // belongs to the selected category/provider before selecting it.
      subCategoryId.innerHTML = subCategoryOptions(wantedCategoryId, false, '');

      const subCategoryExists = wantedSubCategoryId && Number(wantedSubCategoryId) > 0 &&
        Array.from(subCategoryId.options).some(option => String(option.value) === wantedSubCategoryId);
      // Do NOT auto-pick a sub category from provider/category. Existing rows with
      // null/0 must stay unassigned and display as "-" in the game list.
      setSelectedSubCategoryId(subCategoryExists ? wantedSubCategoryId : '0', true);
    } finally {
      isRestoringSelection = false;
    }

    // Update the visible rounded dropdowns after both native selects are final.
    // Do not fire category change while restoring; that handler clears Sub Category.
    if (window.BOSelectSync) {
      window.BOSelectSync.one(categoryId);
      window.BOSelectSync.one(subCategoryId);
    }
  }

  function editItem(item) {
    id.value = item.id || '';

    // Provider must be assigned before rebuilding sub-category options because
    // some sub-categories are provider-specific.
    providerCode.value = getProviderCode(item) || '';
    applySavedCategorySelection(item);

    name.value = item.name || '';
    gameUrl.value = item.gameUrl || '';
    if (gameCode) gameCode.value = item.gameCode || '';
    setCustomVariables(item.providerCustomVariables || item.provider_custom_variables || []);
    sortOrder.value = item.sortOrder ?? 0;
    status.value = String(item.status ?? 1);
    selectedFile = null;
    imageInput.value = '';
    const previewUrl = resolveImageUrl(item.imageUrl, item.image, '');
    if (previewUrl) picker.showPreview(previewUrl);
    else picker.clearPreview();
    currentImage.hidden = false;
    formTitle.textContent = 'Edit Game #' + item.id;
    setStatus('Editing game. Choose new image only if you want to replace it.', 'success');
    if (window.CrudModalPattern) window.CrudModalPattern.open('Edit Game');

    // Re-apply after the modal is visible. This prevents a late modal/select repaint
    // from restoring the first category option (for example, Hot Game).
    requestAnimationFrame(() => applySavedCategorySelection(item));
    [60, 180, 350].forEach(delay => setTimeout(() => applySavedCategorySelection(item), delay));

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ===== MD Show `-` autofit (VIP EXP / Sub Category contract) ===== */
  function isAutoPageSize(raw) {
    const v = String(raw ?? pageSizeEl?.value ?? '-').trim();
    return v === '' || v === '-' || /^auto$/i.test(v);
  }

  function tableBodyScroll() {
    return list;
  }

  function naturalRowHeight() {
    const sample = list.querySelector('.game-table-row');
    if (sample) return Math.max(56, Math.round(sample.getBoundingClientRect().height));
    return 76;
  }

  function measureAutoPageSize() {
    const scroll = tableBodyScroll();
    if (!scroll) return 12;
    const avail = Math.max(0, Math.floor(scroll.clientHeight));
    const rowH = naturalRowHeight();
    /* Floor only — never add a row that would clip under overflow:hidden. */
    return Math.max(5, Math.min(200, Math.floor(avail / rowH) || 12));
  }

  function autoFitPageSize() {
    if (lockedAutoSize != null) return lockedAutoSize;
    lockedAutoSize = measureAutoPageSize();
    return lockedAutoSize;
  }

  function clearLockedAutoSize() {
    lockedAutoSize = null;
    autofitSettled = false;
  }

  function resolvePageSize(raw) {
    const v = String(raw ?? pageSizeEl?.value ?? '-').trim();
    if (isAutoPageSize(v)) return autoFitPageSize();
    if (/^all$/i.test(v)) return 10000;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : autoFitPageSize();
  }

  function syncAutofitLabel() {
    /* Trigger always paints literal `-`, never the fitted count. */
    if (!pageSizeEl || !isAutoPageSize(pageSizeEl.value)) return;
    const btn = pageSizeEl.closest('.rounded-select-wrap')?.querySelector('.rounded-select-btn span');
    if (btn) btn.textContent = '-';
  }

  function syncAutofitMode() {
    const auto = isAutoPageSize(pageSizeEl?.value);
    list.toggleAttribute('data-bo-autofit', auto);
    tableWrap?.toggleAttribute('data-bo-autofit', auto);
    panel?.toggleAttribute('data-bo-autofit', auto);
    if (!auto) resetEvenFill();
    syncAutofitLabel();
  }

  function dataRows() {
    return [...list.querySelectorAll('.game-table-row')];
  }

  function resetEvenFill() {
    list.classList.remove('bo-tx-evenfill');
    list.style.height = '';
    dataRows().forEach(row => {
      row.style.height = '';
      row.style.minHeight = '';
      row.style.maxHeight = '';
      row.style.overflow = '';
      row.querySelectorAll('.game-main-cell, .game-detail-cell, .game-status-cell, .game-action-cell')
        .forEach(cell => {
          cell.style.height = '';
          cell.style.minHeight = '';
          cell.style.maxHeight = '';
        });
    });
  }

  function evenFillRowHeights() {
    const scroll = tableBodyScroll();
    if (!scroll) return;
    resetEvenFill();
    if (!isAutoPageSize(pageSizeEl?.value)) return;
    const rows = dataRows();
    if (!rows.length) return;
    void list.offsetHeight;
    const avail = Math.max(0, Math.floor(scroll.clientHeight));
    const natural = rows.reduce((sum, row) => sum + Math.ceil(row.getBoundingClientRect().height), 0);
    const rowH = Math.max(56, Math.round(natural / rows.length) || 76);
    const gap = avail - natural;
    /* Stretch only when leftover seam < one full row. */
    if (natural > avail + 1 || gap < 2 || gap >= rowH) return;
    const base = Math.floor(avail / rows.length);
    let rem = avail - base * rows.length;
    if (base <= 0) return;
    list.classList.add('bo-tx-evenfill');
    list.style.height = avail + 'px';
    rows.forEach(row => {
      const h = base + (rem > 0 ? 1 : 0);
      if (rem > 0) rem -= 1;
      row.style.height = h + 'px';
      row.style.minHeight = h + 'px';
      row.style.maxHeight = h + 'px';
      row.style.overflow = 'hidden';
      row.querySelectorAll('.game-main-cell, .game-detail-cell, .game-status-cell, .game-action-cell')
        .forEach(cell => {
          cell.style.height = h + 'px';
          cell.style.minHeight = h + 'px';
          cell.style.maxHeight = h + 'px';
        });
    });
  }

  function settleAutofitFromPaint() {
    if (autofitReloading || autofitSettled) return;
    if (!isAutoPageSize(pageSizeEl?.value)) return;
    const scroll = tableBodyScroll();
    if (!scroll) return;
    resetEvenFill();
    void scroll.offsetHeight;
    const rows = dataRows();
    if (!rows.length) {
      const target = measureAutoPageSize();
      if (lockedAutoSize !== target) {
        lockedAutoSize = target;
        autofitReloading = true;
        renderList(currentItems, true);
        autofitReloading = false;
        requestAnimationFrame(() => settleAutofitFromPaint());
      }
      return;
    }
    const avail = Math.max(0, Math.floor(scroll.clientHeight));
    const natural = rows.reduce((sum, row) => sum + Math.ceil(row.getBoundingClientRect().height), 0);
    const rowH = Math.max(56, Math.round(natural / rows.length) || 76);
    const overflow = natural > avail + 1;
    let target = Math.max(5, Math.min(200, Math.floor(avail / rowH) || rows.length));
    if (overflow) target = Math.max(5, Math.min(target, rows.length - 1));

    const verifyAndLock = () => {
      requestAnimationFrame(() => {
        const sc = tableBodyScroll();
        const painted = dataRows();
        if (!sc || !painted.length) {
          autofitSettled = true;
          syncAutofitLabel();
          return;
        }
        const room = Math.max(0, Math.floor(sc.clientHeight));
        const sum = painted.reduce((s, row) => s + Math.ceil(row.getBoundingClientRect().height), 0);
        const clipped = sum > room + 1;

        /* Verify only shrinks — grow is floor(avail/rowH) on the settle pass.
           Growing here oscillates with ceil'd row heights (N fits → N+1 clips → N…). */
        if (clipped && lockedAutoSize > 5) {
          lockedAutoSize = Math.max(5, lockedAutoSize - 1);
          autofitReloading = true;
          renderList(currentItems, true);
          autofitReloading = false;
          verifyAndLock();
          return;
        }
        autofitSettled = true;
        evenFillRowHeights();
        syncAutofitLabel();
      });
    };

    if (target === rows.length) {
      lockedAutoSize = rows.length;
      verifyAndLock();
      return;
    }
    lockedAutoSize = target;
    autofitReloading = true;
    renderList(currentItems, true);
    autofitReloading = false;
    verifyAndLock();
  }

  function scheduleAutofit() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (isAutoPageSize(pageSizeEl?.value) && !autofitSettled) {
        settleAutofitFromPaint();
        return;
      }
      evenFillRowHeights();
      syncAutofitLabel();
    }));
  }

  function bindEvenFillObserver() {
    /* Observe the viewport wrap — never #gameList. evenFill writes list.style.height,
       which re-fired a list observer → clearLocked → re-render → flicker loop. */
    const host = tableWrap || panel;
    if (!host || host._boEvenFillObs) return;
    host._boEvenFillObs = new ResizeObserver(() => {
      if (!isAutoPageSize(pageSizeEl?.value)) return;
      if (autofitReloading) return;
      clearTimeout(host._boEvenFillTimer);
      host._boEvenFillTimer = setTimeout(() => {
        if (autofitReloading) return;
        const prev = lockedAutoSize;
        const next = (() => {
          /* Measure with natural row height (ignore even-fill stretch). */
          resetEvenFill();
          void list.offsetHeight;
          return measureAutoPageSize();
        })();
        syncAutofitMode();
        if (prev != null && next === prev) {
          lockedAutoSize = prev;
          autofitSettled = true;
          evenFillRowHeights();
          syncAutofitLabel();
          return;
        }
        clearLockedAutoSize();
        lockedAutoSize = next;
        renderList(currentItems, true);
        scheduleAutofit();
      }, 48);
    });
    host._boEvenFillObs.observe(host);
  }

  function buildPagination(totalPages) {
    if (!paginationEl) return;
    const total = Math.max(1, Number(totalPages) || 1);
    const isEmpty = !currentItems.length && total === 1;
    const cur = Math.max(1, Math.min(currentPage, total));
    const btn = (label, target, disabled, active, icon) =>
      `<button type="button" class="page-btn${active ? ' active' : ''}" data-page="${target}" ${disabled ? 'disabled' : ''} aria-label="${label}"${active ? ' aria-current="page"' : ''}>${icon ? `<i class="bi ${icon}"></i>` : label}</button>`;
    let html = btn('First', 1, cur <= 1 || isEmpty, false, 'bi-chevron-bar-left');
    html += btn('Previous', cur - 1, cur <= 1 || isEmpty, false, 'bi-chevron-left');
    if (isEmpty) {
      html += btn('1', 1, true, true);
    } else {
      const lo = Math.max(1, cur - 2);
      const hi = Math.min(total, cur + 2);
      if (lo > 1) {
        html += btn('1', 1, false, cur === 1);
        if (lo > 2) html += '<span class="smart-page-ellipsis" aria-hidden="true">…</span>';
      }
      for (let i = lo; i <= hi; i++) html += btn(String(i), i, false, i === cur);
      if (hi < total) {
        if (hi < total - 1) html += '<span class="smart-page-ellipsis" aria-hidden="true">…</span>';
        html += btn(String(total), total, false, cur === total);
      }
    }
    html += btn('Next', cur + 1, cur >= total || isEmpty, false, 'bi-chevron-right');
    html += btn('Last', total, cur >= total || isEmpty, false, 'bi-chevron-bar-right');
    paginationEl.innerHTML = html;
  }

  function renderList(items, resetPage = false) {
    currentItems = Array.isArray(items) ? items : [];
    if (resetPage) currentPage = 1;
    const query = (searchInput?.value || '').trim().toLowerCase();
    const sortValue = sortFilter?.value || 'newest';
    let visible = currentItems.filter(item => !query || String(item.name || '').toLowerCase().includes(query));
    visible.sort((a, b) => {
      if (sortValue === 'sortAsc') return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
      if (sortValue === 'sortDesc') return Number(b.sortOrder || 0) - Number(a.sortOrder || 0);
      if (sortValue === 'nameAsc') return String(a.name || '').localeCompare(String(b.name || ''));
      if (sortValue === 'nameDesc') return String(b.name || '').localeCompare(String(a.name || ''));
      return Number(b.id || 0) - Number(a.id || 0);
    });

    syncAutofitMode();
    const pageSize = resolvePageSize(pageSizeEl?.value);
    const totalPages = Math.max(1, Math.ceil(visible.length / pageSize) || 1);
    if (currentPage > totalPages) currentPage = totalPages;
    const startIndex = (currentPage - 1) * pageSize;
    const pageItems = visible.slice(startIndex, startIndex + pageSize);

    if (totalCountEl) totalCountEl.textContent = currentItems.length;
    if (activeCountEl) activeCountEl.textContent = currentItems.filter(item => Number(item.status) === 1).length;
    if (showingTextEl) {
      const from = visible.length ? startIndex + 1 : 0;
      const to = visible.length ? startIndex + pageItems.length : 0;
      showingTextEl.textContent = `Showing ${from} to ${to} of ${visible.length} entries`;
    }
    list.innerHTML = '';
    empty.hidden = visible.length > 0;

    pageItems.forEach(item => {
      const row = document.createElement('div');
      row.className = 'game-table-row';
      const imageUrl = resolveImageUrl(item.imageUrl, item.image, '');
      row.innerHTML = `
        <div class="game-main-cell">
          <div class="game-thumb-full">${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.name || 'Game')}">` : '<i class="bi bi-image"></i>'}</div>
          <b>${escapeHtml(item.name || 'Untitled Game')}</b>
        </div>
        <div class="game-detail-cell">
          <span><i class="bi bi-hash"></i>ID: ${escapeHtml(item.id)}</span>
          <span><i class="bi bi-tag"></i>Category: ${escapeHtml(categoryName(getCategoryId(item)))}</span>
          <span><i class="bi bi-folder"></i>Sub Category: ${escapeHtml(subCategoryName(getSubCategoryId(item)))}</span>
          <span><i class="bi bi-building"></i>Provider: ${escapeHtml(item.providerCode || '-')}</span>
          <span><i class="bi bi-code-slash"></i>Game Code: ${escapeHtml(item.gameCode || '-')}</span>
          <span><i class="bi bi-arrow-down-up"></i>Sort: ${escapeHtml(item.sortOrder ?? 0)}</span>
          <span><i class="bi ${item.imageDownloaded ? 'bi-cloud-check' : 'bi-cloud-arrow-down'}"></i>Image: ${item.imageDownloaded ? 'Downloaded' : 'Provider URL'}</span>
        </div>
        <div class="game-status-cell">${statusPill(item.status)}</div>
        <div class="game-action-cell">
          ${tenantReadOnly ? '<span class="text-muted">Read only</span>' : `<button class="icon-action-btn edit edit-btn" type="button" data-edit-id="${escapeHtml(item.id)}" aria-label="Edit" title="Edit"><i class="bi bi-pencil-square"></i></button>
          <button class="icon-action-btn delete" type="button" data-delete-id="${escapeHtml(item.id)}" aria-label="Delete" title="Delete"><i class="bi bi-trash"></i></button>`}
        </div>`;
      list.appendChild(row);
    });
    buildPagination(totalPages);
    if (!autofitReloading) scheduleAutofit();
    else syncAutofitLabel();
  }

  async function loadGames() {
    clearLockedAutoSize();
    list.innerHTML = '<div class="slider-empty"><i class="bi bi-hourglass-split"></i><b>Loading games...</b></div>';
    empty.hidden = true;
    try {
      // Send catalogue filters to Spring Boot instead of always downloading the
      // complete game catalogue. This is important for large providers and also
      // makes the selected provider the authoritative server-side filter.
      const selectedCategory = String(categoryFilter.value || '');
      const selectedSubCategory = String(subCategoryFilter.value || '');
      const selectedProvider = String(providerFilter?.value || '').trim().toUpperCase();
      const params = new URLSearchParams();
      if (selectedCategory) params.set('categoryId', selectedCategory);
      if (selectedSubCategory) params.set('subCategoryId', selectedSubCategory);
      if (selectedProvider) params.set('providerCode', selectedProvider);
      const requestUrl = GAME_API_HUB.list + (params.toString() ? `?${params.toString()}` : '');
      const json = await fetchJson(requestUrl);
      let rows = (json.data || []).map(normalizeGame);

      if (selectedCategory) {
        rows = rows.filter(item => String(getCategoryId(item)) === selectedCategory);
      }
      if (selectedSubCategory) {
        rows = rows.filter(item => String(getSubCategoryId(item)) === selectedSubCategory);
      }
      if (selectedProvider) {
        rows = rows.filter(item => String(item.providerCode || '').toUpperCase() === selectedProvider);
      }

      renderList(rows, true);
    } catch (err) {
      list.innerHTML = '';
      empty.hidden = false;
      empty.innerHTML = `<i class="bi bi-exclamation-triangle"></i><b>Unable to load games</b><small>${escapeHtml(err.message || 'Please check API URL / CORS.')}</small>`;
    }
  }

  async function saveGame(e) {
    e.preventDefault();
    const isUpdate = !!id.value;

    // Sub category is optional. 0 is intentionally sent to Spring Boot when
    // the admin leaves "Select Sub Category" selected.
    const selectedSubCategoryId = getSelectedSubCategoryId() || '0';
    if (Number(selectedSubCategoryId) > 0) {
      const chosenSubCategory = selectedSubCategory();
      if (!chosenSubCategory || String(chosenSubCategory.categoryId) !== String(categoryId.value)) {
        setStatus('Selected sub category does not belong to the selected category.', 'error');
        subCategoryId.focus();
        return;
      }
    }
    if (!name.value.trim()) {
      setStatus('Please enter game name.', 'error');
      name.focus();
      return;
    }
    if (!providerCode.value.trim()) {
      setStatus('Please enter provider code. This is required for frontend launch.', 'error');
      providerCode.focus();
      return;
    }
    if (gameCode && !gameCode.value.trim()) {
      setStatus('Please enter game code. This is required for frontend launch.', 'error');
      gameCode.focus();
      return;
    }

    const fd = new FormData();
    if (isUpdate) fd.append('id', id.value);
    fd.append('categoryId', categoryId.value || '0');
    fd.append('subCategoryId', selectedSubCategoryId);
    fd.append('name', name.value.trim());
    fd.append('gameUrl', gameUrl.value.trim());
    fd.append('providerCode', providerCode.value.trim());
    if (gameCode) {
      fd.append('gameCode', gameCode.value.trim());
      fd.append('code', gameCode.value.trim());
      fd.append('launchCode', gameCode.value.trim());
    }
    fd.append('sortOrder', sortOrder.value || '0');
    fd.append('providerCustomVariables', JSON.stringify(collectCustomVariables()));
    fd.append('status', status.value || '1');
    if (selectedFile) fd.append('image', selectedFile);

    setBusy(true);
    setStatus(isUpdate ? 'Updating game...' : 'Creating game...', '');
    try {
      const res = await fetch(isUpdate ? GAME_API_HUB.update : GAME_API_HUB.create, { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Save failed');
      setStatus(json.message || 'Game saved successfully.', 'success');
      resetForm();
      await loadGames();
    } catch (err) {
      setStatus(err.message || 'Save failed. Please check API URL / CORS.', 'error');
    } finally {
      setBusy(false);
    }
  }


  async function downloadAllImages() {
    if (!downloadImagesBtn) return;
    const original = downloadImagesBtn.innerHTML;
    downloadImagesBtn.disabled = true;
    downloadImagesBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Downloading...';
    setStatus('Downloading only game images that are not yet labelled as downloaded...', '');
    try {
      const res = await fetch(GAME_API_HUB.downloadImages, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Image download failed');
      const d = json.data || {};
      setStatus(`Image download completed: ${d.downloaded || 0} downloaded, ${d.skipped || 0} skipped, ${d.failed || 0} failed.`, Number(d.failed || 0) ? 'error' : 'success');
      await loadGames();
    } catch (err) {
      setStatus(err.message || 'Image download failed.', 'error');
    } finally {
      downloadImagesBtn.disabled = false;
      downloadImagesBtn.innerHTML = original;
    }
  }

  async function deleteGame(gameId) {
    if (!(await BO_DIALOG.confirm('Delete this game?', {title:'Delete Game', confirmText:'Delete'}))) return;
    const fd = new FormData();
    fd.append('id', gameId);
    try {
      const res = await fetch(GAME_API_HUB.delete, { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Delete failed');
      setStatus(json.message || 'Game deleted.', 'success');
      if (id.value === String(gameId)) resetForm();
      await loadGames();
    } catch (err) {
      setStatus(err.message || 'Delete failed.', 'error');
    }
  }
  picker = setupImagePicker(imageInput, dropZone, preview, placeholder, (file, showPreview) => {
    selectedFile = file;
    showPreview(URL.createObjectURL(file));
    setStatus('Image ready. Click Save to upload.', 'success');
  }, setStatus);

  // Capture the rounded option click before reports.js redraws the control.
  // The clicked option's real database ID is stored immediately.
  document.addEventListener('click', (event) => {
    const option = event.target?.closest?.('.rounded-select-option');
    if (!option) return;
    const wrap = option.closest('.rounded-select-wrap');
    if (!wrap || !wrap.contains(subCategoryId)) return;
    setSelectedSubCategoryId(option.dataset.value || '', true);
  }, true);

  form.addEventListener('submit', saveGame);
  resetBtn.addEventListener('click', resetForm);
  if (downloadImagesBtn) downloadImagesBtn.addEventListener('click', downloadAllImages);

  refreshBtn.addEventListener('click', async () => {
    await loadSetup();
    await loadGames();
  });

  categoryId.addEventListener('change', () => {
    // During edit restore, both IDs are assigned together and must not be cleared.
    if (isRestoringSelection) return;
    setSelectedSubCategoryId('0', false);
    refreshSubCategoryOptions('0');
    syncProviderFromSubCategory({ clearWhenMissing: false });
  });

  subCategoryId.addEventListener('change', () => {
    if (isRestoringSelection) return;
    setSelectedSubCategoryId(subCategoryId.value || '0', false);
    syncProviderFromSubCategory({ clearWhenMissing: false });
  });

  categoryFilter.addEventListener('change', async () => {
    clearLockedAutoSize();
    refreshFilterSubCategoryOptions();
    subCategoryFilter.value = '';
    await loadGames();
  });

  subCategoryFilter.addEventListener('change', () => { clearLockedAutoSize(); loadGames(); });
  if (providerFilter) providerFilter.addEventListener('change', () => { clearLockedAutoSize(); refreshFilterSubCategoryOptions(); subCategoryFilter.value = ''; loadGames(); });
  if (searchInput) {
    let searchTimer = 0;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        clearLockedAutoSize();
        renderList(currentItems, true);
      }, 180);
    });
    searchInput.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      clearTimeout(searchTimer);
      clearLockedAutoSize();
      renderList(currentItems, true);
    });
  }
  if (sortFilter) sortFilter.addEventListener('change', () => { clearLockedAutoSize(); renderList(currentItems, true); });
  if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', () => { clearLockedAutoSize(); renderList(currentItems, true); });
  if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = '';
    refreshFilterSubCategoryOptions();
    if (subCategoryFilter) subCategoryFilter.value = '';
    if (providerFilter) providerFilter.value = '';
    if (sortFilter) sortFilter.value = 'newest';
    clearLockedAutoSize();
    loadGames();
  });


  if (pageSizeEl) pageSizeEl.addEventListener('change', () => {
    clearLockedAutoSize();
    syncAutofitMode();
    renderList(currentItems, true);
  });
  if (paginationEl) paginationEl.addEventListener('click', e => {
    const button = e.target.closest('[data-page]');
    if (!button || button.disabled) return;
    const page = Number(button.dataset.page);
    if (!Number.isFinite(page) || page < 1) return;
    currentPage = page;
    renderList(currentItems);
  });

  list.addEventListener('click', e => {
    const editBtn = e.target.closest('[data-edit-id]');
    const deleteBtn = e.target.closest('[data-delete-id]');
    if (editBtn) {
      const item = currentItems.find(x => String(x.id) === String(editBtn.dataset.editId));
      if (item) editItem(item);
    }
    if (deleteBtn) deleteGame(deleteBtn.dataset.deleteId);
  });

  (async function init() {
    syncAutofitMode();
    bindEvenFillObserver();
    try {
      await loadSetup();
      resetForm();
      await loadGames();
    } catch (err) {
      setStatus(err.message || 'Unable to load setup data.', 'error');
      empty.hidden = false;
      empty.innerHTML = `<i class="bi bi-exclamation-triangle"></i><b>Unable to load setup data</b><small>${escapeHtml(err.message || 'Please create category and sub category first.')}</small>`;
    }
  })();
  if (addCustomVariableBtn) addCustomVariableBtn.addEventListener('click', () => addCustomVariableRow());

})();
})();
