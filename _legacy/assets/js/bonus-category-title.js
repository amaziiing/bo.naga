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

async function fetchJson(url, options) {
  const res = await fetch(url, options);
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

const BONUS_CATEGORY_TITLE_API = {
  list: adminApi('BONUS_CATEGORY_TITLE_LIST'),
  create: adminApi('BONUS_CATEGORY_TITLE_CREATE'),
  update: adminApi('BONUS_CATEGORY_TITLE_UPDATE'),
  delete: adminApi('BONUS_CATEGORY_TITLE_DELETE')
};

(function () {
  const form = document.getElementById('bonusForm');
  if (!form) return;

  const formTitle = document.getElementById('bonusFormTitle');
  const id = document.getElementById('bonusId');
  const name = document.getElementById('bonusName');
  const sortOrder = document.getElementById('bonusSortOrder');
  const imageInput = document.getElementById('bonusImage');
  const dropZone = document.getElementById('bonusDropZone');
  const preview = document.getElementById('bonusPreview');
  const placeholder = document.getElementById('bonusUploadPlaceholder');
  const currentImage = document.getElementById('bonusCurrentImage');
  const saveBtn = document.getElementById('saveBonusBtn');
  const resetBtn = document.getElementById('resetBonusBtn');
  const refreshBtn = document.getElementById('refreshBonusBtn');
  const statusBox = document.getElementById('bonusStatusBox');
  const list = document.getElementById('bonusList');
  const empty = document.getElementById('bonusEmpty');
  const searchInput = document.getElementById('bonusSearchInput');
  const sortFilter = document.getElementById('bonusSortFilter');
  const showingText = document.getElementById('bonusShowingText');
  const pageSizeSelect = document.getElementById('bonusPageSize');
  const pager = document.getElementById('bonusPager');

  let selectedFile = null;
  let currentItems = [];
  let currentPage = 0;
  let picker;

  function resolvePageSize(raw) {
    const v = String(raw ?? '-').trim();
    if (v === '-' || v === '') return 20;
    if (/^all$/i.test(v)) return 10000;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 20;
  }

  function setShowing(from, to, total) {
    if (!showingText) return;
    showingText.textContent = `Showing ${from} to ${to} of ${total} entries`;
  }

  function renderPager(page, pages, empty) {
    if (!pager) return;
    const total = Math.max(1, Number(pages) || 1);
    const cur = Math.max(0, Math.min(Number(page) || 0, total - 1));
    const btn = (label, target, disabled, active, icon) =>
      `<button type="button" class="page-btn${active ? ' active' : ''}" data-page="${target}" ${disabled ? 'disabled' : ''} aria-label="${label}"${active ? ' aria-current="page"' : ''}>${icon ? `<i class="bi ${icon}"></i>` : label}</button>`;
    let html = btn('First', 0, cur <= 0 || empty, false, 'bi-chevron-bar-left');
    html += btn('Previous', cur - 1, cur <= 0 || empty, false, 'bi-chevron-left');
    if (empty) {
      html += btn('1', 0, true, true);
    } else {
      const lo = Math.max(0, cur - 2);
      const hi = Math.min(total - 1, cur + 2);
      for (let i = lo; i <= hi; i++) html += btn(String(i + 1), i, false, i === cur);
    }
    html += btn('Next', cur + 1, cur >= total - 1 || empty, false, 'bi-chevron-right');
    html += btn('Last', total - 1, cur >= total - 1 || empty, false, 'bi-chevron-bar-right');
    pager.innerHTML = html;
  }

  function setStatus(message, type) {
    statusBox.textContent = message || '';
    statusBox.className = 'upload-status' + (type ? ' ' + type : '');
  }

  function setBusy(isBusy) {
    saveBtn.disabled = isBusy;
    refreshBtn.disabled = isBusy;
    saveBtn.innerHTML = isBusy
      ? '<i class="bi bi-hourglass-split"></i> Saving...'
      : '<i class="bi bi-save"></i> Save Category';
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

  function resetForm() {
    id.value = '';
    name.value = '';
    sortOrder.value = '0';
    selectedFile = null;
    picker && picker.clearPreview();
    currentImage.hidden = true;
    formTitle.textContent = 'Create Bonus Category Title';
    setStatus('', '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function editItem(item) {
    id.value = item.id || '';
    name.value = item.name || '';
    sortOrder.value = item.sortOrder ?? 0;
    selectedFile = null;
    imageInput.value = '';

    const previewUrl = resolveImageUrl(item.imageUrl, item.image, '');
    if (previewUrl) picker.showPreview(previewUrl);
    else picker.clearPreview();

    currentImage.hidden = false;
    formTitle.textContent = 'Edit Bonus Category #' + item.id;
    setStatus('', '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function filteredItems() {
    const q = (searchInput?.value || '').trim().toLowerCase();
    const mode = sortFilter?.value || 'sortAsc';
    const result = currentItems.filter(item => !q || String(item.name || '').toLowerCase().includes(q));
    result.sort((a, b) => {
      if (mode === 'sortDesc') return Number(b.sortOrder || 0) - Number(a.sortOrder || 0);
      if (mode === 'nameAsc') return String(a.name || '').localeCompare(String(b.name || ''));
      if (mode === 'nameDesc') return String(b.name || '').localeCompare(String(a.name || ''));
      return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
    });
    return result;
  }

  function renderList(items, resetPage) {
    if (Array.isArray(items)) currentItems = items;
    if (resetPage) currentPage = 0;
    const rows = filteredItems();
    const size = resolvePageSize(pageSizeSelect?.value);
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / size) || 1);
    if (currentPage >= pages) currentPage = Math.max(0, pages - 1);
    const start = total ? currentPage * size : 0;
    const pageRows = rows.slice(start, start + size);
    const from = total ? start + 1 : 0;
    const to = total ? start + pageRows.length : 0;

    list.innerHTML = '';
    empty.hidden = total > 0;
    setShowing(from, to, total);
    renderPager(currentPage, pages, total === 0);

    pageRows.forEach(item => {
      const row = document.createElement('div');
      row.className = 'category-table-row bonus-title-table-row';
      const imageUrl = resolveImageUrl(item.imageUrl, item.image, '');
      row.innerHTML = `
        <span class="category-drag" aria-hidden="true"><i class="bi bi-grip-vertical"></i></span>
        <div class="category-main-cell">
          <div class="category-thumb-full">${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.name || 'Bonus category')}">` : '<i class="bi bi-image"></i>'}</div>
          <div class="category-copy"><b>${escapeHtml(item.name || 'Untitled Category')}</b><small>ID: ${escapeHtml(item.id)} <span>•</span> Sort: ${escapeHtml(item.sortOrder ?? 0)} <span>•</span> ${escapeHtml(item.image || 'No image')}</small></div>
        </div>
        <div class="category-status-cell"><span class="status-pill active"><i class="bi bi-check-circle" aria-hidden="true"></i> Active</span></div>
        <div class="category-action-cell">
          <a class="icon-action-btn is-view" data-tip="Manage Items" aria-label="Manage Items" href="bonus-category-item.html?titleId=${escapeHtml(item.id)}"><i class="bi bi-collection" aria-hidden="true"></i></a>
          <button class="icon-action-btn is-edit edit-btn" data-tip="Edit" aria-label="Edit" type="button" data-edit="${escapeHtml(item.id)}" data-edit-id="${escapeHtml(item.id)}"><i class="bi bi-pencil-square" aria-hidden="true"></i></button>
          <button class="icon-action-btn is-reject delete btn-delete" data-tip="Delete" aria-label="Delete" type="button" data-delete-id="${escapeHtml(item.id)}"><i class="bi bi-trash" aria-hidden="true"></i></button>
        </div>`;
      list.appendChild(row);
    });
  }

  async function loadCategories() {
    list.innerHTML = '<div class="slider-empty"><i class="bi bi-hourglass-split"></i><b>Loading categories...</b></div>';
    empty.hidden = true;
    try {
      const json = await fetchJson(BONUS_CATEGORY_TITLE_API.list + '?page=1&size=100');
      renderList(json.data || [], true);
    } catch (err) {
      list.innerHTML = '';
      empty.hidden = false;
      empty.innerHTML = `<i class="bi bi-exclamation-triangle"></i><b>Unable to load categories</b><small>${escapeHtml(err.message || 'Please check API URL / CORS.')}</small>`;
    }
  }

  async function saveCategory(e) {
    e.preventDefault();
    const isUpdate = !!id.value;

    if (!name.value.trim()) {
      setStatus('Please enter name.', 'error');
      name.focus();
      return;
    }

    if (!isUpdate && !selectedFile) {
      setStatus('Please choose category image.', 'error');
      return;
    }

    const fd = new FormData();
    fd.append('name', name.value.trim());
    fd.append('sortOrder', sortOrder.value || '0');
    if (selectedFile) fd.append('image', selectedFile);

    const url = isUpdate
      ? BONUS_CATEGORY_TITLE_API.update + '/' + encodeURIComponent(id.value)
      : BONUS_CATEGORY_TITLE_API.create;

    setBusy(true);
    setStatus(isUpdate ? 'Updating category...' : 'Creating category...', '');
    try {
      const json = await fetchJson(url, { method: 'POST', body: fd });
      setStatus(json.message || 'Category saved successfully.', 'success');
      resetForm();
      await loadCategories();
    } catch (err) {
      setStatus(err.message || 'Save failed. Please check API URL / CORS.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(categoryId) {
    if (!(await BO_DIALOG.confirm('Delete this bonus category title?', {title:'Delete Category Title', confirmText:'Delete'}))) return;

    setStatus('Deleting category...', '');
    try {
      const json = await fetchJson(BONUS_CATEGORY_TITLE_API.delete, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(categoryId) })
      });
      setStatus(json.message || 'Category deleted.', 'success');
      if (id.value === String(categoryId)) resetForm();
      await loadCategories();
    } catch (err) {
      setStatus(err.message || 'Delete failed.', 'error');
    }
  }
  picker = setupImagePicker(imageInput, dropZone, preview, placeholder, (file, showPreview) => {
    selectedFile = file;
    showPreview(URL.createObjectURL(file));
    setStatus('Image ready. Click Save to upload.', 'success');
  }, setStatus);

  form.addEventListener('submit', saveCategory);
  resetBtn.addEventListener('click', resetForm);
  refreshBtn.addEventListener('click', loadCategories);
  /* Live filter — Deposit listing pattern (no Reset / Search buttons) */
  searchInput?.addEventListener('input', () => renderList(undefined, true));
  searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
  sortFilter?.addEventListener('change', () => renderList(undefined, true));
  sortFilter?.addEventListener('input', () => renderList(undefined, true));
  pageSizeSelect?.addEventListener('change', () => renderList(undefined, true));
  pager?.addEventListener('click', e => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    currentPage = Number(btn.dataset.page) || 0;
    renderList();
  });

  list.addEventListener('click', e => {
    const editBtn = e.target.closest('[data-edit-id]');
    const deleteBtn = e.target.closest('[data-delete-id]');
    if (editBtn) {
      const item = currentItems.find(x => String(x.id) === String(editBtn.dataset.editId));
      if (item) editItem(item);
    }
    if (deleteBtn) deleteCategory(deleteBtn.dataset.deleteId);
  });

  loadCategories();
})();
})();
