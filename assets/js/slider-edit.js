const SLIDER_API_EDIT = {
  list: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.SLIDER_LIST,
  create: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.SLIDER_CREATE,
  update: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.SLIDER_UPDATE
};

(function () {
  const $ = id => document.getElementById(id);
  const form = $('sliderForm');
  if (!form) return;

  const pageTitle = $('bannerEditPageTitle');
  const footerTitle = $('bannerFooterTitle');
  const editNote = $('bannerEditNote');
  const readyPill = $('bannerReadyPill');
  const sliderId = $('sliderId');
  const title = $('sliderTitle');
  const titleZh = $('sliderTitleZh');
  const linkUrl = $('sliderLinkUrl');
  const sortOrder = $('sliderSortOrder');
  const status = $('sliderStatus');
  const imageInput = $('sliderImage');
  const imageInputZh = $('sliderImageZh');
  const dropZone = $('sliderDropZone');
  const dropZoneZh = $('sliderDropZoneZh');
  const preview = $('sliderPreview');
  const previewZh = $('sliderPreviewZh');
  const uploadPlaceholder = $('sliderUploadPlaceholder');
  const uploadPlaceholderZh = $('sliderUploadPlaceholderZh');
  const currentImage = $('sliderCurrentImage');
  const currentImageZh = $('sliderCurrentImageZh');
  const statusBox = $('sliderStatusBox');
  const resetBtn = $('resetSliderBtn');
  const saveBtn = $('saveSliderBtn');
  const statusSeg = document.querySelector('.banner-status-seg');

  let selectedFile = null;
  let selectedFileZh = null;
  let loadedItem = null;
  let editMode = false;

  function qs() {
    try { return new URLSearchParams(location.search); }
    catch (_) { return new URLSearchParams(); }
  }
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
  function itemImage(item) {
    return resolveImageUrl(item && item.imageUrl, item && item.image, '');
  }
  function setStatus(message, type) {
    statusBox.textContent = message || '';
    statusBox.className = 'upload-status' + (type ? ' ' + type : '');
  }
  function setBusy(v) {
    saveBtn.disabled = v;
    resetBtn.disabled = v;
    saveBtn.innerHTML = v
      ? '<i class="bi bi-hourglass-split" aria-hidden="true"></i> Saving...'
      : '<i class="bi bi-check-lg" aria-hidden="true"></i> Save Banner';
  }
  function setPreview(img, placeholder, src) {
    img.src = src || '';
    img.hidden = !src;
    placeholder.hidden = !!src;
  }
  function clearPreview() {
    selectedFile = null;
    imageInput.value = '';
    setPreview(preview, uploadPlaceholder, '');
  }
  function clearPreviewZh() {
    selectedFileZh = null;
    if (imageInputZh) imageInputZh.value = '';
    if (previewZh && uploadPlaceholderZh) setPreview(previewZh, uploadPlaceholderZh, '');
  }
  function syncStatusSeg(value) {
    const v = String(value ?? '1');
    status.value = v;
    if (!statusSeg) return;
    statusSeg.querySelectorAll('[data-status]').forEach(btn => {
      btn.classList.toggle('is-active', String(btn.dataset.status) === v);
    });
  }
  function refreshReady() {
    const hasTitle = !!(title.value || '').trim();
    const hasImage = editMode ? true : !!(selectedFile || (preview && !preview.hidden && preview.src));
    const ready = hasTitle && hasImage;
    if (readyPill) {
      readyPill.textContent = ready ? 'Ready' : (editMode ? 'Editing' : 'Draft');
      readyPill.classList.toggle('is-ready', ready);
    }
  }
  function handleFile(file, zh) {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      setStatus('Please choose image file only.', 'error');
      return;
    }
    if (zh) {
      selectedFileZh = file;
      setPreview(previewZh, uploadPlaceholderZh, URL.createObjectURL(file));
    } else {
      selectedFile = file;
      setPreview(preview, uploadPlaceholder, URL.createObjectURL(file));
    }
    setStatus('Image ready. Click Save Banner to upload.', 'success');
    refreshReady();
  }

  function setMode(isEdit) {
    editMode = !!isEdit;
    const label = editMode ? 'Edit Banner' : 'Create Banner';
    document.title = label;
    if (pageTitle) pageTitle.textContent = label;
    if (footerTitle) footerTitle.textContent = label;
    if (editNote) {
      editNote.textContent = editMode
        ? 'Update hero artwork and display details.'
        : 'Upload a hero image and set display details.';
    }
    refreshReady();
  }

  function resetForm() {
    if (editMode && loadedItem) {
      fillForm(loadedItem);
      selectedFile = null;
      selectedFileZh = null;
      imageInput.value = '';
      if (imageInputZh) imageInputZh.value = '';
      setStatus('Reset to saved values.', 'success');
      refreshReady();
      return;
    }
    sliderId.value = '';
    title.value = '';
    if (titleZh) titleZh.value = '';
    linkUrl.value = '';
    sortOrder.value = '0';
    syncStatusSeg('1');
    clearPreview();
    clearPreviewZh();
    currentImage.hidden = true;
    if (currentImageZh) currentImageZh.hidden = true;
    setStatus('', '');
    refreshReady();
  }

  function fillForm(item) {
    loadedItem = item;
    sliderId.value = item.id || '';
    title.value = item.title || '';
    if (titleZh) titleZh.value = item.titleZh || item.chineseTitle || '';
    linkUrl.value = item.linkUrl || '';
    sortOrder.value = item.sortOrder ?? 0;
    syncStatusSeg(String(item.status ?? 1));
    selectedFile = null;
    selectedFileZh = null;
    imageInput.value = '';
    if (imageInputZh) imageInputZh.value = '';
    setPreview(preview, uploadPlaceholder, itemImage(item));
    if (previewZh) {
      setPreview(
        previewZh,
        uploadPlaceholderZh,
        resolveImageUrl(item.imageUrlZh || item.chineseImageUrl, item.imageZh || item.chineseImage, itemImage(item))
      );
    }
    currentImage.hidden = false;
    if (currentImageZh) currentImageZh.hidden = false;
    refreshReady();
  }

  async function loadBanner(id) {
    setStatus('Loading banner...', '');
    try {
      const res = await fetch(SLIDER_API_EDIT.list);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Failed to load banner');
      const rows = Array.isArray(json.data) ? json.data : [];
      const item = rows.find(x => String(x.id) === String(id));
      if (!item) throw new Error('Banner not found.');
      fillForm(item);
      setMode(true);
      setStatus('', '');
    } catch (err) {
      setStatus(err.message || 'Unable to load banner.', 'error');
      setMode(false);
    }
  }

  async function saveSlider(e) {
    e.preventDefault();
    const isUpdate = !!sliderId.value;
    if (!title.value.trim()) {
      setStatus('Please enter title.', 'error');
      title.focus();
      return;
    }
    if (!isUpdate && !selectedFile) {
      setStatus('Please choose banner image.', 'error');
      return;
    }
    const fd = new FormData();
    if (isUpdate) fd.append('id', sliderId.value);
    fd.append('title', title.value.trim());
    if (titleZh) fd.append('titleZh', titleZh.value.trim());
    fd.append('linkUrl', linkUrl.value.trim());
    fd.append('sortOrder', sortOrder.value || '0');
    fd.append('status', status.value || '1');
    if (selectedFile) fd.append('image', selectedFile);
    if (selectedFileZh) fd.append('imageZh', selectedFileZh);
    setBusy(true);
    setStatus(isUpdate ? 'Updating banner...' : 'Creating banner...', '');
    try {
      const res = await fetch(isUpdate ? SLIDER_API_EDIT.update : SLIDER_API_EDIT.create, { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Save failed');
      setStatus(json.message || 'Banner saved successfully.', 'success');
      window.setTimeout(() => { location.href = 'slider.html'; }, 450);
    } catch (err) {
      setStatus(err.message || 'Save failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  imageInput.addEventListener('change', () => handleFile(imageInput.files[0], false));
  if (imageInputZh) imageInputZh.addEventListener('change', () => handleFile(imageInputZh.files[0], true));
  [[dropZone, false], [dropZoneZh, true]].forEach(([zone, zh]) => {
    if (!zone) return;
    ['dragenter', 'dragover'].forEach(evt => zone.addEventListener(evt, e => {
      e.preventDefault();
      zone.classList.add('dragover');
    }));
    ['dragleave', 'drop'].forEach(evt => zone.addEventListener(evt, e => {
      e.preventDefault();
      zone.classList.remove('dragover');
    }));
    zone.addEventListener('drop', e => handleFile(e.dataTransfer.files[0], zh));
  });

  statusSeg?.addEventListener('click', e => {
    const btn = e.target.closest('[data-status]');
    if (!btn) return;
    syncStatusSeg(btn.dataset.status);
    refreshReady();
  });
  title.addEventListener('input', refreshReady);
  if (titleZh) titleZh.addEventListener('input', refreshReady);

  form.addEventListener('submit', saveSlider);
  resetBtn.addEventListener('click', resetForm);

  syncStatusSeg(status.value || '1');
  const id = qs().get('id');
  if (id) loadBanner(id);
  else setMode(false);
})();
