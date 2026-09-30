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

  /* The element a swap replaces the children of.

     The standard pages use .report-content. A page that predates the standard shell has no
     such element (currency-management.html and main-dashboard.html keep their content in a
     .cur-page / .main-exec section beside the topbar), so it declares its own frame with
     data-bo-frame. Without that the router could not swap into it at all: it would fetch the
     page, find no frame, and fall back to a real navigation - a wasted request in front of
     every visit. Declared per page, resolved per document, so a swap between a standard page
     and a legacy one still finds the right element on each side. */
  var CONTENT = '.report-content';

  function frameOf(doc) {
    return doc.querySelector('[data-bo-frame]') || doc.querySelector(CONTENT);
  }
  var LINKS = '.bo-module-tabs a[href], .report-nav a[href], .bo-global-quicknav a[href], [data-bo-spa-link]';
  var DOC = document;
  var CACHE = {};                        // href -> Promise<Document>
  var EXECUTED = {};                     // script key -> already run in this document
  var CSS_SEEN = {};                     // stylesheet key -> already in this document
  var STYLE_SEEN = {};                   // inline <style> fingerprint -> already applied
  var busy = false;
  var scrollMemo = {};                   // href (pathname+search) -> scrollY
  var current = null;                    // href we are on / heading to
  /* Diagnostics. Every navigation keeps a record with the millisecond offset at which each
     phase finished, so a navigation that never finished still says WHERE it stopped -
     without that, a wedged swap only ever left an empty console. BO_SPA.report() returns
     the whole thing as one JSON string; the runtime errors are in the same string so a
     single paste is enough to tell which of the two is the cause. */
  var NAVLOG = [];
  var ERRORS = [];
  var currentRec = null;

  function log(msg) {
    try { if (window.console && console.info) console.info('[bo-spa] ' + msg); } catch (e) {}
  }

  function nav(href, via) {
    var o = {
      at: new Date().toISOString().substr(11, 12),
      from: here().replace(location.origin, ''),
      to: String(href).replace(location.origin, ''),
      via: via || 'link',
      t0: Date.now(),
      phase: 'start',
      phases: {}
    };
    NAVLOG.push(o);
    if (NAVLOG.length > 25) NAVLOG.shift();
    currentRec = o;
    log('nav ' + o.to + ' (via ' + o.via + ', from ' + o.from + ')');
    return o;
  }

  function note(name, extra) {
    if (!currentRec) return;
    currentRec.phase = name;
    currentRec.phases[name] = Date.now() - currentRec.t0;
    if (extra) for (var k in extra) currentRec[k] = extra;
    log(currentRec.to + ' | ' + name + (extra ? ' ' + JSON.stringify(extra) : ''));
  }
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
      var key = assetKey(l.getAttribute('href'));
      CSS_SEEN[key] = 1;
      own(l, key);
    });
    each(DOC.querySelectorAll('head style'), function (s) {
      var t = s.textContent || '';
      if (!t.trim()) return;
      var key = fp(t);
      STYLE_SEEN[key] = 1;
      s.setAttribute('data-bo-spa-style', key);
    });
    if (!seededExtras) {
      seededExtras = true;
      each(extraOf(DOC), ownExtra);
    }
  }

  /* Body-level elements the page itself declares outside the shell: the modal markup a page
     keeps beside its content (#approveModal on manual-rebate-approval.html, #ruleModal and
     #auditDetailModal on rebate-management.html). They are neither inside the swapped frame
     nor inside .report-shell, so nothing brought them in or took them out - arriving there
     from another page left the body as it was, the page's own script set .onclick on a
     missing node, and EVERY binding after that line never ran. The page rendered and did
     nothing, and a second visit "worked" because the stale modal from the first one was still
     sitting in the body.

     Only what the fetched markup declares is touched. The shell's own containers (crud-pattern
     modal, quicknav, alert/dialog) are created lazily or at DOMContentLoaded by shared
     scripts, so they appear in no page's markup and are never marked or removed. The scan runs
     at PARSE time only - at that point the body holds the page's own markup and nothing else. */
  var EXTRAS = [];
  var seededExtras = false;

  function extraOf(doc) {
    var out = [];
    each(doc.body ? doc.body.children : [], function (e) {
      if (e.tagName === 'SCRIPT') return;
      if (e.matches && e.matches('.report-shell')) return;
      if (e.querySelector && e.querySelector('.report-shell')) return;
      out.push(e);
    });
    return out;
  }

  function ownExtra(e) {
    e.setAttribute('data-bo-spa-extra', '1');
    EXTRAS.push(e);
  }

  function convergeExtras(doc) {
    for (var i = EXTRAS.length - 1; i >= 0; i--) {
      var e = EXTRAS[i];
      if (DOC.contains(e) && e.parentNode) e.parentNode.removeChild(e);
      EXTRAS.splice(i, 1);
    }
    each(extraOf(doc), function (src) {
      var clone = src.cloneNode(true);
      ownExtra(clone);
      DOC.body.appendChild(clone);
    });
  }
  /* The stylesheets and inline styles this document is currently running, so a swap can take
     the ones the next page does not have back out again. Only what is marked here is ever
     removed - a sheet a shared script injected at runtime (auth.js's quicknav link) is not
     ours and is left alone.

     Without this the sheet set only ever grew. Measured: arriving at promotion.html by swap
     carried 25 sheets against 22 for a direct load of the same page, and the extra ones were
     whatever every previously visited page had brought with it - unbounded in a long session,
     and the reason a page could look different depending on which page you came from (a
     legacy layout that ships no bo-shell.css picked up the previous page's metrics: content
     padding 18px after a swap, 0px on a direct load). */
  var SHEETS = [];

  function own(l, key) {
    if (!key || l.getAttribute('data-bo-spa-sheet') === key) return;
    var i;
    for (i = 0; i < SHEETS.length; i++) if (SHEETS[i].el === l) return;
    l.setAttribute('data-bo-spa-sheet', key);
    SHEETS.push({ el: l, key: key });
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
    if (!/\.html$/.test(u.pathname)) return false;
    /* Is the destination actually swappable? Knowing this BEFORE the fetch is the whole
       point of the manifest: without it the router fetched the target document, noticed it
       had no content frame (or had never opted in), and only then handed the link back to
       the browser - one wasted request in front of every ordinary navigation, which on a
       slow connection is worse than never intercepting the link at all. The agent portal,
       the redirect stubs and the legacy layouts are all left to the browser here.

       A page that is missing from the manifest is not broken: its links navigate
       normally. Regenerate with `node scripts/check-spa-readiness.js --write-manifest`
       after adopting a page, or that page simply keeps reloading until you do. */
    if (window.__BO_SPA_PAGES) {
      var file = u.pathname.replace(/^.*\//, '');
      if (!window.__BO_SPA_PAGES[file]) return false;
    }
    return true;
  }

  /* Parsed documents, keyed by href. Bounded on purpose: every entry is a whole Document,
     and an unbounded map of them is a leak in exactly the sessions this router is for - the
     ones where the user clicks through the whole back office without ever reloading. The
     oldest is dropped when the map grows past the cap; re-entering an evicted page costs one
     fetch, which is what the pointer prefetch below exists to hide. */
  var CACHE_MAX = 16;

  function getDoc(href) {
    if (!CACHE[href]) {
      CACHE[href] = fetch(href, { credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.text();
      }).then(function (html) { return new DOMParser().parseFromString(html, 'text/html'); })
        ['catch'](function (e) { delete CACHE[href]; throw e; });
      var keys = Object.keys(CACHE);
      if (keys.length > CACHE_MAX) {
        // From the front: the newest entries are the ones being navigated to right now.
        for (var i = 0; i < keys.length - CACHE_MAX; i++) delete CACHE[keys[i]];
      }
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
    if (!frameOf(DOC)) return 'this page has no ' + CONTENT;
    if (!frameOf(doc)) return 'target has no ' + CONTENT;
    return null;
  }

  /* ---- head: stylesheets and inline <style> blocks ------------------------------- */

  function waitForLink(el) {
    return new Promise(function (resolve) {
      var settled = false;
      function done() { if (settled) return; settled = true; resolve(); }
      el.addEventListener('load', done);
      el.addEventListener('error', done);
      // Cap the wait hard: a sheet that is slow or blocked (dead CDN path, no response)
      // must not hold up interaction for seconds. The swap proceeds and the sheet lands
      // whenever it does - the same behaviour as a late stylesheet on a real page load.
      setTimeout(done, 1200);
    });
  }

  /* Every page styles its own content through its own sheets and its own <body> class, so
     a content-only swap would leave the new content wearing the previous page's rules -
     the "design went wrong" symptom. The sheets are ADDED and awaited BEFORE the body
     class changes and before the content moves: applying the class first would paint the
     new page against the old page's cascade for as long as the request takes. */
  function syncHead(doc) {
    var pending = [];
    var want = { css: {}, style: {} };
    each(doc.querySelectorAll('link[rel="stylesheet"]'), function (l) {
      var raw = l.getAttribute('href') || '';
      var key = assetKey(raw);
      if (!raw || !key) return;
      want.css[key] = 1;
      if (CSS_SEEN[key]) return;
      CSS_SEEN[key] = 1;
      var el = DOC.createElement('link');
      el.rel = 'stylesheet';
      el.href = raw;
      el.setAttribute('data-bo-spa-sheet', key);
      DOC.head.appendChild(el);
      SHEETS.push({ el: el, key: key });
      pending.push(waitForLink(el));
    });
    each(doc.querySelectorAll('head style'), function (s) {
      var text = s.textContent || '';
      if (!text.trim()) return;
      var key = fp(text);
      want.style[key] = 1;
      if (STYLE_SEEN[key]) return;
      STYLE_SEEN[key] = 1;
      var el = DOC.createElement('style');
      el.setAttribute('data-bo-spa-style', key);
      el.textContent = text;
      DOC.head.appendChild(el);
    });
    // The fetched document never ran its own inline theme bootstrap, so it carries no
    // data-bo-theme. This document's value is the user's, and must be left alone.
    return { wait: Promise.all(pending), want: want };
  }

  /* Bring the sheet set down to the target page's, in the same task as the content swap: the
     browser has no chance to paint in between, so the intermediate state is never seen. */
  function convergeSheets(want) {
    for (var i = SHEETS.length - 1; i >= 0; i--) {
      var rec = SHEETS[i];
      if (!DOC.contains(rec.el)) { SHEETS.splice(i, 1); continue; }
      if (want.css[rec.key]) continue;
      rec.el.parentNode.removeChild(rec.el);
      SHEETS.splice(i, 1);
      CSS_SEEN[rec.key] = 0;
    }
    each(DOC.querySelectorAll('head style[data-bo-spa-style]'), function (s) {
      var key = s.getAttribute('data-bo-spa-style');
      if (want.style[key]) return;
      s.parentNode.removeChild(s);
      STYLE_SEEN[key] = 0;
    });
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
  /* Start a fetch for a script we are about to run, without executing it. A <link rel=preload
     as=script> shares the same HTTP cache entry the tag below will use, so the requests go out
     in parallel while the strict order of execution is untouched. */
  function preloadScript(src) {
    if (!src) return;
    try {
      var l = DOC.createElement('link');
      l.rel = 'preload';
      l.as = 'script';
      l.href = src;
      DOC.head.appendChild(l);
      setTimeout(function () { if (l.parentNode) l.parentNode.removeChild(l); }, 4000);
    } catch (e) {}
  }

  var scriptTimes = [];

  function runScripts(list, done) {
    scriptTimes = [];
    window.__boScriptTimes = scriptTimes;
    /* Fetch everything at once, then execute in document order. Inserting the tags one at a
       time and waiting for each load serialised the network: measured 800ms for one page's own
       scripts on a first visit, nearly all of it waiting rather than executing, and that wait
       is what the user sees as a slow click. */
    each(list, function (item) { preloadScript(item.src); });
    var i = 0;
    (function next() {
      if (i >= list.length) { done(); return; }
      var item = list[i++];
      var el = DOC.createElement('script');
      el.setAttribute('data-bo-spa-script', '1');
      /* Once it has run the tag is inert, so it is dropped again - otherwise every navigation
         left another handful of <script> elements in the body for the rest of the session
         (measured: 22 body children on the landing page, 36 after eight swaps, one page's
         worth of tags per hop). */
      function drop() { if (el.parentNode) el.parentNode.removeChild(el); }
      if (!item.src) {
        el.textContent = item.text;
        DOC.body.appendChild(el);
        drop();
        next();
        return;
      }
      var settled = false;
      var t0 = Date.now();
      function finish() {
        if (settled) return;
        settled = true;
        scriptTimes.push({ src: String(item.src || 'inline').split('/').pop(), ms: Date.now() - t0 });
        drop();
        next();
      }
      el.src = item.src;
      el.async = false;
      el.onload = finish;
      el.onerror = finish;
      DOC.body.appendChild(el);
      // Cap the wait hard (see waitForLink): a script that 404s or stalls must not hold the
      // swap, and with it every subsequent click, for seconds.
      setTimeout(finish, 3000);
    })();
  }

  /* Which shared scripts see their DOMContentLoaded listener re-run on EVERY navigation.
     These are the content-wiring helpers: they are element-guarded and idempotent (the
     same audit that guarded the accumulators tested them), and each new page's wiring
     depends on them - bo-date-range builds the date pickers, pagination-standardizer
     standardizes the pagination chrome, report-table-split/sort lift the fixed head.
     Everything else either runs once per document (observers) or is a page's own script,
     which is handled by the ownership rules below. */
  var SHARED_REPLAY = {
    'bo-date-range.js': 1,
    'pagination-standardizer.js': 1,
    'report-table-split.js': 1,
    'report-table-sort.js': 1
  };

  /* Basenames of every script the target page carries; a page's own listener must still
     fire when we RE-ENTER that page, even though its script is not executed again. */
  function pageOwnScripts(doc) {
    var set = {};
    each(doc.querySelectorAll('script'), function (s) {
      var src = s.getAttribute('src');
      if (src) set[assetKey(src)] = 1;
    });
    return set;
  }

  /* Boot the target page without waking everyone else. Dispatching a blanket
     DOMContentLoaded here fires EVERY listener ever registered - including the page we
     left, whose elements no longer exist, so it throws (win-lose-report.js:59: wlFrom is
     not defined on the casino page) and, where its guard lets it get further, runs its
     load() against the wrong page (an API request storm in production).

     Every rolled-out page installs a tiny registry in its head inline (see
     scripts/adopt-bo-spa.js, THEME_BOOT) that records, at registration time, which script
     the listener belongs to and in which navigation epoch it was registered. This fires a
     listener only when:
       - it was registered during THIS navigation (the target page's freshly executed
         scripts), or
       - it belongs to one of the target page's own scripts (re-entering a visited page), or
       - it is one of the shared content helpers above.
     Listeners from other pages stay silent - their elements are gone, nothing to do. */
  function replayLifecycle(doc) {
    var reg = window.__boDCL;
    if (!reg || !reg.length) {
      /* Page without the wrapper (not rolled out, or an agent/legacy page): fall back to
         the blanket event, which is at least no worse than no boot at all. */
      var ev;
      try { ev = new Event('DOMContentLoaded', { bubbles: false, cancelable: false }); }
      catch (e) { ev = DOC.createEvent('Event'); ev.initEvent('DOMContentLoaded', false, false); }
      try { DOC.dispatchEvent(ev); } catch (e) {}
      return;
    }
    var own = pageOwnScripts(doc);
    var epoch = window.__boDclEpoch || 0;
    for (var i = 0; i < reg.length; i++) {
      var rec = reg[i];
      var fire = rec.e === epoch || SHARED_REPLAY[rec.s] || (rec.s && own[rec.s]);
      if (!fire) continue;
      try { rec.f.call(rec.t); }
      catch (err) {
        if (window.console && console.error) console.error('[bo-spa] replay listener failed:', err && err.message);
      }
    }
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

  /* One tab is active, and it is the one whose href names THIS url. Comparing pathname
     alone is wrong the moment a page distinguishes its sections by query string:
     bulk-adjustment.html?tab=winlose and ?tab=bonus share a pathname, so every tab on the
     row came back is-active and the previous section stayed lit next to the new one.
     Exact pathname+search wins; when no tab carries a query at all (a drill-down opened
     with ?new=1, say) the plain pathname match is still the answer. */
  function activateTab(u) {
    var tabs = [];
    each(DOC.querySelectorAll('.bo-module-tab'), function (t) { tabs.push(t); });
    var target = null, loose = null;
    for (var i = 0; i < tabs.length; i++) {
      var tu = href_of(tabs[i]);
      if (!tu || tu.pathname !== u.pathname) continue;
      if (tu.search === u.search) { if (!target) target = tabs[i]; }
      else if (!tu.search || !u.search) { if (!loose) loose = tabs[i]; }
    }
    if (!target) target = loose;
    each(tabs, function (t) {
      var on = t === target;
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

  /* The BO shell does not scroll the window. .report-main is overflow:hidden and it is the
     content frame that scrolls (overflow-y:auto), so reading window.pageYOffset alone always
     returned 0 and restoring it always went to the top: coming back to a long list you had
     scrolled dropped you at its start, which is the one thing a browser's back button does
     get right. Both are written here, and the frame wins when it is the one that moved. */
  function scrollPos() {
    var c = frameOf(DOC);
    var y = window.pageYOffset || DOC.documentElement.scrollTop || 0;
    if (c && c.scrollTop > y) y = c.scrollTop;
    return y;
  }

  function scrollTo(y) {
    var c = frameOf(DOC);
    try { window.scrollTo(0, y); } catch (e) {}
    if (c) { try { c.scrollTop = y; } catch (e) {} }
  }

  /* Deep-cloned copy of a node list. The fetched documents are cached and REUSED, so the
     swap must not MOVE their nodes into the live DOM: moving strips the cached copy (the
     next visit to the same URL would find an empty content frame - measured on
     win-lose-report.html re-entry via the rail: URL changed, epoch advanced, and the frame
     had no wlFrom). Cloning leaves the cache pristine. Cloned `<script>` nodes keep
     their text but do not execute, which is what a content frame wants anyway. */
  function clone(frag) {
    var out = [];
    for (var i = 0; i < frag.length; i++) out.push(frag[i].cloneNode(true));
    return out;
  }

  /* Page-owned <body> classes, applied as a DELTA. Assigning className wholesale replaced
     the whole token list with the fetched document's, which threw away everything the live
     shell had put on the body at runtime: the rail's collapsed state (`sidebar-mini`), the
     mobile drawer flag, a modal's scroll lock. Result: a collapsed rail re-expanded on its
     own on the next click. pageBodyClass is captured at parse time - before any runtime
     state exists - so only page-owned tokens are ever removed. */
  var pageBodyClass = String(DOC.body ? DOC.body.className : '');

  function syncBodyClass(doc) {
    var want = doc.body ? String(doc.body.className || '') : '';
    if (!want || want === pageBodyClass) return;
    var i, drop = pageBodyClass.split(/\s+/), add = want.split(/\s+/);
    for (i = 0; i < drop.length; i++) if (drop[i]) DOC.body.classList.remove(drop[i]);
    for (i = 0; i < add.length; i++) if (add[i]) DOC.body.classList.add(add[i]);
    pageBodyClass = want;
  }

  function apply(doc, u, push) {
    var from = frameOf(DOC);
    var to = frameOf(doc);
    if (!from || !to) return Promise.resolve(false);
    /* A frame with no ELEMENT children cannot be swapped in usefully - it would leave the
       user looking at an empty page. Some pages build their content from script, and a
       fetched document is not guaranteed to carry any. Report it as a failure so the
       caller re-enters a real navigation, which renders it the ordinary way. */
    if (!to.children.length) return Promise.resolve(false);
    var prevRail = captureRail();

    var head = syncHead(doc);
    return head.wait.then(function () {
      var timings = window.__boLastTimings || {};
      timings.css = Date.now() - navStart;
      /* The section tab row lives inside the content frame (auth.js renderModuleTabs
         inserts it at .report-content:first-child), so replacing the children deletes
         it. Rebuilding it afterwards is both the fix for that and the reason the row is
         correct when the target page belongs to a different module: it is derived from
         location.pathname, which pushState has just updated. */
      /* When both pages agree on what the frame is (the usual case - both are .report-content
         sections), only the children move: that keeps the element the live page's scripts may
         already hold a reference to. When they disagree - a legacy page keeps its content in
         its own section (currency-management's .cur-page, main-dashboard's #mainExec) - the
         children alone are not enough: pouring the legacy markup into the standard frame keeps
         the standard frame's class-driven padding, so the page ends up looking different from
         a direct load (measured: 18px against 24px). The element itself is replaced then, and
         the two paths become identical. */
      if (from.tagName === to.tagName && from.className === to.className) {
        from.replaceChildren.apply(from, clone(to.childNodes));
      } else {
        var fresh = to.cloneNode(true);
        from.parentNode.replaceChild(fresh, from);
        from = fresh;
      }
      syncBodyClass(doc);
      /* Same task as the swap, so the removal is never painted: the document's stylesheets
         become the target's, and a page therefore looks the same whether it was swapped into
         or opened directly. */
      convergeSheets(head.want);
      convergeExtras(doc);
      note('content');

      // URL first: page scripts re-read location.search/pathname, and a drill-down page
      // that never sees its own query string renders as if it had none.
      if (push) history.pushState({ boSpa: 1 }, '', u.href);
      current = u.pathname + u.search;

      if (window.BO_AUTH && BO_AUTH.renderModuleTabs) {
        try { BO_AUTH.renderModuleTabs(BO_AUTH.user()); } catch (e) {}
      }

      /* The page-level permission check lives inside auth.js's own boot, which a swap never
         re-runs - auth.js is already in the executed map. Without this, a swappable link was
         a way to open a page the account's menu permissions do not include: the shell
         rendered, the page's API calls failed, but the user was on it. Found while measuring
         the swapped-into state of a page that is not in the test account's menus. Calling it
         here keeps the rule in force for every navigation, exactly as a full load would. */
      if (window.BO_AUTH && BO_AUTH.enforcePageAccess) {
        try { BO_AUTH.enforcePageAccess(BO_AUTH.user()); } catch (e) {}
      }

      /* Everything that is visible right now - the shell title and icon, which tab is lit,
         which rail row is active, where the page is scrolled - is settled BEFORE the target
         page's scripts are run. Those scripts take 2-300ms and used to delay the highlight
         moving with them, so a click felt unacknowledged for as long as they took. The same
         calls are repeated after the replay below, because a script is allowed to rebuild the
         tab row. */
      paintShell(doc, u, prevRail);

      // A fresh epoch: listeners registered by the scripts about to run belong to THIS
      // navigation, so the replay below can tell them apart from everything earlier.
      window.__boDclEpoch = (window.__boDclEpoch || 0) + 1;

      return new Promise(function (resolve) {
        runScripts(collectScripts(doc), function () {
          var t = window.__boLastTimings || {};
          t.scripts = Date.now() - navStart;
          note('scripts', { timings: { scripts: t.scripts } });
          replayLifecycle(doc);
          resolve(true);
        });
      });
    }).then(function (ok) {
      var t = window.__boLastTimings || {};
      t.total = Date.now() - navStart;
      note('ok', { timings: { total: t.total, fetch: t.fetch, css: t.css, scripts: t.scripts } });
      /* Re-asserted: a target page's script may have rebuilt the tab row or moved the active
         state while the boot replay ran. */
      paintShell(doc, u, prevRail);
      DOC.dispatchEvent(new CustomEvent('bo:spa:content', { detail: { url: u.href } }));
      return ok;
    });
  }

  /* The visible consequences of a navigation, in one place so apply() can run them both
     immediately and once more after the boot replay. */
  function paintShell(doc, u, prevRail) {
    syncShell(doc);
    activateTab(u);
    activateRail(u, prevRail);
    scrollTo(0);
  }

  function fallback(href, reason) {
    note('fallback', { reason: String(reason || '') });
    try {
      DOC.dispatchEvent(new CustomEvent('bo:spa:fail', { detail: { url: href, reason: String(reason || '') } }));
    } catch (e) {}
    if (window.console && console.warn) console.warn('[bo-spa] falling back to a full load:', href, '-', reason);
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

  var pendingNav = null;
  var navStart = 0;
  var navWatchdog = 0;

  /* One place that ends a navigation: releases the lock, cancels the watchdog and starts
     anything the user clicked while it was in flight. */
  function settle() {
    clearTimeout(navWatchdog);
    busy = false;
    drainNav();
  }

  /* Take the lock, start the clock and arm the watchdog. Whatever goes wrong mid-swap - a
     stylesheet that never settles, a script whose load event never arrives, an exception
     outside the guarded paths - the user must not be left with an empty frame and a router
     that ignores every click. If the navigation has not settled in 8s, give up on it and do
     the ordinary full load, which renders the page the way it always did. */
  function beginNav(href) {
    busy = true;
    navStart = Date.now();
    clearTimeout(navWatchdog);
    navWatchdog = setTimeout(function () {
      if (!busy) return;
      var stuckAt = currentRec ? currentRec.phase : 'n/a';
      note('timeout', { stuckAt: stuckAt });
      pendingNav = null;
      settle();
      fallback(href, 'swap did not settle within 8s (stuck at ' + stuckAt + ')');
    }, 8000);
  }

  /* Queue, don't drop. A click that lands while a swap is in flight used to be discarded,
     and with a handful of slow first-time stylesheets that wait could last seconds - every
     click in between did nothing, which reads exactly like "the sidebar stopped working".
     The pending navigation starts the moment the current one settles. Two applies can no
     longer interleave (the interleaving is what the hold-busy rule prevents), and the queue
     means the click is honoured, just delayed by however long the current swap takes. */
  function drainNav() {
    if (!pendingNav) return;
    var n = pendingNav;
    pendingNav = null;
    go(n.href, n.u, n.push);
  }

  function go(href, u, push) {
    if (busy) {
      // Same URL already on its way (the rail and the module-tab row can both point at it)
      // is the only thing dropped; everything else is queued, newest wins.
      if (pendingNav && pendingNav.u.href === href) return;
      pendingNav = { href: href, u: u, push: push };
      log('queued ' + href + ' (busy with ' + (currentRec ? currentRec.to : '?') + ')');
      return;
    }
    nav(href, 'link');
    var timings = {};
    window.__boLastTimings = timings;
    scrollMemo[here()] = scrollPos();
    beginNav(href);
    getDoc(href).then(function (doc) {
      timings.fetch = Date.now() - navStart;
      note('fetched', { timings: { fetch: timings.fetch } });
      var why = swapBlocker(doc);
      if (why) {
        settle();
        fallback(href, why);
        return;
      }
      // busy stays set until the swap has fully landed, INCLUDING the async script
      // execution and the boot replay. Interleaved applies are what broke the original
      // harness (two replaceChildren calls, one boot replay against the other swap's
      // in-flight content); clicks that arrive meanwhile are queued by drainNav.
      commitOf(doc, u, push, href).then(function () {
        settle();
      }, function () { settle(); });
    })['catch'](function (e) {
      settle();
      fallback(href, e && e.message);
    });
  }

  /* Warm the destination while the pointer is merely ON the link. Fetching the target
     document is the one part of a swap that cannot be made faster once the click has landed,
     and the intent is visible a few hundred milliseconds early. focusin covers keyboard
     tabbing, touchstart the case where there is no hover at all.

     Only pages the router may swap into are fetched, only into a free cache slot (so a
     pointer swept down the rail can never evict a page the user actually visited), and only
     once per href. On localhost this buys nothing; on a real connection it is the difference
     between a swap that waits for a request and one that does not. */
  function prefetchFrom(e) {
    var a = e.target && e.target.closest ? e.target.closest(LINKS) : null;
    if (!eligible(a)) return;
    var u = href_of(a);
    if (!u || CACHE[u.href]) return;
    if (Object.keys(CACHE).length >= CACHE_MAX) return;
    getDoc(u.href).then(function (doc) {
      /* The document is one round trip; its own scripts are the next, and the swap cannot
         start them until it has the document. Warming them here is what makes the click itself
         cheap - by the time it happens the page's scripts are already in the HTTP cache. */
      each(doc.querySelectorAll('script[src]'), function (s) {
        var key = assetKey(s.getAttribute('src'));
        if (key && !EXECUTED[key]) preloadScript(s.getAttribute('src'));
      });
    })['catch'](function () {});
  }
  DOC.addEventListener('pointerenter', prefetchFrom, true);
  DOC.addEventListener('focusin', prefetchFrom, true);
  DOC.addEventListener('touchstart', prefetchFrom, true);

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
    nav(u.href, 'popstate');
    window.__boLastTimings = {};
    beginNav(u.href);
    getDoc(u.href).then(function (doc) {
      var why = swapBlocker(doc);
      if (why) { settle(); fallback(u.href, why); return; }
      var target = u.pathname + u.search;
      var restore = scrollMemo[target];
      // Same hold-busy rule as go(): the swap, the script run and the boot replay must all
      // finish before the router accepts the next navigation.
      commitOf(doc, u, false, u.href).then(function (ok) {
        if (ok && typeof restore === 'number') scrollTo(restore);
        settle();
      }, function () { settle(); location.reload(); });
    })['catch'](function () { settle(); location.reload(); });
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

  window.addEventListener('error', function (e) {
    ERRORS.push({ at: new Date().toISOString().substr(11, 12), msg: String(e.message || e.type), src: String(e.filename || '').replace(location.origin, '') + ':' + (e.lineno || 0) });
    if (ERRORS.length > 20) ERRORS.shift();
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    ERRORS.push({ at: new Date().toISOString().substr(11, 12), msg: 'unhandled rejection: ' + String((r && (r.message || r.stack)) || r) });
    if (ERRORS.length > 20) ERRORS.shift();
  });

  window.BO_SPA = {
    on: true,
    go: function (href) { var u = new URL(href, location.href); go(u.href, u, true); },
    current: function () { return current; },
    /* Which pages this session will swap into. Copied from the generated manifest so the
       console can answer "why did that link just reload?" without a debugger. */
    pages: function () { return window.__BO_SPA_PAGES ? Object.keys(window.__BO_SPA_PAGES).length : 0; },
    /* Paste the string this returns: it carries every navigation with the offset at which
       each phase finished (a stalled one says where it stalled) plus the runtime errors. */
    report: function () {
      var out = {
        url: here(),
        busy: busy,
        epoch: window.__boDclEpoch || 0,
        nav: NAVLOG.slice(-12),
        errors: ERRORS.slice(-10)
      };
      try { if (window.console && console.table) console.table(NAVLOG.slice(-12)); } catch (e) {}
      return JSON.stringify(out);
    },
    /* Read-only diagnostics for the console and for integration tests. */
    debug: {
      isBusy: function () { return busy; },
      /* Where the page is actually scrolled. The window is not the scroller on this shell. */
      scroll: function () {
        var c = frameOf(DOC);
        return { pos: scrollPos(), frame: c ? Math.round(c.scrollTop) : null, win: Math.round(window.pageYOffset || 0) };
      },
      /* "Why did that link reload instead of swapping?" - answers without navigating and
         without fetching, because it is the same decision the click handler makes. */
      canSwap: function (href) {
        var a = DOC.createElement('a');
        a.setAttribute('href', String(href));
        return eligible(a);
      },
      epoch: function () { return window.__boDclEpoch || 0; },
      navlog: function () { return NAVLOG; },
      scriptTimes: function () { return scriptTimes; },
      errors: function () { return ERRORS; }
    }
  };
})();
