/* ============================================================================
   Access Control family — footer pagination for the two listings that ship none.

   WHY THIS EXISTS
   Two of the family's five listings had no footer at all: Staff Permission
   (`role.html`, 17 rows and growing) and IP Whitelist Security
   (`ip-whitelist-security.html`, 14 rules). Their three siblings — Admin
   Management, Admin Login Log, Admin Operation Log — each end in the same bar:
   a `Show N entries` control on the left, `Showing a to b of c entries` in the
   middle, and the app-wide `.smart-page` pager on the right. A listing with no
   footer reads as an unfinished page next to those.

   HOW
   Opt in with `data-ac-listing` on the listing's card. The script owns the
   footer markup and the pager; the page's own script keeps owning the rows.
   Rows are hidden rather than removed, so nothing that reads the tbody is
   disturbed, and a MutationObserver re-applies paging whenever the page
   re-renders its rows (both pages redraw after a save, a toggle or a delete).
   The current page survives that redraw, clamped to the row count.

   This is deliberately separate from `pagination-standardizer.js`, which
   standardises footers that already exist and infers totals from the page's own
   DOM. Here the page has no total to infer from, so this module counts rows.

   The pager markup is the same `pageButtons()` shape `admin-user.js` and
   `admin-operation-log.js` emit, so the family ends with one pager.
   ========================================================================== */
(function () {
  'use strict';

  var SIZES = ['-', '10', '20', '50', '100', 'All'];

  function pageButtons(current, total) {
  total = Math.max(1, Number(total) || 1);
  current = Math.max(1, Math.min(Number(current) || 1, total));
  var pages = [];
  var add = function (n) { if (n >= 1 && n <= total && pages.indexOf(n) === -1) pages.push(n); };
  add(1);
  for (var n = current - 2; n <= current + 2; n++) add(n);
  add(total);
  pages.sort(function (a, b) { return a - b; });

  /* The LISTING ladder, from the page the owner points at: Member -> User
     Management (`member-management.js:175-177`) — First . numbered rungs +
     ellipses . Last. The `nav-text` chevron rungs found on the report pages
     (casino-report.js) are that family's variation, not the house one. */
  var html = '';
  html += '<button type="button" class="smart-page first" data-ac-page="1" ' +
    (current <= 1 ? 'disabled' : '') + ' title="First page" aria-label="First page"><i class="bi bi-chevron-bar-left" aria-hidden="true"></i></button>';
  var prev = 0;
  pages.forEach(function (pg) {
    if (prev && pg - prev > 1) html += '<span class="smart-page-ellipsis">…</span>';
    html += '<button type="button" class="smart-page ' + (pg === current ? 'active' : '') + '" data-ac-page="' + pg + '" ' +
      (pg === current ? 'aria-current="page"' : '') + '>' + pg + '</button>';
    prev = pg;
  });
  html += '<button type="button" class="smart-page last" data-ac-page="' + total + '" ' +
    (current >= total ? 'disabled' : '') + ' title="Last page" aria-label="Last page"><i class="bi bi-chevron-bar-right" aria-hidden="true"></i></button>';
  return html;
}


/* ----------------------------------------------------------------------------
   PAGE SIZE — the app-wide `-` contract.

   Every listing footer in this product opens on `-`, and `-` means "as many rows
   as the panel can show": the control reads `-`, the table fills the space and
   nothing scrolls (DESIGN.md → "The `-` page-size fit", where the acceptance
   line is "on every one: the control reads `-` ... no panel has a scrollbar at
   the fitted size"). `All` shows every row. A number means that number.

   The Access Control footers shipped `10` as their default and no `-` at all, so
   they were the only listings in the product that opened on a fixed 10.
   -------------------------------------------------------------------------- */
function fitRows(card) {
  /* `pagination-standardizer.js` -> `resolvePageSize()`, the same order of moves:
     the scroller's own height, the head subtracted only while it is still inside
     it, a painted row (>= 38px) as the divisor, and the same clamp. The house
     numbers, so the family's `-` lands where the other listings land. */
  var scroll = card.querySelector('.table-wrap') || card;
  var head = scroll.querySelector('thead');
  var headH = head ? Math.ceil(head.getBoundingClientRect().height) : 44;
  var avail = Math.max(0, Math.floor(scroll.clientHeight) - headH);
  /* A real row, not the placeholder: a "Loading…" cell is one line (38px) while a
     real row is two (57px here), and measuring the placeholder over-counts by
     three rows — measured on 11.2: 319 / 38 = 8 rows where 319 / 57 = 5 fit.
     It must also be PAINTED: a row the search or the status pills have hidden
     measures 0 tall, and a 0 sample would fit three rows too many. `getClientRects()`
     is the cheap "has layout" test. */
  var sample = null;
  var rows = scroll.querySelectorAll('tbody tr');
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].cells && rows[i].cells.length > 1 && rows[i].getClientRects().length) { sample = rows[i].cells[0]; break; }
  }
  if (!sample && rows.length) sample = rows[0].cells[0];
  var rowH = sample ? Math.max(38, Math.round(sample.getBoundingClientRect().height)) : 41;
  return Math.max(5, Math.min(200, Math.floor(avail / rowH) || 12));
}
/* ---------------------------------------------------------------------------
   Timestamps: the DATE in the cell, the TIME on hover.

   This is the member listing's own pattern (`member-management.js`: `dtCell()` writes
   `<span class="bo-tx-datetime" data-tip="HH:MM:SS">YYYY-MM-DD</span>`, and `#umTimeTip`
   draws the tooltip). Admin Management had been stacking date over time with a `<br>`, which
   made every row two lines tall and read as clutter in a column that only needs the day.
   The tip element and its stylesheet (`.um-time-tip`, in bo-charcoal-legacy.css) are global,
   so this one controller serves every page that loads this file and a page that also runs the
   member listing's controller shares the same tip element rather than drawing a second one.
   The date stays ISO, the family's own format, rather than the member listing's DD/MM/YYYY.
   --------------------------------------------------------------------------- */
