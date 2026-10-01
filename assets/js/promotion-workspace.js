/* Promotion workspace — one page, two levels.
   ------------------------------------------------------------------
   Replaces the pair of peer pages:
     promotion.html             listed Promotion Bonuses (flat)
     bonus-category-title.html  listed Bonus Category Titles (+ a create form)
   A Promotion carries `bonusCategoryTitleId`, so the two are parent and child,
   not two views of one table. This page renders the parent rows and expands
   each one into the promotions that belong to it.

   It owns the list DOM only. The category create/edit form is a plain
   .manage-form-card that assets/js/crud-modal-pattern.js lifts into a modal and
   wires to an "Add Bonus Category" button; this script fills that form on edit
   and POSTs it. Promotion create/edit still lives on promotion-edit.html.

   Not loaded here: assets/js/promotion.js. It is shared with promotion-edit.html
   and returns early without #promoForm / #promoList, so the edit page keeps it
   and this page does not pay for it.
   ------------------------------------------------------------------ */
(function(){
  'use strict';

  var listEl = document.getElementById('promoWorkspaceList');
  if(!listEl) return;

  var $ = function(id){ return document.getElementById(id); };

  var searchInput    = $('promoWorkspaceSearch');
  var statusFilter   = $('promoWorkspaceStatus');
  var sortFilter     = $('promoWorkspaceSort');
  var showingText    = $('promoWorkspaceShowingText');
  var pageSizeSelect = $('promoWorkspacePageSize');
  var pager          = $('promoWorkspacePager');
  var statusBox      = $('promoWorkspaceStatusBox');

  var categories = [];
  var promotions = [];
  var UNCATEGORIZED_ID = '__uncategorized__';
  var byCategory = {};          // categoryId (string) -> [promotion]
  var expanded   = {};          // categoryId (string) -> true
  var page       = 0;
  var lockedAutoSize = null;      // fitted row count ...
  var lockedBoxHeight = null;     // ... for THIS list height
  var autofitReloading = false;

  /* ------------------------------------------------------------------ utils */

  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function firstDefined(obj, keys){
    for(var i=0;i<keys.length;i++){
      var v = obj && obj[keys[i]];
      if(v !== undefined && v !== null && v !== '') return v;
    }
    return null;
  }

  function apiUrl(pathKey){ return API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS[pathKey]; }

  function actorName(){
    var u = (window.BO_AUTH && BO_AUTH.user) ? BO_AUTH.user() : {};
    return u.username || u.displayName ||
      localStorage.getItem('adminUsername') || localStorage.getItem('admin_username') || 'ADMIN';
  }

  function authHeaders(extra){
    var base = (window.BO_AUTH && BO_AUTH.authHeader) ? BO_AUTH.authHeader() : {};
    var h = Object.assign({}, base, {
      'X-Admin-Username': actorName(),
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    });
    return Object.assign(h, extra || {});
  }

  async function req(url, opt){
    opt = opt || {};
    opt.headers = authHeaders(opt.headers);
    opt.cache = opt.cache || 'no-store';
    var res = await fetch(url, opt);
    var json = await res.json().catch(function(){ return {}; });
    if(!res.ok || json.status === 'error') throw new Error(json.message || 'Request failed');
    return json;
  }

  function confirmDialog(message, title){
    if(window.BO_DIALOG && typeof BO_DIALOG.confirm === 'function'){
      return BO_DIALOG.confirm(message, { title: title, confirmText: 'Delete' });
    }
    return Promise.resolve(window.confirm(message));
  }

  function setStatus(message, type){
    if(!statusBox) return;
    statusBox.textContent = message || '';
    statusBox.className = 'upload-status ' + (type || '');
  }

  function toast(message, type){
    try{
      if(window.BO_TOAST && typeof BO_TOAST[type || 'success'] === 'function') BO_TOAST[type || 'success'](message);
    }catch(e){}
  }

  function imageUrl(item){
    if(item && item.imageUrl) return String(item.imageUrl);
    var value = String((item && item.image) || '').trim();
    if(!value) return '';
    if(/^(https?:)?\/\//i.test(value) || value.charAt(0) === '/' ||
       value.indexOf('data:') === 0 || value.indexOf('blob:') === 0) return value;
    return value;
  }

  function normalizeCategory(raw){
    var x = Object.assign({}, raw || {});
    x.id = firstDefined(x, ['id','categoryTitleId','bonusCategoryTitleId']);
    x.name = firstDefined(x, ['name','title']) || '';
    x.sortOrder = firstDefined(x, ['sortOrder','sort_order','displayOrder']) || 0;
    return x;
  }

  function normalizePromotion(raw){
    var x = Object.assign({}, raw || {});
    x.id = firstDefined(x, ['id','promotionId','promotion_id']);
    x.bonusCategoryTitleId = firstDefined(x, ['bonusCategoryTitleId','bonus_category_title_id','categoryTitleId']);
    x.bonusCategoryTitleName = firstDefined(x, ['bonusCategoryTitleName','bonus_category_title_name','categoryTitleName']);
    return x;
  }

  /* ---------------------------------------------------------------- loading */

  function groupPromotions(){
    byCategory = {};
    promotions.forEach(function(p){
      var key = String(p.bonusCategoryTitleId == null ? '' : p.bonusCategoryTitleId);
      if(!key) key = UNCATEGORIZED_ID;
      (byCategory[key] = byCategory[key] || []).push(p);
    });
  }

  function promotionsOf(category){
    return byCategory[String(category.id)] || [];
  }

  /* A promotion can carry no bonus category title (or one that was deleted). Those rows
     belong to no category, so without a synthetic group they would be fetched and then
     never drawn — the page would silently hide them. They are listed last, and the row
     offers no category actions because there is no category row behind it to edit. */
  function uncategorizedCategory(){
    var orphans = byCategory[UNCATEGORIZED_ID];
    if(!orphans || !orphans.length) return null;
    return { id: UNCATEGORIZED_ID, name: 'Uncategorized', sortOrder: 999999, __synthetic: true };
  }

  async function load(){
    listEl.innerHTML = headHtml() + '<div class="slider-empty"><i class="bi bi-hourglass-split"></i><b>Loading bonus categories...</b></div>';
    try{
      var stamp = Date.now();
      var results = await Promise.all([
        req(apiUrl('BONUS_CATEGORY_TITLE_LIST') + '?page=1&size=300&_=' + stamp),
        req(apiUrl('PROMOTION_LIST') + '?_=' + stamp)
      ]);
      var rawCategories = Array.isArray(results[0]) ? results[0] : (results[0].data || []);
      var rawPromotions = Array.isArray(results[1]) ? results[1] : (results[1].data || []);
      categories = rawCategories.map(normalizeCategory);
      promotions = rawPromotions.map(normalizePromotion);
      groupPromotions();
      lockedAutoSize = null;
      lockedBoxHeight = null;
      render(true);
    }catch(err){
      listEl.innerHTML = '<div class="promo-group-empty"><i class="bi bi-exclamation-triangle"></i>' +
        '<b>Unable to load promotions</b><small>' + esc(err.message || 'Please check API URL / CORS.') + '</small></div>';
    }
  }

  /* ------------------------------------------------- filtering & paging */

  function query(){ return ((searchInput && searchInput.value) || '').trim().toLowerCase(); }
  function statusValue(){ return (statusFilter && statusFilter.value) || ''; }
  function sortValue(){ return (sortFilter && sortFilter.value) || 'sortAsc'; }

  function promotionHaystack(p){
    return (String(p.name || '') + ' ' + String(p.promotionCode || '') + ' ' +
      String(p.bonusCategoryTitleName || '')).toLowerCase();
  }

  /* A category is listed when its own name matches the search, or when at least one
     of its promotions does. Once a status filter is on it becomes the decisive
     filter: only categories that actually hold a promotion in that status survive,
     so a status filter cannot leave a column of empty groups behind. */
  function visibleCategories(){
    var q = query(), status = statusValue(), mode = sortValue();

    var rows = categories.filter(function(cat){
      var nameHit = !q || String(cat.name || '').toLowerCase().indexOf(q) >= 0;
      var childHit = promotionsOf(cat).some(function(p){
        if(q && promotionHaystack(p).indexOf(q) < 0) return false;
        if(status && String(p.status) !== status) return false;
        return true;
      });
      return status ? childHit : (nameHit || childHit);
    });

    rows.sort(function(a, b){
      if(mode === 'sortDesc') return Number(b.sortOrder || 0) - Number(a.sortOrder || 0);
      if(mode === 'nameAsc')  return String(a.name || '').localeCompare(String(b.name || ''));
      if(mode === 'nameDesc') return String(b.name || '').localeCompare(String(a.name || ''));
      return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
    });
    return rows;
  }

  /* Children of one category, after search + status. When the category name
     itself matched, the search no longer constrains its children. */
  function visiblePromotions(cat){
    var q = query(), status = statusValue();
    var nameHit = !!q && String(cat.name || '').toLowerCase().indexOf(q) >= 0;
    return promotionsOf(cat).filter(function(p){
      if(status && String(p.status) !== status) return false;
      if(q && !nameHit && promotionHaystack(p).indexOf(q) < 0) return false;
      return true;
    });
  }

  /* Show N: `-` = as many rows as the list viewport holds (the same contract the
     old pages used). The list is the scroll container, so its clientHeight is the
     budget — MINUS the head row, which headHtml() renders INSIDE that container (see
     its comment) and which therefore occupies part of the budget: ignoring it
     overcounted by one row's share and is why the fit had to be corrected afterwards
     one row at a time, by a loop that only ever ran on the paint tick it happened to
     get. The row height is measured from a painted row whenever one exists; the 76px
     floor is only the first-paint guess. */
  var ROW_FLOOR = 76;

  function isAutoPageSize(raw){
    var v = String(raw == null ? '-' : raw).trim();
    return v === '' || v === '-' || /^auto$/i.test(v);
  }

  function measureAutoPageSize(){
    var head = listEl.querySelector('.bonus-title-table-head');
    var headH = head ? Math.ceil(head.getBoundingClientRect().height) : 0;
    var avail = Math.max(0, Math.floor(listEl.clientHeight) - headH);
    var sample = listEl.querySelector('.bonus-title-table-row');
    var rowH = sample ? Math.max(60, Math.ceil(sample.getBoundingClientRect().height)) : ROW_FLOOR;
    return Math.max(3, Math.min(200, Math.floor(avail / rowH) || 10));
  }

  /* The fit describes the box the list HAS. It is re-measured when that box changes
     instead of being locked on the first call, because on a fresh load the module tab
     row is injected ~450ms in — auth.js draws it once the menu request answers — and takes
     its 48px off the frame after the first fit. Locked to that first measurement the page
     kept one row too many (5 rows in a box that holds 4, so the pager's single page was
     the whole list and no pager was drawn at all), while a SPA swap — where the router
     mounts the tab row BEFORE the target's scripts run — measured the settled box and
     paginated. Two page sizes for the same page and data, decided by arrival path. */
  function autoFitPageSize(){
    var box = listEl.clientHeight;
    if(lockedAutoSize == null || lockedBoxHeight !== box){
      lockedBoxHeight = box;
      lockedAutoSize = measureAutoPageSize();
    }
    return lockedAutoSize;
  }

  function resolvePageSize(raw){
    var v = String(raw == null ? ((pageSizeSelect && pageSizeSelect.value) || '-') : raw).trim();
    if(isAutoPageSize(v)) return autoFitPageSize();
    if(/^all$/i.test(v)) return 10000;
    var n = Number(v);
    return (isFinite(n) && n > 0) ? n : autoFitPageSize();
  }

  function anyExpanded(){
    for(var k in expanded) if(expanded[k]) return true;
    return false;
  }

  /* The autofit count is a guess made before the rows exist; if the rendered
     rows still overflow, drop one and re-render until they fit. */
  function shrinkAutofitIfOverflow(){
    if(autofitReloading) return;
    if(anyExpanded()) return;
    if(!isAutoPageSize(pageSizeSelect && pageSizeSelect.value)) return;
    if(listEl.scrollHeight <= listEl.clientHeight + 1) return;
    if(lockedAutoSize == null || lockedAutoSize <= 3) return;
    lockedAutoSize = Math.max(3, lockedAutoSize - 1);
    autofitReloading = true;
    page = 0;
    try{ render(false); } finally { autofitReloading = false; }
  }

  /* A single page still gets a pager. Every sibling listing draws one
     (game-category.js, game-sub-category.js, bonus-category-title.js — this page's own
     predecessor — and promotion.js), so an empty right-hand side of the footer read as
     broken pagination rather than as "there is only one page" (owner: "pagination 设计
     与功能失效"). The shape is the same as everywhere else: prev/next disabled, the one
     page active; a list with no rows shows the same disabled 1. */
  function renderPager(current, pages){
    if(!pager) return;
    var total = Math.max(1, Number(pages) || 0);
    current = Math.max(0, Math.min(Number(current) || 0, total - 1));
    var html = '<button class="page-btn" type="button" data-page="' + (current - 1) + '"' +
      (current <= 0 ? ' disabled' : '') + ' aria-label="Previous page"><i class="bi bi-chevron-left"></i></button>';
    var from = Math.max(0, current - 2), to = Math.min(total - 1, current + 2);
    for(var i = from; i <= to; i++){
      html += '<button class="page-btn' + (i === current ? ' active' : '') + '" type="button" data-page="' + i +
        '"' + (i === current ? ' aria-current="page"' : '') + '>' + (i + 1) + '</button>';
    }
    html += '<button class="page-btn" type="button" data-page="' + (current + 1) + '"' +
      (current >= total - 1 ? ' disabled' : '') + ' aria-label="Next page"><i class="bi bi-chevron-right"></i></button>';
    pager.innerHTML = html;
  }

  /* --------------------------------------------------------------- rendering */

  function categoryRowHtml(cat){
    var key = String(cat.id);
    var isOpen = !!expanded[key];
    var img = imageUrl(cat);
    var count = promotionsOf(cat).length;
    var childIds = 'promo-group-' + esc(key);
    var synthetic = !!cat.__synthetic;
    var meta = synthetic
      ? 'Promotions without a bonus category title'
      : 'ID: ' + esc(cat.id) + ' <span>&bull;</span> Sort: ' + esc(cat.sortOrder == null ? 0 : cat.sortOrder) +
        ' <span>&bull;</span> ' + count + ' promotion' + (count === 1 ? '' : 's');
    var actions = synthetic ? '' : (
      '<a class="icon-action-btn is-view" data-tip="Manage Items" aria-label="Manage Items"' +
        ' href="bonus-category-item.html?titleId=' + esc(key) + '"><i class="bi bi-collection" aria-hidden="true"></i></a>' +
      '<button class="icon-action-btn is-edit edit-btn" data-tip="Edit" aria-label="Edit" type="button"' +
        ' data-cat-edit="' + esc(key) + '"><i class="bi bi-pencil-square" aria-hidden="true"></i></button>' +
      '<button class="icon-action-btn is-reject delete btn-delete" data-tip="Delete" aria-label="Delete" type="button"' +
        ' data-cat-del="' + esc(key) + '"><i class="bi bi-trash" aria-hidden="true"></i></button>'
    );

    return '' +
      '<div class="category-table-row bonus-title-table-row' + (synthetic ? ' is-synthetic' : '') + '"' +
        ' data-category-row="' + esc(key) + '"' +
        ' aria-expanded="' + (isOpen ? 'true' : 'false') + '">' +
        '<span class="category-drag">' +
          '<button class="promo-tree-toggle" type="button" data-toggle="' + esc(key) + '"' +
            ' aria-expanded="' + (isOpen ? 'true' : 'false') + '" aria-controls="' + childIds + '"' +
            ' aria-label="' + (isOpen ? 'Collapse' : 'Expand') + ' promotions of ' + esc(cat.name || 'category') + '">' +
            '<i class="bi bi-chevron-right" aria-hidden="true"></i>' +
          '</button>' +
        '</span>' +
        '<div class="category-main-cell">' +
          '<div class="category-thumb-full">' +
            (img ? '<img src="' + esc(img) + '" alt="' + esc(cat.name || 'Bonus category') + '">'
                 : '<i class="bi ' + (synthetic ? 'bi-question-lg' : 'bi-image') + '"></i>') +
          '</div>' +
          '<div class="category-copy">' +
            '<b>' + esc(cat.name || 'Untitled Category') + '</b>' +
            '<small>' + meta + '</small>' +
          '</div>' +
        '</div>' +
        '<div class="category-status-cell">' +
          '<span class="status-pill active"><i class="bi bi-check-circle" aria-hidden="true"></i> Active</span>' +
          (count && !isOpen ? '<span class="promo-tree-count" title="Promotions in this category">' + count + '</span>' : '') +
        '</div>' +
        '<div class="category-action-cell">' + actions + '</div>' +
      '</div>' +
      panelHtml(cat, childIds);
  }

  /* Child row. It joins the PARENT's column grid (26px | name | count | actions) instead
     of opening a grid of its own: two grids in one card is what put the nested STATUS
     under a different x than every other column, and no amount of tuning fixes that —
     only sharing the grid does. The nesting is carried by the group's spine and by the
     indent inside the name cell. */
  /* Child row. It reuses the CATEGORY row's column grid (26 | name | status | actions,
     the values bo-charcoal-cms.css gives .bonus-title-table-row and the head) instead of
     being a <table> with a colgroup of its own. Two grids in one card is why the child
     status pill sat ~150px left of the parent's, why the child's icons missed the parent's,
     and why the header label did not sit over either: only sharing the grid fixes that.
     The nesting is carried by the panel surface, the empty first column, and the parent
     row's accent edge. */
  function promotionRowHtml(p){
    var active = Number(p.status) === 1;
    var code = p.promotionCode || ('PROMO-' + p.id);
    var rebateOn = !/DISABLED|NONE|^$/i.test(String(p.rebatePolicy || 'DISABLED'));
    var desc = String(p.description || p.detailText || p.ruleText || '')
      .replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    var href = (p.id == null || p.id === '') ? 'promotion-edit.html'
      : ('promotion-edit.html#id=' + encodeURIComponent(p.id));

    return '' +
      '<div class="promotion-row" data-promo-row="' + esc(p.id) + '" title="' + esc(desc) + '">' +
        '<span class="promotion-row-gutter" aria-hidden="true"></span>' +
        '<div class="promotion-main-cell">' +
          '<div class="promotion-main-inner">' +
            '<div class="promotion-thumb">' +
              (p.bonusImageUrl ? '<img src="' + esc(p.bonusImageUrl) + '" alt="">'
                               : '<i class="bi bi-image" aria-hidden="true"></i>') +
            '</div>' +
            '<div class="promotion-copy">' +
              '<b class="promo-title">' + esc(p.name || 'Untitled promotion') + '</b>' +
              '<div class="promo-meta">' +
                '<span class="promo-code">' + esc(code) + '</span>' +
                '<span class="promo-order">Order ' + esc(p.displayOrder == null ? 0 : p.displayOrder) + '</span>' +
                '<span class="promo-chip">' + esc(p.claimCondition || 'MANUAL') + '</span>' +
                '<span class="promo-chip">' + esc(p.bonusType || 'FIXED') + '</span>' +
                '<span class="promo-rebate' + (rebateOn ? ' is-on' : '') + '">' + (rebateOn ? 'Rebate on' : 'Rebate off') + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="promotion-status-cell">' +
          '<span class="slider-pill ' + (active ? 'active' : 'inactive') + '">' +
            '<i class="bi ' + (active ? 'bi-check-circle' : 'bi-pause-circle') + '" aria-hidden="true"></i>' +
            (active ? 'Active' : 'Inactive') +
          '</span>' +
        '</div>' +
        '<div class="promotion-action-cell">' +
          '<a class="icon-action-btn edit is-edit" data-tip="Edit promotion" aria-label="Edit promotion"' +
            ' href="' + href + '"><i class="bi bi-pencil-square" aria-hidden="true"></i></a>' +
          '<button class="icon-action-btn delete btn-delete is-reject" data-tip="Delete promotion"' +
            ' aria-label="Delete promotion" type="button" data-promo-del="' + esc(p.id) + '">' +
            '<i class="bi bi-trash" aria-hidden="true"></i></button>' +
        '</div>' +
      '</div>';
  }

  function panelHtml(cat, childIds){
    var key = String(cat.id);
    var rows = visiblePromotions(cat);
    var body = rows.length
      ? rows.map(promotionRowHtml).join('')
      : '<div class="promo-group-empty"><i class="bi bi-inbox"></i>' +
        (promotionsOf(cat).length ? 'No promotion matches the current filter.'
                                  : 'No promotion bonus in this category yet.') + '</div>';

    return '<div class="promo-group-panel" id="' + childIds + '" data-group-for="' + esc(key) + '"' +
      (expanded[key] ? '' : ' hidden') + '>' +
        body +
        '<a class="promo-group-add" href="promotion-edit.html">' +
          '<span class="promotion-row-gutter" aria-hidden="true"></span>' +
          '<span class="promo-group-add-label"><i class="bi bi-plus-lg" aria-hidden="true"></i> Add promotion to this category</span>' +
        '</a>' +
      '</div>';
  }

  /* The header is rendered INTO the scroll container, not as a sibling above it. Sitting
     outside, it was the full card's width while the rows were card-width minus the
     scrollbar — measured 6px wider, which put every header label 6px off the column it
     names. Inside, both share one width by construction. */
  function headHtml(){
    return '<div class="bonus-title-table-head" role="row">' +
      '<span class="bonus-title-head-drag" aria-hidden="true"></span>' +
      '<span class="bonus-title-head-name">Bonus Category Title / Promotion</span>' +
      '<span class="bonus-title-head-status">Status</span>' +
      '<span class="bonus-title-head-actions">Actions</span>' +
    '</div>';
  }

  function render(resetPage){
    if(resetPage) page = 0;

    var rows = visibleCategories();
    var orphans = uncategorizedCategory();
    if(orphans){
      // Keep it under the same filters a real category would be under.
      var q = query(), status = statusValue();
      var nameHit = !q || String(orphans.name).toLowerCase().indexOf(q) >= 0;
      var childHit = promotionsOf(orphans).some(function(p){
        if(q && promotionHaystack(p).indexOf(q) < 0) return false;
        if(status && String(p.status) !== status) return false;
        return true;
      });
      if(status ? childHit : (nameHit || childHit)) rows = rows.concat([orphans]);
    }
    var size = resolvePageSize(pageSizeSelect && pageSizeSelect.value);
    var pages = Math.ceil(rows.length / size) || 0;
    if(pages === 0) page = 0; else page = Math.min(page, pages - 1);

    var start = page * size;
    var visible = rows.slice(start, start + size);

    if(showingText){
      showingText.textContent = 'Showing ' + (rows.length ? start + 1 : 0) + ' to ' +
        Math.min(start + size, rows.length) + ' of ' + rows.length + ' entries';
    }
    renderPager(page, pages);

    listEl.innerHTML = headHtml() + visible.map(categoryRowHtml).join('');
    if(!visible.length){
      listEl.innerHTML = headHtml() + '<div class="promo-group-empty">' +
        '<i class="bi bi-award"></i>' +
        (categories.length ? 'No bonus category title matches the current filter.'
                           : 'No bonus category title found. Create your first one.') + '</div>';
    }

    if(isAutoPageSize(pageSizeSelect && pageSizeSelect.value)){
      requestAnimationFrame(shrinkAutofitIfOverflow);
    }
  }

  /* ---------------------------------------------------------------- actions */

  /* The child panel is rendered up front (collapsed rows carry it hidden), so
     expanding is a DOM flip — no re-render, which would move the toggle the
     operator just clicked and lose the list's scroll position. */
  function toggleCategory(key){
    var isOpen = !expanded[key];
    expanded[key] = isOpen;
    var row = listEl.querySelector('[data-category-row="' + key + '"]');
    var panel = listEl.querySelector('[data-group-for="' + key + '"]');
    var toggle = row && row.querySelector('[data-toggle]');
    if(row) row.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if(toggle){
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      toggle.setAttribute('aria-label', (isOpen ? 'Collapse' : 'Expand') + ' promotions of this category');
    }
    if(panel) panel.hidden = !isOpen;
  }

  async function deleteCategory(key){
    if(key === UNCATEGORIZED_ID) return;
    var cat = categories.filter(function(c){ return String(c.id) === String(key); })[0];
    if(!cat) return;
    var ok = await confirmDialog('Delete "' + (cat.name || ('Category #' + key)) + '"?',
      'Delete Bonus Category Title');
    if(!ok) return;
    setStatus('Deleting category...', '');
    try{
      await req(apiUrl('BONUS_CATEGORY_TITLE_DELETE'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(key) })
      });
      setStatus('', '');
      toast('Category deleted.');
      await load();
    }catch(err){
      setStatus(err.message || 'Delete failed.', 'error');
    }
  }

  async function deletePromotion(id){
    if(!(await confirmDialog('Delete this promotion?', 'Delete Promotion'))) return;
    try{
      await req(apiUrl('PROMOTION_DELETE'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(id) })
      });
      toast('Promotion deleted.');
      await load();
    }catch(err){
      setStatus(err.message || 'Delete failed.', 'error');
    }
  }

  /* ------------------------------------------------------------------ form */

  function setupCategoryForm(){
    var form = $('bonusForm');
    if(!form) return;

    var idInput = $('bonusId');
    var nameInput = $('bonusName');
    var sortInput = $('bonusSortOrder');
    var imageInput = $('bonusImage');
    var dropZone = $('bonusDropZone');
    var preview = $('bonusPreview');
    var placeholder = $('bonusUploadPlaceholder');
    var currentImage = $('bonusCurrentImage');
    var formTitle = $('bonusFormTitle');
    var saveBtn = $('saveBonusBtn');
    var resetBtn = $('resetBonusBtn');
    var formStatus = $('bonusStatusBox');
    var selectedFile = null;

    function showPreview(src){
      if(!preview || !placeholder) return;
      preview.src = src;
      preview.hidden = false;
      placeholder.hidden = true;
    }

    function clearPreview(){
      selectedFile = null;
      if(imageInput) imageInput.value = '';
      if(preview){ preview.src = ''; preview.hidden = true; }
      if(placeholder) placeholder.hidden = false;
    }

    function status(message, type){
      if(!formStatus) return;
      formStatus.textContent = message || '';
      formStatus.className = 'upload-status ' + (type || '');
    }

    function reset(){
      if(idInput) idInput.value = '';
      if(nameInput) nameInput.value = '';
      if(sortInput) sortInput.value = '0';
      clearPreview();
      if(currentImage) currentImage.hidden = true;
      if(formTitle) formTitle.textContent = 'Create Bonus Title';
      status('', '');
    }

    function edit(key){
      var cat = categories.filter(function(c){ return String(c.id) === String(key); })[0];
      if(!cat) return;
      if(idInput) idInput.value = cat.id || '';
      if(nameInput) nameInput.value = cat.name || '';
      if(sortInput) sortInput.value = cat.sortOrder == null ? 0 : cat.sortOrder;
      clearPreview();
      var src = imageUrl(cat);
      if(src) showPreview(src); else clearPreview();
      if(currentImage) currentImage.hidden = !src;
      if(formTitle) formTitle.textContent = 'Edit Bonus Category #' + cat.id;
      status('', '');
    }

    if(imageInput && dropZone){
      imageInput.addEventListener('change', function(){
        var file = imageInput.files && imageInput.files[0];
        if(!file) return;
        if(!file.type || file.type.indexOf('image/') !== 0){
          status('Please choose image file only.', 'error');
          return;
        }
        selectedFile = file;
        showPreview(URL.createObjectURL(file));
        status('Image ready. Click Save to upload.', 'success');
      });
      ['dragenter','dragover'].forEach(function(evt){
        dropZone.addEventListener(evt, function(e){ e.preventDefault(); dropZone.classList.add('dragover'); });
      });
      ['dragleave','drop'].forEach(function(evt){
        dropZone.addEventListener(evt, function(e){ e.preventDefault(); dropZone.classList.remove('dragover'); });
      });
      dropZone.addEventListener('drop', function(e){
        var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if(!file) return;
        if(!file.type || file.type.indexOf('image/') !== 0){ status('Please choose image file only.', 'error'); return; }
        selectedFile = file;
        showPreview(URL.createObjectURL(file));
        status('Image ready. Click Save to upload.', 'success');
      });
    }

    form.addEventListener('submit', async function(e){
      e.preventDefault();
      var isUpdate = !!(idInput && idInput.value);
      if(nameInput && !nameInput.value.trim()){
        status('Please enter name.', 'error');
        nameInput.focus();
        return;
      }
      if(!isUpdate && !selectedFile){
        status('Please choose category image.', 'error');
        return;
      }
      var fd = new FormData();
      fd.append('name', nameInput ? nameInput.value.trim() : '');
      fd.append('sortOrder', (sortInput && sortInput.value) || '0');
      if(selectedFile) fd.append('image', selectedFile);

      var url = isUpdate
        ? apiUrl('BONUS_CATEGORY_TITLE_UPDATE') + '/' + encodeURIComponent(idInput.value)
        : apiUrl('BONUS_CATEGORY_TITLE_CREATE');

      if(saveBtn) saveBtn.disabled = true;
      status(isUpdate ? 'Updating category...' : 'Creating category...', '');
      try{
        var json = await req(url, { method: 'POST', body: fd });
        status(json.message || 'Category saved successfully.', 'success');
        reset();
        await load();
      }catch(err){
        status(err.message || 'Save failed. Please check API URL / CORS.', 'error');
      }finally{
        if(saveBtn) saveBtn.disabled = false;
      }
    });

    if(resetBtn) resetBtn.addEventListener('click', reset);
    reset();

    /* crud-modal-pattern.js opens the shared modal when a .edit-btn is clicked;
       this is the hook that puts the right category into the form first. */
    setupCategoryForm.edit = edit;
    setupCategoryForm.reset = reset;
  }

  /* ------------------------------------------------------------------ wiring */

  /* The category form lives in its own card (crud-modal-pattern.js lifts that card
     into the shared modal), so wire it before anything can ask to edit one. */
  setupCategoryForm();

  /* Add Bonus Category. crud-modal-pattern.js is asked to open the modal rather than
     attaching its own Add button: the pattern derives that button's label from the
     topbar ("Promotion Bonus"), which would title a category form after the page. */
  var addCategoryBtn = $('promoAddCategoryBtn');
  addCategoryBtn && addCategoryBtn.addEventListener('click', function(){
    setupCategoryForm.reset();
    if(window.CrudModalPattern) window.CrudModalPattern.open('Add Bonus Category Title');
  });

  listEl.addEventListener('click', function(e){
    var toggle = e.target.closest('[data-toggle]');
    if(toggle){ toggleCategory(toggle.getAttribute('data-toggle')); return; }

    var editBtn = e.target.closest('[data-cat-edit]');
    if(editBtn){ setupCategoryForm.edit && setupCategoryForm.edit(editBtn.getAttribute('data-cat-edit')); return; }

    var delCat = e.target.closest('[data-cat-del]');
    if(delCat){ deleteCategory(delCat.getAttribute('data-cat-del')); return; }

    var delPromo = e.target.closest('[data-promo-del]');
    if(delPromo){ deletePromotion(delPromo.getAttribute('data-promo-del')); return; }

    // The row itself is the disclosure control — the chevron is a 24px target and the
    // whole row reads as one. Links and buttons keep their own job.
    var row = e.target.closest('[data-category-row]');
    if(row && !e.target.closest('a, button')) toggleCategory(row.getAttribute('data-category-row'));
  });

  searchInput && searchInput.addEventListener('input', function(){ render(true); });
  searchInput && searchInput.addEventListener('keydown', function(e){ if(e.key === 'Enter') e.preventDefault(); });
  statusFilter && statusFilter.addEventListener('change', function(){ render(true); });
  sortFilter && sortFilter.addEventListener('change', function(){ render(true); });
  pageSizeSelect && pageSizeSelect.addEventListener('change', function(){
    lockedAutoSize = null;
    lockedBoxHeight = null;
    render(true);
  });
  pager && pager.addEventListener('click', function(e){
    var btn = e.target.closest('[data-page]');
    if(!btn || btn.disabled) return;
    page = Number(btn.getAttribute('data-page')) || 0;
    render(false);
  });

  /* Re-fit when the list's box changes under it: the module tab row on a fresh load, the
     sidebar collapsing, a window resize, the KPI strip arriving. One code path for all of
     them — the window-resize listener this replaces covered only one, and only by guessing
     at a 150ms delay. The list is a fixed-height scroll container (flex:1 1 0 with
     overflow-y:auto), so re-rendering rows cannot change its clientHeight and the observer
     cannot loop on its own output; the equality guard below is the belt to that braces.
     Kept on the element, like every other observer in the BO scripts (`_boEvenFillObs`), so
     re-running the script on the page it already owns is a no-op. */
  function refitToBox(){
    if(!isAutoPageSize(pageSizeSelect && pageSizeSelect.value)) return;
    lockedAutoSize = null;
    lockedBoxHeight = null;
    render(false);
  }

  if(window.ResizeObserver && !listEl._boAutofitObs){
    var lastBoxHeight = listEl.clientHeight;
    listEl._boAutofitObs = new ResizeObserver(function(){
      if(listEl.clientHeight === lastBoxHeight) return;
      lastBoxHeight = listEl.clientHeight;
      requestAnimationFrame(refitToBox);
    });
    listEl._boAutofitObs.observe(listEl);
  }else if(!window.ResizeObserver){
    var resizeTimer = null;
    window.addEventListener('resize', function(){
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(refitToBox, 150);
    });
  }

  load();
})();
