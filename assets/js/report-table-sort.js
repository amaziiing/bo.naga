/*
 * Column sorting for the 8.1–8.12 report tables.
 *
 * Owner: "report的所有页面的所有table欠缺sort功能 你去查看其他页面设计出的md" — the recipe already exists in this
 * repo on the Member Wallet listing: `th.bo-tx-sortable[data-sort]` with a `.bo-tx-sort-btn` carrying a
 * CSS-drawn `.bo-tx-sort-ico`, the states `is-sorted` / `is-asc` / `is-desc`, and `aria-sort` kept in
 * step (assets/js/member-wallet.js, assets/css/bo-wallet-transaction-amber.css). This is that design,
 * applied to every report table from one place instead of eleven page scripts.
 *
 * THE CONTROL IS A SPAN WITH role="button", NOT A <button> — deliberately.
 * `bo-ui-standard.js` paints every `button, input[type=button|submit], a.btn…` it finds as a global
 * button, and it re-scans added nodes from its own MutationObserver. Used here, that turned the header
 * into a row of amber primary pills with white labels, and it is a fight: it decorates, this file
 * strips, and whatever watches harder wins. A span is simply not in its selector, so the decoration
 * never starts. Keyboard support is added explicitly (Enter/Space), and the role/tabindex carry the
 * semantics a real button would have given.
 *
 * Two structural facts it has to handle, because these tables are not all the same shape:
 *   1. Since `report-table-split.js`, the family's head and body are TWO tables — the head lives in
 *      `.bo-report-head` with the `thead`, the body in `.table-wrap` with the `tbody`. So a head cell
 *      and the rows it sorts are found through the CARD, not through a shared `<table>`.
 *   2. 8.7 Transaction Report owns its own split (`.bo-tx-head-table` / `.bo-tx-body-table`) and is not
 *      excluded here — its head cells carry the same classes and its rows sort the same way.
 *
 * Sorting is applied to the ROWS THE TABLE CURRENTLY HOLDS. On the pages that fetch the whole set and
 * paginate client-side that is the whole set; on Win/Lose and the two games reports (server-paginated)
 * it orders the page on screen — a whole-set sort there needs their endpoints to accept `sort`/`order`,
 * which is not something this file can assume. The wallet page makes the same bargain.
 *
 * Keep this file's DOM footprint small: it runs on eleven pages. It writes markup once per head cell
 * (guarded by a marker), one delegated click/keydown listener per head table, and one childList
 * observer per body to re-apply the order after a page change.
 */
