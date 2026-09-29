(function(){
  'use strict';

  const FILTER_ROW_SELECTOR=[
    '.report-main .user-search-grid',
    '.report-main .admin-search-grid',
    '.report-main .standard-filter-grid',
    '.report-main .filter-grid',
    '.report-main .vip-log-filters',
    '.report-main .ops-filter',
    '.report-main .category-filterbar',
    '.report-main .category-filter-card',
    '.report-main .game-filterbar',
    '.report-main .game-filter-card',
    '.report-main .pwt-filter-grid',
    '.report-main .provider-filter-grid',
    '.report-main .report-filter-grid',
    '.report-main .referral-filter-grid',
    '.report-main .wallet-filter-grid',
    '.report-main .tx-filter-grid',
    '.report-main .debug-filter-grid',
    '.report-main .debug-filter',
    '.report-main .rebate-log-filters',
    '.report-main .manual-rebate-filters',
    '.report-main .audit-filters'
  ].join(',');

  const DATE_PICKER_SELECTOR='.ref-range-picker,.bo-range-pop';
  const DATE_RANGE_SELECTOR='.bo-filter-range-item,.ref-date-field,.bo-range-field,.bo-date-range-field,.dash-date-field,[data-bo-date-range],.ref-range-trigger,.bo-range-trigger';
  const FILTER_BUTTON_EXCLUDE=DATE_PICKER_SELECTOR+','+DATE_RANGE_SELECTOR+',.rounded-select-wrap,.rounded-select-menu,.bo-tx-tabs,.mad-pills,.mp-scope,.agent-detail-tabs';
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d');
  let alertModal,dialogModal,dialogResolver;

  function visibleText(el){
    if(!el) return '';
    const clone=el.cloneNode(true);
    clone.querySelectorAll?.('i,svg,img,.spinner,.badge').forEach(n=>n.remove());
    return String(clone.textContent||el.value||'').replace(/\s+/g,' ').trim();
  }

  function measureText(text,reference){
    if(!ctx) return String(text||'').length*7;
    const cs=getComputedStyle(reference||document.body);
    ctx.font=[cs.fontStyle,cs.fontVariant,cs.fontWeight,cs.fontSize,cs.fontFamily].filter(Boolean).join(' ');
    return Math.ceil(ctx.measureText(String(text||'').trim()).width);
  }

  function buttonKind(button){
    const key=(visibleText(button)+' '+(button.id||'')+' '+(button.className||'')).toLowerCase();
    if(/\b(reset|clear|today)\b|resetbtn|resetbutton|clearfilters/.test(key)) return 'reset';
    if(/\b(search|apply|filter)\b|searchbtn|searchbutton|applyfilters/.test(key)) return 'search';
    return 'other';
  }

  function styleFilterButton(button){
    if(!button || button.closest(FILTER_BUTTON_EXCLUDE)) return;
    button.classList.remove('bo-filter-reset-button','bo-filter-search-button','bo-filter-other-button');
    const kind=buttonKind(button);
    button.classList.add(kind==='reset'?'bo-filter-reset-button':kind==='search'?'bo-filter-search-button':'bo-filter-other-button');
    if(kind==='reset'){
      button.classList.remove('primary','btn-primary-clean','bo-ui-button-primary');
    }
  }

  function isVisibleControl(el){
    if(!el) return false;
    if(el.hidden || el.type==='hidden') return false;
    return getComputedStyle(el).display!=='none';
  }

  function classifyItem(item){
    item.classList.remove('bo-filter-item','bo-filter-input-item','bo-filter-select-item','bo-filter-range-item','bo-filter-actions-item','bo-filter-hidden-item');
    item.classList.add('bo-filter-item');

    const isHidden=item.hidden || getComputedStyle(item).display==='none';
    const hasRange=item.matches('.bo-range-field,.ref-date-field,.bo-date-range-field,.dash-date-field,[data-bo-date-range]') || !!item.querySelector('.bo-range-trigger,.ref-range-trigger');
    const hasSelect=item.matches('select') || !!item.querySelector('select,.rounded-select-wrap');
    const inputs=item.matches('input')?[item]:Array.from(item.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'));
    const hasInput=inputs.some(isVisibleControl);
    const buttons=item.matches('button')?[item]:Array.from(item.querySelectorAll(':scope>button,:scope>.filter-action-row>button,:scope>.filter-actions>button,:scope>.category-filter-actions>button,:scope>.game-filter-actions>button,:scope>.debug-filter-actions>button'));
    const isActionWrapper=item.matches('.user-filter-actions,.ref-filter-actions,.wallet-filter-actions,.tx-filter-actions,.filter-action-row,.filter-actions,.category-filter-actions,.game-filter-actions,.debug-filter-actions') || buttons.length>0;

    if(isHidden && !hasRange){item.classList.add('bo-filter-hidden-item');return;}
    if(hasRange){item.classList.add('bo-filter-range-item');return;}
    if(isActionWrapper && !hasInput && !hasSelect){
      item.classList.add('bo-filter-actions-item');
      buttons.forEach(styleFilterButton);
      return;
    }
    if(hasSelect){item.classList.add('bo-filter-select-item');return;}
    if(hasInput){item.classList.add('bo-filter-input-item');return;}
    if(item.matches('button')){item.classList.add('bo-filter-actions-item');styleFilterButton(item);}
  }

  function prepareRow(row){
    if(!row || row.closest(DATE_PICKER_SELECTOR)) return;
    row.classList.add('bo-filter-row');
    Array.from(row.children).forEach(classifyItem);
    row.querySelectorAll('button').forEach(button=>{
      if(!button.closest(DATE_PICKER_SELECTOR)) styleFilterButton(button);
    });
  }

  function sizeNativeSelect(select){
    if(!select || select.multiple || Number(select.size)>1 || select.closest(DATE_PICKER_SELECTOR) || !select.closest('.bo-filter-row')) return;
    const item=select.matches('.bo-filter-select-item')?select:select.closest('.bo-filter-select-item');
    if(!item) return;
    const listingFixed={depositStatus:150,withdrawStatus:150,dbgStatus:150};
    if(document.body.classList.contains('bo-wallet-tx') && listingFixed[select.id]!=null){
      item.style.setProperty('--bo-select-width',listingFixed[select.id]+'px');
      select.dataset.boContentSized='1';
      return;
    }
    const labels=Array.from(select.options||[]).map(o=>(o.textContent||o.label||'').trim()).filter(Boolean);
    const widest=Math.max(0,...labels.map(label=>measureText(label,select)));
    /* 12px left + 32px arrow side + requested 10px additional room. */
    const width=Math.max(80,widest+54);
    item.style.setProperty('--bo-select-width',width+'px');
    select.dataset.boContentSized='1';
  }

  function sizeRoundedSelect(wrap){
    if(!wrap || wrap.closest(DATE_PICKER_SELECTOR) || !wrap.closest('.bo-filter-row')) return;
    const item=wrap.closest('.bo-filter-select-item');
    const button=wrap.querySelector('.rounded-select-btn');
    const select=wrap.querySelector(':scope > select');
    if(!item || !button) return;
    const listingFixed={depositStatus:150,withdrawStatus:150,dbgStatus:150};
    if(document.body.classList.contains('bo-wallet-tx') && select && listingFixed[select.id]!=null){
      item.style.setProperty('--bo-select-width',listingFixed[select.id]+'px');
      wrap.dataset.boContentSized='1';
      return;
    }
    const labels=[visibleText(button),...Array.from(wrap.querySelectorAll('.rounded-select-option')).map(visibleText)].filter(Boolean);
    const widest=Math.max(0,...labels.map(label=>measureText(label,button)));
    const width=Math.max(80,widest+54);
    item.style.setProperty('--bo-select-width',width+'px');
    wrap.dataset.boContentSized='1';
  }

  function sizeDropdowns(root){
    const scope=root||document;
    if(scope.matches?.('select')) sizeNativeSelect(scope);
    if(scope.matches?.('.rounded-select-wrap')) sizeRoundedSelect(scope);
    scope.querySelectorAll?.('.bo-filter-row select:not([multiple]):not([size])').forEach(sizeNativeSelect);
    scope.querySelectorAll?.('.bo-filter-row .rounded-select-wrap').forEach(sizeRoundedSelect);
  }

  function prepareFilters(root){
    const scope=root||document;
    if(scope.matches?.(FILTER_ROW_SELECTOR)) prepareRow(scope);
    scope.querySelectorAll?.(FILTER_ROW_SELECTOR).forEach(prepareRow);
    sizeDropdowns(scope);
  }

  function styleButton(el){
    if(!el || el.closest('.report-sidebar,.report-topbar,.sidebar-overlay,.dropdown-menu,.rounded-select-menu,'+DATE_PICKER_SELECTOR+','+DATE_RANGE_SELECTOR+',.pagination-clean,.bo-pagination-buttons,.bo-global-modal')) return;
    /* Banner toolbar owns Ghost Refresh + Primary Add; skip global button paint. */
    if(el.closest('.banner-filterbar')) return;
    /* Bonus Category Title strip — CMS owns Ghost Refresh + Primary Add typography. */
    if(el.closest('.bonus-title-strip,.bonus-title-filterbar')) return;
    if(el.closest('.bo-filter-row')){styleFilterButton(el);return;}
    /* Form dropdown controls keep their page-original styling. The global dropdown
       standard is intentionally limited to filter rows only. */
    const isFormDropdown=el.matches?.('.rounded-select-btn,[role="combobox"],[aria-haspopup="listbox"]') ||
      !!el.closest?.('.rounded-select-wrap,.form-select-wrap,.select-wrap');
    if(isFormDropdown){
      el.classList.remove('bo-ui-button','bo-ui-button-primary','bo-ui-button-secondary','bo-ui-button-danger','bo-ui-icon-button');
      delete el.dataset.boUiButton;
      return;
    }
    /* New Menu modal segmented controls (Status / mode tabs) — page CSS owns these.
       "Disabled" must NOT match the global danger heuristic (/disable/). */
    if(el.matches?.('.livechat-inbox-item,.livechat-inbox-pin,.livechat-msg-menu-btn,.template-icon-btn,.template-list-item,.template-list-add') || el.closest?.('.livechat-inbox-list,.livechat-inbox-menu,.livechat-msg-menu,.livechat-msg-actions,.template-list,.template-list-actions')){
      el.classList.remove('bo-ui-button','bo-ui-button-primary','bo-ui-button-secondary','bo-ui-button-danger','bo-ui-icon-button');
      delete el.dataset.boUiButton;
      return;
    }
    if(el.closest?.('.layout-find-bar,.layout-find-actions')){
      el.classList.remove('bo-ui-button','bo-ui-button-primary','bo-ui-button-secondary','bo-ui-button-danger','bo-ui-icon-button');
      delete el.dataset.boUiButton;
      return;
    }
    if(el.dataset.boUiSkip==='1' || el.matches?.('[data-bo-ui-skip],.dynamic-translation-toggle,[data-dt-collapse]')){
      el.classList.remove('bo-ui-button','bo-ui-button-primary','bo-ui-button-secondary','bo-ui-button-danger','bo-ui-icon-button');
      delete el.dataset.boUiButton;
      return;
    }
    if(el.matches?.('.fd-switch,[role="switch"],.marquee-tool,.fd-color-swatch-btn,.fd-color-pop-close,.wallet-side-tab,.nm-status-btn,.nm-mode-tab,.bo-theme-btn,#boThemeToggle,.mad-btn,.mad-tab,.mad-pill,.mad-icon-btn,.mad-eye,.mac-link-btn,.mac-change-role,.mac-credit-mode-btn,.mac-currency-add-btn,.mac-currency-add-inline,.mac-currency-chip-remove,.mac-currency-picker-item,.mac-currency-move-btn,.mac-currency-pane-item,.mprr-mode-btn,.mprr-entry-opt,.mp-scope-btn,.mrc-chip-btn,.mrc-btn,.status-pill,.usage-show-switch,.usage-status-chip,.bo-tx-tab,.banner-status-opt,.slider-pill,.custom-tab,.asset-slot-drag,.asset-slot-zone-btn') || el.closest?.('.md-rail,.nm-status-seg,.nm-mode-tabs,#newMenuModal .nm-status-seg,#newMenuModal .nm-mode-tabs,.mp-workspace,.mrc-workspace,.mad-workspace,.mad-modal,.mad-pager,.mac-workspace,.mp-scope,.mprr-entry-options,.banner-status-seg,.custom-tabs[aria-label="Asset language"],.asset-slot-chrome,.asset-slot-zones,.fd-color-pop,.pc-toolbar,.pc-editor')){
      el.classList.remove('bo-ui-button','bo-ui-button-primary','bo-ui-button-secondary','bo-ui-button-danger','bo-ui-icon-button');
      delete el.dataset.boUiButton;
      return;
    }
    if(el.dataset.boUiButton==='1') return;
    const text=visibleText(el);
    const hasGraphic=!!el.querySelector('i,svg,img');
    const iconOnly=!text && (hasGraphic||el.getAttribute('aria-label')||el.getAttribute('title'));
    if(iconOnly){el.classList.add('bo-ui-icon-button');}
    else{
      el.classList.add('bo-ui-button');
      const key=(text+' '+el.className+' '+(el.id||'')).toLowerCase();
      if(/delete|remove|reject|disable/.test(key)) el.classList.add('bo-ui-button-danger');
      else if(/search|save|submit|approve|add|create|sync|launch|process|confirm/.test(key)) el.classList.add('bo-ui-button-primary');
      else el.classList.add('bo-ui-button-secondary');
    }
    el.dataset.boUiButton='1';
  }

  function scanButtons(root){
    const selector='button,input[type="button"],input[type="submit"],a.btn,a.clean-btn,a.btn-primary-clean,a.btn-soft';
    if(root.matches?.(selector)) styleButton(root);
    root.querySelectorAll?.(selector).forEach(styleButton);
  }

  function normalizePagination(root){
    const scope=root||document;
    scope.querySelectorAll?.('.report-main .table-footer,.report-main .admin-table-footer,.report-main .table-pagination-wrap,.report-main .ref-pagination-row,.report-main .game-table-footer,.report-main .subcategory-table-footer,.report-main .bo-table-pagination,.report-main .standard-pagination').forEach(f=>{
      f.classList.add('bo-pagination-standard');
      const info=f.querySelector('.table-info,.table-pagination-info,[id*="Showing"],[id*="showing"],[id*="PageInfo"]');
      if(info) info.classList.add('bo-pagination-info');
      const pager=f.querySelector('.pagination-clean,.smart-pagination,.ref-pager,[id*="Pager"],[id*="pager"]');
      if(pager) pager.classList.add('bo-pagination-buttons');
    });
  }

  function ensureAlert(){
    if(alertModal) return alertModal;
    alertModal=document.createElement('div');
    alertModal.className='bo-global-modal';alertModal.setAttribute('aria-hidden','true');
    alertModal.innerHTML='<div class="bo-global-backdrop"></div><section class="bo-global-dialog" role="alertdialog" aria-modal="true"><button class="bo-global-close" type="button" aria-label="Close"><i class="bi bi-x-lg"></i></button><header><span class="bo-global-icon"><i class="bi bi-info-circle"></i></span><div><h3>Notice</h3><p class="bo-global-message"></p></div></header><footer><button type="button" class="bo-global-primary">OK</button></footer></section>';
    document.body.appendChild(alertModal);
    const close=()=>{alertModal.classList.remove('show');alertModal.setAttribute('aria-hidden','true');};
    alertModal.querySelector('.bo-global-primary').onclick=close;
    alertModal.querySelector('.bo-global-close').onclick=close;
    alertModal.querySelector('.bo-global-backdrop').onclick=close;
    return alertModal;
  }

  function typeFor(message){
    const s=String(message||'').toLowerCase();
    if(/error|failed|invalid|unable|not found/.test(s)) return ['error','Error','bi-x-circle'];
    if(/success|completed|saved|updated/.test(s)) return ['success','Success','bi-check-circle'];
    if(/warning|confirm|sure/.test(s)) return ['warning','Warning','bi-exclamation-triangle'];
    return ['info','Notice','bi-info-circle'];
  }

  function standardAlert(message,options){
    const modal=ensureAlert(),opts=options||{},type=typeFor((opts.title||'')+' '+message);
    modal.dataset.type=opts.type||type[0];
    modal.querySelector('h3').textContent=opts.title||type[1];
    modal.querySelector('.bo-global-icon i').className='bi '+(opts.icon||type[2]);
    modal.querySelector('.bo-global-message').textContent=String(message??'');
    modal.classList.add('show');modal.setAttribute('aria-hidden','false');
    setTimeout(()=>modal.querySelector('.bo-global-primary').focus(),0);
    return Promise.resolve(true);
  }

  function ensureDialog(){
    if(dialogModal) return dialogModal;
    dialogModal=document.createElement('div');dialogModal.className='bo-global-modal';dialogModal.setAttribute('aria-hidden','true');
    dialogModal.innerHTML='<div class="bo-global-backdrop"></div><section class="bo-global-dialog" role="dialog" aria-modal="true"><button class="bo-global-close" type="button" aria-label="Close"><i class="bi bi-x-lg"></i></button><header><span class="bo-global-icon"><i class="bi bi-question-circle"></i></span><div><h3>Confirm Action</h3><p class="bo-global-message"></p></div></header><label class="bo-global-input-wrap"><span>Value</span><input class="bo-global-input" type="text" autocomplete="off"></label><footer><button type="button" class="bo-global-secondary">Cancel</button><button type="button" class="bo-global-primary">Confirm</button></footer></section>';
    document.body.appendChild(dialogModal);
    const finish=value=>{dialogModal.classList.remove('show');dialogModal.setAttribute('aria-hidden','true');const resolve=dialogResolver;dialogResolver=null;if(resolve)resolve(value);};
    dialogModal.querySelector('.bo-global-primary').onclick=()=>finish(dialogModal.dataset.input==='1'?dialogModal.querySelector('.bo-global-input').value:true);
    dialogModal.querySelector('.bo-global-secondary').onclick=()=>finish(dialogModal.dataset.input==='1'?null:false);
    dialogModal.querySelector('.bo-global-close').onclick=()=>finish(dialogModal.dataset.input==='1'?null:false);
    dialogModal.querySelector('.bo-global-backdrop').onclick=()=>finish(dialogModal.dataset.input==='1'?null:false);
    dialogModal.querySelector('.bo-global-input').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();dialogModal.querySelector('.bo-global-primary').click();}});
    return dialogModal;
  }

  function openDialog(message,options,input,defaultValue){
    const modal=ensureDialog(),opts=options||{};
    modal.dataset.input=input?'1':'0';
    modal.dataset.type=opts.type||(input?'input':(/delete|remove/i.test((opts.title||'')+' '+message)?'danger':'confirm'));
    modal.querySelector('h3').textContent=opts.title||(input?'Enter Details':'Confirm Action');
    modal.querySelector('.bo-global-message').textContent=String(message||'');
    modal.querySelector('.bo-global-primary').textContent=opts.confirmText||'Confirm';
    modal.querySelector('.bo-global-secondary').textContent=opts.cancelText||'Cancel';
    const wrap=modal.querySelector('.bo-global-input-wrap');wrap.hidden=!input;
    if(input){const field=wrap.querySelector('input');wrap.querySelector('span').textContent=opts.inputLabel||'Value';field.value=defaultValue||'';field.placeholder=opts.placeholder||'';field.type=opts.inputType||'text';field.step=opts.step||'any';}
    modal.classList.add('show');modal.setAttribute('aria-hidden','false');
    return new Promise(resolve=>{dialogResolver=resolve;setTimeout(()=>input?wrap.querySelector('input').focus():modal.querySelector('.bo-global-primary').focus(),0);});
  }

  window.BO_DIALOG={alert:(message,options)=>standardAlert(message,options),confirm:(message,options)=>openDialog(message,options,false,''),prompt:(message,value,options)=>openDialog(message,options,true,value)};
  window.alert=function(message){standardAlert(message);};

  function boot(){
    prepareFilters(document);
    scanButtons(document);
    normalizePagination(document);

    let queued=false;
    const pending=new Set();
    const flush=()=>{
      queued=false;
      pending.forEach(node=>{
        if(!node || node.nodeType!==1) return;
        const row=node.matches?.(FILTER_ROW_SELECTOR)?node:node.closest?.(FILTER_ROW_SELECTOR);
        if(row) prepareRow(row);
        prepareFilters(node);
        scanButtons(node);
        normalizePagination(node);
        const select=node.matches?.('select')?node:node.closest?.('select');
        if(select) sizeNativeSelect(select);
      });
      pending.clear();
    };
    const observer=new MutationObserver(records=>{
      records.forEach(record=>{
        if(record.target?.nodeType===1) pending.add(record.target);
        record.addedNodes.forEach(node=>{if(node.nodeType===1)pending.add(node);});
      });
      if(pending.size&&!queued){queued=true;requestAnimationFrame(flush);}
    });
    observer.observe(document.body,{childList:true,subtree:true});

    document.addEventListener('change',event=>{
      if(event.target?.matches?.('select:not([multiple]):not([size])')) sizeNativeSelect(event.target);
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
