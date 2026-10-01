(function(){
  let page=1,totalPages=1,currentRows=[];
  /* The one selected bank (id) and the directory the chips/strip read: id -> {id,name,
     label,balance,balanceKnown,pending,flow}. `flow` is the selected bank's total under the
     table's current filters, filled in by load(). */
  let selectedBankId=null,bankIndex=null;
  /* Only page numbers — pagination-standardizer already wraps ‹ #withdrawPager ›. */
  function pageButtons(current,total){
    total=Math.max(1,Number(total)||1);
    current=Math.max(1,Math.min(Number(current)||1,total));
    const pages=[];
    const add=n=>{if(n>=1&&n<=total&&!pages.includes(n))pages.push(n);};
    add(1);
    for(let n=current-2;n<=current+2;n++)add(n);
    add(total);
    pages.sort((a,b)=>a-b);
    let html='',prev=0;
    pages.forEach(n=>{
      if(prev&&n-prev>1)html+='<span class="smart-page-ellipsis">…</span>';
      html+='<button type="button" class="smart-page'+(n===current?' active':'')+'" data-page="'+n+'"'+(n===current?' aria-current="page"':'')+'>'+n+'</button>';
      prev=n;
    });
    return html;
  }
  function endpoint(key){return API_CONFIG.BASE_URL+API_CONFIG.ENDPOINTS[key];} function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));} function num(v){const n=Number(v||0);return Number.isFinite(n)?n:0;} function money(v){return num(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});} function dt(v){return window.BO_FORMAT&&window.BO_FORMAT.dateTime?window.BO_FORMAT.dateTime(v):(v?String(v).replace('T',' ').slice(0,19):'-');}
  function dtParts(v){
    const full=dt(v);
    if(!full||full==='-') return {full:'-',day:'-',time:''};
    const m=String(full).match(/^(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s+(.+)$/);
    if(m) return {full,day:m[1],time:m[2]};
    return {full,day:full,time:''};
  }
  function dtCell(v){
    const p=dtParts(v);
    if(p.full==='-') return '-';
    if(!p.time) return `<span class="bo-tx-datetime" title="${esc(p.full)}">${esc(p.day)}</span>`;
    return `<span class="bo-tx-datetime" title="${esc(p.full)}"><span class="bo-tx-datetime-day">${esc(p.day)}</span><span class="bo-tx-datetime-time"> ${esc(p.time)}</span></span>`;
  }
  async function api(url,opt){const res=await fetch(url,opt||{headers:{...BO_AUTH.authHeader()}});const json=await res.json().catch(()=>({}));if(!res.ok||json.status==='error')throw new Error(json.message||'Request failed');return json;}

  /* The strip has two ids in the wild. The dedicated Withdraw page names it `withdrawBankCards`
     in its markup, and `member-deposit.html?tab=withdraw` renames the deposit host to that same
     id before this file is loaded. The All tab leaves it as `depositBankCards`. Look up both, so
     a mismatched id can never leave the strip on its static "Loading banks..." placeholder —
     which is exactly what happened when this file asked for `depositBankCards` on the withdraw
     page. */
  function bankHost(){return document.getElementById('withdrawBankCards')||document.getElementById('depositBankCards');}

  async function paymentMethods(){
    // Always reload before approval because Bank Usage changes after every approved
    // deposit/withdrawal and a cached balance could allow an invalid withdrawal.
    const json=await api(endpoint('PAYMENT_METHOD_LIST'));
    const d=json.data||{};
    return Array.isArray(d)?d:(d.content||d.items||d.list||[]);
  }
  function bankLabel(m){return [m.displayName,m.bankName,m.accountNumber].filter(Boolean).join(' · ')||('Bank #'+m.id);}
  function fundingBankDetail(m,amount){
    if(!m)return '<div class="funding-bank-empty">Select the casino bank that will actually fund this withdrawal.</div>';
    const usage=num(m.bankUsage), withdraw=num(amount), remaining=usage-withdraw;
    const enough=usage>0&&remaining>=0;
    return `<div class="funding-bank-grid"><div><span>Bank / Display Name</span><b>${esc(m.displayName||'-')}</b></div><div><span>Bank Name</span><b>${esc(m.bankName||'-')}</b></div><div><span>Account Name</span><b>${esc(m.accountName||'-')}</b></div><div><span>Account Number</span><b>${esc(m.accountNumber||'-')}</b></div><div><span>Method Type</span><b>${esc(m.methodType||'-')}</b></div><div><span>Current Bank Usage</span><b class="${enough?'usage-available':'usage-unavailable'}">${money(usage)}</b></div><div><span>Withdrawal Deduction</span><b class="usage-deduct">-${money(withdraw)}</b></div><div><span>Remaining After Withdrawal</span><b class="${remaining>=0?'usage-available':'usage-unavailable'}">${money(remaining)}</b></div></div>${!enough?`<div class="funding-bank-blocked"><i class="bi bi-exclamation-triangle"></i> ${usage<=0?'This bank has 0.00 available Bank Usage and cannot fund a withdrawal.':'This bank does not have enough Bank Usage for this withdrawal.'}</div>`:''}`;
  }
  function approvalPopup(options){
    return new Promise(resolve=>{
      const old=document.getElementById('bankApprovalPopup'); if(old)old.remove();
      const wrap=document.createElement('div');wrap.id='bankApprovalPopup';wrap.innerHTML=`<div class="bank-approval-backdrop"><div class="bank-approval-dialog"><div class="bank-approval-head"><div><h3>${esc(options.title)}</h3><small>${esc(options.subtitle||'')}</small></div><button type="button" data-close>&times;</button></div><div class="bank-approval-body">${options.summaryHtml||''}<label class="bank-approval-label">${esc(options.bankLabel||'Bank')}</label><select class="form-select" data-bank><option value="">-- Select bank / payment method --</option>${options.methods.map(m=>{const usage=num(m.bankUsage),disabled=Number(m.status)!==1||usage<=0||usage<num(options.amount);return `<option value="${esc(m.id)}" ${String(m.id)===String(options.defaultBankId||'')?'selected':''} ${disabled?'disabled':''}>${esc(bankLabel(m))} · Usage ${money(usage)}${Number(m.status)===1?'':' [INACTIVE]'}${Number(m.status)===1&&usage<=0?' [NO USAGE]':Number(m.status)===1&&usage<num(options.amount)?' [INSUFFICIENT]':''}</option>`;}).join('')}</select><div class="funding-bank-detail" data-bank-detail>${fundingBankDetail(null,options.amount)}</div><label class="bank-approval-label mt-3">Admin Remark</label><textarea class="form-control" rows="3" data-remark placeholder="Optional admin remark"></textarea><div class="bank-approval-warning">${esc(options.warning||'')}</div></div><div class="bank-approval-foot"><button class="clean-btn" type="button" data-close>Cancel</button><button class="btn-primary-clean" type="button" data-confirm>${esc(options.confirmText||'Confirm')}</button></div></div></div>`;
      const style=document.createElement('style');style.textContent=`#bankApprovalPopup .bank-approval-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.46);display:flex;align-items:center;justify-content:center;padding:18px;z-index:99999}.bank-approval-dialog{width:min(600px,100%);background:#fff;border-radius:16px;box-shadow:0 24px 70px rgba(15,23,42,.25);overflow:hidden}.bank-approval-head{display:flex;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid #e5e7eb}.bank-approval-head h3{font-size:18px;margin:0 0 3px}.bank-approval-head small{color:#64748b}.bank-approval-head button{border:0;background:transparent;font-size:26px;line-height:1;color:#64748b}.bank-approval-body{padding:20px 22px}.bank-approval-summary{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:16px;line-height:1.55}.withdraw-destination-detail{margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0;display:grid;grid-template-columns:1fr 1fr;gap:7px 16px}.withdraw-destination-detail div,.funding-bank-grid div{display:flex;flex-direction:column;line-height:1.35}.withdraw-destination-detail span,.funding-bank-grid span{font-size:11px;color:#64748b}.withdraw-destination-detail b,.funding-bank-grid b{font-size:13px;color:#0f172a;overflow-wrap:anywhere}.bank-approval-label{display:block;font-weight:700;font-size:13px;margin-bottom:7px}.funding-bank-detail{margin-top:10px;padding:11px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px}.funding-bank-empty{font-size:12px;color:#64748b}.funding-bank-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px 16px}.funding-bank-grid .usage-deduct{color:#b91c1c}.funding-bank-grid .usage-available{color:#15803d}.funding-bank-grid .usage-unavailable{color:#b91c1c}.funding-bank-blocked{margin-top:10px;padding:9px 10px;border-radius:8px;background:#fff1f2;color:#b91c1c;font-size:12px;font-weight:600}.bank-approval-warning{font-size:12px;color:#b45309;margin-top:12px}.bank-approval-foot{display:flex;justify-content:flex-end;gap:10px;padding:16px 22px;border-top:1px solid #e5e7eb}@media(max-width:560px){.withdraw-destination-detail,.funding-bank-grid{grid-template-columns:1fr}}`;wrap.appendChild(style);document.body.appendChild(wrap);
      const bankSelect=wrap.querySelector('[data-bank]');const bankDetail=wrap.querySelector('[data-bank-detail]');
      const refreshBankDetail=()=>{const m=options.methods.find(x=>String(x.id)===String(bankSelect.value));bankDetail.innerHTML=fundingBankDetail(m,options.amount);};
      bankSelect.addEventListener('change',refreshBankDetail);refreshBankDetail();
      const finish=v=>{wrap.remove();resolve(v);};wrap.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>finish(null));wrap.querySelector('[data-confirm]').onclick=()=>{const bankId=bankSelect.value;if(!bankId){BO_DIALOG.alert('Please select the casino funding bank before approval.',{title:'Funding Bank Required',type:'error'});return;}const selected=options.methods.find(m=>String(m.id)===String(bankId));if(selected&&Number(selected.status)!==1){BO_DIALOG.alert('The selected bank/payment method is inactive. Please select an active bank.',{title:'Inactive Funding Bank',type:'error'});return;}const usage=num(selected?.bankUsage),withdraw=num(options.amount);if(usage<=0){BO_DIALOG.alert('This bank has 0.00 available Bank Usage and cannot fund a withdrawal. Please select another bank.',{title:'No Bank Usage Available',type:'error'});return;}if(withdraw>usage){BO_DIALOG.alert(`This bank only has MYR ${money(usage)} available Bank Usage, which is not enough for this MYR ${money(withdraw)} withdrawal.`,{title:'Insufficient Bank Usage',type:'error'});return;}finish({paymentMethodId:Number(bankId),paymentMethodLabel:selected?bankLabel(selected):'',bankUsage:usage,remainingUsage:usage-withdraw,adminRemark:wrap.querySelector('[data-remark]').value.trim()});};
    });
  }
  function tableBodyScroll(root){return root?.querySelector?.('.bo-tx-table-body')||document.getElementById('withdrawTableScroll')||document.querySelector('.table-card .bo-tx-table-body')||document.querySelector('.table-card .table-wrap')||document.querySelector('.table-wrap');}
  let lockedAutoSize=null;
  function naturalRowHeight(scroll){const sample=scroll?.querySelector('tbody tr:not(.bo-table-fill) td');return sample?Math.max(38,Math.round(sample.getBoundingClientRect().height)):44;}
  function measureAutoPageSize(){const scroll=tableBodyScroll();if(!scroll)return 12;const avail=Math.max(0,Math.floor(scroll.clientHeight));const rowH=naturalRowHeight(scroll);return Math.max(5,Math.min(200,Math.floor(avail/rowH)||12));}
  function autoFitPageSize(){if(lockedAutoSize!=null)return lockedAutoSize;lockedAutoSize=measureAutoPageSize();return lockedAutoSize;}
  function clearLockedAutoSize(){lockedAutoSize=null;}
  function isAutoPageSize(raw){const v=String(raw??'-').trim();return v===''||v==='-'||/^auto$/i.test(v);}
  function resolvePageSize(raw){const v=String(raw??'-').trim();if(isAutoPageSize(v))return autoFitPageSize();if(/^all$/i.test(v))return 10000;const n=Number(v);return Number.isFinite(n)&&n>0?n:autoFitPageSize();}
  function isPlaceholderRow(tr){const cells=tr.querySelectorAll('td');if(cells.length<=1)return true;const text=(tr.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();return !text||text.startsWith('loading')||text.startsWith('no withdraw');}
  function resetEvenFill(body,table){table.classList.remove('bo-tx-evenfill');table.style.height='';body.querySelectorAll('tr.bo-table-fill').forEach(r=>r.remove());[...body.querySelectorAll('tr')].forEach(tr=>{tr.style.height='';tr.querySelectorAll('td').forEach(td=>{td.style.height='';td.style.minHeight='';});});}
  function evenFillRowHeights(){const body=document.getElementById('withdrawBody');const scroll=tableBodyScroll(body?.closest('.table-wrap'));const table=body?.closest('table');if(!body||!scroll||!table)return;resetEvenFill(body,table);if(!isAutoPageSize(document.getElementById('withdrawSize')?.value))return;const rows=[...body.querySelectorAll('tr')].filter(tr=>!isPlaceholderRow(tr));if(!rows.length)return;void table.offsetHeight;const avail=Math.max(0,Math.floor(scroll.clientHeight));const natural=rows.reduce((sum,tr)=>sum+Math.ceil(tr.getBoundingClientRect().height),0);const rowH=Math.max(38,Math.round(natural/rows.length)||44);const gap=avail-natural;if(gap<2||gap>=rowH)return;const base=Math.floor(avail/rows.length);let rem=avail-(base*rows.length);if(base<=0)return;rows.forEach(tr=>{const h=base+(rem>0?1:0);if(rem>0)rem-=1;tr.style.height=h+'px';tr.querySelectorAll('td').forEach(td=>{td.style.height=h+'px';});});table.classList.add('bo-tx-evenfill');table.style.height=avail+'px';if(scroll.scrollHeight>scroll.clientHeight){const over=scroll.scrollHeight-scroll.clientHeight;const shrink=Math.ceil(over/rows.length)||1;rows.forEach(tr=>{const h=Math.max(rowH,(parseFloat(tr.style.height)||base)-shrink);tr.style.height=h+'px';tr.querySelectorAll('td').forEach(td=>{td.style.height=h+'px';});});table.style.height=Math.max(0,avail-over)+'px';}}
  function scheduleEvenFill(){requestAnimationFrame(()=>requestAnimationFrame(evenFillRowHeights));}
  function bindEvenFillObserver(){const scroll=tableBodyScroll();if(!scroll||scroll._boEvenFillObs)return;scroll._boEvenFillObs=new ResizeObserver(()=>{clearTimeout(scroll._boEvenFillTimer);scroll._boEvenFillTimer=setTimeout(evenFillRowHeights,32);});scroll._boEvenFillObs.observe(scroll);}
  function publishPagerMeta(pagination,pageSize){const card=document.querySelector('.table-card');if(!card)return;const total=Number(pagination?.totalElements);if(Number.isFinite(total)&&total>=0)card.dataset.boTotal=String(total);else delete card.dataset.boTotal;const size=Number(pageSize);if(Number.isFinite(size)&&size>0)card.dataset.boPageSize=String(size);else delete card.dataset.boPageSize;card.dataset.boPage=String(page);}
  function query(){const params=new URLSearchParams();const keyword=document.getElementById('withdrawKeyword')?.value.trim();const rawStatus=document.getElementById('withdrawStatus')?.value.trim();const status=rawStatus==='ALL'?'':rawStatus;const from=document.getElementById('withdrawFrom')?.value;const to=document.getElementById('withdrawTo')?.value;const size=resolvePageSize(document.getElementById('withdrawSize')?.value);if(keyword)params.set('keyword',keyword);if(status)params.set('status',status);if(from)params.set('dateFrom',from);if(to)params.set('dateTo',to);params.set('page',page);params.set('size',String(size));return params.toString();}
  async function loadApprovedWithdrawals(){
    let all=[],p=1,guard=0;
    const from=document.getElementById('withdrawFrom')?.value||'';
    const to=document.getElementById('withdrawTo')?.value||'';
    while(guard++<500){
      const params=new URLSearchParams({page:String(p),size:'100'});
      if(from)params.set('dateFrom',from);
      if(to)params.set('dateTo',to);
      const json=await api(endpoint('MEMBER_WITHDRAW_LIST')+'?'+params);
      const d=json.data||{};
      const rows=d.content||d.items||d.list||[];
      all.push(...rows.filter(r=>String(r?.status||'').toUpperCase()!=='REJECTED'));
      const pg=json.pagination||d.pagination||d;
      const totalPages=Number(pg.totalPages||1)||1;
      if(p>=totalPages||!rows.length)break;
      p++;
    }
    return all;
  }
  function withdrawBankKeys(m){return [m.id,m.displayName,m.bankName,m.accountName,m.accountNumber,m.payId].map(v=>String(v??'').trim().toLowerCase()).filter(Boolean);}
  /* The funding bank of a withdrawal row. One implementation for both the chips and the
     table's bank filter, so a bank's strip total is always the sum of the rows shown. */
  function matchWithdrawBank(row,methods){
    const id=String(row?.fundingPaymentMethodId??row?.paymentMethodId??'').trim();
    if(id){const exact=methods.find(m=>String(m.id)===id);if(exact)return exact;}
    const candidates=[row?.fundingPaymentMethod,row?.paymentMethod,row?.paymentMethodDisplayName,row?.paymentMethodBankName,row?.bankName].map(v=>String(v??'').trim().toLowerCase()).filter(Boolean);
    for(const c of candidates){const hit=methods.find(m=>withdrawBankKeys(m).includes(c));if(hit)return hit;}
    return null;
  }
  /* The date range on its own, every status but rejected: this is what the pending badges count.
     A pending request is news whether or not the table is currently showing approved rows. */
  async function loadDatedWithdrawals(){
    let all=[],p=1,guard=0;
    const from=document.getElementById('withdrawFrom')?.value||'';
    const to=document.getElementById('withdrawTo')?.value||'';
    while(guard++<500){
      const params=new URLSearchParams({page:String(p),size:'100'});
      if(from)params.set('dateFrom',from);
      if(to)params.set('dateTo',to);
      const json=await api(endpoint('MEMBER_WITHDRAW_LIST')+'?'+params);
      const d=json.data||{};
      const rows=d.content||d.items||d.list||[];
      all.push(...rows.filter(r=>String(r?.status||'').toUpperCase()!=='REJECTED'));
      const pg=json.pagination||d.pagination||d;
      const totalPages=Number(pg.totalPages||1)||1;
      if(p>=totalPages||!rows.length)break;
      p++;
    }
    return all;
  }

  /* Every row the table's current filters select — for the one case that must see more than
     one page: a bank is selected, and the table then shows only that bank's rows. The list
     endpoint has no bank parameter, so the bank is applied here with the same
     matchWithdrawBank() the matrix uses. BANK_BALANCE_API.md asks for the server-side
     parameter that would retire this. */
  async function loadBankRows(){
    const all=[];
    const kw=document.getElementById('withdrawKeyword')?.value.trim();
    const status=document.getElementById('withdrawStatus')?.value.trim();
    const from=document.getElementById('withdrawFrom')?.value||'';
    const to=document.getElementById('withdrawTo')?.value||'';
    let p=1,guard=0;
    while(guard++<500){
      const params=new URLSearchParams({page:String(p),size:'100'});
      if(kw)params.set('keyword',kw);
      if(status&&status!=='ALL')params.set('status',status);
      if(from)params.set('dateFrom',from);
      if(to)params.set('dateTo',to);
      const json=await api(endpoint('MEMBER_WITHDRAW_LIST')+'?'+params);
      const d=json.data||{};
      const rows=d.content||d.items||d.list||[];
      all.push(...rows);
      const pg=json.pagination||d.pagination||d;
      const totalPages=Number(pg.totalPages||1)||1;
      if(p>=totalPages||!rows.length)break;
      p++;
    }
    return all;
  }
  /* A card per bank, every bank complete without a click. `flow` is this bank's total under the
     table's current filters, so the figures beside the panel agree with the rows below it. */
  async function renderBankCards(){
    const host=bankHost();
    if(!host)return;
    // The grid's layout is keyed on this class rather than on the markup, so a page whose HTML
    // was cached before the matrix existed still gets it instead of the old 220px card grid.
    host.classList.add('bo-bank-chips');
    try{
      // Fresh payment methods: `bankUsage` moves with every approved deposit/withdrawal, so a
      // cached balance would print a stale number right after an approval.
      const [methods,dated,filtered]=await Promise.all([
        paymentMethods(true),loadDatedWithdrawals(),loadBankRows()
      ]);
      if(!methods.length){
        bankIndex=null;
        host.innerHTML='<span class="bo-bank-chip is-empty">No payment methods</span>';
        return;
      }
      // `dated` counts the pending requests (the date range only: a pending request is news
      // whether or not the table is showing approved rows). `filtered` sums every bank's total
      // under the table's own filters, which is what the Deposit column reports.
      const previous=bankIndex;
      bankIndex=new Map(methods.map(function(m){
        const name=String(m.bankName||m.displayName||('Bank #'+m.id)).trim();
        const usage=num(m.bankUsage);
        return [String(m.id),{id:m.id,name:name,label:window.BO_BANK_SELECTOR.detailLabel(m,name),
          balance:usage,
          // A missing or zero usage figure is reported as not available rather than as a real
          // 0.00: the field is what the withdrawal flow deducts from, and 0 there already means
          // "this bank cannot fund anything".
          balanceKnown:usage>0,pending:0,flow:0}];
      }));
      dated.forEach(function(r){
        const m=matchWithdrawBank(r,methods);
        if(!m)return;
        const entry=bankIndex.get(String(m.id));
        if(entry&&String(r?.status||'').toUpperCase()==='PENDING') entry.pending+=1;
      });
      filtered.forEach(function(r){
        const m=matchWithdrawBank(r,methods);
        if(!m)return;
        const entry=bankIndex.get(String(m.id));
        if(entry) entry.flow+=Math.abs(num(r.amount));
      });
      paintBankCards(host);
    }catch(e){
      bankIndex=null;
      host.innerHTML='<span class="bo-bank-chip is-empty">'+esc(e.message||'Failed to load')+'</span>';
    }
  }

  /* The three slots of one bank's card. Balance is the bank's own usage figure and Start is
     derived from it and the flow the table is showing; a figure that cannot be known prints `n/a`
     with the reason in its tooltip. */
  function bankColumns(){
    const cols=[];
    if(!bankIndex) return cols;
    bankIndex.forEach(function(bank){
      const hasBalance=bank.balanceKnown;
      // Withdrawals leave the bank, so the opening figure is the balance plus this range's
      // withdrawals. A figure that cannot be reconciled prints n/a with the reason in its
      // tooltip, never a guess.
      const derived=hasBalance?bank.balance+num(bank.flow):null;
      const hasStart=derived!=null&&derived>=0;
      cols.push({
        id:bank.id,name:bank.name,count:bank.pending,selected:String(bank.id)===String(selectedBankId),
        aria:[bank.name,num(bank.pending)>0?', '+num(bank.pending)+' pending':''].join(''),
        start:{value:derived,known:hasStart,text:'n/a',
          title:hasStart?'Balance plus the withdrawal in this range':'Not derivable from the current balance'},
        flow:{value:num(bank.flow),known:true,title:'Withdrawals in the range shown above'},
        balance:{value:bank.balance,known:hasBalance,text:'n/a',title:'Bank usage from the payment method list'}
      });
    });
    return cols;
  }

  function paintBankCards(host){
    const el=host||bankHost();
    if(!el||!window.BO_BANK_SELECTOR) return;
    el.innerHTML=window.BO_BANK_SELECTOR.bankCardsHtml(bankColumns(),money);
  }

  /* One selected bank at a time; clicking the selected column clears it. Selection decides which
     rows the table shows, and the column keeps its tint while the figures stay visible for every
     bank. Repainted in place rather than rebuilt: rebuilding would throw away the button the
     admin just clicked, and with it the keyboard focus. */
  function paintChipSelection(){
    const host=bankHost();
    if(!host)return;
    const current=selectedBankId==null?'':String(selectedBankId);
    Array.prototype.forEach.call(host.querySelectorAll('.bo-bank-chip[data-bank-id]'),function(btn){
      const on=String(btn.dataset.bankId)===current;
      btn.classList.toggle('is-selected',on);
      btn.setAttribute('aria-pressed',on?'true':'false');
      const col=btn.closest('.bo-bank-matrix-head');
      const cells=col?[col]:([]);
      // the three figure cells of the same column: they follow the head cell in the grid
      let next=col?col.nextElementSibling:null;
      for(let i=0;i<3&&next;i++){ cells.push(next); next=next.nextElementSibling; }
      cells.forEach(function(cell){ cell.classList.toggle('is-selected',on); });
    });
  }
  function selectBank(id){
    selectedBankId=(id==null||String(id)===String(selectedBankId))?null:String(id);
    page=1;
    paintChipSelection();
    load();
  }
  function formatBankLabel(row){
    const name=String(row?.bankName||'-').trim()||'-';
    const account=String(row?.bankAccount||'').trim();
    if(name==='-') return '-';
    return account?`${name} (${account})`:name;
  }
  function statusClass(status){status=String(status||'').toUpperCase();if(status==='APPROVED')return'active';if(status==='REJECTED')return'off';return'';}

  function render(rows,pagination){currentRows=rows;const body=document.getElementById('withdrawBody');if(!body)return;if(!rows.length)body.innerHTML='<tr><td colspan="9">No withdraw request found.</td></tr>';else body.innerHTML=rows.map(r=>{const pending=String(r.status||'').toUpperCase()==='PENDING';const bankLabel=formatBankLabel(r);return `<tr><td>${dtCell(r.createdAt||r.created_at)}</td><td>${esc(r.username||'-')}</td><td>${money(r.amount)}</td><td><b>${esc(bankLabel)}</b></td><td>${esc(r.referenceNo||'-')}</td><td>${esc(r.remark||'-')}</td><td><span class="status-pill ${statusClass(r.status)}">${esc(r.status||'-')}</span></td><td>${esc(dt(r.processedAt))}</td><td>${pending?`<div class="bo-tx-actions"><button type="button" class="bo-tx-action-btn is-approve" data-approve="${esc(r.id)}" title="Approve" aria-label="Approve"><i class="bi bi-check-lg" aria-hidden="true"></i></button><button type="button" class="bo-tx-action-btn is-reject" data-reject="${esc(r.id)}" title="Reject" aria-label="Reject"><i class="bi bi-x-lg" aria-hidden="true"></i></button></div>`:`<div class="bo-tx-actions"><a class="bo-tx-action-btn is-ledger" href="wallet-ledger.html?memberId=${encodeURIComponent(r.memberId)}" title="Ledger" aria-label="Ledger"><i class="bi bi-journal-text" aria-hidden="true"></i></a></div>`}</td></tr>`;}).join('');totalPages=Number(pagination?.totalPages)||1;const pageSize=resolvePageSize(document.getElementById('withdrawSize')?.value);publishPagerMeta(pagination,pageSize);document.getElementById('withdrawPager').innerHTML=pageButtons(page,totalPages);document.getElementById('withdrawPrevBtn').disabled=page<=1;document.getElementById('withdrawNextBtn').disabled=page>=totalPages;requestAnimationFrame(()=>scheduleEvenFill());}

  /* Only the newest load may paint. Selecting a bank reads every page of the current
     filters while a plain filter change reads one, so responses can arrive out of order and
     an older, unfiltered one would otherwise overwrite the bank-filtered table. */
  let loadToken=0;
  async function load(){const token=++loadToken;const body=document.getElementById('withdrawBody');if(body)body.innerHTML='<tr><td colspan="9">Loading withdraw requests...</td></tr>';try{if(selectedBankId!=null){
    // A bank is selected: the table shows that bank only, so the list is read for the
    // current filters and narrowed here (see loadBankRows). The same filters feed the matrix's
    // Withdraw column, so the figures and the rows always agree.
    const [rows,methods]=await Promise.all([loadBankRows(),paymentMethods().catch(()=>[])]);
    if(token!==loadToken) return;
    const mine=rows.filter(r=>{const m=matchWithdrawBank(r,methods);return !!m&&String(m.id)===String(selectedBankId);});
    const size=resolvePageSize(document.getElementById('withdrawSize')?.value);
    const pages=Math.max(1,Math.ceil(mine.length/size));
    if(page>pages) page=pages;
    render(mine.slice((page-1)*size,((page-1)*size)+size),{totalElements:mine.length,totalPages:pages});
    return;
  }const json=await api(endpoint('MEMBER_WITHDRAW_LIST')+'?'+query());if(token!==loadToken) return;const data=json.data||{};render(Array.isArray(data.content)?data.content:[],data.pagination||{});}catch(e){if(token!==loadToken) return;if(body)body.innerHTML='<tr><td colspan="9" class="text-danger">'+esc(e.message||'Load failed')+'</td></tr>';}}
  async function action(id,type){
    const row=currentRows.find(x=>String(x.id)===String(id));
    if(type==='reject'){
      const adminRemark=await BO_DIALOG.prompt(`Enter admin remark to reject this withdraw request${row?' #'+row.id+' ('+money(row.amount)+')':''}.`,'',{title:'Admin Remark',inputLabel:'Admin remark',confirmText:'Continue'});if(adminRemark===null)return;
      if(!(await BO_DIALOG.confirm('Confirm reject this withdraw request?',{title:'Confirm Withdrawal Rejection'})))return;
      try{const json=await api(endpoint('MEMBER_WITHDRAW_REJECT')+'/'+encodeURIComponent(id),{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Username':String(BO_AUTH.user()?.username||'ADMIN'),...BO_AUTH.authHeader()},body:JSON.stringify({adminRemark})});BO_DIALOG.alert(json.message||'Done',{title:'Withdraw Updated'});await load();await renderBankCards();document.dispatchEvent(new CustomEvent('bo:wallet-request-updated',{detail:{type:'withdraw',action:type,id:String(id)}}));}catch(e){BO_DIALOG.alert(e.message||'Action failed',{title:'Withdraw Action Failed',type:'error'});}return;
    }
    try{
      const methods=await paymentMethods();
      const picked=await approvalPopup({title:'Final Withdrawal Confirmation',subtitle:'Double-confirm the member payout destination and the casino bank funding this withdrawal.',methods,defaultBankId:'',amount:row?.amount,bankLabel:'Casino Funding Bank (Bank Usage Deduction)',confirmText:'Approve Withdrawal',warning:'Only the selected casino funding bank affects Bank Deposit Usage. Approved deposit = + usage; approved withdrawal = - usage. The member bank above is the payout destination only.',summaryHtml:`<div class="bank-approval-summary"><b>Member:</b> ${esc(row?.username||'-')} (#${esc(row?.memberId||'-')})<br><b>Withdraw Amount:</b> ${money(row?.amount)}<div class="withdraw-destination-detail"><div><span>Member Destination Bank</span><b>${esc(row?.bankName||'-')}</b></div><div><span>Account Name</span><b>${esc(row?.accountName||'-')}</b></div><div><span>Account Number</span><b>${esc(row?.bankAccount||'-')}</b></div><div><span>Reference</span><b>${esc(row?.referenceNo||'-')}</b></div></div></div>`});
      if(!picked)return;
      if(!(await BO_DIALOG.confirm(`Final check: approve ${money(row?.amount)} withdrawal and deduct -${money(row?.amount)} from ${picked.paymentMethodLabel||'the selected funding bank'}? Bank Usage will change from ${money(picked.bankUsage)} to ${money(picked.remainingUsage)}.`,{title:'Confirm Withdrawal Approval'})))return;
      const json=await api(endpoint('MEMBER_WITHDRAW_APPROVE')+'/'+encodeURIComponent(id),{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Username':String(BO_AUTH.user()?.username||'ADMIN'),...BO_AUTH.authHeader()},body:JSON.stringify({adminRemark:picked.adminRemark,fundingPaymentMethodId:picked.paymentMethodId})});BO_DIALOG.alert(json.message||'Done',{title:'Withdraw Updated'});await load();await renderBankCards();document.dispatchEvent(new CustomEvent('bo:wallet-request-updated',{detail:{type:'withdraw',action:type,id:String(id)}}));
    }catch(e){BO_DIALOG.alert(e.message||'Action failed',{title:'Withdraw Action Failed',type:'error'});}
  }
  // Action buttons are rendered dynamically, so use delegated clicks.
  // This keeps Approve / Reject working after load, search, pagination and refresh.
  document.addEventListener('click',e=>{
    const chip=e.target.closest?.('[data-bank-id]');
    if(chip){
      e.preventDefault();
      selectBank(chip.dataset.bankId);
      return;
    }
    const approveBtn=e.target.closest?.('[data-approve]');
    const rejectBtn=e.target.closest?.('[data-reject]');
    if(approveBtn){
      e.preventDefault();
      action(approveBtn.dataset.approve,'approve');
      return;
    }
    if(rejectBtn){
      e.preventDefault();
      action(rejectBtn.dataset.reject,'reject');
    }
  });

  async function refreshTxTabCounts(){
    const from=document.getElementById('withdrawFrom')?.value||'';
    const to=document.getElementById('withdrawTo')?.value||'';
    const status=document.getElementById('withdrawStatus')?.value||'';
    const statusFilter=status==='ALL'?'':status;
    async function count(key){const params=new URLSearchParams({page:'1',size:'1'});if(from)params.set('dateFrom',from);if(to)params.set('dateTo',to);if(statusFilter)params.set('status',statusFilter);const json=await api(endpoint(key)+'?'+params);const d=json.data||{};const pg=json.pagination||d.pagination||d;const n=Number(pg.totalElements);if(Number.isFinite(n))return Math.max(0,n);const rows=d.content||d.items||d.list||[];return rows.length;}
    try{const [d,w]=await Promise.all([count('MEMBER_DEPOSIT_LIST'),count('MEMBER_WITHDRAW_LIST')]);const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=String(v);};set('boTxCountDeposit',d);set('boTxCountWithdraw',w);set('boTxCountAll',d+w);}catch(_e){}
  }
  function syncTxTypeTabs(defaultType){
    const params=new URLSearchParams(location.search);
    const type=params.get('tab')==='all'?'all':defaultType;
    document.querySelectorAll('.bo-tx-tab[data-bo-tx-type]').forEach(a=>{
      const on=a.getAttribute('data-bo-tx-type')===type;
      a.classList.toggle('is-active',on);
      if(on) a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
    const read=sel=>{
      const el=document.querySelector(sel);
      const n=Number(String(el?.textContent||'').replace(/[^\d.-]/g,''));
      return Number.isFinite(n)?Math.max(0,Math.round(n)):0;
    };
    refreshTxTabCounts();
    const track=document.querySelector('.bo-tx-tabs');
    if(track&&window.BO_SEG_BOUNCE) window.BO_SEG_BOUNCE.mount(track,{button:':scope > .bo-tx-tab',anim:'bounce'});
  }

  const initWithdrawPage=()=>{
    syncTxTypeTabs('withdraw');
    let keywordTimer=0;
    const runSearch=()=>{page=1;clearLockedAutoSize();load();renderBankCards();};
    document.getElementById('withdrawKeyword')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(keywordTimer);runSearch();}});
    document.getElementById('withdrawKeyword')?.addEventListener('input',()=>{clearTimeout(keywordTimer);keywordTimer=setTimeout(runSearch,350);});
    document.getElementById('withdrawStatus')?.addEventListener('change',runSearch);
    document.getElementById('withdrawSize')?.addEventListener('change',()=>{clearLockedAutoSize();runSearch();});
    ['withdrawFrom','withdrawTo'].forEach(id=>document.getElementById(id)?.addEventListener('change',runSearch));
    document.getElementById('withdrawPrevBtn')?.addEventListener('click',()=>{if(page>1){page--;load();}});
    document.getElementById('withdrawNextBtn')?.addEventListener('click',()=>{if(page<totalPages){page++;load();}});
    document.getElementById('withdrawPager')?.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(!b)return;const n=Number(b.dataset.page);if(n>=1&&n<=totalPages&&n!==page){page=n;load();}});
    bindEvenFillObserver();
    const tableBodyScrollEl=document.getElementById('withdrawTableScroll');
    const tableHead=tableBodyScrollEl?.closest('.table-wrap')?.querySelector('.bo-tx-table-head');
    if(tableBodyScrollEl&&tableHead){
      tableBodyScrollEl.addEventListener('scroll',()=>{tableHead.scrollLeft=tableBodyScrollEl.scrollLeft;},{passive:true});
    }
    requestAnimationFrame(()=>requestAnimationFrame(async ()=>{
      try{await renderBankCards();}catch(e){}
      clearLockedAutoSize();
      load();
    }));
    let resizeTimer=0;
    window.addEventListener('resize',()=>{
        if(!isAutoPageSize(document.getElementById('withdrawSize')?.value)) return;
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(()=>{
        const prev=lockedAutoSize;
        clearLockedAutoSize();
        const next=autoFitPageSize();
        if(next!==prev){page=1;load();}
        else evenFillRowHeights();
      },180);
    });
  };
  // Keep an already-open Withdraw listing synchronized with the global realtime
  // notification poll. Use pending request IDs as well as the count so a new
  // withdrawal is detected even if another pending request disappeared in the
  // same polling interval and the numeric badge did not change.
  let realtimeWithdrawSignature='';
  let realtimeWithdrawTimer=0;
  document.addEventListener('bo:operation-counts',e=>{
    if(new URLSearchParams(location.search).get('tab')==='all')return;
    const detail=e?.detail||{};
    const ids=Array.isArray(detail.withdrawIds)?detail.withdrawIds.map(String).sort():[];
    const signature=String(Number(detail.withdraw||0)||0)+'|'+ids.join(',');
    if(signature===realtimeWithdrawSignature)return;
    const hadBaseline=realtimeWithdrawSignature!=='';
    realtimeWithdrawSignature=signature;
    clearTimeout(realtimeWithdrawTimer);
    realtimeWithdrawTimer=setTimeout(()=>{
      page=1;
      clearLockedAutoSize();
      load();
      renderBankCards().catch(()=>{});
    },hadBaseline?80:120);
  });

  window.addEventListener('pagehide',()=>{clearTimeout(realtimeWithdrawTimer);loadToken++;});
  window.addEventListener('pageshow',e=>{
    if(!e.persisted)return;
    page=1;clearLockedAutoSize();load();renderBankCards();
  });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initWithdrawPage,{once:true});
  else initWithdrawPage();
})();
