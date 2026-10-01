/* The shared transaction page: one document, three views (Deposit / Withdraw / All) selected by
   `?tab=`. This file is the view controller - it shapes the markup for the Withdraw view, sets the
   title and lights the tab, then makes sure the module that owns the view is loaded, once.

   It is re-runnable on purpose (`data-bo-spa-rerun` on its tag in member-deposit.html). The BO
   router swaps the content frame in place, so entering ?tab=withdraw from ?tab=deposit runs this
   file again against the fresh frame instead of reloading the page. Two consequences, both
   load-bearing:

     - The frame arrives deposit-shaped on every entry (the target document is member-deposit.html
       for all three views), so the Withdraw shaping is re-applied every time - and the Deposit view
       has to undo what the previous view left on the <body>, which is not part of the frame and
       survives a swap.
     - `window.BO_TX_VIEW` names the view that owns the shared table right now. All three scripts of
       this page stay loaded after a swap, so a module whose view is gone has to be able to tell:
       two live copies of the same click delegation would toggle one bank chip twice. */
(function(){
  'use strict';

  const VIEWS=['deposit','withdraw','all'];
  const q=new URLSearchParams(location.search);
  const requested=(q.get('tab')||'deposit').toLowerCase();
  const tab=VIEWS.includes(requested)?requested:'deposit';

  function loadScript(src){
    const script=document.createElement('script');
    script.src=src;
    document.body.appendChild(script);
  }

  /* Reuse the module already running in this document instead of loading a second copy of it:
     member-withdraw.html carries member-withdraw.js statically while the ?tab=withdraw view loads
     it from here, and a swap can bring either one into a document that has already run the other.
     Each module publishes a slot (`window.BO_MEMBER_*_PAGE`) at its first execution, and a later
     entry re-initialises that copy against the fresh frame. */
  function ensureModule(slot,src){
    const live=window[slot];
    if(live&&typeof live.reinit==='function'){ live.reinit(); return; }
    loadScript(src);
  }

  /* The Withdraw view, in a document that arrived Deposit-shaped. Guarded on the first id it
     renames, so a second run in the same document cannot rename a renamed document, and a swap
     back to the Deposit view - whose frame is fresh - is never touched by it. */
  function shapeWithdrawView(){
    if(!document.getElementById('depositBody')) return;
    [['depositFrom','withdrawFrom'],['depositTo','withdrawTo'],['depositKeyword','withdrawKeyword'],['depositStatus','withdrawStatus'],['depositSize','withdrawSize'],['depositTableScroll','withdrawTableScroll'],['depositBody','withdrawBody'],['depositPrevBtn','withdrawPrevBtn'],['depositPager','withdrawPager'],['depositNextBtn','withdrawNextBtn'],['depositBankCards','withdrawBankCards']].forEach(([a,b])=>{const e=document.getElementById(a);if(e)e.id=b;});
    document.querySelectorAll('.bo-tx-head-table colgroup,.bo-tx-body-table colgroup').forEach(c=>c.innerHTML='<col class="bo-tx-col-date"/><col class="bo-tx-col-member"/><col class="bo-tx-col-amount"/><col class="bo-tx-col-bank"/><col class="bo-tx-col-ref"/><col class="bo-tx-col-remark"/><col class="bo-tx-col-status"/><col class="bo-tx-col-processed"/><col class="bo-tx-col-action"/>');
    const tr=document.querySelector('.bo-tx-head-table thead tr');if(tr)tr.innerHTML='<th>Date</th><th>Member</th><th>Amount</th><th>Bank</th><th>Reference</th><th>Remark</th><th>Status</th><th>Processed</th><th>Action</th>';
    const body=document.getElementById('withdrawBody');if(body)body.innerHTML='<tr><td colspan="9">Loading...</td></tr>';
  }

  /* The top bar is shell chrome: a swap replaces and re-mounts it AFTER this file has run, and the
     router then syncs the title from the target document - which is member-deposit.html for all
     three views. `bo:spa:content` is dispatched at the very end of that swap, so it is the one
     moment that can put the Withdraw title back. On a fresh load nothing overwrites this. */
  function paintShell(){
    const withdraw=tab==='withdraw';
    const title=withdraw?'Withdraw Approval':'Deposit Approval';
    const subtitle=withdraw?'Review and process member withdrawal requests.':'Review and process member deposit requests.';
    document.title=title;
    const icon=document.querySelector('.user-title-icon i');
    if(icon) icon.className=withdraw?'bi bi-cash-stack':'bi bi-wallet2';
    const h=document.querySelector('.user-title-wrap h1');
    if(h) h.textContent=title;
    const p=document.querySelector('.user-title-wrap p');
    if(p) p.textContent=subtitle;
  }

  /* Is this document still the transaction page? Our tab row is unique to these two pages and it
     lives inside the content frame, so every swap replaces it - the cheapest reliable test, and the
     reason it cannot be fooled by a page reached later in the same session. */
  function ownsDocument(){
    return !!document.querySelector('.bo-tx-tabs [data-bo-tx-type]');
  }

  function paintView(){
    /* The ownership marker goes first: a module loaded below reads it as it executes. */
    window.BO_TX_VIEW=tab;
    document.body.classList.toggle('withdraw-approval-page',tab==='withdraw');
    document.body.classList.toggle('deposit-approval-page',tab!=='withdraw');
    document.querySelectorAll('[data-bo-tx-type]').forEach(a=>{const on=a.dataset.boTxType===tab;a.classList.toggle('is-active',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    if(tab==='withdraw') shapeWithdrawView();
    paintShell();
  }

  paintView();

  const onContent=()=>{ if(ownsDocument()) paintView(); };
  /* `bo:spa:content` is on `document`, and this file runs once per entry - so a plain
     addEventListener would leave one listener behind per entry, each holding the tab it was run
     for. The stale one fires on the NEXT swap and re-applies ITS view to the frame that was just
     swapped in: measured, arriving at ?tab=all put the Withdraw shape back on the fresh Deposit
     markup (ids renamed, 9 columns, "Loading..."), because the ?tab=withdraw closure from the
     previous entry ran after the swap and before this entry's listener. One slot, newest wins
     (SPA.md section 4, rule 2). */
  if(window.__boTxViewReapply) document.removeEventListener('bo:spa:content',window.__boTxViewReapply);
  window.__boTxViewReapply=onContent;
  document.addEventListener('bo:spa:content',onContent);

  if(tab==='withdraw'){
    ensureModule('BO_MEMBER_WITHDRAW_PAGE','assets/js/member-withdraw.js?v=23aea870');
    return;
  }

  if(tab==='all'){
    /* All owns the shared table itself, through the switcher: the two modules are loaded because it
       asks them for a row action, and `BO_TX_VIEW='all'` keeps them from painting a table or a bank
       strip of their own beside it. They are reused rather than reloaded, so a document that has
       already run one of them does not end up with two copies of its document-level handlers. */
    ensureModule('BO_MEMBER_DEPOSIT_PAGE','assets/js/member-deposit.js?v=19941edc');
    ensureModule('BO_MEMBER_WITHDRAW_PAGE','assets/js/member-withdraw.js?v=23aea870');
    ensureModule('BO_MEMBER_TX_ALL_PAGE','assets/js/member-transaction-tab-switcher.js?v=34501a9e');
    return;
  }

  // Deposit owns the page exclusively. Other transaction types are reached through their own tab,
  // and every view keeps exactly one data loader and one state.
  ensureModule('BO_MEMBER_DEPOSIT_PAGE','assets/js/member-deposit.js?v=19941edc');
})();
