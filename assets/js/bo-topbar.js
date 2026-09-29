/* Shared topbar renderer (phase 0+1: opt-in per page, inert everywhere else).

   WHY
   The page header (hamburger · icon+title · theme toggle · account) was copy-pasted
   into ~135 pages, and the title icon alone had drifted to 70 different values. This
   renders that markup from one place so a page only ships:

       <header class="report-topbar" data-bo-topbar></header>
       <script src="assets/js/bo-topbar.js?v=1"></script>

   DATA SOURCE
   Title and icon come from the same menu row the sidebar uses - the row already
   carries `title` + `icon` and is editable in Menu Management, so no per-page config
   exists and no code change is needed to rename a page or swap its icon.
   Resolution order (first hit wins):
       data-bo-title / data-bo-icon   (per-page pin, for drill-downs with no menu row)
       menu row matching this URL      (status=1, lowest sortOrder - same rule the
                                        sidebar uses to pick its active chip)
       document.title
       file name
   The cached user (`bo_admin_user`, written at login and refreshed by /me) is read
   straight from localStorage so the correct title paints on the first frame instead
   of flashing the fallback; BO_TOPBAR.refresh() re-reads it once auth.js has
   finished its /me round trip.

   WHY THIS SCRIPT SITS RIGHT AFTER THE <header> INSTEAD OF WITH THE BOTTOM SCRIPTS
   reports.js binds `[data-open-sidebar], .hamb` and bo-theme.js binds #boThemeToggle
   at DOMContentLoaded. Mounting during parse keeps those bindings working and avoids
   an empty-header flash at the top of the page (the same flash the sidebar toggle was
   previously fixed for).

   CONTRACT - these are load-bearing, do not rename:
     #boThemeToggle / .bo-theme-btn / [data-theme-icon]  -> bo-theme.js
     .hamb / [data-open-sidebar]                         -> reports.js
     .report-actions [data-bo-profile]                   -> auth.js injectProfile()
     .user-title-wrap h1 / .user-title-icon i            -> read or restyled by
                                                            crud-modal-pattern.js,
                                                            admin-user-create.js,
                                                            main-merchant-detail.js,
                                                            member-transaction-page.js
   Anything a page still needs inside the header goes in a `[data-bo-topbar-extra]`
   element; mount() moves it into .report-actions after the account block.
*/
(function (global) {
  'use strict';

  var USER_KEY = 'bo_admin_user';
  var THEME_TITLE = 'Switch to dark mode';

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fileBase(p) {
    return String(p || '').split('/').pop().split('?')[0].split('#')[0].toLowerCase();
  }

  /* The cached menus mirror what BO_AUTH.user() returns, but are readable before
     auth.js has loaded. Bad/absent JSON is treated as "no menus" - never throw. */
  function cachedMenus() {
    try {
      var u = JSON.parse(localStorage.getItem(USER_KEY) || '{}') || {};
      return Array.isArray(u.menus) ? u.menus : [];
    } catch (e) {
      return [];
    }
  }

  /* Same matching rule as the sidebar's active chip: keep enabled rows for this URL,
     then let sortOrder decide (a URL can legitimately appear under two groups). */
  function menuFor(file) {
    var rows = cachedMenus().filter(function (m) {
      if (!m) return false;
      if (Number(m.status == null ? 1 : m.status) !== 1) return false;
      return fileBase(m.url || m.href) === file;
    });
    rows.sort(function (a, b) {
      return (Number(a.sortOrder || 0) - Number(b.sortOrder || 0)) ||
        String(a.title || '').localeCompare(String(b.title || ''));
    });
    return rows[0] || null;
  }

  function resolve(el) {
    var file = fileBase(location.pathname);
    var menu = menuFor(file);
    var title = el.getAttribute('data-bo-title') || (menu && menu.title) ||
      document.title || file.replace(/\.html$/, '');
    var icon = el.getAttribute('data-bo-icon') || (menu && menu.icon) || 'bi-circle';
    /* Optional second line. Pages that carry one keep it in data-bo-subtitle; it is
       page copy, so there is no menu fallback for it. */
    var subtitle = el.getAttribute('data-bo-subtitle') || '';
    return {
      title: String(title).replace(/\s+/g, ' ').trim(),
      icon: String(icon).replace(/^bi\s+/, '').trim() || 'bi-circle',
      subtitle: String(subtitle).replace(/\s+/g, ' ').trim(),
      /* Per-page bits the shared shell must not swallow: several pages hang a live
         counter badge or status pill off the title, put an id/aria attribute on the
         icon slot, or wrap the text in their own class. */
      hambAria: el.getAttribute('data-bo-hamb-aria') || '',
      iconId: el.getAttribute('data-bo-icon-id') || '',
      iconAria: el.getAttribute('data-bo-icon-aria') || '',
      titleBlockClass: el.getAttribute('data-bo-title-block-class') || '',
      /* Some pages hang a live counter or status pill off the title, and a few keep the
         h1 inside their own flex row so the pill sits beside it. Both stay expressible
         without copying the shell back into the page. */
      h1Id: el.getAttribute('data-bo-h1-id') || '',
      titleRowClass: el.getAttribute('data-bo-title-row-class') || ''
    };
  }

  function markup(t) {
    var h1 = '<h1' + (t.h1Id ? ' id="' + esc(t.h1Id) + '"' : '') + '>' + esc(t.title) + '</h1>';
    return '<button type="button" class="hamb" data-open-sidebar=""' +
        (t.hambAria ? ' aria-label="' + esc(t.hambAria) + '"' : '') + '>' +
        '<i class="bi bi-list"></i></button>' +
      '<div class="user-title-wrap">' +
        '<div class="user-title-icon"' +
          (t.iconId ? ' id="' + esc(t.iconId) + '"' : '') +
          (t.iconAria ? ' aria-hidden="' + esc(t.iconAria) + '"' : '') + '>' +
          '<i class="bi ' + esc(t.icon) + '"></i></div>' +
        '<div' + (t.titleBlockClass ? ' class="' + esc(t.titleBlockClass) + '"' : '') + '>' +
          (t.titleRowClass
            ? '<div class="bo-topbar-title-row ' + esc(t.titleRowClass) + '">' + h1 + '</div>'
            : h1) +
          (t.subtitle ? '<p>' + esc(t.subtitle) + '</p>' : '') +
        '</div>' +
      '</div>' +
      '<div class="report-actions">' +
        '<button type="button" class="bo-theme-btn" id="boThemeToggle" aria-pressed="false"' +
          ' title="' + esc(THEME_TITLE) + '" aria-label="' + esc(THEME_TITLE) + '">' +
          '<i class="bi bi-sun-fill" data-theme-icon="sun"></i>' +
          '<i class="bi bi-moon-fill" data-theme-icon="moon" hidden></i>' +
        '</button>' +
        '<div data-bo-profile></div>' +
      '</div>';
  }

  /* Mount every empty [data-bo-topbar] host. Idempotent: a mounted host is flagged,
     so a second call (or a re-render by another script) cannot stack a second bar. */
  function mount(root) {
    var hosts = root ? [root] : document.querySelectorAll('[data-bo-topbar]');
    var done = 0;
    Array.prototype.forEach.call(hosts, function (el) {
      if (!el || el.getAttribute('data-bo-topbar-ready') === '1') return;

      // Content the page still needs in the header travels with the mount:
      //   [data-bo-topbar-title-extra]  -> inside the title text block (counter badges)
      //   [data-bo-topbar-extra]        -> inside .report-actions (page buttons)
      var titleExtra = el.querySelector('[data-bo-topbar-title-extra]');
      var extra = el.querySelector('[data-bo-topbar-extra]');
      if (titleExtra) titleExtra.parentNode.removeChild(titleExtra);
      if (extra) extra.parentNode.removeChild(extra);

      el.innerHTML = markup(resolve(el));
      if (titleExtra) {
        // Land next to the h1 - inside the page's own title row when it has one.
        var host = el.querySelector('.bo-topbar-title-row') ||
                   el.querySelector('.user-title-wrap > div:last-child');
        if (host) host.appendChild(titleExtra); else el.appendChild(titleExtra);
      }
      if (extra) {
        var actions = el.querySelector('.report-actions');
        if (actions) actions.appendChild(extra); else el.appendChild(extra);
      }
      el.setAttribute('data-bo-topbar-ready', '1');
      done++;
    });
    return done;
  }

  /* Re-read the menu row after auth.js refreshes it and patch only the two data-driven
     bits, so the account block auth.js injected is never disturbed. Pages that pinned
     data-bo-title/data-bo-icon keep their pinned values. */
  function refresh() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-bo-topbar-ready="1"]'), function (el) {
      var t = resolve(el);
      var h1 = el.querySelector('.user-title-wrap h1');
      var icon = el.querySelector('.user-title-icon i');
      if (h1 && !el.hasAttribute('data-bo-title') && h1.textContent !== t.title) h1.textContent = t.title;
      if (icon && !el.hasAttribute('data-bo-icon')) {
        var want = 'bi ' + t.icon;
        if (icon.className !== want) icon.className = want;
      }
    });
  }

  global.BO_TOPBAR = { mount: mount, refresh: refresh, resolve: resolve };

  // Parse-time mount: the header precedes this script by design (see header comment).
  mount();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh);
    global.addEventListener('load', refresh);
  } else {
    refresh();
  }
})(window);
