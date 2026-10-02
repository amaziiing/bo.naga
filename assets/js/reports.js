document.addEventListener('DOMContentLoaded', () => {
  /* bo-spa.js replays DOMContentLoaded, scoped, after every content swap. This handler binds
     straight onto SHELL rows when they exist at fire time: .nav-group-btn rows get a
     preventDefault+stopPropagation click, and .report-nav a / .nav-group rows get their own
     listeners. On a real page load the rail is still empty when this runs (the /me round
     trip has not returned), so these bindings never apply there - the rail's real behaviour
     comes from auth.js's delegated bindDynamicSidebarEvents. Replayed with the rail already
     populated, the double-bound click listener ate every later navigation: it stopped the
     event before it could reach the router's document-level handler, leaving a nav-group-
     direct rail link that did nothing when clicked. Bind once, like auth.js's own banner. */
  if (window.__boReportsShellBound) return;
  window.__boReportsShellBound = true;
  const sidebar = document.getElementById('reportSidebar');
  let overlay = document.getElementById('reportOverlay') || document.querySelector('.sidebar-overlay,.sidebar-backdrop');

  // Create overlay if an older page forgot to include it.
  if (!overlay && sidebar) {
    overlay = document.createElement('div');
    overlay.id = 'reportOverlay';
    overlay.className = 'sidebar-overlay';
    overlay.setAttribute('data-close-sidebar', '');
    sidebar.insertAdjacentElement('afterend', overlay);
  }

  const openSidebar = () => {
    if (!sidebar) return;
    sidebar.classList.add('show');
    overlay && overlay.classList.add('show');
    document.body.classList.add('sidebar-open');
  };

  const closeSidebar = () => {
    if (!sidebar) return;
    sidebar.classList.remove('show');
    overlay && overlay.classList.remove('show');
    document.body.classList.remove('sidebar-open');
  };

  document.querySelectorAll('[data-open-sidebar], .hamb').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Mobile: hamburger is a true toggle, so tapping again closes the drawer.
      if (window.innerWidth < 992 && sidebar && sidebar.classList.contains('show')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
  });

  document.querySelectorAll('[data-close-sidebar], .sidebar-overlay, .sidebar-backdrop').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      closeSidebar();
    });
  });

  document.querySelectorAll('.report-nav a').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth < 992) closeSidebar();
    });
  });

  // Sidebar group accordion: keep current section open and make every section clickable.
  document.querySelectorAll('.nav-group').forEach(group => {
    const list = group.querySelector('.nav-group-list');
    if (list && (list.classList.contains('show') || list.querySelector('.active'))) {
      group.classList.add('open');
      list.classList.add('show');
    }
  });

  const positionSidebarFlyout = (group) => {
    if (!group || window.innerWidth < 992) return;
    const btn = group.querySelector('.nav-group-btn');
    const sidebarEl = group.closest('.report-sidebar');
    const list = group.querySelector('.nav-group-list');
    if (!btn || !sidebarEl || !list) return;
    const br = btn.getBoundingClientRect();
    const sr = sidebarEl.getBoundingClientRect();
    const left = Math.max(8, Math.round(sr.right + 6));
    let top = Math.max(12, Math.round(br.top));
    group.style.setProperty('--bo-sidebar-flyout-left', left + 'px');
    group.style.setProperty('--bo-sidebar-flyout-top', top + 'px');
    requestAnimationFrame(() => {
      // Size the panel by the space BELOW its own row, and never move it up.
      // Owner report: on a short window the 11-entry Report flyout could not be
      // reached. The old code measured `scrollHeight` (about 620px) against the
      // viewport and clamped the panel's top to 12 — roughly 200px ABOVE the row it
      // belongs to (measured: row 228, panel 12). Reaching the first item was then a
      // long diagonal that crossed the sibling menu rows, and each of those fires its
      // own mouseenter, which closes this flyout — so the hover jumped and the panel
      // shut before 8.1 could be clicked. Capping to the room below keeps the panel
      // beside its row, so the pointer never leaves that row's band; the list scrolls
      // internally when the menu is longer than the space available.
                        // The cap is the SMALLER of the room below this row and 62% of the viewport.
            // Taking only the viewport fraction (a first attempt) still overflowed below the row
            // on a tall window, so the panel was pushed back up and detached again  measured on
            // the owner's screen at 975px tall with the row at 546: fraction 605 > room 417, so the
            // panel sat 188px above its row. Using the room below keeps it beside the row in every
            // geometry where the row is not near the very bottom of the viewport, and because
            // top + cap can then never exceed the viewport, no upward shift is needed at all.
            const roomBelow = window.innerHeight - top - 12;
            const cap = Math.max(160, Math.min(Math.round(window.innerHeight * 0.62), roomBelow));
            list.style.maxHeight = cap + 'px';
            list.style.overflowY = 'auto';
            // only reachable when the row sits at the very bottom (roomBelow < the 160px floor)
            let placedTop = Math.max(12, Math.round(br.top));
            if(placedTop + cap > window.innerHeight - 12) placedTop = Math.max(12, window.innerHeight - cap - 12);
            group.style.setProperty('--bo-sidebar-flyout-top', Math.round(placedTop) + 'px');
    });
  };

  const sidebarFlyoutHoverTimers = new WeakMap();
  const closeSidebarFlyoutImmediately = (group) => {
    if (!group) return;
    const timer = sidebarFlyoutHoverTimers.get(group);
    if (timer) clearTimeout(timer);
    sidebarFlyoutHoverTimers.delete(group);
    // Hide synchronously while changing menu groups so the previous flyout can
    // never remain visible for a transition frame under the new one.
    group.classList.add('bo-flyout-instant-hide');
    group.classList.remove('bo-flyout-hover', 'open');
    group.querySelector('.nav-group-list')?.classList.remove('show');
    group.querySelector('.nav-group-btn')?.setAttribute('aria-expanded', 'false');
    void group.offsetWidth;
    requestAnimationFrame(() => group.classList.remove('bo-flyout-instant-hide'));
  };
  const openSidebarFlyoutOnHover = (group) => {
    if (!group || window.innerWidth < 992) return;

    const previous = window.__boSidebarActiveFlyout;
    if (previous && previous !== group) {
    // Hover intent. A pointer travelling from its row into the flyout crosses the sibling
    // rows, and taking over on every crossing is what made the hover jump and closed the
    // flyout before its first entry could be clicked. Require the pointer to rest on the new
    // group for a moment; a fly-through never takes over, so the open flyout survives the
    // journey into its own panel.
    const intentGroup = group;
    if (group.__boFlyoutIntent) clearTimeout(group.__boFlyoutIntent);
    group.__boFlyoutIntent = setTimeout(function () {
    group.__boFlyoutIntent = null;
    if (!intentGroup.matches(':hover')) return;
    if (window.__boSidebarActiveFlyout === intentGroup) return;
    const prev = window.__boSidebarActiveFlyout;
    if (prev && prev !== intentGroup) closeSidebarFlyoutImmediately(prev);
    openSidebarFlyoutOnHover(intentGroup);
    }, 140);
    return;
    }
    document.querySelectorAll('.report-sidebar .nav-group').forEach(other => {
      if (other !== group && other !== previous && (other.classList.contains('bo-flyout-hover') || other.classList.contains('open'))) {
        closeSidebarFlyoutImmediately(other);
      }
    });

    const pending = sidebarFlyoutHoverTimers.get(group);
    if (pending) clearTimeout(pending);
    sidebarFlyoutHoverTimers.delete(group);
    window.__boSidebarActiveFlyout = group;
    positionSidebarFlyout(group);
    group.classList.remove('bo-flyout-instant-hide');
    group.classList.add('bo-flyout-hover');
  };
  const isPointerOverSidebarFlyout = (group) => {
    if (!group) return false;
    const list = group.querySelector('.nav-group-list');
    if (group.matches(':hover')) return true;
    if (list && list.matches(':hover')) return true;
    return false;
  };
  const scheduleSidebarFlyoutHoverClose = (group) => {
    if (!group || window.innerWidth < 992) return;
    const pending = sidebarFlyoutHoverTimers.get(group);
    if (pending) clearTimeout(pending);
    const timer = setTimeout(() => {
      sidebarFlyoutHoverTimers.delete(group);
      if (isPointerOverSidebarFlyout(group)) return;
      group.classList.add('bo-flyout-instant-hide');
      group.classList.remove('bo-flyout-hover');
      void group.offsetWidth;
      requestAnimationFrame(() => group.classList.remove('bo-flyout-instant-hide'));
      if (window.__boSidebarActiveFlyout === group) window.__boSidebarActiveFlyout = null;
    }, 400);
    sidebarFlyoutHoverTimers.set(group, timer);
  };

  document.querySelectorAll('.nav-group').forEach(group => {
    group.addEventListener('mouseenter', () => openSidebarFlyoutOnHover(group));
    group.addEventListener('mouseleave', () => scheduleSidebarFlyoutHoverClose(group));
    const list = group.querySelector('.nav-group-list');
    if (list) {
      list.addEventListener('mouseenter', () => openSidebarFlyoutOnHover(group));
      list.addEventListener('mouseleave', () => scheduleSidebarFlyoutHoverClose(group));
    }
  });

  document.querySelectorAll('.nav-group-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const group = btn.closest('.nav-group');
      const list = group && group.querySelector('.nav-group-list');
      if (!group || !list) return;
      if (window.innerWidth >= 992) {
        // Desktop flyouts are hover-only. Clicking the parent should not pin
        // the submenu or cause it to reappear at the top after navigation.
        positionSidebarFlyout(group);
        group.classList.remove('open');
        list.classList.remove('show');
        btn.setAttribute('aria-expanded', 'false');
        return;
      }
      // Mobile/tablet retains the accordion click interaction.
      const willOpen = !group.classList.contains('open');
      group.classList.toggle('open', willOpen);
      list.classList.toggle('show', willOpen);
      btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
  });

  // Profile dropdown: support both custom profile menu and Bootstrap-like dropdown markup.
  const closeProfiles = () => {
    document.querySelectorAll('.report-profile-menu.show, .dropdown-menu.show').forEach(menu => menu.classList.remove('show'));
  };

  document.querySelectorAll('[data-profile-toggle], .profile-mini, .report-profile-btn, .dropdown-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      let menu = null;
      const wrap = btn.closest('.report-profile-wrap,.dropdown');
      if (wrap) menu = wrap.querySelector('.report-profile-menu,.dropdown-menu');
      if (!menu) return;
      const shouldOpen = !menu.classList.contains('show');
      closeProfiles();
      menu.classList.toggle('show', shouldOpen);
    });
  });

  document.addEventListener('click', closeProfiles);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSidebar();
      closeProfiles();
      document.querySelectorAll('.modal-clean.show').forEach(m => m.classList.remove('show'));
    }
  });

  // Segment buttons active state.
  document.querySelectorAll('.seg button').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.parentElement?.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Keep every CRUD modal closed on initial page load. Some pages have multiple
  // modal containers in the HTML, and the shared overlay CSS must not let them
  // participate in layout until a user explicitly opens one.
  document.querySelectorAll('.modal-clean').forEach(modal => {
    if (!modal.classList.contains('show')) {
      modal.setAttribute('aria-hidden', 'true');
    }
  });

  const syncModalBodyState = () => {
    document.body.classList.toggle('modal-open', !!document.querySelector('.modal-clean.show'));
  };

  // Shared modal open/close for pages with modal actions.
  document.querySelectorAll('[data-open-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(btn.dataset.openModal);
      if (target) { document.querySelectorAll('.modal-clean.show').forEach(m => { if (m !== target) { m.classList.remove('show'); m.setAttribute('aria-hidden','true'); } }); target.classList.add('show'); target.setAttribute('aria-hidden','false'); syncModalBodyState(); }
    });
  });
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = btn.closest('.modal-clean'); if (modal) { modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); syncModalBodyState(); }
    });
  });
  document.querySelectorAll('.modal-clean').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) { modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); syncModalBodyState(); }
    });
  });
});


