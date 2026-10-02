(function(){
  /* A swap re-runs this file against a fresh frame, so the window/document bindings below were
     added again on each entry: N entries meant N click/resize handlers and N online-presence
     timers polling every 5s. Release the previous run's bindings first; the handlers then
     always close over the frame on screen. */
  if(window.__boMmUnbind) window.__boMmUnbind();
  const unbinds=[];
  const listen=(target,type,fn,opt)=>{ target.addEventListener(type,fn,opt); unbinds.push(()=>target.removeEventListener(type,fn,opt)); };
  window.__boMmUnbind=()=>{ unbinds.forEach(fn=>fn()); unbinds.length=0; };

  let allMembers = [];
  let selectedWalletMember = null;
  let selectedWalletBalance = 0;
  let walletBankOptions = [];
  const bulkSelectedMemberIds = new Set();
  const MEMBER_WALLET_API = {
    balance: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MEMBER_WALLET_BALANCE,
    adjust: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MEMBER_WALLET_ADJUST,
    bankOptions: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MEMBER_WALLET_BANK_OPTIONS,
    bulkAdjust: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MEMBER_WALLET_BULK_ADJUST,
    providerAccounts: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MEMBER_WALLET_PROVIDER_ACCOUNTS,
    ledgerList: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.WALLET_LEDGER_LIST,
    betList: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.PROVIDER_BET_REPORT_LIST,
    bulkBonus: API_CONFIG.BASE_URL + (API_CONFIG.ENDPOINTS.MEMBER_BULK_BONUS_ADJUST || '/admin/operations/bulk-bonus')
  };
  const MONEY_KEYS = {
    deposit: ['deposit','totalDeposit','depositAmount','total_deposit'],
    withdraw: ['withdraw','totalWithdraw','withdrawAmount','total_withdraw'],
    winLoss: ['winLoss','win_loss','totalWinLoss','profitLoss'],
    bonus: ['bonus','totalBonus','bonusAmount'],
    manual: ['manual','manualAdjust','manualAmount'],
    commission: ['commission','totalCommission','commissionAmount']
  };
  const MEMBER_TABLE_COLUMNS = [
    {key:'select', label:'', always:true},
    {key:'no', label:'#'},
    {key:'registerDate', label:'Register Date'},
    {key:'name', label:'Name / Username', always:true},
    {key:'mobile', label:'Mobile'},
    {key:'mainWallet', label:'Main Wallet', always:true},
    {key:'status', label:'Status', always:true},
    {key:'webStatus', label:'Web Status'},
    {key:'vipLevel', label:'VIP Level'},
    {key:'lastLogin', label:'Last Login', extra:true},
    {key:'kycStatus', label:'KYC Status'},
    {key:'remark', label:'Remark', always:true},
    {key:'action', label:'Action', always:true},
    {key:'registerSource', label:'Register Domain + IP', extra:true},
    {key:'referCode', label:'Refer Code', extra:true},
    {key:'bankAccount', label:'Bank Account', extra:true},
    {key:'bank', label:'Bank'},
    {key:'referrer', label:'Referrer', extra:true},
    {key:'topReferrer', label:'Top Referrer', extra:true},
    {key:'deposit', label:'Deposit'},
    {key:'withdraw', label:'Withdraw'},
    {key:'winLoss', label:'Win/Loss'},
    {key:'bonus', label:'Bonus'},
    {key:'manual', label:'Manual', extra:true},
    {key:'commission', label:'Commission', extra:true},
    {key:'lastDeposit', label:'Last Deposit', extra:true},
    {key:'lastLoginSource', label:'Last Login IP + Domain', extra:true}
  ];
  const MAX_VISIBLE_MEMBER_COLUMNS = 12;
  /* Default View: Register Date · Name / Username · Mobile · Main Wallet · Status · Web Status · VIP · Last Login · KYC · Remark · Action */
  const DEFAULT_MEMBER_COLUMNS = ['select','registerDate','name','mobile','mainWallet','status','webStatus','vipLevel','lastLogin','kycStatus','remark','action'];
  const UNSORTABLE_COLS = new Set(['select','action']);
  let visibleMemberColumns = new Set(DEFAULT_MEMBER_COLUMNS);
  let memberCurrentPage = 1;
  let memberPageSize = 12;
  let memberFilteredRows = [];
  let lockedAutoSize = null;
  let memberSortKey = 'registerDate';
  let memberSortDir = 'desc';

  function tableBodyScroll(){
    return document.querySelector('.table-card > .table-wrap') || document.querySelector('.table-wrap');
  }
  function measureAutoPageSize(){
    const scroll=tableBodyScroll();
    if(!scroll) return 12;
    const head=scroll.querySelector('thead');
    const headH=head?Math.ceil(head.getBoundingClientRect().height):44;
    const avail=Math.max(0,Math.floor(scroll.clientHeight)-headH);
    const sample=scroll.querySelector('tbody tr td');
    const rowH=sample?Math.max(38,Math.round(sample.getBoundingClientRect().height)):41;
    return Math.max(5,Math.min(200,Math.floor(avail/rowH)||12));
  }
  function autoFitPageSize(){
    if(lockedAutoSize!=null) return lockedAutoSize;
    lockedAutoSize=measureAutoPageSize();
    return lockedAutoSize;
  }
  function clearLockedAutoSize(){ lockedAutoSize=null; }
  function isAutoPageSize(raw){
    const v=String(raw??'-').trim();
    return v===''||v==='-'||/^auto$/i.test(v);
  }
  function resolvePageSize(raw){
    const v=String(raw??document.getElementById('memberPageSize')?.value??'-').trim();
    if(isAutoPageSize(v)) return autoFitPageSize();
    if(/^all$/i.test(v)) return 10000;
    const n=Number(v);
    return Number.isFinite(n)&&n>0?n:autoFitPageSize();
  }
  function syncMemberPageSize(){
    memberPageSize=resolvePageSize(document.getElementById('memberPageSize')?.value);
  }
  function isPlaceholderRow(tr){
    const cells=tr?.querySelectorAll('td');
    if(!cells||cells.length<=1) return true;
    const text=(tr.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    return !text||text==='loading members...'||text.startsWith('no member')||text.startsWith('load member failed');
  }
  function resetEvenFill(){
    const body=document.querySelector('.user-main-table tbody');
    const table=body?.closest('table');
    if(!body||!table) return;
    table.classList.remove('bo-tx-evenfill');
    table.style.height='';
    body.querySelectorAll('tr.bo-table-fill').forEach(r=>r.remove());
    [...body.querySelectorAll('tr')].forEach(tr=>{
      tr.style.height='';
      tr.querySelectorAll('td').forEach(td=>{td.style.height='';td.style.minHeight='';});
    });
  }
  function evenFillRowHeights(){
    const body=document.querySelector('.user-main-table tbody');
    const scroll=tableBodyScroll();
    const table=body?.closest('table');
    if(!body||!scroll||!table) return;
    resetEvenFill();
    if(!isAutoPageSize(document.getElementById('memberPageSize')?.value)) return;
    const rows=[...body.querySelectorAll('tr')].filter(tr=>!isPlaceholderRow(tr));
    if(!rows.length) return;
    void table.offsetHeight;
    const head=table.querySelector('thead');
    const headH=head?Math.ceil(head.getBoundingClientRect().height):0;
    const avail=Math.max(0, Math.floor(scroll.clientHeight)-headH);
    const natural=rows.reduce((sum,tr)=>sum+Math.ceil(tr.getBoundingClientRect().height),0);
    const rowH=Math.max(38, Math.round(natural/rows.length)||44);
    const gap=avail-natural;
    /* Stretch only when leftover is a seam (not enough for one more full row). */
    if(gap<2||gap>=rowH) return;
    const base=Math.floor(avail/rows.length);
    let rem=avail-(base*rows.length);
    if(base<=0) return;
    rows.forEach(tr=>{
      const h=base+(rem>0?1:0);
      if(rem>0) rem-=1;
      tr.style.height=h+'px';
      tr.querySelectorAll('td').forEach(td=>{td.style.height=h+'px';});
    });
    table.classList.add('bo-tx-evenfill');
    table.style.height=(avail+headH)+'px';
    if(scroll.scrollHeight>scroll.clientHeight){
      const over=scroll.scrollHeight-scroll.clientHeight;
      const shrink=Math.ceil(over/rows.length)||1;
      rows.forEach(tr=>{
        const h=Math.max(rowH, (parseFloat(tr.style.height)||base)-shrink);
        tr.style.height=h+'px';
        tr.querySelectorAll('td').forEach(td=>{td.style.height=h+'px';});
      });
      table.style.height=Math.max(0, avail+headH-over)+'px';
    }
  }
  function scheduleEvenFill(){
    requestAnimationFrame(()=>requestAnimationFrame(evenFillRowHeights));
  }
  function bindEvenFillObserver(){
    const scroll=tableBodyScroll();
    if(!scroll||scroll._boEvenFillObs) return;
    scroll._boEvenFillObs=new ResizeObserver(()=>{
      clearTimeout(scroll._boEvenFillTimer);
      scroll._boEvenFillTimer=setTimeout(evenFillRowHeights,32);
    });
    scroll._boEvenFillObs.observe(scroll);
    return scroll._boEvenFillObs;
  }

  function memberPageButtons(current,total){
    total=Math.max(1,Number(total)||1); current=Math.max(1,Math.min(Number(current)||1,total));
    const pages=[]; const add=n=>{if(n>=1&&n<=total&&!pages.includes(n))pages.push(n);};
    add(1); for(let n=current-2;n<=current+2;n++) add(n); add(total); pages.sort((a,b)=>a-b);
    let html='<div class="smart-pagination" role="navigation" aria-label="Member table pagination">';
    html+='<button type="button" class="smart-page first" data-member-page="1" '+(current<=1?'disabled':'')+' title="First page"><i class="bi bi-chevron-bar-left"></i></button>';
    let prev=0; pages.forEach(n=>{if(prev&&n-prev>1)html+='<span class="smart-page-ellipsis">…</span>'; html+='<button type="button" class="smart-page '+(n===current?'active':'')+'" data-member-page="'+n+'" '+(n===current?'aria-current="page"':'')+'>'+n+'</button>'; prev=n;});
    html+='<button type="button" class="smart-page last" data-member-page="'+total+'" '+(current>=total?'disabled':'')+' title="Last page"><i class="bi bi-chevron-bar-right"></i></button></div>';
    return html;
  }


  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  async function api(url,opt){const r=await fetch(url,opt||{});const j=await r.json().catch(()=>({}));if(!r.ok||j.status==='error')throw new Error(j.message||'Request failed');return j;}
  function val(id){const el=document.getElementById(id); return el ? String(el.value||'').trim().toLowerCase() : '';}
  function first(m, keys, fallback='-'){
    for(const k of keys){ if(m && m[k] !== undefined && m[k] !== null && String(m[k]).trim() !== '') return m[k]; }
    return fallback;
  }
  function num(v){
    if(v === undefined || v === null || v === '') return 0;
    const n = Number(String(v).replace(/,/g,''));
    return Number.isFinite(n) ? n : 0;
  }
  function money(v){ return num(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function dt(v){ return window.BO_FORMAT && window.BO_FORMAT.dateTime ? window.BO_FORMAT.dateTime(v) : (v ? String(v).replace('T',' ').slice(0,19) : '-'); }
  function dtParts(v){
    const full=dt(v);
    if(!full||full==='-') return {full:'-',day:'-',time:''};
    const m=String(full).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(.+)$/);
    if(m){
      const raw=String(m[4]).trim();
      const tm=raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      const time=tm
        ? `${String(tm[1]).padStart(2,'0')}:${tm[2]}:${tm[3]||'00'}`
        : raw.slice(0,8);
      const day=`${String(m[3]).padStart(2,'0')}/${String(m[2]).padStart(2,'0')}/${m[1]}`;
      return {full,day,time};
    }
    return {full,day:full,time:''};
  }
  function dtCell(v){
    const p=dtParts(v);
    if(p.full==='-') return '<span class="mad-muted">-</span>';
    if(!p.time) return `<span class="bo-tx-datetime">${esc(p.day)}</span>`;
    return `<span class="bo-tx-datetime" tabindex="0" data-tip="${esc(p.time)}">${esc(p.day)}</span>`;
  }
  function ensureTimeTip(){
    let tip=document.getElementById('umTimeTip');
    if(tip) return tip;
    tip=document.createElement('div');
    tip.id='umTimeTip';
    tip.className='um-time-tip';
    tip.setAttribute('role','tooltip');
    tip.setAttribute('aria-hidden','true');
    document.body.appendChild(tip);
    return tip;
  }
  function placeTimeTip(el){
    const tip=ensureTimeTip();
    const text=el.getAttribute('data-tip')||'';
    if(!text){ hideTimeTip(); return; }
    tip.textContent=text;
    tip.classList.add('is-on');
    tip.classList.remove('is-below');
    const r=el.getBoundingClientRect();
    const tr=tip.getBoundingClientRect();
    let top=r.top-tr.height-8;
    let below=false;
    if(top<8){
      below=true;
      top=r.bottom+8;
    }
    tip.classList.toggle('is-below', below);
    const left=Math.max(8,Math.min(r.left+r.width/2-tr.width/2, window.innerWidth-tr.width-8));
    tip.style.left=Math.round(left)+'px';
    tip.style.top=Math.round(top)+'px';
  }
  function hideTimeTip(){
    const tip=document.getElementById('umTimeTip');
    if(tip) tip.classList.remove('is-on','is-below');
  }
  function bindTimeTips(){
    const body=document.querySelector('.user-main-table tbody');
    if(!body||body.dataset.tipBound==='1') return;
    body.dataset.tipBound='1';
    body.addEventListener('mouseover',e=>{
      const el=e.target.closest?.('.bo-tx-datetime[data-tip]');
      if(el) placeTimeTip(el);
    });
    body.addEventListener('mouseout',e=>{
      const el=e.target.closest?.('.bo-tx-datetime[data-tip]');
      if(!el) return;
      const next=e.relatedTarget;
      if(next&&el.contains(next)) return;
      hideTimeTip();
    });
    body.addEventListener('focusin',e=>{
      const el=e.target.closest?.('.bo-tx-datetime[data-tip]');
      if(el) placeTimeTip(el);
    });
    body.addEventListener('focusout',e=>{
      const el=e.target.closest?.('.bo-tx-datetime[data-tip]');
      if(!el) return;
      const next=e.relatedTarget;
      if(next&&el.contains(next)) return;
      hideTimeTip();
    });
    listen(window,'scroll',hideTimeTip,true);
    listen(window,'resize',hideTimeTip);
  }
  function signedAmount(type, amount){
    const n = num(amount);
    if(type === 'WITHDRAW') return -Math.abs(n);
    if(type === 'ADJUSTMENT') return n;
    return Math.abs(n);
  }
  function walletStatus(msg, type){ const el=document.getElementById('walletModalStatus'); if(el){ el.textContent=msg||''; el.className='upload-status' + (type ? ' ' + type : ''); } }
  function walletResult(data){ const el=document.getElementById('walletModalResult'); if(el) el.textContent = data ? JSON.stringify(data, null, 2) : ''; }
  function setWalletTab(name){
    document.querySelectorAll('[data-wallet-tab]').forEach(btn=>btn.classList.toggle('active', btn.dataset.walletTab === name));
    document.querySelectorAll('[data-wallet-pane]').forEach(pane=>pane.classList.toggle('active', pane.dataset.walletPane === name));
    if(name === 'provider') loadWalletProviderAccounts().catch(err=>renderProviderError(err.message));
    if(name === 'ledger') loadWalletLedgerPreview().catch(err=>renderLedgerError(err.message));
    if(name === 'bet') loadWalletBetPreview().catch(err=>renderBetError(err.message));
    if(name === 'insight') loadGameInsight().catch(err=>renderInsightError(err.message));
  }
  function memberIdOfSelected(){ return selectedWalletMember ? first(selectedWalletMember,['id','memberId','userId'], '') : ''; }
  function infoGrid(items){ return '<div class="wallet-balance-box">' + items.map(([k,v])=>`<div class="mini-box"><span>${esc(k)}</span><b style="font-size:15px">${esc(v || '-')}</b></div>`).join('') + '</div>'; }
  function renderMemberInfo(member){
    const profile = document.getElementById('walletProfileInfo');
    const bank = document.getElementById('walletBankInfo');
    if(profile) profile.innerHTML = infoGrid([
      ['Username', first(member,['username'], '-')], ['Full Name', first(member,['fullName','name','displayName'], '-')],
      ['Mobile', first(member,['mobile','phone','mobileNo'], '-')], ['Status', memberStatus(member)],
      ['Referrer', first(member,['referrerName','referrerFullName','referrerUsername','agentName','referrer'], '-')], ['Top Referrer', first(member,['topReferrer','topAgent','upline'], '-')],
      ['Register Date', dt(first(member,['createdAt','registerDate','created_at'], ''))], ['Last Login', dt(first(member,['lastLoginAt','lastLogin','last_login_at'], ''))],
      ['Last Deposit', dt(first(member,['lastDepositAt','lastDeposit','last_deposit_at'], ''))], ['Admin Remark', first(member,['adminRemark'], '-') ]
    ]);
    fillAdminRemark(member);
    if(bank) bank.innerHTML = infoGrid([
      ['Bank', first(member,['bank','bankName'], '-')], ['Bank Account', first(member,['bankAccount','bankAccountNumber','bankAccountNo','accountNo'], '-')],
      ['Account Name', first(member,['bankAccountName','accountName','fullName','name'], '-')], ['Bank BSB', first(member,['bankBsb'], '-')],
      ['Pay ID', first(member,['payId'], '-')], ['Show BSB', Number(first(member,['showBankBsb'],1))===1?'Yes':'No'], ['Show Pay ID', Number(first(member,['showPayId'],1))===1?'Yes':'No']
    ]);
  }
  function fillAdminRemark(member){
    const input=document.getElementById('memberAdminRemark'); if(input) input.value=String(first(member,['adminRemark'],'')||'');
    const meta=document.getElementById('memberAdminRemarkMeta'); if(meta){const by=String(first(member,['adminRemarkUpdatedBy'],'')||'');const at=String(first(member,['adminRemarkUpdatedAt'],'')||'');meta.textContent=(by||at)?('Last updated'+(by?' by '+by:'')+(at?' · '+dt(at):'')):'No remark yet.';}
    securityStatus('memberAdminRemarkStatus','','');
  }
  async function saveMemberAdminRemark(){
    const memberId=memberIdOfSelected(); if(!memberId)return; const remark=String(document.getElementById('memberAdminRemark')?.value||'').trim(); if(remark.length>500){securityStatus('memberAdminRemarkStatus','Remark maximum 500 characters.','error');return;}
    try{securityStatus('memberAdminRemarkStatus','Saving...','');const json=await api(API_CONFIG.BASE_URL+'/admin/member/remark/'+encodeURIComponent(memberId),{method:'POST',headers:{'Content-Type':'application/json',...BO_AUTH.authHeader()},body:JSON.stringify({remark})});const d=json.data||{};[selectedWalletMember,allMembers.find(m=>String(memberKey(m))===String(memberId))].filter(Boolean).forEach(x=>{x.adminRemark=d.adminRemark||'';x.adminRemarkUpdatedBy=d.adminRemarkUpdatedBy||'';x.adminRemarkUpdatedAt=d.adminRemarkUpdatedAt||'';});fillAdminRemark(selectedWalletMember||d);applySearch(false);securityStatus('memberAdminRemarkStatus',json.message||'Remark saved.','success');}catch(err){securityStatus('memberAdminRemarkStatus',err.message||'Save remark failed.','error');}
  }
  function fillBankEdit(member){
    const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.value = v == null ? '' : v; };
    set('editBankName', first(member,['bankName','bank'], ''));
    set('editBankAccountName', first(member,['bankAccountName','accountName','fullName','name'], ''));
    set('editBankAccountNumber', first(member,['bankAccountNumber','bankAccount','bankAccountNo','accountNo'], ''));
    set('editBankBsb', first(member,['bankBsb'], ''));
    set('editPayId', first(member,['payId'], ''));
    set('editShowBankBsb', Number(first(member,['showBankBsb'],1))===1 ? '1' : '0');
    set('editShowPayId', Number(first(member,['showPayId'],1))===1 ? '1' : '0');
  }
  function bankStatus(msg,type){ const el=document.getElementById('bankProfileStatus'); if(el){ el.textContent=msg||''; el.className='upload-status' + (type ? ' ' + type : ''); } }
  function securityStatus(id,msg,type){ const el=document.getElementById(id); if(el){ el.textContent=msg||''; el.className='upload-status' + (type ? ' ' + type : ''); } }

  function renderInsightRows(targetId, rows, frequent){
    const body=document.getElementById(targetId); if(!body) return;
    if(!Array.isArray(rows)||!rows.length){body.innerHTML='<tr><td colspan="6">No settled game records found.</td></tr>';return;}
    body.innerHTML=rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.providerCode||'-')}</td><td>${esc(r.gameCode||'-')}</td>${frequent?`<td>${num(r.playCount)}</td><td>${money(r.totalTurnover)}</td>`:`<td>${money(r.totalTurnover)}</td><td>${num(r.playCount)}</td>`}<td>${dt(r.lastPlayedAt)}</td></tr>`).join('');
  }
  function renderInsightError(message){['walletTopTurnoverBody','walletFrequentGamesBody'].forEach(id=>{const b=document.getElementById(id);if(b)b.innerHTML='<tr><td colspan="6">'+esc(message||'Unable to load game insight')+'</td></tr>';});}
  async function loadGameInsight(){
    const memberId=memberIdOfSelected(); if(!memberId)return;
    const json=await api(API_CONFIG.BASE_URL+API_CONFIG.ENDPOINTS.MEMBER_GAME_INSIGHT+'/'+encodeURIComponent(memberId)+'?limit=10',{headers:BO_AUTH.authHeader()});
    const data=json.data||{}; renderInsightRows('walletTopTurnoverBody',data.highestTurnover||[],false); renderInsightRows('walletFrequentGamesBody',data.frequentGames||[],true);
  }
  async function resetMemberPassword(){
    const memberId=memberIdOfSelected(); if(!memberId) return;
    const password=document.getElementById('memberNewPassword')?.value || '';
    const confirmPassword=document.getElementById('memberConfirmPassword')?.value || '';
    if(password.length<8 || password.length>20){ securityStatus('memberPasswordStatus','Password must be 8 - 20 characters.','error'); return; }
    if(password!==confirmPassword){ securityStatus('memberPasswordStatus','Confirm password does not match.','error'); return; }
    try{
      securityStatus('memberPasswordStatus','Resetting password...','');
      const json=await api(API_CONFIG.BASE_URL+'/admin/member/reset-password/'+encodeURIComponent(memberId),{method:'POST',headers:{'Content-Type':'application/json',...BO_AUTH.authHeader()},body:JSON.stringify({password,confirmPassword})});
      securityStatus('memberPasswordStatus',json.message||'Login password reset successfully.','success');
      document.getElementById('memberNewPassword').value=''; document.getElementById('memberConfirmPassword').value='';
    }catch(err){ securityStatus('memberPasswordStatus',err.message||'Password reset failed.','error'); }
  }
  async function resetMemberTransactionPassword(){
    const memberId=memberIdOfSelected(); if(!memberId) return;
    const password=document.getElementById('memberNewTransactionPassword')?.value || '';
    const confirmPassword=document.getElementById('memberConfirmTransactionPassword')?.value || '';
    if(password.length<6 || password.length>20){ securityStatus('memberTransactionPasswordStatus','Transaction password must be 6 - 20 characters.','error'); return; }
    if(password!==confirmPassword){ securityStatus('memberTransactionPasswordStatus','Confirm password does not match.','error'); return; }
    try{
      securityStatus('memberTransactionPasswordStatus','Resetting transaction password...','');
      const json=await api(API_CONFIG.BASE_URL+'/admin/member/reset-transaction-password/'+encodeURIComponent(memberId),{method:'POST',headers:{'Content-Type':'application/json',...BO_AUTH.authHeader()},body:JSON.stringify({password,confirmPassword})});
      securityStatus('memberTransactionPasswordStatus',json.message||'Transaction password reset successfully.','success');
      document.getElementById('memberNewTransactionPassword').value=''; document.getElementById('memberConfirmTransactionPassword').value='';
      if(selectedWalletMember) selectedWalletMember.hasTransactionPassword=true;
    }catch(err){ securityStatus('memberTransactionPasswordStatus',err.message||'Transaction password reset failed.','error'); }
  }
  async function saveBankProfile(){
    if(!selectedWalletMember) return;
    const memberId = memberIdOfSelected();
    const payload = {
      bankName: document.getElementById('editBankName')?.value || '',
      bankAccountName: document.getElementById('editBankAccountName')?.value || '',
      bankAccountNumber: document.getElementById('editBankAccountNumber')?.value || '',
      bankBsb: document.getElementById('editBankBsb')?.value || '',
      payId: document.getElementById('editPayId')?.value || '',
      showBankBsb: Number(document.getElementById('editShowBankBsb')?.value || 0),
      showPayId: Number(document.getElementById('editShowPayId')?.value || 0)
    };
    try{
      bankStatus('Saving...', '');
      const json = await api(BO_AUTH.memberUpdateUrl(memberId), {method:'POST', headers:{'Content-Type':'application/json', ...BO_AUTH.authHeader()}, body: JSON.stringify(payload)});
      bankStatus(json.message || 'Saved.', 'success');
      await loadMembers();
      const latest = allMembers.find(m => String(first(m,['id','memberId','userId'], '')) === String(memberId));
      if(latest){ selectedWalletMember = latest; renderMemberInfo(latest); fillBankEdit(latest); }
    }catch(err){ bankStatus(err.message || 'Save failed', 'error'); }
  }
  function renderProviderError(message){ const body=document.getElementById('walletProviderBody'); if(body) body.innerHTML = '<tr><td colspan="7" class="text-danger">'+esc(message || 'Load provider accounts failed')+'</td></tr>'; }
  function renderLedgerError(message){ const body=document.getElementById('walletLedgerPreviewBody'); if(body) body.innerHTML = '<tr><td colspan="7" class="text-danger">'+esc(message || 'Load ledger failed')+'</td></tr>'; }
  function renderBetError(message){ const body=document.getElementById('walletBetPreviewBody'); if(body) body.innerHTML = '<tr><td colspan="8" class="text-danger">'+esc(message || 'Load bet records failed')+'</td></tr>'; }
  async function loadWalletProviderAccounts(){
    const body=document.getElementById('walletProviderBody'); if(!body) return;
    const memberId = memberIdOfSelected(); if(!memberId) return;
    body.innerHTML = '<tr><td colspan="7">Loading provider accounts...</td></tr>';
    const json = await api(MEMBER_WALLET_API.providerAccounts + '?memberId=' + encodeURIComponent(memberId), {headers:{...BO_AUTH.authHeader()}});
    const raw = json.data || [];
    const rows = Array.isArray(raw) ? raw : (Array.isArray(raw.content) ? raw.content : []);
    if(!rows.length){ body.innerHTML = '<tr><td colspan="7">No provider account found.</td></tr>'; return; }
    body.innerHTML = rows.map(r=>`<tr>
      <td><b>${esc(first(r,['providerCode','provider','code'], '-'))}</b></td>
      <td>${esc(first(r,['providerUsername','accountId','username','playerId'], '-'))}</td>
      <td>${money(first(r,['balance','providerBalance','walletBalance'],0))}</td>
      <td>${money(first(r,['totalBet'],0))}</td>
      <td>${money(first(r,['totalWin'],0))}</td>
      <td>${money(first(r,['totalLose'],0))}</td>
      <td><span class="status-pill">${esc(first(r,['status'], '-'))}</span></td>
    </tr>`).join('');
  }
  async function loadWalletLedgerPreview(){
    const body=document.getElementById('walletLedgerPreviewBody'); if(!body) return;
    const memberId = memberIdOfSelected(); if(!memberId) return;
    const link=document.getElementById('walletOpenLedgerPage'); if(link) link.href = 'wallet-ledger.html?memberId=' + encodeURIComponent(memberId);
    body.innerHTML = '<tr><td colspan="7">Loading latest ledger...</td></tr>';
    const params = new URLSearchParams({memberId:String(memberId), page:'1', size:'10'});
    const json = await api(MEMBER_WALLET_API.ledgerList + '?' + params.toString(), {headers:{...BO_AUTH.authHeader()}});
    const data = json.data || {};
    const rows = Array.isArray(data.content) ? data.content : (Array.isArray(data) ? data : []);
    if(!rows.length){ body.innerHTML = '<tr><td colspan="7">No ledger record found.</td></tr>'; return; }
    body.innerHTML = rows.map(r=>`<tr>
      <td>${esc(dt(first(r,['createdAt','created_at'], '')))}</td>
      <td><span class="status-pill">${esc(first(r,['ledgerType','type'], '-'))}</span></td>
      <td>${esc(first(r,['providerCode'], '-'))}</td>
      <td><b class="${num(first(r,['amount'],0)) < 0 ? 'text-danger' : 'text-success'}">${money(first(r,['amount'],0))}</b></td>
      <td>${money(first(r,['beforeBalance'],0))}</td>
      <td>${money(first(r,['afterBalance'],0))}</td>
      <td><small>${esc(first(r,['referenceNo','externalTxId'], '-'))}</small></td>
    </tr>`).join('');
  }
  async function loadWalletBetPreview(){
    const body=document.getElementById('walletBetPreviewBody'); if(!body) return;
    const memberId = memberIdOfSelected(); if(!memberId) return;
    const link=document.getElementById('walletOpenBetPage'); if(link) link.href = 'provider-bet-report.html?memberId=' + encodeURIComponent(memberId);
    body.innerHTML = '<tr><td colspan="8">Loading latest bet records...</td></tr>';
    const params = new URLSearchParams({memberId:String(memberId), page:'1', size:'10'});
    const json = await api(MEMBER_WALLET_API.betList + '?' + params.toString(), {headers:{...BO_AUTH.authHeader()}});
    const data = json.data || {};
    const rows = Array.isArray(data.content) ? data.content : (Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []));
    if(!rows.length){ body.innerHTML = '<tr><td colspan="8">No bet record found.</td></tr>'; return; }
    body.innerHTML = rows.map(r=>{
      const bet = first(r,['betAmount','transferAmount','amount'],0);
      const win = first(r,['winAmount','transferBackAmount','payoutAmount'],0);
      const net = first(r,['netAmount','winLoss'], num(win)-num(bet));
      return `<tr>
      <td>${esc(dt(first(r,['createdAt','startedAt','betTime','created_at'], '')))}</td>
      <td>${esc(first(r,['providerCode','provider'], '-'))}</td>
      <td>${esc(first(r,['gameName','gameCode','gameId'], '-'))}</td>
      <td><small>${esc(first(r,['betId','txId','roundId','transactionId','id'], '-'))}</small></td>
      <td>${money(bet)}</td>
      <td>${money(first(r,['validBetAmount','validAmount','turnover','transferAmount'],0))}</td>
      <td>${money(win)}</td>
      <td><b class="${num(net) < 0 ? 'text-danger' : 'text-success'}">${money(net)}</b></td>
    </tr>`;
    }).join('');
  }

  function walletBankText(b){
    const name=first(b,['bankName','displayName'],'Bank');
    const display=first(b,['displayName'],'');
    const acct=first(b,['accountNumber'],'');
    return [name, display && display!==name ? display : '', acct].filter(Boolean).join(' · ');
  }
  function renderWalletBankOptions(){
    const type=document.getElementById('walletAdjustType')?.value||'DEPOSIT';
    const amount=Math.abs(Number(document.getElementById('walletAdjustAmount')?.value||0));
    const field=document.getElementById('walletBankField'), select=document.getElementById('walletPaymentMethodId');
    const label=document.getElementById('walletBankLabel'), hint=document.getElementById('walletBankHint');
    if(!field||!select)return;
    if(type==='ADJUSTMENT'){ field.hidden=true; select.value=''; return; }
    field.hidden=false;
    if(label)label.textContent=type==='DEPOSIT'?'Casino Receiving Bank':'Casino Funding Bank';
    const current=select.value;
    select.innerHTML='<option value="">-- Select casino bank / payment method --</option>'+walletBankOptions.map(b=>{
      const usage=num(b.usage);
      const insufficient=type==='WITHDRAW' && (usage<=0 || (amount>0 && usage<amount));
      const status=type==='WITHDRAW'?' · Usage MYR '+money(usage)+(insufficient?' · INSUFFICIENT':''):'';
      return '<option value="'+esc(b.id)+'" '+(insufficient?'disabled':'')+'>'+esc(walletBankText(b)+status)+'</option>';
    }).join('');
    if([...select.options].some(o=>o.value===current&&!o.disabled)) select.value=current;
    if(hint) hint.textContent=type==='DEPOSIT'
      ? 'This manual topup adds to the selected bank usage.'
      : 'This manual withdrawal deducts from the selected bank usage. Banks with 0.00 or insufficient usage are disabled.';
  }
  async function loadWalletBankOptions(){
    const json=await api(MEMBER_WALLET_API.bankOptions,{headers:{...BO_AUTH.authHeader()}});
    walletBankOptions=Array.isArray(json.data)?json.data:[];
    renderWalletBankOptions();
  }

  function updateWalletPreview(){
    const type = document.getElementById('walletAdjustType')?.value || 'DEPOSIT';
    const amount = document.getElementById('walletAdjustAmount')?.value || 0;
    const next = selectedWalletBalance + signedAmount(type, amount);
    const el=document.getElementById('walletNewBalance'); if(el) el.textContent = '$' + money(next);
  }
  async function loadMemberWallet(memberId){
    const json = await api(MEMBER_WALLET_API.balance + '?memberId=' + encodeURIComponent(memberId), {headers:{...BO_AUTH.authHeader()}});
    const balance = num(json && json.data && json.data.balance);
    selectedWalletBalance = balance;
    const bal=document.getElementById('walletCurrentBalance'); if(bal) bal.textContent = '$' + money(balance);
    updateWalletPreview();
    walletResult(json.data);
  }
  function openWalletModal(member){
    const id = first(member,['id','memberId','userId'], '');
    if(!id) return;
    window.location.href = 'member-detail.html?memberId=' + encodeURIComponent(id);
  }
  function closeWalletModal(){ /* Member detail is a standalone page now. */ }
  async function submitWalletAdjust(){
    if(!selectedWalletMember) return;
    const memberId = first(selectedWalletMember,['id','memberId','userId'], '');
    const type = document.getElementById('walletAdjustType').value;
    const amount = document.getElementById('walletAdjustAmount').value;
    const remark = document.getElementById('walletAdjustRemark').value;
    const paymentMethodId = document.getElementById('walletPaymentMethodId')?.value || '';
    const amountNumber = Number(amount);
    if(!amount || !Number.isFinite(amountNumber) || (type !== 'ADJUSTMENT' && amountNumber <= 0) || (type === 'ADJUSTMENT' && amountNumber === 0)){ walletStatus(type === 'ADJUSTMENT' ? 'Please enter positive or negative adjustment amount.' : 'Please enter amount greater than 0.', 'error'); return; }
    if(type !== 'ADJUSTMENT' && !paymentMethodId){ walletStatus(type==='DEPOSIT'?'Please select the casino receiving bank.':'Please select a casino funding bank with enough Bank Usage.','error'); return; }
    try{
      walletStatus('Processing main wallet...', '');
      const json = await api(MEMBER_WALLET_API.adjust, {method:'POST', headers:{'Content-Type':'application/json', ...BO_AUTH.authHeader()}, body: JSON.stringify({memberId:Number(memberId), type, amount:Number(amount), paymentMethodId:type==='ADJUSTMENT'?null:Number(paymentMethodId), externalTxId:'BO-MEMBER-' + Date.now(), remark})});
      walletStatus(json.message || 'Main wallet updated.', 'success');
      walletResult(json.data);
      await loadMemberWallet(memberId);
      await loadWalletBankOptions();
      await loadMembers();
    }catch(err){ walletStatus(err.message || 'Wallet adjustment failed', 'error'); }
  }

  function memberStatus(m){
    if(Number(first(m,['locked','isLocked'],0)) === 1 || first(m,['lockStatus'], '').toString().toLowerCase()==='locked') return 'LOCKED';
    const raw = first(m,['status','accountStatus'],1);
    if(Number(raw) === 0 || String(raw).toLowerCase()==='inactive') return 'INACTIVE';
    return 'ACTIVE';
  }
  function metric(id, value){ const el=document.getElementById(id); if(el) el.textContent = value; }
  let onlinePresenceTimer = null;
  async function loadOnlinePresence(){
    try{
      const json=await api(API_CONFIG.BASE_URL+(API_CONFIG.ENDPOINTS.MEMBER_ONLINE||'/admin/member/online'),{headers:BO_AUTH.authHeader(),cache:'no-store'});
      const d=json.data||{}, rows=Array.isArray(d.content)?d.content:[], count=Number(d.count!=null?d.count:rows.length)||0;
      metric('metricOnlineToday',count.toLocaleString());
      const onlineIds=new Set(rows.map(r=>String(r.memberId))); allMembers.forEach(m=>m.online=onlineIds.has(String(first(m,['id','memberId','userId'],''))));
      syncWebStatusLights();
    }catch(e){ /* keep the last visible count when presence endpoint is temporarily unavailable */ }
  }
  function syncWebStatusLights(){
    document.querySelectorAll('[data-web-status]').forEach(el=>{
      const id=String(el.getAttribute('data-web-status')||'');
      const on=!!allMembers.find(m=>String(first(m,['id','memberId','userId'],''))===id && m.online===true);
      const label=on?'Online':'Offline';
      el.classList.toggle('is-online', on);
      el.classList.toggle('is-offline', !on);
      el.title=label;
      el.setAttribute('aria-label', label);
      const text=el.querySelector('.member-web-status-label');
      if(text) text.textContent=label;
    });
  }
  function webStatusCell(m){
    const id=first(m,['id','memberId','userId'],'');
    const on=m && m.online===true;
    const label=on?'Online':'Offline';
    return `<span class="member-web-status ${on?'is-online':'is-offline'}" data-web-status="${esc(id)}" title="${label}" aria-label="${label}"><i class="member-web-status-dot" aria-hidden="true"></i><span class="member-web-status-label">${label}</span></span>`;
  }
  function startOnlinePresence(){
    /* The page's own search field is the sentinel: once a swap removes it the timer stops
       itself instead of polling a page that is no longer on screen. */
    const alive=()=>!!document.getElementById('memberSearchQ');
    if(onlinePresenceTimer)clearInterval(onlinePresenceTimer);
    if(!alive())return;
    loadOnlinePresence();
    onlinePresenceTimer=setInterval(()=>{ if(!alive()){ clearInterval(onlinePresenceTimer); onlinePresenceTimer=null; return; } loadOnlinePresence(); },5000);
    unbinds.push(()=>{ if(onlinePresenceTimer){ clearInterval(onlinePresenceTimer); onlinePresenceTimer=null; } });
    listen(document,'visibilitychange',()=>{ if(!document.hidden&&alive())loadOnlinePresence(); });
    listen(window,'focus',()=>{ if(alive())loadOnlinePresence(); });
  }

  function updateStats(rows){
    const total = rows.length;
    const active = rows.filter(m=>memberStatus(m)==='ACTIVE').length;
    const onlineToday = rows.filter(m=>m && m.online === true).length;
    const totalDeposit = rows.reduce((s,m)=>s+num(first(m,MONEY_KEYS.deposit,0)),0);
    metric('metricTotalUsers', total.toLocaleString());
    metric('metricActiveUsers', active.toLocaleString());
    metric('metricTotalDeposit', money(totalDeposit));
    metric('metricOnlineToday', onlineToday.toLocaleString());
  }
  function todayStr(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

  function memberMatches(m){
    const q = val('memberSearchQ');
    const status = val('memberSearchStatus');
    const lock = val('memberSearchLock');
    const from = val('memberFrom');
    const to = val('memberTo');
    const hay = [
      first(m,['username'], ''),
      first(m,['fullName','name','displayName'], ''),
      first(m,['mobile','phone','mobileNo'], ''),
      first(m,['referrerName','referrerFullName','referrerUsername','agentName','referrer'], ''),
      first(m,['bank','bankName'], '')
    ].join(' ').toLowerCase();
    const rowStatus = memberStatus(m).toLowerCase();
    const rowLock = rowStatus === 'locked' ? 'locked' : 'normal';
    if(q && !hay.includes(q)) return false;
    if(status && rowStatus !== status) return false;
    if(lock && rowLock !== lock) return false;
    if(from || to){
      const reg = String(first(m,['createdAt','registerDate','created_at'], '')).slice(0,10);
      if(!reg) return false;
      if(from && reg < from) return false;
      if(to && reg > to) return false;
    }
    return true;
  }

  function isColVisible(key){ return visibleMemberColumns.has(key); }
  function cell(key, html, cls=''){ return isColVisible(key) ? `<td data-col="${esc(key)}"${cls ? ' class="'+cls+'"' : ''}>${html}</td>` : ''; }
  function renderTableHead(){
    const head = document.querySelector('.user-main-table thead tr');
    const table = document.querySelector('.user-main-table');
    if(!head) return;
    const count = visibleColCount();
    if(table){
      table.dataset.visibleCols = String(count);
      table.classList.toggle('many-columns', false);
      table.classList.add('member-max-12');
    }
    head.innerHTML = MEMBER_TABLE_COLUMNS.filter(c=>isColVisible(c.key)).map(c=>{
      if(c.key==='select') return `<th data-col="select" class="member-select-col"><input type="checkbox" id="memberSelectPage" title="Select current page"></th>`;
      if(UNSORTABLE_COLS.has(c.key)) return `<th data-col="${c.key}">${esc(c.label)}</th>`;
      return `<th class="um-sortable" data-col="${c.key}" data-sort="${c.key}" aria-sort="none" scope="col"><button type="button" class="um-sort-btn"><span class="um-sort-ico" aria-hidden="true"></span>${esc(c.label)}</button></th>`;
    }).join('');
    syncSortHeaders();
  }
  function isSortableCol(key){ return key && !UNSORTABLE_COLS.has(key); }
  function sortRaw(m, key){
    if(key==='no') return num(first(m,['id','memberId','userId'],0));
    if(key==='registerDate'){ const t=new Date(first(m,['createdAt','registerDate','created_at'],'')).getTime(); return Number.isFinite(t)?t:0; }
    if(key==='name') return String(first(m,['username'],'')).toLocaleLowerCase();
    if(key==='mobile') return String(first(m,['mobile','phone','mobileNo'],'')).toLocaleLowerCase();
    if(key==='mainWallet') return num(first(m,['mainWalletBalance','mainBalance','balance'],0));
    if(key==='status') return memberStatus(m).toLocaleLowerCase();
    if(key==='webStatus') return m && m.online===true ? 1 : 0;
    if(key==='vipLevel') return num(first(m,['vipLevel'],0));
    if(key==='lastLogin'){ const t=new Date(first(m,['lastLoginAt','lastLogin','last_login_at'],'')).getTime(); return Number.isFinite(t)?t:0; }
    if(key==='kycStatus') return String(first(m,['kycStatus'],'UNVERIFIED')).toLocaleLowerCase();
    if(key==='remark') return String(first(m,['adminRemark'],'')).toLocaleLowerCase();
    if(key==='registerSource') return [first(m,['registrationDomain','registerDomain'],''),first(m,['registrationIp','registerIp'],'')].filter(Boolean).join(' ').toLocaleLowerCase();
    if(key==='referCode') return String(first(m,['referrerCode','referralCode','referCode'],'')).toLocaleLowerCase();
    if(key==='bankAccount') return String(first(m,['bankAccount','bankAccountNumber','bankAccountNo','accountNo'],'')).toLocaleLowerCase();
    if(key==='bank') return String(first(m,['bank','bankName'],'')).toLocaleLowerCase();
    if(key==='referrer') return String(first(m,['referrerName','referrerFullName','referrerUsername','agentName','referrer'],'')).toLocaleLowerCase();
    if(key==='topReferrer') return String(first(m,['topReferrer','topAgent','upline'],'')).toLocaleLowerCase();
    if(key==='deposit') return num(first(m,MONEY_KEYS.deposit,0));
    if(key==='withdraw') return num(first(m,MONEY_KEYS.withdraw,0));
    if(key==='winLoss') return num(first(m,MONEY_KEYS.winLoss,0));
    if(key==='bonus') return num(first(m,MONEY_KEYS.bonus,0));
    if(key==='manual') return num(first(m,MONEY_KEYS.manual,0));
    if(key==='commission') return num(first(m,MONEY_KEYS.commission,0));
    if(key==='lastDeposit'){ const t=new Date(first(m,['lastDepositAt','lastDeposit','last_deposit_at'],'')).getTime(); return Number.isFinite(t)?t:0; }
    if(key==='lastLoginSource') return [first(m,['lastLoginDomain'],''),first(m,['lastLoginIp'],'')].filter(Boolean).join(' ').toLocaleLowerCase();
    return '';
  }
  function compareMembers(a,b,key,dir){
    const av=sortRaw(a,key);
    const bv=sortRaw(b,key);
    let cmp=0;
    if(typeof av==='string' || typeof bv==='string'){
      cmp=String(av).localeCompare(String(bv),undefined,{numeric:true,sensitivity:'base'});
    }else{
      cmp=av===bv?0:(av<bv?-1:1);
    }
    if(cmp===0){
      const ida=num(first(a,['id','memberId','userId'],0));
      const idb=num(first(b,['id','memberId','userId'],0));
      cmp=ida===idb?String(first(a,['username'],'')).localeCompare(String(first(b,['username'],''))):(ida<idb?-1:1);
    }
    return dir==='desc'?-cmp:cmp;
  }
  function syncSortHeaders(){
    document.querySelectorAll('.user-main-table th.um-sortable').forEach(th=>{
      const key=th.getAttribute('data-sort');
      const active=key && key===memberSortKey;
      th.setAttribute('aria-sort', active?(memberSortDir==='asc'?'ascending':'descending'):'none');
      th.classList.toggle('is-sorted', active);
      th.classList.toggle('is-asc', active && memberSortDir==='asc');
      th.classList.toggle('is-desc', active && memberSortDir==='desc');
    });
  }
  function setMemberSort(key){
    if(!isSortableCol(key)) return;
    if(memberSortKey===key) memberSortDir=memberSortDir==='asc'?'desc':'asc';
    else { memberSortKey=key; memberSortDir='asc'; }
    applySearch();
  }
  function bindSortHeaders(){
    const table=document.querySelector('.user-main-table');
    if(!table || table._umSortBound) return;
    table._umSortBound=true;
    table.addEventListener('click',e=>{
      if(e.target.closest('input,button.icon-action,[data-member-wallet],[data-member-lock]')) return;
      const th=e.target.closest('th.um-sortable[data-sort]');
      if(!th||!table.contains(th)) return;
      e.preventDefault();
      setMemberSort(th.getAttribute('data-sort'));
    });
  }
  function visibleColCount(){ return MEMBER_TABLE_COLUMNS.filter(c=>isColVisible(c.key)).length || 1; }
  function visibleMemberColumnCount(){ return MEMBER_TABLE_COLUMNS.filter(c=>isColVisible(c.key)).length; }
  function showColumnLimitNotice(){
    const el=document.getElementById('memberColumnLimitNotice');
    if(!el) return;
    el.textContent = `Maximum ${MAX_VISIBLE_MEMBER_COLUMNS} columns only. Untick one column first.`;
    el.hidden = false;
    clearTimeout(showColumnLimitNotice._timer);
    showColumnLimitNotice._timer = setTimeout(()=>{ el.hidden = true; }, 2200);
  }
  function buildColumnsMenu(){
    const menu=document.getElementById('memberColumnsMenu'); if(!menu) return;
    const count = visibleMemberColumnCount();
    const limitReached = count >= MAX_VISIBLE_MEMBER_COLUMNS;
    menu.innerHTML = '<div class="column-menu-title">Show / Hide Columns</div><div class="column-limit-text">Showing '+count+'/'+MAX_VISIBLE_MEMBER_COLUMNS+' columns</div><div class="column-limit-notice" id="memberColumnLimitNotice" hidden></div>' + MEMBER_TABLE_COLUMNS.filter(c=>!c.always).map(c=>{
      const checked = isColVisible(c.key);
      const disabled = !checked && limitReached;
      return `<label class="${disabled?'is-disabled':''}"><input type="checkbox" data-member-col="${c.key}" ${checked?'checked':''} ${disabled?'disabled':''}> <span>${esc(c.label)}</span></label>`;
    }).join('') + '<button type="button" class="column-default-btn" id="memberColumnsDefaultBtn">Default View</button>';
    document.getElementById('memberColumnsDefaultBtn')?.addEventListener('click', function(){ visibleMemberColumns = new Set(DEFAULT_MEMBER_COLUMNS); buildColumnsMenu(); applySearch(); });
  }
  function bindColumnTools(){
    buildColumnsMenu();
    const btn=document.getElementById('memberColumnsBtn');
    const menu=document.getElementById('memberColumnsMenu');
    btn?.addEventListener('click', (e)=>{ e.stopPropagation(); if(menu) menu.hidden = !menu.hidden; });
    menu?.addEventListener('click', e=>e.stopPropagation());
    menu?.addEventListener('change', e=>{
      const input=e.target.closest('[data-member-col]'); if(!input) return;
      const key = input.dataset.memberCol;
      if(input.checked){
        if(visibleMemberColumnCount() >= MAX_VISIBLE_MEMBER_COLUMNS){
          input.checked = false;
          showColumnLimitNotice();
          buildColumnsMenu();
          return;
        }
        visibleMemberColumns.add(key);
      } else {
        visibleMemberColumns.delete(key);
      }
      buildColumnsMenu();
      applySearch();
    });
    listen(document,'click', ()=>{ if(menu) menu.hidden = true; });
  }
  function currentFilteredMembers(){ return allMembers.filter(memberMatches); }
  function downloadCsv(filename, rows){
    // Export only data columns. UI checkbox/action columns are never useful in CSV.
    // Name is username on screen; export still splits Name + Username for Excel.
    const visible = MEMBER_TABLE_COLUMNS.filter(c=>isColVisible(c.key) && !['select','action'].includes(c.key));
    const exportCols=[];
    visible.forEach(c=>{
      if(c.key==='name'){
        exportCols.push({label:'Name', value:(m)=>first(m,['fullName','name','displayName'],'')});
        exportCols.push({label:'Username', value:(m)=>first(m,['username'],'-')});
        return;
      }
      exportCols.push({label:c.label,key:c.key});
    });
    const valueFor = (m,key,idx)=>{
      if(key==='no') return idx+1;
      if(key==='registerDate') return dt(first(m,['createdAt','registerDate','created_at'], ''));
      if(key==='registerSource') return [first(m,['registrationDomain','registerDomain'],''),first(m,['registrationIp','registerIp'],'')].filter(Boolean).join(' / ');
      if(key==='referCode') return first(m,['referralCode','referCode','referrerCode'],'-');
      if(key==='remark') return first(m,['adminRemark'], '');
      if(key==='mobile') return first(m,['mobile','phone','mobileNo'], '-');
      if(key==='bankAccount') return first(m,['bankAccount','bankAccountNumber','bankAccountNo','accountNo'], '-');
      if(key==='bank') return first(m,['bank','bankName'], '-');
      if(key==='referrer') return first(m,['referrerName','referrerFullName','referrerUsername','agentName','referrer'], '-');
      if(key==='topReferrer') return first(m,['topReferrer','topAgent','upline'], '-');
      if(key==='mainWallet') return money(first(m,['mainWalletBalance','mainBalance','balance'],0));
      if(key==='deposit') return money(first(m,MONEY_KEYS.deposit,0));
      if(key==='withdraw') return money(first(m,MONEY_KEYS.withdraw,0));
      if(key==='winLoss') return money(first(m,MONEY_KEYS.winLoss,0));
      if(key==='bonus') return money(first(m,MONEY_KEYS.bonus,0));
      if(key==='manual') return money(first(m,MONEY_KEYS.manual,0));
      if(key==='commission') return money(first(m,MONEY_KEYS.commission,0));
      if(key==='lastDeposit') return dt(first(m,['lastDepositAt','lastDeposit','last_deposit_at'], ''));
      if(key==='lastLogin') return dt(first(m,['lastLoginAt','lastLogin','last_login_at'], ''));
      if(key==='lastLoginSource') return [first(m,['lastLoginDomain'],''),first(m,['lastLoginIp'],'')].filter(Boolean).join(' / ');
      if(key==='vipLevel') return first(m,['vipLevelName'], 'VIP '+first(m,['vipLevel'],0));
      if(key==='kycStatus') return first(m,['kycStatus'],'UNVERIFIED');
      if(key==='status') return memberStatus(m);
      if(key==='webStatus') return m && m.online===true ? 'Online' : 'Offline';
      return '';
    };
    const headers=exportCols.map(c=>c.label);
    const body=rows.map((m,i)=>exportCols.map(c=>c.value?c.value(m,i):valueFor(m,c.key,i)));
    const csv = [headers, ...body].map(r=>r.map(v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 500);
  }
  function bindExportTool(){
    document.getElementById('memberExportBtn')?.addEventListener('click', ()=>{
      downloadCsv('member-list-' + todayStr() + '.csv', currentFilteredMembers());
    });
  }

  function renderMembers(rows){
    const table=document.querySelector('.user-main-table tbody');
    const cards=document.querySelector('.member-card-list');
    if(!table) return;
    updateStats(rows);
    renderTableHead();
    if(!rows.length){
      table.innerHTML='<tr><td colspan="'+visibleColCount()+'">No member found.</td></tr>';
      if(cards) cards.innerHTML='<div class="member-card"><h3>No member found</h3><div class="meta">Try another search filter.</div></div>';
      resetEvenFill();
      return;
    }
    table.innerHTML=rows.map((m, idx)=>{
      const status = memberStatus(m);
      const locked = status === 'LOCKED';
      const id = first(m,['id','memberId','userId'], '');
      return `<tr>
        ${cell('select', `<input class="member-row-select" type="checkbox" data-member-select="${esc(id)}" ${bulkSelectedMemberIds.has(String(id))?'checked':''}>`, 'member-select-col')}
        ${cell('no', ((memberCurrentPage-1)*memberPageSize)+idx+1, 'col-no')}
        ${cell('registerDate', dtCell(first(m,['createdAt','registerDate','created_at'], '')))}
        ${cell('name', esc(first(m,['username'], '-')), 'member-name-cell')}
        ${cell('mobile', esc(first(m,['mobile','phone','mobileNo'], '-')))}
        ${cell('mainWallet', money(first(m,['mainWalletBalance','mainBalance','balance'],0)), 'money-strong')}
        ${cell('status', `<small class="status-pill ${locked?'off':''}">${esc(status)}</small>`)}
        ${cell('webStatus', webStatusCell(m), 'member-web-status-cell')}
        ${cell('vipLevel', esc(first(m,['vipLevelName'], 'VIP '+first(m,['vipLevel'],0))))}
        ${cell('lastLogin', dtCell(first(m,['lastLoginAt','lastLogin','last_login_at'], '')))}
        ${cell('kycStatus', esc(first(m,['kycStatus'],'UNVERIFIED')))}
        ${cell('remark', first(m,['adminRemark'],'') ? `<span class="member-remark-pill" title="${esc(first(m,['adminRemark'],''))}"><i class="bi bi-chat-left-text-fill"></i><span>${esc(first(m,['adminRemark'],''))}</span></span>` : '<span class="member-remark-empty">—</span>', 'member-remark-cell')}
        ${cell('action', `<div class="user-row-actions"><button class="icon-action view" title="View" data-member-wallet="${esc(id)}"><i class="bi bi-eye"></i></button><button class="icon-action" title="${locked?'Unlock':'Lock'}" data-member-lock="${esc(id)}" data-lock="${locked?0:1}"><i class="bi ${locked?'bi-unlock':'bi-lock'}"></i></button></div>`)}
        ${cell('registerSource', `<b>${esc(first(m,['registrationDomain','registerDomain'],'-'))}</b><br><small>${esc(first(m,['registrationIp','registerIp'],'-'))}</small>`)}
        ${cell('referCode', esc(first(m,['referrerCode','referralCode'],'-')))}
        ${cell('bankAccount', esc(first(m,['bankAccount','bankAccountNumber','bankAccountNo','accountNo'], '-')))}
        ${cell('bank', esc(first(m,['bank','bankName'], '-')))}
        ${cell('referrer', esc(first(m,['referrerName','referrerFullName','referrerUsername','agentName','referrer'], '-')))}
        ${cell('topReferrer', esc(first(m,['topReferrer','topAgent','upline'], '-')))}
        ${cell('deposit', money(first(m,MONEY_KEYS.deposit,0)), 'money-strong')}
        ${cell('withdraw', money(first(m,MONEY_KEYS.withdraw,0)), 'money-strong')}
        ${cell('winLoss', money(first(m,MONEY_KEYS.winLoss,0)), 'money-strong')}
        ${cell('bonus', money(first(m,MONEY_KEYS.bonus,0)), 'money-strong')}
        ${cell('manual', money(first(m,MONEY_KEYS.manual,0)), 'money-strong')}
        ${cell('commission', money(first(m,MONEY_KEYS.commission,0)), 'money-strong')}
        ${cell('lastDeposit', esc(dt(first(m,['lastDepositAt','lastDeposit','last_deposit_at'], ''))))}
        ${cell('lastLoginSource', `<b>${esc(first(m,['lastLoginDomain'],'-'))}</b><br><small>${esc(first(m,['lastLoginIp'],'-'))}</small>`)}
      </tr>`;
    }).join('');
    if(cards){
      cards.innerHTML = rows.map(m=>{
        const status = memberStatus(m);
        const locked = status === 'LOCKED';
        const id = first(m,['id','memberId','userId'], '');
        return `<div class="member-card">
          <div class="member-card-head"><label><input class="member-row-select" type="checkbox" data-member-select="${esc(id)}" ${bulkSelectedMemberIds.has(String(id))?'checked':''}> <h3 style="display:inline">${esc(first(m,['username'], '-'))}</h3></label><span class="status-pill ${locked?'off':''}">${esc(status)}</span></div>
          <div class="meta">${esc(first(m,['fullName','name','displayName'], '-'))} • ${esc(first(m,['mobile','phone','mobileNo'], '-'))}</div>
          ${first(m,['adminRemark'],'') ? `<div class="member-card-remark"><i class="bi bi-chat-left-text-fill me-1"></i>${esc(first(m,['adminRemark'],''))}</div>` : ''}
          <div class="meta">Registered: ${esc(dtParts(first(m,['createdAt','registerDate','created_at'], '')).day)}</div>
          <div class="member-grid">
            <span>Bank</span><b>${esc(first(m,['bank','bankName'], '-'))}</b>
            <span>Main Wallet</span><b>${money(first(m,['mainWalletBalance','mainBalance','balance'],0))}</b>
            <span>Deposit</span><b>${money(first(m,MONEY_KEYS.deposit,0))}</b>
            <span>Withdraw</span><b>${money(first(m,MONEY_KEYS.withdraw,0))}</b>
            <span>Win/Loss</span><b>${money(first(m,MONEY_KEYS.winLoss,0))}</b>
            <span>Bonus</span><b>${money(first(m,MONEY_KEYS.bonus,0))}</b>
            <span>Commission</span><b>${money(first(m,MONEY_KEYS.commission,0))}</b><span>VIP / KYC / Risk</span><b>${esc(first(m,['vipLevelName'],'VIP '+first(m,['vipLevel'],0)))} · ${esc(first(m,['kycStatus'],'UNVERIFIED'))} · ${esc(first(m,['riskStatus'],'NORMAL'))}</b>
          </div>
          <div class="d-grid gap-2 mt-3">
            <button class="clean-btn primary w-100" data-member-wallet="${esc(id)}">View Details</button>
            <button class="clean-btn w-100" data-member-lock="${esc(id)}" data-lock="${locked?0:1}">${locked?'Unlock':'Lock'} Member</button>
          </div>
        </div>`;
      }).join('');
    }
  }

  function applySearch(resetPage=true){
    memberFilteredRows = allMembers.filter(memberMatches);
    if(isSortableCol(memberSortKey)){
      memberFilteredRows.sort((a,b)=>compareMembers(a,b,memberSortKey,memberSortDir));
    }
    if(resetPage) memberCurrentPage = 1;
    const total = memberFilteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / memberPageSize));
    memberCurrentPage = Math.max(1, Math.min(memberCurrentPage, totalPages));
    const start = (memberCurrentPage - 1) * memberPageSize;
    const rows = memberFilteredRows.slice(start, start + memberPageSize);
    renderMembers(rows);
    const info=document.getElementById('memberPageInfo');
    if(info) info.textContent = total ? `Showing ${start+1} to ${start+rows.length} of ${total} entries` : 'Showing 0 to 0 of 0 entries';
    const pager=document.getElementById('memberPager');
    if(pager) pager.innerHTML = memberPageButtons(memberCurrentPage,totalPages);
    scheduleEvenFill();
  }


  function memberKey(m){
    return String(first(m, ['id','memberId','userId'], '') || '');
    updateBulkSelectionUi();
  }

  function normalizePageRows(data){
    if(Array.isArray(data)) return data;
    if(data && Array.isArray(data.content)) return data.content;
    if(data && data.data && Array.isArray(data.data.content)) return data.data.content;
    if(data && Array.isArray(data.data)) return data.data;
    return [];
  }

  async function loadWalletSummaryMap(){
    const map = new Map();
    if(!API_CONFIG.ENDPOINTS.MEMBER_WALLET_LIST) return map;
    try{
      const params = new URLSearchParams({page:'1', size:'10000'});
      const json = await api(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MEMBER_WALLET_LIST + '?' + params.toString(), {headers:{...BO_AUTH.authHeader()}});
      const rows = normalizePageRows(json.data || json);
      rows.forEach(r => {
        const key = String(first(r, ['memberId','id','userId'], '') || '');
        if(key) map.set(key, r);
      });
    }catch(err){
      console.warn('Member wallet summary load skipped:', err.message || err);
    }
    return map;
  }

  function mergeMemberRuntimeData(members, walletMap){
    return members.map(m => {
      const key = memberKey(m);
      const w = walletMap.get(key);
      if(!w) return m;
      return Object.assign({}, m, {
        mainWalletBalance: first(w, ['mainWalletBalance','mainBalance','balance'], first(m,['mainWalletBalance','mainBalance','balance'], 0)),
        deposit: first(w, ['totalDeposit','deposit'], first(m, MONEY_KEYS.deposit, 0)),
        totalDeposit: first(w, ['totalDeposit','deposit'], first(m, MONEY_KEYS.deposit, 0)),
        withdraw: first(w, ['totalWithdraw','withdraw'], first(m, MONEY_KEYS.withdraw, 0)),
        totalWithdraw: first(w, ['totalWithdraw','withdraw'], first(m, MONEY_KEYS.withdraw, 0)),
        winLoss: first(w, ['winLoss','totalWinLoss','profitLoss'], first(m, MONEY_KEYS.winLoss, 0)),
        totalWinLoss: first(w, ['winLoss','totalWinLoss','profitLoss'], first(m, MONEY_KEYS.winLoss, 0)),
        bonus: first(w, ['totalBonus','bonus'], first(m, MONEY_KEYS.bonus, 0)),
        totalBonus: first(w, ['totalBonus','bonus'], first(m, MONEY_KEYS.bonus, 0)),
        manual: first(w, ['manualAdjust','manual','totalManual'], first(m, MONEY_KEYS.manual, 0)),
        manualAdjust: first(w, ['manualAdjust','manual','totalManual'], first(m, MONEY_KEYS.manual, 0)),
        commission: first(w, ['totalCommission','commission'], first(m, MONEY_KEYS.commission, 0)),
        totalCommission: first(w, ['totalCommission','commission'], first(m, MONEY_KEYS.commission, 0)),
        providerWalletBalance: first(w, ['providerWalletBalance'], first(m,['providerWalletBalance'],0)),
        totalBet: first(w, ['totalBet'], first(m,['totalBet'],0)),
        totalWin: first(w, ['totalWin'], first(m,['totalWin'],0)),
        totalLose: first(w, ['totalLose'], first(m,['totalLose'],0))
      });
    });
  }

  async function loadMembers(){
    const table=document.querySelector('.user-main-table tbody'); if(!table) return;
    table.innerHTML='<tr><td colspan="'+visibleColCount()+'">Loading members...</td></tr>';
    try{
      const res = await api(BO_AUTH.memberListUrl(),{headers:{...BO_AUTH.authHeader()}});
      const members = Array.isArray(res.data) ? res.data : (res.data && Array.isArray(res.data.content) ? res.data.content : []);
      const walletMap = await loadWalletSummaryMap();
      allMembers = mergeMemberRuntimeData(members, walletMap).sort((a, b) => {
        const dateValue = row => {
          const raw = first(row, ['createdAt','registerDate','created_at'], '');
          const time = raw ? new Date(raw).getTime() : 0;
          return Number.isFinite(time) ? time : 0;
        };
        const byDate = dateValue(b) - dateValue(a);
        if (byDate !== 0) return byDate;
        return num(first(b, ['id','memberId','userId'], 0)) - num(first(a, ['id','memberId','userId'], 0));
      });
      updateStats(allMembers);
      applySearch();
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(!isAutoPageSize(document.getElementById('memberPageSize')?.value)) return;
        const prev=memberPageSize;
        clearLockedAutoSize();
        syncMemberPageSize();
        if(memberPageSize!==prev) applySearch(false);
        else scheduleEvenFill();
      }));
      const requestedMemberId = new URLSearchParams(location.search).get('memberId');
      if(requestedMemberId){
        window.location.replace('member-detail.html?memberId=' + encodeURIComponent(requestedMemberId));
        return;
      }
    } catch(e){
      allMembers=[]; updateStats([]);
      table.innerHTML='<tr><td colspan="'+visibleColCount()+'" class="text-danger">'+esc(e.message||'Load member failed')+'</td></tr>';
    }
  }


  function bindMemberPagination(){
    const size=document.getElementById('memberPageSize');
    if(size){
      syncMemberPageSize();
      size.addEventListener('change',()=>{
        clearLockedAutoSize();
        syncMemberPageSize();
        if(!isAutoPageSize(size.value)) resetEvenFill();
        memberCurrentPage=1;
        applySearch(false);
      });
    }
    document.getElementById('memberPager')?.addEventListener('click',e=>{const b=e.target.closest('[data-member-page]'); if(!b||b.disabled)return; memberCurrentPage=Number(b.dataset.memberPage)||1; applySearch(false);});
    const evenFillObs=bindEvenFillObserver();
    if(evenFillObs) unbinds.push(()=>evenFillObs.disconnect());
    let resizeTimer=0;
    listen(window,'resize',()=>{
      if(!isAutoPageSize(document.getElementById('memberPageSize')?.value)) return;
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(()=>{
        const prev=lockedAutoSize;
        clearLockedAutoSize();
        const next=autoFitPageSize();
        if(next!==prev){ memberPageSize=next; memberCurrentPage=1; applySearch(false); }
        else scheduleEvenFill();
      },180);
    });
  }

  function initRoundedMemberSelects(){
    const ids=['memberSearchStatus','memberSearchLock'];
    ids.forEach(id=>{
      const select=document.getElementById(id);
      if(!select || select.dataset.roundedReady==='1') return;
      select.dataset.roundedReady='1';
      select.classList.add('rounded-native-hidden');
      const wrap=document.createElement('div');
      wrap.className='rounded-select-wrap';
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='rounded-select-btn';
      btn.innerHTML='<span></span><i class="bi bi-chevron-down"></i>';
      const menu=document.createElement('div');
      menu.className='rounded-select-menu';
      function currentText(){return select.options[select.selectedIndex]?.text || 'All';}
      function sync(){btn.querySelector('span').textContent=currentText();}
      Array.from(select.options).forEach(opt=>{
        const item=document.createElement('button');
        item.type='button';
        item.className='rounded-select-option';
        item.dataset.value=opt.value;
        item.textContent=opt.text;
        item.addEventListener('click',()=>{
          select.value=opt.value;
          sync();
          menu.classList.remove('show');
          btn.classList.remove('open');
          select.dispatchEvent(new Event('change',{bubbles:true}));
        });
        menu.appendChild(item);
      });
      btn.addEventListener('click',e=>{
        e.stopPropagation();
        document.querySelectorAll('.rounded-select-menu.show').forEach(m=>{ if(m!==menu)m.classList.remove('show'); });
        document.querySelectorAll('.rounded-select-btn.open').forEach(b=>{ if(b!==btn)b.classList.remove('open'); });
        menu.classList.toggle('show');
        btn.classList.toggle('open', menu.classList.contains('show'));
      });
      select.addEventListener('change',sync);
      select.parentNode.insertBefore(wrap, select.nextSibling);
      wrap.appendChild(btn);
      wrap.appendChild(menu);
      sync();
    });
    if(!window.__roundedSelectCloseBound){
      window.__roundedSelectCloseBound=true;
      document.addEventListener('click',()=>{
        document.querySelectorAll('.rounded-select-menu.show').forEach(m=>m.classList.remove('show'));
        document.querySelectorAll('.rounded-select-btn.open').forEach(b=>b.classList.remove('open'));
      });
    }
  }
  function refreshRoundedMemberSelects(){
    document.querySelectorAll('.rounded-native-hidden').forEach(select=>select.dispatchEvent(new Event('change',{bubbles:false})));
  }


  function selectedBulkMembers(){
    return allMembers.filter(m=>bulkSelectedMemberIds.has(String(first(m,['id','memberId','userId'],''))));
  }
  function updateBulkSelectionUi(){
    const count=bulkSelectedMemberIds.size;
    const btn=document.getElementById('bulkWalletAdjustBtn'); if(btn) btn.disabled=count===0;
    const bonusBtn=document.getElementById('bulkBonusAdjustBtn'); if(bonusBtn) bonusBtn.disabled=count===0;
    const badge=document.getElementById('bulkSelectedBadge'); if(badge) badge.textContent=String(count);
    document.querySelectorAll('[data-member-select]').forEach(el=>{el.checked=bulkSelectedMemberIds.has(String(el.dataset.memberSelect));});
    const pageBox=document.getElementById('memberSelectPage');
    const visibleIds=memberFilteredRows.slice((memberCurrentPage-1)*memberPageSize, memberCurrentPage*memberPageSize).map(m=>String(first(m,['id','memberId','userId'],''))).filter(Boolean);
    if(pageBox){const selected=visibleIds.filter(id=>bulkSelectedMemberIds.has(id)).length;pageBox.checked=visibleIds.length>0&&selected===visibleIds.length;pageBox.indeterminate=selected>0&&selected<visibleIds.length;}
  }
  function bulkStatus(msg,type){const el=document.getElementById('bulkWalletStatus');if(el){el.textContent=msg||'';el.className='upload-status'+(type?' '+type:'');}}
  function updateBulkPreview(){
    const members=selectedBulkMembers(); const amount=Math.max(0,num(document.getElementById('bulkAdjustmentAmount')?.value));
    const type=document.getElementById('bulkAdjustmentType')?.value||'CREDIT';
    const count=document.getElementById('bulkMemberCount');if(count)count.textContent=String(members.length);
    const total=document.getElementById('bulkTotalAmount');if(total)total.textContent=(type==='DEBIT'?'-':'')+money(amount*members.length);
    const list=document.getElementById('bulkSelectedList');if(list)list.innerHTML=members.map(m=>{const id=String(first(m,['id','memberId','userId'],''));return `<span class="bulk-member-chip"><b>${esc(first(m,['username'],'-'))}</b><small>${money(first(m,['mainWalletBalance','mainBalance','balance'],0))}</small><button type="button" data-bulk-remove="${esc(id)}"><i class="bi bi-x"></i></button></span>`;}).join('');
  }
  function openBulkWalletModal(){
    if(!bulkSelectedMemberIds.size)return;
    document.getElementById('bulkAdjustmentAmount').value=''; document.getElementById('bulkAdjustmentRemark').value=''; document.getElementById('bulkReferenceNo').value='';
    document.getElementById('bulkWalletResult').hidden=true; bulkStatus('',''); updateBulkPreview();
    document.getElementById('bulkWalletModal').hidden=false; document.body.classList.add('bulk-modal-open');
  }
  function closeBulkWalletModal(){document.getElementById('bulkWalletModal').hidden=true;document.body.classList.remove('bulk-modal-open');}
  async function submitBulkWalletAdjustment(){
    const members=selectedBulkMembers(); const amount=num(document.getElementById('bulkAdjustmentAmount').value); const remark=String(document.getElementById('bulkAdjustmentRemark').value||'').trim();
    if(!members.length){bulkStatus('Please select at least one member.','error');return;} if(amount<=0){bulkStatus('Please enter an amount greater than 0.','error');return;} if(!remark){bulkStatus('Remark is required for audit purposes.','error');return;}
    const type=document.getElementById('bulkAdjustmentType').value; const total=amount*members.length;
    if(!(await BO_DIALOG.confirm(`${type==='CREDIT'?'Credit':'Debit'} ${money(amount)} for ${members.length} member(s)? Total: ${money(total)}`, {title:'Confirm Bulk Wallet Adjustment', confirmText:'Confirm Adjustment'})))return;
    const submit=document.getElementById('bulkWalletSubmit');submit.disabled=true;bulkStatus('Processing bulk adjustment...','');
    try{
      const payload={memberIds:members.map(m=>Number(first(m,['id','memberId','userId'],0))).filter(Boolean),adjustmentType:type,amount,reasonCode:document.getElementById('bulkAdjustmentReason').value,insufficientPolicy:document.getElementById('bulkInsufficientPolicy').value,referenceNo:String(document.getElementById('bulkReferenceNo').value||'').trim(),remark};
      const json=await api(MEMBER_WALLET_API.bulkAdjust,{method:'POST',headers:{'Content-Type':'application/json',...BO_AUTH.authHeader()},body:JSON.stringify(payload)});
      const d=json.data||{}; bulkStatus(json.message||'Bulk adjustment completed.','success');
      const result=document.getElementById('bulkWalletResult');result.hidden=false;result.innerHTML=`<b>Batch: ${esc(d.batchNo||'-')}</b><br>Success: ${esc(d.successCount||0)} &nbsp; Skipped: ${esc(d.skippedCount||0)} &nbsp; Total adjusted: ${money(d.totalAdjusted||0)}`;
      bulkSelectedMemberIds.clear(); updateBulkSelectionUi(); await loadMembers();
    }catch(err){bulkStatus(err.message||'Bulk adjustment failed.','error');}finally{submit.disabled=false;}
  }
  async function submitBulkBonusAdjustment(){
    const members=selectedBulkMembers();
    if(!members.length){
      if(window.BO_DIALOG?.alert) await BO_DIALOG.alert('Please select at least one member.', {title:'Bulk Bonus Adjustment'});
      else alert('Please select at least one member.');
      return;
    }
    const raw=await BO_DIALOG.prompt('Bonus amount per member. Positive = credit, negative = debit','',{title:'Bulk Bonus Adjustment',inputLabel:'Amount per member',inputType:'number',step:'0.01',confirmText:'Continue'});
    if(raw===null)return;
    const amount=Number(raw);
    if(!Number.isFinite(amount)||amount===0){
      if(window.BO_DIALOG?.alert) await BO_DIALOG.alert('Amount cannot be zero.', {title:'Bulk Bonus Adjustment'});
      else alert('Amount cannot be zero.');
      return;
    }
    const remark=String((await BO_DIALOG.prompt('Enter a remark or reason for audit purposes.','Bulk bonus adjustment',{title:'Bulk Bonus Adjustment',inputLabel:'Remark / reason',confirmText:'Continue'}))||'').trim();
    if(!remark){
      if(window.BO_DIALOG?.alert) await BO_DIALOG.alert('Remark is required for audit purposes.', {title:'Bulk Bonus Adjustment'});
      else alert('Remark is required for audit purposes.');
      return;
    }
    const memberIds=members.map(m=>Number(first(m,['id','memberId','userId'],0))).filter(Boolean);
    const confirmed=await BO_DIALOG.confirm(`${amount>0?'Credit':'Debit'} ${money(Math.abs(amount))} bonus for ${memberIds.length} member(s)?`, {title:'Confirm Bulk Bonus Adjustment',confirmText:'Confirm'});
    if(!confirmed)return;
    const button=document.getElementById('bulkBonusAdjustBtn');
    if(button)button.disabled=true;
    try{
      const json=await api(MEMBER_WALLET_API.bulkBonus,{
        method:'POST',
        headers:{'Content-Type':'application/json',...BO_AUTH.authHeader(),'X-Admin-Username':localStorage.getItem('admin_username')||'Admin'},
        body:JSON.stringify({memberIds,amount,reasonCode:'BONUS_ADJUSTMENT',remark})
      });
      if(window.BO_DIALOG?.alert) await BO_DIALOG.alert(json.message||'Bulk bonus adjustment completed.', {title:'Completed'});
      else alert(json.message||'Bulk bonus adjustment completed.');
      bulkSelectedMemberIds.clear();
      updateBulkSelectionUi();
      await loadMembers();
    }catch(err){
      if(window.BO_DIALOG?.alert) await BO_DIALOG.alert(err.message||'Bulk bonus adjustment failed.', {title:'Failed'});
      else alert(err.message||'Bulk bonus adjustment failed.');
    }finally{
      updateBulkSelectionUi();
    }
  }

  function bindBulkWalletTools(){
    document.getElementById('bulkWalletAdjustBtn')?.addEventListener('click',openBulkWalletModal);
    document.getElementById('bulkBonusAdjustBtn')?.addEventListener('click',submitBulkBonusAdjustment);
    document.getElementById('bulkWalletClose')?.addEventListener('click',closeBulkWalletModal);document.getElementById('bulkWalletCancel')?.addEventListener('click',closeBulkWalletModal);
    document.getElementById('bulkWalletModal')?.addEventListener('click',e=>{if(e.target.id==='bulkWalletModal')closeBulkWalletModal();});
    document.getElementById('bulkWalletSubmit')?.addEventListener('click',submitBulkWalletAdjustment);
    document.getElementById('bulkAdjustmentAmount')?.addEventListener('input',updateBulkPreview);document.getElementById('bulkAdjustmentType')?.addEventListener('change',updateBulkPreview);
    listen(document,'change',e=>{
      if(e.target.id==='memberSelectPage'){
        const shouldSelect=Boolean(e.target.checked);
        const ids=memberFilteredRows.slice((memberCurrentPage-1)*memberPageSize,memberCurrentPage*memberPageSize).map(m=>String(first(m,['id','memberId','userId'],''))).filter(Boolean);
        ids.forEach(id=>shouldSelect?bulkSelectedMemberIds.add(id):bulkSelectedMemberIds.delete(id));
        document.querySelectorAll('[data-member-select]').forEach(el=>{if(ids.includes(String(el.dataset.memberSelect)))el.checked=shouldSelect;});
        updateBulkSelectionUi();
        return;
      }
      const row=e.target.closest('[data-member-select]');
      if(row){
        const id=String(row.dataset.memberSelect);
        row.checked?bulkSelectedMemberIds.add(id):bulkSelectedMemberIds.delete(id);
        updateBulkSelectionUi();
      }
    });
    listen(document,'click',e=>{const rm=e.target.closest('[data-bulk-remove]');if(!rm)return;bulkSelectedMemberIds.delete(String(rm.dataset.bulkRemove));updateBulkSelectionUi();updateBulkPreview();});
  }

  function createMemberStatus(message,type){
    const el=document.getElementById('createMemberStatus');
    if(!el) return;
    el.textContent=message||'';
    el.className='create-member-status'+(type?' '+type:'');
  }
  function openCreateMemberModal(){
    const modal=document.getElementById('createMemberModal');
    if(!modal) return;
    document.getElementById('createMemberForm')?.reset();
    createMemberStatus('','');
    modal.hidden=false;
    document.body.classList.add('wallet-modal-open');
    setTimeout(()=>document.getElementById('createMemberUsername')?.focus(),0);
  }
  function closeCreateMemberModal(){
    const modal=document.getElementById('createMemberModal');
    if(modal) modal.hidden=true;
    document.body.classList.remove('wallet-modal-open');
  }
  async function submitCreateMember(event){
    event.preventDefault();
    const username=String(document.getElementById('createMemberUsername')?.value||'').trim();
    const mobile=String(document.getElementById('createMemberMobile')?.value||'').trim();
    const fullName=String(document.getElementById('createMemberFullName')?.value||'').trim();
    const referrerCode=String(document.getElementById('createMemberReferrer')?.value||'').trim();
    const password=String(document.getElementById('createMemberPassword')?.value||'');
    const confirm=String(document.getElementById('createMemberConfirmPassword')?.value||'');
    if(!username){ createMemberStatus('Username is required.','error'); return; }
    if(password.length<6){ createMemberStatus('Password minimum 6 characters.','error'); return; }
    if(password!==confirm){ createMemberStatus('Confirm password does not match.','error'); return; }
    const submit=document.getElementById('createMemberSubmit');
    if(submit) submit.disabled=true;
    createMemberStatus('Creating user...','');
    try{
      const payload={username,mobile:mobile||null,password,fullName,referrerCode,status:1,locked:0};
      const json=await api(BO_AUTH.memberCreateUrl(),{method:'POST',headers:{'Content-Type':'application/json',...BO_AUTH.authHeader()},body:JSON.stringify(payload)});
      createMemberStatus(json.message||'Member created successfully.','success');
      await loadMembers();
      setTimeout(closeCreateMemberModal,500);
    }catch(err){ createMemberStatus(err.message||'Create member failed.','error'); }
    finally{ if(submit) submit.disabled=false; }
  }
  function bindCreateMember(){
    document.getElementById('memberCreateBtn')?.addEventListener('click',openCreateMemberModal);
    document.getElementById('createMemberClose')?.addEventListener('click',closeCreateMemberModal);
    document.getElementById('createMemberCancel')?.addEventListener('click',closeCreateMemberModal);
    document.getElementById('createMemberForm')?.addEventListener('submit',submitCreateMember);
    document.getElementById('createMemberModal')?.addEventListener('click',e=>{if(e.target.id==='createMemberModal') closeCreateMemberModal();});
  }

  function bindSearch(){
    document.getElementById('memberSearchQ')?.addEventListener('input', applySearch);
    ['memberSearchStatus','memberSearchLock','memberFrom','memberTo'].forEach(id=>{ const el=document.getElementById(id); if(el) el.addEventListener('change', applySearch); });
    const resetSearch=function(){
      ['memberSearchQ','memberSearchStatus','memberSearchLock','memberFrom','memberTo'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
      const rangeText=document.querySelector('.user-search-grid .bo-range-text');
      if(rangeText) rangeText.textContent='Select date range';
      document.querySelector('.user-search-grid .bo-range-field')?.classList.remove('bo-range-all-time');
      document.querySelectorAll('.user-search-grid .bo-range-presets [data-preset]').forEach(b=>{ b.classList.remove('active'); b.removeAttribute('aria-current'); });
      refreshRoundedMemberSelects();
      applySearch();
    };
    document.getElementById('memberResetBtn')?.addEventListener('click', resetSearch);
    document.getElementById('memberFilterResetBtn')?.addEventListener('click', resetSearch);
  }

  listen(document,'click',async e=>{
    const wb=e.target.closest('[data-member-wallet]');
    if(wb){
      const member = allMembers.find(m => String(first(m,['id','memberId','userId'], '')) === String(wb.dataset.memberWallet));
      if(member) openWalletModal(member);
      return;
    }
    const b=e.target.closest('[data-member-lock]'); if(!b)return;
    if(!b.dataset.memberLock) return alert('Missing member ID');
    const member = allMembers.find(m => String(first(m,['id','memberId','userId'],'')) === String(b.dataset.memberLock));
    const willLock = Number(b.dataset.lock) === 1;
    const username = first(member,['username'], 'this member');
    const confirmed = window.BO_DIALOG && BO_DIALOG.confirm
      ? await BO_DIALOG.confirm(`${willLock?'Lock':'Unlock'} ${username}? ${willLock?'The member will be unable to log in until unlocked.':''}`, {title: willLock?'Confirm Member Lock':'Confirm Member Unlock', confirmText: willLock?'Lock Member':'Unlock Member'})
      : false;
    if(!confirmed) return;
    try{ await api(BO_AUTH.memberUpdateUrl(b.dataset.memberLock),{method:'POST',headers:{'Content-Type':'application/json',...BO_AUTH.authHeader()},body:JSON.stringify({locked:Number(b.dataset.lock)})}); loadMembers(); }
    catch(err){ alert(err.message || 'Update failed'); }
  });
  document.addEventListener('DOMContentLoaded',()=>{
    initRoundedMemberSelects(); bindSearch(); bindColumnTools(); bindExportTool(); bindMemberPagination(); bindBulkWalletTools(); bindCreateMember(); bindTimeTips(); bindSortHeaders(); startOnlinePresence(); loadMembers();
  });
})();