function esc(value){
  return String(value == null ? '' : value).replace(/[&<>"']/g,
    function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}

function dtCell(value){
  var full = String(value == null ? '' : value).trim();
  if (!full || full === '-') return '<span class="mad-muted">-</span>';
  var m = full.match(/^(\d{4}[-/]\d{1,2}[-/]\d{1,2})[T\s]+(\d{1,2}:\d{2}(?::\d{2})?)/);
  if (!m) return '<span class="bo-tx-datetime">' + esc(full) + '</span>';
  return '<span class="bo-tx-datetime" tabindex="0" data-tip="' + esc(m[2]) + '">' + esc(m[1]) + '</span>';
}

function ensureTimeTip(){
  var tip = document.getElementById('umTimeTip');
  if (tip) return tip;
  tip = document.createElement('div');
  tip.id = 'umTimeTip';
  tip.className = 'um-time-tip';
  tip.setAttribute('role', 'tooltip');
  tip.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tip);
  return tip;
}
function placeTimeTip(el){
  var tip = ensureTimeTip();
  var text = el.getAttribute('data-tip') || '';
  if (!text) { hideTimeTip(); return; }
  tip.textContent = text;
  tip.classList.add('is-on');
  tip.classList.remove('is-below');
  var r = el.getBoundingClientRect();
  var tr = tip.getBoundingClientRect();
  var top = r.top - tr.height - 8, below = false;
  if (top < 8) { below = true; top = r.bottom + 8; }
  tip.classList.toggle('is-below', below);
  var left = Math.max(8, Math.min(r.left + r.width / 2 - tr.width / 2, window.innerWidth - tr.width - 8));
  tip.style.left = Math.round(left) + 'px';
  tip.style.top = Math.round(top) + 'px';
}
function hideTimeTip(){
  var tip = document.getElementById('umTimeTip');
  if (tip) tip.classList.remove('is-on', 'is-below');
}
/* Delegated, and scoped to the datetime spans: this page also carries action buttons with
   their own `data-tip`, and those are not ours to draw. */
function bindTimeTips(){
  if (bindTimeTips._bound) return;
  bindTimeTips._bound = true;
  var find = function (e) { return e.target && e.target.closest && e.target.closest('.bo-tx-datetime[data-tip]'); };
  document.addEventListener('mouseover', function (e) { var el = find(e); if (el) placeTimeTip(el); });
  document.addEventListener('mouseout', function (e) {
    var el = find(e); if (!el) return;
    var next = e.relatedTarget;
    if (next && el.contains(next)) return;
    hideTimeTip();
  });
  document.addEventListener('focusin', function (e) { var el = find(e); if (el) placeTimeTip(el); });
  document.addEventListener('focusout', function (e) {
    var el = find(e); if (!el) return;
    var next = e.relatedTarget;
    if (next && el.contains(next)) return;
    hideTimeTip();
  });
  window.addEventListener('scroll', hideTimeTip, true);
  window.addEventListener('resize', hideTimeTip);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideTimeTip(); });
}

