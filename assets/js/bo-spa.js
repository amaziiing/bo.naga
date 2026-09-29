/* BO client-side navigation ("B") - opt-in per page via <html data-bo-spa="1">.
 *
 * The BO is an MPA, so following a link threw the document away and re-mounted the whole
 * shell. This keeps the shell mounted and swaps only the content frame, which is what a
 * client-side router does: the rail, topbar and account block are never rebuilt and the
 * content area is never empty, so the white first-paint moment cannot happen either.
 *
 * WHY THE FIRST ATTEMPT WAS PARKED, AND WHAT CHANGED
 * It shipped site-wide once and broke the target page's own render - "the module tab row
 * and filter card never came back until a manual reload". Two independent causes, both
 * fixed here:
 *
 *   1. This file re-ran only the target page's script when its FILE NAME matched the page
 *      (base === file). index.html has no index.js, so a click on any rail link landed on
 *      an inert document: the script that builds the page was never executed.
 *      Now every script the target document carries that this document has not yet run is
 *      executed, in document order (see runScripts).
 *
 *   2. Every page's own script defers its work to `DOMContentLoaded`:
 *          document.addEventListener('DOMContentLoaded', () => { ...loadMembers(); });
 *      A swap never fires that event again, so even a correctly re-run script sat there
 *      having registered a listener that would never be called. After the scripts have
 *      run, this file REPLAYS DOMContentLoaded (see replayLifecycle). That replay is why
 *      the shared handlers had to be made idempotent - they hear it too, and the shell
 *      they bind to is the same DOM they bound to on the previous page.
 *
 *   (3. Third cause, now moot but worth recording: the section tab row is not part of the
 *      fetched document at all - renderModuleTabs builds it at runtime and inserts it
 *      INSIDE .report-content. Swapping the content frame therefore deleted it. apply()
 *      calls renderModuleTabs again after the swap, which rebuilds the row for the new
 *      page from location.pathname - so it is correct for a page in another module too,
 *      not just restored.)
 *
 * WHY THERE IS NO startViewTransition HERE
 * The shell was once left on screen as a half-transparent snapshot of itself (rail, tab row,
 * tiles, table header all faded) until something forced a repaint, and the conclusion on this
 * codebase was explicit: "navigation is a plain cut again, which never ghosts" (63e02220,
 * "Remove the view-transition rules"). That revert took out the CSS side (@view-transition,
 * the shortened crossfade, the shell view-transition-names); the JS entry point survived it
 * inside this file while this file was parked. It is not used, because a ghost is a rendering
 * artifact - it does not show up in a DOM level assertion, so it cannot be verified here, and
 * the safe default is the one that was already paid for once.
 *
 * SCOPE - deliberately narrow, because it now runs site-wide
 *   - it only takes over clicks on the module tab row, the rail, the Dashboard pin bar
 *     and anything explicitly marked [data-bo-spa-link]; every other link on the page
 *     behaves exactly as before;
 *   - the fetched page must build the same shell family as this one, and must itself
 *     carry data-bo-spa="1", otherwise it falls back to a real navigation;
 *   - any error, missing frame, cross-origin target, modified click or failed fetch falls
 *     back to a real navigation, i.e. today's behaviour.
 *
 * Kill switches, without touching a single page:
 *   localStorage bo_spa = '0'   or   window.BO_SPA_OFF = true
 */
