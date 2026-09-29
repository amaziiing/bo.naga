/* BO client-side navigation ("B"), opt-in per page via <html data-bo-spa="1">.
 *
 * The BO is an MPA, so following a link threw the document away and re-mounted the whole
 * shell. This keeps the shell mounted and swaps only the content frame, which is what a
 * client-side router does: the rail, topbar and tab row are never rebuilt and the content
 * area is never empty, so the white first-paint moment cannot happen either.
 *
 * Deliberately narrow, because it now runs site-wide:
 *   - it only takes over clicks on the module tab row (.bo-module-tabs) and the rail
 *     (.report-nav); every other link on the page behaves exactly as before;
 *   - the fetched page must build the same shell family as this one, otherwise it falls back;
 *   - only the target page's own script is re-run (shared infrastructure is already live),
 *     and it runs against the pristine template from the fetched document, not against
 *     anything already rendered;
 *   - any error, missing frame, cross-origin target, modified click or slow/failed fetch
 *     falls back to a real navigation, i.e. today's behaviour.
 *
 * Kill switch: put bo_spa=0 in localStorage, or set window.BO_SPA_OFF = true, to make this
 * file inert everywhere without touching a single page.
 */
(function () {
  var root = document.documentElement;
  // PARKED. It shipped site-wide once and broke the target page's own render (the module
  // tab row and filter card never came back until a manual reload), so it now needs BOTH
  // the html attribute and an explicit localStorage opt-in on the page you are testing.
  if (root.getAttribute('data-bo-spa') !== '1') return;
  try { if (localStorage.getItem('bo_spa') !== 'on') return; } catch (e) { return; }
  if (!window.fetch || !window.history || !window.DOMParser || !window.Promise) return;
  try { if (localStorage.getItem('bo_spa') === '0') return; } catch (e) {}
  if (window.BO_SPA_OFF) return;

  var CONTENT = '.report-content';
  var LINKS = '.bo-module-tabs a[href], .report-nav a[href], [data-bo-spa-link]';
  var CACHE = {}, done = {}, busy = false, currentDoc = null;

  Array.prototype.forEach.call(document.querySelectorAll('script[src]'), function (s) {
    done[s.getAttribute('src').split('?')[0]] = 1;
  });

  function url(a) { try { return new URL(a.href, location.href); } catch (e) { return null; } }

  function eligible(a) {
    if (!a || !a.getAttribute) return false;
    if (a.target && a.target !== '' && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return false;
    var u = url(a);
    if (!u || u.origin !== location.origin) return false;
    if (u.pathname === location.pathname && u.search === location.search) return false;
    return /\.html$/.test(u.pathname);
  }

  function getDoc(href) {
    if (!CACHE[href]) {
      CACHE[href] = fetch(href, { credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.text();
      }).then(function (html) { return new DOMParser().parseFromString(html, 'text/html'); });
    }
    return CACHE[href];
  }

  function sameShell(doc) {
    var here = document.body ? document.body.className : '';
    var there = doc.body ? doc.body.className : '';
    function family(c) {
      if (/\bmain-/.test(c) || /menu-permission/.test(c) || c.indexOf('main_') >= 0) return 'main';
      if (c.indexOf('bo-charcoal') >= 0 || c.indexOf('report-body') >= 0) return 'bo';
      return 'other';
    }
    if (family(here) !== family(there)) return false;
    return !!document.querySelector(CONTENT) === !!doc.querySelector(CONTENT);
  }

  function pageScript(doc, href) {
    var base = href.split('/').pop().split('?')[0].replace(/\.html$/, '');
    var out = [];
    Array.prototype.forEach.call(doc.querySelectorAll('script[src]'), function (s) {
      var raw = s.getAttribute('src'), key = raw.split('?')[0], file = key.split('/').pop().replace(/\.js$/, '');
      if (done[key]) return;
      if (file !== base) return;                       // shared infrastructure is already live
      done[key] = 1;
      out.push(raw);
    });
    return out;
  }

  function syncShell(doc) {
    var from = doc.querySelector('[data-bo-topbar]'), to = document.querySelector('[data-bo-topbar]');
    if (to) {
      var b = to.querySelector('h1');
      var text = '';
      if (from) {
        var a = from.querySelector('h1');
        if (a) text = (a.textContent || '').trim();
        var ai = from.querySelector('i'), bi = to.querySelector('i');
        if (ai && bi) bi.className = ai.className;
      }
      // The topbar title is painted from menu data at runtime, so the fetched document has an
      // empty header. Fall back to the target page's own <title> rather than leaving the
      // previous page's title sitting there.
      if (!text) text = (doc.title || '').split(/[-|·]/)[0].trim();
      if (!text) {
        var h = doc.querySelector('.report-content h1, .report-content h2, .manage-form-card h1');
        if (h) text = (h.textContent || '').trim();
      }
      if (b && text) b.textContent = text;
    }
    if (doc.title) document.title = doc.title;
  }

  function activateTab(u) {
    Array.prototype.forEach.call(document.querySelectorAll('.bo-module-tab'), function (t) {
      var on = false, tu = url(t);
      if (tu) on = tu.pathname === u.pathname;
      t.classList.toggle('is-active', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
  }

  /* Every page styles its own content through its <body> class and its own sheets, so a
     content-only swap would leave the new content wearing the previous page's rules - the
     "design went wrong" symptom. Mirror both before swapping. */
  function syncHead(doc) {
    var have = {};
    Array.prototype.forEach.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) {
      var h = l.getAttribute('href') || '';
      have[h.split('/').pop().split('?')[0]] = 1;
    });
    Array.prototype.forEach.call(doc.querySelectorAll('link[rel="stylesheet"]'), function (l) {
      var raw = l.getAttribute('href') || '', key = raw.split('/').pop().split('?')[0];
      if (!raw || have[key]) return;
      have[key] = 1;
      var el = document.createElement('link');
      el.rel = 'stylesheet';
      el.href = raw;
      document.head.appendChild(el);
    });
    if (doc.body && doc.body.className && doc.body.className !== document.body.className) {
      document.body.className = doc.body.className;
    }
  }

  function apply(doc, u) {
    var from = document.querySelector(CONTENT), to = doc.querySelector(CONTENT);
    if (!from || !to) return false;
    syncHead(doc);
    var scripts = pageScript(doc, u.href);
    from.replaceChildren.apply(from, Array.prototype.slice.call(to.childNodes));
    syncShell(doc);
    activateTab(u);
    scripts.forEach(function (src) {
      var el = document.createElement('script');
      el.src = src; el.async = false;
      document.body.appendChild(el);
    });
    document.dispatchEvent(new CustomEvent('bo:spa:content', { detail: { url: u.href } }));
    return true;
  }

  function go(href, u, push) {
    if (busy) return;
    busy = true;
    getDoc(href).then(function (doc) {
      if (!sameShell(doc)) { location.href = href; return; }
      currentDoc = doc;
      var commit = function () {
        var ok = false;
        try { ok = apply(doc, u); } catch (e) { ok = false; }
        if (!ok) { location.href = href; return; }
        if (push) history.pushState({ boSpa: 1 }, '', href);
      };
      busy = false;
      if (document.startViewTransition) document.startViewTransition(commit);
      else commit();
    })['catch'](function () { busy = false; location.href = href; });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest(LINKS) : null;
    if (!eligible(a)) return;
    e.preventDefault();
    go(a.href, url(a), true);
  });

  window.addEventListener('popstate', function () {
    if (busy) return;
    var u = new URL(location.href);
    if (!/\.html$/.test(u.pathname)) { location.reload(); return; }
    busy = true;
    getDoc(u.href).then(function (doc) {
      busy = false;
      if (!sameShell(doc)) { location.href = u.href; return; }
      if (document.startViewTransition) document.startViewTransition(function () { apply(doc, u); });
      else apply(doc, u);
    })['catch'](function () { busy = false; location.reload(); });
  });

  window.addEventListener('load', function () {
    setTimeout(function () {
      var n = 0;
      Array.prototype.forEach.call(document.querySelectorAll('.bo-module-tab[href]'), function (a) {
        if (n >= 10 || !eligible(a)) return;
        n++;
        getDoc(a.href)['catch'](function () {});
      });
    }, 1000);
  });
})();