window.boAc = {
  FIT: '-',
  ALL: 'All',
  /* A date cell with its time on hover - see dtCell above. */
  dtCell: dtCell,
  /* What a select value means in rows. `card` is the listing card, for the fit. */
  resolve: function (value, card) {
    var v = String(value == null ? '' : value).trim();
    if (v === 'All' || v === '*') return 100000;
    if (v === '-' || v === '' || v === 'auto') return card ? fitRows(card) : 10;
    var n = Number(v);
    return isFinite(n) && n > 0 ? n : (card ? fitRows(card) : 10);
  },
  /* The option list every family footer carries, `-` first. */
  options: function () { return ['-', '10', '20', '50', '100', 'All']; },
  pageButtons: pageButtons,
  /* After the rows are painted, check the panel really does not overflow and let
     the page re-render once if it does. This is the report family's own settle
     (`verifyOverflow()` re-checks a frame later), and it is what makes `-` exact
     even though the first measurement happens before real rows exist. */
  settle: function (card, rerender) {
    if (!card || typeof rerender !== 'function') return;
    var self = this;
    requestAnimationFrame(function () {
      var wrap = card.querySelector('.table-wrap');
      if (!wrap) return;
      var sel = card.querySelector('.entries-control select');
      var v = sel ? String(sel.value).trim() : '';
      if (v !== '' && v !== '-') return;                 /* only in fit mode */
      var passes = card.__boAcSettle || 0;
      if (wrap.scrollHeight > wrap.clientHeight + 1 && passes < 3) {
        card.__boAcSettle = passes + 1;
        rerender();
      } else if (wrap.scrollHeight <= wrap.clientHeight + 1) {
        card.__boAcSettle = 0;
      }
    });
  }
};

  function isPlaceholder(row) {
    var cells = row.cells;
    if (!cells || cells.length !== 1) return false;
    return cells[0].hasAttribute('colspan');
  }

  function Listing(root) {
    this.root = root;
    this.size = root.getAttribute('data-ac-pagesize') || SIZES[0];
    this.page = 1;
    this.term = '';
    /* The status pills (Active / <this page's word for off> / All, `data-ac-status-pills`).
       `active` is the arrival selection — these listings land on the first pill, the same
       arrival as the merchant and admin listings. The buttons carry the shared pill
       recipe's own vocabulary —
       `data-mad-status="active" | "suspended" | "all"` — so their dots, frame and
       dark-theme colours come from `bo-charcoal-shell.css`, and a row marks itself
       with the matching `data-ac-status="active" | "suspended"`. One vocabulary on
       both sides, so filtering is a string compare. */
    this.statusTerm = 'active';
    this.footer = null;
    this.build();
    this.observe();
    this.wireSearch();
    this.wireStatusPills();
  }

  Listing.prototype.rows = function () {
    var body = this.root.querySelector('tbody');
    if (!body) return [];
    return Array.prototype.filter.call(body.rows, function (r) { return !isPlaceholder(r); });
  };

  /* The rows that survive the search AND the status pills. The page size, the
     "Showing a to b of c" line and the pager all count THESE, so a search reads as a
     smaller listing rather than as a listing with holes in it, and a status with no
     rows reads as an empty listing rather than as a broken one. */
  Listing.prototype.matched = function () {
    var term = this.term;
    var status = this.statusTerm;
    var rows = this.rows();
    if (status && status !== 'all') {
      rows = rows.filter(function (row) { return row.getAttribute('data-ac-status') === status; });
    }
    if (!term) return rows;
    return rows.filter(function (row) {
      return (row.textContent || '').toLowerCase().indexOf(term) !== -1;
    });
  };

  /* One pass for the pill group: the numbers on it and which one is on. The numbers
     describe the whole listing — the search does not move them, the pills do not
     shrink themselves when they are the filter (that is the merchant listing's own
     behaviour, and it is the one that lets you read a filter's size before clicking).
     Called from apply(), so a save, a delete or a toggle that re-renders the rows
     leaves the counts honest without the page having to say so. */
  Listing.prototype.syncStatusPills = function () {
    var groups = this.root.querySelectorAll('[data-ac-status-pills]');
    if (!groups.length) return;
    var term = this.statusTerm;
    var all = this.rows();
    var counts = { all: all.length, active: 0, suspended: 0 };
    Array.prototype.forEach.call(all, function (row) {
      var s = row.getAttribute('data-ac-status');
      if (s && counts[s] != null) counts[s]++;
    });
    Array.prototype.forEach.call(groups, function (group) {
      Array.prototype.forEach.call(group.querySelectorAll('[data-ac-status-count]'), function (el) {
        var n = counts[el.getAttribute('data-ac-status-count')];
        el.textContent = String(n == null ? 0 : n);
      });
      Array.prototype.forEach.call(group.querySelectorAll('[data-mad-status]'), function (btn) {
        var on = (btn.getAttribute('data-mad-status') || 'all') === term;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  };

  Listing.prototype.wireStatusPills = function () {
    var self = this;
    var groups = this.root.querySelectorAll('[data-ac-status-pills]');
    Array.prototype.forEach.call(groups, function (group) {
      Array.prototype.forEach.call(group.querySelectorAll('[data-mad-status]'), function (btn) {
        btn.addEventListener('click', function () {
          self.statusTerm = btn.getAttribute('data-mad-status') || 'all';
          self.page = 1;
          self.apply();
        });
      });
    });
  };

  Listing.prototype.declaredSize = function () {
    return this.root.getAttribute('data-ac-pagesize') || SIZES[0];
  };

  Listing.prototype.build = function () {
    var self = this;
    var footer = document.createElement('div');
    // `bo-pagination-standard` is the app-wide footer recipe (bo-ui-standard.css
    // gives it the left / middle / right grid). It is stated here rather than
    // left to bo-ui-standard.js's own scan, which only finds footers that exist
    // when it runs — this script may create its footer after that point.
    footer.className = 'table-footer bo-pagination-standard';
    footer.setAttribute('data-ac-footer', '');

    var left = document.createElement('div');
    left.className = 'entries-control';
    var select = document.createElement('select');
    select.setAttribute('aria-label', 'Rows per page');
    SIZES.forEach(function (n) {
      var o = document.createElement('option');
      o.value = String(n);
      o.textContent = String(n);
      select.appendChild(o);
    });
    select.value = String(this.declaredSize());
    this.size = boAc.resolve(select.value, this.root);
    select.addEventListener('change', function () {
      self.size = boAc.resolve(select.value, self.root);
      self.page = 1;
      self.apply();
    });
    left.appendChild(document.createTextNode('Show '));
    left.appendChild(select);
    left.appendChild(document.createTextNode(' entries'));

    var info = document.createElement('div');
    info.className = 'table-info bo-pagination-info';

    var pager = document.createElement('div');
    pager.className = 'pagination-clean bo-pagination-buttons';
    pager.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-ac-page]');
      if (!btn || btn.disabled) return;
      self.page = Number(btn.getAttribute('data-ac-page')) || 1;
      self.apply();
    });

    footer.appendChild(left);
    footer.appendChild(info);
    footer.appendChild(pager);
    this.root.appendChild(footer);
    this.footer = footer;
  };

  Listing.prototype.apply = function () {
    var all = this.rows();
    var rows = this.matched();
    this.syncStatusPills();
    var total = rows.length;
    var totalPages = Math.max(1, Math.ceil(total / this.size));
    if (this.page > totalPages) this.page = totalPages;
    if (this.page < 1) this.page = 1;

    var start = (this.page - 1) * this.size;
    var end = start + this.size;
    var shown = 0;
    rows.forEach(function (row) {
      var visible = shown >= start && shown < end;
      row.style.display = visible ? '' : 'none';
      if (visible) shown++;
    });
    /* A row a FILTER rejected is hidden whether or not the pager would have reached
       it. Keyed on "matched is a subset of all" rather than on the search term alone:
       the search and the status pills are both filters, and the pills' rejected rows
       were staying on screen while the footer below them counted them out. */
    if (rows.length !== all.length) {
      var inPage = new Set(rows.slice(start, end));
      Array.prototype.forEach.call(all, function (row) {
        if (!inPage.has(row)) row.style.display = 'none';
      });
    }

    var info = this.footer.querySelector('.table-info');
    var text = total
      ? 'Showing ' + (start + 1) + ' to ' + Math.min(end, total) + ' of ' + total + ' entries'
      : 'Showing 0 to 0 of 0 entries';
    if (info.textContent !== text) info.textContent = text;

    /* `-` fits the panel, and the fit needs a painted row: the first pass runs
       with none, so re-fit exactly once when the rows exist. The flag keeps it
       to one extra pass (a second would chase its own geometry). */
    if (window.boAc && String(this.declaredSize()) === boAc.FIT && !this._refit && total) {
      var fitted = boAc.resolve('-', this.root);
      if (fitted !== this.size) {
        this._refit = true;
        this.size = fitted;
        this.page = 1;
        this.apply();
        return;
      }
    }

    if (window.boAc && boAc.settle) {
      var self2 = this;
      boAc.settle(this.root, function () {
        /* Re-MEASURE, not just repaint: the first pass sizes off a placeholder row
           (38px) where the real rows are 57, so re-applying the same size changes
           nothing — and that is exactly how 11.6 stayed one row too long. */
        self2.size = boAc.resolve(self2.declaredSize(), self2.root);
        self2.page = 1;
        self2.apply();
      });
    }

    var pager = this.footer.querySelector('.pagination-clean');
    var html = pageButtons(this.page, totalPages);
    if (pager.getAttribute('data-ac-rendered') !== html) {
      pager.innerHTML = html;
      pager.setAttribute('data-ac-rendered', html);
    }
  };

  Listing.prototype.wireSearch = function () {
    var self = this;
    var input = this.root.querySelector('[data-ac-search]')
      || document.querySelector('[data-ac-search]');
    if (!input) return;
    var timer = 0;
    var run = function () {
      self.term = String(input.value || '').trim().toLowerCase();
      self.page = 1;
      self.apply();
    };
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 400); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { clearTimeout(timer); run(); }
    });
  };

  Listing.prototype.observe = function () {
    var self = this;
    var body = this.root.querySelector('tbody');
    if (!body || !window.MutationObserver) return;
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        self.apply();
      });
    }).observe(body, { childList: true });
  };

  function init() {
    var roots = document.querySelectorAll('[data-ac-listing]');
    Array.prototype.forEach.call(roots, function (root) {
      if (root.getAttribute('data-ac-ready')) return;
      root.setAttribute('data-ac-ready', '1');
      var listing = new Listing(root);
      listing.apply();
    });
  }

  bindTimeTips();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