(function(){
  function closeAllProfileMenus(except){
    document.querySelectorAll('.dropdown-menu.show, .report-profile-menu.show').forEach(function(menu){
      if(menu !== except){
        menu.classList.remove('show');
        var wrap = menu.closest('.dropdown,.report-profile-wrap');
        if(wrap) wrap.classList.remove('open');
      }
    });
  }
  function findProfileButton(target){
    return target && target.closest && target.closest('[data-profile-toggle], .profile-mini, .report-profile-btn');
  }
  function handleProfileClick(e){
    var btn = findProfileButton(e.target);
    if(!btn) return;
    var wrap = btn.closest('.dropdown,.report-profile-wrap');
    var menu = wrap && wrap.querySelector('.dropdown-menu,.report-profile-menu');
    if(!menu) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    var willOpen = !menu.classList.contains('show');
    closeAllProfileMenus(menu);
    menu.classList.toggle('show', willOpen);
    wrap.classList.toggle('open', willOpen);
    btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  }
  document.addEventListener('click', handleProfileClick, true);
  document.addEventListener('touchstart', handleProfileClick, {capture:true, passive:false});
  document.addEventListener('click', function(e){
    if(e.target.closest && e.target.closest('.dropdown,.report-profile-wrap,.dropdown-menu,.report-profile-menu')) return;
    closeAllProfileMenus();
  });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeAllProfileMenus(); });
})();

