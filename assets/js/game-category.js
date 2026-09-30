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

function normalizeCategoryDisplayMode(value) {
  const mode = String(value || '').trim().toUpperCase();
  if (mode === 'PROVIDER' || mode === 'PROVIDER_FIRST') return 'PROVIDER_FIRST';
  return 'DIRECT_GAME';
}

function getCategoryDisplayMode(item) {
  if (!item || typeof item !== 'object') return 'DIRECT_GAME';
  return normalizeCategoryDisplayMode(
    item.displayMode ??
    item.display_mode ??
    item.frontendDisplayMode ??
    item.frontend_display_mode ??
    item.categoryDisplayMode ??
    item.category_display_mode ??
    item.mode
  );
}

function categoryDisplayModeLabel(value) {
  return normalizeCategoryDisplayMode(value) === 'PROVIDER_FIRST' ? 'Provider First' : 'Direct Game List';
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

const GAME_API_CATEGORY = {
  list: adminApi('GAME_CATEGORY_LIST'),
  delete: adminApi('GAME_CATEGORY_DELETE')
};

(function () {
  const tenantPresentation = !!(window.BO_BRAND && !window.BO_BRAND.isMaster());
  const list = document.getElementById('categoryList');
  const empty = document.getElementById('categoryEmpty');
  if (!list || !empty) return;

  const refreshBtn = document.getElementById('refreshCategoryBtn');
  const statusBox = document.getElementById('categoryStatusBox');
  const searchInput = document.getElementById('categorySearchInput');
  const modeFilter = document.getElementById('categoryModeFilter');
  const statusFilter = document.getElementById('categoryStatusFilter');
  const sortFilter = document.getElementById('categorySortFilter');
  const showingTextEl = document.getElementById('categoryShowingText');
  const pageSizeSelect = document.getElementById('categoryPageSize');
  const pager = document.getElementById('categoryPager');
  const addBtn = document.getElementById('addCategoryBtn');

  if (tenantPresentation && addBtn) addBtn.hidden = true;

  let currentItems = [];
  let currentPage = 0;

  function editHref(id) {
    return 'game-category-edit.html?id=' + encodeURIComponent(String(id));
  }

  function setStatus(message, type) {
    if (!statusBox) return;
    const text = message || '';
    statusBox.textContent = text;
    statusBox.className = 'upload-status' + (type ? ' ' + type : '');
    statusBox.hidden = !text;
  }

  function resolvePageSize(raw) {
    const v = String(raw ?? '-').trim();
    if (v === '-' || v === '') return 20;
    if (/^all$/i.test(v)) return 10000;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 20;
  }

  function setShowing(from, to, total) {
    if (!showingTextEl) return;
    showingTextEl.textContent = `Showing ${from} to ${to} of ${total} entries`;
  }

  function renderPager(page, pages, isEmpty) {
    if (!pager) return;
    const total = Math.max(1, Number(pages) || 1);
    const cur = Math.max(0, Math.min(Number(page) || 0, total - 1));
    const btn = (label, target, disabled, active, icon) =>
      `<button type="button" class="page-btn${active ? ' active' : ''}" data-page="${target}" ${disabled ? 'disabled' : ''} aria-label="${label}"${active ? ' aria-current="page"' : ''}>${icon ? `<i class="bi ${icon}"></i>` : label}</button>`;
    let html = btn('First', 0, cur <= 0 || isEmpty, false, 'bi-chevron-bar-left');
    html += btn('Previous', cur - 1, cur <= 0 || isEmpty, false, 'bi-chevron-left');
    if (isEmpty) {
      html += btn('1', 0, true, true);
    } else {
      const lo = Math.max(0, cur - 2);
      const hi = Math.min(total - 1, cur + 2);
      if (lo > 0) {
        html += btn('1', 0, false, cur === 0);
        if (lo > 1) html += '<span class="smart-page-ellipsis" aria-hidden="true">…</span>';
      }
      for (let i = lo; i <= hi; i++) html += btn(String(i + 1), i, false, i === cur);
      if (hi < total - 1) {
        if (hi < total - 2) html += '<span class="smart-page-ellipsis" aria-hidden="true">…</span>';
        html += btn(String(total), total - 1, false, cur === total - 1);
      }
    }
    html += btn('Next', cur + 1, cur >= total - 1 || isEmpty, false, 'bi-chevron-right');
    html += btn('Last', total - 1, cur >= total - 1 || isEmpty, false, 'bi-chevron-bar-right');
    pager.innerHTML = html;
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

  function renderList(items, resetPage) {
    if (Array.isArray(items)) currentItems = items;
    if (resetPage) currentPage = 0;

    const query = (searchInput?.value || '').trim().toLowerCase();
    const mode = modeFilter?.value || '';
    const statusValue = statusFilter?.value || '';
    const sortValue = sortFilter?.value || 'sortAsc';
    let visible = currentItems.filter(item => {
      const itemMode = getCategoryDisplayMode(item);
      return (!query || String(item.name || '').toLowerCase().includes(query)) &&
        (!mode || itemMode === mode) &&
        (!statusValue || String(item.status) === statusValue);
    });
    visible.sort((a, b) => {
      if (sortValue === 'sortDesc') return Number(b.sortOrder || 0) - Number(a.sortOrder || 0);
      if (sortValue === 'nameAsc') return String(a.name || '').localeCompare(String(b.name || ''));
      if (sortValue === 'nameDesc') return String(b.name || '').localeCompare(String(a.name || ''));
      return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
    });

    const size = resolvePageSize(pageSizeSelect?.value);
    const total = visible.length;
    const pages = Math.max(1, Math.ceil(total / size) || 1);
    if (currentPage >= pages) currentPage = Math.max(0, pages - 1);
    const start = total ? currentPage * size : 0;
    const pageRows = visible.slice(start, start + size);
    const from = total ? start + 1 : 0;
    const to = total ? start + pageRows.length : 0;

    list.innerHTML = '';
    empty.hidden = total > 0;
    setShowing(from, to, total);
    renderPager(currentPage, pages, total === 0);

    pageRows.forEach(item => {
      const row = document.createElement('div');
      row.className = 'category-table-row';
      const imageUrl = resolveImageUrl(item.imageUrl, item.image, '');
      row.innerHTML = `
        <div class="category-drag"><i class="bi bi-grip-vertical"></i></div>
        <div class="category-main-cell">
          <div class="category-thumb-full">${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.name || 'Category')}">` : '<i class="bi bi-image"></i>'}</div>
          <div class="category-copy"><b>${escapeHtml(item.name || 'Untitled Category')}</b><small>ID: ${escapeHtml(item.id)} <span>•</span> Sort: ${escapeHtml(item.sortOrder ?? 0)} <span>•</span> Mode: ${escapeHtml(categoryDisplayModeLabel(getCategoryDisplayMode(item)))}</small></div>
        </div>
        <div class="category-status-cell">${statusPill(item.status)}</div>
        <div class="category-action-cell">
          <a class="icon-action-btn edit edit-btn" href="${editHref(item.id)}" aria-label="Edit"><i class="bi bi-pencil-square"></i></a>
          ${tenantPresentation ? '' : `<button class="icon-action-btn delete" type="button" data-delete-id="${escapeHtml(item.id)}" aria-label="Delete"><i class="bi bi-trash"></i></button>`}
        </div>`;
      list.appendChild(row);
    });
  }

  function applyCategoryFilters() { renderList(currentItems, true); }

  async function loadCategories() {
    list.innerHTML = '<div class="slider-empty"><i class="bi bi-hourglass-split"></i><b>Loading categories...</b></div>';
    empty.hidden = true;
    try {
      const json = await fetchJson(GAME_API_CATEGORY.list);
      renderList(json.data || [], true);
    } catch (err) {
      list.innerHTML = '';
      empty.hidden = false;
      empty.innerHTML = `<i class="bi bi-exclamation-triangle"></i><b>Unable to load categories</b><small>${escapeHtml(err.message || 'Please check API URL / CORS.')}</small>`;
    }
  }

  async function deleteCategory(categoryId) {
    if (!(await BO_DIALOG.confirm('Delete this category?', { title: 'Delete Category', confirmText: 'Delete' }))) return;
    const fd = new FormData();
    fd.append('id', categoryId);
    try {
      const res = await fetch(GAME_API_CATEGORY.delete, { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Delete failed');
      setStatus(json.message || 'Category deleted.', 'success');
      await loadCategories();
    } catch (err) {
      setStatus(err.message || 'Delete failed.', 'error');
    }
  }

  refreshBtn?.addEventListener('click', loadCategories);

  list.addEventListener('click', e => {
    const deleteBtn = e.target.closest('[data-delete-id]');
    if (deleteBtn) deleteCategory(deleteBtn.dataset.deleteId);
  });

  searchInput && searchInput.addEventListener('input', applyCategoryFilters);
  [modeFilter, statusFilter, sortFilter].forEach(el => el && el.addEventListener('change', applyCategoryFilters));
  pageSizeSelect?.addEventListener('change', () => renderList(undefined, true));
  pager?.addEventListener('click', e => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    currentPage = Number(btn.dataset.page) || 0;
    renderList();
  });
  loadCategories();
})();
