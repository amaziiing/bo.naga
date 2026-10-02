(function(){
  var lastOpenedAt = 0;
  var saveArmed = false;

  function ready(fn){ if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function text(el){ return (el && el.textContent || '').trim(); }
  function findFormCard(){
    return document.querySelector('.slider-page-grid > .slider-form-card, .manage-page-grid > .manage-form-card, .template-page-grid > .template-form-card');
  }
  function findListCard(){
    return document.querySelector('.slider-page-grid > .slider-list-card, .manage-page-grid > .manage-list-card, .template-page-grid > .template-list-card');
  }
  function findGrid(){ return document.querySelector('.slider-page-grid, .manage-page-grid, .template-page-grid'); }
  function pageLabel(){
    var h1 = document.querySelector('.report-topbar h1');
    return text(h1).replace(/Management|List/ig,'').trim() || 'Item';
  }
  function ensureModal(){
    var modal = document.getElementById('crudPatternModal');
    if(modal) return modal;
    modal = document.createElement('div');
    modal.id = 'crudPatternModal';
    modal.className = 'crud-pattern-modal';
    modal.innerHTML = '<div class="crud-pattern-backdrop" data-crud-close></div><div class="crud-pattern-dialog"><div class="crud-pattern-head"><h2 id="crudPatternTitle">Add</h2><button type="button" class="crud-pattern-close" data-crud-close><i class="bi bi-x-lg"></i></button></div><div class="crud-pattern-body" id="crudPatternBody"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e){
      var closeTarget = e.target.closest('[data-crud-close]');
      if(!closeTarget) return;
      if(Date.now() - lastOpenedAt < 250) return;
      closeModal();
    });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeModal(); });
    return modal;
  }
  function openModal(title){
    var modal = ensureModal();
    var titleEl = modal.querySelector('#crudPatternTitle');
    if(titleEl) titleEl.textContent = title || ('Add ' + pageLabel());
    saveArmed = false;
    lastOpenedAt = Date.now();
    modal.classList.add('show');
    document.body.classList.add('crud-modal-open');
  }
  function closeModal(){
    var modal = document.getElementById('crudPatternModal');
    if(modal) modal.classList.remove('show');
    document.body.classList.remove('crud-modal-open');
    saveArmed = false;
  }

  function isModalOpen(){
    var modal = document.getElementById('crudPatternModal');
    return !!(modal && modal.classList.contains('show'));
  }
  function installAutoCloseAfterSave(){
    if(window.__crudModalFetchCloseInstalled) return;
    window.__crudModalFetchCloseInstalled = true;
    var originalFetch = window.fetch;
    if(typeof originalFetch !== 'function') return;
    window.fetch = function(){
      var requestArgs = arguments;
      var method = 'GET';
      try{
        var opt = requestArgs[1] || {};
        if(opt.method) method = String(opt.method).toUpperCase();
        else if(requestArgs[0] && requestArgs[0].method) method = String(requestArgs[0].method).toUpperCase();
      }catch(e){}
      var shouldWatch = saveArmed && isModalOpen() && method !== 'GET';
      return originalFetch.apply(this, requestArgs).then(function(res){
        if(shouldWatch){
          res.clone().json().then(function(json){
            var failed = !res.ok || (json && String(json.status || '').toLowerCase() === 'error') || (json && json.success === false);
            if(!failed){
              setTimeout(closeModal, 450);
            }
          }).catch(function(){
            if(res.ok) setTimeout(closeModal, 450);
          });
        }
        return res;
      });
    };
  }

  function wrapButtonText(btn){
    if(!btn || btn.dataset.crudWrapped === '1') return;
    var childNodes = Array.from(btn.childNodes);
    var labelParts = [];
    childNodes.forEach(function(n){ if(n.nodeType === 3 && n.textContent.trim()) labelParts.push(n.textContent.trim()); });
    childNodes.forEach(function(n){ if(n.nodeType === 3) btn.removeChild(n); });
    if(labelParts.length){
      var span = document.createElement('span');
      span.className = 'btn-label';
      span.textContent = labelParts.join(' ');
      btn.appendChild(span);
    }
    btn.dataset.crudWrapped = '1';
  }
  function ensureTitleActions(sectionTitle){
    sectionTitle.classList.add('crud-list-titlebar');
    var actions = sectionTitle.querySelector(':scope > .crud-title-actions');
    if(!actions){
      actions = document.createElement('div');
      actions.className = 'crud-title-actions';
      var directButtons = Array.from(sectionTitle.children).filter(function(el){
        return el.matches && el.matches('button, a.clean-btn, .clean-btn');
      });
      directButtons.forEach(function(btn){
        btn.classList.add('crud-toolbar-btn');
        wrapButtonText(btn);
        actions.appendChild(btn);
      });
      sectionTitle.appendChild(actions);
    }
    Array.from(actions.querySelectorAll('button, a')).forEach(function(btn){
      btn.classList.add('crud-toolbar-btn');
      wrapButtonText(btn);
    });
    return actions;
  }
  function addToolbarButton(listCard, formCard){
    if(document.body && document.body.dataset.crudNoAdd === '1') return;
    var existingPageAdd = listCard.querySelector('.crud-add-btn');
    if(existingPageAdd){
      existingPageAdd.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        var resetBtn = formCard.querySelector('button[id*="reset" i], button[type="reset"]');
        if(resetBtn) resetBtn.click();
        setTimeout(function(){ openModal('Add ' + pageLabel()); }, 80);
      });
      return;
    }
    var sectionTitle = listCard.querySelector('.section-title') || listCard.querySelector('.card-clean-title') || listCard.firstElementChild;
    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'clean-btn primary crud-add-btn crud-toolbar-btn';
    addBtn.innerHTML = '<i class="bi bi-plus-circle"></i><span class="btn-label">Add ' + pageLabel() + '</span>';
    addBtn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      var resetBtn = formCard.querySelector('button[id*="reset" i], button[type="reset"]');
      if(resetBtn) resetBtn.click();
      setTimeout(function(){ openModal('Add ' + pageLabel()); }, 80);
    });
    if(sectionTitle){
      var actions = ensureTitleActions(sectionTitle);
      var existingAdd = actions.querySelector('.crud-add-btn');
      if(!existingAdd) actions.appendChild(addBtn);
    } else {
      listCard.insertBefore(addBtn, listCard.firstChild);
    }
  }
  function watchSuccessClose(formCard){
    var forms = formCard.querySelectorAll('form');
    forms.forEach(function(f){ f.addEventListener('submit', function(){ saveArmed = true; }, true); });

    var targets = formCard.querySelectorAll('.upload-status, .form-status, [id$="StatusBox"], [id$="Msg"], .alert');
    var observer = new MutationObserver(function(){
      if(!saveArmed) return;
      if(Date.now() - lastOpenedAt < 800) return;
      var success = Array.from(targets).some(function(t){
        var cls = t.className || '';
        var msg = text(t).toLowerCase();
        return (String(cls).includes('success') || msg.includes('success') || msg.includes('saved')) && msg && !msg.includes('error') && !msg.includes('fail');
      });
      if(success) setTimeout(closeModal, 650);
    });
    targets.forEach(function(t){ observer.observe(t, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['class'] }); });
  }
  function standardizeAllTitlebars(){
    document.querySelectorAll('.slider-list-card .section-title, .manage-list-card .section-title, .template-list-card .section-title').forEach(function(titlebar){
      ensureTitleActions(titlebar);
    });
  }
  /* One binding per DOCUMENT, resolving the card at CLICK time.

     It used to be bound from init(), i.e. once per page that lifts a card, and it closed over
     that page's card: after a swap the modal could be titled from - and wired to - the page
     before this one. A document-level listener survives the content frame, so it is bound once
     here and asks for the current card when it is actually needed. */
  function bindEditDelegation(){
    if(window.__crudEditDelegated) return;
    window.__crudEditDelegated = 1;
    document.addEventListener('click', function(e){
      var btn = e.target.closest('button, a');
      if(!btn) return;
      if(btn.classList.contains('crud-add-btn')) return;
      if(btn.closest('#crudPatternModal')) return;
      var label = text(btn).toLowerCase();
      if(label.includes('delete') || label.includes('view') || label.includes('refresh')) return;
      if(label.includes('edit') || btn.matches('[data-edit], [data-action="edit"], .edit-btn, .btn-edit')){
        setTimeout(function(){
          var card = findFormCard();
          openModal((card ? text(card.querySelector('h1,h2,h3,h4,h5')) : '') || ('Edit ' + pageLabel()));
        }, 120);
      }
    }, true);
  }

  function init(){
    installAutoCloseAfterSave();
    standardizeAllTitlebars();
    var formCard = findFormCard();
    var listCard = findListCard();
    var grid = findGrid();
    if(!formCard || !listCard || !grid) return;
    if(document.body.dataset.crudModalReady === '1') return;
    document.body.dataset.crudModalReady = '1';
    grid.classList.add('crud-list-only-grid');
    listCard.classList.add('crud-list-full');
    formCard.classList.add('crud-modal-form-card');
    var modal = ensureModal();
    var body = modal.querySelector('#crudPatternBody');
    var dialog = modal.querySelector('.crud-pattern-dialog');
    /* The footer this file builds is page-owned (the Game form's Save row is moved there so it
       stays reachable while the translation panel is long). The dialog itself is a document-
       level container, so without this the modal opened from another page still carried THAT
       page's buttons - with `form="gameForm"` pointing at a form this page does not have. */
    if(dialog) Array.from(dialog.querySelectorAll(':scope > .crud-pattern-fixed-actions')).forEach(function(el){ el.remove(); });
    body.appendChild(formCard);

    // Game creation contains a long translation panel. Keep Save/Reset permanently
    // visible in the modal footer so bulk game entry does not require scrolling down.
    var gameForm = formCard.querySelector('#gameForm');
    if(gameForm){
      var gameActions = gameForm.querySelector('.slider-form-actions');
      if(gameActions && dialog && !dialog.querySelector('.crud-pattern-fixed-actions')){
        gameActions.classList.add('crud-pattern-fixed-actions');
        Array.from(gameActions.querySelectorAll('button')).forEach(function(button){
          button.setAttribute('form', 'gameForm');
        });
        dialog.appendChild(gameActions);
      }
    }

    addToolbarButton(listCard, formCard);
    watchSuccessClose(formCard);

    var cancelLike = formCard.querySelectorAll('button');
    cancelLike.forEach(function(b){
      var label = text(b).toLowerCase();
      if(label === 'cancel' || label === 'close') b.addEventListener('click', closeModal);
      if(label.includes('save') || label.includes('create') || label.includes('update') || label.includes('submit')){
        b.addEventListener('click', function(){ saveArmed = true; }, true);
      }
    });
  }
  window.CrudModalPattern = { open: openModal, close: closeModal };
  ready(init);
  bindEditDelegation();

  /* SPA: a modal open when the frame is replaced keeps showing over the page that arrives - and
     its body is worse than cosmetic: the swap drops the card this file lifted, so the target's
     own card would be poured into the still-open dialog (previous page's title, next page's
     form). The modal is a document-level container, so its close is one too. */
  if(!window.__crudModalSpaBound){
    window.__crudModalSpaBound = 1;
    document.addEventListener('bo:spa:before', function(){ closeModal(); });
  }

  /* Redo this file's work for the page that just arrived.

     The card it lifts into the modal is page-owned, so a swap takes it away with the content
     frame (bo-spa drops the card the previous page lifted and clears the body mark before the
     target's scripts run). Re-running the FILE on every entry is not the fix - its side effects
     are document-level (the window.fetch wrapper, the listeners, the timers) and every hop would
     stack another layer; the route's DOMContentLoaded replay cannot do it either, because a
     script that runs while the document is already complete never registers that listener
     (ready() calls straight through), so the replay had nothing to call. The document is the
     one thing that outlives the frame, so the frame's own event is what redoes the lift.
     Measured before this: arriving at game.html from game-category.html left
     cardParent=manage-page-grid (the card sitting in the grid) with #crudPatternBody empty, and
     "Add Game" opened nothing. */
  /* bo:spa:content-mounted fires synchronously with the frame's replacement; bo:spa:content
     only after the target's scripts. The lift has to run under the first of the two: the raw
     markup shows the form card in the grid (and the modal empty) until it does - measured
     ~0.45s of visible flash at 250ms RTT, captured live on the Game tab. The content event
     stays as a safety net; init() is guarded by the body mark, so its second call is a no-op. */
  document.addEventListener('bo:spa:content-mounted', function(){ init(); });
  document.addEventListener('bo:spa:content', function(){ init(); });
})();
