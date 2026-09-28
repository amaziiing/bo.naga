(function(){
  'use strict';
  const q=new URLSearchParams(location.search);
  const tab=(q.get('tab')||'deposit').toLowerCase();
  const script=document.createElement('script');
  if(tab==='withdraw'){
    document.title='Withdraw Approval';
    document.body.classList.remove('deposit-approval-page');document.body.classList.add('withdraw-approval-page');
    const icon=document.querySelector('.user-title-icon i');if(icon)icon.className='bi bi-cash-stack';
    const h=document.querySelector('.user-title-wrap h1'),p=document.querySelector('.user-title-wrap p');if(h)h.textContent='Withdraw Approval';if(p)p.textContent='Review and process member withdrawal requests.';
    const cards=document.getElementById('depositBankCards');if(cards)cards.id='withdrawBankCards';
    [['depositFrom','withdrawFrom'],['depositTo','withdrawTo'],['depositKeyword','withdrawKeyword'],['depositStatus','withdrawStatus'],['depositSize','withdrawSize'],['depositTableScroll','withdrawTableScroll'],['depositBody','withdrawBody'],['depositPrevBtn','withdrawPrevBtn'],['depositPager','withdrawPager'],['depositNextBtn','withdrawNextBtn']].forEach(([a,b])=>{const e=document.getElementById(a);if(e)e.id=b;});
    document.querySelectorAll('[data-bo-tx-type]').forEach(a=>{const t=a.dataset.boTxType;a.classList.toggle('is-active',t==='withdraw');if(t==='withdraw')a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    document.querySelectorAll('.bo-tx-head-table colgroup,.bo-tx-body-table colgroup').forEach(c=>c.innerHTML='<col class="bo-tx-col-date"/><col class="bo-tx-col-member"/><col class="bo-tx-col-amount"/><col class="bo-tx-col-bank"/><col class="bo-tx-col-ref"/><col class="bo-tx-col-remark"/><col class="bo-tx-col-status"/><col class="bo-tx-col-processed"/><col class="bo-tx-col-action"/>');
    const tr=document.querySelector('.bo-tx-head-table thead tr');if(tr)tr.innerHTML='<th>Date</th><th>Member</th><th>Amount</th><th>Bank</th><th>Reference</th><th>Remark</th><th>Status</th><th>Processed</th><th>Action</th>';
    const body=document.getElementById('withdrawBody');if(body)body.innerHTML='<tr><td colspan="9">Loading...</td></tr>';
    script.src='assets/js/member-withdraw.js?v=1.0.38';
  }else{script.src='assets/js/member-deposit.js?v=1.0.38';}
  script.addEventListener('load',()=>{
    const switcher=document.createElement('script');
    switcher.src='assets/js/member-transaction-tab-switcher.js?v=1.0.2';
    document.body.appendChild(switcher);
  },{once:true});
  document.body.appendChild(script);
})();