// Desktop mini sidebar: click hamburger to collapse/restore, hover rail to slide out.
(function(){
  function isDesktop(){ return window.matchMedia('(min-width: 992px)').matches; }
  /* The lock is a body class, so it used to die on every navigation: collapse the sidebar,
     click a submenu link, and the page you land on comes back with a full-width sidebar.
     Persist it so 'locked' survives the click-through. */
  var MINI_KEY = 'bo_sidebar_mini';
  function readMiniPref(){ try { return localStorage.getItem(MINI_KEY) === '1'; } catch(e){ return false; } }
  function writeMiniPref(on){ try { localStorage.setItem(MINI_KEY, on ? '1' : '0'); } catch(e){} }
  if(document.body && readMiniPref() && isDesktop()) document.body.classList.add('sidebar-mini');
  function clearMiniHoverArtifacts(){
    var sidebar = document.getElementById('reportSidebar');
    if(window.BO_SIDEBAR && typeof window.BO_SIDEBAR.closeAllFlyouts === 'function'){
      window.BO_SIDEBAR.closeAllFlyouts();
    }
    if(!sidebar) return;
    // Force :hover to drop so mini width cannot stick after expand/collapse.
    sidebar.style.pointerEvents = 'none';
    sidebar.classList.remove('is-mini-hover');
    document.querySelectorAll('.report-sidebar .nav-group').forEach(function(group){
      group.classList.remove('bo-flyout-hover', 'bo-flyout-instant-hide');
    });
    if(window.__boSidebarActiveFlyout) window.__boSidebarActiveFlyout = null;
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        sidebar.style.pointerEvents = '';
      });
    });
  }
  document.addEventListener('click', function(e){
    var btn = e.target.closest && e.target.closest('[data-open-sidebar], .hamb');
    if(!btn || !isDesktop()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    document.body.classList.toggle('sidebar-mini');
    writeMiniPref(document.body.classList.contains('sidebar-mini'));
    var sidebar = document.getElementById('reportSidebar');
    var overlay = document.getElementById('reportOverlay');
    if(sidebar) sidebar.classList.remove('show');
    if(overlay) overlay.classList.remove('show');
    document.body.classList.remove('sidebar-open');
    clearMiniHoverArtifacts();
  }, true);

  document.addEventListener('DOMContentLoaded', function(){
    var sidebar = document.getElementById('reportSidebar');
    if(!sidebar) return;
    // SPA replay re-dispatches DOMContentLoaded; these are permanent DOM listeners, so bind once.
    if(sidebar.dataset.boMiniHoverBound==='1') return;
    sidebar.dataset.boMiniHoverBound='1';
    sidebar.addEventListener('mouseenter', function(){
      if(!isDesktop() || !document.body.classList.contains('sidebar-mini')) return;
      sidebar.classList.add('is-mini-hover');
    });
    sidebar.addEventListener('mouseleave', function(e){
      sidebar.classList.remove('is-mini-hover');
      var next = e.relatedTarget;
      if(next && sidebar.contains(next)) return;

      var active = window.__boSidebarActiveFlyout;
      if(!active) return;
      if(next && active.contains(next)) return;

      var list = active.querySelector('.nav-group-list');
      var towardFlyout = false;
      if(list && typeof e.clientX === 'number'){
        var r = list.getBoundingClientRect();
        // Only grace-close when the pointer is crossing the sidebar→flyout bridge.
        towardFlyout =
          e.clientX >= (r.left - 36) &&
          e.clientX <= (r.right + 8) &&
          e.clientY >= (r.top - 12) &&
          e.clientY <= (r.bottom + 12);
      }

      if(towardFlyout){
        setTimeout(function(){
          if(!window.__boSidebarActiveFlyout) return;
          var group = window.__boSidebarActiveFlyout;
          if(group.matches(':hover')) return;
          var panel = group.querySelector('.nav-group-list');
          if(panel && panel.matches(':hover')) return;
          if(window.BO_SIDEBAR && typeof window.BO_SIDEBAR.closeAllFlyouts === 'function'){
            window.BO_SIDEBAR.closeAllFlyouts();
          }
        }, 80);
        return;
      }

      // Leaving to page content — close immediately so no icon-only ghost panel lingers.
      if(window.BO_SIDEBAR && typeof window.BO_SIDEBAR.closeAllFlyouts === 'function'){
        window.BO_SIDEBAR.closeAllFlyouts();
      }
    });
  });

  window.addEventListener('resize', function(){
    if(!isDesktop()){
      document.body.classList.remove('sidebar-mini');
      clearMiniHoverArtifacts();
    }else if(readMiniPref()){
      document.body.classList.add('sidebar-mini');
    }
  });
})();