(function () {
  'use strict';

  var BTN = 'bo-tx-sort-btn';
  var ICO = 'bo-tx-sort-ico';
  var TH = 'bo-tx-sortable';
  var READY = 'data-bo-sort-ready';
  var state = new WeakMap();          /* head table -> { index, dir } */

  /* The layer is pinned only on report pages, so its presence IS the opt-in — the body class below is
     what turns the styling on, and it is set only once a real head cell has been decorated. That is
     what lets report pages outside the 8.x family (Provider Bet Report, Agent Bet Report, Game Bet
     Report, MAIN Report) get sorting too, without touching any ordinary listing page. */
  function eligible() {
    return !!document.body;
  }
  function markStyled() {
    if (document.body && !document.body.classList.contains('bo-sortable-tables')) {
      document.body.classList.add('bo-sortable-tables');
    }
  }

  /* The head and body tables of one card: the head is whichever contains a `thead`, and the BODY IS
     RESOLVED LATER — never guessed. Most of these pages render their rows after this file runs, so a
     fallback to the head table (a single table, before the split, or rows not yet fetched) silently
     pointed the whole layer at a table with no rows: no sorting, and the alignment pass never ran
     again, which showed up as a sort icon parked away from its right-aligned label
     (owner: "其他页面 点日期后也中事了"). */
  function bodyTableOf(card) {
    var tables = card.querySelectorAll('table');
    for (var i = 0; i < tables.length; i++) {
      if (tables[i].querySelector('tbody tr')) return tables[i];
    }
    return null;
  }
  function pairs() {
    var out = [];
    var cards = document.querySelectorAll('.table-card');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var tables = card.querySelectorAll('table');
      var headTable = null;
      for (var j = 0; j < tables.length; j++) {
        if (tables[j].querySelector('thead th')) { headTable = tables[j]; break; }
      }
      if (headTable) out.push({ head: headTable, card: card });
    }
    return out;
  }

  /* Wrap each head label in the recipe's control + icon, and mark the cell sortable. */
  /* A heading must sit where its data sits. Several columns in this repo right-align their numbers
     (Net Cash Flow, Win/Lose, amounts) while the rest are left — a fixed left-aligned heading
     therefore never lines up with those. The alignment is read from the body's first row, per
     column. A column that is not left-aligned also gets `bo-sort-inline`, which puts the icon in
     flow immediately before its label instead of in the cell's left gutter — without it those
     columns showed the icon parked at the far edge of the cell, an entire column away from the
     label it belongs to. */
  function alignControl(table, index) {
    var body = bodyTableOf(table.card);
    var tbody = body && body.tBodies[0];
    var td = tbody && tbody.rows[0] ? tbody.rows[0].children[index] : null;
    var th = table.head.querySelectorAll('thead th')[index];
    var btn = th && th.querySelector('.' + BTN);
    if (!btn) return;
    var a = td ? getComputedStyle(td).textAlign : 'left';
    var flex = (a === 'right' || a === 'end') ? 'flex-end' : (a === 'center' ? 'center' : 'flex-start');
    btn.classList.toggle('bo-sort-inline', flex !== 'flex-start');
    btn.style.setProperty('justify-content', flex, 'important');
    btn.style.setProperty('text-align', flex === 'flex-end' ? 'right' : (flex === 'center' ? 'center' : 'left'), 'important');
  }
  function decorate(table) {
    var headTable = table.head;
    var ths = headTable.querySelectorAll('thead th');
    for (var i = 0; i < ths.length; i++) {
      var th = ths[i];
      if (th.getAttribute(READY) === '1') continue;
      if (th.querySelector('.' + BTN)) continue;                  /* the page built its own */
      var label = th.textContent.trim();
      if (!label) continue;                                       /* no label, no sort target */
      /* The leading # column is a display row number, not record data. Keep it fixed as
         the visual position number instead of sorting/moving the original row number. */
      if (i === 0 && label === '#') {
        th.setAttribute(READY, '1');
        th.classList.remove(TH, 'is-sorted', 'is-asc', 'is-desc');
        th.removeAttribute('data-sort');
        th.setAttribute('aria-sort', 'none');
        continue;
      }
      th.setAttribute(READY, '1');
      th.classList.add(TH);
      th.setAttribute('data-sort', String(i));
      if (!th.hasAttribute('aria-sort')) th.setAttribute('aria-sort', 'none');
      th.setAttribute('scope', 'col');
      th.textContent = '';
      var btn = document.createElement('span');
      btn.className = BTN;
      btn.setAttribute('role', 'button');
      btn.setAttribute('tabindex', '0');
      btn.setAttribute('aria-label', 'Sort by ' + label);
      var ico = document.createElement('span');
      ico.className = ICO;
      ico.setAttribute('aria-hidden', 'true');
      btn.appendChild(ico);
      btn.appendChild(document.createTextNode(label));
      th.appendChild(btn);
      markStyled();
      alignControl(table, i);
    }
  }

  /* Numbers compare as numbers even when they arrive formatted ("1,200.00", "RM 12.5", "-40"). */
  function valueOf(tr, index) {
    var cell = tr.children[index];
    if (!cell) return { n: NaN, s: '' };
    var text = (cell.textContent || '').trim();
    var cleaned = text.replace(/[^0-9eE+\-.,%]/g, '');
    var n = NaN;
    if (cleaned && /[0-9]/.test(cleaned)) n = Number(cleaned.replace(/,/g, '').replace(/%$/, ''));
    return { n: n, s: text.toLocaleLowerCase() };
  }

  function compare(a, b, index, dir) {
    var av = valueOf(a, index), bv = valueOf(b, index);
    var cmp;
    if (!isNaN(av.n) && !isNaN(bv.n)) cmp = av.n === bv.n ? 0 : (av.n < bv.n ? -1 : 1);
    else cmp = av.s.localeCompare(bv.s, undefined, { numeric: true, sensitivity: 'base' });

    /* Equal values must never be reversed or shuffled when DESC is selected.
       Returning 0 lets modern stable Array.sort preserve the rows' current relative order.
       This is critical for report columns containing repeated 0.00/status/provider values: only
       genuinely different sort keys should move. */
    if (cmp === 0) return 0;
    return dir === 'desc' ? -cmp : cmp;
  }

  function renumberDisplayRows(table, rows) {
    var ths = table.head.querySelectorAll('thead th');
    if (!ths.length || (ths[0].textContent || '').trim() !== '#') return;
    if (!rows || !rows.length) return;

    /* Preserve the current page numbering base while # follows the displayed row position. */
    var nums = rows.map(function (tr) {
      var td = tr.children[0];
      var n = td ? Number((td.textContent || '').trim()) : NaN;
      return Number.isFinite(n) ? n : NaN;
    }).filter(function (n) { return Number.isFinite(n); });
    var base = nums.length ? Math.min.apply(Math, nums) : 1;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].children[0]) rows[i].children[0].textContent = String(base + i);
    }
  }

  function apply(table) {
    var st = state.get(table.head);
    if (!st) return;
    var body = bodyTableOf(table.card);
    var tbody = body && body.tBodies[0];
    if (!tbody) return;
    /* Re-appending rows collapses the scroller back to 0, so the reader loses their place in a wide
       table the moment they sort. Hold the position across the reorder. */
    var scroller = table.card.querySelector('.table-wrap, .bo-tx-table-body');
    var keepScroll = scroller ? scroller.scrollLeft : 0;
    var rows = Array.prototype.slice.call(tbody.rows).filter(function (tr) { return tr.children.length > 1; });
    if (rows.length < 2) return;
    rows.sort(function (a, b) { return compare(a, b, st.index, st.dir); });
    /* Only write when the order actually changes. Measured before this guard: sorting once left the
       tbody churning at ~4,800 childList mutations per second, forever — apply() re-appended every
       row, the appends fired the card observer, and the observer called apply() again. The hovered
       row was replaced a few hundred times a second, which the owner saw as the table flickering
       (owner: "我的table 回闪烁 因为sort的配置关系"). A page re-render that lands on the sorted
       order (the family's fit-mode refit re-renders rows the same way) burst the same way. With the
       guard, a chain terminates the first time the DOM already matches: one real reorder per click,
       zero writes when the rows are already where the sort wants them. */
    var inPlace = Array.prototype.filter.call(tbody.rows, function (tr) { return tr.children.length > 1; });
    var same = inPlace.length === rows.length;
    if (same) {
      for (var k = 0; k < rows.length; k++) {
        if (rows[k] !== inPlace[k]) { same = false; break; }
      }
    }
    if (same) { renumberDisplayRows(table, inPlace); resyncScroll(table); return; }
    for (var i = 0; i < rows.length; i++) tbody.appendChild(rows[i]);
    renumberDisplayRows(table, rows);
    if (scroller && keepScroll) scroller.scrollLeft = keepScroll;
    resyncScroll(table);
  }

  /* Re-lock the heading row to the body scroller. Reordering rows wakes the split layer, which re-derives
     column widths; the head only follows the body on a scroll EVENT, so a width change can leave it
     scrolled differently — visible as the headings sitting off their columns after a sort. */
  function resyncScroll(table) {
    var card = table.head.closest ? table.head.closest('.table-card') : null;
    if (!card) return;
    var mirror = function () {
      var headEl = card.querySelector('.bo-report-head, .bo-tx-table-head');
      var bodyEl = card.querySelector('.table-wrap, .bo-tx-table-body');
      if (!headEl || !bodyEl) return;
      if (headEl.scrollLeft !== bodyEl.scrollLeft) headEl.scrollLeft = bodyEl.scrollLeft;
    };
    mirror();
    setTimeout(mirror, 40);
    setTimeout(mirror, 160);
  }

  function sync(headTable) {
    var st = state.get(headTable);
    var ths = headTable.querySelectorAll('thead th.' + TH);
    for (var i = 0; i < ths.length; i++) {
      var th = ths[i];
      var active = !!st && Number(th.getAttribute('data-sort')) === st.index;
      th.setAttribute('aria-sort', active ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none');
      th.classList.toggle('is-sorted', active);
      th.classList.toggle('is-asc', active && st.dir === 'asc');
      th.classList.toggle('is-desc', active && st.dir === 'desc');
    }
  }

  function setSort(table, index) {
    var st = state.get(table.head);
    if (st && st.index === index) st.dir = st.dir === 'asc' ? 'desc' : 'asc';
    else st = { index: index, dir: 'asc' };
    state.set(table.head, st);
    sync(table.head);
    apply(table);
  }

  function bind(table) {
    if (table.head.getAttribute('data-bo-sort-bound') === '1') return;
    table.head.setAttribute('data-bo-sort-bound', '1');
    /* Re-decorate when the page rebuilds its own head.
       Several of these pages render their `<thead>` from JS on every load, and 8.7 does it again on each
       autofit settle — so a decoration applied once is thrown away with the old cells. Measured on 8.7:
       fourteen headings decorated and then gone, because its `load()` re-writes `#reportHead` after the
       boot timers had already passed. Watching the `thead` itself is scoped and cheap. */
    var thead = table.head.querySelector('thead');
    if (thead && window.MutationObserver) {
      var pendingHead = 0;
      new MutationObserver(function () {
        clearTimeout(pendingHead);
        pendingHead = setTimeout(function () { decorate(table); sync(table.head); }, 0);
      }).observe(thead, { childList: true });
    }
    table.head.addEventListener('click', function (e) {
      var th = e.target.closest && e.target.closest('th.' + TH);
      if (!th || !table.head.contains(th)) return;
      e.preventDefault();
      setSort(table, Number(th.getAttribute('data-sort')));
    });
    table.head.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      var th = e.target.closest && e.target.closest('th.' + TH);
      if (!th || !table.head.contains(th)) return;
      e.preventDefault();
      setSort(table, Number(th.getAttribute('data-sort')));
    });
    /* Watch the CARD, not the tbody: the rows may not exist yet, and the card is also where a page
       swap replaces the head. One observer per card, debounced. */
    if (table.card && window.MutationObserver) {
      var pending = 0;
      new MutationObserver(function () {
        clearTimeout(pending);
        pending = setTimeout(function () {
          var count = table.head.querySelectorAll('thead th').length;
          for (var k = 0; k < count; k++) alignControl(table, k);
          apply(table);
          resyncScroll(table);
        }, 0);
      }).observe(table.card, { childList: true, subtree: true });
    }
  }

  function run() {
    if (!eligible()) return;
    var list = pairs();
    for (var i = 0; i < list.length; i++) {
      decorate(list[i]);
      bind(list[i]);
    }
  }

  /* The heads and rows arrive asynchronously, so decorate again shortly after load rather than
     watching the whole document — a body-wide observer on eleven pages is a cost, not a feature. */
  function boot() {
    run();
    setTimeout(run, 350);
    setTimeout(run, 1400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
