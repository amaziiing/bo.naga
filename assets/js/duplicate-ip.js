(function () {
(function () {
  let rows = [];
  let currentPage = 1;
  const esc = (v) =>
    String(v == null ? '' : v).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  const dt = (v) =>
    window.BO_FORMAT?.dateTime
      ? BO_FORMAT.dateTime(v)
      : v
        ? String(v).replace('T', ' ').slice(0, 19)
        : '-';

  const pageSizeEl = document.getElementById('dupPageSize');
  const paginationEl = document.getElementById('dupPagination');
  const tableWrap = document.querySelector('.dup-panel:not(.is-secondary) .dup-table-wrap');

  async function api(url) {
    const r = await fetch(url, { headers: BO_AUTH.authHeader() });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.status === 'error') throw new Error(j.message || 'Request failed');
    return j.data || [];
  }

  function isAutoPageSize(raw) {
    const v = String(raw ?? pageSizeEl?.value ?? '-').trim();
    return v === '' || v === '-' || /^auto$/i.test(v);
  }

  function resolvePageSize(raw) {
    const v = String(raw ?? pageSizeEl?.value ?? '-').trim();
    if (/^all$/i.test(v)) return 10000;
    if (isAutoPageSize(v)) {
      if (!tableWrap) return 12;
      const head = tableWrap.querySelector('thead');
      const headH = head ? Math.ceil(head.getBoundingClientRect().height) : 44;
      const avail = Math.max(0, Math.floor(tableWrap.clientHeight) - headH);
      const sample = tableWrap.querySelector('tbody tr td');
      const rowH = sample ? Math.max(38, Math.round(sample.getBoundingClientRect().height)) : 41;
      return Math.max(5, Math.min(200, Math.floor(avail / rowH) || 12));
    }
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 12;
  }

  function filteredRows() {
    const q = (document.getElementById('dupIpSearch').value || '').trim().toLowerCase();
    return rows.filter((r) => !q || String(r.ip || '').toLowerCase().includes(q));
  }

  function renderPager(total, pageSize) {
    if (!paginationEl) return;
    const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
    const cur = Math.min(Math.max(1, currentPage), totalPages);
    currentPage = cur;
    const isEmpty = total === 0;
    const btn = (label, target, disabled, active, icon) =>
      `<button type="button" class="page-btn${active ? ' active' : ''}" data-page="${target}" ${
        disabled ? 'disabled' : ''
      } aria-label="${label}"${active ? ' aria-current="page"' : ''}>${
        icon ? `<i class="bi ${icon}"></i>` : label
      }</button>`;
    let html = btn('First', 1, cur <= 1 || isEmpty, false, 'bi-chevron-bar-left');
    html += btn('Previous', cur - 1, cur <= 1 || isEmpty, false, 'bi-chevron-left');
    if (isEmpty) {
      html += btn('1', 1, true, true);
    } else {
      const lo = Math.max(1, cur - 2);
      const hi = Math.min(totalPages, cur + 2);
      if (lo > 1) {
        html += btn('1', 1, false, cur === 1);
        if (lo > 2) html += '<span class="smart-page-ellipsis" aria-hidden="true">…</span>';
      }
      for (let i = lo; i <= hi; i++) html += btn(String(i), i, false, i === cur);
      if (hi < totalPages) {
        if (hi < totalPages - 1) html += '<span class="smart-page-ellipsis" aria-hidden="true">…</span>';
        html += btn(String(totalPages), totalPages, false, cur === totalPages);
      }
    }
    html += btn('Next', cur + 1, cur >= totalPages || isEmpty, false, 'bi-chevron-right');
    html += btn('Last', totalPages, cur >= totalPages || isEmpty, false, 'bi-chevron-bar-right');
    paginationEl.innerHTML = html;
  }

  function render(resetPage) {
    if (resetPage) currentPage = 1;
    const filtered = filteredRows();
    const total = filtered.length;
    const pageSize = resolvePageSize();
    const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);
    const from = total ? start + 1 : 0;
    const to = total ? Math.min(start + pageSize, total) : 0;

    document.getElementById('dupCount').textContent =
      `Showing ${from} to ${to} of ${total} entries`;

    document.getElementById('dupBody').innerHTML = pageItems.length
      ? pageItems
          .map(
            (r, i) =>
              `<tr><td>${start + i + 1}</td><td><code>${esc(r.ip)}</code></td><td><span class="dup-share-pill">${
                Number(r.userCount) || 0
              } users</span></td><td><button class="clean-btn primary dup-view-btn" type="button" data-ip="${esc(
                r.ip
              )}" title="View users" aria-label="View users for ${esc(
                r.ip
              )}"><i class="bi bi-eye" aria-hidden="true"></i><span class="btn-label">View</span></button></td></tr>`
          )
          .join('')
      : '<tr><td colspan="4">No duplicate login IP found.</td></tr>';

    renderPager(total, pageSize);
  }

  async function load() {
    document.getElementById('dupBody').innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    try {
      rows = await api(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.DUPLICATE_IP_LIST);
      render(true);
    } catch (e) {
      document.getElementById('dupBody').innerHTML =
        '<tr><td colspan="4">' + esc(e.message) + '</td></tr>';
      document.getElementById('dupCount').textContent = 'Showing 0 to 0 of 0 entries';
      renderPager(0, resolvePageSize());
    }
  }

  async function users(ip) {
    const modal = document.getElementById('dupUsersModal');
    const body = document.getElementById('dupUsersBody');
    document.getElementById('dupUsersTitle').textContent = 'Users sharing ' + ip;
    body.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';
    openUsersModal();
    try {
      const data = await api(
        API_CONFIG.BASE_URL +
          API_CONFIG.ENDPOINTS.DUPLICATE_IP_USERS +
          '?ip=' +
          encodeURIComponent(ip)
      );
      body.innerHTML =
        data
          .map(
            (m) =>
              `<tr><td>${m.id}</td><td>${esc(m.username)}</td><td>${esc(m.fullName || '-')}</td><td>${esc(
                m.mobile || '-'
              )}</td><td><code>${esc(m.registrationIp || '-')}</code></td><td><code>${esc(
                m.lastLoginIp || '-'
              )}</code></td><td>${dt(m.lastLoginAt)}</td><td>${dt(m.createdAt)}</td></tr>`
          )
          .join('') || '<tr><td colspan="8">No users found.</td></tr>';
    } catch (e) {
      body.innerHTML = '<tr><td colspan="8">' + esc(e.message) + '</td></tr>';
    }
  }

  function openUsersModal() {
    const modal = document.getElementById('dupUsersModal');
    if (!modal) return;
    modal.classList.add('show');
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeUsersModal() {
    const modal = document.getElementById('dupUsersModal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  document.getElementById('dupBody').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ip]');
    if (b) users(b.dataset.ip);
  });

  document.getElementById('dupUsersModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget || e.target.closest('[data-dup-users-close]')) {
      closeUsersModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('dupUsersModal')?.classList.contains('show')) {
      closeUsersModal();
    }
  });

  paginationEl?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-page]');
    if (!b || b.disabled) return;
    const page = Number(b.dataset.page);
    if (!Number.isFinite(page) || page < 1) return;
    currentPage = page;
    render(false);
  });

  document.getElementById('dupSearch').onclick = () => render(true);
  document.getElementById('dupRefresh').onclick = load;
  document.getElementById('dupReset').onclick = () => {
    document.getElementById('dupIpSearch').value = '';
    render(true);
  };
  document.getElementById('dupIpSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') render(true);
  });
  pageSizeEl?.addEventListener('change', () => render(true));

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    if (!isAutoPageSize()) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => render(false), 120);
  });

  load();
})();
})();
