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

const GAME_API_CATEGORY_SUB = { list: adminApi('GAME_CATEGORY_LIST') };
const GAME_API_PROVIDER_SUB = { list: adminApi('GAME_PROVIDER_LIST') };
const GAME_API_SUB_CATEGORY = {
  list: adminApi('GAME_SUB_CATEGORY_LIST'),
  delete: adminApi('GAME_SUB_CATEGORY_DELETE')
};

(function () {
  const tenantPresentation = !!(window.BO_BRAND && !window.BO_BRAND.isMaster());
  const list = document.getElementById('subCategoryList');
  const empty = document.getElementById('subCategoryEmpty');
  if (!list || !empty) return;

  const refreshBtn = document.getElementById('refreshSubCategoryBtn');
  const statusBox = document.getElementById('subCategoryStatusBox');
  const filter = document.getElementById('subCategoryFilter');
  const addBtn = document.getElementById('addSubCategoryBtn');
  const showingTextEl = document.getElementById('subCategoryShowingText');
  const paginationEl = document.getElementById('subCategoryPagination');
  const pageSizeEl = document.getElementById('subCategoryPageSize');
  const tableWrap = document.querySelector('.subcategory-table-wrap');
  const panel = document.querySelector('.subcategory-panel');

  if (tenantPresentation && addBtn) addBtn.hidden = true;

  let currentItems = [];
  let currentPage = 0;
  let categories = [];
  let providers = [];
  let lockedAutoSize = null;
  let autofitSettled = false;
  let autofitReloading = false;

  function editHref(id) {
    return 'game-sub-category-edit.html?id=' + encodeURIComponent(String(id));
  }

  function setStatus(message, type) {
    if (!statusBox) return;
    const text = message || '';
    statusBox.textContent = text;
    statusBox.className = 'upload-status' + (type ? ' ' + type : '');
    statusBox.hidden = !text;
  }

  /* ===== MD Show `-` autofit (VIP EXP / Reward Log contract) ===== */
  function isAutoPageSize(raw) {
    const v = String(raw ?? pageSizeEl?.value ?? '-').trim();
    return v === '' || v === '-' || /^auto$/i.test(v);
  }

  function tableBodyScroll() {
    return list;
  }

  function naturalRowHeight() {
    const sample = list.querySelector('.subcategory-table-row');
    if (sample) return Math.max(56, Math.round(sample.getBoundingClientRect().height));
    return 72;
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
    return [...list.querySelectorAll('.subcategory-table-row')];
  }

  function resetEvenFill() {
    list.classList.remove('bo-tx-evenfill');
    list.style.height = '';
    dataRows().forEach(row => {
      row.style.height = '';
      row.style.minHeight = '';
      row.style.maxHeight = '';
      row.style.overflow = '';
      row.querySelectorAll('.subcategory-drag, .subcategory-main-cell, .subcategory-status-cell, .subcategory-action-cell')
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
    const rowH = Math.max(56, Math.round(natural / rows.length) || 72);
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
      row.querySelectorAll('.subcategory-drag, .subcategory-main-cell, .subcategory-status-cell, .subcategory-action-cell')
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
      /* Cold paint: lock a floor measure and re-render once rows exist. */
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
    const rowH = Math.max(56, Math.round(natural / rows.length) || 72);
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
    /* Observe the viewport wrap — never the list. evenFill writes list.style.height,
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

  function categoryName(catId) {
    const item = categories.find(x => String(x.id) === String(catId));
    return item ? item.name : '-';
  }

  function providerCodeOf(item) {
    return String(item?.code || item?.providerCode || item?.provider_code || '').trim().toUpperCase();
  }

  function providerName(code) {
    const clean = String(code || '').trim().toUpperCase();
    const item = providers.find(x => providerCodeOf(x) === clean);
    return item ? (item.name || clean) : (clean || '-');
  }

  function fillFilterOptions() {
    if (!filter) return;
    const options = categories.map(item =>
      `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`
    ).join('');
    filter.innerHTML = '<option value="">All Categories</option>' + options;
  }

  async function loadSetup() {
    const [catJson, providerJson] = await Promise.all([
      fetchJson(GAME_API_CATEGORY_SUB.list),
      fetchJson(GAME_API_PROVIDER_SUB.list).catch(() => ({ data: [] }))
    ]);
    categories = catJson.data || [];
    providers = providerJson.data || [];
    fillFilterOptions();
  }

  function setShowing(from, to, total) {
    if (!showingTextEl) return;
    showingTextEl.textContent = `Showing ${from} to ${to} of ${total} entries`;
  }

  function renderPager(page, pages, isEmpty) {
    if (!paginationEl) return;
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
    paginationEl.innerHTML = html;
  }

  function renderList(items, resetPage = false) {
    if (Array.isArray(items)) currentItems = items;
    if (resetPage) currentPage = 0;
    list.innerHTML = '';
    syncAutofitMode();

    const pageSize = resolvePageSize(pageSizeEl?.value);
    const total = currentItems.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
    if (currentPage >= totalPages) currentPage = Math.max(0, totalPages - 1);
    const startIndex = total ? currentPage * pageSize : 0;
    const pageItems = currentItems.slice(startIndex, startIndex + pageSize);
    const from = total ? startIndex + 1 : 0;
    const to = total ? startIndex + pageItems.length : 0;

    empty.hidden = total > 0;
    setShowing(from, to, total);
    renderPager(currentPage, totalPages, total === 0);

    pageItems.forEach(item => {
      const row = document.createElement('div');
      row.className = 'subcategory-table-row';
      row.innerHTML = `
        <span class="subcategory-drag"><i class="bi bi-grip-vertical"></i></span>
        <div class="subcategory-main-cell">
          <span class="subcategory-row-icon"><i class="bi bi-diagram-3"></i></span>
          <div class="subcategory-copy">
            <b>${escapeHtml(item.name || 'Untitled Sub Category')}</b>
            <small>
              <span>ID: ${escapeHtml(item.id)}</span><span class="dot">•</span>
              <span>${escapeHtml(categoryName(item.categoryId))}</span><span class="dot">•</span>
              <span>Provider: ${escapeHtml(providerName(item.providerCode))}</span><span class="dot">•</span>
              <span>Sort: ${escapeHtml(item.sortOrder ?? 0)}</span>
            </small>
          </div>
        </div>
        <div class="subcategory-status-cell">${statusPill(item.status)}</div>
        <div class="subcategory-action-cell">
          <a class="icon-action-btn edit edit-btn" href="${editHref(item.id)}" aria-label="Edit" title="Edit"><i class="bi bi-pencil-square"></i></a>
          ${tenantPresentation ? '' : `<button class="icon-action-btn delete" type="button" data-delete-id="${escapeHtml(item.id)}" aria-label="Delete" title="Delete"><i class="bi bi-trash"></i></button>`}
        </div>`;
      list.appendChild(row);
    });

    if (!autofitReloading) scheduleAutofit();
    else syncAutofitLabel();
  }

  async function loadSubCategories() {
    clearLockedAutoSize();
    list.innerHTML = '<div class="slider-empty"><i class="bi bi-hourglass-split"></i><b>Loading sub categories...</b></div>';
    empty.hidden = true;
    try {
      const params = filter?.value ? '?categoryId=' + encodeURIComponent(filter.value) : '';
      const json = await fetchJson(GAME_API_SUB_CATEGORY.list + params);
      renderList(json.data || [], true);
    } catch (err) {
      list.innerHTML = '';
      empty.hidden = false;
      empty.innerHTML = `<i class="bi bi-exclamation-triangle"></i><b>Unable to load sub categories</b><small>${escapeHtml(err.message || 'Please check API URL / CORS.')}</small>`;
      setShowing(0, 0, 0);
      renderPager(0, 1, true);
      resetEvenFill();
    }
  }

  async function deleteSubCategory(subCategoryId) {
    if (!(await BO_DIALOG.confirm('Delete this sub category?', { title: 'Delete Subcategory', confirmText: 'Delete' }))) return;
    const fd = new FormData();
    fd.append('id', subCategoryId);
    try {
      const res = await fetch(GAME_API_SUB_CATEGORY.delete, { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Delete failed');
      setStatus(json.message || 'Sub category deleted.', 'success');
      await loadSubCategories();
    } catch (err) {
      setStatus(err.message || 'Delete failed.', 'error');
    }
  }

  refreshBtn?.addEventListener('click', loadSubCategories);
  filter?.addEventListener('change', () => {
    clearLockedAutoSize();
    loadSubCategories();
  });
  pageSizeEl?.addEventListener('change', () => {
    clearLockedAutoSize();
    syncAutofitMode();
    renderList(currentItems, true);
  });
  paginationEl?.addEventListener('click', e => {
    const button = e.target.closest('[data-page]');
    if (!button || button.disabled) return;
    const page = Number(button.dataset.page);
    if (!Number.isFinite(page) || page < 0) return;
    currentPage = page;
    renderList(currentItems);
  });

  list.addEventListener('click', e => {
    const deleteBtn = e.target.closest('[data-delete-id]');
    if (deleteBtn) deleteSubCategory(deleteBtn.dataset.deleteId);
  });

  if (tenantPresentation) {
    const emptySmall = empty.querySelector('small');
    if (emptySmall) emptySmall.textContent = 'No sub category is available from the providers assigned to this branding.';
  }

  (async function init() {
    syncAutofitMode();
    bindEvenFillObserver();
    try {
      await loadSetup();
      await loadSubCategories();
    } catch (err) {
      setStatus(err.message || 'Unable to load categories.', 'error');
      empty.hidden = false;
      empty.innerHTML = `<i class="bi bi-exclamation-triangle"></i><b>Unable to load setup data</b><small>${escapeHtml(err.message || 'Please create category first.')}</small>`;
    }
  })();
})();
