(function () {
function adminApi(pathKey) { return API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS[pathKey]; }
function escapeHtml(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
function statusPill(value) { const active = Number(value) === 1; return `<span class="slider-pill ${active ? 'active' : 'inactive'}"><i class="bi ${active ? 'bi-check-circle' : 'bi-pause-circle'}"></i>${active ? 'Active' : 'Inactive'}</span>`; }
async function fetchJson(url, options) { const res = await fetch(url, options); const json = await res.json().catch(() => ({})); if (!res.ok || json.status === 'error') throw new Error(json.message || 'Request failed'); return json; }

const PROVIDER_API = { list: adminApi('GAME_PROVIDER_LIST'), create: adminApi('GAME_PROVIDER_CREATE'), update: adminApi('GAME_PROVIDER_UPDATE'), delete: adminApi('GAME_PROVIDER_DELETE') };
const GAME_API_PROVIDER = { list: adminApi('GAME_LIST') };
const CATEGORY_API = { list: adminApi('GAME_CATEGORY_LIST') };
const WALLET_API = {
  createPlayer: adminApi('PROVIDER_WALLET_CREATE_PLAYER'),
  balance: adminApi('PROVIDER_WALLET_BALANCE'),
  deposit: adminApi('PROVIDER_WALLET_DEPOSIT'),
  withdraw: adminApi('PROVIDER_WALLET_WITHDRAW'),
  launchSport: adminApi('PROVIDER_WALLET_LAUNCH_SPORT'),
  apiPreview: adminApi('PROVIDER_WALLET_API_PREVIEW'),
  mainBalance: adminApi('MEMBER_WALLET_BALANCE'),
  mainAdjust: adminApi('MEMBER_WALLET_ADJUST'),
  pullLogDebug: adminApi('LIVE22_PULL_LOG_DEBUG')
};
const PROVIDER_GAME_API = { sync: adminApi('PROVIDER_GAME_SYNC'), debug: adminApi('PROVIDER_GAME_DEBUG') };
const CALLBACK_API = { previewBase: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.PROVIDER_CALLBACK_PREVIEW, report: adminApi('WALLET_LEDGER_SUMMARY') };

(function(){
  const form = document.getElementById('providerForm');
  const list = document.getElementById('providerList');
  const isFormPage = !!form;
  const isListPage = !!list;
  if (!isFormPage && !isListPage) return;
  let tenantMode=false; let tenantContextLoaded=false;
  const empty = document.getElementById('providerEmpty'), statusBox = document.getElementById('providerStatusBox');
  const providerSearchInput = document.getElementById('providerSearchInput');
  const CREATE_PAGE = 'game-provider-create.html';
  const LIST_PAGE = 'game-provider.html';
  function editPageUrl(id){ return CREATE_PAGE + (id ? ('?id=' + encodeURIComponent(id)) : ''); }
  const ids = ['providerId','providerCode','providerName','providerType','providerCategoryIds','providerImageUrl','providerBrandImageUrl','walletMode','settlementCostPercent','settlementCostBasis','integrationType','httpMethod','currency','apiBaseUrl','operatorId','secretKey','keyEnvironment','boLoginUrl','boUsername','boPassword','providerVariables','apiActionConfigs','signatureType','signatureOutputCase','signatureTemplate','ukeyLength','ukeyPrefix','ukeyStaticValue','createPlayerPath','balancePath','depositPath','withdrawPath','launchPath','gameListPath','createPlayerRequestTemplate','balanceRequestTemplate','depositRequestTemplate','withdrawRequestTemplate','launchRequestTemplate','gameListRequestTemplate','responseBalancePath','responseLaunchUrlPath','responseGameListPath','responseGameCodePath','responseGameNamePath','responseGameImagePath','gameImageApiUrlTemplate','gameImageRemoteApiUrlTemplate','gameImageRemoteApiHttpMethod','gameImageRemoteApiRequestTemplate','gameImageRemoteApiResponsePath','gameImageFallbackUrlTemplate','frontendGameFallbackImageUrl','responseGameCategoryPath','responseSuccessPath','responseSuccessValue','responseErrorMessagePath','callbackMemberPath','callbackGameCodePath','callbackBetIdPath','callbackTxIdPath','callbackBetAmountPath','callbackWinAmountPath','callbackValidBetAmountPath','callbackRoundIdPath','callbackStatusPath','callbackEventTypePath','callbackSignaturePath','callbackSuccessResponse','callbackDuplicateResponse','sortOrder','providerStatus'];
  const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  const title = document.getElementById('providerFormTitle'), saveBtn = document.getElementById('saveProviderBtn'), resetBtn = document.getElementById('resetProviderBtn');
  const toggleApiDebugToolsBtn = document.getElementById('toggleApiDebugToolsBtn');
  const apiDebugToolsModal = document.getElementById('apiDebugToolsModal');
  const closeApiDebugToolsBtn = document.getElementById('closeApiDebugToolsBtn');
  const walletFlow = document.getElementById('walletFlow');
  const withdrawNegativeAmount = document.getElementById('withdrawNegativeAmount');
  const pullLogTimingEnabled = document.getElementById('pullLogTimingEnabled');
  const pullLogWindowValue = document.getElementById('pullLogWindowValue');
  const pullLogWindowUnit = document.getElementById('pullLogWindowUnit');
  const pullLogEndDelaySeconds = document.getElementById('pullLogEndDelaySeconds');
  const pullLogTimezone = document.getElementById('pullLogTimezone');
  const pullLogDateTimeFormat = document.getElementById('pullLogDateTimeFormat');
  const walletProviderCode = document.getElementById('walletProviderCode'), walletStatusBox = document.getElementById('walletStatusBox'), walletResult = document.getElementById('walletResult');
  let rows = [];
  let categories = [];
  const walletRequestsInFlight = new Set();
  function setWalletActionBusy(action, busy){
    const btn = document.querySelector('[data-wallet-action="' + CSS.escape(String(action || '')) + '"]');
    if(btn) btn.disabled = !!busy;
  }
  function setStatus(message, type){ const cls = 'upload-status' + (type ? ' ' + type : ''); if(statusBox){ statusBox.textContent = message || ''; statusBox.className = cls; } const top=document.getElementById('providerStatusBoxTop'); if(top){ top.textContent=message||''; top.className=cls; } }
  function setBusy(busy){ if(!saveBtn) return; saveBtn.disabled = busy; saveBtn.innerHTML = busy ? '<i class="bi bi-hourglass-split"></i> Saving...' : '<i class="bi bi-check2"></i> Save Provider'; }
  function prettyJsonText(value){
    if(value === undefined || value === null || value === '') return '';
    try{
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      if(parsed && typeof parsed === 'object') return JSON.stringify(parsed, null, 2);
    } catch(_){}
    return String(value);
  }
  function parseActionConfigs(){
    const raw = (el.apiActionConfigs && el.apiActionConfigs.value || '').trim();
    if(!raw) return {};
    const parsed = JSON.parse(raw);
    if(!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('API Action Configs must be a JSON object.');
    return parsed;
  }
  function syncWalletFlowToJson(){
    if(!walletFlow || !el.apiActionConfigs) return;
    const configs = parseActionConfigs();
    const value = String(walletFlow.value || 'TRANSFER_BEFORE_LAUNCH').trim().toUpperCase();
    if(value === 'TRANSFER_BEFORE_LAUNCH') delete configs.walletFlow;
    else configs.walletFlow = value;
    el.apiActionConfigs.value = Object.keys(configs).length ? JSON.stringify(configs, null, 2) : '';
  }
  function syncWalletFlowFromJson(){
    if(!walletFlow) return;
    try{
      const configs = parseActionConfigs();
      const raw = String(configs.walletFlow || configs.wallet_flow || 'TRANSFER_BEFORE_LAUNCH').trim().toUpperCase().replaceAll('-', '_').replaceAll(' ', '_');
      walletFlow.value = ['TRANSFER_BEFORE_LAUNCH','TRANSFER_AFTER_LAUNCH','NO_TRANSFER'].includes(raw) ? raw : 'TRANSFER_BEFORE_LAUNCH';
    } catch(_){ walletFlow.value = 'TRANSFER_BEFORE_LAUNCH'; }
  }
  function syncWithdrawNegativeToJson(){
    if(!withdrawNegativeAmount || !el.apiActionConfigs) return;
    const configs = parseActionConfigs();
    if(withdrawNegativeAmount.checked){
      configs.WITHDRAW = (configs.WITHDRAW && typeof configs.WITHDRAW === 'object' && !Array.isArray(configs.WITHDRAW)) ? configs.WITHDRAW : {};
      configs.WITHDRAW.negativeAmount = true;
    } else if(configs.WITHDRAW && typeof configs.WITHDRAW === 'object' && !Array.isArray(configs.WITHDRAW)){
      delete configs.WITHDRAW.negativeAmount;
    }
    el.apiActionConfigs.value = Object.keys(configs).length ? JSON.stringify(configs, null, 2) : '';
  }
  function syncWithdrawNegativeFromJson(){
    if(!withdrawNegativeAmount) return;
    try{
      const configs = parseActionConfigs();
      const value = configs.WITHDRAW && configs.WITHDRAW.negativeAmount;
      withdrawNegativeAmount.checked = value === true || value === 1 || String(value || '').toLowerCase() === 'true';
    } catch(_){ withdrawNegativeAmount.checked = false; }
  }
  function syncPullLogTimingToJson(){
    if(!pullLogTimingEnabled || !el.apiActionConfigs) return;
    const configs = parseActionConfigs();
    if(pullLogTimingEnabled.checked){
      configs.PULL_LOG = (configs.PULL_LOG && typeof configs.PULL_LOG === 'object' && !Array.isArray(configs.PULL_LOG)) ? configs.PULL_LOG : {};
      delete configs.PULL_LOG.pullWindowMinutes;
      delete configs.PULL_LOG.pullWindowSeconds;
      const value = Math.max(0, Number(pullLogWindowValue?.value || 0));
      if((pullLogWindowUnit?.value || 'minutes') === 'seconds') configs.PULL_LOG.pullWindowSeconds = value;
      else configs.PULL_LOG.pullWindowMinutes = value;
      const delay = Math.max(0, Number(pullLogEndDelaySeconds?.value || 0));
      if(delay > 0) configs.PULL_LOG.pullEndDelaySeconds = delay;
      else delete configs.PULL_LOG.pullEndDelaySeconds;
      configs.PULL_LOG.pullTimezone = (pullLogTimezone?.value || 'Asia/Kuala_Lumpur').trim();
      configs.PULL_LOG.pullDateTimeFormat = (pullLogDateTimeFormat?.value || 'yyyy-MM-dd HH:mm:ss').trim();
    } else if(configs.PULL_LOG && typeof configs.PULL_LOG === 'object' && !Array.isArray(configs.PULL_LOG)){
      ['pullWindowMinutes','pullWindowSeconds','pullEndDelaySeconds','pullTimezone','pullDateTimeFormat'].forEach(key => delete configs.PULL_LOG[key]);
    }
    el.apiActionConfigs.value = Object.keys(configs).length ? JSON.stringify(configs, null, 2) : '';
  }
  function syncPullLogTimingFromJson(){
    if(!pullLogTimingEnabled) return;
    try{
      const configs = parseActionConfigs();
      const cfg = configs.PULL_LOG && typeof configs.PULL_LOG === 'object' && !Array.isArray(configs.PULL_LOG) ? configs.PULL_LOG : {};
      const hasSeconds = cfg.pullWindowSeconds !== undefined && cfg.pullWindowSeconds !== null && cfg.pullWindowSeconds !== '';
      const hasMinutes = cfg.pullWindowMinutes !== undefined && cfg.pullWindowMinutes !== null && cfg.pullWindowMinutes !== '';
      const enabled = hasSeconds || hasMinutes || cfg.pullTimezone || cfg.pullDateTimeFormat || cfg.pullEndDelaySeconds;
      pullLogTimingEnabled.checked = !!enabled;
      if(hasSeconds){ pullLogWindowUnit.value='seconds'; pullLogWindowValue.value=String(cfg.pullWindowSeconds); }
      else { pullLogWindowUnit.value='minutes'; pullLogWindowValue.value=String(hasMinutes ? cfg.pullWindowMinutes : 15); }
      pullLogEndDelaySeconds.value=String(cfg.pullEndDelaySeconds ?? 0);
      pullLogTimezone.value=cfg.pullTimezone || 'Asia/Kuala_Lumpur';
      pullLogDateTimeFormat.value=cfg.pullDateTimeFormat || 'yyyy-MM-dd HH:mm:ss';
    }catch(_){
      pullLogTimingEnabled.checked=false;
    }
  }
  function reset(){ if(!form) return; form.querySelectorAll('input,select,textarea').forEach(node=>node.disabled=false); form.reset(); el.providerId.value=''; el.currency.value='MYR'; el.sortOrder.value='0'; el.providerStatus.value='1'; el.integrationType.value='GENERIC_API'; el.httpMethod.value='POST'; el.signatureType.value='MD5'; el.signatureOutputCase.value='LOWER'; el.ukeyLength.value='8'; el.ukeyPrefix.value=''; el.ukeyStaticValue.value=''; if(el.keyEnvironment) el.keyEnvironment.value='STAGING'; if(el.boLoginUrl) el.boLoginUrl.value=''; if(el.boUsername) el.boUsername.value=''; if(el.boPassword) el.boPassword.value=''; if(el.providerVariables) el.providerVariables.value=''; if(el.apiActionConfigs) el.apiActionConfigs.value=''; if(walletFlow) walletFlow.value='TRANSFER_BEFORE_LAUNCH'; if(withdrawNegativeAmount) withdrawNegativeAmount.checked=false; if(pullLogTimingEnabled) pullLogTimingEnabled.checked=false; if(pullLogWindowValue) pullLogWindowValue.value='15'; if(pullLogWindowUnit) pullLogWindowUnit.value='minutes'; if(pullLogEndDelaySeconds) pullLogEndDelaySeconds.value='0'; if(pullLogTimezone) pullLogTimezone.value='Asia/Kuala_Lumpur'; if(pullLogDateTimeFormat) pullLogDateTimeFormat.value='yyyy-MM-dd HH:mm:ss'; if(el.gameImageApiUrlTemplate) el.gameImageApiUrlTemplate.value=''; if(el.gameImageRemoteApiUrlTemplate) el.gameImageRemoteApiUrlTemplate.value=''; if(el.gameImageRemoteApiHttpMethod) el.gameImageRemoteApiHttpMethod.value='GET'; if(el.gameImageRemoteApiRequestTemplate) el.gameImageRemoteApiRequestTemplate.value=''; if(el.gameImageRemoteApiResponsePath) el.gameImageRemoteApiResponsePath.value=''; if(el.gameImageFallbackUrlTemplate) el.gameImageFallbackUrlTemplate.value=''; if(el.frontendGameFallbackImageUrl) el.frontendGameFallbackImageUrl.value=''; renderCategoryOptions(''); setCategoryMsDisabled(false); if(title) title.textContent='Create Provider'; el.providerCode.disabled=false; setStatus('', ''); window.scrollTo({top:0, behavior:'smooth'}); }
  function payload(){
    syncWalletFlowToJson();
    syncWithdrawNegativeToJson();
    syncPullLogTimingToJson();
    const data = {};
    if (el.providerId.value) data.id = Number(el.providerId.value);
    data.code = el.providerCode.value.trim().toUpperCase();
    data.name = el.providerName.value.trim();
    data.providerType = 'OTHER';
    data.categoryIds = Array.from(el.providerCategoryIds?.selectedOptions || []).map(option => option.value).join(',');
    data.providerImageUrl = el.providerImageUrl.value.trim();
    data.providerBrandImageUrl = el.providerBrandImageUrl.value.trim();
    data.walletMode = el.walletMode.value;
    data.currency = el.currency.value.trim() || 'MYR';
    ['apiBaseUrl','operatorId','secretKey','keyEnvironment','boLoginUrl','boUsername','boPassword','providerVariables','apiActionConfigs','integrationType','httpMethod','signatureType','signatureOutputCase','signatureTemplate','ukeyLength','ukeyPrefix','ukeyStaticValue','createPlayerPath','balancePath','depositPath','withdrawPath','launchPath','gameListPath','createPlayerRequestTemplate','balanceRequestTemplate','depositRequestTemplate','withdrawRequestTemplate','launchRequestTemplate','gameListRequestTemplate','responseBalancePath','responseLaunchUrlPath','responseGameListPath','responseGameCodePath','responseGameNamePath','responseGameImagePath','gameImageApiUrlTemplate','gameImageRemoteApiUrlTemplate','gameImageRemoteApiHttpMethod','gameImageRemoteApiRequestTemplate','gameImageRemoteApiResponsePath','gameImageFallbackUrlTemplate','frontendGameFallbackImageUrl','responseGameCategoryPath','responseSuccessPath','responseSuccessValue','responseErrorMessagePath','callbackMemberPath','callbackGameCodePath','callbackBetIdPath','callbackTxIdPath','callbackBetAmountPath','callbackWinAmountPath','callbackValidBetAmountPath','callbackRoundIdPath','callbackStatusPath','callbackEventTypePath','callbackSignaturePath','callbackSuccessResponse','callbackDuplicateResponse','sortOrder'].forEach(k => {
      let value = el[k].value || '';
      if (k === 'ukeyLength' || k === 'sortOrder') value = value === '' ? null : Number(value);
      data[k] = value;
    });
    data.status = Number(el.providerStatus.value || '1');
    return data;
  }
  function selectedCategoryIds(){ return Array.from(el.providerCategoryIds?.selectedOptions || []).map(option => String(option.value)); }
  function categoryMsParts(){
    const root = document.querySelector('[data-gpc-ms="providerCategoryIds"]');
    if(!root) return null;
    const menu = document.getElementById('providerCategoryMenu') || root.querySelector('.gpc-ms-menu');
    return {
      root,
      trigger: root.querySelector('.gpc-ms-trigger'),
      value: root.querySelector('.gpc-ms-value'),
      menu
    };
  }
  function syncCategoryMsLabel(){
    const parts = categoryMsParts();
    if(!parts || !parts.value) return;
    const selected = Array.from(el.providerCategoryIds?.selectedOptions || []);
    if(!selected.length){
      parts.value.textContent = 'Select categories…';
      parts.value.classList.add('is-placeholder');
      return;
    }
    parts.value.classList.remove('is-placeholder');
    if(selected.length <= 2){
      parts.value.textContent = selected.map(o => o.textContent).join(', ');
      return;
    }
    parts.value.textContent = selected.length + ' categories selected';
  }
  function closeCategoryMs(){
    const parts = categoryMsParts();
    if(!parts || !parts.menu) return;
    parts.menu.hidden = true;
    parts.trigger?.setAttribute('aria-expanded', 'false');
    parts.root?.classList.remove('is-open', 'is-dropup');
    parts.menu.style.top = '';
    parts.menu.style.left = '';
    parts.menu.style.width = '';
    parts.menu.style.maxHeight = '';
  }
  function positionCategoryMsMenu(){
    const parts = categoryMsParts();
    if(!parts || !parts.menu || !parts.trigger || parts.menu.hidden) return;
    const rect = parts.trigger.getBoundingClientRect();
    const gap = 6;
    const maxH = 240;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 12;
    const spaceAbove = rect.top - gap - 12;
    const openUp = spaceBelow < 140 && spaceAbove > spaceBelow;
    const available = Math.max(120, openUp ? spaceAbove : spaceBelow);
    const height = Math.min(maxH, available);
    parts.menu.style.left = Math.round(rect.left) + 'px';
    parts.menu.style.width = Math.round(rect.width) + 'px';
    parts.menu.style.maxHeight = Math.round(height) + 'px';
    if(openUp){
      parts.menu.style.top = Math.round(rect.top - gap - height) + 'px';
      parts.root.classList.add('is-dropup');
    } else {
      parts.menu.style.top = Math.round(rect.bottom + gap) + 'px';
      parts.root.classList.remove('is-dropup');
    }
  }
  function openCategoryMs(){
    const parts = categoryMsParts();
    if(!parts || !parts.menu || !parts.trigger || parts.trigger.disabled) return;
    parts.menu.hidden = false;
    parts.trigger.setAttribute('aria-expanded', 'true');
    parts.root.classList.add('is-open');
    positionCategoryMsMenu();
  }
  function renderCategoryMsMenu(){
    const parts = categoryMsParts();
    if(!parts || !parts.menu || !el.providerCategoryIds) return;
    const options = Array.from(el.providerCategoryIds.options || []);
    if(!options.length){
      parts.menu.innerHTML = '<div class="gpc-ms-empty">No categories loaded</div>';
      return;
    }
    parts.menu.innerHTML = options.map(option => {
      const id = 'gpcCatOpt_' + String(option.value).replace(/[^\w-]/g, '_');
      return '<label class="gpc-ms-option' + (option.selected ? ' is-on' : '') + '" for="' + id + '" role="option" aria-selected="' + (option.selected ? 'true' : 'false') + '">'
        + '<input type="checkbox" id="' + id + '" value="' + escapeHtml(option.value) + '"' + (option.selected ? ' checked' : '') + (option.disabled ? ' disabled' : '') + ' />'
        + '<span>' + escapeHtml(option.textContent || option.value) + '</span>'
        + '<i class="gpc-ms-check" aria-hidden="true">✓</i>'
        + '</label>';
    }).join('');
  }
  function renderCategoryOptions(selectedValue){
    if(!el.providerCategoryIds) return;
    const selected = String(selectedValue || '').split(/[,|]/).map(v => v.trim()).filter(Boolean);
    el.providerCategoryIds.innerHTML = categories.map(category => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name || ('Category #' + category.id))}</option>`).join('');
    Array.from(el.providerCategoryIds.options).forEach(option => { option.selected = selected.includes(String(option.value)); });
    renderCategoryMsMenu();
    syncCategoryMsLabel();
  }
  function bindCategoryMs(){
    const parts = categoryMsParts();
    if(!parts || !parts.menu || !parts.trigger || parts.root.dataset.bound === '1') return;
    parts.root.dataset.bound = '1';
    // Escape overflow clipping from .mac-workspace / .mac-section
    if(parts.menu.parentElement !== document.body){
      document.body.appendChild(parts.menu);
    }
    parts.trigger.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      if(parts.trigger.disabled) return;
      const menu = document.getElementById('providerCategoryMenu') || parts.menu;
      if(menu.hidden) openCategoryMs();
      else closeCategoryMs();
    });
    parts.menu.addEventListener('click', function(e){ e.stopPropagation(); });
    parts.menu.addEventListener('change', function(e){
      const input = e.target;
      if(!input || input.type !== 'checkbox' || !el.providerCategoryIds) return;
      const option = Array.from(el.providerCategoryIds.options).find(o => String(o.value) === String(input.value));
      if(option) option.selected = !!input.checked;
      input.closest('.gpc-ms-option')?.classList.toggle('is-on', !!input.checked);
      input.closest('.gpc-ms-option')?.setAttribute('aria-selected', input.checked ? 'true' : 'false');
      syncCategoryMsLabel();
      el.providerCategoryIds.dispatchEvent(new Event('change', { bubbles: true }));
    });
    document.addEventListener('click', function(e){
      const menu = document.getElementById('providerCategoryMenu') || parts.menu;
      if(!menu || menu.hidden) return;
      if(parts.root.contains(e.target) || menu.contains(e.target)) return;
      closeCategoryMs();
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') closeCategoryMs();
    });
    window.addEventListener('resize', function(){ if(!(document.getElementById('providerCategoryMenu') || parts.menu).hidden) positionCategoryMsMenu(); });
    window.addEventListener('scroll', function(){
      const menu = document.getElementById('providerCategoryMenu') || parts.menu;
      if(menu && !menu.hidden) positionCategoryMsMenu();
    }, true);
  }
  if(isFormPage) bindCategoryMs();

  function providerField(item, camel, snake, fallback=''){
    if(!item || typeof item !== 'object') return fallback;
    const value = item[camel] ?? (snake ? item[snake] : undefined);
    return value === undefined || value === null || value === '' ? fallback : value;
  }
  function setSelectValue(select, value, fallback){
    if(!select) return;
    const wanted = String(value ?? '').trim().toUpperCase();
    const match = Array.from(select.options).find(option => String(option.value || option.textContent || '').trim().toUpperCase() === wanted);
    select.value = match ? match.value : fallback;
    // Some browsers/custom select renderers update one frame late after the modal/form is reset.
    requestAnimationFrame(() => {
      if(match && select.value !== match.value) select.value = match.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  function setCategoryMsDisabled(disabled){
    const parts = categoryMsParts();
    if(!parts) return;
    parts.trigger.disabled = !!disabled;
    if(disabled) closeCategoryMs();
  }
  function edit(item){ if(!form) return; el.providerId.value=item.id||''; el.providerCode.value=item.code||''; el.providerName.value=item.name||''; renderCategoryOptions(item.categoryIds || item.category_ids || ''); el.providerImageUrl.value=item.providerImageUrl||''; el.providerBrandImageUrl.value=item.providerBrandImageUrl||item.provider_brand_image_url||''; setSelectValue(el.walletMode, providerField(item,'walletMode','wallet_mode','TRANSFER'), 'TRANSFER'); if(el.settlementCostPercent) el.settlementCostPercent.value=providerField(item,'settlementCostPercent','settlement_cost_percent','0'); setSelectValue(el.settlementCostBasis, providerField(item,'settlementCostBasis','settlement_cost_basis','HOUSE_WIN'), 'HOUSE_WIN'); el.currency.value=providerField(item,'currency','currency','MYR'); setSelectValue(el.integrationType, providerField(item,'integrationType','integration_type','GENERIC_API'), 'GENERIC_API'); setSelectValue(el.httpMethod, providerField(item,'httpMethod','http_method','POST'), 'POST'); el.apiBaseUrl.value=item.apiBaseUrl||''; el.operatorId.value=item.operatorId||''; el.secretKey.value=item.secretKey||''; if(el.keyEnvironment) el.keyEnvironment.value=providerField(item,'keyEnvironment','key_environment','STAGING'); if(el.boLoginUrl) el.boLoginUrl.value=providerField(item,'boLoginUrl','bo_login_url',''); if(el.boUsername) el.boUsername.value=providerField(item,'boUsername','bo_username',''); if(el.boPassword){ el.boPassword.value=providerField(item,'boPassword','bo_password',''); el.boPassword.type='password'; } if(el.providerVariables) el.providerVariables.value=prettyJsonText(item.providerVariables ?? item.provider_variables ?? ''); if(el.apiActionConfigs) el.apiActionConfigs.value=prettyJsonText(item.apiActionConfigs ?? item.api_action_configs ?? ''); syncWalletFlowFromJson(); syncWithdrawNegativeFromJson(); syncPullLogTimingFromJson(); el.signatureType.value=item.signatureType||'MD5'; el.signatureOutputCase.value=item.signatureOutputCase||'LOWER'; el.signatureTemplate.value=item.signatureTemplate||''; el.ukeyLength.value=item.ukeyLength||8; el.ukeyPrefix.value=item.ukeyPrefix||''; el.ukeyStaticValue.value=item.ukeyStaticValue||''; el.createPlayerPath.value=item.createPlayerPath||''; el.balancePath.value=item.balancePath||''; el.depositPath.value=item.depositPath||''; el.withdrawPath.value=item.withdrawPath||''; el.launchPath.value=item.launchPath||''; el.gameListPath.value=item.gameListPath||''; el.createPlayerRequestTemplate.value=item.createPlayerRequestTemplate||''; el.balanceRequestTemplate.value=item.balanceRequestTemplate||''; el.depositRequestTemplate.value=item.depositRequestTemplate||''; el.withdrawRequestTemplate.value=item.withdrawRequestTemplate||''; el.launchRequestTemplate.value=item.launchRequestTemplate||''; el.gameListRequestTemplate.value=item.gameListRequestTemplate||''; el.responseBalancePath.value=item.responseBalancePath||''; el.responseLaunchUrlPath.value=item.responseLaunchUrlPath||''; el.responseGameListPath.value=item.responseGameListPath||''; el.responseGameCodePath.value=item.responseGameCodePath||''; el.responseGameNamePath.value=item.responseGameNamePath||''; ['responseGameImagePath','gameImageApiUrlTemplate','gameImageRemoteApiUrlTemplate','gameImageRemoteApiHttpMethod','gameImageRemoteApiRequestTemplate','gameImageRemoteApiResponsePath','gameImageFallbackUrlTemplate','frontendGameFallbackImageUrl','responseGameCategoryPath','responseSuccessPath','responseSuccessValue','responseErrorMessagePath','callbackMemberPath','callbackGameCodePath','callbackBetIdPath','callbackTxIdPath','callbackBetAmountPath','callbackWinAmountPath','callbackValidBetAmountPath','callbackRoundIdPath','callbackStatusPath','callbackEventTypePath','callbackSignaturePath','callbackSuccessResponse','callbackDuplicateResponse'].forEach(k=>{ if(el[k]) el[k].value=item[k]||''; }); if(el.gameImageRemoteApiHttpMethod && !el.gameImageRemoteApiHttpMethod.value) el.gameImageRemoteApiHttpMethod.value='GET'; el.sortOrder.value=item.sortOrder??0; el.providerStatus.value=String(item.status??1); el.providerCode.disabled=true; if(title) title.textContent='Edit Provider #' + item.id; if(isFormPage) document.title = 'Edit Provider #' + item.id;
    if(tenantMode){
      const editable=new Set(['providerImageUrl','providerBrandImageUrl','frontendGameFallbackImageUrl']);
      form.querySelectorAll('input,select,textarea').forEach(node=>{ if(node.id && node.id!=='providerId') node.disabled=!editable.has(node.id); });
      setCategoryMsDisabled(true);
      saveBtn.disabled=false;
      setStatus('Brand image override mode: you can adjust the 3 frontend provider image fields for this brand only.', 'success');
    } else {
      form.querySelectorAll('input,select,textarea').forEach(node=>node.disabled=false);
      el.providerCode.disabled=true;
      setCategoryMsDisabled(false);
      setStatus('Editing provider. Games using this Provider Code will group under this provider.', 'success');
    }
    window.scrollTo({top:0, behavior:'smooth'}); }
  async function editFresh(id, button){
    if(isListPage && !isFormPage){
      window.location.href = editPageUrl(id);
      return;
    }
    const originalHtml = button ? button.innerHTML : '';
    if(button){ button.disabled = true; button.innerHTML = '<i class="bi bi-hourglass-split"></i> Loading...'; }
    try{
      const providerJson = await fetchJson(PROVIDER_API.list + (PROVIDER_API.list.includes('?') ? '&' : '?') + '_ts=' + Date.now(), { cache: 'no-store' });
      rows = providerJson.data || providerJson || [];
      const item = rows.find(x => String(x.id) === String(id));
      if(!item) throw new Error('Provider not found. Please refresh and try again.');
      edit(item);
      if(isListPage) render();
    }catch(err){
      setStatus(err.message || 'Unable to load latest provider data.', 'error');
    }finally{
      if(button){ button.disabled = false; button.innerHTML = originalHtml; }
    }
  }

  function providerOptions(){ if(!walletProviderCode) return; const opts = rows.map(x => `<option value="${escapeHtml(x.code)}" data-provider-id="${escapeHtml(x.id)}">${escapeHtml(x.code)} - ${escapeHtml(x.name)}</option>`).join('') || '<option value="">No provider</option>'; walletProviderCode.innerHTML = opts; const cb=document.getElementById('callbackProviderCode'); if(cb) cb.innerHTML=opts; }
  function maskCredential(value){
    const text = String(value || '');
    if(!text) return '-';
    if(text.length <= 4) return '••••';
    return text.slice(0, 2) + '••••••' + text.slice(-2);
  }
  function providerActionConfigObject(item){
    const raw = item?.apiActionConfigs ?? item?.api_action_configs ?? '';
    if(!raw) return { config:{}, invalid:false };
    if(typeof raw === 'object' && !Array.isArray(raw)) return { config:raw, invalid:false };
    try{
      const parsed = JSON.parse(String(raw));
      return { config:(parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {}, invalid:false };
    }catch(_){
      return { config:{}, invalid:true };
    }
  }
  function actionConfigured(item, configs, name){
    const cfg = configs && configs[name];
    if(cfg && typeof cfg === 'object' && !Array.isArray(cfg)){
      if(cfg.enabled === false || cfg.enabled === 0 || String(cfg.enabled ?? '').toLowerCase() === 'false') return false;
      // An explicit action object counts as configured when it has an endpoint/template/mapping,
      // or when enabled=true is intentionally used by a provider.
      if(cfg.enabled === true || cfg.enabled === 1 || String(cfg.enabled ?? '').toLowerCase() === 'true') return true;
      if(Object.keys(cfg).some(k => !['enabled'].includes(k))) return true;
    }
    if(cfg === false) return false;
    const legacy = {
      GAME_LIST: item?.gameListPath ?? item?.game_list_path,
      CREATE_PLAYER: item?.createPlayerPath ?? item?.create_player_path,
      BALANCE: item?.balancePath ?? item?.balance_path,
      DEPOSIT: item?.depositPath ?? item?.deposit_path,
      WITHDRAW: item?.withdrawPath ?? item?.withdraw_path,
      LAUNCH: item?.launchPath ?? item?.launch_path
    };
    return !!String(legacy[name] ?? '').trim();
  }
  function providerCapabilityHtml(item){
    const parsed = providerActionConfigObject(item);
    const configs = parsed.config;
    const standard = ['GAME_LIST','CREATE_PLAYER','LAUNCH','LOGOUT','BALANCE','DEPOSIT','WITHDRAW','PULL_LOG'];
    const topLevelKeys = new Set([
      'WALLETFLOW','WALLET_FLOW','AUTOSETTLESTALEENABLED','AUTOSETTLESTALESECONDS',
      'FORCEPROVIDERBALANCEONEXIT','SETTLEMENTBALANCEREQUIRED','LOGOUTBEFOREEXITBALANCE'
    ]);
    const extras = Object.keys(configs || {})
      .filter(key => {
        const upper = String(key).toUpperCase();
        return !standard.includes(upper) && !topLevelKeys.has(upper)
          && configs[key] && typeof configs[key] === 'object' && !Array.isArray(configs[key]);
      })
      .map(key => String(key).toUpperCase())
      .sort();
    const names = [...standard, ...extras];
    const onCount = names.reduce((n, name) => n + (actionConfigured(item, configs, name) ? 1 : 0), 0);
    const missing = names.filter(name => !actionConfigured(item, configs, name));
    const badges = names.map(name => {
      const on = actionConfigured(item, configs, name);
      return `<span class="provider-api-capability ${on ? 'is-on' : 'is-off'}" title="${escapeHtml(name)} ${on ? 'configured/enabled' : 'missing or disabled'}"><i class="bi ${on ? 'bi-check' : 'bi-dash'}" aria-hidden="true"></i>${escapeHtml(name)}</span>`;
    }).join('');
    const invalid = parsed.invalid
      ? '<span class="provider-api-capability is-invalid"><i class="bi bi-exclamation-triangle" aria-hidden="true"></i>INVALID JSON</span>'
      : '';
    return { onCount, total: names.length, missing, invalid: parsed.invalid, body: `${badges}${invalid}` };
  }
  function render(){
    if(!list) return;
    const q = String(providerSearchInput && providerSearchInput.value || '').trim().toLowerCase();
    const visible = !q ? rows : rows.filter(item => {
      const hay = [item.code, item.name, item.walletMode, item.integrationType, item.currency, item.apiBaseUrl, item.keyEnvironment || item.key_environment]
        .map(v => String(v || '').toLowerCase()).join(' ');
      return hay.includes(q);
    });
    list.innerHTML='';
    if(empty) empty.hidden = visible.length > 0;
    providerOptions();
    visible.forEach(item => {
      const linkedGameCount = Number(item.gameCount ?? item.game_count ?? 0);
      const isActive = Number(item.status) === 1;
      const env = String(item.keyEnvironment || item.key_environment || 'STAGING').toUpperCase() === 'LIVE' ? 'LIVE' : 'STAGING';
      const boUrl = item.boLoginUrl || item.bo_login_url || '';
      const boUsername = item.boUsername || item.bo_username || '';
      const boPassword = item.boPassword || item.bo_password || '';
      const categoryNames = (item.categoryIds || item.category_ids || '').split(',')
        .map(id => (categories.find(c => String(c.id) === String(id)) || {}).name)
        .filter(Boolean)
        .join(', ') || 'No category';
      const apiUrl = String(item.apiBaseUrl || '').trim();
      const caps = providerCapabilityHtml(item);
      const sortVal = item.sortOrder ?? 0;
      const metaLine = [
        categoryNames,
        item.walletMode || 'TRANSFER',
        item.integrationType || 'GENERIC_API',
        item.currency || 'MYR',
        `${linkedGameCount} games`,
        `Sort ${sortVal}`
      ].map(t => `<span>${escapeHtml(String(t))}</span>`).join('<span class="provider-meta-sep" aria-hidden="true">·</span>');
      const actionsHtml = tenantMode
        ? `<button class="clean-btn provider-edit-btn" type="button" data-edit-id="${escapeHtml(item.id)}"><i class="bi bi-image" aria-hidden="true"></i><span>Brand</span></button>`
        : `<button class="clean-btn provider-edit-btn" type="button" data-edit-id="${escapeHtml(item.id)}"><i class="bi bi-pencil" aria-hidden="true"></i><span>Edit</span></button><button class="clean-btn provider-icon-btn provider-delete-btn" type="button" data-delete-id="${escapeHtml(item.id)}" title="Delete" aria-label="Delete"><i class="bi bi-trash" aria-hidden="true"></i></button>`;
      const codeLabel = String(item.code || '').trim();
      const nameLabel = String(item.name || '').trim();
      const showCodeEyebrow = codeLabel && codeLabel.toUpperCase() !== nameLabel.toUpperCase();
      const readyPct = caps.total ? Math.round((caps.onCount / caps.total) * 100) : 0;
      const missingHint = caps.invalid
        ? 'Invalid JSON'
        : (caps.missing && caps.missing.length
          ? `${caps.missing.slice(0, 2).join(', ')}${caps.missing.length > 2 ? ` +${caps.missing.length - 2}` : ''} missing`
          : 'All ready');
      const card=document.createElement('div');
      card.className='manage-card provider-card is-vault-first is-fold-collapsed';
      card.innerHTML=`<header class="provider-card-head"><div class="manage-thumb game-thumb">${item.providerImageUrl ? `<img src="${escapeHtml(item.providerImageUrl)}" alt="${escapeHtml(item.name || item.code)}">` : `<i class="bi bi-hdd-network" aria-hidden="true"></i>`}</div><div class="provider-card-identity">${showCodeEyebrow ? `<p class="provider-card-code">${escapeHtml(codeLabel)}</p>` : ''}<div class="provider-title-row"><h3 class="provider-card-label">${escapeHtml(nameLabel || codeLabel)}</h3><span class="provider-status ${isActive ? 'is-on' : 'is-off'}"><i class="provider-status-dot" aria-hidden="true"></i>${isActive ? 'Active' : 'Inactive'}</span><span class="provider-env-pill ${env === 'LIVE' ? 'is-live' : 'is-staging'}">${env === 'LIVE' ? 'Live Key' : 'Staging'}</span></div></div><div class="slider-card-actions">${actionsHtml}</div></header><section class="provider-ready" aria-label="API readiness"><div class="provider-ready-top"><span class="provider-ready-count">${caps.onCount}/${caps.total} ready</span><span class="provider-ready-hint ${caps.onCount === caps.total && !caps.invalid ? 'is-complete' : 'is-gap'}">${escapeHtml(missingHint)}</span></div><div class="provider-ready-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${readyPct}"><span class="provider-ready-fill" style="width:${readyPct}%"></span></div></section><button type="button" class="provider-fold-toggle" data-provider-fold aria-expanded="false"><span class="provider-fold-icon" aria-hidden="true"><i class="bi bi-shield-lock"></i></span><span class="provider-fold-label">BO Login</span><span class="provider-fold-status ${(boUrl || boUsername || boPassword) ? 'is-set' : 'is-empty'}">${(boUrl || boUsername || boPassword) ? 'On file' : 'Empty'}</span><i class="bi bi-chevron-down provider-fold-chevron" aria-hidden="true"></i></button><div class="provider-fold-panel" data-provider-fold-panel hidden><section class="provider-vault"><div class="provider-cred-row"><div class="provider-cred-field"><span class="provider-k">URL</span><div class="provider-cred-well">${boUrl ? `<a href="${escapeHtml(boUrl)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(boUrl)}">${escapeHtml(boUrl)}</a>` : '<span class="provider-empty">—</span>'}${boUrl ? `<button type="button" class="provider-well-btn" data-copy-text="${escapeHtml(boUrl)}" title="Copy URL" aria-label="Copy URL"><i class="bi bi-copy" aria-hidden="true"></i></button>` : ''}</div></div><div class="provider-cred-field"><span class="provider-k">Username</span><div class="provider-cred-well"><code>${escapeHtml(boUsername || '—')}</code>${boUsername ? `<button type="button" class="provider-well-btn" data-copy-text="${escapeHtml(boUsername)}" title="Copy username" aria-label="Copy username"><i class="bi bi-copy" aria-hidden="true"></i></button>` : ''}</div></div><div class="provider-cred-field"><span class="provider-k">Password</span><div class="provider-cred-well provider-cred-password"><code data-provider-password-id="${escapeHtml(item.id)}">${escapeHtml(maskCredential(boPassword))}</code>${boPassword ? `<button type="button" class="provider-well-btn provider-reveal-btn" data-reveal-password-id="${escapeHtml(item.id)}" title="Reveal"><i class="bi bi-eye" aria-hidden="true"></i><span>Reveal</span></button><button type="button" class="provider-well-btn" data-copy-password-id="${escapeHtml(item.id)}" title="Copy"><i class="bi bi-copy" aria-hidden="true"></i><span>Copy</span></button>` : ''}</div></div></div></section><footer class="provider-card-foot"><p class="provider-meta-line">${metaLine}</p>${apiUrl ? `<button type="button" class="provider-endpoint-btn" data-copy-text="${escapeHtml(apiUrl)}" title="Copy API URL">${escapeHtml(apiUrl)}</button>` : ''}</footer></div>`;
      list.appendChild(card);
    });
  }
  async function ensureTenantContext(){if(tenantContextLoaded)return;tenantContextLoaded=true;try{const j=window.BO_BRAND?await BO_BRAND.context():null;tenantMode=!!(j&&j.data&&!j.data.master);}catch(_){tenantMode=false;}if(tenantMode){title.textContent='Add New Provider';resetBtn.textContent='Clear Form';}}
  async function load(){
    await ensureTenantContext();
    setStatus('Loading...', '');
    try{
      const [providerJson, categoryJson] = await Promise.all([
        fetchJson(PROVIDER_API.list + (PROVIDER_API.list.includes('?') ? '&' : '?') + '_ts=' + Date.now(), { cache: 'no-store' }),
        fetchJson(CATEGORY_API.list)
      ]);
      rows = providerJson.data || providerJson || [];
      categories = categoryJson.data || categoryJson || [];
      if(form && el.providerCategoryIds){
        renderCategoryOptions(el.providerId.value ? (rows.find(r => String(r.id) === String(el.providerId.value)) || {}).categoryIds : '');
      }
      if(isListPage) render();
      providerOptions();
      if(isFormPage){
        const params = new URLSearchParams(window.location.search);
        const editId = params.get('id');
        if(editId){
          const item = rows.find(x => String(x.id) === String(editId));
          if(item) edit(item);
          else setStatus('Provider #' + editId + ' not found.', 'error');
        } else {
          setStatus('', '');
        }
      } else {
        setStatus('Latest provider and category data loaded.', 'success');
      }
    }catch(err){ setStatus(err.message || 'Failed to load.', 'error'); }
  }

  async function save(e){
    e.preventDefault();
    if(tenantMode && el.providerId.value){
      setBusy(true);
      try{
        const json=await fetchJson(adminApi('GAME_PROVIDER_BRAND_PRESENTATION'),{
          method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
            code:el.providerCode.value.trim().toUpperCase(),
            providerImageUrl:el.providerImageUrl.value.trim(),
            providerBrandImageUrl:el.providerBrandImageUrl.value.trim(),
            frontendGameFallbackImageUrl:el.frontendGameFallbackImageUrl.value.trim()
          })
        });
        setStatus(json.message||'Brand provider images saved.','success');
        if(isFormPage){ window.location.href = LIST_PAGE + '?saved=1'; return; }
        reset(); await load();
      }catch(err){setStatus(err.message||'Save failed.','error');}finally{setBusy(false);}
      return;
    }
    if(!el.providerCode.value.trim() || !el.providerName.value.trim()){
      setStatus('Provider code and name are required.', 'error');
      return;
    }
    if(!selectedCategoryIds().length){
      setStatus('Please select at least one Provider Category.', 'error');
      return;
    }
    setBusy(true);
    try{
      const json = await fetchJson(el.providerId.value ? PROVIDER_API.update : PROVIDER_API.create, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload())
      });
      setStatus(json.message || 'Saved.', 'success');
      if(isFormPage){ window.location.href = LIST_PAGE + '?saved=1'; return; }
      reset();
      await load();
    }catch(err){
      setStatus(err.message || 'Save failed.', 'error');
    }finally{
      setBusy(false);
    }
  }

  async function remove(id){ if(tenantMode){setStatus('Provider configuration is managed by master admin.', 'error');return;}
    if(!(await BO_DIALOG.confirm('Delete this provider? Games will not be deleted, but provider will become inactive.', {title:'Delete Provider', confirmText:'Delete'}))) return;
    const data = new FormData();
    data.append('id', id);
    try{
      const json = await fetchJson(PROVIDER_API.delete, {method:'POST', body:data});
      setStatus(json.message || 'Deleted.', 'success');
      await load();
    }catch(err){
      setStatus(err.message || 'Delete failed.', 'error');
    }
  }

  function formatProviderDebug(data){
    const d = data || {};
    const arrayPaths = (d.availablePaths || []).filter(x => x.isArray).map(x => x.path + ' (' + (x.size ?? '-') + ')');
    const objectPaths = (d.availablePaths || []).filter(x => x.type === 'object').map(x => x.path);
    return JSON.stringify({
      providerCode: d.providerCode,
      httpStatus: d.httpStatus,
      url: d.url,
      configuredGameListPath: d.configuredGameListPath,
      configuredPathType: d.configuredPathType,
      configuredPathIsArray: d.configuredPathIsArray,
      configuredPathIsObject: d.configuredPathIsObject,
      normalizedGameRows: d.normalizedGameRows,
      suggestedArrayPaths: arrayPaths,
      suggestedObjectPaths: objectPaths,
      requestPayload: d.requestPayload,
      responseBody: (() => { try { return JSON.parse(d.responseBody); } catch(e) { return d.responseBody; } })(),
      availablePaths: d.availablePaths,
      context: d.context,
      hint: d.hint
    }, null, 2);
  }

  async function syncGames(){ const providerCode = walletProviderCode.value || (rows[0] && rows[0].code); if(!providerCode){ setStatus('Please create/select provider first.', 'error'); return; } if(!(await BO_DIALOG.confirm('Sync games from provider ' + providerCode + '?', {title:'Sync Provider Games', confirmText:'Sync'}))) return; try{ setStatus('Syncing provider games...', ''); const data=new FormData(); data.append('providerCode', providerCode); const json=await fetchJson(PROVIDER_GAME_API.sync, {method:'POST', body:data}); setStatus('Game sync completed. Inserted: '+json.data.inserted+', Updated: '+json.data.updated+'. Images — provider: '+(json.data.imagesFromProvider||0)+', generated URL: '+(json.data.imagesFromImageApiTemplate||0)+', separate image API: '+(json.data.imagesFromRemoteApi||0)+', image API failures: '+(json.data.remoteImageApiFailures||0)+', fallback: '+(json.data.imagesFromFallbackTemplate||0)+', missing: '+(json.data.imagesMissing||0)+'. Path: '+(json.data.gameListPath || '-'), 'success'); if(window.walletResult) walletResult.textContent=JSON.stringify(json.data, null, 2); await load(); }catch(err){ setStatus(err.message || 'Game sync failed.', 'error'); if(window.walletResult) walletResult.textContent='Sync error:\n' + (err.message || 'Game sync failed') + '\n\nOpen Provider Transactions page and filter Tx Type = GAME_LIST to inspect request/response.'; } }
  async function debugGames(){ const providerCode = walletProviderCode.value || (rows[0] && rows[0].code); if(!providerCode){ setStatus('Please create/select provider first.', 'error'); return; } try{ setStatus('Debugging provider game list...', ''); const data=new FormData(); data.append('providerCode', providerCode); const json=await fetchJson(PROVIDER_GAME_API.debug, {method:'POST', body:data}); setStatus('Debug completed. Check result box below and Provider Transactions page.', (json.data.configuredPathIsArray || json.data.normalizedGameRows > 0) ? 'success' : 'error'); if(window.walletResult) walletResult.textContent=formatProviderDebug(json.data); }catch(err){ setStatus(err.message || 'Debug failed.', 'error'); if(window.walletResult) walletResult.textContent='Debug error:\n' + (err.message || 'Debug failed') + '\n\nA FAILED GAME_LIST record is now saved automatically. Open Provider Transactions and filter Provider Code = ' + providerCode + ' and Tx Type = GAME_LIST.'; } }
  function walletStatus(message, type){
    if(!walletStatusBox) return;
    walletStatusBox.textContent = message || '';
    walletStatusBox.className = 'upload-status' + (type ? ' ' + type : '');
  }

  function walletInputs(){
    const memberId = Number(document.getElementById('walletMemberId')?.value || 0);
    const providerCode = (walletProviderCode?.value || '').trim();
    const providerId = Number(walletProviderCode?.selectedOptions?.[0]?.dataset?.providerId || 0);
    const amountRaw = (document.getElementById('walletAmount')?.value || '').trim();
    const gameCode = (document.getElementById('walletGameCode')?.value || '').trim();
    const previewAction = (document.getElementById('previewAction')?.value || 'CREATE_PLAYER').trim();
    return {
      memberId,
      providerCode,
      providerId,
      amount: amountRaw === '' ? null : Number(amountRaw),
      gameCode,
      action: previewAction
    };
  }

  async function wallet(action){
    const input = walletInputs();
    if(action !== 'pull-log-debug' && (!input.memberId || input.memberId < 1)){
      walletStatus('Please enter a valid Member ID.', 'error');
      return;
    }
    if(action !== 'main-balance' && !input.providerCode){
      walletStatus('Please select a provider.', 'error');
      return;
    }
    if((action === 'deposit' || action === 'withdraw') && (!(input.amount > 0) || !Number.isFinite(input.amount))){
      walletStatus('Please enter a transfer amount greater than 0.', 'error');
      return;
    }

    const labels = {
      'main-balance':'Checking main wallet...',
      'create-player':'Creating provider player...',
      'balance':'Checking provider balance...',
      'deposit':'Transferring to provider...',
      'withdraw':'Transferring back to main wallet...',
      'launch-sport':'Requesting launch URL...',
      'api-preview':'Generating API payload preview...',
      'pull-log-debug':'Running pull log / bet log debug...'
    };
    if(walletRequestsInFlight.has(action)) return;
    walletRequestsInFlight.add(action);
    setWalletActionBusy(action, true);
    const startedAt = performance.now();
    walletStatus(labels[action] || 'Processing...', '');
    if(walletResult) walletResult.textContent = '';

    try{
      let url;
      let options = {};
      const authHeaders = (window.BO_AUTH && BO_AUTH.authHeader) ? BO_AUTH.authHeader() : {};

      if(action === 'main-balance'){
        url = WALLET_API.mainBalance + '?memberId=' + encodeURIComponent(input.memberId);
        options = {headers: authHeaders};
      } else if(action === 'balance'){
        url = WALLET_API.balance
          + '?memberId=' + encodeURIComponent(input.memberId)
          + '&providerCode=' + encodeURIComponent(input.providerCode);
        options = {method:'GET', headers: authHeaders};
      } else if(action === 'pull-log-debug'){
        url = WALLET_API.pullLogDebug + '?providerCode=' + encodeURIComponent(input.providerCode);
        options = {method:'POST', headers: authHeaders};
      } else {
        const endpointMap = {
          'create-player': WALLET_API.createPlayer,
          'deposit': WALLET_API.deposit,
          'withdraw': WALLET_API.withdraw,
          'launch-sport': WALLET_API.launchSport,
          'api-preview': WALLET_API.apiPreview
        };
        url = endpointMap[action];
        if(!url) throw new Error('Unsupported debug action: ' + action);

        const data = new FormData();
        data.append('memberId', String(input.memberId));
        data.append('providerCode', input.providerCode.trim());
        if(input.gameCode) data.append('gameCode', input.gameCode);
        if(input.amount !== null && Number.isFinite(input.amount)) data.append('amount', String(input.amount));
        data.append('externalTxId', 'BO-' + Date.now());
        if(action === 'api-preview'){
          url += '?action=' + encodeURIComponent(input.action || 'CREATE_PLAYER');
        }
        options = {method:'POST', headers: authHeaders, body:data};
      }

      // Send the debug request immediately. Do not add a BO-side AbortController/timer
      // around provider diagnostics; the backend/provider client owns its network timeout.
      const json = await fetchJson(url, options);
      const data = Object.prototype.hasOwnProperty.call(json, 'data') ? json.data : json;
      const elapsedSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      walletStatus((json.message || 'Request completed successfully.') + ' (' + elapsedSeconds + 's)', 'success');
      if(walletResult) walletResult.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

      if(action === 'launch-sport'){
        const launchUrl = data && (data.launchUrl || data.url || data.gameUrl);
        if(launchUrl && /^https?:\/\//i.test(launchUrl)) window.open(launchUrl, '_blank', 'noopener');
      }
    }catch(err){
      const elapsedSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      const message = err.message || 'Request failed.';
      walletStatus(message + ' (' + elapsedSeconds + 's)', 'error');
      if(walletResult) walletResult.textContent = 'Error:\n' + message;
    } finally {
      walletRequestsInFlight.delete(action);
      setWalletActionBusy(action, false);
    }
  }


  async function callbackPreview(){ const code=document.getElementById('callbackProviderCode').value; const raw=document.getElementById('callbackSample').value || '{}'; const box=document.getElementById('callbackResult'); try{ const json=await fetchJson(CALLBACK_API.previewBase + '/' + encodeURIComponent(code), {method:'POST', headers:{'Content-Type':'application/json'}, body:raw}); box.textContent=JSON.stringify(json.data,null,2); }catch(err){ box.textContent=err.message || 'Callback preview failed'; } }
  async function ledgerSummary(){ const code=document.getElementById('callbackProviderCode').value; const from=document.getElementById('reportFrom').value; const to=document.getElementById('reportTo').value; const box=document.getElementById('callbackResult'); let url=CALLBACK_API.report + '?providerCode=' + encodeURIComponent(code); if(from) url += '&from=' + encodeURIComponent(from); if(to) url += '&to=' + encodeURIComponent(to); try{ const json=await fetchJson(url); box.textContent=JSON.stringify(json.data,null,2); }catch(err){ box.textContent=err.message || 'Report failed'; } }

  function openApiDebugTools(){
    if(!apiDebugToolsModal) return;
    apiDebugToolsModal.hidden = false;
    apiDebugToolsModal.setAttribute('aria-hidden', 'false');
    apiDebugToolsModal.classList.add('show');
    if(toggleApiDebugToolsBtn){
      toggleApiDebugToolsBtn.setAttribute('aria-expanded', 'true');
      toggleApiDebugToolsBtn.classList.add('is-active');
    }
    document.body.classList.add('modal-open');
    const firstField = document.getElementById('walletMemberId');
    if(firstField) setTimeout(() => firstField.focus(), 40);
  }
  function closeApiDebugTools(){
    if(!apiDebugToolsModal) return;
    apiDebugToolsModal.classList.remove('show');
    apiDebugToolsModal.setAttribute('aria-hidden', 'true');
    apiDebugToolsModal.hidden = true;
    if(toggleApiDebugToolsBtn){
      toggleApiDebugToolsBtn.setAttribute('aria-expanded', 'false');
      toggleApiDebugToolsBtn.classList.remove('is-active');
      toggleApiDebugToolsBtn.focus();
    }
    document.body.classList.remove('modal-open');
  }
  function toggleApiDebugTools(){
    if(!apiDebugToolsModal) return;
    if(apiDebugToolsModal.classList.contains('show')) closeApiDebugTools();
    else openApiDebugTools();
  }
  function formatActionConfig(){
    if(!el.apiActionConfigs) return;
    try{ el.apiActionConfigs.value = JSON.stringify(JSON.parse(el.apiActionConfigs.value || '{}'), null, 2); syncWalletFlowFromJson(); syncWithdrawNegativeFromJson(); syncPullLogTimingFromJson(); setStatus('API Action Configs JSON formatted.', 'success'); }
    catch(err){ setStatus('API Action Configs JSON invalid: ' + err.message, 'error'); }
  }

  if(form) form.addEventListener('submit', save);
  const toggleBoPasswordBtn=document.getElementById('toggleBoPasswordBtn'); if(toggleBoPasswordBtn && el.boPassword) toggleBoPasswordBtn.addEventListener('click', ()=>{ const show=el.boPassword.type==='password'; el.boPassword.type=show?'text':'password'; toggleBoPasswordBtn.innerHTML=show?'<i class="bi bi-eye-slash"></i>':'<i class="bi bi-eye"></i>'; });
  if(el.apiActionConfigs) el.apiActionConfigs.addEventListener('input', () => { syncWalletFlowFromJson(); syncWithdrawNegativeFromJson(); syncPullLogTimingFromJson(); }); if(walletFlow) walletFlow.addEventListener('change', () => { try{ syncWalletFlowToJson(); }catch(err){ setStatus('API Action Configs JSON invalid: ' + err.message, 'error'); } }); if(withdrawNegativeAmount) withdrawNegativeAmount.addEventListener('change', () => { try{ syncWithdrawNegativeToJson(); }catch(err){ setStatus('API Action Configs JSON invalid: ' + err.message, 'error'); } });
  if(pullLogTimingEnabled) pullLogTimingEnabled.addEventListener('change', syncPullLogTimingToJson); [pullLogWindowValue,pullLogWindowUnit,pullLogEndDelaySeconds,pullLogTimezone,pullLogDateTimeFormat].filter(Boolean).forEach(node => node.addEventListener('change', () => { if(pullLogTimingEnabled?.checked) syncPullLogTimingToJson(); })); const formatActionBtn=document.getElementById('formatActionConfigBtn'); if(formatActionBtn) formatActionBtn.addEventListener('click', formatActionConfig); if(resetBtn) resetBtn.addEventListener('click', reset); if(toggleApiDebugToolsBtn) toggleApiDebugToolsBtn.addEventListener('click', openApiDebugTools); if(closeApiDebugToolsBtn) closeApiDebugToolsBtn.addEventListener('click', closeApiDebugTools); if(apiDebugToolsModal){ apiDebugToolsModal.addEventListener('click', e => { if(e.target === apiDebugToolsModal) closeApiDebugTools(); }); } document.addEventListener('keydown', e => { if(e.key === 'Escape' && apiDebugToolsModal && apiDebugToolsModal.classList.contains('show')) closeApiDebugTools(); }); if(providerSearchInput){ providerSearchInput.addEventListener('input', render); providerSearchInput.addEventListener('search', render); } if(list) list.addEventListener('click', async e => {
    const foldBtn=e.target.closest('[data-provider-fold]');
    if(foldBtn){
      const card=foldBtn.closest('.provider-card');
      const panel=card && card.querySelector('[data-provider-fold-panel]');
      const open=foldBtn.getAttribute('aria-expanded')!=='false';
      foldBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
      if(card) card.classList.toggle('is-fold-collapsed', open);
      if(panel) panel.hidden=open;
      return;
    }
    const eb=e.target.closest('[data-edit-id]'), db=e.target.closest('[data-delete-id]'), rb=e.target.closest('[data-reveal-password-id]'), cb=e.target.closest('[data-copy-password-id]'), ct=e.target.closest('[data-copy-text]');
    if(eb){ editFresh(eb.dataset.editId, eb); }
    if(db) remove(db.dataset.deleteId);
    if(rb){
      const item=rows.find(x=>String(x.id)===String(rb.dataset.revealPasswordId));
      const target=list.querySelector('[data-provider-password-id="'+CSS.escape(String(rb.dataset.revealPasswordId))+'"]');
      if(item && target){
        const currentlyRevealed=rb.dataset.revealed==='1';
        target.textContent=currentlyRevealed ? maskCredential(item.boPassword || item.bo_password || '') : (item.boPassword || item.bo_password || '-');
        rb.dataset.revealed=currentlyRevealed?'0':'1';
        rb.innerHTML=currentlyRevealed?'<i class="bi bi-eye" aria-hidden="true"></i><span>Reveal</span>':'<i class="bi bi-eye-slash" aria-hidden="true"></i><span>Hide</span>';
      }
    }
    if(cb){
      const item=rows.find(x=>String(x.id)===String(cb.dataset.copyPasswordId));
      const password=item && (item.boPassword || item.bo_password || '');
      if(password){
        try{ await navigator.clipboard.writeText(password); setStatus('Provider BO password copied.', 'success'); }
        catch(_){ setStatus('Unable to copy password. Use Reveal and copy manually.', 'error'); }
      }
    }
    if(ct){
      const value = ct.getAttribute('data-copy-text') || '';
      if(value){
        try{ await navigator.clipboard.writeText(value); setStatus('Copied.', 'success'); }
        catch(_){ setStatus('Unable to copy.', 'error'); }
      }
    }
  }); document.querySelectorAll('[data-wallet-action]').forEach(btn => btn.addEventListener('click', () => wallet(btn.dataset.walletAction))); const syncBtn=document.getElementById('syncSelectedProviderBtn'); if(syncBtn) syncBtn.addEventListener('click', syncGames); const debugBtn=document.getElementById('debugSelectedProviderBtn'); if(debugBtn) debugBtn.addEventListener('click', debugGames); const cbBtn=document.getElementById('callbackPreviewBtn'); if(cbBtn) cbBtn.addEventListener('click', callbackPreview); const reportBtn=document.getElementById('ledgerSummaryBtn'); if(reportBtn) reportBtn.addEventListener('click', ledgerSummary); if(form) reset(); load();
})();

(function(){
  function api(pathKey){ return API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS[pathKey]; }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  document.addEventListener('DOMContentLoaded', function(){
    const btn = document.getElementById('playerLaunchTestBtn');
    if(!btn) return;
    btn.addEventListener('click', async function(){
      const result = document.getElementById('playerLaunchResult');
      const token = (document.getElementById('playerLaunchToken')?.value || '').trim();
      let body = {};
      try { body = JSON.parse(document.getElementById('playerLaunchBody')?.value || '{}'); }
      catch(e){ result.textContent = 'Invalid JSON body: ' + e.message; return; }
      if(!token){ result.textContent = 'Please paste member JWT token. This API is for frontend player, not admin token.'; return; }
      result.textContent = 'Launching...';
      try{
        const res = await fetch(api('PLAYER_PROVIDER_LAUNCH'), {
          method:'POST',
          headers:{'Content-Type':'application/json', 'Authorization':'Bearer ' + token},
          body: JSON.stringify(body)
        });
        const json = await res.json().catch(()=>({}));
        result.textContent = JSON.stringify(json, null, 2);
      }catch(err){ result.textContent = err.message || 'Launch test failed'; }
    });
  });
})();
})();