(function () {
  'use strict';

  var root = document.documentElement;
  if (root.getAttribute('data-bo-spa') !== '1') return;
  if (window.BO_SPA_OFF) return;
  try { if (localStorage.getItem('bo_spa') === '0') return; } catch (e) {}
  if (!window.fetch || !window.history || !history.pushState || !window.DOMParser || !window.Promise) return;

  var CONTENT = '.report-content';
  var LINKS = '.bo-module-tabs a[href], .report-nav a[href], .bo-global-quicknav a[href], [data-bo-spa-link]';
  var DOC = document;
  var CACHE = {};                        // href -> Promise<Document>
  var EXECUTED = {};                     // script key -> already run in this document
  var CSS_SEEN = {};                     // stylesheet key -> already in this document
  var STYLE_SEEN = {};                   // inline <style> fingerprint -> already applied
  var busy = false;
  var scrollMemo = {};                   // href (pathname+search) -> scrollY
  var current = null;                    // href we are on / heading to
  var JS_TYPES = ['', 'text/javascript', 'application/javascript', 'module',
    'text/ecmascript', 'application/ecmascript'];

  // The browser's own scroll restoration fights a swap (it restores a position belonging
  // to the previous document). This file restores deliberately, per history entry.
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  function assetKey(raw) {
    return String(raw || '').split('#')[0].split('?')[0].split('/').pop();
  }

  /* Cheap content fingerprint for inline <style> de-duplication. The text itself would
     work as an object key but runs to several KB on the pages that carry a big block. */
  function fp(s) {
    var h = 5381, i = s.length;
    while (i) h = (h * 33) ^ s.charCodeAt(--i);
    return (h >>> 0).toString(36) + ':' + s.length;
  }

  function href_of(a) { try { return new URL(a.href, location.href); } catch (e) { return null; } }

  function here() { return location.pathname + location.search; }

  /* Seed what this document already has, so a swap only ever ADDS what the target page
     needs and never re-adds the shell's own infrastructure.

     Called twice on purpose: once at parse time, and again on window load. The parse-time
     call sees only the scripts BEFORE this file, and this file sits near the end of the
     body - on a page with anything after it, those scripts would be missing from the map
     and would be re-executed on a later visit to the page (their listeners, their timers
     and their fetches would all run a second time). By `load` every script in the document
     has run, so the second pass is exact. Swaps only ever happen after load, so the map is
     always complete by the time it is read.

     Inline scripts are recorded with the same fingerprint collectScripts uses. Leaving them
     out (which this did at first) meant an inline script was never marked as run, so every
     visit to a page re-executed it: window state it initialised was reset and every
     listener it registered was registered again. Measured on the harness page: navigating
     A -> B -> A reset A's inline log and made one event report twice. */
  function seed() {
    each(DOC.querySelectorAll('script'), function (s) {
      var src = s.getAttribute('src');
      if (src) { EXECUTED[assetKey(src)] = 1; return; }
      var type = String(s.getAttribute('type') || '').toLowerCase().trim();
      if (JS_TYPES.indexOf(type) < 0) return;
      var text = s.textContent || '';
      if (text.trim()) EXECUTED['inline:' + fp(text)] = 1;
    });
    each(DOC.querySelectorAll('link[rel="stylesheet"]'), function (l) {
      CSS_SEEN[assetKey(l.getAttribute('href'))] = 1;
    });
    each(DOC.querySelectorAll('head style'), function (s) {
      var t = s.textContent || '';
      if (t.trim()) STYLE_SEEN[fp(t)] = 1;
    });
  }
  seed();

  function eligible(a) {
    if (!a || !a.getAttribute) return false;
    if (a.target && a.target !== '' && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    if (a.hasAttribute('data-bo-no-spa')) return false;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return false;
    var u = href_of(a);
    if (!u || u.origin !== location.origin) return false;
    if (u.pathname === location.pathname && u.search === location.search) return false;
    return /\.html$/.test(u.pathname);
  }

  function getDoc(href) {
    if (!CACHE[href]) {
      CACHE[href] = fetch(href, { credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.text();
      }).then(function (html) { return new DOMParser().parseFromString(html, 'text/html'); })
        ['catch'](function (e) { delete CACHE[href]; throw e; });
    }
    return CACHE[href];
  }

  /* Shell identity. This used to be guessed from substrings of the <body> class, which is
     wrong often enough to matter now that the router runs site-wide: 21 agent-portal pages
     carry `report-body ... bo-charcoal` and were therefore classified as the normal BO, and
     main-accounting-report.html / main-profile.html / main-stat-detail.html carry no
     `main-` token at all and were classified as BO too. Either mistake lets the router swap
     between two DIFFERENT shells - exactly the unification AGENTS.md forbids for the Main
     panel and the agent portal.

     So the family is declared, not inferred: scripts/adopt-bo-spa.js stamps data-bo-shell
     from the file name, which is the same rule AGENTS.md uses to scope the shell. Missing or
     unequal -> real navigation (this fails closed). */
  function shellOf(el) {
    return el && el.getAttribute ? String(el.getAttribute('data-bo-shell') || '') : '';
  }

  /* Why this target cannot be swapped to, or null when it can. Returns the reason rather
     than a boolean because the caller used to fail silently: a page that declares another
     shell just navigated for real, with nothing in the console to say which of the six
     conditions was the one that failed. */
  function swapBlocker(doc) {
    if (!doc || !doc.body) return 'fetched document has no body';
    if (doc.documentElement.getAttribute('data-bo-spa') !== '1') return 'target has not opted in (no data-bo-spa)';
    var mine = shellOf(DOC.documentElement), theirs = shellOf(doc.documentElement);
    if (!mine) return 'this page declares no data-bo-shell';
    if (!theirs) return 'target declares no data-bo-shell';
    if (mine !== theirs) return 'different shell (' + mine + ' -> ' + theirs + ')';
    if (!DOC.querySelector(CONTENT)) return 'this page has no ' + CONTENT;
    if (!doc.querySelector(CONTENT)) return 'target has no ' + CONTENT;
    return null;
  }

  /* ---- head: stylesheets and inline <style> blocks ------------------------------- */

  function waitForLink(el) {
    return new Promise(function (resolve) {
      var settled = false;
      function done() { if (settled) return; settled = true; resolve(); }
      el.addEventListener('load', done);
      el.addEventListener('error', done);
      setTimeout(done, 4000);   // a sheet that never settles must not block the swap
    });
  }

  /* Every page styles its own content through its own sheets and its own <body> class, so
     a content-only swap would leave the new content wearing the previous page's rules -
     the "design went wrong" symptom. The sheets are ADDED and awaited BEFORE the body
     class changes and before the content moves: applying the class first would paint the
     new page against the old page's cascade for as long as the request takes. */
  function syncHead(doc) {
    var pending = [];
    each(doc.querySelectorAll('link[rel="stylesheet"]'), function (l) {
      var raw = l.getAttribute('href') || '';
      var key = assetKey(raw);
      if (!raw || !key || CSS_SEEN[key]) return;
      CSS_SEEN[key] = 1;
      var el = DOC.createElement('link');
      el.rel = 'stylesheet';
      el.href = raw;
      el.setAttribute('data-bo-spa-css', key);
      DOC.head.appendChild(el);
      pending.push(waitForLink(el));
    });
    each(doc.querySelectorAll('head style'), function (s) {
      var text = s.textContent || '';
      if (!text.trim()) return;
      var key = fp(text);
      if (STYLE_SEEN[key]) return;
      STYLE_SEEN[key] = 1;
      var el = DOC.createElement('style');
      el.setAttribute('data-bo-spa-style', key);
      el.textContent = text;
      DOC.head.appendChild(el);
    });
    // The fetched document never ran its own inline theme bootstrap, so it carries no
    // data-bo-theme. This document's value is the user's, and must be left alone.
    return Promise.all(pending);
  }

  /* ---- body: scripts ------------------------------------------------------------- */

  /* Every script the target document carries that this document has not run yet, in
     document order. Inline scripts count: pages keep one or two of them, and they are
     part of how the page boots. Non-JS script tags (speculationrules, JSON payloads)
     are skipped - they are data, not code. */
  function collectScripts(doc) {
    var out = [];
    each(doc.querySelectorAll('script'), function (s) {
      if (s.hasAttribute('data-bo-spa-skip')) return;
      var type = String(s.getAttribute('type') || '').toLowerCase().trim();
      if (JS_TYPES.indexOf(type) < 0) return;
      var src = s.getAttribute('src');
      if (src) {
        var key = assetKey(src);
        if (!key || EXECUTED[key]) return;
        EXECUTED[key] = 1;
        out.push({ src: src });
        return;
      }
      var text = s.textContent || '';
      if (!text.trim()) return;
      var tkey = 'inline:' + fp(text);
      if (EXECUTED[tkey]) return;
      EXECUTED[tkey] = 1;
      out.push({ text: text });
    });
    return out;
  }

  /* Strictly sequential: a page's scripts were authored to run in document order, and
     several of them depend on the previous one having defined its globals. */
  function runScripts(list, done) {
    var i = 0;
    (function next() {
      if (i >= list.length) { done(); return; }
      var item = list[i++];
      var el = DOC.createElement('script');
      el.setAttribute('data-bo-spa-script', '1');
      if (!item.src) {
        el.textContent = item.text;
        DOC.body.appendChild(el);
        next();
        return;
      }
      var settled = false;
      function finish() { if (settled) return; settled = true; next(); }
      el.src = item.src;
      el.async = false;
      el.onload = finish;
      el.onerror = finish;
      DOC.body.appendChild(el);
      setTimeout(finish, 8000);
    })();
  }

  /* The event every page script waits for. It fired once, for the document this swap is
     reusing, so a script executed a moment ago would otherwise sit behind a listener
     that will never be called. Known cost: the shared handlers hear it too. They are
     required to be idempotent for exactly this reason - see reports.js, auth.js,
     main-sidebar-account.js and pagination-standardizer.js, each carrying a guard with
     a comment pointing back here. */
  function replayLifecycle() {
    var ev;
    try { ev = new Event('DOMContentLoaded', { bubbles: false, cancelable: false }); }
    catch (e) {
      ev = DOC.createEvent('Event');
      ev.initEvent('DOMContentLoaded', false, false);
    }
    try { DOC.dispatchEvent(ev); } catch (e) {}
  }

  /* ---- shell: title, icon, active states ----------------------------------------- */

  function syncShell(doc) {
    var to = DOC.querySelector('[data-bo-topbar]');
    if (to) {
      var from = doc.querySelector('[data-bo-topbar]');
      var b = to.querySelector('h1');
      var text = '';
      if (from) {
        var a = from.querySelector('h1');
        if (a) text = (a.textContent || '').trim();
        var ai = from.querySelector('i'), bi = to.querySelector('i');
        if (ai && bi) bi.className = ai.className;
      }
      // The topbar title is painted from menu data at runtime, so the fetched document
      // still has the host empty. Fall back to the target page's own <title> rather than
      // leaving the previous page's title sitting there.
      if (!text) text = (doc.title || '').split(/[-|·]/)[0].trim();
      if (!text) {
        var h = doc.querySelector('.report-content h1, .report-content h2, .manage-form-card h1');
        if (h) text = (h.textContent || '').trim();
      }
      if (b && text) b.textContent = text;
    }
    if (doc.title) DOC.title = doc.title;
  }

  function activateTab(u) {
    each(DOC.querySelectorAll('.bo-module-tab'), function (t) {
      var on = false, tu = href_of(t);
      if (tu) on = tu.pathname === u.pathname;
      t.classList.toggle('is-active', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
  }

  /* The rail is never rebuilt by a swap, so its active row - and the open state of the
     group holding it - has to be re-pointed here. Three cases, in this order:
       1. a rail row links straight at this page        -> that row
       2. a group's submenu holds this page             -> that sub-item, group opened
       3. neither (the page is a module tab or a drill-down inside a module) -> keep the
          row that was active before the swap. Switching module tabs stays inside one
          module, so the rail row it belongs under does not change while the page does;
          recomputing from the file name alone would clear it and leave nothing marked.
     Cheaper and quieter than calling renderSidebar, which would wipe and rebuild the
     whole rail (and reset its scroll position) to move one class. */
  function captureRail() {
    var nav = DOC.querySelector('.report-nav');
    if (!nav) return null;
    var a = nav.querySelector('a.active');
    // An active state that is not derived from a href (the group button of an open
    // flyout) still has to survive case 3, so remember the group too.
    return a ? a : null;
  }

  function activateRail(u, prev) {
    var nav = DOC.querySelector('.report-nav');
    if (!nav) return;
    var file = assetKey(u.pathname);

    var target = null;
    each(nav.querySelectorAll('a[href]'), function (a) {
      if (target) return;
      if (assetKey(a.getAttribute('href')) === file) target = a;
    });
    if (!target && prev && nav.contains(prev)) target = prev;

    each(nav.querySelectorAll('a.active'), function (a) { a.classList.remove('active'); });
    if (!target) return;
    target.classList.add('active');

    var group = target.closest ? target.closest('.nav-group') : null;
    each(nav.querySelectorAll('.nav-group.open'), function (g) {
      if (g === group) return;
      g.classList.remove('open');
      var l = g.querySelector(':scope > .nav-group-list');
      if (l) l.classList.remove('show');
      var b = g.querySelector(':scope > .nav-group-btn');
      if (b && b.setAttribute) b.setAttribute('aria-expanded', 'false');
    });
    if (group) {
      group.classList.add('open');
      var list = group.querySelector(':scope > .nav-group-list');
      if (list) list.classList.add('show');
      var btn = group.querySelector(':scope > .nav-group-btn');
      if (btn && btn.setAttribute) btn.setAttribute('aria-expanded', 'true');
    }
  }

  /* ---- the swap ------------------------------------------------------------------ */

  function scrollTo(y) {
    try { window.scrollTo(0, y); } catch (e) {}
  }

  function apply(doc, u, push) {
    var from = DOC.querySelector(CONTENT);
    var to = doc.querySelector(CONTENT);
    if (!from || !to) return Promise.resolve(false);
    var prevRail = captureRail();

    return syncHead(doc).then(function () {
      /* The section tab row lives inside the content frame (auth.js renderModuleTabs
         inserts it at .report-content:first-child), so replacing the children deletes
         it. Rebuilding it afterwards is both the fix for that and the reason the row is
         correct when the target page belongs to a different module: it is derived from
         location.pathname, which pushState has just updated. */
      from.replaceChildren.apply(from, Array.prototype.slice.call(to.childNodes));
      if (doc.body && doc.body.className) DOC.body.className = doc.body.className;

      // URL first: page scripts re-read location.search/pathname, and a drill-down page
      // that never sees its own query string renders as if it had none.
      if (push) history.pushState({ boSpa: 1 }, '', u.href);
      current = u.pathname + u.search;

      if (window.BO_AUTH && BO_AUTH.renderModuleTabs) {
        try { BO_AUTH.renderModuleTabs(BO_AUTH.user()); } catch (e) {}
      }

      return new Promise(function (resolve) {
        runScripts(collectScripts(doc), function () {
          replayLifecycle();
          resolve(true);
        });
      });
    }).then(function (ok) {
      syncShell(doc);
      activateTab(u);
      activateRail(u, prevRail);
      scrollTo(0);
      DOC.dispatchEvent(new CustomEvent('bo:spa:content', { detail: { url: u.href } }));
      return ok;
    });
  }

  function fallback(href, reason) {
    try {
      DOC.dispatchEvent(new CustomEvent('bo:spa:fail', { detail: { url: href, reason: String(reason || '') } }));
    } catch (e) {}
    if (window.console && console.warn) console.warn('[bo-spa] falling back to a full load:', reason);
    location.href = href;
  }

  /* A resolved `false` from apply() is a FAILURE, not a no-op: it means the content frame
     was missing on one of the two sides. It has to re-enter the real navigation. Letting it
     resolve silently leaves the user on the old page with the new URL unset and nothing
     reported - which is how the first attempt at this file looked "dead" instead of broken. */
  function commitOf(doc, u, push, href) {
    return apply(doc, u, push).then(function (ok) {
      if (!ok) fallback(href, 'no content frame');
      return ok;
    }, function (e) {
      fallback(href, (e && e.message) || e);
      return false;
    });
  }

  function go(href, u, push) {
    if (busy) return;
    busy = true;
    scrollMemo[here()] = window.pageYOffset || 0;
    getDoc(href).then(function (doc) {
      var why = swapBlocker(doc);
      if (why) { busy = false; fallback(href, why); return; }
      busy = false;
      // Never rejects: a failed swap has to leave the user on a working page, so it
      // re-enters the real navigation instead of unwinding into an unhandled rejection.
      var commit = function () { return commitOf(doc, u, push, href); };
      // Plain cut, matching the decision above. The promise is still consumed so a failure
      // cannot become an unhandled rejection.
      commit();
    })['catch'](function (e) { busy = false; fallback(href, e && e.message); });
  }

  DOC.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest(LINKS) : null;
    if (!eligible(a)) return;
    e.preventDefault();
    go(a.href, href_of(a), true);
  });

  window.addEventListener('popstate', function () {
    if (busy) return;
    var u = new URL(location.href);
    if (!/\.html$/.test(u.pathname)) { location.reload(); return; }
    busy = true;
    getDoc(u.href).then(function (doc) {
      busy = false;
      var why = swapBlocker(doc);
      if (why) { fallback(u.href, why); return; }
      var target = u.pathname + u.search;
      var restore = scrollMemo[target];
      var commit = function () {
        return commitOf(doc, u, false, u.href).then(function (ok) {
          if (ok && typeof restore === 'number') scrollTo(restore);
        });
      };
      commit();
    })['catch'](function () { busy = false; location.reload(); });
  });

  /* Warm the pages the rail and the tab row can reach, so the first click on each is
     already a document we hold. */
  window.addEventListener('load', function () {
    seed();
    setTimeout(function () {
      var n = 0;
      each(DOC.querySelectorAll('.bo-module-tab[href], .report-nav a[href]'), function (a) {
        if (n >= 10 || !eligible(a)) return;
        n++;
        getDoc(a.href)['catch'](function () {});
      });
    }, 1000);
  });

  window.BO_SPA = {
    on: true,
    go: function (href) { var u = new URL(href, location.href); go(u.href, u, true); },
    current: function () { return current; }
  };
})();
