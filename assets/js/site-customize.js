(function () {
const NAGA_API_CONFIG = (window.API_CONFIG || (typeof API_CONFIG !== 'undefined' ? API_CONFIG : {}));
const API_CUSTOMIZE_MAIN_LAYOUT_URL =
    (NAGA_API_CONFIG.BASE_URL || 'https://bo.corepayx.com/api') +
    ((NAGA_API_CONFIG.ENDPOINTS && NAGA_API_CONFIG.ENDPOINTS.CUSTOMIZE_MAIN_LAYOUT) || '/customize/main-layout');

(function () {
    const ACTIVE_BRAND_ID = (window.BO_BRAND && BO_BRAND.activeId ? BO_BRAND.activeId() : 1);
    const STORAGE_KEY = 'naga_main_layout_customize_files:' + ACTIVE_BRAND_ID;
    const LAYOUT = window.SITE_CUSTOMIZE_LAYOUT;
    const mount = document.querySelector('.brand-assets-card');
    const statusBox = document.getElementById('customizeStatus');
    const saveBtn = document.getElementById('saveCustomizeBtn');
    const resetLayoutBtn = document.getElementById('resetAssetLayoutBtn');
    const assetsPanel = document.getElementById('main-layout');

    function cleanCustomBaseUrl(value) {
        const fallback = 'https://corepayx.com/assets/custom/images';
        const text = String(value || '').trim();
        if (!text || text === 'undefined' || text === 'null') return fallback;
        return text.replace(/\/+$/, '');
    }

    const CUSTOM_ASSET_BASE_URL = cleanCustomBaseUrl(NAGA_API_CONFIG.CUSTOM_ASSET_BASE_URL);

    function assetUrl(fileName) {
        if (ACTIVE_BRAND_ID !== 1) return '';
        const cleanFileName = String(fileName || '').replace(/^\/+/, '');
        return CUSTOM_ASSET_BASE_URL + '/' + cleanFileName + '?v=1.0.0';
    }

    function normalizeUrl(value) {
        if (!value) return '';

        let url = String(value).trim();

        // Old saved/local values may point to BO domain or a relative ../naga path.
        // Force all custom image previews to the real frontend asset domain.
        url = url.replace(/^https?:\/\/bo\.corepayx\.com\/assets\/custom\/images/i, CUSTOM_ASSET_BASE_URL);
        url = url.replace(/^https?:\/\/www\.corepayx\.com\/assets\/custom\/images/i, CUSTOM_ASSET_BASE_URL);
        url = url.replace(/^https?:\/\/corepayx\.com\/assets\/custom\/images/i, CUSTOM_ASSET_BASE_URL);
        url = url.replace(/^\.\.\/naga\/assets\/custom\/images/i, CUSTOM_ASSET_BASE_URL);
        url = url.replace(/^\/assets\/custom\/images/i, CUSTOM_ASSET_BASE_URL);
        url = url.replace(/^assets\/custom\/images/i, CUSTOM_ASSET_BASE_URL);
        if (/^\/assets\/custom\/brands\//i.test(url)) url = 'https://titanx7.com' + url;
        if (/^assets\/custom\/brands\//i.test(url)) url = 'https://titanx7.com/' + url;

        return url.replace(/([^:])\/\/+/g, '$1/');
    }

    let assets = [];
    const fields = {};
    const selectedFiles = {};
    const fieldToFileKey = {};
    let defaultSettings = { version: '1.0.0' };
    let latestSettings = { version: '1.0.0' };
    let uploadBound = false;
    let apiLoaded = false;

    function rebuildAssetIndex() {
        assets = LAYOUT ? LAYOUT.flattenAssets(assetUrl) : [];
        Object.keys(fields).forEach((k) => delete fields[k]);
        Object.keys(fieldToFileKey).forEach((k) => delete fieldToFileKey[k]);
        defaultSettings = { version: latestSettings.version || '1.0.0' };
        assets.forEach((asset) => {
            fields[asset.field] = document.getElementById(asset.field);
            if (!(asset.fileKey in selectedFiles)) selectedFiles[asset.fileKey] = null;
            fieldToFileKey[asset.field] = asset.fileKey;
            defaultSettings[asset.field] = normalizeUrl(asset.fallback);
        });
    }

    function setStatus(message, type) {
        if (!statusBox) return;
        statusBox.textContent = message || '';
        statusBox.className = 'custom-status' + (type ? ' ' + type : '');
    }

    function updateAssetText(key, text, selected) {
        const label = document.querySelector('[data-asset-text="' + key + '"]');
        if (!label) return;
        label.textContent = text || 'Current image loaded';
        label.classList.toggle('selected', !!selected);
    }

    function updatePreview(key, url) {
        const img = document.querySelector('[data-preview="' + key + '"]');
        if (!img) return;
        const wrap = img.closest('.asset-preview');
        const cleanUrl = (url || '').trim();

        img.onerror = null;
        img.onload = null;
        wrap.classList.remove('has-image', 'preview-error');

        if (!cleanUrl) {
            img.removeAttribute('src');
            return;
        }

        img.onload = function () {
            wrap.classList.add('has-image');
            wrap.classList.remove('preview-error');
        };

        img.onerror = function () {
            img.removeAttribute('src');
            wrap.classList.remove('has-image');
            wrap.classList.add('preview-error');
        };

        img.src = cleanUrl;
    }

    function setSettings(settings) {
        const data = Object.assign({}, defaultSettings, settings || {});
        latestSettings = data;
        assets.forEach((asset) => {
            const input = fields[asset.field];
            if (!input) return;
            input.value = normalizeUrl(data[asset.field] || '');
            updateAssetText(asset.field, data[asset.field] ? 'Current ' + asset.label + ' uploaded' : 'No ' + asset.label + ' uploaded', false);
            updatePreview(asset.field, input.value);
        });
    }

    function snapshotSettings() {
        const data = Object.assign({}, latestSettings);
        assets.forEach((asset) => {
            const input = fields[asset.field];
            if (input) data[asset.field] = input.value;
        });
        return data;
    }

    function bindUploadRows() {
        document.querySelectorAll('.asset-upload-row').forEach((row) => {
            if (row.dataset.bound === '1') return;
            row.dataset.bound = '1';
            const fieldKey = row.dataset.field;
            const fileKey = fieldToFileKey[fieldKey];
            const fileInput = row.querySelector('.asset-file');
            const chooseBtn = row.querySelector('.choose-btn');
            const clearBtn = row.querySelector('.upload-asset-btn');

            if (!fieldKey || !fileKey || !fileInput || !chooseBtn || !clearBtn) return;

            chooseBtn.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', () => {
                const file = fileInput.files[0] || null;
                if (!file) return;

                if (!isAllowedByInputAccept(file, fileInput.accept)) {
                    setStatus('This file type is not allowed. Please choose JPG, JPEG, PNG, WEBP or GIF only.', 'error');
                    fileInput.value = '';
                    selectedFiles[fileKey] = null;
                    return;
                }

                selectedFiles[fileKey] = file;
                updatePreview(fieldKey, URL.createObjectURL(file));
                updateAssetText(fieldKey, file.name + ' selected', true);
                setSaveButtonDefault();
                setStatus(file.name + ' selected. Click Save to upload.', '');
            });

            clearBtn.addEventListener('click', () => {
                selectedFiles[fileKey] = null;
                fileInput.value = '';
                updatePreview(fieldKey, (fields[fieldKey] && fields[fieldKey].value.trim()) || '');
                updateAssetText(fieldKey, 'Current image loaded', false);
                setSaveButtonDefault();
                setStatus('Selected file cleared.', '');
            });
        });
        uploadBound = true;
    }

    function remountLayout(message) {
        if (!LAYOUT || !mount) return;
        const snap = snapshotSettings();
        LAYOUT.render(mount, ACTIVE_BRAND_ID);
        rebuildAssetIndex();
        if (!fields.logoUrl) return;
        setSettings(snap);
        bindUploadRows();
        LAYOUT.bindArrange(mount, ACTIVE_BRAND_ID, () => remountLayout('Layout updated. Placement saved in this browser.'));
        if (message) setStatus(message, 'success');
    }

    if (LAYOUT && mount) {
        LAYOUT.render(mount, ACTIVE_BRAND_ID);
    }
    rebuildAssetIndex();

    if (!fields.logoUrl) return;

    function saveLocal(settings) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }

    function loadSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            setSettings(Object.keys(saved).length ? saved : defaultSettings);
        } catch (e) {
            setSettings(defaultSettings);
        }
    }

    function getFirstValue(source, keys) {
        for (const key of keys) {
            if (source && source[key]) return source[key];
        }
        return '';
    }

    function applyApiResponse(json) {
        const data = json && json.data ? json.data : json || {};
        const version = data.version || defaultSettings.version;
        const responseAssets = data.assets || data;
        const next = { version };

        assets.forEach((asset) => {
            const keys = asset.apiKeys || [asset.field, asset.fileKey];
            const fallback = String(defaultSettings[asset.field] || '').replace('1.0.0', version);
            next[asset.field] = normalizeUrl(getFirstValue(responseAssets, keys) || fallback);
        });

        setSettings(next);
        saveLocal(next);
    }

    function setSaveButtonDefault() {
        if (!saveBtn) return;
        saveBtn.disabled = false;
        saveBtn.classList.remove('success');
        saveBtn.classList.add('primary');
        saveBtn.innerHTML = '<i class="bi bi-save"></i> Save';
    }

    function setSaveButtonSuccess() {
        if (!saveBtn) return;
        saveBtn.disabled = false;
        saveBtn.classList.remove('primary');
        saveBtn.classList.add('success');
        saveBtn.innerHTML = '<i class="bi bi-check-circle-fill"></i> Saved';
    }


    function isAllowedByInputAccept(file, accept) {
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const fileName = (file.name || '').toLowerCase();
        const fileType = (file.type || '').toLowerCase();
        const hasAllowedExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
        const hasAllowedType = allowedTypes.includes(fileType);

        if (!hasAllowedExtension || (fileType && !hasAllowedType)) {
            return false;
        }

        if (!accept || accept.trim() === '') return true;

        const rules = accept.split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
        return rules.some((rule) => {
            if (rule === '*/*') return true;
            if (rule.endsWith('/*')) return fileType.startsWith(rule.slice(0, -1));
            if (rule.startsWith('.')) return fileName.endsWith(rule);
            return fileType === rule;
        });
    }

    async function saveMainLayout() {
        const formData = new FormData();
        let hasFile = false;
        let isSaved = false;

        Object.keys(selectedFiles).forEach((key) => {
            if (selectedFiles[key]) {
                formData.append(key, selectedFiles[key]);
                hasFile = true;
            }
        });

        if (!hasFile) {
            setStatus('Please choose at least one image to upload.', 'error');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.classList.remove('success');
        saveBtn.classList.add('primary');
        saveBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Saving...';

        try {
            const res = await fetch(API_CUSTOMIZE_MAIN_LAYOUT_URL, {
                method: 'POST',
                body: formData
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(json.message || 'Save failed');
            }

            applyApiResponse(json);

            Object.keys(selectedFiles).forEach((key) => {
                selectedFiles[key] = null;
            });
            document.querySelectorAll('.asset-file').forEach((input) => {
                input.value = '';
            });

            isSaved = true;
            setSaveButtonSuccess();
            setStatus('Saved successfully. Main layout images updated.', 'success');
        } catch (err) {
            setStatus(err.message || 'Save failed. Please check Spring Boot API and CORS.', 'error');
        } finally {
            if (!isSaved) {
                setSaveButtonDefault();
            }
        }
    }

    bindUploadRows();
    if (LAYOUT && mount) {
        LAYOUT.bindArrange(mount, ACTIVE_BRAND_ID, () => remountLayout('Layout updated. Placement saved in this browser.'));
    }

    saveBtn.addEventListener('click', saveMainLayout);
    resetLayoutBtn?.addEventListener('click', () => {
        if (!LAYOUT) return;
        LAYOUT.resetPlacement(ACTIVE_BRAND_ID);
        remountLayout('Layout reset to default zones.');
    });

    loadSettings();
    // Always revalidate from the current brand API. Local storage is only a fast
    // first paint and is separated per brand, so TitanX assets cannot leak into
    // a newly selected branding.
    fetch(API_CUSTOMIZE_MAIN_LAYOUT_URL, {cache:'no-cache'})
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Load failed')))
      .then((json) => {
        apiLoaded = true;
        applyApiResponse(json);
      })
      .catch(() => {});

    document.querySelectorAll('.custom-tabs[aria-label="Asset language"] .custom-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
            const locale = btn.dataset.locale;
            if (!locale) return;
            document.querySelectorAll('.custom-tabs[aria-label="Asset language"] .custom-tab').forEach((item) => {
                item.classList.toggle('active', item === btn);
                item.setAttribute('aria-selected', item === btn ? 'true' : 'false');
            });
            if (assetsPanel) assetsPanel.setAttribute('data-assets-locale', locale);
        });
    });
})();


