(function(){
  // Apply the authenticated admin identity to every BO API request. This keeps
  // legacy pages covered by the central Spring Boot admin-operation audit trail
  // without changing each working page one by one.
  (function installAdminAuditHeaders(){
    if(window.__boAdminAuditFetchInstalled || !window.fetch) return;
    window.__boAdminAuditFetchInstalled = true;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = function(input, init){
      init = init ? Object.assign({}, init) : {};
      let url = '';
      try { url = typeof input === 'string' ? input : (input && input.url) || ''; } catch(e){}
      let isApi = false;
      try {
        const absolute = new URL(url, location.href);
        const configuredBase = window.API_CONFIG && API_CONFIG.BASE_URL ? new URL(API_CONFIG.BASE_URL, location.href) : null;
        isApi = absolute.pathname.indexOf('/api/') !== -1 && (!configuredBase || absolute.origin === configuredBase.origin);
      } catch(e) { isApi = String(url).indexOf('/api/') !== -1; }
      if(isApi && String(url).indexOf('/api/auth/admin/login') === -1){
        const headers = new Headers(init.headers || (input && input.headers) || {});
        const token = localStorage.getItem('bo_admin_token') || '';
        let user = {};
        try { user = JSON.parse(localStorage.getItem('bo_admin_user') || '{}'); } catch(e){}
        if(token && !headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + token);
        if(user && user.username && !headers.has('X-Admin-Username')) headers.set('X-Admin-Username', String(user.username));
        if(!headers.has('X-Request-Id')) headers.set('X-Request-Id', 'bo-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10));

        // Attach a compact, sanitized business context so the backend audit log can
        // say exactly which game/member/configuration was changed. This is metadata
        // only and never changes the original request body or API behavior.
        try {
          const method = String(init.method || (input && input.method) || 'GET').toUpperCase();
          if(method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && !headers.has('X-Admin-Audit-Context')){
            const sensitive = /password|token|authorization|secret|signature|api.?key|transaction.?password|pin/i;
            const useful = {};
            const put = function(k,v){
              if(!k || sensitive.test(k) || v == null || v === '' || typeof v === 'object') return;
              const text = String(v);
              useful[k] = text.length > 300 ? text.slice(0,300) : text;
            };
            const body = init.body;
            if(typeof body === 'string'){
              try {
                const parsed = JSON.parse(body);
                if(parsed && typeof parsed === 'object' && !Array.isArray(parsed)) Object.keys(parsed).forEach(k=>put(k, parsed[k]));
              } catch(e){}
            } else if(window.FormData && body instanceof FormData){
              body.forEach((v,k)=>{ if(!(window.File && v instanceof File)) put(k,v); });
            } else if(window.URLSearchParams && body instanceof URLSearchParams){
              body.forEach((v,k)=>put(k,v));
            }
            const absolute = new URL(url, location.href);
            const context = {
              page: (document.title || '').trim(),
              pathname: absolute.pathname,
              fields: useful
            };
            const raw = JSON.stringify(context);
            if(raw.length < 6000) headers.set('X-Admin-Audit-Context', encodeURIComponent(raw));
          }
        } catch(e){}
        init.headers = headers;
      }
      return nativeFetch(input, init);
    };
  })();
  function api(pathKey){ return API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS[pathKey]; }
  function initials(name){
    name = (name || 'A').trim();
    return (name.charAt(0) || 'A').toUpperCase();
  }
  function displayName(user){ return (user && (user.displayName || user.username)) || 'Admin'; }
  function roleLabel(user){
    user = user || {};
    if(user.roleName) return String(user.roleName);
    const type = String(user.roleType || '').toUpperCase();
    if(user.rootAdmin === true || Number(user.rootAdmin) === 1 || type === 'ROOT') return 'Root Account';
    if(type === 'MAIN' || user.mainAdmin === true || Number(user.mainAdmin) === 1) return 'Main Account';
    if(type === 'MASTER') return 'Master Account';
    if(type === 'BRAND_OWNER') return 'Brand Owner';
    if(user.role) return String(user.role);
    return 'Admin';
  }
  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function pageFile(name){
    // Normalize cleanUrls (/main-dashboard) and .html paths to the same file id.
    // Without this, `serve` cleanUrls + menu urls like main-dashboard.html loop forever.
    let file = String(name == null ? '' : name).split('/').pop().split('?')[0].split('#')[0].trim();
    if(!file || file === '.' || file === '..') file = 'index.html';
    if(file === '#') return '#';
    if(!/\.[a-z0-9]+$/i.test(file)) file += '.html';
    return file;
  }
  function pageName(){
    return pageFile(location.pathname || '');
  }
  function sidebarActivePage(){
    const p=pageName();
    if(p==='main-balance-adjustment.html') return 'main-balance-overview.html';
    if(p==='main-provider-settlement.html' || p==='main-provider-balance.html' || p==='main-provider-transactions.html') return 'main_provider_report.html';
    if(p==='main-merchant-balance.html' || p==='main-merchant-transactions.html') return 'main_merchant_report.html';
    if(p==='brand-detail.html') return 'brand-management.html';
    if(p==='member-detail.html') return 'index.html';
    if(p==='provider-detail.html') return 'main-accounting-report.html';
    if(p==='slider-edit.html') return 'slider.html';
    if(p==='promotion-edit.html') return 'promotion.html';
    if(p==='vip-level-edit.html') return 'vip-management.html';
    // Game Category create/edit is a drill-down of Game Category Management.
    if(p==='game-category-edit.html') return 'game-category.html';
    // Game Sub Category create/edit is a drill-down of Game Sub Category Management.
    if(p==='game-sub-category-edit.html') return 'game-sub-category.html';
    // Gateway Transactions is a drill-down of Payment Gateway and uses the same DB menu permission.
    if(p==='payment-gateway-transactions.html') return 'payment-gateway.html';
    if(p==='manual-rebate-detail.html') return 'manual-rebate-approval.html';
    // Merchant module drill-downs keep the Merchant sidebar item highlighted.
    if(p==='main-merchant-create.html' || p==='main-merchant-credit.html' || p==='main-merchant-profit.html' || p==='main-merchant-profit-record.html' || p==='main-merchant-repayments.html' || p==='main-merchant-settlement.html' || p==='merchant-profit.html'){
      return 'main-merchant-detail.html';
    }
    // Roles & Permissions (3.2) and Security & Audit (3.4) have their OWN Merchant submenu
    // entries, so aliasing them to Merchants pointed the highlight at a different page than the
    // one you were on. The admin side never aliased main-admin-security.html; this matches it.
    // Create Role is a child of Roles, so it follows that entry �?as the admin side maps
    // main-admin-role-create.html to menu-permission.html rather than to its detail page.
    if(p==='main-merchant-role-create.html') return 'main-merchant-roles.html';
    // Admin module drill-downs keep the Admin Details item highlighted.
    if(p==='main-admin-create.html' || p==='main-admin-edit.html' || p==='main-admin-credit.html'){
      return 'main-admin-detail.html';
    }
    // Provider module drill-downs keep the Providers item highlighted.
    if(p==='main-provider-create.html' || p==='main-provider-endpoints.html' || p==='main-provider-credentials.html' || p==='main-provider-health.html'){
      return 'main-provider-detail.html';
    }
    // Game Provider create/edit is a drill-down of Game Provider Management.
    if(p==='game-provider-create.html') return 'game-provider.html';
    return p;
  }

  // Sidebar group metadata is loaded from the database only via /admin/access/menu-groups.
  // Do not define, seed or repair sidebar groups in frontend code.
  const GROUP_META = window.BO_MENU_GROUP_META = {};

  function canonicalMenuUrl(menuKey, rawUrl){
    // Database Menu Management is authoritative. Never rewrite a configured menu URL in the sidebar.
    return String(rawUrl || '').trim();
  }

  // Report group keeps only Win/Lose Report + Provider Report in the sidebar.
  const REPORT_SIDEBAR_REMOVED = {
    'main-provider-settlement.html':1,
    'main-provider-balance.html':1,
    'main-provider-transactions.html':1,
    'main_merchant_report.html':1,
    'main-merchant-settlement.html':1,
    'main-merchant-balance.html':1,
    'main-merchant-transactions.html':1,
    'main-settlement-report.html':1,
    'main-balance-overview.html':1
  };
  const REPORT_SIDEBAR_TITLES = {
    'main-win-lose-report.html':'Win/Lose Report',
    'win-lose-report.html':'Win/Lose Report',
    'main_provider_report.html':'Provider Report'
  };

  function normalizeMenu(m){
    const menuKey = String((m && (m.menuKey || m.key)) || '');
    const url = canonicalMenuUrl(menuKey, (m && (m.url || m.href)) || '#');
    const file = String(url || '').split('/').pop().split('?')[0].toLowerCase();
    const forcedTitle = REPORT_SIDEBAR_TITLES[file];
    return {
      id: m && m.id,
      menuKey: menuKey,
      title: forcedTitle || String((m && (m.title || m.name)) || 'Menu'),
      url: url,
      icon: String((m && m.icon) || 'bi-circle'),
      parentKey: String((m && m.parentKey) || ''),
      sortOrder: Number((m && m.sortOrder) || 0),
      status: Number((m && (m.status == null ? 1 : m.status))),
      showInSidebar: Number((m && (m.showInSidebar == null ? 1 : m.showInSidebar)))
    };
  }

  function menuLinkHtml(m, isSub, forceActive, railLabel){
    const href = esc(m.url || '#');
    // forceActive boolean: caller resolved duplicate URLs (first menu match wins).
    const isActive = typeof forceActive === 'boolean'
      ? forceActive
      : pageFile(sidebarActivePage()) === pageFile(m.url || '');
    const cls = (isSub ? 'report-sub ' : '') + (isActive ? 'active' : '');
    const pinned = new Set((window.__boUiSetting&&Array.isArray(window.__boUiSetting.headerMenuKeys))?window.__boUiSetting.headerMenuKeys:[]).has(m.menuKey);
    // Dashboard pin controls belong to the normal BO only. Main/Executive panel
    // pages must retain their original sidebar without pin/unpin UI.
    const currentFile = pageFile(location.pathname);
    let sidebarViewer = {};
    try { sidebarViewer = JSON.parse(localStorage.getItem('bo_admin_user') || '{}') || {}; } catch(e) {}
    const sidebarRoleType = String(sidebarViewer.roleType || '').toUpperCase();
    const isMainAccount = sidebarRoleType === 'MAIN' || sidebarViewer.mainAdmin === true || Number(sidebarViewer.mainAdmin) === 1;
    // Some MAIN pages intentionally reuse the exact same HTML as BO (for example
    // menu-management.html), so filename-only detection is not sufficient. Hide
    // Dashboard pin controls by authenticated account type as well as main-* page name.
    const isMainPanel = isMainAccount || /^main[-_]/i.test(currentFile);
    const pinHtml = isMainPanel ? '' :
      '<button type="button" class="bo-sidebar-pin '+(pinned?'is-pinned':'')+'" data-bo-pin-menu="'+esc(m.menuKey)+'" title="'+(pinned?'Unpin from Dashboard':'Pin to Dashboard')+'" aria-label="'+(pinned?'Unpin from Dashboard':'Pin to Dashboard')+'"><i class="bi '+(pinned?'bi-pin-angle-fill':'bi-pin-angle')+'"></i></button>';
    // A top-level page row has no panel of its own, so its label travels in the
    // attribute and is painted by the rail label panel while the sidebar is collapsed.
    const railAttr = railLabel ? ' data-rail-label="' + esc(m.title) + '"' : '';
    return '<a href="' + href + '" class="' + cls.trim() + '" data-menu-key="' + esc(m.menuKey) + '"' + railAttr + '>' +
      '<span><i class="bi ' + esc(m.icon || 'bi-circle') + ' me-2"></i>' + esc(m.title) + '</span>' + pinHtml + '</a>';
  }

  window.BO_AUTH = {
    tokenKey: 'bo_admin_token',
    userKey: 'bo_admin_user',
    token: function(){ return localStorage.getItem(this.tokenKey) || ''; },
    user: function(){ try { return JSON.parse(localStorage.getItem(this.userKey) || '{}'); } catch(e){ return {}; } },
    save: function(json){ localStorage.setItem(this.tokenKey, json.token || ''); localStorage.setItem(this.userKey, JSON.stringify(json.data || {})); try{sessionStorage.setItem('bo_admin_me_refreshed_at',String(Date.now()));}catch(e){} },
    saveUser: function(user){ localStorage.setItem(this.userKey, JSON.stringify(user || {})); this.renderProfile(); this.renderSidebar(user); },
    logout: function(){ try{ const t=localStorage.getItem(this.tokenKey); if(t) fetch(API_CONFIG.BASE_URL + '/auth/admin/logout',{method:'POST',headers:{'Authorization':'Bearer '+t},keepalive:true}).catch(()=>{}); }catch(e){} localStorage.removeItem(this.tokenKey); localStorage.removeItem(this.userKey); try{ sessionStorage.removeItem('bo_operation_login_marker'); sessionStorage.removeItem('bo_operation_login_played'); sessionStorage.removeItem('bo_admin_me_refreshed_at'); sessionStorage.removeItem('bo_brand_context_cache_v3'); }catch(e){} window.location.href = 'login.html'; },
    requireLogin: function(){
      if(!this.token() && pageName() !== 'login.html'){
        // Preserve the BO page the admin explicitly requested. Previously a direct
        // visit such as payment-gateway.html was lost when login.html opened, because
        // admin-login.js always sent the user to the first sidebar menu after login.
        // Keep only a local BO path (no origin) and let the destination page run the
        // normal ROOT-managed menu permission check after authentication.
        try{
          const requested=(location.pathname||'').split('/').pop() + (location.search||'') + (location.hash||'');
          if(requested && !/^login\.html(?:[?#]|$)/i.test(requested)) sessionStorage.setItem('bo_login_return_to',requested);
        }catch(e){}
        window.location.href = 'login.html';
      }
    },
    allowedMenus: function(user){
      user = user || this.user();
      // ROOT Menu Management + Role/Menu Permission are authoritative.
      // Do not hide a menu here based on role type after ROOT explicitly assigned it.
      return (Array.isArray(user && user.menus) ? user.menus : [])
        .map(normalizeMenu)
        .filter(function(m){
          return m.status === 1 && m.url && m.url !== '#';
        })
        .sort(function(a,b){ return a.sortOrder - b.sortOrder || a.title.localeCompare(b.title); });
    },
    landingPage: function(user){
      user = user || this.user();
      const menus = this.allowedMenus(user);
      // ROOT-configured menu sort order is authoritative for every role, including MAIN/Boss.
      // Do not impose a frontend MAIN landing-page allowlist/order.
      return menus.length ? menus[0].url : 'profile.html';
    },
    enforcePageAccess: function(user){
      user = user || this.user();
      // ROOT is the unrestricted platform owner. ROOT must never depend on
      // admin_role_menu assignments to open BO pages; role/menu assignments are
      // for accounts that ROOT manages (MASTER/MAIN/brand/custom roles). Backend
      // authorization already treats ROOT as unrestricted as well.
      const roleType = String((user && user.roleType) || '').toUpperCase();
      if((user && user.rootAdmin === true) || roleType === 'ROOT') return true;
      let current = pageName();
      // Agent detail inherits Agents access. Agent Management sub-pages keep their
      // own permission so a Master can be granted Commission/Settlement/etc.
      // independently. Legacy agent_management permission remains a fallback below.
      if(current === 'agent-detail.html') current = 'agent-management.html';
      // Brand Detail is a drill-down of Brand Management and has no separate sidebar permission.
      // Inherit Brand Management access so MAIN/Boss users with Brands permission are not redirected.
      if(current === 'brand-detail.html') current = 'brand-management.html';
      // Member Detail / Wallet is a drill-down of User Management (index.html).
      if(current === 'member-detail.html') current = 'index.html';
      if(current === 'provider-detail.html') current = 'main-accounting-report.html';
      // Create/Edit Banner is a drill-down of Banner Management.
      if(current === 'slider-edit.html') current = 'slider.html';
      // Promotion create/edit is a drill-down of Promotion Bonus listing.
      if(current === 'promotion-edit.html') current = 'promotion.html';
      // VIP Level create/edit is a drill-down of VIP Management.
      if(current === 'vip-level-edit.html') current = 'vip-management.html';
      // Game Category create/edit inherits Game Category Management menu permission.
      if(current === 'game-category-edit.html') current = 'game-category.html';
      // Game Sub Category create/edit inherits Game Sub Category Management menu permission.
      if(current === 'game-sub-category-edit.html') current = 'game-sub-category.html';
      // Bonus Category Item is a drill-down of Bonus Category Title (Manage Items).
      if(current === 'bonus-category-item.html') current = 'bonus-category-title.html';
      // Transaction history is intentionally a separate page, but it inherits the
      // Payment Gateway menu selected in ROOT Role/Menu Permission. No new hardcoded
      // permission/menu row is required for this drill-down.
      if(current === 'payment-gateway-transactions.html') current = 'payment-gateway.html';
      // Rebate Detail is a drill-down of Manual Rebate Approval.
      if(current === 'manual-rebate-detail.html') current = 'manual-rebate-approval.html';
      // Create/Edit Payment Method is a drill-down page, not a standalone sidebar menu.
      // Inherit the page the admin opened it from so Bank Deposit Usage users are not
      // incorrectly redirected to their landing page, while Payment Method Config keeps
      // using its own ROOT-assigned permission.
      if(current === 'payment-method-create.html'){
        let pmSource = '';
        try { pmSource = String(new URLSearchParams(location.search || '').get('from') || '').toLowerCase(); } catch(e) {}
        current = pmSource === 'usage' ? 'bank-deposit-usage.html' : 'payment-method.html';
      }
      if(current === 'main-balance-adjustment.html') current = 'main-balance-overview.html';
      // Agent Performance Detail is a drill-down page of Agent Performance Report.
      // It has no separate sidebar/menu permission, so inherit the report permission
      // instead of redirecting the user to their landing page.
      if(current === 'agent-performance-detail.html') current = 'agent-performance-report.html';
      // Create/Edit Admin / Security & Audit are drill-downs of Main Admin Detail.
      // Admin Credit Control page is retired; old bookmarks redirect via main-admin-credit.html.
      if(current === 'main-admin-create.html') current = 'main-admin-detail.html';
      if(current === 'main-admin-edit.html') current = 'main-admin-detail.html';
      if(current === 'main-admin-credit.html') current = 'main-admin-detail.html';
      if(current === 'main-admin-security.html') current = 'main-admin-detail.html';
      if(current === 'main-admin-role-create.html') current = 'menu-permission.html';
      // Access Control: Admin create/edit is a drill-down of Admin Management, and the
      // permission-group create/edit page is a drill-down of Role Management. Same
      // contract as every alias above: inherit the listing's menu permission so a
      // non-ROOT admin is not redirected to their landing page.
      if(current === 'admin-user-create.html') current = 'admin-user.html';
      if(current === 'role-create.html') current = 'role.html';
      // Merchant create / security / roles are drill-downs of Main Merchant Detail.
      // Merchant Credit Control page is retired; old bookmarks redirect via main-merchant-credit.html.
      if(current === 'main-merchant-create.html') current = 'main-merchant-detail.html';
      if(current === 'main-merchant-credit.html') current = 'main-merchant-detail.html';
      if(current === 'main-merchant-security.html') current = 'main-merchant-detail.html';
      if(current === 'main-merchant-roles.html') current = 'main-merchant-detail.html';
      if(current === 'main-merchant-role-create.html') current = 'main-merchant-detail.html';
      if(current === 'main-merchant-profit.html') current = 'main-merchant-detail.html';
      if(current === 'main-merchant-profit-record.html') current = 'main-merchant-detail.html';
      if(current === 'main-merchant-repayments.html') current = 'main-merchant-detail.html';
      if(current === 'main-merchant-settlement.html') current = 'main-merchant-detail.html';
      if(current === 'merchant-profit.html') current = 'main-merchant-detail.html';
      // Provider create / rate rules / settlement / activity logs are drill-downs of Providers.
      if(current === 'main-provider-create.html') current = 'main-provider-detail.html';
      if(current === 'main-provider-endpoints.html') current = 'main-provider-detail.html';
      if(current === 'main-provider-credentials.html') current = 'main-provider-detail.html';
      if(current === 'main-provider-health.html') current = 'main-provider-detail.html';
      // Game Provider create/edit inherits Game Provider Management menu permission.
      if(current === 'game-provider-create.html') current = 'game-provider.html';
      const agentChildPages = new Set([
        'agent-commission-admin.html','agent-settlement-admin.html','agent-reimbursement-admin.html',
        'agent-payout-admin.html','agent-promotion-admin.html'
      ]);
      const requestedAgentChild = agentChildPages.has(pageName());
      const requestedMainAdminDetail = pageName() === 'main-admin-detail.html' || pageName() === 'main-admin-create.html' || pageName() === 'main-admin-edit.html';
      const requestedMainMerchantDetail = pageName() === 'main-merchant-detail.html' || pageName() === 'main-merchant-create.html' || pageName() === 'main-merchant-credit.html' || pageName() === 'main-merchant-security.html' || pageName() === 'main-merchant-roles.html' || pageName() === 'main-merchant-role-create.html' || pageName() === 'main-merchant-profit.html' || pageName() === 'main-merchant-profit-record.html' || pageName() === 'main-merchant-repayments.html' || pageName() === 'main-merchant-settlement.html' || pageName() === 'merchant-profit.html';
      const requestedMainProviderDetail = pageName() === 'main-provider-detail.html' || pageName() === 'main-provider-create.html' || pageName() === 'main-provider-endpoints.html' || pageName() === 'main-provider-credentials.html' || pageName() === 'main-provider-health.html';
      if(current === 'main-stat-detail.html'){
        let source = '';
        try { source = String(new URLSearchParams(location.search || '').get('source') || 'overview').toLowerCase(); } catch(e) {}
        current = (source && source !== 'overview') ? 'main-accounting-report.html' : 'main-dashboard.html';
      }
      const alwaysAllowed = ['profile.html','change-password.html','rebate-management.html','animation-effect.html'];
      if(alwaysAllowed.indexOf(current) !== -1) return true;
      const menus = this.allowedMenus(user);
      if(!menus.length){
        // A valid authenticated admin may temporarily have no assigned BO menu (for example
        // a legacy delegated CS account while ROOT permissions are being adjusted). Do not
        // destroy the valid session and bounce back to login; keep the account signed in on
        // the always-available profile page until a menu is assigned.
        if(current !== 'profile.html') window.location.replace('profile.html');
        return current === 'profile.html';
      }
      let allowed = menus.some(function(m){ return pageFile(m.url || '') === current; });
      // Bonus Category Item may be assigned as its own menu row, or only opened via
      // Manage Items from Bonus Category Title. Allow either permission.
      if(!allowed && pageName() === 'bonus-category-item.html'){
        allowed = menus.some(function(m){
          const file = pageFile(m.url || '');
          return file === 'bonus-category-item.html' || file === 'bonus-category-title.html';
        });
      }
      // Backward compatibility: older roles may only have the original
      // agent_management menu. That parent permission is allowed to open the new
      // Agent Management child pages, while newly configured roles can grant each
      // child page separately.
      if(!allowed && requestedAgentChild){
        allowed = menus.some(function(m){ return String(m.menuKey || '').toLowerCase() === 'agent_management'; });
      }
      // MAIN Admin Detail inherits legacy Admin Management permission when the
      // dedicated main_admin_detail menu row is not yet assigned.
      if(!allowed && requestedMainAdminDetail){
        allowed = menus.some(function(m){
          const key = String(m.menuKey || '').toLowerCase();
          return key === 'admin' || key === 'main_admin_detail' || key === 'admin_detail';
        });
      }
      if(!allowed && requestedMainMerchantDetail){
        allowed = menus.some(function(m){
          const key = String(m.menuKey || '').toLowerCase();
          return key === 'main_merchant_detail' || key === 'merchant_detail' || key === 'merchant';
        });
      }
      if(!allowed && requestedMainProviderDetail){
        allowed = menus.some(function(m){
          const key = String(m.menuKey || '').toLowerCase();
          const file = String(m.url || '').split('/').pop().split('?')[0].toLowerCase();
          return key === 'main_provider_detail' || key === 'provider_detail' || file === 'main-provider-detail.html';
        });
      }
      // Win/Lose Report and Provider Report are sibling tabs of one Report workspace.
      // A role configured with either entry may open both tabs, so changing the DB menu
      // URL between the two does not make the other tab disappear or redirect away.
      if(!allowed && (pageName() === 'main-win-lose-report.html' || pageName() === 'win-lose-report.html' || pageName() === 'main_provider_report.html')){
        allowed = menus.some(function(m){
          const file = String(m.url || '').split('/').pop().split('?')[0].toLowerCase();
          const key = String(m.menuKey || '').toLowerCase();
          return file === 'main-win-lose-report.html' || file === 'win-lose-report.html' || file === 'main_provider_report.html' || key === 'main_provider_report' || key === 'main_win_lose_report';
        });
      }
      if(!allowed){
        const landing = this.landingPage(user);
        const landingFile = pageFile(landing);
        // Always navigate to the .html file so static hosts without cleanUrls work,
        // and so cleanUrls hosts do not bounce between /page and /page.html forever.
        if(landingFile && landingFile !== '#' && landingFile !== current){
          window.location.replace(landingFile);
        }
        return false;
      }
      return true;
    },
    authHeader: function(){ return this.token() ? {'Authorization':'Bearer ' + this.token()} : {}; },
    loginUrl: function(){ return api('AUTH_ADMIN_LOGIN'); },
    createAdminUrl: function(){ return api('AUTH_ADMIN_CREATE'); },
    adminMeUrl: function(){ return api('AUTH_ADMIN_ME'); },
    adminListUrl: function(){ return api('AUTH_ADMIN_LIST'); },
    adminLoginLogsUrl: function(){ return api('AUTH_ADMIN_LOGIN_LOGS'); },
    adminUpdateUrl: function(id){ return api('AUTH_ADMIN_UPDATE') + '/' + id; },
    adminDeleteUrl: function(id){ return api('AUTH_ADMIN_DELETE') + '/' + id; },
    profileUpdateUrl: function(){ return api('AUTH_ADMIN_PROFILE_UPDATE'); },
    changePasswordUrl: function(){ return api('AUTH_ADMIN_CHANGE_PASSWORD'); },
    roleListUrl: function(){ return api('ROLE_LIST'); },
    roleListAllUrl: function(){ return API_CONFIG.BASE_URL + (API_CONFIG.ENDPOINTS.ROLE_LIST_ALL || "/admin/access/roles/all"); },
    roleSaveUrl: function(){ return api('ROLE_SAVE'); },
    roleDeleteUrl: function(id){ return api('ROLE_DELETE') + '/' + id + '/delete'; },
    menuListUrl: function(){ return api('MENU_LIST'); },
    menuListAllUrl: function(){ return api('MENU_LIST_ALL'); },
    menuSaveUrl: function(){ return api('MENU_SAVE'); },
    menuGroupListUrl: function(){ return api('MENU_GROUP_LIST'); },
    menuGroupListAllUrl: function(){ return api('MENU_GROUP_LIST_ALL'); },
    menuGroupSaveUrl: function(){ return api('MENU_GROUP_SAVE'); },
    menuGroupDeleteUrl: function(id){ return api('MENU_GROUP_DELETE') + '/' + id + '/delete'; },
    roleMenusUrl: function(roleId){ return API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.ROLE_MENU_GET + '/' + roleId + '/menus'; },
    memberListUrl: function(){ return api('MEMBER_LIST'); },
    memberCreateUrl: function(){ return api('MEMBER_CREATE'); },
    memberUpdateUrl: function(id){ return api('MEMBER_UPDATE') + '/' + id; },
    loadMenuGroups: async function(){
      if(!this.token()) return [];
      try{
        const res=await fetch(this.menuGroupListUrl(),{headers:{...this.authHeader()},cache:'no-store'});
        const json=await res.json().catch(function(){return {};});
        if(!res.ok||json.status==='error')return [];
        const list=Array.isArray(json.data)?json.data:[];
        Object.keys(GROUP_META).forEach(function(key){ delete GROUP_META[key]; });
        list.forEach(function(g){
          const key=String(g.groupKey||'').trim(); if(!key)return;
          GROUP_META[key]={title:String(g.title||key),icon:String(g.icon||'bi-folder'),sortOrder:Number(g.sortOrder||0),status:Number(g.status==null?1:g.status)};
        });
        return list;
      }catch(e){return [];}
    },
    refreshMe: async function(force){
      if(!this.token()) return null;
      const cached=this.user();
      try{
        // Always re-read the authoritative DB-backed menu assignment. Menu parent/order/permission
        // changes made by ROOT must be reflected immediately after navigation/refresh.
        const [res] = await Promise.all([
          fetch(this.adminMeUrl(), {headers: {...this.authHeader()}, cache:'no-store'}),
          this.loadMenuGroups()
        ]);
        const json = await res.json().catch(() => ({}));
        if(res.ok && json.status !== 'error' && json.data){
          this.saveUser(json.data);
          this.enforcePageAccess(json.data);
          return json.data;
        }
        if(json.message === 'Unauthorized') this.logout();
      }catch(e){}
      // Keep profile/session usable on a transient request failure. Still paint the last
      // DB-backed menus from localStorage �?do not invent menus, but do not leave .report-nav blank.
      if(cached && cached.username){
        this.renderSidebar(cached);
        this.enforcePageAccess(cached);
      }
      return cached;
    },
    applyMenuPermission: function(user){
      // Backward compatible function name. Sidebar is now fully rendered from allowed menus.
      this.renderSidebar(user || this.user());
    },
    renderSidebar: function(user){
      // Pin controls exist on every normal BO sidebar, not only dashboard.html.
      // Load their isolated stylesheet before rendering so page-specific/native button
      // styles can never turn the pin icon into a bordered/background button.
      if(!document.querySelector('link[data-bo-quicknav-css]')){
        const pinCss=document.createElement('link');
        pinCss.rel='stylesheet';
        pinCss.href='assets/css/bo-global-quicknav.css?v=c84f0546';
        pinCss.dataset.boQuicknavCss='1';
        document.head.appendChild(pinCss);
      }
      const nav = document.querySelector('.report-nav');
      if(!nav) return;
      user = user || this.user();
      const sourceMenus = Array.isArray(user && user.menus) ? user.menus : [];
      // A menu group/category is part of the assigned navigation hierarchy even when all
      // of its child pages are configured as hidden from the sidebar. Keep those assigned
      // parent groups so hiding every subcategory does not make the main category vanish.
      const activeAssignedChildrenByGroup = {};
      sourceMenus.map(normalizeMenu).forEach(function(m){
        const parent=String(m.parentKey||'').trim();
        if(m.status !== 1 || !parent || !m.url || m.url === '#') return;
        if(!activeAssignedChildrenByGroup[parent]) activeAssignedChildrenByGroup[parent]=[];
        activeAssignedChildrenByGroup[parent].push(m);
      });
      Object.keys(activeAssignedChildrenByGroup).forEach(function(key){
        activeAssignedChildrenByGroup[key].sort(function(a,b){ return a.sortOrder-b.sortOrder || a.title.localeCompare(b.title); });
      });
      const assignedGroupKeys = new Set(Object.keys(activeAssignedChildrenByGroup));

      // Database-only sidebar: no hardcoded fallback menus, injected pages, role filters,
      // menu renaming, parent repair or frontend permission overrides.
      const menus = sourceMenus.map(normalizeMenu)
        .filter(function(m){
          if(m.status !== 1 || m.showInSidebar !== 1 || !m.url || m.url === '#') return false;
          // Admin / Merchant Credit Control pages are retired �?keep Adjust/Add Credit on list pages.
          const file = String(m.url || '').split('/').pop().split('?')[0].toLowerCase();
          const key = String(m.menuKey || '').toLowerCase();
          if(file === 'main-admin-credit.html' || key === 'main_admin_credit' || key === 'admin_credit') return false;
          if(file === 'main-merchant-credit.html' || key === 'main_merchant_credit' || key === 'merchant_credit') return false;
          // Report: only Win/Lose Report + Provider Report remain in the sidebar.
          if(REPORT_SIDEBAR_REMOVED[file]) return false;
          return true;
        })
        .sort(function(a,b){ return a.sortOrder - b.sortOrder || a.title.localeCompare(b.title); });

      if(!menus.length && !assignedGroupKeys.size){
        nav.innerHTML='';
        return;
      }

      const top=[];
      const groups={};
      menus.forEach(function(m){
        const parent=String(m.parentKey||'').trim();
        if(parent){
          if(!groups[parent]) groups[parent]=[];
          groups[parent].push(m);
        }else{
          top.push(m);
        }
      });
      assignedGroupKeys.forEach(function(key){
        const meta=GROUP_META[key];
        if(meta && Number(meta.status==null?1:meta.status)===1 && !groups[key]) groups[key]=[];
      });

      // Render top-level pages and DB menu groups in one shared sort sequence.
      // Group order/title/icon come only from the menu_group table response.
      const roots=[];
      top.forEach(function(m){ roots.push({kind:'menu',sortOrder:m.sortOrder,title:m.title,menu:m}); });
      Object.keys(groups).forEach(function(key){
        const meta=GROUP_META[key]||{};
        let items=groups[key].sort(function(a,b){return a.sortOrder-b.sortOrder||a.title.localeCompare(b.title);});
        // Report group: ensure both Win/Lose Report and Provider Report are present.
        const keyLower=String(key||'').toLowerCase();
        if(keyLower==='main_reports_group' || keyLower==='report' || /report/i.test(String(meta.title||''))){
          const files=items.map(function(m){return String(m.url||'').split('/').pop().split('?')[0].toLowerCase();});
          const hasProvider=files.indexOf('main_provider_report.html')!==-1;
          const hasWinLose=files.indexOf('main-win-lose-report.html')!==-1 || files.indexOf('win-lose-report.html')!==-1;
          if(hasProvider && !hasWinLose){
            items=[{
              id:null,
              menuKey:'main_win_lose_report',
              title:'Win/Lose Report',
              url:'main-win-lose-report.html',
              icon:'bi-graph-up-arrow',
              parentKey:key,
              sortOrder:0,
              status:1
            }].concat(items);
          }
        }
        const configuredSort=Number(meta.sortOrder);
        const minChild=items.length?Math.min.apply(null,items.map(function(x){return Number(x.sortOrder)||0;})):0;
        roots.push({
          kind:'group',
          key:key,
          sortOrder:Number.isFinite(configuredSort)?configuredSort:minChild,
          title:String(meta.title||key),
          icon:String(meta.icon||'bi-folder'),
          items:items
        });
      });
      roots.sort(function(a,b){ return Number(a.sortOrder||0)-Number(b.sortOrder||0)||String(a.title||'').localeCompare(String(b.title||'')); });

      const activePage=sidebarActivePage();
      const activeFile=pageFile(activePage);
      // Same HTML can appear under multiple groups (e.g. wallet-ledger in Transaction + Member).
      // MD: only the first match (menu sort order) owns the active chip / open L1 bar.
      let primaryGroupKey=null;
      let primaryMenuKey=null;
      roots.some(function(root){
        if(root.kind==='menu'){
          if(pageFile(root.menu.url||'')===activeFile){
            primaryMenuKey=root.menu.menuKey;
            return true;
          }
          return false;
        }
        // Groups whose visible children are all hidden from the sidebar (e.g. Admin,
        // Merchant) render as a single direct anchor with no items in root.items, so the
        // lookup above never matched and the group never received the active style.
        // Fall back to the assigned (possibly hidden) children so the direct anchor can
        // still be recognised as the active row for its own drill-down pages.
        const hit=root.items.find(function(m){return pageFile(m.url||'')===activeFile;})
          || (activeAssignedChildrenByGroup[root.key]||[]).find(function(m){return pageFile(m.url||'')===activeFile;});
        if(hit){
          primaryGroupKey=root.key;
          primaryMenuKey=hit.menuKey;
          return true;
        }
        return false;
      });
      let html='';
      roots.forEach(function(root){
        if(root.kind==='menu'){
          html+=menuLinkHtml(root.menu,false, primaryMenuKey!=null && root.menu.menuKey===primaryMenuKey, true);
          return;
        }
        const hasVisibleChildren=root.items.length>0;
        const isOpen=hasVisibleChildren && primaryGroupKey!=null && root.key===primaryGroupKey;
        if(!hasVisibleChildren){
          // Assigned + active category whose active children are all Hidden: keep only
          // the category row, with no chevron/flyout. The category itself remains usable:
          // clicking it opens the first active assigned child page without exposing that
          // hidden child as a sidebar submenu. If every child is inactive, this group is
          // never added to assignedGroupKeys and therefore is not rendered at all.
          const assignedChildren=activeAssignedChildrenByGroup[root.key]||[];
          const target=assignedChildren.length ? assignedChildren[0] : null;
          if(target){
            const targetActive=primaryGroupKey!=null && root.key===primaryGroupKey;
            html+='<div class="nav-group nav-group-empty" data-menu-group="'+esc(root.key)+'">'+
              '<a href="'+esc(target.url)+'" class="nav-group-btn nav-group-direct '+(targetActive?'active':'')+'" data-menu-key="'+esc(target.menuKey)+'" data-rail-label="'+esc(root.title)+'">'+
              '<span><i class="bi '+esc(root.icon)+' me-2"></i>'+esc(root.title)+'</span></a></div>';
          }
          return;
        }
        // `.bo-flyout-title` heads the panel in the collapsed rail, where the rail
        // itself shows only the icon — so it is the one place the group name is
        // readable. Hidden everywhere else (see bo-global-quicknav.css).
        html+='<div class="nav-group '+(isOpen?'open':'')+'" data-menu-group="'+esc(root.key)+'">'+
          '<button type="button" class="nav-group-btn" aria-expanded="'+(isOpen?'true':'false')+'">'+
          '<span><i class="bi '+esc(root.icon)+' me-2"></i>'+esc(root.title)+'</span><i class="bi bi-chevron-down"></i></button>'+
          '<div class="nav-group-list '+(isOpen?'show':'')+'"><div class="bo-flyout-title">'+esc(root.title)+'</div>'+root.items.map(function(m){
            return menuLinkHtml(m,true, primaryMenuKey!=null && m.menuKey===primaryMenuKey);
          }).join('')+'</div></div>';
      });
      nav.innerHTML=html;

      const sidebar=nav.closest('.report-sidebar');
      if(sidebar){
        let footer=sidebar.querySelector('.bo-sidebar-account-footer');
        if(!footer){footer=document.createElement('div');footer.className='bo-sidebar-account-footer';sidebar.appendChild(footer);}
        footer.innerHTML='<a class="bo-sidebar-logout" href="#logout" data-bo-logout title="Logout" data-rail-label="Logout"><i class="bi bi-box-arrow-right"></i><span>Logout</span></a>';
        // The rail label panel: one reused element that names the hovered row while
        // the sidebar is collapsed. Rebuilt here so a re-render cannot leave a stale
        // label behind (renderSidebar runs after every menu refresh).
        let railLabel=sidebar.querySelector('.bo-rail-label');
        if(!railLabel){railLabel=document.createElement('div');railLabel.className='bo-rail-label';railLabel.setAttribute('aria-hidden','true');sidebar.appendChild(railLabel);}
        railLabel.classList.remove('show');
        railLabel.textContent='';
        // One sidebar toggle for the whole BO, mounted in the rail: the dashboard's own
        // 42px button, same classes and values (see bo-global-quicknav.css), so every page
        // opens and closes the rail from the same place. dashboard.html ships it in its
        // markup; this is the same element for every other page. Idempotent, so a menu
        // re-render cannot stack a second one.
        const brand=sidebar.querySelector('.report-brand');
        if(brand && !brand.querySelector('.dashboard-sidebar-toggle')){
          const toggle=document.createElement('button');
          toggle.type='button';
          toggle.className='hamb dashboard-sidebar-toggle';
          toggle.setAttribute('data-open-sidebar','');
          toggle.setAttribute('aria-label','Toggle sidebar');
          toggle.title='Toggle sidebar';
          toggle.innerHTML='<i class="bi bi-list"></i>';
          const closeSide=brand.querySelector('.close-side');
          if(closeSide) brand.insertBefore(toggle, closeSide); else brand.appendChild(toggle);
          brand.classList.add('dashboard-sidebar-brand');
        }
      }
    },
    loadUiSetting: async function(){
      let cfg={headerMenuKeys:[],headerConfigured:false,sidebarInteraction:'HOVER'};
      try{
        const r=await fetch(API_CONFIG.BASE_URL+'/admin/ui-setting',{headers:{...this.authHeader()},cache:'no-store'});
        const j=await r.json().catch(()=>({}));
        if(r.ok&&j.status!=='error'&&j.data) cfg=Object.assign(cfg,j.data);
      }catch(e){}
      // Restore pre-click-mode behaviour: hover expands the rail. A stale CLICK
      // value from /admin/ui-setting was still flipping on bo-sidebar-click-mode,
      // which locks the rail width and hides the icon-bearing <span> on hover ?
      // leaving only the always-visible pin buttons (the "????" screenshot).
      cfg.sidebarInteraction='HOVER';
      window.__boUiSetting=cfg;
      document.body.classList.remove('bo-sidebar-click-mode');
      this.renderSidebar(this.user());
      this.renderQuickNav(cfg);
      return cfg;
    },
    saveDashboardPins: async function(keys){
      const current=window.__boUiSetting||{headerMenuKeys:[],sidebarInteraction:'HOVER'};
      const clean=[];const seen=new Set();
      (keys||[]).forEach(function(k){k=String(k||'');if(k&&!seen.has(k)){seen.add(k);clean.push(k);}});
      const r=await fetch(API_CONFIG.BASE_URL+'/admin/ui-setting',{method:'PUT',headers:{'Content-Type':'application/json',...this.authHeader()},body:JSON.stringify({headerMenuKeys:clean,sidebarInteraction:String(current.sidebarInteraction||'HOVER').toUpperCase()})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok||j.status==='error') throw new Error(j.message||'Unable to save Dashboard pins');
      window.__boUiSetting=Object.assign({},current,j.data||{},{headerMenuKeys:clean,headerConfigured:true});
      this.renderSidebar(this.user());
      this.renderQuickNav(window.__boUiSetting);
      return window.__boUiSetting;
    },
    toggleDashboardPin: async function(menuKey){
      menuKey=String(menuKey||'');
      if(!menuKey)return;
      const cfg=window.__boUiSetting||{headerMenuKeys:[],sidebarInteraction:'HOVER'};
      const before=Array.isArray(cfg.headerMenuKeys)?cfg.headerMenuKeys.slice():[];
      const keys=before.slice();
      const i=keys.indexOf(menuKey);if(i>=0)keys.splice(i,1);else keys.push(menuKey);
      // Optimistic update makes the pin/unpin action visible immediately. The API
      // remains the source of truth; on failure restore the previous state.
      window.__boUiSetting=Object.assign({},cfg,{headerMenuKeys:keys,headerConfigured:true});
      this.renderSidebar(this.user());
      this.renderQuickNav(window.__boUiSetting);
      try{return await this.saveDashboardPins(keys);}
      catch(err){window.__boUiSetting=Object.assign({},cfg,{headerMenuKeys:before});this.renderSidebar(this.user());this.renderQuickNav(window.__boUiSetting);throw err;}
    },
    renderQuickNav: function(cfg){
      const activeFile=pageFile(location.pathname);
      let nav=document.getElementById('boGlobalQuickNav');
      if(activeFile!=='dashboard.html'){if(nav)nav.remove();return;}
      const topbar=document.querySelector('.report-main > .report-topbar');if(!topbar)return;
      if(!nav){nav=document.createElement('nav');nav.id='boGlobalQuickNav';nav.className='bo-global-quicknav';nav.setAttribute('aria-label','Dashboard pinned pages');topbar.insertAdjacentElement('afterend',nav);}
      const user=this.user();
      const all=(Array.isArray(user&&user.menus)?user.menus:[]).map(normalizeMenu).filter(m=>m.status===1&&m.url&&m.url!=='#');
      const allowed=new Map(all.map(m=>[m.menuKey,m]));let chosen=[];
      (cfg&&Array.isArray(cfg.headerMenuKeys)?cfg.headerMenuKeys:[]).forEach(k=>{const m=allowed.get(k);if(m)chosen.push(m);});
      const cols=Math.max(1,Math.min(12,chosen.length));nav.style.setProperty('--bo-nav-cols',String(cols));
      // Re-renders (pin/unpin, drag reorder) rebuild innerHTML from scratch, which would
      // otherwise wipe the currently open tab's highlight even though its iframe content
      // is still showing. Remember which menu key was active before the rebuild so it can
      // be restored below instead of silently losing its selected state.
      const prevActiveKey=nav.querySelector('a.active')?.getAttribute('data-dashboard-menu-key')||null;
      nav.innerHTML=chosen.map(m=>'<a href="'+esc(m.url)+'" draggable="true" data-dashboard-panel-url="'+esc(m.url)+'" data-dashboard-menu-key="'+esc(m.menuKey)+'" title="'+esc(m.title)+'" aria-label="'+esc(m.title)+'"><i class="bi '+esc(m.icon||'bi-circle')+'"></i><span>'+esc(m.title)+'</span><span class="bo-dashboard-unpin" data-dashboard-unpin="'+esc(m.menuKey)+'" title="Unpin from Dashboard" aria-label="Unpin '+esc(m.title)+'"><i class="bi bi-pin-angle-fill"></i></span></a>').join('');
      nav.hidden=chosen.length===0;
      (function(){
        const links=[...nav.querySelectorAll('a[data-dashboard-menu-key]')];
        if(!links.length) return;
        const restored=prevActiveKey?links.find(a=>a.getAttribute('data-dashboard-menu-key')===prevActiveKey):null;
        if(restored){
          // Same tab is still pinned after the rebuild: keep it highlighted, iframe
          // content is untouched.
          restored.classList.add('active');
          return;
        }
        if(nav.dataset.autoOpened) return; // user has already navigated away deliberately
        // First-ever render with pinned pages and nothing active yet: open the first
        // pinned page automatically instead of leaving the workspace blank until a
        // manual click.
        const first=links[0];
        if(!first) return;
        let url=first.getAttribute('data-dashboard-panel-url')||'';
        if(pageFile(url)==='dashboard.html') url='dashboard-backup.html';
        first.classList.add('active');
        BO_AUTH.openDashboardPanel(url);
        nav.dataset.autoOpened='1';
      })();
      let dragged=null,dragMoved=false,dragSaving=false;
      nav.ondragstart=function(e){const a=e.target.closest('a[data-dashboard-menu-key]');if(!a)return;dragged=a;dragMoved=false;a.classList.add('is-dragging');if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',a.dataset.dashboardMenuKey||'');}};
      nav.ondragover=function(e){if(!dragged)return;e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';const over=e.target.closest('a[data-dashboard-menu-key]');if(!over||over===dragged)return;const r=over.getBoundingClientRect();const horizontal=Math.abs(e.clientX-(r.left+r.width/2))>=Math.abs(e.clientY-(r.top+r.height/2));const before=horizontal?e.clientX<r.left+r.width/2:e.clientY<r.top+r.height/2;const ref=before?over:over.nextElementSibling;if(ref!==dragged&&dragged.nextElementSibling!==ref){nav.insertBefore(dragged,ref);dragMoved=true;}};
      nav.ondrop=function(e){if(dragged)e.preventDefault();};
      nav.ondragend=async function(){if(!dragged)return;dragged.classList.remove('is-dragging');dragged=null;if(!dragMoved)return;dragSaving=true;const keys=[...nav.querySelectorAll('[data-dashboard-menu-key]')].map(a=>a.dataset.dashboardMenuKey);const previous=Array.isArray(window.__boUiSetting&&window.__boUiSetting.headerMenuKeys)?window.__boUiSetting.headerMenuKeys.slice():[];window.__boUiSetting=Object.assign({},window.__boUiSetting||{},{headerMenuKeys:keys,headerConfigured:true});try{await BO_AUTH.saveDashboardPins(keys);}catch(err){console.error(err);window.__boUiSetting=Object.assign({},window.__boUiSetting||{},{headerMenuKeys:previous});BO_AUTH.renderSidebar(BO_AUTH.user());BO_AUTH.renderQuickNav(window.__boUiSetting);}finally{setTimeout(function(){dragSaving=false;},0);}};
      nav.onclick=async function(event){
        if(dragSaving){event.preventDefault();return;}
        const unpin=event.target.closest('[data-dashboard-unpin]');
        if(unpin){event.preventDefault();event.stopPropagation();const key=unpin.getAttribute('data-dashboard-unpin');const active=unpin.closest('a')?.classList.contains('active');try{await BO_AUTH.toggleDashboardPin(key);if(active){BO_AUTH.clearDashboardPanel();}}catch(err){console.error(err);}return;}
        const link=event.target.closest('a[data-dashboard-panel-url]');if(!link)return;
        event.preventDefault();let url=link.getAttribute('data-dashboard-panel-url')||'';if(pageFile(url)==='dashboard.html')url='dashboard-backup.html';
        nav.querySelectorAll('a').forEach(a=>a.classList.remove('active'));link.classList.add('active');
        BO_AUTH.openDashboardPanel(url);
      };
      BO_AUTH.bindDashboardWorkspace();
      if(!document.querySelector('link[data-bo-quicknav-css]')){const l=document.createElement('link');l.rel='stylesheet';l.href='assets/css/bo-global-quicknav.css?v=c84f0546';l.dataset.boQuicknavCss='1';document.head.appendChild(l);}
    },
    clearDashboardPanel: function(){
      ['dashboardWorkspaceFrame','dashboardWorkspaceFrameB'].forEach(function(id){
        const f=document.getElementById(id);
        if(!f) return;
        f.src='about:blank';
        f.hidden=true;
        f.classList.remove('is-bo-frame-active','is-bo-frame-pending');
      });
    },
    openDashboardPanel: function(url){
      this.bindDashboardWorkspace();
      const frames=this._dashboardFrames();
      if(!frames.a){location.href=url;return;}
      const active=frames.a.classList.contains('is-bo-frame-active')?frames.a
        :(frames.b&&frames.b.classList.contains('is-bo-frame-active')?frames.b:null);
      /* Same URL already showing — keep content, no reload flash. */
      if(active && !active.classList.contains('is-bo-frame-pending')){
        try{
          const cur=String(active.contentWindow&&active.contentWindow.location&&active.contentWindow.location.href||'');
          const file=String(url||'').split('?')[0].split('/').pop();
          if(cur && file && cur.indexOf(file)>=0) return;
        }catch(_e){}
      }
      const token=String(++this._dashboardNavToken);
      const incoming=(!active)?frames.a:(active===frames.a?(frames.b||frames.a):frames.a);
      incoming.dataset.boNavToken=token;
      incoming.classList.add('is-bo-frame-pending');
      incoming.classList.remove('is-bo-frame-active');
      incoming.hidden=false;
      /* Keep the current page visible while the next one loads in the buffer. */
      incoming.src=url;
    },
    _dashboardFrames: function(){
      return {
        a:document.getElementById('dashboardWorkspaceFrame'),
        b:document.getElementById('dashboardWorkspaceFrameB')
      };
    },
    _dashboardNavToken: 0,
    _dashboardShellCss: 'html,body{width:100%!important;max-width:100%!important;margin:0!important;overflow-x:hidden!important}*,*::before,*::after{box-sizing:border-box!important}.report-sidebar,.sidebar-overlay,.report-topbar{display:none!important}.report-shell{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important}.report-sidebar,.report-main{transition:none!important}.report-main{display:block!important;margin:0!important;padding:0!important;width:100%!important;max-width:100%!important;min-width:0!important;transition:none!important}.report-content{width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:12px 20px 20px!important;overflow-x:hidden!important}.report-content>*{max-width:100%!important;min-width:0!important}.table-wrap,.table-responsive,[class*=table-wrap],[class*=table-responsive]{max-width:100%!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch}.table-card,.filter-card,.summary-card,[class*=card]{max-width:100%}.container,.container-fluid{width:100%!important;max-width:100%!important;margin-left:0!important;margin-right:0!important}.dashboard-embedded-page .report-main,body.dashboard-embedded-page.sidebar-mini .report-main,body.dashboard-embedded-page.livechat-bo-page .report-main,body.dashboard-embedded-page.livechat-bo-page.sidebar-mini .report-main{margin-left:0!important;margin-right:0!important;width:100%!important;max-width:100%!important;min-width:0!important;transition:none!important}.dashboard-embedded-page .report-content,body.dashboard-embedded-page.sidebar-mini .report-content,body.dashboard-embedded-page.livechat-bo-page .report-content{margin-left:0!important;margin-right:0!important;width:100%!important;max-width:100%!important;min-width:0!important;padding-left:20px!important;padding-right:20px!important}.dashboard-embedded-page .report-shell{margin-left:0!important;margin-right:0!important;width:100%!important;max-width:100%!important}.dashboard-embedded-page .livechat-admin-shell{width:100%!important;max-width:100%!important;margin-left:0!important;margin-right:0!important}html.dashboard-embedded-page body.report-body.bo-charcoal.livechat-bo-page .report-main,html.dashboard-embedded-page body.report-body.bo-charcoal.livechat-bo-page.sidebar-mini .report-content{margin-left:0!important;margin-right:0!important;width:100%!important;max-width:100%!important;min-width:0!important}html.dashboard-embedded-page body.report-body.bo-charcoal.livechat-bo-page .report-content,html.dashboard-embedded-page body.report-body.bo-charcoal.livechat-bo-page.sidebar-mini .report-content{margin-left:0!important;margin-right:0!important;width:100%!important;max-width:100%!important;padding-left:20px!important;padding-right:20px!important}html.dashboard-embedded-page body.report-body.bo-charcoal.livechat-bo-page .livechat-admin-shell{width:100%!important;max-width:100%!important;margin-left:0!important;margin-right:0!important}',
    bindDashboardWorkspace: function(){
      if(window.__boDashboardWorkspaceBound) return;
      window.__boDashboardWorkspaceBound=true;
      const self=this;
      const frames=this._dashboardFrames();
      const workspace=document.querySelector('.dashboard-workspace');
      const fitWorkspace=function(){
        if(!workspace) return;
        const top=workspace.getBoundingClientRect().top;
        const availableHeight=Math.max(320, window.innerHeight - top);
        workspace.style.height=availableHeight+'px';
      };
      fitWorkspace();
      window.addEventListener('resize',fitWorkspace);
      const activateFrame=function(incoming){
        if(!incoming) return;
        if(incoming.dataset.boNavToken && incoming.dataset.boNavToken!==String(self._dashboardNavToken)) return;
        const others=[frames.a,frames.b].filter(function(f){return f&&f!==incoming;});
        incoming.classList.remove('is-bo-frame-pending');
        incoming.hidden=false;
        requestAnimationFrame(function(){
          incoming.classList.add('is-bo-frame-active');
        });
        others.forEach(function(out){
          out.classList.remove('is-bo-frame-active');
          clearTimeout(out.__boBlankTimer);
          out.__boBlankTimer=setTimeout(function(){
            if(out.classList.contains('is-bo-frame-active')) return;
            try{out.src='about:blank';}catch(_e){}
            out.hidden=true;
            out.classList.remove('is-bo-frame-pending');
          },180);
        });
        fitWorkspace();
      };
      const prepareFrame=function(frame){
        if(!frame||frame.dataset.shellBound) return;
        frame.dataset.shellBound='1';
        frame.addEventListener('load',function(){
          try{
            if(frame.dataset.boNavToken && frame.dataset.boNavToken!==String(self._dashboardNavToken)) return;
            const href=(function(){try{return String(frame.contentWindow.location.href||'');}catch(_e){return '';}})();
            if(!href||href==='about:blank') return;
            const d=frame.contentDocument;
            if(!d){activateFrame(frame);return;}
            if(d.documentElement)d.documentElement.classList.add('dashboard-embedded-page');
            if(d.body)d.body.classList.add('dashboard-embedded-page');
            let style=d.getElementById('dashboardEmbeddedShellStyle');
            if(!style){
              style=d.createElement('style');
              style.id='dashboardEmbeddedShellStyle';
              style.textContent=self._dashboardShellCss;
              d.head.appendChild(style);
            }
            /* Swap as soon as shell CSS is in — keep the previous page visible until this moment. */
            requestAnimationFrame(function(){activateFrame(frame);});
          }catch(e){activateFrame(frame);}
        });
      };
      prepareFrame(frames.a);
      prepareFrame(frames.b);
    },
    bindDynamicSidebarEvents: function(){
      // Some legacy pages call this explicitly while auth.js also initializes it
      // on DOMContentLoaded. Bind only once; duplicate delegated listeners would
      // toggle an accordion open and immediately closed on the same click.
      if(window.__boDynamicSidebarEventsBound) return;
      window.__boDynamicSidebarEventsBound = true;
      function positionSidebarFlyout(group){
        if(!group || window.innerWidth < 992) return;
        const btn = group.querySelector('.nav-group-btn');
        const sidebar = group.closest('.report-sidebar');
        const list = group.querySelector('.nav-group-list');
        if(!btn || !sidebar || !list) return;
        const br = btn.getBoundingClientRect();
        const sr = sidebar.getBoundingClientRect();
        const left = Math.max(8, Math.round(sr.right + 6));
        let top = Math.max(12, Math.round(br.top));

        // Size the panel by the space BELOW its own row, and never move it up.
        // Owner report: on a short window the 11-entry Report flyout could not be
        // reached. The old code measured `scrollHeight` (about 620px) against the
        // viewport and clamped the panel's top to 12 �?roughly 200px ABOVE the row it
        // belongs to (measured on the owner's screen: row 228, panel 12). Reaching the
        // first item was then a long diagonal that crossed the sibling menu rows, and
        // each of those fires its own mouseenter, which closes this flyout �?so the
        // hover jumped and the panel shut before 8.1 could be clicked. Capping to the
        // room below keeps the panel beside its row, so the pointer never leaves that
        // row's band; the list scrolls internally when the menu is longer than the
        // space available.
        // The cap is the SMALLER of the room below this row and 62% of the viewport.
        // Taking only the viewport fraction (a first attempt) still overflowed below the row
        // on a tall window, so the panel was pushed back up and detached again �?measured on
        // the owner's screen at 975px tall with the row at 546: fraction 605 > room 417, so the
        // panel sat 188px above its row. Using the room below keeps it beside the row in every
        // geometry where the row is not near the very bottom of the viewport.
        const roomBelow = window.innerHeight - top - 12;
        const cap = Math.max(160, Math.min(Math.round(window.innerHeight * 0.62), roomBelow));
        // only reachable when the row sits at the very bottom (roomBelow < the 160px floor)
        if(top + cap > window.innerHeight - 12) top = Math.max(12, window.innerHeight - cap - 12);

        // Every input above is a rect that already exists, so the panel is positioned
        // and capped SYNCHRONOUSLY, before the frame paints. Both of these used to ride
        // inside a requestAnimationFrame, which cost two things: the panel painted one
        // frame at its uncapped height and was then shrunk and possibly moved (a visible
        // jump under the cursor �?part of the owner's "光标乱跳"), and whenever the frame
        // did not arrive promptly the cap never applied at all.
        group.style.setProperty('--bo-sidebar-flyout-left', left + 'px');
        group.style.setProperty('--bo-sidebar-flyout-top', Math.round(top) + 'px');
        // The inline value is the fallback; the property is what actually wins.
        // `reports.css` pins this element at `max-height: calc(100vh - 24px) !important`,
        // and an `!important` stylesheet declaration out-ranks an inline one, so an inline
        // value alone is silently ignored (measured: inline 547px, computed 926.4px). With
        // the row at 573 in a 950px window that let the panel run to 1075 �?the last three
        // entries below the screen �?and because the 504px content was still shorter than
        // that allowance, `overflow-y:auto` produced no scrollbar either, so 8.11 was
        // neither visible nor scrollable. bo-global-quicknav.css consumes the property at a
        // higher specificity than that reports.css rule, so the cap computed here applies.
        group.style.setProperty('--bo-sidebar-flyout-max', cap + 'px');
        list.style.maxHeight = cap + 'px';
        list.style.overflowY = 'auto';
      }
      // Rail label panel — the collapsed rail's answer for a row that opens no
      // panel of its own (a top-level page, or a category whose children are all
      // hidden). One reused element, positioned like the flyout so both sit on the
      // same 6px gap and share the panel skin. Rail only: an expanded sidebar
      // shows every label inline and never opens this.
      function railLabelPanel(){
        const sidebar = document.querySelector('.report-sidebar');
        if(!sidebar) return null;
        let panel = sidebar.querySelector('.bo-rail-label');
        if(!panel){
          panel = document.createElement('div');
          panel.className = 'bo-rail-label';
          panel.setAttribute('aria-hidden','true');
          sidebar.appendChild(panel);
        }
        return panel;
      }
      function hideRailLabel(){
        const panel = document.querySelector('.report-sidebar .bo-rail-label');
        if(panel) panel.classList.remove('show');
      }
      function showRailLabel(row){
        if(!row || window.innerWidth < 992) return;
        if(!document.body.classList.contains('sidebar-mini')) return;
        const panel = railLabelPanel();
        const sidebar = row.closest('.report-sidebar');
        const label = row.getAttribute('data-rail-label') || '';
        if(!panel || !sidebar || !label) return;
        panel.textContent = label;
        const rr = row.getBoundingClientRect();
        const sr = sidebar.getBoundingClientRect();
        const left = Math.max(8, Math.round(sr.right + 6));
        const top = Math.max(12, Math.round(rr.top));
        // Same split as the group flyout: the custom properties are what the sheet
        // consumes (it carries `!important` on `position`/`z-index`, and an inline
        // `left`/`top` would be the weaker declaration the moment a sheet sets them),
        // while the inline pair keeps the panel placed if the sheet is not loaded.
        panel.style.setProperty('--bo-sidebar-flyout-left', left + 'px');
        panel.style.setProperty('--bo-sidebar-flyout-top', top + 'px');
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
        panel.classList.add('show');
      }
      const railLabelRows = '.report-sidebar [data-rail-label]';
      const sidebarFlyoutHoverTimers = new WeakMap();
      function dismissSidebarFlyout(group){
        if(!group) return;
        const timer = sidebarFlyoutHoverTimers.get(group);
        if(timer) clearTimeout(timer);
        sidebarFlyoutHoverTimers.delete(group);
        group.classList.add('bo-flyout-instant-hide');
        group.classList.remove('bo-flyout-hover', 'open');
        group.querySelector('.nav-group-list')?.classList.remove('show');
        group.querySelector('.nav-group-btn')?.setAttribute('aria-expanded','false');
        void group.offsetWidth;
        requestAnimationFrame(function(){ group.classList.remove('bo-flyout-instant-hide'); });
        if(window.__boSidebarActiveFlyout === group) window.__boSidebarActiveFlyout = null;
      }
      function closeAllSidebarFlyouts(){
        document.querySelectorAll('.report-sidebar .nav-group.bo-flyout-hover').forEach(dismissSidebarFlyout);
        window.__boSidebarActiveFlyout = null;
        hideRailLabel();
      }
      window.BO_SIDEBAR = window.BO_SIDEBAR || {};
      window.BO_SIDEBAR.closeAllFlyouts = closeAllSidebarFlyouts;
      function closeSidebarFlyoutImmediately(group){
        if(!group) return;
        const timer = sidebarFlyoutHoverTimers.get(group);
        if(timer) clearTimeout(timer);
        sidebarFlyoutHoverTimers.delete(group);
        // Suppress any fade/slide frame while switching groups. This guarantees
        // the old flyout is gone before the next flyout is painted.
        group.classList.add('bo-flyout-instant-hide');
        group.classList.remove('bo-flyout-hover', 'open');
        group.querySelector('.nav-group-list')?.classList.remove('show');
        group.querySelector('.nav-group-btn')?.setAttribute('aria-expanded','false');
        // Force the hidden state now, then release the helper class next frame.
        void group.offsetWidth;
        requestAnimationFrame(function(){ group.classList.remove('bo-flyout-instant-hide'); });
        if(window.__boSidebarActiveFlyout === group) window.__boSidebarActiveFlyout = null;
      }
      function openSidebarFlyoutOnHover(group){
        if(!group || window.innerWidth < 992 || !group.closest('.report-sidebar')) return;
        // A row with no panel (a top-level page, or a category whose children are all
        // hidden) has no flyout to open — its name comes from the rail label instead.
        if(!group.querySelector('.nav-group-list')) return;

        const previous = window.__boSidebarActiveFlyout;
        if (previous && previous !== group) {
        // Hover intent. A pointer travelling from its row into the flyout crosses the sibling
        // rows, and taking over on every crossing is what made the hover jump and closed the
        // flyout before its first entry could be clicked. Require the pointer to rest on the new
        // group for a moment; a fly-through never takes over, so the open flyout survives the
        // journey into its own panel.
        const intentGroup = group;
        if (group.__boFlyoutIntent) clearTimeout(group.__boFlyoutIntent);
        group.__boFlyoutIntent = setTimeout(function () {
        group.__boFlyoutIntent = null;
        if (!intentGroup.matches(':hover')) return;
        if (window.__boSidebarActiveFlyout === intentGroup) return;
        const prev = window.__boSidebarActiveFlyout;
        if (prev && prev !== intentGroup) closeSidebarFlyoutImmediately(prev);
        openSidebarFlyoutOnHover(intentGroup);
        }, 140);
        return;
        }
        document.querySelectorAll('.report-sidebar .nav-group').forEach(function(other){
          if(other !== group && other !== previous && (other.classList.contains('bo-flyout-hover') || other.classList.contains('open'))){
            closeSidebarFlyoutImmediately(other);
          }
        });

        const pending = sidebarFlyoutHoverTimers.get(group);
        if(pending) clearTimeout(pending);
        sidebarFlyoutHoverTimers.delete(group);
        window.__boSidebarActiveFlyout = group;
        positionSidebarFlyout(group);
        group.classList.remove('bo-flyout-instant-hide');
        group.classList.add('bo-flyout-hover');
      }
      function scheduleSidebarFlyoutHoverClose(group){
        if(!group || window.innerWidth < 992) return;
        const pending = sidebarFlyoutHoverTimers.get(group);
        if(pending) clearTimeout(pending);
        const timer = setTimeout(function(){
          sidebarFlyoutHoverTimers.delete(group);
          const list = group.querySelector('.nav-group-list');
          if(group.matches(':hover') || (list && list.matches(':hover'))) return;
          dismissSidebarFlyout(group);
        }, 400);
        sidebarFlyoutHoverTimers.set(group, timer);
      }
      document.addEventListener('mouseover', function(e){
        if(window.innerWidth < 992 || document.body.classList.contains('bo-sidebar-click-mode')) return;
        const row = e.target.closest && e.target.closest(railLabelRows);
        if(row){ showRailLabel(row); return; }
        const group = e.target.closest && e.target.closest('.report-sidebar .nav-group');
        if(group) openSidebarFlyoutOnHover(group);
      });
      document.addEventListener('mouseout', function(e){
        if(window.innerWidth < 992 || document.body.classList.contains('bo-sidebar-click-mode')) return;
        const row = e.target.closest && e.target.closest(railLabelRows);
        if(row){
          const next = e.relatedTarget;
          if(!(next && row.contains(next))) hideRailLabel();
          return;
        }
        const group = e.target.closest && e.target.closest('.report-sidebar .nav-group');
        if(!group) return;
        const next = e.relatedTarget;
        if(next && group.contains(next)) return;
        // Still moving toward the fixed flyout (outside the parent box) �?keep open.
        if(next && next.closest && next.closest('.report-sidebar .nav-group-list')){
          const nextGroup = next.closest('.nav-group');
          if(nextGroup === group) return;
        }
        scheduleSidebarFlyoutHoverClose(group);
      });
      // The label points at a row; once the rail scrolls it would point at nothing.
      document.querySelector('.report-sidebar')?.addEventListener('scroll', hideRailLabel, {passive:true});
      window.addEventListener('resize', hideRailLabel);
      document.addEventListener('pointerdown', function(e){
        if(window.innerWidth < 992) return;
        hideRailLabel();
        if(e.target.closest && e.target.closest('.report-sidebar')) return;
        closeAllSidebarFlyouts();
      });
      document.addEventListener('keydown', function(e){
        if(e.key === 'Escape') closeAllSidebarFlyouts();
      });
      document.addEventListener('click', function(e){
        const pin=e.target.closest&&e.target.closest('[data-bo-pin-menu]');
        if(pin){e.preventDefault();e.stopPropagation();const key=pin.getAttribute('data-bo-pin-menu');pin.disabled=true;BO_AUTH.toggleDashboardPin(key).catch(function(err){console.error(err);}).finally(function(){pin.disabled=false;});return;}
        // Expanding the rail puts every label back inline; the panel has nothing left to say.
        if(e.target.closest && e.target.closest('[data-open-sidebar], .hamb')) hideRailLabel();
        const btn = e.target.closest && e.target.closest('.nav-group-btn');
        if(btn){
          // A group whose active children are all hidden is rendered as a direct anchor
          // (no chevron / no flyout). Do not let the accordion handler swallow its href.
          if(btn.matches('a.nav-group-direct[href]')){
            if(window.innerWidth < 992){
              document.getElementById('reportSidebar')?.classList.remove('show');
              document.getElementById('reportOverlay')?.classList.remove('show');
            }
            return;
          }
          e.preventDefault();
          const group = btn.closest('.nav-group');
          const list = group && group.querySelector('.nav-group-list');
          if(!group || !list) return;
          if(window.innerWidth >= 992){
            positionSidebarFlyout(group);
            if(document.body.classList.contains('bo-sidebar-click-mode')){
              const willOpen=!group.classList.contains('bo-flyout-hover');
              closeAllSidebarFlyouts();
              if(willOpen){group.classList.add('bo-flyout-hover');window.__boSidebarActiveFlyout=group;btn.setAttribute('aria-expanded','true');}
              return;
            }
            // Hover mode: a desktop click never pins the flyout.
            group.classList.remove('open');list.classList.remove('show');btn.setAttribute('aria-expanded','false');
            return;
          }
          // Mobile/tablet keeps the original accordion click behaviour.
          const willOpen = !group.classList.contains('open');
          group.classList.toggle('open', willOpen);
          list.classList.toggle('show', willOpen);
          btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
          return;
        }
        const link = e.target.closest && e.target.closest('.report-nav a[href]');
        // Dashboard-only chrome must not change normal BO page navigation.
        // Sidebar links keep their original href behaviour so pages opened from the
        // sidebar retain their standalone topbar (counters/profile/logout UI).
        if(link && window.innerWidth < 992){
          document.getElementById('reportSidebar')?.classList.remove('show');
          document.getElementById('reportOverlay')?.classList.remove('show');
          document.body.classList.remove('sidebar-open');
        }
      });
    },
    renderProfile: function(){
      const user = this.user();
      const name = displayName(user);
      const role = roleLabel(user);
      document.querySelectorAll('[data-admin-name]').forEach(el => el.textContent = name);
      document.querySelectorAll('[data-admin-username]').forEach(el => el.textContent = user.username || 'admin');
      document.querySelectorAll('[data-admin-role]').forEach(el => el.textContent = role);
      document.querySelectorAll('[data-admin-avatar]').forEach(el => {
        if(el.querySelector('i.bi-person,i.bi-person-fill')) return;
        el.textContent = initials(name);
      });
    },
    headerCountersHtml: function(){
      return '<div class="bo-header-counters" data-bo-header-counters>' +
        '<a class="bo-header-counter" href="index.html" data-operation-notification-ack="members" title="New members registered today" aria-label="New members registered today">' +
          '<span class="bo-header-counter-icon members"><i class="bi bi-person-plus"></i></span>' +
          '<span class="bo-header-counter-text"><small>Members</small><b data-header-new-members>0</b></span>' +
        '</a>' +
        '<a class="bo-header-counter" href="member-deposit.html" data-operation-notification-ack="wallet" title="Pending deposit requests" aria-label="Pending deposit requests">' +
          '<span class="bo-header-counter-icon deposit"><i class="bi bi-wallet2"></i></span>' +
          '<span class="bo-header-counter-text"><small>Deposit</small><b data-header-pending-deposit>0</b></span>' +
        '</a>' +
        '<a class="bo-header-counter" href="member-withdraw.html" data-operation-notification-ack="wallet" title="Pending withdrawal requests" aria-label="Pending withdrawal requests">' +
          '<span class="bo-header-counter-icon withdraw"><i class="bi bi-box-arrow-up"></i></span>' +
          '<span class="bo-header-counter-text"><small>Withdraw</small><b data-header-pending-withdraw>0</b></span>' +
        '</a>' +
      '</div>';
    },
    countFromListResponse: function(json){
      const data = json && json.data;
      if(Array.isArray(data)) return data.length;
      if(data && data.pagination && data.pagination.totalElements != null) return Number(data.pagination.totalElements) || 0;
      if(data && data.totalElements != null) return Number(data.totalElements) || 0;
      if(data && Array.isArray(data.content)) return data.content.length;
      return 0;
    },
    loadHeaderCounters: async function(){
      if(!this.token()) return;
      const brandId=Number(localStorage.getItem('bo_active_brand_id')||1)||1;
      const stateKey='bo_operation_notification_state_v4_b'+brandId;
      const set=function(selector,value){document.querySelectorAll(selector).forEach(function(el){el.textContent=Number(value||0).toLocaleString();});};
      try{
        const cached=JSON.parse(localStorage.getItem(stateKey)||'null');
        if(cached){set('[data-header-new-members]',cached.members);set('[data-header-pending-deposit]',cached.deposit);set('[data-header-pending-withdraw]',cached.withdraw);}
      }catch(e){}
      // operation-global-notification.js owns the live counter refresh. Avoid three
      // extra list requests (including a full member list) on every BO page load.
      if(window.BO_OPERATION_NOTIFICATION_CONTROL&&typeof window.BO_OPERATION_NOTIFICATION_CONTROL.refresh==='function'){
        window.BO_OPERATION_NOTIFICATION_CONTROL.refresh();return;
      }
      try{
        const res=await fetch(api('OPERATION_NOTIFICATION_SUMMARY'),{headers:{...this.authHeader()},cache:'no-store'});
        const json=await res.json().catch(function(){return {};});
        if(!res.ok||json.status==='error')return;
        const d=(json&&json.data)||{};set('[data-header-new-members]',d.members);set('[data-header-pending-deposit]',d.deposit);set('[data-header-pending-withdraw]',d.withdraw);
      }catch(e){}
    },
    profileHtml: function(){
      const user = this.user();
      const name = displayName(user);
      const role = roleLabel(user);
      const counters = String(user.roleType||'').toUpperCase()==='MAIN' ? '' : this.headerCountersHtml();
      /* Locked topbar chrome (system.md / Fig.2): meta left · person avatar right · no gear */
      return counters + '<a class="bo-account-link" href="profile.html" title="Account settings" aria-label="Open account settings">' +
        '<span class="bo-account-meta">' +
          '<span class="bo-account-name" data-admin-name>' + esc(name) + '</span>' +
          '<span class="bo-account-role" data-admin-role>' + esc(role) + '</span>' +
        '</span>' +
        '<span class="report-avatar" aria-hidden="true"><i class="bi bi-person"></i></span>' +
        '<i class="bi bi-gear bo-account-setting-icon" hidden aria-hidden="true"></i>' +
      '</a>';
    },
    injectProfile: function(){
      document.querySelectorAll('[data-bo-profile]').forEach(el => { el.innerHTML = this.profileHtml(); });
      this.renderProfile();
      this.loadHeaderCounters();
      if(window.BO_BRAND&&typeof window.BO_BRAND.mount==='function') setTimeout(function(){ window.BO_BRAND.mount(); },0);
    }
  };

  if(!location.pathname.endsWith('/login.html')) window.BO_AUTH.requireLogin();

  document.addEventListener('DOMContentLoaded', function(){
    if(location.pathname.endsWith('/login.html')) return;
    window.BO_AUTH.injectProfile();
    window.BO_AUTH.bindDynamicSidebarEvents();
    // Sidebar is intentionally rendered only after fresh DB-backed /me + menu-group data returns.
    window.BO_AUTH.refreshMe(true).then(function(){ return window.BO_AUTH.loadUiSetting(); }).catch(function(){ window.BO_AUTH.loadUiSetting(); });
    document.addEventListener('click', function(e){
      const logout = e.target.closest && e.target.closest('[data-bo-logout]');
      if(logout){ e.preventDefault(); window.BO_AUTH.logout(); }
    });
  });
})();