// Global table action icon normalizer.
(function(){
  const actionMap = {
    'view': ['bi-eye','is-view'],
    'edit': ['bi-pencil','is-edit'],
    'delete': ['bi-trash','is-delete'],
    'remove': ['bi-trash','is-delete'],
    'ledger': ['bi-journal-text','is-ledger'],
    'adjust': ['bi-sliders','is-adjust'],
    'approve': ['bi-check-lg','is-approve'],
    'reject': ['bi-x-lg','is-reject'],
    'lock': ['bi-lock','is-edit'],
    'unlock': ['bi-unlock','is-approve']
  };
  function normalize(root){
    (root || document).querySelectorAll('.report-table tbody td:last-child a, .report-table tbody td:last-child button').forEach(function(btn){
      if(btn.classList.contains('bo-icon-action')) return;
      const raw=(btn.textContent || '').trim().replace(/\s+/g,' ').toLowerCase();
      const key=Object.keys(actionMap).find(function(k){ return raw === k || raw.startsWith(k+' '); });
      if(!key) return;
      const cfg=actionMap[key];
      btn.classList.add('bo-icon-action',cfg[1]);
      btn.setAttribute('title',key.charAt(0).toUpperCase()+key.slice(1));
      btn.setAttribute('aria-label',key.charAt(0).toUpperCase()+key.slice(1));
      btn.innerHTML='<i class="bi '+cfg[0]+'" aria-hidden="true"></i>';
    });
  }
  function boot(){
    // SPA replay re-dispatches DOMContentLoaded (and the else branch boots directly); the observer below is cumulative, so guard here.
    if(window.__boIconNormalizerBooted) return; window.__boIconNormalizerBooted=1;
    normalize(document);
    new MutationObserver(function(mutations){
      mutations.forEach(function(m){ m.addedNodes.forEach(function(n){ if(n.nodeType===1) normalize(n); }); });
    }).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();

// Unified summary-card icons and secondary descriptions.
(function(){
  const iconRules=[
    [/user|member|admin|account/i,'bi-people'],[/active|online/i,'bi-person-check'],[/deposit|wallet|balance|credit/i,'bi-wallet2'],
    [/downline|referral|network/i,'bi-diagram-3'],[/commission|win|bet|profit|loss/i,'bi-graph-up-arrow'],[/disabled|locked/i,'bi-lock'],
    [/month|today|login|new/i,'bi-clock-history'],[/provider/i,'bi-hdd-network'],[/withdraw|transfer/i,'bi-arrow-left-right']
  ];
  function decorate(card,index){
    if(card.querySelector('.bo-summary-icon')) return;
    const text=(card.textContent||'').trim();
    const match=iconRules.find(r=>r[0].test(text));
    const icon=(match&&match[1])||['bi-people','bi-person-check','bi-wallet2','bi-clock-history'][index%4];
    const node=document.createElement('div');node.className='bo-summary-icon';node.innerHTML='<i class="bi '+icon+'"></i>';card.prepend(node);
    const spans=card.querySelectorAll(':scope > span');
    if(!card.querySelector('.bo-summary-note')){
      const note=document.createElement('div');note.className='bo-summary-note';
      const label=spans[0] ? spans[0].textContent.trim() : '';
      note.textContent=/wallet|balance/i.test(label)?'Current total':/active|online/i.test(label)?'Currently active':/deposit/i.test(label)?'All time deposits':/bet/i.test(label)?'All time bets':/commission/i.test(label)?'All time earned':'Overview total';
      card.appendChild(note);
    }
  }
  function run(root){
    (root||document).querySelectorAll('.quick-stats:not(.user-stats) .metric,.manage-summary .manage-card').forEach(decorate);
  }
  function boot(){if(window.__boSummaryDecorateBooted)return;window.__boSummaryDecorateBooted=1;run(document);new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)run(n)}))).observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

/* Unified rounded native-select replacement.
   Keeps the visible rounded dropdown synchronized with the real <select>
   after edit population, async option loading, direct .value assignment,
   and form.reset(). */
(function(){
  const pending=new WeakSet();

  function escapeHtml(v){
    return String(v==null?'':v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  function selectedLabel(select){
    const option=select && select.options ? select.options[select.selectedIndex] : null;
    return option ? String(option.textContent||'').trim() : 'Select';
  }

  function findParts(select){
    const wrap=select && select.closest ? select.closest('.rounded-select-wrap') : null;
    if(!wrap) return {};
    /* Direct children only. Descendant querySelector can latch onto a nested
       menu/button after a later innerHTML rebuild and wipe the wrong node. */
    return {
      wrap,
      button: wrap.querySelector(':scope > .rounded-select-btn'),
      menu: wrap.querySelector(':scope > .rounded-select-menu')
    };
  }

  function measureLabelWidth(text, reference){
    const canvas=measureLabelWidth._c||(measureLabelWidth._c=document.createElement('canvas'));
    const ctx=canvas.getContext('2d');
    if(!ctx) return String(text||'').length*7;
    const cs=getComputedStyle(reference||document.body);
    ctx.font=[cs.fontStyle,cs.fontVariant,cs.fontWeight,cs.fontSize,cs.fontFamily].filter(Boolean).join(' ');
    return Math.ceil(ctx.measureText(String(text||'').trim()).width);
  }

  function isCompactAutoWidthWrap(wrap){
    if(!wrap) return false;
    if(wrap.dataset.boAutoWidth==='0') return false;
    const nested=wrap.querySelector(':scope > select');
    if(nested && nested.dataset.boAutoWidth==='0') return false;
    if(wrap.dataset.boAutoWidth==='1') return true;
    return !!wrap.closest('.mad-filters,.mac-filters,.mp-role-row,.bo-filter-row,.mpv-filters,.entries-control,.mac-toolbar,.mad-chrome-actions');
  }

  function sizeRoundedSelectToContent(select){
    const parts=findParts(select);
    if(!parts.wrap || !parts.button || !parts.menu) return;
    const labels=[];
    Array.from(select.options||[]).forEach(function(o){
      const text=String(o.textContent||o.label||'').trim();
      if(!text) return;
      labels.push(text);
    });
    if(!labels.length) return;
    /* Deferred on purpose. Measuring is one getComputedStyle + one canvas measureText per
       option, and that getComputedStyle forces a synchronous style recalc of whatever the
       page has just mutated. Only the auto-width branch below reads the number; the form
       branch sizes from the button's own box and would throw it away. Measured on
       promotion-edit.html before this: 898 forced reads and ~1.2s of UpdateLayoutTree per
       entry, because all 26 of that page's selects took the form branch. */
    let widest=null;
    const widestLabel=function(){
      if(widest===null){
        widest=Math.max.apply(null, labels.map(function(label){
          return measureLabelWidth(label, parts.button);
        }));
      }
      return widest;
    };
    const inFilterRow=!!parts.wrap.closest('.bo-filter-row');
    const inEntriesControl=!!parts.wrap.closest('.entries-control,.bo-pagination-standard');
    /* Filter rows / pagination entries: size the FIELD, keep wrap at 100% so
       Status/Page Size and "Show N entries" never overflow neighbors
       (was Math.max(160) wrap inside an 80–112px cell). */
    /* Transaction listing MD — Status locked at 150px (Wallet Ledger Type specimen) */
    const listingFixed={depositStatus:150,withdrawStatus:150,dbgStatus:150};
    const contentWidthNow=function(){
      let width=(inFilterRow || inEntriesControl)
        ? Math.max(inEntriesControl ? 72 : 80, widestLabel()+(inEntriesControl ? 44 : 54))
        : Math.max(160, widestLabel()+72);
      if(document.body.classList.contains('bo-wallet-tx') && listingFixed[select.id]!=null){
        width=listingFixed[select.id];
      }
      return width;
    };
    /* Promotion Bonus listing — keep filter strip even; CSS owns field widths */
    if(parts.wrap.closest('.promotion-filter-card') || select.dataset.boAutoWidth==='0'){
      const item=parts.wrap.closest('.bo-filter-select-item,.field');
      if(item){
        item.style.removeProperty('--bo-select-width');
        item.style.removeProperty('width');
        item.style.removeProperty('min-width');
        item.style.removeProperty('max-width');
        item.style.removeProperty('flex');
      }
      parts.wrap.style.setProperty('width','100%','important');
      parts.wrap.style.setProperty('min-width','0','important');
      parts.wrap.style.setProperty('max-width','100%','important');
      parts.wrap.style.removeProperty('flex');
      parts.button.style.setProperty('width','100%','important');
      parts.button.style.setProperty('min-width','0','important');
      const boxWidth=Math.ceil((parts.button.getBoundingClientRect().width||parts.wrap.getBoundingClientRect().width||0));
      if(boxWidth>0){
        parts.menu.style.setProperty('width', boxWidth+'px','important');
        parts.menu.style.setProperty('min-width', boxWidth+'px','important');
        parts.menu.style.setProperty('max-width','none','important');
      }
      return;
    }
    /* Promotion Log mobile: let CSS stack Status full-width */
    if(document.body.classList.contains('promotion-log-page') && select.id==='dbgStatus' && window.matchMedia('(max-width:768px)').matches){
      const item=parts.wrap.closest('.bo-filter-select-item,.field');
      if(item){
        item.style.setProperty('--bo-select-width','100%');
        item.style.removeProperty('width');
        item.style.removeProperty('min-width');
        item.style.removeProperty('max-width');
        item.style.removeProperty('flex');
      }
      parts.wrap.style.setProperty('width','100%','important');
      parts.wrap.style.setProperty('min-width','0','important');
      parts.wrap.style.setProperty('max-width','100%','important');
      parts.wrap.style.removeProperty('flex');
      parts.button.style.setProperty('width','100%','important');
      parts.button.style.setProperty('min-width','0','important');
      return;
    }

    if(isCompactAutoWidthWrap(parts.wrap)){
      /* The only branch that reads a text-metric width — measure here, not for every form field. */
      let contentWidth=contentWidthNow();
      if(inFilterRow || inEntriesControl){
        /* Never size a container that holds more than the select — that
           collapses its other children into the select's width. `.bo-filter-row`
           was excluded for this (it clipped the keyword field, VIP Reward Log);
           `.entries-control` is the same case and was NOT excluded, so the
           footer's `Show <select> entries` had its container pinned to the
           select's 72px while it also holds those two words: the control
           measured clientWidth 72 against scrollWidth 161 and "entries" painted
           under the select's arrow. The wrap is sized instead, just below. */
        const item=parts.wrap.closest('.bo-filter-select-item,.field') || parts.wrap;
        if(item && !item.classList.contains('bo-filter-row') && (item.classList.contains('bo-filter-select-item') || item.classList.contains('field') || item===parts.wrap)){
          item.style.setProperty('--bo-select-width', contentWidth+'px');
          item.style.setProperty('width', contentWidth+'px', 'important');
          item.style.setProperty('min-width', contentWidth+'px', 'important');
          item.style.setProperty('max-width', contentWidth+'px', 'important');
          item.style.setProperty('flex', '0 0 '+contentWidth+'px', 'important');
        }
        if(inEntriesControl){
          const row=parts.wrap.closest('.entries-control');
          if(row){
            row.style.removeProperty('width');
            row.style.removeProperty('min-width');
            row.style.removeProperty('max-width');
            row.style.removeProperty('flex');
            row.style.removeProperty('--bo-select-width');
          }
          /* MD Footer Show N — lock 72×36 Role select chrome */
          contentWidth=Math.max(72, contentWidth);
        }
        parts.wrap.style.setProperty('width', inEntriesControl ? contentWidth+'px' : '100%', 'important');
        parts.wrap.style.setProperty('min-width', inEntriesControl ? contentWidth+'px' : '0', 'important');
        parts.wrap.style.setProperty('max-width', inEntriesControl ? contentWidth+'px' : '100%', 'important');
        if(inEntriesControl){
          parts.wrap.style.setProperty('flex', '0 0 '+contentWidth+'px', 'important');
          parts.wrap.style.setProperty('height', '36px', 'important');
        }else{
          parts.wrap.style.removeProperty('flex');
        }
        parts.button.style.setProperty('width', '100%', 'important');
        parts.button.style.setProperty('min-width', '0', 'important');
        parts.menu.style.setProperty('width', '100%', 'important');
        parts.menu.style.setProperty('min-width', contentWidth+'px', 'important');
        parts.menu.style.setProperty('max-width', 'none', 'important');
      }else{
        parts.wrap.style.setProperty('width', contentWidth+'px','important');
        parts.wrap.style.setProperty('min-width', contentWidth+'px','important');
        parts.wrap.style.setProperty('max-width', contentWidth+'px','important');
        parts.wrap.style.setProperty('flex','0 0 '+contentWidth+'px','important');
        parts.button.style.setProperty('width', '100%','important');
        parts.button.style.setProperty('min-width', contentWidth+'px','important');
        parts.menu.style.setProperty('width', contentWidth+'px','important');
        parts.menu.style.setProperty('min-width', contentWidth+'px','important');
        parts.menu.style.setProperty('max-width', contentWidth+'px','important');
      }
    }else{
      // Form fields: menu must match the visible trigger width (not max-content).
      const boxWidth=Math.ceil((parts.button.getBoundingClientRect().width||parts.wrap.getBoundingClientRect().width||0));
      if(boxWidth<=0) return;
      const menuWidth=Math.max(boxWidth, 1);
      parts.menu.style.setProperty('width', menuWidth+'px','important');
      parts.menu.style.setProperty('min-width', menuWidth+'px','important');
      parts.menu.style.setProperty('max-width', menuWidth+'px','important');
    }
    parts.menu.style.setProperty('right','auto','important');
    parts.menu.style.setProperty('left','0','important');
    parts.menu.querySelectorAll('.rounded-select-option').forEach(function(item){
      item.style.setProperty('white-space','nowrap','important');
      item.style.setProperty('overflow','visible','important');
      item.style.setProperty('text-overflow','clip','important');
    });
  }

  function renderExisting(select){
    if(!select) return;
    const parts=findParts(select);
    if(!parts.wrap || !parts.button || !parts.menu) return;

    parts.button.disabled=!!select.disabled;
    parts.button.setAttribute('aria-disabled',select.disabled?'true':'false');
    /* Rewriting identical markup is a DOM mutation with no visible effect, and the
       getComputedStyle further down then pays a forced style recalc for it. Measured on
       promotion-edit.html: each select was rewritten 16 times on one entry while only its
       first render actually changed the label. */
    const buttonHtml='<span>'+escapeHtml(selectedLabel(select))+'</span><i class="bi bi-chevron-down"></i>';
    if(parts.button.innerHTML!==buttonHtml) parts.button.innerHTML=buttonHtml;
    const options=Array.from(select.options||[]);
    const currentItems=Array.from(parts.menu.querySelectorAll('.rounded-select-option'));

    // Rebuild only when the option collection changed. This preserves page-specific handlers.
    const needsRebuild=currentItems.length!==options.length ||
      currentItems.some((item,index)=>String(item.dataset.value??'')!==String(options[index]?.value??'') ||
        item.textContent!==String(options[index]?.textContent??''));

    if(needsRebuild){
      parts.menu.innerHTML='';
      options.forEach(function(opt){
        const item=document.createElement('button');
        item.type='button';
        item.className='rounded-select-option';
        item.dataset.value=String(opt.value??'');
        item.textContent=opt.textContent;
        item.disabled=opt.disabled;
        item.addEventListener('click',function(){
          select.value=opt.value;
          select.dispatchEvent(new Event('input',{bubbles:true}));
          select.dispatchEvent(new Event('change',{bubbles:true}));
          parts.menu.classList.remove('show');
          parts.button.classList.remove('open');
          queueSync(select);
        });
        parts.menu.appendChild(item);
      });
    }

    Array.from(parts.menu.querySelectorAll('.rounded-select-option')).forEach(function(item,index){
      const opt=options[index];
      item.classList.toggle('active',!!opt && opt.selected);
      item.disabled=!!opt && opt.disabled;
    });
    sizeRoundedSelectToContent(select);
  }

  function queueSync(select){
    if(!select || pending.has(select)) return;
    pending.add(select);
    queueMicrotask(function(){
      pending.delete(select);
      renderExisting(select);
    });
    requestAnimationFrame(function(){ renderExisting(select); });
  }

  function enhanceSelect(select){
    if(!select || select.dataset.noRounded==='1' || select.multiple || select.size>1) return;
    if(select.hidden || select.getAttribute('aria-hidden')==='true' || select.type==='hidden') return;

    if(select.closest('.rounded-select-wrap')){
      select.dataset.roundedReady='1';
      queueSync(select);
      return;
    }
    if(select.dataset.roundedReady==='1') return;
    if(select.disabled && !select.options.length) return;

    select.dataset.roundedReady='1';
    const wrap=document.createElement('div');
    wrap.className='rounded-select-wrap';
    if(select.dataset.boAutoWidth) wrap.dataset.boAutoWidth=select.dataset.boAutoWidth;
    select.parentNode.insertBefore(wrap,select);
    wrap.appendChild(select);

    const btn=document.createElement('button');
    btn.type='button';
    btn.className='rounded-select-btn';
    const menu=document.createElement('div');
    menu.className='rounded-select-menu';
    wrap.appendChild(btn);
    wrap.appendChild(menu);

    function close(){
      menu.classList.remove('show');
      btn.classList.remove('open');
    }

    btn.addEventListener('click',function(e){
      e.stopPropagation();
      /* Open whenever options exist — even a single empty placeholder
         (e.g. VIP Level before list loads / No levels configured).
         Skipping empty-value-only selects made those menus look dead. */
      if(select.disabled || !(select.options&&select.options.length)) return;
      const open=!menu.classList.contains('show');
      document.querySelectorAll('.rounded-select-menu.show').forEach(m=>m.classList.remove('show'));
      document.querySelectorAll('.rounded-select-btn.open').forEach(b=>b.classList.remove('open'));
      if(open){
        sizeRoundedSelectToContent(select);
        menu.classList.add('show');
        btn.classList.add('open');
      }
    });

    select.addEventListener('input',function(){ queueSync(select); });
    select.addEventListener('change',function(){ queueSync(select); });
    select.addEventListener('bo:select-sync',function(){ queueSync(select); });

    new MutationObserver(function(){ queueSync(select); })
      .observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:['selected','disabled','label','value']});

    queueSync(select);
  }

  function syncScope(scope){
    const root=scope && scope.querySelectorAll ? scope : document;
    if(root.matches && root.matches('select')) enhanceSelect(root);
    root.querySelectorAll('select').forEach(function(select){
      enhanceSelect(select);
      queueSync(select);
    });
  }

  // Direct element.value assignments do not emit change/input events.
  // Patch only the visual synchronization; business change handlers remain untouched.
  try{
    const descriptor=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');
    if(descriptor && descriptor.get && descriptor.set && !HTMLSelectElement.prototype.__boRoundedValuePatched){
      Object.defineProperty(HTMLSelectElement.prototype,'value',{
        configurable:descriptor.configurable,
        enumerable:descriptor.enumerable,
        get:descriptor.get,
        set:function(value){
          descriptor.set.call(this,value);
          queueSync(this);
        }
      });
      Object.defineProperty(HTMLSelectElement.prototype,'__boRoundedValuePatched',{value:true});
    }
  }catch(_){}

  try{
    const descriptor=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'selectedIndex');
    if(descriptor && descriptor.get && descriptor.set && !HTMLSelectElement.prototype.__boRoundedIndexPatched){
      Object.defineProperty(HTMLSelectElement.prototype,'selectedIndex',{
        configurable:descriptor.configurable,
        enumerable:descriptor.enumerable,
        get:descriptor.get,
        set:function(value){
          descriptor.set.call(this,value);
          queueSync(this);
        }
      });
      Object.defineProperty(HTMLSelectElement.prototype,'__boRoundedIndexPatched',{value:true});
    }
  }catch(_){}

  try{
    const descriptor=Object.getOwnPropertyDescriptor(HTMLOptionElement.prototype,'selected');
    if(descriptor && descriptor.get && descriptor.set && !HTMLOptionElement.prototype.__boRoundedSelectedPatched){
      Object.defineProperty(HTMLOptionElement.prototype,'selected',{
        configurable:descriptor.configurable,
        enumerable:descriptor.enumerable,
        get:descriptor.get,
        set:function(value){
          descriptor.set.call(this,value);
          const select=this.closest && this.closest('select');
          if(select) queueSync(select);
        }
      });
      Object.defineProperty(HTMLOptionElement.prototype,'__boRoundedSelectedPatched',{value:true});
    }
  }catch(_){}

  // form.reset() updates the native controls after the reset event dispatches.
  // Refresh twice so both the immediate state and the browser's final reset state are reflected.
  document.addEventListener('reset',function(event){
    const form=event.target;
    setTimeout(function(){ syncScope(form); },0);
    requestAnimationFrame(function(){ syncScope(form); });
  },true);

  document.addEventListener('change',function(event){
    if(event.target && event.target.matches && event.target.matches('select')) queueSync(event.target);
  },true);

  document.addEventListener('input',function(event){
    if(event.target && event.target.matches && event.target.matches('select')) queueSync(event.target);
  },true);

  document.addEventListener('click',function(e){
    if(!e.target.closest('.rounded-select-wrap')){
      document.querySelectorAll('.rounded-select-menu.show').forEach(m=>m.classList.remove('show'));
      document.querySelectorAll('.rounded-select-btn.open').forEach(b=>b.classList.remove('open'));
    }
  });

  function boot(){
    // SPA replay re-dispatches DOMContentLoaded; the observer below is cumulative, so guard inside boot (it also runs via setTimeout).
    if(window.__boSelectSyncBooted) return; window.__boSelectSyncBooted=1;
    syncScope(document);
    new MutationObserver(function(records){
      records.forEach(function(record){
        record.addedNodes.forEach(function(node){
          if(node.nodeType===1) syncScope(node);
        });
      });
    }).observe(document.documentElement,{childList:true,subtree:true});
  }

  window.BOSelectSync={
    one:function(select){ enhanceSelect(select); queueSync(select); },
    scope:syncScope,
    all:function(){ syncScope(document); }
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){ setTimeout(boot,20); });
  }else{
    setTimeout(boot,20);
  }
})();