(function () {
    const saveBtn = document.getElementById('saveSectionBtn');
    const reloadBtn = document.getElementById('reloadSectionBtn');
    const htmlEditor = document.getElementById('sectionHtmlEditor');
    const cssEditor = document.getElementById('sectionCssEditor');
    const jsEditor = document.getElementById('sectionJsEditor');
    const statusBox = document.getElementById('sectionCustomizeStatus');
    const currentName = document.getElementById('currentSectionName');
    const currentKey = document.getElementById('currentSectionKey');
    const sectionBtns = document.querySelectorAll('.layout-section-item');
    const codeGrid = document.getElementById('layoutCodeGrid');
    const htmlPane = document.querySelector('[data-code-pane="html"]');
    const cssPane = document.querySelector('[data-code-pane="css"]');
    const jsPane = document.querySelector('[data-code-pane="js"]');

    if (!saveBtn || !htmlEditor || !cssEditor || !jsEditor) return;

    const API_CUSTOMIZE_SECTION_URL = (NAGA_API_CONFIG.BASE_URL || 'https://bo.corepayx.com/api') + ((NAGA_API_CONFIG.ENDPOINTS && NAGA_API_CONFIG.ENDPOINTS.CUSTOMIZE_SECTION) || '/customize/section');

    function brandScopedHeaders(extra) {
        const headers = Object.assign({}, (window.BO_AUTH && BO_AUTH.authHeader ? BO_AUTH.authHeader() : {}), extra || {});
        // Tenant/Brand Owner accounts are permanently scoped to their own brand. Never let a
        // stale bo_active_brand_id from a previous MAIN/ROOT session decide where CSS is saved.
        // Platform accounts may still use the explicitly selected active brand.
        const user = (window.BO_AUTH && BO_AUTH.user ? BO_AUTH.user() : {}) || {};
        const roleType = String(user.roleType || '').toUpperCase();
        const platform = user.rootAdmin === true || Number(user.rootAdmin) === 1 || user.masterAdmin === true || Number(user.masterAdmin) === 1 || roleType === 'ROOT' || roleType === 'MASTER' || roleType === 'MAIN';
        const tenantId = Number(user.brandId || user.adminBrandId || 0);
        const activeId = Number((window.BO_BRAND && BO_BRAND.activeId ? BO_BRAND.activeId() : localStorage.getItem('bo_active_brand_id')) || 1) || 1;
        const id = !platform && tenantId > 0 ? tenantId : activeId;
        headers['X-Brand-Id'] = String(id);
        return headers;
    }
    let activeSection = document.querySelector('.layout-section-item.active')?.dataset.section || 'right-panel';
    /** @type {null | { getHtml: Function, getCss: Function, getJs: Function, setValues: Function, setHtml: Function, setCss: Function }} */
    let cmEditors = null;

    // These are the current Naga site-shell defaults. They are shown in the BO editor
    // when no custom section has been saved yet. CSS and JS intentionally stay empty,
    // so the frontend continues using assets/css/style.css and its existing shell logic.
    const DEFAULT_SECTION_HTML = {
        'frontend-header': `<div data-layout-section="home-header"></div>
<div class="logo-box mobile-style-logo">
  <img class="site-logo" src="assets/custom/images/logo.png" decoding="async" loading="eager" fetchpriority="high" alt="Logo">
</div>
<div class="top-header-actions">
  <div class="top-auth-actions">
    <a class="top-login-btn auth-image-link" href="login.html" aria-label="Login"><img class="header-auth-image header-login-image" src="assets/custom/images/login.png" alt="LOGIN" decoding="async" loading="eager"></a>
    <a class="top-register-btn auth-image-link" href="register.html" aria-label="Register"><img class="header-auth-image header-register-image" src="assets/custom/images/register.png" alt="REGISTER" decoding="async" loading="eager"></a>
  </div>
  <div class="top-member-actions">
    <a class="top-wallet-pill" href="deposit.html"><span data-main-wallet-balance>MYR 0.00</span></a>
    <button type="button" class="top-logout-btn" data-member-logout data-i18n="logout">Logout</button>
  </div>
</div>`,
        'home-mobile-before-category': `<section class="brand-mobile-account-panel" aria-label="Account shortcuts">
  <div class="brand-mobile-account-auth top-auth-actions">
    <a class="brand-mobile-auth-btn auth-image-link" href="login.html" aria-label="Sign In"><img class="header-auth-image header-login-image" src="assets/custom/images/login.png" alt="LOGIN" decoding="async" loading="eager"></a>
    <a class="brand-mobile-auth-btn auth-image-link" href="register.html" aria-label="Register"><img class="header-auth-image header-register-image" src="assets/custom/images/register.png" alt="REGISTER" decoding="async" loading="eager"></a>
  </div>
  <div class="brand-mobile-member top-member-actions">
    <span class="brand-mobile-balance-label">Balance</span>
    <strong data-main-wallet-balance>MYR 0.00</strong>
  </div>
  <div class="brand-mobile-account-actions">
    <a href="deposit.html" class="brand-mobile-account-action"><img src="assets/custom/images/deposit.png" alt="Deposit"><span>Deposit</span></a>
    <a href="withdraw.html" class="brand-mobile-account-action"><img src="assets/custom/images/withdraw.png" alt="Withdraw"><span>Withdraw</span></a>
    <button type="button" class="brand-mobile-account-action" data-refresh-main-wallet><img src="assets/custom/images/refresh.png" alt="Refresh"><span>Refresh</span></button>
  </div>
</section>`,
        'frontend-sidebar': `<div class="mobile-menu-head">
  <div class="mobile-avatar"><i class="fa-solid fa-user"></i></div>
  <div class="mobile-menu-auth">
    <a href="login.html" class="mobile-login-btn auth-image-link" aria-label="Login"><img class="sidebar-auth-image sidebar-login-image" src="assets/custom/images/login.png" alt="LOGIN" decoding="async" loading="eager"></a>
    <a href="register.html" class="mobile-register-btn auth-image-link" aria-label="Register"><img class="sidebar-auth-image sidebar-register-image" src="assets/custom/images/register.png" alt="REGISTER" decoding="async" loading="eager"></a>
  </div>
  <div class="mobile-menu-member">
    <div class="mobile-menu-wallet"><span data-main-wallet-balance>MYR 0.00</span></div>
  </div>
</div>
<div class="mobile-menu-list">
  <a href="index.html"><i class="fa-solid fa-house mobile-menu-icon" aria-hidden="true"></i><span data-i18n="side_home">Home</span><i class="fa-solid fa-chevron-right mobile-menu-arrow" aria-hidden="true"></i></a>
  <a href="downline.html"><i class="fa-solid fa-users mobile-menu-icon" aria-hidden="true"></i><span data-i18n="side_downline">Downline</span><i class="fa-solid fa-chevron-right mobile-menu-arrow" aria-hidden="true"></i></a>
  <a href="vip.html"><i class="fa-solid fa-crown mobile-menu-icon" aria-hidden="true"></i><span data-i18n="side_vip">VIP</span><i class="fa-solid fa-chevron-right mobile-menu-arrow" aria-hidden="true"></i></a>
  <a href="bonus.html"><i class="fa-solid fa-gift mobile-menu-icon" aria-hidden="true"></i><span data-i18n="side_bonus">Bonus</span><i class="fa-solid fa-chevron-right mobile-menu-arrow" aria-hidden="true"></i></a>
  <a href="spin.html"><i class="fa-solid fa-dharmachakra mobile-menu-icon" aria-hidden="true"></i><span data-i18n="side_spin">Spin</span><i class="fa-solid fa-chevron-right mobile-menu-arrow" aria-hidden="true"></i></a>
  <a href="policies.html"><i class="fa-solid fa-shield-halved mobile-menu-icon" aria-hidden="true"></i><span data-i18n="side_compliance_policy">Compliance Policy</span><i class="fa-solid fa-chevron-right mobile-menu-arrow" aria-hidden="true"></i></a>
  <a href="chat.html"><i class="fa-solid fa-headset mobile-menu-icon" aria-hidden="true"></i><span data-i18n="side_live_chat">Live Chat</span><i class="fa-solid fa-chevron-right mobile-menu-arrow" aria-hidden="true"></i></a>
  <button type="button" class="mobile-menu-list-logout" data-member-logout><i class="fa-solid fa-right-from-bracket mobile-menu-icon" aria-hidden="true"></i><span data-i18n="side_logout">Logout</span><i class="fa-solid fa-chevron-right mobile-menu-arrow" aria-hidden="true"></i></button>
</div>
<div class="mobile-menu-lang" id="sideLangBtn"><span>🌐 简体中文</span><span>CN ›</span></div>
<div class="mobile-menu-version"><span data-i18n="side_version">Version:</span> 1.1.0</div>`
    };

    const DEFAULT_SECTION_CSS = {
        'home-mobile-before-category': `/* Mobile only. The frontend slot is hidden on desktop and stays empty for other brands. */
.brand-mobile-account-panel {
  margin: 10px 10px 14px;
  padding: 14px 16px;
  border: 1px solid rgba(151, 117, 255, .35);
  border-radius: 20px;
  background: rgba(13, 13, 18, .94);
  box-shadow: 0 0 18px rgba(116, 82, 220, .18);
}
.brand-mobile-account-auth,
.brand-mobile-member { display: flex; gap: 12px; align-items: center; }
.brand-mobile-account-auth > a { flex: 1; min-width: 0; }
.brand-mobile-account-auth img { display: block; width: 100%; height: 40px; object-fit: contain; }
.brand-mobile-member { justify-content: space-between; min-height: 40px; }
.brand-mobile-balance-label { opacity: .75; }
.brand-mobile-account-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,.08);
}
.brand-mobile-account-action {
  min-width: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font: inherit;
  cursor: pointer;
}
.brand-mobile-account-action img { width: 100%; max-width: 108px; height: 34px; object-fit: contain; }
.brand-mobile-account-action span { font-size: 12px; }
@media (min-width: 768px) {
  .home-mobile-before-category-slot { display: none !important; }
}`
    };

    function upgradeAuthButtonsToImages(sectionKey, html) {
        if (!html || (sectionKey !== 'frontend-header' && sectionKey !== 'frontend-sidebar')) {
            return { html: html || '', upgraded: false };
        }

        let upgradedHtml = html;
        const replacements = sectionKey === 'frontend-header'
            ? [
                {
                    pattern: /<a\b([^>]*\bclass=["'][^"']*\btop-login-btn\b[^"']*["'][^>]*)>[\s\S]*?<\/a>/i,
                    render: (attrs) => `<a${attrs} aria-label="Login"><img class="header-auth-image header-login-image" src="assets/custom/images/login.png" alt="LOGIN" decoding="async" loading="eager"></a>`
                },
                {
                    pattern: /<a\b([^>]*\bclass=["'][^"']*\btop-register-btn\b[^"']*["'][^>]*)>[\s\S]*?<\/a>/i,
                    render: (attrs) => `<a${attrs} aria-label="Register"><img class="header-auth-image header-register-image" src="assets/custom/images/register.png" alt="REGISTER" decoding="async" loading="eager"></a>`
                }
            ]
            : [
                {
                    pattern: /<a\b([^>]*\bclass=["'][^"']*\bmobile-login-btn\b[^"']*["'][^>]*)>[\s\S]*?<\/a>/i,
                    render: (attrs) => `<a${attrs} aria-label="Login"><img class="sidebar-auth-image sidebar-login-image" src="assets/custom/images/login.png" alt="LOGIN" decoding="async" loading="eager"></a>`
                },
                {
                    pattern: /<a\b([^>]*\bclass=["'][^"']*\bmobile-register-btn\b[^"']*["'][^>]*)>[\s\S]*?<\/a>/i,
                    render: (attrs) => `<a${attrs} aria-label="Register"><img class="sidebar-auth-image sidebar-register-image" src="assets/custom/images/register.png" alt="REGISTER" decoding="async" loading="eager"></a>`
                }
            ];

        replacements.forEach(({ pattern, render }) => {
            upgradedHtml = upgradedHtml.replace(pattern, (match, attrs) => {
                let cleanAttrs = attrs
                    .replace(/\saria-label=["'][^"']*["']/ig, '')
                    .replace(/\sauth-image-link\b/ig, '');
                if (/\bclass=["']/.test(cleanAttrs) && !/\bauth-image-link\b/.test(cleanAttrs)) {
                    cleanAttrs = cleanAttrs.replace(/\bclass=(["'])([^"']*)\1/i, (m, quote, classes) => `class=${quote}${classes} auth-image-link${quote}`);
                }
                return render(cleanAttrs);
            });
        });

        return { html: upgradedHtml, upgraded: upgradedHtml !== html };
    }

    function ensureAuthFeedbackMarkup(sectionKey, html) {
        if (!html || (sectionKey !== 'login-page' && sectionKey !== 'register-page')) {
            return html || '';
        }

        let result = html;
        const forms = [
            {
                formId: 'loginForm',
                messageId: 'loginMessage',
                errorId: 'loginError',
                statusId: 'loginStatus',
                label: 'Login message'
            },
            {
                formId: 'registerForm',
                messageId: 'registerMessage',
                errorId: 'registerError',
                statusId: 'registerStatus',
                label: 'Register message'
            }
        ];

        forms.forEach((item) => {
            const formPattern = new RegExp(`(<form\\b[^>]*\\bid=[\"']${item.formId}[\"'][^>]*>)([\\s\\S]*?)(</form>)`, 'i');
            const match = result.match(formPattern);
            if (!match) return;

            let body = match[2];
            const requiredIds = [item.messageId, item.errorId, item.statusId];
            const missing = requiredIds.filter((id) => !new RegExp(`\\bid=[\"']${id}[\"']`, 'i').test(body));
            if (!missing.length) return;

            const feedback = missing.map((id) => {
                const extraClass = id.endsWith('Error') ? ' auth-error-message' : '';
                return '\n      <div id="' + id + '" class="auth-form-message' + extraClass + '" role="alert" aria-live="polite" aria-label="' + item.label + '"></div>';
            }).join('');

            body += feedback + '\n    ';
            result = result.replace(formPattern, match[1] + body + match[3]);
        });

        return result;
    }

    function ensureAuthFeedbackCss(sectionKey, css) {
        if (sectionKey !== 'login-page' && sectionKey !== 'register-page') return css || '';
        const current = css || '';
        if (current.includes('/* auth feedback compatibility */')) return current;
        return current + `

/* auth feedback compatibility */
.auth-form-message:empty { display: none; }
.auth-form-message { margin-top: 10px; font-size: 13px; line-height: 1.4; }
.auth-error-message, .auth-form-message.error { color: #dc2626; }
.auth-form-message.success { color: #16a34a; }
`;
    }

    function withSectionDefaults(sectionKey, data) {
        const normalized = {
            html: data?.html || '',
            css: data?.css || '',
            js: data?.js || ''
        };
        if (sectionKey === 'animation-custom-effects' && !normalized.css.trim() && !normalized.js.trim()) {
            normalized.css = `/* Example custom effect.
   1) Rename ROBOT_HOVER here and in Animation Effect.
   2) --naga-custom-animation lets the managed engine override existing category animations safely. */
.naga-custom-effect-robot_hover {
  --naga-custom-animation: titanRobotHover 2.2s ease-in-out infinite;
}

@keyframes titanRobotHover {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -7px, 0); }
}`;
            normalized.js = `/* Optional. CSS-only effects do not need JS.
   Register only when your effect needs setup/cleanup or an explicit animation value. */
// window.NAGA_ANIMATION_EFFECTS.register('ROBOT_HOVER', {
//   className: 'naga-custom-effect-robot_hover',
//   animation: 'titanRobotHover 2.2s ease-in-out infinite'
// });`;
            normalized.usingAnimationTemplate = true;
        }
        if (DEFAULT_SECTION_HTML[sectionKey] && !normalized.html.trim()) {
            normalized.html = DEFAULT_SECTION_HTML[sectionKey];
            normalized.usingDefaultHtml = true;
            if (DEFAULT_SECTION_CSS[sectionKey] && !normalized.css.trim()) {
                normalized.css = DEFAULT_SECTION_CSS[sectionKey];
                normalized.usingDefaultCss = true;
            }
            return normalized;
        }

        const upgraded = upgradeAuthButtonsToImages(sectionKey, normalized.html);
        normalized.html = ensureAuthFeedbackMarkup(sectionKey, upgraded.html);
        normalized.css = ensureAuthFeedbackCss(sectionKey, normalized.css);
        normalized.upgradedAuthImages = upgraded.upgraded;
        return normalized;
    }

    function setStatus(message, type) {
        if (!statusBox) return;
        statusBox.textContent = message || '';
        statusBox.className = 'custom-status' + (type ? ' ' + type : '');
    }

    function updateEditorMode() {
        const isCssStyling = activeSection === 'home';
        const isAnimationCustom = activeSection === 'animation-custom-effects';

        // Custom animation effects are CSS/JS only. HTML stays untouched so this
        // editor cannot accidentally replace any current Naga layout structure.
        if (htmlPane) htmlPane.style.display = (isCssStyling || isAnimationCustom) ? 'none' : '';
        if (jsPane) jsPane.style.display = isCssStyling ? 'none' : '';
        if (cssPane) cssPane.style.display = '';

        if (codeGrid) {
            codeGrid.style.gridTemplateColumns = isCssStyling
                ? 'minmax(0, 1fr)'
                : isAnimationCustom
                    ? 'repeat(2, minmax(0, 1fr))'
                    : 'repeat(3, minmax(0, 1fr))';
        }

        const cssLabel = cssPane?.querySelector('label');
        const jsLabel = jsPane?.querySelector('label');
        if (cssLabel) cssLabel.innerHTML = isAnimationCustom
            ? 'Custom Animation CSS <small class="text-muted">(Use the same effect name configured in Animation Effect)</small>'
            : 'CSS <small class="text-muted">(CSS Styling applies globally to TitanXgaming frontend)</small>';
        if (jsLabel) jsLabel.innerHTML = isAnimationCustom
            ? 'Custom Animation JS <small class="text-muted">(Optional. Avoid per-card timers; use NAGA_ANIMATION_EFFECTS.register)</small>'
            : 'JS';
    }

    function updateHeader(button) {
        const label = button ? button.textContent.trim() : activeSection;
        if (currentName) currentName.textContent = label;
        if (currentKey) currentKey.textContent = activeSection;
        updateEditorMode();
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function highlightHtml(value) {
        let html = escapeHtml(value);
        html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="code-token comment">$1</span>');
        html = html.replace(/(&lt;\/?)([a-zA-Z][\w:-]*)([^&]*?)(\/?&gt;)/g, (match, open, tag, attrs, close) => {
            const coloredAttrs = attrs.replace(/([\w:-]+)(=)("[^"]*"|'[^']*')/g, '<span class="code-token attr">$1</span><span class="code-token operator">$2</span><span class="code-token string">$3</span>');
            return '<span class="code-token tag">' + open + tag + '</span>' + coloredAttrs + '<span class="code-token tag">' + close + '</span>';
        });
        return html;
    }

    function highlightCss(value) {
        let html = escapeHtml(value);
        html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="code-token comment">$1</span>');
        html = html.replace(/([^{}]+)(\{)/g, '<span class="code-token selector">$1</span><span class="code-token operator">$2</span>');
        html = html.replace(/([\w-]+)(\s*:)/g, '<span class="code-token property">$1</span><span class="code-token operator">$2</span>');
        html = html.replace(/(:\s*)([^;{}]+)(;?)/g, '$1<span class="code-token value">$2</span><span class="code-token operator">$3</span>');
        html = html.replace(/([{}])/g, '<span class="code-token operator">$1</span>');
        return html;
    }

    function highlightJs(value) {
        let html = escapeHtml(value);
        html = html.replace(/(\/\/.*?$)/gm, '<span class="code-token comment">$1</span>');
        html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="code-token comment">$1</span>');
        html = html.replace(/(`[^`]*`|"[^"\n]*"|'[^'\n]*')/g, '<span class="code-token string">$1</span>');
        html = html.replace(/\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|try|catch|finally|new|class|extends|async|await|true|false|null|undefined|document|window)\b/g, '<span class="code-token keyword">$1</span>');
        html = html.replace(/\b([a-zA-Z_$][\w$]*)(?=\s*\()/g, '<span class="code-token function">$1</span>');
        html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="code-token number">$1</span>');
        return html;
    }

    function updateHighlight(editor) {
        if (!editor) return;
        const wrap = editor.closest('.layout-code-input-wrap');
        const code = wrap?.querySelector('.layout-code-highlight code');
        const lang = editor.closest('.layout-code-editor')?.dataset.editorLang || '';
        if (!code) return;

        let highlighted = escapeHtml(editor.value || '');
        if (lang === 'html') highlighted = highlightHtml(editor.value);
        if (lang === 'css') highlighted = highlightCss(editor.value);
        if (lang === 'js') highlighted = highlightJs(editor.value);

        code.innerHTML = highlighted || ' ';
        const pre = code.closest('.layout-code-highlight');
        if (pre) {
            pre.scrollTop = editor.scrollTop;
            pre.scrollLeft = editor.scrollLeft;
        }
    }

    function updateCodeEditor(editor) {
        if (!editor) return;
        const lineBox = document.querySelector('[data-line-for="' + editor.id + '"]');
        const lineCount = Math.max(1, (editor.value.match(/\n/g) || []).length + 1);
        if (lineBox) {
            lineBox.textContent = Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');
            lineBox.scrollTop = editor.scrollTop;
        }
        updateHighlight(editor);
    }

    /**
     * Manual undo/redo stack for the plain-<textarea> fallback editors (used when CodeMirror 6
     * fails to load). Native browser undo breaks the moment code assigns `.value` directly
     * (Tab indent, section load, save-time sanitization), so Ctrl+Z / Ctrl+Shift+Z get their
     * own history instead of depending on it.
     */
    function attachTextareaHistory(editor) {
        const MAX_ENTRIES = 200;
        const COALESCE_MS = 450;
        let stack = [{ value: editor.value, start: editor.selectionStart, end: editor.selectionEnd }];
        let index = 0;
        let pendingTimer = null;

        function snapshotNow() {
            const entry = { value: editor.value, start: editor.selectionStart, end: editor.selectionEnd };
            if (stack[index] && stack[index].value === entry.value) return;
            stack = stack.slice(0, index + 1);
            stack.push(entry);
            if (stack.length > MAX_ENTRIES) stack.shift();
            index = stack.length - 1;
        }

        function scheduleSnapshot() {
            if (pendingTimer) clearTimeout(pendingTimer);
            pendingTimer = setTimeout(() => {
                pendingTimer = null;
                snapshotNow();
            }, COALESCE_MS);
        }

        function flushPending() {
            if (!pendingTimer) return;
            clearTimeout(pendingTimer);
            pendingTimer = null;
            snapshotNow();
        }

        function apply(entry) {
            editor.value = entry.value;
            try { editor.setSelectionRange(entry.start, entry.end); } catch (err) {
                editor.selectionStart = editor.selectionEnd = entry.start;
            }
            updateCodeEditor(editor);
        }

        function undoNow() {
            flushPending();
            if (index <= 0) return;
            index -= 1;
            apply(stack[index]);
        }

        function redoNow() {
            flushPending();
            if (index >= stack.length - 1) return;
            index += 1;
            apply(stack[index]);
        }

        editor.__boHistory = {
            /** Call right after a discrete programmatic edit (e.g. Tab indent) so it becomes its own step. */
            recordDiscreteEdit: () => { flushPending(); snapshotNow(); },
            /** Call after loading new content (section switch) so undo can't cross document boundaries. */
            reset: () => {
                if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
                stack = [{ value: editor.value, start: editor.selectionStart, end: editor.selectionEnd }];
                index = 0;
            },
            undo: undoNow,
            redo: redoNow,
        };

        editor.addEventListener('input', scheduleSnapshot);
        editor.addEventListener('keydown', (event) => {
            const mod = event.ctrlKey || event.metaKey;
            if (!mod || event.key.toLowerCase() !== 'z') return;
            event.preventDefault();
            if (event.shiftKey) redoNow();
            else undoNow();
        });
    }

    function bindLineNumbers(editor) {
        if (!editor) return;
        attachTextareaHistory(editor);
        ['input', 'change', 'keyup'].forEach((eventName) => {
            editor.addEventListener(eventName, () => updateCodeEditor(editor));
        });
        editor.addEventListener('keydown', (event) => {
            if (event.key !== 'Tab') return;
            event.preventDefault();
            const startPos = editor.selectionStart;
            const endPos = editor.selectionEnd;
            editor.value = editor.value.substring(0, startPos) + '  ' + editor.value.substring(endPos);
            editor.selectionStart = editor.selectionEnd = startPos + 2;
            updateCodeEditor(editor);
            editor.__boHistory?.recordDiscreteEdit();
        });
        editor.addEventListener('scroll', () => {
            const lineBox = document.querySelector('[data-line-for="' + editor.id + '"]');
            if (lineBox) lineBox.scrollTop = editor.scrollTop;
            const pre = editor.closest('.layout-code-input-wrap')?.querySelector('.layout-code-highlight');
            if (pre) {
                pre.scrollTop = editor.scrollTop;
                pre.scrollLeft = editor.scrollLeft;
            }
        });
        updateCodeEditor(editor);
    }

    function updateAllLineNumbers() {
        [htmlEditor, cssEditor, jsEditor].forEach(updateCodeEditor);
    }

    function readHtml() {
        return cmEditors ? cmEditors.getHtml() : (htmlEditor.value || '');
    }
    function readCss() {
        return cmEditors ? cmEditors.getCss() : (cssEditor.value || '');
    }
    function readJs() {
        return cmEditors ? cmEditors.getJs() : (jsEditor.value || '');
    }

    function setEditors(data) {
        const html = data?.html || '';
        const css = data?.css || '';
        const js = data?.js || '';
        if (cmEditors) {
            cmEditors.setValues({ html: html, css: css, js: js });
            return;
        }
        htmlEditor.value = html;
        cssEditor.value = css;
        jsEditor.value = js;
        updateAllLineNumbers();
        // New document loaded (section switch/reload): undo must not reach into the
        // previously edited section's content.
        [htmlEditor, cssEditor, jsEditor].forEach((editor) => editor.__boHistory?.reset());
    }

    async function loadSection(sectionKey) {
        setStatus('Loading section...', '');
        try {
            const res = await fetch(API_CUSTOMIZE_SECTION_URL + '?key=' + encodeURIComponent(sectionKey) + '&v=' + Date.now(), {
                cache: 'no-store',
                headers: brandScopedHeaders({ 'Accept': 'application/json' })
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.message || 'Load failed');
            const sectionData = withSectionDefaults(sectionKey, json.data || {});
            setEditors(sectionData);
            setStatus(activeSection === 'animation-custom-effects'
                ? (sectionData.usingAnimationTemplate ? 'Example template loaded. Rename the effect, edit it, then Save Section. After that select Custom CSS / JS in Animation Effect and enter the same effect name.' : 'Edit custom animation CSS and optional JS here. Save, then select Custom CSS / JS in Animation Effect and enter the matching effect name.')
                : sectionData.usingDefaultHtml
                    ? 'Current Naga default HTML loaded. CSS and JS are blank so style.css and existing frontend scripts remain in use until you add overrides.'
                    : sectionData.upgradedAuthImages
                        ? 'Existing text Login/Register buttons were converted to uploaded image HTML. Click Save Section to publish this updated layout.'
                        : 'Latest active files loaded.', 'success');
        } catch (err) {
            setEditors({});
            setStatus(err.message || 'Load failed. Section files may not exist yet.', 'error');
        }
    }

    async function saveSection() {
        // Use multipart FormData for layout source instead of URL-encoded source code.
        // The section editor can contain HTML/CSS/JS characters that are commonly flagged by
        // reverse-proxy/WAF form-body rules. Spring's existing @RequestParam endpoint accepts
        // multipart fields directly, so this does not require an API change.
        const payload = new FormData();
        let htmlValue = readHtml();
        let cssValue = readCss();
        const jsValue = readJs();
        const safeHtml = ensureAuthFeedbackMarkup(activeSection, htmlValue);
        const safeCss = ensureAuthFeedbackCss(activeSection, cssValue);
        if (safeHtml !== htmlValue || safeCss !== cssValue) {
            htmlValue = safeHtml;
            cssValue = safeCss;
            if (cmEditors) {
                cmEditors.setHtml(safeHtml);
                cmEditors.setCss(safeCss);
            } else {
                htmlEditor.value = safeHtml;
                cssEditor.value = safeCss;
                updateAllLineNumbers();
                // Auto-corrected content on save is a real edit, not a new document — keep
                // earlier undo history intact and just record this as its own step.
                htmlEditor.__boHistory?.recordDiscreteEdit();
                cssEditor.__boHistory?.recordDiscreteEdit();
            }
        }

        payload.append('key', activeSection);
        payload.append('html', safeHtml);
        payload.append('css', safeCss);
        payload.append('js', jsValue);

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Saving...';
        setStatus('Saving section files...', '');

        try {
            const res = await fetch(API_CUSTOMIZE_SECTION_URL, {
                method: 'POST',
                // Do not set Content-Type manually; the browser must add the multipart boundary.
                headers: brandScopedHeaders({ 'Accept': 'application/json' }),
                body: payload
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.message || 'Save failed');
            setStatus(activeSection === 'home' ? 'Saved. This CSS now overrides the TitanXgaming frontend after refresh.' : activeSection === 'animation-custom-effects' ? 'Saved. Custom animation CSS/JS will be loaded by the managed animation engine after frontend refresh. No server file editing is needed.' : 'Saved. Section content now applies to the TitanXgaming frontend after refresh.', 'success');
        } catch (err) {
            setStatus(err.message || 'Save failed. Please check Spring Boot API.', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="bi bi-save"></i> Save Section';
        }
    }

    document.querySelectorAll('.custom-tab[data-tab]').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.custom-tab[data-tab]').forEach((item) => item.classList.remove('active'));
            document.querySelectorAll('.custom-tab-panel').forEach((panel) => panel.classList.remove('active'));
            btn.classList.add('active');
            const panel = document.getElementById(btn.dataset.tab);
            if (panel) panel.classList.add('active');
            if (btn.dataset.tab === 'layout-sections') loadSection(activeSection);
        });
    });

    sectionBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            sectionBtns.forEach((item) => item.classList.remove('active'));
            btn.classList.add('active');
            activeSection = btn.dataset.section;
            updateHeader(btn);
            loadSection(activeSection).catch(() => {});
        });
    });

    reloadBtn?.addEventListener('click', () => loadSection(activeSection));
    saveBtn.addEventListener('click', saveSection);
    updateHeader(document.querySelector('.layout-section-item.active'));

    (async function bootLayoutEditors() {
        try {
            const cm6Url = new URL('assets/js/layout-section.js?v=1.0.26', window.location.href).href;
            const mod = await import(cm6Url);
            cmEditors = mod.mountLayoutCodeEditors({
                html: htmlEditor,
                css: cssEditor,
                js: jsEditor
            });
            window.BO_LAYOUT_CM6 = cmEditors;
        } catch (err) {
            console.warn('[layout-section] CodeMirror 6 unavailable, using textarea fallback.', err);
            window.__layoutCm6Error = String(err && err.message ? err.message : err);
            [htmlEditor, cssEditor, jsEditor].forEach(bindLineNumbers);
        }
        loadSection(activeSection);
    })();
})();
})();
