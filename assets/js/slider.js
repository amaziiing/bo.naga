(function () {
const SLIDER_API_LIST = {
  list: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.SLIDER_LIST,
  update: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.SLIDER_UPDATE,
  delete: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.SLIDER_DELETE
};

(function () {
  const $ = id => document.getElementById(id);
  const list = $('sliderList');
  const empty = $('sliderEmpty');
  const refreshBtn = $('refreshSliderBtn');
  const searchInput = $('bannerSearchInput');
  const statusFilter = $('bannerStatusFilter');
  if (!list || !empty || !refreshBtn || !searchInput || !statusFilter) return;

  let currentItems = [];
  let filteredItems = [];
  let statusBusyId = null;

  function escapeHtml(v) {
    return String(v ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
  function isActive(item) { return Number(item.status) === 1; }
  function statusText(v) { return Number(v) === 1 ? 'Active' : 'Suspend'; }
  function resolveImageUrl(url, filename, fallbackUrl) {
    if (url) return url;
    if (!filename) return '';
    const v = String(filename).trim();
    if (!v) return '';
    if (/^(https?:)?\/\//i.test(v) || v.startsWith('/') || v.startsWith('data:') || v.startsWith('blob:')) return v;
    if (fallbackUrl) {
      const c = String(fallbackUrl).split('?')[0];
      const i = c.lastIndexOf('/');
      if (i >= 0) return c.substring(0, i + 1) + v;
    }
    return v;
  }
  function itemImage(item) { return resolveImageUrl(item.imageUrl, item.image, ''); }
  function formatUpdatedAt(v) {
    const raw = String(v || '').trim();
    if (!raw) return '-';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function destinationLabel(item) {
    const url = String(item.linkUrl || '').trim();
    return url || 'No link configured';
  }
  function editHref(id) {
    return 'slider-edit.html?id=' + encodeURIComponent(String(id));
  }
  function notifyError(message) {
    if (window.BO_DIALOG && typeof BO_DIALOG.alert === 'function') BO_DIALOG.alert(message);
    else window.alert(message);
  }

  function updateStats() {
    const total = $('bannerTotalCount');
    const active = $('bannerActiveCount');
    const inactive = $('bannerInactiveCount');
    if (total) total.textContent = currentItems.length;
    if (active) active.textContent = currentItems.filter(isActive).length;
    if (inactive) inactive.textContent = currentItems.filter(x => !isActive(x)).length;
  }

  function renderList() {
    list.innerHTML = '';
    const hasItems = filteredItems.length > 0;
    empty.hidden = hasItems;

    filteredItems.forEach((item, index) => {
      const card = document.createElement('article');
      card.className = 'banner-gallery-card';
      card.setAttribute('role', 'listitem');
      const src = itemImage(item);
      const dest = destinationLabel(item);
      const destClass = item.linkUrl ? '' : 'is-muted';
      const active = isActive(item);
      const busy = String(statusBusyId) === String(item.id);
      card.innerHTML = `
        <div class="banner-gallery-cover">
          ${src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.title || 'Banner')}" loading="lazy">` : '<span class="banner-gallery-fallback"><i class="bi bi-image"></i></span>'}
          <b class="banner-order-badge">${escapeHtml(item.sortOrder ?? index + 1)}</b>
          <button type="button" class="slider-pill ${active ? 'active' : 'inactive'}${busy ? ' is-busy' : ''}" data-toggle-status="${escapeHtml(item.id)}" aria-pressed="${active ? 'true' : 'false'}" title="${active ? 'Click to Suspend' : 'Click to Activate'}" ${busy ? 'disabled' : ''}>${busy ? 'Saving...' : statusText(item.status)}</button>
          <div class="banner-hover-actions">
            <a class="banner-hover-btn" href="${editHref(item.id)}" aria-label="Edit banner" title="Edit"><i class="bi bi-pencil-square" aria-hidden="true"></i></a>
            <button type="button" class="banner-hover-btn is-danger" data-delete-id="${escapeHtml(item.id)}" aria-label="Delete banner" title="Delete"><i class="bi bi-trash3" aria-hidden="true"></i></button>
          </div>
        </div>
        <div class="banner-gallery-meta">
          <dl class="banner-card-facts">
            <div><dt><i class="bi bi-house" aria-hidden="true"></i>Name</dt><dd>${escapeHtml(item.title || 'Untitled Banner')}</dd></div>
            <div><dt><i class="bi bi-check-circle" aria-hidden="true"></i>Status</dt><dd>${escapeHtml(statusText(item.status))}</dd></div>
            <div><dt><i class="bi bi-sliders" aria-hidden="true"></i>Sort Order</dt><dd>${escapeHtml(item.sortOrder ?? 0)}</dd></div>
            <div><dt><i class="bi bi-link-45deg" aria-hidden="true"></i>Destination</dt><dd class="${destClass}" title="${escapeHtml(dest)}">${escapeHtml(dest)}</dd></div>
            <div><dt><i class="bi bi-calendar3" aria-hidden="true"></i>Updated At</dt><dd>${escapeHtml(formatUpdatedAt(item.updatedAt || item.modifiedAt || item.createdAt))}</dd></div>
            <div><dt><i class="bi bi-person" aria-hidden="true"></i>Updated By</dt><dd>${escapeHtml(item.updatedBy || 'Super Admin')}</dd></div>
          </dl>
        </div>`;
      list.appendChild(card);
    });
  }

  function applyFilters() {
    const q = (searchInput.value || '').trim().toLowerCase();
    const sv = statusFilter.value;
    filteredItems = currentItems.filter(item =>
      (sv === 'all' || String(item.status) === sv) &&
      (!q || String(item.title || '').toLowerCase().includes(q) || String(item.linkUrl || '').toLowerCase().includes(q))
    );
    renderList();
  }

  async function loadSliders() {
    list.innerHTML = '<div class="banner-gallery-loading"><i class="bi bi-hourglass-split"></i><b>Loading banners...</b></div>';
    empty.hidden = true;
    refreshBtn.disabled = true;
    try {
      const res = await fetch(SLIDER_API_LIST.list);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Failed to load banners');
      currentItems = Array.isArray(json.data) ? json.data : [];
      updateStats();
      applyFilters();
    } catch (err) {
      currentItems = [];
      filteredItems = [];
      updateStats();
      list.innerHTML = '';
      empty.hidden = false;
      empty.innerHTML = `<i class="bi bi-exclamation-triangle"></i><b>Unable to load banners</b><small>${escapeHtml(err.message || 'Please check API URL / CORS.')}</small>`;
    } finally {
      refreshBtn.disabled = false;
    }
  }

  async function toggleStatus(id) {
    const item = currentItems.find(x => String(x.id) === String(id));
    if (!item || statusBusyId != null) return;
    const nextStatus = isActive(item) ? '2' : '1';
    statusBusyId = id;
    renderList();
    const fd = new FormData();
    fd.append('id', item.id);
    fd.append('title', item.title || '');
    if (item.titleZh != null || item.chineseTitle != null) fd.append('titleZh', item.titleZh || item.chineseTitle || '');
    fd.append('linkUrl', item.linkUrl || '');
    fd.append('sortOrder', String(item.sortOrder ?? 0));
    fd.append('status', nextStatus);
    try {
      const res = await fetch(SLIDER_API_LIST.update, { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Status update failed');
      item.status = Number(nextStatus);
      updateStats();
      applyFilters();
    } catch (err) {
      notifyError(err.message || 'Status update failed.');
      renderList();
    } finally {
      statusBusyId = null;
      renderList();
    }
  }

  async function deleteSlider(id) {
    if (!(await BO_DIALOG.confirm('Delete this banner?', { title: 'Delete Banner', confirmText: 'Delete' }))) return;
    const fd = new FormData();
    fd.append('id', id);
    try {
      const res = await fetch(SLIDER_API_LIST.delete, { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Delete failed');
      await loadSliders();
    } catch (err) {
      notifyError(err.message || 'Delete failed.');
    }
  }

  refreshBtn.addEventListener('click', loadSliders);
  searchInput.addEventListener('input', applyFilters);
  statusFilter.addEventListener('change', applyFilters);

  list.addEventListener('click', e => {
    const toggle = e.target.closest('[data-toggle-status]');
    if (toggle) {
      e.preventDefault();
      e.stopPropagation();
      toggleStatus(toggle.dataset.toggleStatus);
      return;
    }
    const del = e.target.closest('[data-delete-id]');
    if (!del) return;
    e.preventDefault();
    e.stopPropagation();
    deleteSlider(del.dataset.deleteId);
  });

  loadSliders();
})();
})();