/* Global standardized alert modal: replaces browser alert() across the BO. */
(function(){
  let modal, titleEl, messageEl, iconEl, okButton;
  function classify(text){
    const value=String(text||'').toLowerCase();
    if(/delete|deleted|remove|removed|trash/.test(value)) return {type:'delete',title:'Deleted',icon:'bi-trash3'};
    if(/fail|failed|error|invalid|missing|not available|unable|denied/.test(value)) return {type:'error',title:'Error',icon:'bi-exclamation-triangle'};
    if(/success|saved|updated|done|completed|approved|rejected|sent|created/.test(value)) return {type:'success',title:'Success',icon:'bi-check-circle'};
    if(/warning|please|select|choose|required/.test(value)) return {type:'warning',title:'Attention',icon:'bi-exclamation-circle'};
    return {type:'info',title:'Notification',icon:'bi-info-circle'};
  }
  function ensure(){
    if(modal) return;
    modal=document.createElement('div');
    modal.className='bo-alert-modal';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML='<div class="bo-alert-backdrop"></div><div class="bo-alert-dialog" role="alertdialog" aria-modal="true" aria-labelledby="boAlertTitle"><div class="bo-alert-head"><div class="bo-alert-icon"><i class="bi bi-info-circle"></i></div><div class="bo-alert-copy"><h3 id="boAlertTitle">Notification</h3><div class="bo-alert-message"></div></div></div><div class="bo-alert-actions"><button type="button" class="bo-alert-ok">OK</button></div></div>';
    document.body.appendChild(modal);
    titleEl=modal.querySelector('#boAlertTitle'); messageEl=modal.querySelector('.bo-alert-message'); iconEl=modal.querySelector('.bo-alert-icon i'); okButton=modal.querySelector('.bo-alert-ok');
    const close=()=>{modal.classList.remove('show');modal.setAttribute('aria-hidden','true');};
    okButton.addEventListener('click',close);
    modal.querySelector('.bo-alert-backdrop').addEventListener('click',close);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('show'))close();});
  }
  window.alert=function(text){
    ensure(); const c=classify(text); modal.dataset.type=c.type; titleEl.textContent=c.title; iconEl.className='bi '+c.icon; messageEl.textContent=String(text??''); modal.classList.add('show'); modal.setAttribute('aria-hidden','false'); setTimeout(()=>okButton.focus(),0);
  };
  /* SPA: the notice is a body-level container; a frame swap must not leave it over the page
     that arrives. */
  document.addEventListener('bo:spa:before', function(){ if(modal){ modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); } });
})();


