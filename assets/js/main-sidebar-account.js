/* Main panel - the signed-in account block IS the rail's header row.

   WHY
   The Main panel is driven from one account, so the topbar chip spent the header's right-hand
   slot on information that never changes. The owner first asked for the block to move down into
   the sidebar ("我要把我框起来的用户，移动去logout上方"); looking at the rail, the next request
   was for the rail's own title to go: "把account卡片 替换sidebar的标题（backoffice）所以标题可移除
   把acc卡片替换上去" - the "Backoffice" title is removed and the account card takes its place at
   the top of the rail. Only the Main panel moves; every other BO page keeps its topbar chip
   exactly as it is.

   WHAT MOVES - THE BLOCK, NOT A COPY
   auth.js still renders the chip (its own markup, its own /me data) into every
   `[data-bo-profile]` host. On a Main panel page this script takes the `.bo-account-link` out of
   the topbar host and paints the same block in the rail instead, and removes the now-empty host.
   Anything else that host carried stays: the three pending-operation counters render for a
   non-MAIN account (e.g. ROOT browsing the BO host), and they are the header's, not the rail's -
   so they stay in the header.

   The rail block reuses auth.js's own painting hooks - `data-admin-name` and `data-admin-role` -
   so BO_AUTH.renderProfile() (called after every /me refresh) keeps this block in step with the
   session with no second sync path. The wording helper below therefore has to agree with
   auth.js roleLabel(): the same account must not read "Main Account" here and something else in
   the header of another page.

   TWO HOMES, ONE NODE
   Expanded rail: the brand row, in the title's place as its first child - the 42px rail toggle
   keeps the right-hand slot. The title node is removed (the owner asked for it to go), and
   assets/css/main-sidebar-account.css also hides it from the first paint so the removed title
   cannot flash in the frame between first paint and this script.
   Collapsed rail: the row above Logout, where the block has lived since the first request. The
   72px rail's brand is the toggle's own slot (42px button inside 12px insets), so the card cannot
   sit beside it - and reports.css hides every `.report-brand > div:not(.logo)` at that width
   anyway. The collapsed state is the `sidebar-mini` body class (reports.js), which is watched
   here rather than read once.

   SCOPE - THE PORTAL, NOT A FILE LIST
   Main panel = the portal the MAIN account is in. It cannot be a filename family: the Main
   portal's menus are DB rows and at least one of them points at a BO file (menu-management.html,
   data-bo-shell="bo"), and its own role page links through to role-create.html - the owner found
   the first of those with "Backoffice" still where the card belongs ("检查到 main的页面 很多页面他
   的sidebar 的acc没在最上面"). So the test is the one auth.js already uses for the rail's own pins
   (account-first), plus the production host, plus the filename family a local checkout has to
   fall back on because both portals share 127.0.0.1. auth.js carries the same predicate for its
   loader (mountMainRailCard) and asks for these two files on any page that does not link them.
   A MAIN account on a normal BO page therefore moves the chip here too - in production that
   combination cannot happen (auth.js's portal isolation sends a MAIN account to the main host
   and a BO account away from it), and in a local checkout it is the same person and the same
   rail, so the card is the right answer there as well.

   THE PIN THIS FILE DOES NOT OWN
   auth.js's mountMainRailCard injects this file and its sheet with a hand-written ?v= (the
   asset-pin guard reads HTML only). Any change here has to be re-stamped there too, or a
   browser that already cached the injected URL keeps running the old copy on every page the
   Main portal reaches through a BO file.

   WHERE THE BOTTOM PLACEMENT SITS
   A sibling of `.bo-sidebar-account-footer`, immediately BEFORE it - never inside it. The
   footer's border-top is the one hairline between the account block and Logout (that is the
   "logout line" the owner pointed at), and bo-ui-standard.css pins the footer's height per page
   so its line meets the page's sticky action bar. Keeping the block outside the footer leaves
   both of those untouched.

   Presentation lives in assets/css/main-sidebar-account.css. Both files are loaded by the Main
   panel pages only.
*/
(function (global) {
  'use strict';

  var USER_KEY = 'bo_admin_user';
  var DOCK_CLASS = 'main-side-account';
  var LINK_CLASS = 'main-side-account-link';
  var TOPBAR_HOST = '.report-actions [data-bo-profile]';
  /* The marker the sheet styles the brand row by. A class of this block's own rather than a
     `data-bo-shell` scope: the row has to be styled on BO files served in the Main portal as
     well (menu-management.html declares data-bo-shell="bo"), and a shell-class selector in the
     sheet would go straight into the drift guard's scope. See assets/css/main-sidebar-account.css. */
  var BRAND_CLASS = 'main-rail-brand';
  /* The brand's title is every direct `div` that is not the logo - the dock itself is excluded
     by the caller, because after the first placement it is one of them. */
  var BRAND_TITLE = ':scope > div:not(.logo)';

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
    /* Mirrors auth.js's mountMainRailCard (which runs before this file has loaded) and the pins'
       own isMainPanel test in auth.js's menuLinkHtml. Change one, change the others. */
    var host = String(location.hostname || '').toLowerCase();
    if (host === 'main.titanx7.com' || host === 'www.main.titanx7.com') return true;
    var f = pageFile();
    if (/^main[-_]/i.test(f) || f === 'menu-permission') return true;
    var u = user();
    var type = String(u.roleType || '').toUpperCase();
    return type === 'MAIN' || u.mainAdmin === true || Number(u.mainAdmin) === 1;
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
    return '<a class="' + LINK_CLASS + '" href="main-profile.html"' +
        ' title="' + esc(name + ' - ' + role) + '"' +
        ' aria-label="Account settings - ' + esc(name + ', ' + role) + '"' +
        ' data-rail-label="' + esc(name) + '">' +
        '<span class="main-side-account-avatar" aria-hidden="true"><i class="bi bi-person"></i></span>' +
        '<span class="main-side-account-text">' +
          '<b class="main-side-account-name" data-admin-name>' + esc(name) + '</b>' +
          // A span, not the <small> this line started as: inside `.report-brand` the brand's
          // own subtitle treatment matches every `small` in 30 rules (10px / bold / .14em
          // tracking / uppercase, several of them !important), so the role line would read as
          // the brand's subtitle - differently on every page family. auth.js's own chip paints
          // its role line as a span for the same reason.
          '<span class="main-side-account-role" data-admin-role>' + esc(role) + '</span>' +
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

  /* The title the block replaces is removed rather than covered: a `display:none` title stays in
     the DOM for every page script that looks it up, and the owner asked for it to go. `.logo` and
     the dock are the two things in that row that are not the title. */
  function retireBrandTitle(brand, dock) {
    Array.prototype.forEach.call(brand.querySelectorAll(BRAND_TITLE), function (node) {
      if (node === dock || node.classList.contains(DOCK_CLASS)) return;
      node.parentNode.removeChild(node);
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
    var brand = sidebar.querySelector('.report-brand');
    if (brand) {
      // The marker and the title are the brand row's business in BOTH rail states: the title is
      // the card's predecessor and the owner asked for it to go, and the collapsed rail is no
      // reason to keep a hidden node (reports.css hides it at that width too). The card itself
      // only moves into the row when there is one to move into - a 72px rail's brand is the
      // toggle's slot alone.
      brand.classList.add(BRAND_CLASS);
      retireBrandTitle(brand, dock);
    }
    if (brand && !document.body.classList.contains('sidebar-mini')) {
      // Expanded rail: the title's place, first in the row.
      if (dock.parentNode !== brand || brand.firstElementChild !== dock) {
        brand.insertBefore(dock, brand.firstChild);
      }
    } else {
      var footer = sidebar.querySelector('.bo-sidebar-account-footer');
      // Collapsed rail: above the Logout line, before the footer and outside it.
      if (footer) {
        if (dock.parentNode !== sidebar || dock.nextElementSibling !== footer) {
          sidebar.insertBefore(dock, footer);
        }
      } else if (dock.parentNode !== sidebar) {
        sidebar.appendChild(dock);
      }
    }
    if (dock.getAttribute('data-main-side-account-ready') !== '1') {
      dock.innerHTML = dockHtml();
      dock.setAttribute('data-main-side-account-ready', '1');
    }
    syncRailLabel(dock);
  }

  /* The footer only appears after auth.js's /me + /ui-setting chain resolves, and that chain
     re-runs on every menu refresh - so the dock's placement and the topbar host's (re-)injection
     are watched rather than done once at DOMContentLoaded. The `sidebar-mini` class moves the
     block between its two homes, so the body's class list is watched too. */
  function watch() {
    var sidebar = document.querySelector('.report-sidebar');
    if (sidebar && sidebar.getAttribute('data-main-side-account-watch') !== '1') {
      sidebar.setAttribute('data-main-side-account-watch', '1');
      new MutationObserver(ensureDock).observe(sidebar, { childList: true });
    }
    var body = document.body;
    if (body && body.getAttribute('data-main-side-account-watch') !== '1') {
      body.setAttribute('data-main-side-account-watch', '1');
      new MutationObserver(ensureDock).observe(body, { attributes: true, attributeFilter: ['class'] });
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

  /* Loaded after auth.js, so its DOMContentLoaded handler (BO_AUTH.injectProfile) has
     already run by the time this one does - the topbar host is painted and can be moved. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* The router replaces `.report-main > .report-topbar` with the target page's own header and
     then asks auth.js to paint the chip into it - all of that AFTER the target's scripts have
     run. On a main-to-main swap this file is skipped as "already executed on both pages", so
     without this the chip came back into the header and the dock's own row was never re-checked.
     bo:spa:content is dispatched once the header is the target's. */
  document.addEventListener('bo:spa:content', boot);
})(window);
