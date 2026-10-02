(function () {
  /* A swap re-runs this file and the router replays its DOMContentLoaded block, so the Escape
     keydown and the resize handler inside it were added once more per entry. Release the
     previous run's bindings first. */
  if (window.__boCpUnbind) window.__boCpUnbind();
  const unbinds = [];
  const listen = (target, type, fn, opt) => { target.addEventListener(type, fn, opt); unbinds.push(() => target.removeEventListener(type, fn, opt)); };
  window.__boCpUnbind = () => { unbinds.forEach(fn => fn()); unbinds.length = 0; };
  const $ = (id) => document.getElementById(id);
  const state = { items: [], currentPage: 1 };
  const pageSizeEl = $('policyPageSize');
  const paginationEl = $('policyPagination');
  const tableWrap = document.querySelector('.policy-table-wrap');

  const url = (k) => {
    const endpoint = API_CONFIG?.ENDPOINTS?.[k];
    if (!endpoint) throw new Error('Missing API endpoint configuration: ' + k);
    return String(API_CONFIG.BASE_URL || '').replace(/\/$/, '') + endpoint;
  };
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  async function request(u, opt = {}) {
    opt.headers = { ...(opt.headers || {}), ...(window.BO_AUTH ? BO_AUTH.authHeader() : {}) };
    const r = await fetch(u, opt);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.status === 'error') throw new Error(j.message || 'Request failed');
    return j;
  }
  function msg(t, type = '') {
    const el = $('policyMessage');
    if (!el) return;
    el.textContent = t || '';
    el.className = 'upload-status policy-message' + (type ? ' ' + type : '');
    el.hidden = !t;
  }
  function nowStamp() {
    const d = new Date();
    return (
      String(d.getDate()).padStart(2, '0') +
      '/' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '/' +
      d.getFullYear() +
      ' ' +
      String(d.getHours()).padStart(2, '0') +
      ':' +
      String(d.getMinutes()).padStart(2, '0') +
      ':' +
      String(d.getSeconds()).padStart(2, '0')
    );
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
  function renderPager(total, pageSize) {
    if (!paginationEl) return;
    const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
    const cur = Math.min(Math.max(1, state.currentPage), totalPages);
    state.currentPage = cur;
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
  function openModal() {
    const m = $('policyModal');
    if (!m) return;
    m.classList.add('show');
    m.removeAttribute('hidden');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
  function closeModal() {
    const m = $('policyModal');
    if (!m) return;
    m.classList.remove('show');
    m.setAttribute('hidden', '');
    m.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }
  function render(resetPage) {
    if (resetPage) state.currentPage = 1;
    const total = state.items.length;
    const pageSize = resolvePageSize();
    const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    const start = (state.currentPage - 1) * pageSize;
    const pageItems = state.items.slice(start, start + pageSize);
    const from = total ? start + 1 : 0;
    const to = total ? Math.min(start + pageSize, total) : 0;

    $('policyRecordCount').textContent = `Showing ${from} to ${to} of ${total} entries`;

    const body = $('policyTableBody');
    body.innerHTML =
      pageItems.length
        ? pageItems
            .map(
              (x) => `<tr>
  <td>${Number(x.sortOrder || 0)}</td>
  <td><span class="policy-key-chip">${esc(x.policyKey)}</span></td>
  <td>${esc(x.tabLabel)}</td>
  <td class="policy-title-cell" title="${esc(x.title)}">${esc(x.title)}</td>
  <td>${esc(x.lastUpdated || '-')}</td>
  <td><span class="policy-status-badge ${Number(x.status) === 1 ? '' : 'off'}">${
                Number(x.status) === 1 ? 'Active' : 'Inactive'
              }</span></td>
  <td><div class="policy-action-wrap"><button class="policy-action-btn" type="button" data-edit-id="${
                x.id
              }" title="Edit" aria-label="Edit ${esc(x.tabLabel || x.policyKey)}"><i class="bi bi-pencil" aria-hidden="true"></i></button></div></td>
 </tr>`
            )
            .join('')
        : '<tr><td colspan="7">No policies found.</td></tr>';
    renderPager(total, pageSize);
  }
  function edit(x) {
    $('policyId').value = x?.id || '';
    $('policyKey').value = x?.policyKey || '';
    $('tabLabel').value = x?.tabLabel || '';
    $('policyTitle').value = x?.title || '';
    $('sortOrder').value = x?.sortOrder ?? 0;
    $('policyStatus').value = String(x?.status ?? 1);
    $('contentHtml').value = x?.contentHtml || '';
    $('editorTitle').textContent = x ? 'Edit Policy' : 'Create Policy';
    $('policySubmitBtn').innerHTML = x
      ? '<i class="bi bi-save" aria-hidden="true"></i> Save Changes'
      : '<i class="bi bi-plus-lg" aria-hidden="true"></i> Create Policy';
    $('lastUpdatedDisplay').value = x?.lastUpdated || '-';
    openModal();
  }
  async function load() {
    msg('Loading...');
    $('policyTableBody').innerHTML = '<tr><td colspan="7">Loading...</td></tr>';
    try {
      const j = await request(url('COMPLIANCE_POLICY_LIST'));
      state.items = Array.isArray(j.data) ? j.data : [];
      render(true);
      msg('');
    } catch (e) {
      $('policyTableBody').innerHTML = '<tr><td colspan="7">' + esc(e.message) + '</td></tr>';
      $('policyRecordCount').textContent = 'Showing 0 to 0 of 0 entries';
      renderPager(0, resolvePageSize());
      msg(e.message, 'error');
    }
  }
  async function save(e) {
    e.preventDefault();
    const body = {
      id: $('policyId').value || null,
      policyKey: $('policyKey').value.trim(),
      tabLabel: $('tabLabel').value.trim(),
      title: $('policyTitle').value.trim(),
      lastUpdated: nowStamp(),
      sortOrder: Number($('sortOrder').value || 0),
      status: Number($('policyStatus').value),
      contentHtml: $('contentHtml').value,
    };
    const btn = $('policySubmitBtn');
    const old = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
    msg('');
    try {
      await request(url('COMPLIANCE_POLICY_SAVE'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      closeModal();
      msg('Policy saved successfully.', 'success');
      await load();
    } catch (err) {
      msg(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = old;
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    $('policyForm').addEventListener('submit', save);
    $('refreshPolicyBtn').addEventListener('click', () => load());
    $('newPolicyBtn').addEventListener('click', () => edit(null));
    $('policyTableBody').addEventListener('click', (e) => {
      const b = e.target.closest('[data-edit-id]');
      if (b) edit(state.items.find((x) => String(x.id) === b.dataset.editId));
    });
    document.querySelectorAll('[data-policy-close]').forEach((b) => b.addEventListener('click', closeModal));
    $('policyModal').addEventListener('click', (e) => {
      if (e.target === $('policyModal')) closeModal();
    });
    listen(document, 'keydown', (e) => {
      if (e.key === 'Escape' && $('policyModal')?.classList.contains('show')) closeModal();
    });
    // Per-field Save buttons are hidden; persist translation on blur via the existing DT save handlers.
    $('policyForm').addEventListener(
      'focusout',
      (e) => {
        const input = e.target.closest?.('[data-dt-text]');
        if (!input) return;
        const row = input.closest('.dynamic-text-edit');
        const btn = row?.querySelector('[data-dt-save-text]');
        if (btn) btn.click();
      },
      true
    );
    paginationEl?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-page]');
      if (!b || b.disabled) return;
      const page = Number(b.dataset.page);
      if (!Number.isFinite(page) || page < 1) return;
      state.currentPage = page;
      render(false);
    });
    pageSizeEl?.addEventListener('change', () => render(true));
    let resizeTimer = 0;
    listen(window, 'resize', () => {
      if (!isAutoPageSize()) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => render(false), 120);
    });
    load();
  });
})();