/* Global standardized confirmation and input dialogs. */
(function(){
  let modal, titleEl, messageEl, iconEl, warningEl, inputWrap, inputEl, okBtn, cancelBtn, resolver;
  function ensure(){
    if(modal) return;
    modal=document.createElement('div');
    modal.className='bo-dialog-modal';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML='<div class="bo-dialog-backdrop"></div><div class="bo-dialog-box" role="dialog" aria-modal="true" aria-labelledby="boDialogTitle"><button type="button" class="bo-dialog-close" aria-label="Close"><i class="bi bi-x-lg"></i></button><div class="bo-dialog-head"><div class="bo-dialog-icon"><i class="bi bi-question-circle"></i></div><div class="bo-dialog-copy"><h3 id="boDialogTitle">Confirm Action</h3><div class="bo-dialog-message"></div></div></div><div class="bo-dialog-warning"><i class="bi bi-exclamation-triangle"></i><span>This action cannot be undone.</span></div><label class="bo-dialog-input-wrap"><span class="bo-dialog-input-label">Admin remark</span><input type="text" class="bo-dialog-input" autocomplete="off"></label><div class="bo-dialog-actions"><button type="button" class="bo-dialog-cancel">Cancel</button><button type="button" class="bo-dialog-ok">Confirm</button></div></div>';
    document.body.appendChild(modal);
    titleEl=modal.querySelector('#boDialogTitle'); messageEl=modal.querySelector('.bo-dialog-message'); iconEl=modal.querySelector('.bo-dialog-icon i'); warningEl=modal.querySelector('.bo-dialog-warning'); inputWrap=modal.querySelector('.bo-dialog-input-wrap'); inputEl=modal.querySelector('.bo-dialog-input'); okBtn=modal.querySelector('.bo-dialog-ok'); cancelBtn=modal.querySelector('.bo-dialog-cancel');
    function finish(value){ modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); const r=resolver; resolver=null; if(r) r(value); }
    okBtn.addEventListener('click',()=>finish(inputWrap.classList.contains('show')?inputEl.value:true));
    cancelBtn.addEventListener('click',()=>finish(inputWrap.classList.contains('show')?null:false));
    modal.querySelector('.bo-dialog-close').addEventListener('click',()=>finish(inputWrap.classList.contains('show')?null:false));
    modal.querySelector('.bo-dialog-backdrop').addEventListener('click',()=>finish(inputWrap.classList.contains('show')?null:false));
    inputEl.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();okBtn.click();}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('show')){e.preventDefault();cancelBtn.click();}});
  }
  function inferType(o){
    const value=((o.title||'')+' '+(o.message||'')+' '+(o.confirmText||'')).toLowerCase();
    if(/delete|remove|trash/.test(value)) return 'delete';
    if(/reject|forfeit|reset|disable|recall/.test(value)) return 'warning';
    if(o.input) return 'input';
    if(/sync|approve|confirm|continue|save|update|add/.test(value)) return 'confirm';
    return 'confirm';
  }
  function iconFor(type){return {delete:'bi-trash3',warning:'bi-exclamation-triangle',input:'bi-pencil-square',confirm:'bi-question-circle'}[type]||'bi-question-circle';}
  function open(options){
    ensure(); const o=options||{}; const type=o.type||inferType(o); modal.dataset.type=type;
    titleEl.textContent=o.title||'Confirm Action'; messageEl.textContent=String(o.message||''); iconEl.className='bi '+(o.icon||iconFor(type));
    okBtn.textContent=o.confirmText||'Confirm'; cancelBtn.textContent=o.cancelText||'Cancel';
    warningEl.classList.toggle('show',type==='delete'); warningEl.querySelector('span').textContent=o.warningText||'This action cannot be undone.';
    inputWrap.classList.toggle('show',!!o.input);
    if(o.input){ inputWrap.querySelector('.bo-dialog-input-label').textContent=o.inputLabel||'Remark'; inputEl.value=o.defaultValue||''; inputEl.placeholder=o.placeholder||''; }
    modal.classList.add('show'); modal.setAttribute('aria-hidden','false');
    return new Promise(resolve=>{resolver=resolve;setTimeout(()=>o.input?inputEl.focus():okBtn.focus(),0);});
  }
  window.BO_DIALOG={
    alert(message,options){ window.alert(message); return Promise.resolve(true); },
    confirm(message,options){return open(Object.assign({message:message,input:false},options||{}));},
    prompt(message,defaultValue,options){return open(Object.assign({message:message,input:true,defaultValue:defaultValue||''},options||{}));}
  };
  /* SPA: an unanswered confirm/prompt at swap time resolves as a cancel - its asker's page is
     gone, and leaving it open kept the pending promise (and the old page's continuation) alive
     over the new content. */
  document.addEventListener('bo:spa:before', function(){
    if(!modal || !modal.classList.contains('show')) return;
    modal.classList.remove('show'); modal.setAttribute('aria-hidden','true');
    var r=resolver; resolver=null; if(r) r(inputWrap && inputWrap.classList.contains('show')?null:false);
  });
})();


/* Declarative dynamic-content translation loader.
 * Future BO create/edit forms only need data-translation-ref-type + data-translation-id-selector.
 * No per-page JavaScript registration is required. */
(function(){
  function boot(){
    if(!document.querySelector('form[data-translation-ref-type]')) return;
    if(window.DynamicTranslation){ window.DynamicTranslation.autoAttach(document); return; }
    if(document.querySelector('script[data-dynamic-translation-loader]')) return;
    const script=document.createElement('script');
    script.src='assets/js/dynamic-translation.js?v=5ad59a20';
    script.async=false;
    script.setAttribute('data-dynamic-translation-loader','1');
    script.onload=function(){ if(window.DynamicTranslation) window.DynamicTranslation.autoAttach(document); };
    document.head.appendChild(script);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
