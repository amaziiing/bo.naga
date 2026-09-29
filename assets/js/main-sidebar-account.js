/* Main panel - the signed-in account block docks in the sidebar, above the Logout line.

   WHY
   The Main panel is driven from one account, so the topbar chip spent the header's
   right-hand slot on information that never changes, while the sidebar's last row
   (Logout) sat alone under a hairline. The owner asked for the block to move down:
   "我要把我框起来的用户，移动去logout上方" - the account block belongs above the
   logout line. Only the Main panel moves; every other BO page keeps its topbar chip
   exactly as it is.

   WHAT MOVES - THE BLOCK, NOT A COPY
   auth.js still renders the chip (its own markup, its own /me data) into every
   `[data-bo-profile]` host. On a Main panel page this script takes the
   `.bo-account-link` out of the topbar host and paints the same block in the sidebar
   instead, and removes the now-empty host. Anything else that host carried stays: the
   three pending-operation counters render for a non-MAIN account (e.g. ROOT browsing
   the BO host), and they are the header's, not the sidebar's - so they stay in the
   header.

   The sidebar block reuses auth.js's own painting hooks - `data-admin-name` and
   `data-admin-role` - so BO_AUTH.renderProfile() (called after every /me refresh)
   keeps this block in step with the session with no second sync path. The wording
   helper below therefore has to agree with auth.js roleLabel(): the same account must
   not read "Main Account" here and something else in the header of another page.

   SCOPE
   Main panel = main-*.html, main_*.html and menu-permission.html (AGENTS.md,
   "Scope: BO pages only"). Filename-based on purpose: the owner asked for the page
   family to move, so a MAIN account on a normal BO page keeps the chip it has today.
   auth.js's own isMainPanel test (menuLinkHtml) is account-first as well as
   filename-based; that one controls the Dashboard pin controls and is not this.

   WHERE IT SITS
   A sibling of `.bo-sidebar-account-footer`, immediately BEFORE it - never inside it.
   The footer's border-top is the one hairline between the account block and Logout
   (that is the "logout line" the owner pointed at), and bo-ui-standard.css pins the
   footer's height per page so its line meets the page's sticky action bar. Keeping the
   block outside the footer leaves both of those untouched.

   Presentation lives in assets/css/main-sidebar-account.css. Both files are loaded by
   the Main panel pages only.
*/
(function (global) {
  'use strict';

  var USER_KEY = 'bo_admin_user';
  var DOCK_CLASS = 'main-side-account';
  var LINK_CLASS = 'main-side-account-link';
  var TOPBAR_HOST = '.report-actions [data-bo-profile]';

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Filename only, and `.html`-less: serve.json runs cleanUrls, so the same page arrives
     as /main-provider-credentials and as main-provider-credentials.html. */
  function pageFile() {
    return String(location.pathname || '').split('/').pop().split('?')[0].split('#')[0]
      .replace(/\.html$/i, '').toLowerCase();
  }

  function isMainPanelPage() {
    var f = pageFile();
    return /^main[-_]/i.test(f) || f === 'menu-permission';
  }

  function user() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || '{}') || {}; } catch (e) { return {}; }
  }

  function displayName(u) { return (u && (u.displayName || u.username)) || 'Admin'; }

  /* Mirrors auth.js roleLabel(). Duplicated because that helper is module-private; if the
     wording there changes, change it here too - the block is the same chip, moved. */
  function roleLabel(u) {
    u = u || {};
    if (u.roleName) return String(u.roleName);
    var type = String(u.roleType || '').toUpperCase();
    if (u.rootAdmin === true || Number(u.rootAdmin) === 1 || type === 'ROOT') return 'Root Account';
    if (type === 'MAIN' || u.mainAdmin === true || Number(u.mainAdmin) === 1) return 'Main Account';
    if (type === 'MASTER') return 'Master Account';
    if (type === 'BRAND_OWNER') return 'Brand Owner';
    if (u.role) return String(u.role);
    return 'Admin';
  }

  function dockHtml() {
    var u = user();
    var name = displayName(u);
    var role = roleLabel(u);
    return '<a class="' + LINK_CLASS + '" href="profile.html"' +
        ' title="' + esc(name + ' - ' + role) + '"' +
        ' aria-label="Account settings - ' + esc(name + ', ' + role) + '"' +
        ' data-rail-label="' + esc(name) + '">' +
        '<span class="main-side-account-avatar" aria-hidden="true"><i class="bi bi-person"></i></span>' +
        '<span class="main-side-account-text">' +
          '<b class="main-side-account-name" data-admin-name>' + esc(name) + '</b>' +
          '<small class="main-side-account-role" data-admin-role>' + esc(role) + '</small>' +
        '</span>' +
      '</a>';
  }

  /* Lift the account block out of the topbar. An empty host is removed outright, so a
     later BO_AUTH.injectProfile() (it only rewrites hosts that still exist) cannot put
     the chip back; a host that kept counters stays and is watched instead. */
  function retireTopbarAccount() {
    Array.prototype.forEach.call(document.querySelectorAll(TOPBAR_HOST), function (host) {
      var link = host.querySelector('.bo-account-link');
      if (link) link.parentNode.removeChild(link);
      if (!host.children.length && host.parentNode) host.parentNode.removeChild(host);
    });
  }

  function syncRailLabel(dock) {
    var link = dock.querySelector('.' + LINK_CLASS);
    if (!link) return;
    // The collapsed rail hides the text block and the rail label panel paints
    // `data-rail-label` on hover, so it has to follow the name renderProfile() writes.
    var name = link.querySelector('[data-admin-name]');
    var label = name ? String(name.textContent || '').trim() : '';
    if (label && link.getAttribute('data-rail-label') !== label) {
      link.setAttribute('data-rail-label', label);
    }
  }

  function ensureDock() {
    var sidebar = document.querySelector('.report-sidebar');
    if (!sidebar) return;
    var dock = sidebar.querySelector('.' + DOCK_CLASS);
    if (!dock) {
      dock = document.createElement('div');
      dock.className = DOCK_CLASS;
    }
    var footer = sidebar.querySelector('.bo-sidebar-account-footer');
    // Above the Logout line: before the footer, outside it.
    if (footer) {
      if (dock.parentNode !== sidebar || dock.nextElementSibling !== footer) {
        sidebar.insertBefore(dock, footer);
      }
    } else if (dock.parentNode !== sidebar) {
      sidebar.appendChild(dock);
    }
    if (dock.getAttribute('data-main-side-account-ready') !== '1') {
      dock.innerHTML = dockHtml();
      dock.setAttribute('data-main-side-account-ready', '1');
    }
    syncRailLabel(dock);
  }

  /* The footer only appears after auth.js's /me + /ui-setting chain resolves, and that
     chain re-runs on every menu refresh - so both the dock's placement and the topbar
     host's (re-)injection are watched rather than done once at DOMContentLoaded. */
  function watch() {
    var sidebar = document.querySelector('.report-sidebar');
    if (sidebar && sidebar.getAttribute('data-main-side-account-watch') !== '1') {
      sidebar.setAttribute('data-main-side-account-watch', '1');
      new MutationObserver(ensureDock).observe(sidebar, { childList: true });
    }
    Array.prototype.forEach.call(document.querySelectorAll(TOPBAR_HOST), function (host) {
      if (host.getAttribute('data-main-side-account-watch') === '1') return;
      host.setAttribute('data-main-side-account-watch', '1');
      new MutationObserver(retireTopbarAccount).observe(host, { childList: true });
    });
  }

  function boot() {
    if (!isMainPanelPage()) return;
    retireTopbarAccount();
    ensureDock();
    watch();
  }

  global.MAIN_SIDE_ACCOUNT = { mount: boot, isMainPanelPage: isMainPanelPage };

  // Loaded after auth.js, so its DOMContentLoaded handler (BO_AUTH.injectProfile) has
  // already run by the time this one does - the topbar host is painted and can be moved.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
