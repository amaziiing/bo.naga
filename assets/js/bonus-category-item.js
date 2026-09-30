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

function statusPill(value) {
  const active = Number(value) === 1;
  return `<span class="slider-pill ${active ? 'active' : 'inactive'}"><i class="bi ${active ? 'bi-check-circle' : 'bi-pause-circle'}"></i>${active ? 'Active' : 'Inactive'}</span>`;
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

const BONUS_CATEGORY_ITEM_API = {
  titleList: adminApi('BONUS_CATEGORY_TITLE_LIST'),
  list: adminApi('BONUS_CATEGORY_ITEM_LIST'),
  create: adminApi('BONUS_CATEGORY_ITEM_CREATE'),
  update: adminApi('BONUS_CATEGORY_ITEM_UPDATE'),
  delete: adminApi('BONUS_CATEGORY_ITEM_DELETE')
};

(function () {
  const form = document.getElementById('bonusItemForm');
  if (!form) return;

  const formTitle = document.getElementById('bonusItemFormTitle');
  const id = document.getElementById('bonusItemId');
  const titleId = document.getElementById('bonusItemTitleId');
  const name = document.getElementById('bonusItemName');
  const linkUrl = document.getElementById('bonusItemLinkUrl');
  const sortOrder = document.getElementById('bonusItemSortOrder');
  const desktopColumns = document.getElementById('bonusItemDesktopColumns');
  const mobileColumns = document.getElementById('bonusItemMobileColumns');
  const desktopSpan = document.getElementById('bonusItemDesktopSpan');
  const mobileSpan = document.getElementById('bonusItemMobileSpan');
  const singleLeft = document.getElementById('bonusItemSingleLeft');
  const classPreview = document.getElementById('bonusItemClassPreview');
  const status = document.getElementById('bonusItemStatus');
  const imageInput = document.getElementById('bonusItemImage');
  const dropZone = document.getElementById('bonusItemDropZone');
  const preview = document.getElementById('bonusItemPreview');
  const placeholder = document.getElementById('bonusItemUploadPlaceholder');
  const currentImage = document.getElementById('bonusItemCurrentImage');
  const saveBtn = document.getElementById('saveBonusItemBtn');
  const resetBtn = document.getElementById('resetBonusItemBtn');
  const refreshBtn = document.getElementById('refreshBonusItemBtn');
  const statusBox = document.getElementById('bonusItemStatusBox');
  const list = document.getElementById('bonusItemList');
  const empty = document.getElementById('bonusItemEmpty');
  const filterTitle = document.getElementById('bonusItemFilterTitle');

  let selectedFile = null;
  let currentItems = [];
  let titleOptions = [];
  let picker;
  const initialTitleId = new URLSearchParams(window.location.search).get("titleId") || "";

  function setStatus(message, type) {
    statusBox.textContent = message || '';
    statusBox.className = 'upload-status' + (type ? ' ' + type : '');
  }

  function setBusy(isBusy) {
    saveBtn.disabled = isBusy;
    refreshBtn.disabled = isBusy;
    saveBtn.innerHTML = isBusy
      ? '<i class="bi bi-hourglass-split"></i> Saving...'
      : '<i class="bi bi-save"></i> Save Item';
  }

  function titleName(idValue) {
    const found = titleOptions.find(x => String(x.id) === String(idValue));
    return found ? found.name : '';
  }

  function buildGridClass() {
    return 'bonus-grid d-cols-' + (desktopColumns.value || '2') + ' m-cols-' + (mobileColumns.value || '1') + (singleLeft.checked ? ' single-left' : '');
  }

  function buildCardClass() {
    let cardClass = 'bonus-card';
    if (Number(desktopSpan.value) > 1) cardClass += ' d-span-' + desktopSpan.value;
    if (Number(mobileSpan.value) > 1) cardClass += ' m-span-' + mobileSpan.value;
    return cardClass;
  }

  function updateClassPreview() {
    if (!classPreview) return;
    classPreview.innerHTML = `Grid: <code>${escapeHtml(buildGridClass())}</code><br />Card: <code>${escapeHtml(buildCardClass())}</code>`;
  }

  function renderTitleOptions() {
    const titleHtml = titleOptions.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('');

    titleId.innerHTML = `<option value="">Select bonus category title</option>${titleHtml}`;
    filterTitle.innerHTML = `<option value="">All Titles</option>${titleHtml}`;
  }

  async function loadTitles() {
    const json = await fetchJson(BONUS_CATEGORY_ITEM_API.titleList + '?page=1&size=300');
    titleOptions = Array.isArray(json.data) ? json.data : [];
    renderTitleOptions();
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
    titleId.value = filterTitle.value || '';
    name.value = '';
    linkUrl.value = '';
    sortOrder.value = '0';
    desktopColumns.value = '2';
    mobileColumns.value = '1';
    desktopSpan.value = '1';
    mobileSpan.value = '1';
    singleLeft.checked = false;
    status.value = '1';
    updateClassPreview();
    selectedFile = null;
    picker && picker.clearPreview();
    currentImage.hidden = true;
    formTitle.textContent = 'Create Bonus Category Item';
    setStatus('', '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function editItem(item) {
    id.value = item.id || '';
    titleId.value = item.bonusCategoryTitleId || '';
    name.value = item.name || '';
    linkUrl.value = item.linkUrl || '';
    sortOrder.value = item.sortOrder ?? 0;
    desktopColumns.value = String(item.desktopColumns ?? 2);
    mobileColumns.value = String(item.mobileColumns ?? 1);
    desktopSpan.value = String(item.desktopSpan ?? 1);
    mobileSpan.value = String(item.mobileSpan ?? 1);
    singleLeft.checked = Number(item.singleLeft ?? 0) === 1;
    status.value = String(item.status ?? 1);
    updateClassPreview();
    selectedFile = null;
    imageInput.value = '';

    const previewUrl = resolveImageUrl(item.imageUrl, item.image, '');
    if (previewUrl) picker.showPreview(previewUrl);
    else picker.clearPreview();

    currentImage.hidden = false;
    formTitle.textContent = 'Edit Bonus Item #' + item.id;
    setStatus('Editing item. Choose new image only if you want to replace it.', 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderList(items) {
    currentItems = Array.isArray(items) ? items : [];
    list.innerHTML = '';
    empty.hidden = currentItems.length > 0;

    const grouped = currentItems.reduce((acc, item) => {
      const groupName = item.bonusCategoryTitleName || titleName(item.bonusCategoryTitleId) || 'Untitled Title';
      acc[groupName] = acc[groupName] || [];
      acc[groupName].push(item);
      return acc;
    }, {});

    Object.keys(grouped).forEach(groupName => {
      const group = document.createElement('div');
      group.className = 'bonus-item-group';
      group.innerHTML = `<div class="bonus-item-group-title"><i class="bi bi-award"></i><b>${escapeHtml(groupName)}</b><span>${grouped[groupName].length} item(s)</span></div>`;
      list.appendChild(group);

      grouped[groupName].forEach(item => {
        const card = document.createElement('div');
        card.className = 'manage-card bonus-item-card';
        card.innerHTML = `
          <div class="manage-thumb bonus-item-thumb">
            ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name || 'Bonus item')}">` : '<i class="bi bi-image text-secondary fs-1"></i>'}
          </div>
          <div class="manage-card-body">
            <div class="slider-card-title">
              <b>${escapeHtml(item.name || 'Bonus Item #' + item.id)}</b>
              ${statusPill(item.status)}
            </div>
            <div class="slider-meta">
              <span><i class="bi bi-hash me-1"></i>ID: ${escapeHtml(item.id)}</span>
              <span><i class="bi bi-sort-numeric-down me-1"></i>Sort: ${escapeHtml(item.sortOrder ?? 0)}</span>
              <span><i class="bi bi-grid-3x3-gap me-1"></i>${escapeHtml(item.gridClass || ('bonus-grid d-cols-' + (item.desktopColumns ?? 2) + ' m-cols-' + (item.mobileColumns ?? 1)))}</span>
              <span><i class="bi bi-aspect-ratio me-1"></i>${escapeHtml(item.cardClass || 'bonus-card')}</span>
              <span><i class="bi bi-file-image me-1"></i>${escapeHtml(item.image || '-')}</span>
              ${item.linkUrl ? `<span><i class="bi bi-link-45deg me-1"></i>${escapeHtml(item.linkUrl)}</span>` : ''}
            </div>
          </div>
          <div class="slider-card-actions">
            <button class="clean-btn primary" type="button" data-edit-id="${escapeHtml(item.id)}"><i class="bi bi-pencil-square"></i> Edit</button>
            <button class="clean-btn danger" type="button" data-delete-id="${escapeHtml(item.id)}"><i class="bi bi-trash"></i> Delete</button>
          </div>
        `;
        list.appendChild(card);
      });
    });
  }

  async function loadItems() {
    list.innerHTML = '<div class="slider-empty"><i class="bi bi-hourglass-split"></i><b>Loading bonus items...</b></div>';
    empty.hidden = true;

    try {
      const selectedTitle = filterTitle.value;
      const url = selectedTitle
        ? BONUS_CATEGORY_ITEM_API.list + '?bonusCategoryTitleId=' + encodeURIComponent(selectedTitle)
        : BONUS_CATEGORY_ITEM_API.list;

      const json = await fetchJson(url);
      renderList(json.data || []);
    } catch (err) {
      list.innerHTML = '';
      empty.hidden = false;
      empty.innerHTML = `<i class="bi bi-exclamation-triangle"></i><b>Unable to load bonus items</b><small>${escapeHtml(err.message || 'Please check API URL / CORS.')}</small>`;
    }
  }

  async function saveItem(e) {
    e.preventDefault();
    const isUpdate = !!id.value;

    if (!titleId.value) {
      setStatus('Please select bonus category title.', 'error');
      titleId.focus();
      return;
    }

    if (!isUpdate && !selectedFile) {
      setStatus('Please choose item image.', 'error');
      return;
    }

    const fd = new FormData();
    fd.append('bonusCategoryTitleId', titleId.value);
    fd.append('name', name.value.trim());
    fd.append('linkUrl', linkUrl.value.trim());
    fd.append('sortOrder', sortOrder.value || '0');
    fd.append('desktopColumns', desktopColumns.value || '2');
    fd.append('mobileColumns', mobileColumns.value || '1');
    fd.append('desktopSpan', desktopSpan.value || '1');
    fd.append('mobileSpan', mobileSpan.value || '1');
    fd.append('singleLeft', singleLeft.checked ? '1' : '0');
    fd.append('status', status.value || '1');
    if (selectedFile) fd.append('image', selectedFile);

    const url = isUpdate
      ? BONUS_CATEGORY_ITEM_API.update + '/' + encodeURIComponent(id.value)
      : BONUS_CATEGORY_ITEM_API.create;

    setBusy(true);
    setStatus(isUpdate ? 'Updating bonus item...' : 'Creating bonus item...', '');

    try {
      const json = await fetchJson(url, { method: 'POST', body: fd });
      setStatus(json.message || 'Bonus item saved successfully.', 'success');
      resetForm();
      await loadItems();
    } catch (err) {
      setStatus(err.message || 'Save failed. Please check API URL / CORS.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(itemId) {
    if (!(await BO_DIALOG.confirm('Delete this bonus item?', {title:'Delete Bonus Item', confirmText:'Delete'}))) return;

    setStatus('Deleting bonus item...', '');

    try {
      const json = await fetchJson(BONUS_CATEGORY_ITEM_API.delete, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(itemId) })
      });
      setStatus(json.message || 'Bonus item deleted.', 'success');
      if (id.value === String(itemId)) resetForm();
      await loadItems();
    } catch (err) {
      setStatus(err.message || 'Delete failed.', 'error');
    }
  }
  picker = setupImagePicker(imageInput, dropZone, preview, placeholder, (file, showPreview) => {
    selectedFile = file;
    showPreview(URL.createObjectURL(file));
    setStatus('Image ready. Click Save to upload.', 'success');
  }, setStatus);

  form.addEventListener('submit', saveItem);
  resetBtn.addEventListener('click', resetForm);
  refreshBtn.addEventListener('click', loadItems);
  filterTitle.addEventListener('change', () => {
    if (!id.value) titleId.value = filterTitle.value || '';
    loadItems();
  });

  [desktopColumns, mobileColumns, desktopSpan, mobileSpan, singleLeft].forEach(el => {
    if (el) el.addEventListener('change', updateClassPreview);
  });
  updateClassPreview();

  list.addEventListener('click', e => {
    const editBtn = e.target.closest('[data-edit-id]');
    const deleteBtn = e.target.closest('[data-delete-id]');

    if (editBtn) {
      const item = currentItems.find(x => String(x.id) === String(editBtn.dataset.editId));
      if (item) editItem(item);
    }

    if (deleteBtn) {
      deleteItem(deleteBtn.dataset.deleteId);
    }
  });

  (async function init() {
    try {
      await loadTitles();
      if (initialTitleId) {
        titleId.value = initialTitleId;
        filterTitle.value = initialTitleId;
      }
    } catch (err) {
      setStatus('Unable to load title list. Create bonus category title first.', 'error');
      titleId.innerHTML = '<option value="">No title found</option>';
      filterTitle.innerHTML = '<option value="">All Titles</option>';
    }

    await loadItems();
  })();
})();
})();
