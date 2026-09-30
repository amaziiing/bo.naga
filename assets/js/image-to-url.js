(function () {
const API_UPLOAD_URL =
    API_CONFIG.BASE_URL +
    API_CONFIG.ENDPOINTS.UPLOAD_IMAGE;

(function () {
  const input = document.getElementById('imageInput');
  const dropZone = document.getElementById('dropZone');
  const uploadBtn = document.getElementById('uploadBtn');
  const clearBtn = document.getElementById('clearBtn');
  const statusBox = document.getElementById('uploadStatus');
  const previewWrap = document.getElementById('previewWrap');
  const preview = document.getElementById('imagePreview');
  const fileNameText = document.getElementById('fileNameText');
  const fileSizeText = document.getElementById('fileSizeText');
  const imageUrl = document.getElementById('imageUrl');
  const cssCode = document.getElementById('cssCode');
  const copyUrlBtn = document.getElementById('copyUrlBtn');
  const copyCssBtn = document.getElementById('copyCssBtn');
  let selectedFile = null;

  if (!input || !dropZone) return;

  function setStatus(message, type) {
    statusBox.textContent = message || '';
    statusBox.className = 'upload-status' + (type ? ' ' + type : '');
  }

  function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  function setResult(url) {
    imageUrl.value = url || '';
    cssCode.value = url ? "background-image: url('" + url + "');" : '';
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      setStatus('Please choose image file only.', 'error');
      return;
    }
    selectedFile = file;
    setStatus('Ready to upload.', 'success');
    fileNameText.textContent = file.name;
    fileSizeText.textContent = formatSize(file.size);
    preview.src = URL.createObjectURL(file);
    previewWrap.hidden = false;
    setResult('');
  }

  input.addEventListener('change', () => handleFile(input.files[0]));

  ['dragenter', 'dragover'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });
  });
  dropZone.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));

  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });

  uploadBtn.addEventListener('click', async () => {
    if (!selectedFile) {
      setStatus('Please select image first.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedFile);

    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Uploading...';
    setStatus('Uploading image, please wait...', '');

    try {
      const res = await fetch(API_UPLOAD_URL, {
        method: 'POST',
        body: formData
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Upload failed');

      // Supports both {data:{url:"..."}} and {url:"..."}
      const url = json?.data?.url || json?.url || json?.data?.imageUrl || json?.imageUrl;
      if (!url) throw new Error('Upload success but API did not return url');

      setResult(url);
      setStatus('Upload successful. URL is ready to copy.', 'success');
    } catch (err) {
      setStatus(err.message || 'Upload failed. Please check API URL/CORS.', 'error');
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = '<i class="bi bi-upload"></i> Upload Image';
    }
  });

  clearBtn.addEventListener('click', () => {
    selectedFile = null;
    input.value = '';
    preview.src = '';
    previewWrap.hidden = true;
    setResult('');
    setStatus('', '');
  });

  async function copyText(text, btn) {
    if (!text) {
      setStatus('Nothing to copy yet.', 'error');
      return;
    }
    await navigator.clipboard.writeText(text);
    const oldHtml = btn.innerHTML;
    btn.classList.add('is-copied');
    btn.innerHTML = '<i class="bi bi-check2" aria-hidden="true"></i> COPIED';
    setTimeout(() => {
      btn.classList.remove('is-copied');
      btn.innerHTML = oldHtml;
    }, 1200);
  }

  copyUrlBtn.addEventListener('click', () => copyText(imageUrl.value, copyUrlBtn));
  copyCssBtn.addEventListener('click', () => copyText(cssCode.value, copyCssBtn));
})();
})();
