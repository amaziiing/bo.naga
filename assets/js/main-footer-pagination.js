/* ============================================================================
   The Main panel's listing footer — the page-size half of it.

   WHY THIS EXISTS
   The Main panel grew four different listing footers and two different page
   ladders (audited 2026-10-01, 28 pages rendered and measured): eight pages put
   `Show N entries` on the left with the info centred (`main-admin-page-size.css`),
   five put a `Show [10] / page` label on the right (`.mre-page-size-label`, with
   the real select hidden by `main-admin-detail-executive.css`), four had no
   control at all, and six put an icon-only ladder in the middle with a native
   `<select>` on the right (`.provider-*` / `.settlement-*` / `.main-mod-*`).

   The owner asked for one control: `Show [- ▾] entries`, the app-wide list,
   opening on `-`. This file is the ONE resolver for it, so a page does not have to
   invent `-` (fit), `All` (everything) and a number again — `member-deposit.js`,
   `wallet-ledger.js` and `access-control-listing.js` each grew their own copy, and
   that is exactly how the four footers happened.

   USAGE (a page keeps ownership of its rows and its ladder):
     var size = window.boMad.resolve($('xxxPageSize').value, card);   // '-', 'All', '20'
     pager.innerHTML = pageButtons(page, totalPages);                 // unchanged
     $('xxxPageSize').addEventListener('change', render);

   `card` is the listing panel (`.mad-panel` / `.mas-panel` / `.main-mod-panel`) or
   any element inside it; the fit is measured on the panel's own scroller.
   ========================================================================== */
(function () {
  'use strict';

  /* The product's own list, `-` first — the same one the BO listings carry. */
  var SIZES = ['-', '10', '20', '50', '100', 'All'];
  var FIT = '-';
  var ALL = 'All';
  var ALL_ROWS = 100000;

  function cardOf(scope) {
    if (scope && scope.closest) {
      var byPanel = scope.closest('.mad-panel,.mas-panel,.main-mod-panel,.mad-list-card');
      if (byPanel) return byPanel;
    }
    return scope || document.querySelector('.mad-panel,.mas-panel,.main-mod-panel') || document;
  }

  function scrollerOf(card) {
    return card.querySelector('.mad-table-wrap,.mas-table-body-scroll,.main-mod-table-wrap,.report-table-scroll,.table-wrap') || card;
  }

  /* `-` = as many rows as the panel shows. Same order of moves as
     `pagination-standardizer.js` → `resolvePageSize()` / `boAc.resolve()`: the
     scroller's own height, the head subtracted only while the head is still inside
     it (and the totals foot the same way — a visible foot is part of what the panel
     shows), the AVERAGE of the painted rows (these tables wrap their cells, so one
     sample off the first row over-counts — measured on Bank Deposit Usage: 11 rows
     asked for, the 11th 13px behind the panel edge), and floor only. */
  function fitRows(scope) {
    var card = cardOf(scope);
    var scroll = scrollerOf(card);
    if (!scroll) return 10;
    var head = scroll.querySelector('thead');
    var headH = head ? Math.ceil(head.getBoundingClientRect().height) : 0;
    /* The merchant report family carries a totals `<tfoot>` inside the scroller; it is
       subtracted like the head (never while `hidden`). Measured there: with the head
       alone 8 rows fit, and the 54px totals row pushed the 8th 4px past the panel edge. */
    var foot = scroll.querySelector('tfoot');
    var footH = foot && !foot.hidden ? Math.ceil(foot.getBoundingClientRect().height) : 0;
    var avail = Math.max(0, Math.floor(scroll.clientHeight) - headH - footH);
    var n = 0, sum = 0;
    var rows = scroll.querySelectorAll('tbody tr');
    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      if (!tr.cells || tr.cells.length <= 1 || !tr.getClientRects().length) continue;
      n++; sum += tr.getBoundingClientRect().height;
    }
    var rowH = n ? Math.max(38, Math.round(sum / n)) : 44;
    return Math.max(5, Math.min(200, Math.floor(avail / rowH) || 10));
  }

  window.boMad = {
    SIZES: SIZES,
    FIT: FIT,
    ALL: ALL,
    options: function () { return SIZES.slice(); },
    /* What a select value means in rows. */
    resolve: function (value, scope) {
      var v = String(value == null ? '' : value).trim();
      if (v === ALL || v === '*') return ALL_ROWS;
      if (v === '' || v === FIT || /^auto$/i.test(v)) return fitRows(scope);
      var num = Number(v);
      return isFinite(num) && num > 0 ? num : fitRows(scope);
    },
    fitRows: fitRows,
    /* After the rows are painted, check the panel really does not overflow and let the page
       re-render once if it does. This is `access-control-listing.js` -> `boAc.settle()`:
       the first pass can only measure the "Loading..." placeholder, whose single colspan
       cell is one line where a real row is two, so `-` would ask for one row too many.
       Bounded to three passes; the counter resets as soon as a pass does not overflow. */
    settle: function (scope, rerender) {
      if (!scope || typeof rerender !== 'function') return;
      var card = cardOf(scope);
      var passes = Number(card.getAttribute('data-bo-mad-settle') || 0);
      requestAnimationFrame(function () {
        var scroll = scrollerOf(card);
        if (!scroll) return;
        if (scroll.scrollHeight <= scroll.clientHeight + 1) {
          card.setAttribute('data-bo-mad-settle', '0');
          return;
        }
        if (passes >= 3) return;
        card.setAttribute('data-bo-mad-settle', String(passes + 1));
        rerender();
      });
    }
  };
})();
