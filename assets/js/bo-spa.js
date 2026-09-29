/* BO client-side navigation ("B"), opt-in per page.
 *
 * Why: the BO is an MPA, so every tab click throws the document away, paints the next one
 * from scratch and re-mounts the whole shell. This layer keeps the shell mounted and swaps
 * only the content frame, which is what a client-side router does - the tab row, the rail
 * and the topbar are never rebuilt, and the content area is never empty (so the white
 * first-paint moment disappears as a side effect).
 *
 * Safety first: this file does nothing unless the page opts in with data-bo-spa="1" on
 * <html>. Any unexpected shape (no content frame on either side, a cross-origin target, a
 * failed fetch, a form/page that is not a normal module page) falls back to a real
 * navigation, i.e. exactly today's behaviour. Nothing here replaces the existing pages.
 */
(function () {
  var root = document.documentElement;
  if (root.getAttribute('data-bo-spa') !== '1') return;
  if (!window.fetch || !window.history || !window.DOMParser || !window.Promise) return;

  var CONTENT = '.report-content';
  var CACHE = {};
  var done = {};                       // script src (no query) already executed here
  var busy = false;

  Array.prototype.forEach.call(document.querySelectorAll('script[src]'), function (s) {
    done[s.getAttribute('src').split('?')[0]] = 1;
  });

  function isLocalLink(a) {
    if (!a || !a.getAttribute) return false;
    if (a.target && a.target !== '' && a.target !== '_self') return false;
    if (a.hasAttribute('download') || a.hasAttribute('data-bo-spa-skip')) return false;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return false;
    var url;
    try { url = new URL(a.href, location.href); } catch (e) { return false; }
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.search === location.search) return false;
    return /\.html$/.test(url.pathname);
  }

  function getDoc(url) {
    if (!CACHE[url]) {
      CACHE[url] = fetch(url, { credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.text();
      }).then(function (html) {
        return new DOMParser().parseFromString(html, 'text/html');
      });
    }
    return CACHE[url];
  }

  /* Titles/aria that the shell shows but the content frame does not carry. */
  function syncShell(doc) {
    var from = doc.querySelector('[data-bo-topbar]');
    var to = document.querySelector('[data-bo-topbar]');
    if (from && to) {
      var a = from.querySelector('h1'), b = to.querySelector('h1');
      if (a && b) b.textContent = a.textContent;
      var ai = from.querySelector('i'), bi = to.querySelector('i');
      if (ai && bi) bi.className = ai.className;
    }
    if (doc.title) document.title = doc.title;
  }

  function activateTab(url) {
    var tabs = document.querySelectorAll('.bo-module-tab');
    Array.prototype.forEach.call(tabs, function (t) {
      var on = false;
      try { on = new URL(t.href, location.href).pathname === url.pathname; } catch (e) {}
      t.classList.toggle('is-active', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
  }

  /* Scripts the target page needs that this document has not run yet. */
  function scriptQueue(doc) {
    var out = [];
    Array.prototype.forEach.call(doc.querySelectorAll('script[src]'), function (s) {
      var raw = s.getAttribute('src'), key = raw.split('?')[0];
      if (done[key]) return;
      if (/auth\.js|bo-theme\.js|bo-topbar\.js|bo-spa\.js/.test(key)) return;   // already live here
      done[key] = 1;
      out.push(raw);
    });
    return out;
  }

  function runScripts(list) {
    list.forEach(function (src) {
      var el = document.createElement('script');
      el.src = src;
      el.async = false;
      document.body.appendChild(el);
    });
  }

  function swapInto(doc, url) {
    var from = document.querySelector(CONTENT), to = doc.querySelector(CONTENT);
    if (!from || !to) return false;
    var queue = scriptQueue(doc);
    from.replaceChildren.apply(from, Array.prototype.slice.call(to.childNodes));
    from.setAttribute('data-bo-spa-view', url.pathname.split('/').pop());
    syncShell(doc);
    activateTab(url);
    runScripts(queue);
    return true;
  }

  function go(url, push) {
    if (busy) return;
    busy = true;
    var apply = function () {
      try {
        if (!swapInto(CACHE.__doc || null, url)) { location.href = url.href; return; }
        if (push) history.pushState({ boSpa: 1 }, '', url.href);
      } catch (e) {
        location.href = url.href;
      } finally {
        busy = false;
      }
    };
    getDoc(url.href).then(function (doc) {
      CACHE.__doc = doc;
      if (document.startViewTransition) {
        document.startViewTransition(apply);
      } else {
        apply();
      }
    }).catch(function () { busy = false; location.href = url.href; });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!isLocalLink(a)) return;
    e.preventDefault();
    go(new URL(a.href, location.href), true);
  });

  window.addEventListener('popstate', function () {
    if (busy) return;
    var url = new URL(location.href);
    busy = true;
    getDoc(url.href).then(function (doc) {
      CACHE.__doc = doc;
      busy = false;
      if (document.startViewTransition) document.startViewTransition(function () { swapInto(doc, url); });
      else swapInto(doc, url);
    }).catch(function () { busy = false; location.reload(); });
  });

  /* Warm the module tabs and the rail once the shell is up, so the first click is instant. */
  window.addEventListener('load', function () {
    setTimeout(function () {
      var links = document.querySelectorAll('.bo-module-tab[href], .report-nav a[href]');
      var n = 0;
      Array.prototype.forEach.call(links, function (a) {
        if (n >= 8 || !isLocalLink(a)) return;
        n++;
        getDoc(new URL(a.href, location.href).href)['catch'](function () {});
      });
    }, 1200);
  });
})();
