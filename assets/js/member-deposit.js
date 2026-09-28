(function(){
  let page=1,totalPages=1,currentRows=[];
  /* Only page numbers — pagination-standardizer already wraps ‹ #depositPager ›. */
  function pageButtons(current,total){
    total=Math.max(1,Number(total)||1);
    current=Math.max(1,Math.min(Number(current)||1,total));
    const pages=[];
    const add=n=>{if(n>=1&&n<=total&&!pages.includes(n))pages.push(n);};
    add(1);
    for(let n=current-2;n<=current+2;n++) add(n);
    add(total);
    pages.sort((a,b)=>a-b);
    let html='',prev=0;
    pages.forEach(n=>{
      if(prev&&n-prev>1) html+='<span class="smart-page-ellipsis">…</span>';
      html+='<button type="button" class="smart-page'+(n===current?' active':'')+'" data-page="'+n+'"'+(n===current?' aria-current="page"':'')+'>'+n+'</button>';
      prev=n;
    });
    return html;
  }
  function endpoint(k){return API_CONFIG.BASE_URL+API_CONFIG.ENDPOINTS[k];}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function num(v){const n=Number(v||0);return Number.isFinite(n)?n:0;}
  function money(v){return num(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}
  function dt(v){return window.BO_FORMAT?.dateTime?window.BO_FORMAT.dateTime(v):(v?String(v).replace('T',' ').slice(0,19):'-');}
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

  let paymentMethodsCache=null;
  async function paymentMethods(){
    if(paymentMethodsCache)return paymentMethodsCache;
    const json=await api(endpoint('PAYMENT_METHOD_LIST'));
    const d=json.data||{};
    paymentMethodsCache=Array.isArray(d)?d:(d.content||d.items||d.list||[]);
    return paymentMethodsCache;
  }
  function bankLabel(m){return [m.displayName,m.bankName,m.accountNumber].filter(Boolean).join(' · ')||('Bank #'+m.id);}
  function bankDetailHtml(m){if(!m)return '';const rows=[['Bank / Display Name',m.displayName],['Bank Name',m.bankName],['Account Name',m.accountName],['Account Number',m.accountNumber],['Pay ID',m.payId],['Method Type',m.methodType]].filter(x=>x[1]);return rows.length?`<div class="player-bank-detail">${rows.map(x=>`<div><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join('')}</div>`:'';}
  function depositProofUrl(row){
    if(!row?.proofImage)return '';
    const raw=String(row.proofImage).trim();
    if(!raw)return '';
    if(/^https?:\/\//i.test(raw))return raw;
    const base=String(API_CONFIG.STATIC_UPLOAD_BASE_URL||'').replace(/\/api\/?$/,'').replace(/\/$/,'');
    if(raw.startsWith('/uploads/'))return base+raw;
    if(raw.startsWith('uploads/'))return base+'/'+raw;
    return base+'/uploads/deposit-proof/'+raw.replace(/^\/+/, '');
  }
  function proofPreviewHtml(row){
    const url=depositProofUrl(row);
    if(!url)return '';
    return `<div class="deposit-proof-confirm"><span class="deposit-proof-label">Proof</span><button type="button" class="deposit-proof-thumb" data-proof-preview="${esc(url)}" title="Click to view deposit proof"><img src="${esc(url)}" alt="Deposit proof" loading="lazy"><span><i class="bi bi-arrows-fullscreen"></i> View Proof</span></button></div>`;
  }
  function openProofPreview(url){
    if(!url)return;
    const old=document.getElementById('depositProofPreviewPopup');if(old)old.remove();
    const wrap=document.createElement('div');wrap.id='depositProofPreviewPopup';
    wrap.innerHTML=`<div class="deposit-proof-preview-backdrop" data-proof-close><div class="deposit-proof-preview-dialog" role="dialog" aria-modal="true" aria-label="Deposit proof preview" onclick="event.stopPropagation()"><div class="deposit-proof-preview-head"><strong>Deposit Proof</strong><button type="button" data-proof-close>&times;</button></div><div class="deposit-proof-preview-body"><img src="${esc(url)}" alt="Deposit proof image"></div></div></div><style>#depositProofPreviewPopup .deposit-proof-preview-backdrop{position:fixed;inset:0;z-index:100500;background:rgba(15,23,42,.72);display:flex;align-items:center;justify-content:center;padding:24px}.deposit-proof-preview-dialog{width:min(900px,96vw);max-height:92vh;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 28px 80px rgba(0,0,0,.35)}.deposit-proof-preview-head{height:56px;padding:0 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb}.deposit-proof-preview-head strong{font-size:16px}.deposit-proof-preview-head button{border:0;background:transparent;font-size:28px;line-height:1;color:#475569}.deposit-proof-preview-body{padding:16px;background:#f8fafc;display:flex;align-items:center;justify-content:center;max-height:calc(92vh - 56px);overflow:auto}.deposit-proof-preview-body img{display:block;max-width:100%;max-height:calc(92vh - 90px);object-fit:contain;border-radius:10px;box-shadow:0 4px 20px rgba(15,23,42,.12)}</style>`;
    document.body.appendChild(wrap);
    wrap.querySelectorAll('[data-proof-close]').forEach(el=>el.addEventListener('click',()=>wrap.remove()));
    const onKey=e=>{if(e.key==='Escape'){wrap.remove();document.removeEventListener('keydown',onKey);}};
    document.addEventListener('keydown',onKey);
  }
  function norm(v){return String(v==null?'':v).trim().toLowerCase().replace(/\s+/g,' ');}
  function resolvePlayerBank(row,methods){
    if(!row||!Array.isArray(methods))return null;
    // Primary source of truth: the exact payment-method ID submitted by Naga.
    const id=row.paymentMethodId;
    if(id!=null&&id!==''){
      const byId=methods.find(m=>String(m.id)===String(id));
      if(byId)return byId;
    }
    // Backward-compatible fallback for older rows that stored a bank/display value instead of an ID.
    const rawCandidates=[row.paymentMethodDisplayName,row.paymentMethodBankName,row.paymentMethodAccountName,row.paymentMethodAccountNumber,row.paymentMethodPayId,row.paymentMethod].map(norm).filter(Boolean);
    if(!rawCandidates.length)return null;
    const exact=methods.filter(m=>rawCandidates.some(raw=>[m.displayName,m.bankName,m.accountName,m.accountNumber,m.payId].some(v=>norm(v)===raw)));
    if(exact.length===1)return exact[0];
    // A generic method type is safe only when exactly one configured bank uses that type.
    const byType=methods.filter(m=>rawCandidates.some(raw=>norm(m.methodType)===raw));
    if(byType.length===1)return byType[0];
    return null;
  }
  function approvalPopup(options){
    return new Promise(resolve=>{
      const old=document.getElementById('bankApprovalPopup'); if(old)old.remove();
      const wrap=document.createElement('div');wrap.id='bankApprovalPopup';wrap.innerHTML=`<div class="bank-approval-backdrop"><div class="bank-approval-dialog"><div class="bank-approval-head"><div><h3>${esc(options.title)}</h3><small>${esc(options.subtitle||'')}</small></div><button type="button" data-close>&times;</button></div><div class="bank-approval-body">${options.summaryHtml||''}<label class="bank-approval-label">${esc(options.bankLabel||'Bank')}</label><select class="form-select" data-bank><option value="">-- Select bank / payment method --</option>${options.methods.map(m=>`<option value="${esc(m.id)}" ${String(m.id)===String(options.defaultBankId||'')?'selected':''}>${esc(bankLabel(m))}${Number(m.status)===1?'':' [INACTIVE]'}</option>`).join('')}</select><label class="bank-approval-label mt-3">Admin Remark</label><textarea class="form-control" rows="3" data-remark placeholder="Optional admin remark"></textarea><div class="bank-approval-warning">${esc(options.warning||'')}</div></div><div class="bank-approval-foot"><button class="clean-btn" type="button" data-close>Cancel</button><button class="btn-primary-clean" type="button" data-confirm>${esc(options.confirmText||'Confirm')}</button></div></div></div>`;
      const style=document.createElement('style');style.textContent=`#bankApprovalPopup .bank-approval-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.46);display:flex;align-items:center;justify-content:center;padding:18px;z-index:99999}.bank-approval-dialog{width:min(600px,100%);background:#fff;border-radius:16px;box-shadow:0 24px 70px rgba(15,23,42,.25);overflow:hidden}.bank-approval-head{display:flex;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid #e5e7eb}.bank-approval-head h3{font-size:18px;margin:0 0 3px}.bank-approval-head small{color:#64748b}.bank-approval-head button{border:0;background:transparent;font-size:26px;line-height:1;color:#64748b}.bank-approval-body{padding:20px 22px}.bank-approval-summary{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:16px;line-height:1.55}.player-bank-detail{margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0;display:grid;grid-template-columns:1fr 1fr;gap:7px 16px}.player-bank-detail div{display:flex;flex-direction:column;line-height:1.35}.player-bank-detail span{font-size:11px;color:#64748b}.player-bank-detail b{font-size:13px;color:#0f172a;overflow-wrap:anywhere}.bank-approval-label{display:block;font-weight:700;font-size:13px;margin-bottom:7px}.bank-approval-warning{font-size:12px;color:#b45309;margin-top:12px}.deposit-proof-confirm{margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0}.deposit-proof-label{display:block;font-size:11px;color:#64748b;margin-bottom:7px}.deposit-proof-thumb{width:100%;display:flex;align-items:center;gap:12px;padding:8px;border:1px solid #dbe4f0;border-radius:10px;background:#fff;text-align:left;color:#1e40af;font-weight:700;font-size:12px;cursor:pointer}.deposit-proof-thumb:hover{border-color:#93c5fd;background:#f8fbff}.deposit-proof-thumb img{width:76px;height:58px;object-fit:cover;border-radius:7px;border:1px solid #e2e8f0;background:#f8fafc}.deposit-proof-thumb span{display:flex;align-items:center;gap:6px}.bank-approval-foot{display:flex;justify-content:flex-end;gap:10px;padding:16px 22px;border-top:1px solid #e5e7eb}@media(max-width:560px){.player-bank-detail{grid-template-columns:1fr}}`;wrap.appendChild(style);document.body.appendChild(wrap);const bankSelect=wrap.querySelector('[data-bank]');if(bankSelect&&options.defaultBankId!=null&&options.defaultBankId!=='')bankSelect.value=String(options.defaultBankId);
      const finish=v=>{wrap.remove();resolve(v);};wrap.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>finish(null));wrap.querySelector('[data-confirm]').onclick=()=>{const bankId=wrap.querySelector('[data-bank]').value;if(!bankId){BO_DIALOG.alert('Please select a bank/payment method.',{title:'Bank Required',type:'error'});return;}finish({paymentMethodId:Number(bankId),adminRemark:wrap.querySelector('[data-remark]').value.trim()});};
    });
  }
  function tableBodyScroll(root){
    return root?.querySelector?.('.bo-tx-table-body')
      || document.getElementById('depositTableScroll')
      || document.querySelector('.table-card .bo-tx-table-body')
      || document.querySelector('.table-card .table-wrap')
      || document.querySelector('.table-wrap');
  }
  let lockedAutoSize=null;
  function naturalRowHeight(scroll){
    const sample=scroll?.querySelector('tbody tr:not(.bo-table-fill) td');
    return sample?Math.max(38, Math.round(sample.getBoundingClientRect().height)):44;
  }
  function measureAutoPageSize(){
    const scroll=tableBodyScroll();
    if(!scroll) return 12;
    const avail=Math.max(0, Math.floor(scroll.clientHeight));
    const rowH=naturalRowHeight(scroll);
    /* Floor only — never add a row that would overflow and create a scrollbar. */
    return Math.max(5, Math.min(200, Math.floor(avail/rowH)||12));
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
    const v=String(raw??'-').trim();
    if(isAutoPageSize(v)) return autoFitPageSize();
    if(/^all$/i.test(v)) return 10000;
    const n=Number(v);
    return Number.isFinite(n)&&n>0?n:autoFitPageSize();
  }
  function isPlaceholderRow(tr){
    const cells=tr.querySelectorAll('td');
    if(cells.length<=1) return true;
    const text=(tr.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    return !text||text==='loading...'||text.startsWith('no deposit');
  }
  function resetEvenFill(body,table){
    table.classList.remove('bo-tx-evenfill');
    table.style.height='';
    body.querySelectorAll('tr.bo-table-fill').forEach(r=>r.remove());
    [...body.querySelectorAll('tr')].forEach(tr=>{
      tr.style.height='';
      tr.querySelectorAll('td').forEach(td=>{td.style.height='';td.style.minHeight='';});
    });
  }
  function evenFillRowHeights(){
    const body=document.getElementById('depositBody');
    const scroll=tableBodyScroll(body?.closest('.table-wrap'));
    const table=body?.closest('table');
    if(!body||!scroll||!table) return;
    resetEvenFill(body,table);
    if(!isAutoPageSize(document.getElementById('depositSize')?.value)) return;
    const rows=[...body.querySelectorAll('tr')].filter(tr=>!isPlaceholderRow(tr));
    if(!rows.length) return;
    void table.offsetHeight;
    const avail=Math.max(0, Math.floor(scroll.clientHeight));
    const natural=rows.reduce((sum,tr)=>sum+Math.ceil(tr.getBoundingClientRect().height),0);
    const rowH=Math.max(38, Math.round(natural/rows.length)||44);
    const gap=avail-natural;
    /* Never reload / reset page here — that broke Show "-" pagination.
       Stretch only when leftover is a seam (not enough for one more full row). */
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
    table.style.height=avail+'px';
    if(scroll.scrollHeight>scroll.clientHeight){
      const over=scroll.scrollHeight-scroll.clientHeight;
      const shrink=Math.ceil(over/rows.length)||1;
      rows.forEach(tr=>{
        const h=Math.max(rowH, (parseFloat(tr.style.height)||base)-shrink);
        tr.style.height=h+'px';
        tr.querySelectorAll('td').forEach(td=>{td.style.height=h+'px';});
      });
      table.style.height=Math.max(0, avail-over)+'px';
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
  }
  function publishPagerMeta(pagination,pageSize){
    const card=document.querySelector('.table-card');
    if(!card) return;
    const total=Number(pagination?.totalElements);
    if(Number.isFinite(total)&&total>=0) card.dataset.boTotal=String(total);
    else delete card.dataset.boTotal;
    const size=Number(pageSize);
    if(Number.isFinite(size)&&size>0) card.dataset.boPageSize=String(size);
    else delete card.dataset.boPageSize;
    card.dataset.boPage=String(page);
  }
  function q(){
    const params=new URLSearchParams();
    const kw=document.getElementById('depositKeyword')?.value.trim();
    const st=document.getElementById('depositStatus')?.value.trim();
    const statusFilter=st==='ALL'?'':st;
    const from=document.getElementById('depositFrom')?.value;
    const to=document.getElementById('depositTo')?.value;
    const sz=resolvePageSize(document.getElementById('depositSize')?.value);
    if(kw)params.set('keyword',kw); if(statusFilter)params.set('status',statusFilter); if(from)params.set('dateFrom',from); if(to)params.set('dateTo',to);
    params.set('page',page); params.set('size',String(sz)); return params.toString();
  }
  function paymentKeys(m){return [m.id,m.displayName,m.bankName,m.accountName,m.accountNumber,m.payId].map(norm).filter(Boolean);}
  function matchDepositBank(row,methods){
    const finalId=String(row?.approvedPaymentMethodId??row?.paymentMethodId??'').trim();
    if(finalId){const exact=methods.find(m=>String(m.id)===finalId);if(exact)return exact;}
    const candidates=[row?.approvedPaymentMethod,row?.paymentMethod,row?.paymentMethodDisplayName,row?.paymentMethodBankName,row?.paymentMethodAccountName,row?.paymentMethodAccountNumber,row?.paymentMethodPayId,row?.paymentMethodName,row?.methodName,row?.bankName].map(norm).filter(Boolean);
    for(const c of candidates){const exact=methods.find(m=>paymentKeys(m).includes(c));if(exact)return exact;}
    for(const c of candidates){const byType=methods.filter(m=>norm(m.methodType)===c);if(byType.length===1)return byType[0];}
    return null;
  }
  async function loadApprovedDeposits(){
    let all=[],p=1,guard=0;
    const from=document.getElementById('depositFrom')?.value||'';
    const to=document.getElementById('depositTo')?.value||'';
    while(guard++<500){
      const params=new URLSearchParams({page:String(p),size:'100'});
      if(from)params.set('dateFrom',from);
      if(to)params.set('dateTo',to);
      const json=await api(endpoint('MEMBER_DEPOSIT_LIST')+'?'+params);
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
  async function loadApprovedWithdrawals(){
    let all=[],p=1,guard=0;
    const from=document.getElementById('depositFrom')?.value||'';
    const to=document.getElementById('depositTo')?.value||'';
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
  function matchWithdrawBank(row,methods){
    const id=String(row?.fundingPaymentMethodId??'').trim();
    if(id){const exact=methods.find(m=>String(m.id)===id);if(exact)return exact;}
    return null;
  }
  async function loadManualBankDeposits(){
    let all=[],p=1,guard=0;
    const from=document.getElementById('depositFrom')?.value||'';
    const to=document.getElementById('depositTo')?.value||'';
    while(guard++<500){
      const params=new URLSearchParams({types:'ADMIN_DEPOSIT',page:String(p),size:'100'});
      if(from)params.set('from',from);
      if(to)params.set('to',to);
      const json=await api(endpoint('WALLET_LEDGER_LIST')+'?'+params);
      const d=json.data||{};
      const rows=(d.content||d.items||d.list||[]).filter(r=>r.paymentMethodId!=null&&String(r.paymentMethodId).trim()!=='');
      all.push(...rows);
      const pg=json.pagination||d.pagination||d;
      const totalPages=Number(pg.totalPages||1)||1;
      if(p>=totalPages||!(d.content||d.items||d.list||[]).length)break;
      p++;
    }
    return all;
  }
  async function renderBankCards(){
    const host=document.getElementById('depositBankCards');
    if(!host)return;
    try{
      const allMode=new URLSearchParams(location.search).get('tab')==='all';
      const [methods,deposits,manual,withdrawals]=await Promise.all([paymentMethods(),loadApprovedDeposits(),loadManualBankDeposits(),allMode?loadApprovedWithdrawals():Promise.resolve([])]);
      if(!methods.length){
        host.innerHTML='<article class="deposit-bank-card is-empty"><div class="deposit-bank-total"><span>Banks</span><strong>0</strong></div><div class="bo-summary-note">No payment methods</div></article>';
        return;
      }
      const totals=new Map(methods.map(m=>[String(m.id),0]));
      deposits.forEach(r=>{
        const m=matchDepositBank(r,methods);
        if(!m)return;
        totals.set(String(m.id),num(totals.get(String(m.id)))+num(r.amount));
      });
      manual.forEach(r=>{
        const id=String(r.paymentMethodId);
        if(!totals.has(id))return;
        totals.set(id,num(totals.get(id))+Math.abs(num(r.amount)));
      });
      withdrawals.forEach(r=>{
        const m=matchWithdrawBank(r,methods);
        if(!m)return;
        totals.set(String(m.id),num(totals.get(String(m.id)))+Math.abs(num(r.amount)));
      });
      host.innerHTML=methods.map(m=>{
        const name=String(m.bankName||m.displayName||('Bank #'+m.id)).trim();
        const total=num(totals.get(String(m.id)));
        const max=num(m.maxAmount);
        const pctRaw=max>0?(Math.max(0,total)/max)*100:0;
        const pct=Math.min(100,pctRaw);
        const fillClass=max>0?(pctRaw>=100?'is-over':pctRaw>=80?'is-warn':''):'';
        const mark=(name.replace(/[^A-Za-z0-9]/g,'')||'B').charAt(0).toUpperCase();
        const account=m.accountNumber?String(m.accountNumber).trim():'';
        const method=m.displayName&&String(m.displayName).trim()!==name?String(m.displayName).trim():(m.methodType||'');
        const meta=[method,account].filter(Boolean).join(' · ')||'Payment method';
        const meter=max>0
          ?`<div class="deposit-bank-meter" title="${esc(money(total)+' / '+money(max))}">
              <div class="deposit-bank-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct.toFixed(0)}" aria-label="Max amount usage for ${esc(name)}">
                <div class="deposit-bank-fill ${fillClass}" style="width:${pct.toFixed(2)}%"></div>
              </div>
              <div class="deposit-bank-meter-line"><span>Max ${money(max)}</span><span>${pctRaw.toFixed(0)}%</span></div>
            </div>`
          :`<div class="deposit-bank-meter is-empty">
              <div class="deposit-bank-track" aria-hidden="true"><div class="deposit-bank-fill" style="width:0%"></div></div>
              <div class="deposit-bank-meter-line"><span>Max amount</span><span>No max</span></div>
            </div>`;
        return `<article class="deposit-bank-card" data-bank-id="${esc(m.id)}">
          <div class="deposit-bank-card-head">
            <div class="deposit-bank-mark" aria-hidden="true">${esc(mark)}</div>
            <div class="deposit-bank-id">
              <b>${esc(name)}</b>
              <small>${esc(meta)}</small>
            </div>
          </div>
          <div class="deposit-bank-total">
            <strong>${money(total)}</strong>
          </div>
          ${meter}
        </article>`;
      }).join('');
    }catch(e){
      host.innerHTML=`<article class="deposit-bank-card is-empty"><div class="deposit-bank-total"><span>Banks</span><strong>-</strong></div><div class="bo-summary-note">${esc(e.message||'Failed to load')}</div></article>`;
    }
  }
  function formatMethodLabel(row,methods){
    const bank=(Array.isArray(methods)?(matchDepositBank(row,methods)||resolvePlayerBank(row,methods)):null);
    const name=String(
      bank?.bankName||bank?.displayName||
      row?.approvedPaymentMethod||row?.paymentMethodBankName||row?.paymentMethodDisplayName||row?.paymentMethod||
      '-'
    ).trim()||'-';
    const account=String(
      bank?.accountNumber||
      row?.approvedPaymentMethodAccountNumber||
      row?.paymentMethodAccountNumber||
      ''
    ).trim();
    if(name==='-') return '-';
    return account?`${name} (${account})`:name;
  }
  function render(rows,pagination,methods){
    currentRows=rows; const body=document.getElementById('depositBody'); if(!body)return;
    if(!rows.length) body.innerHTML='<tr><td colspan="8">No deposit request found.</td></tr>';
    else body.innerHTML=rows.map(r=>{
      const pending=String(r.status||'').toUpperCase()==='PENDING';
      const methodLabel=formatMethodLabel(r,methods);
      return `<tr><td>${dtCell(r.createdAt)}</td><td>${esc(r.username||'-')}</td><td>${money(r.amount)}</td><td><b>${esc(methodLabel)}</b></td><td>${esc(r.referenceNo||'-')}</td><td><span class="status-pill ${r.status==='APPROVED'?'active':r.status==='REJECTED'?'off':''}">${esc(r.status||'-')}</span></td><td>${esc(dt(r.processedAt))}</td><td>${pending?`<div class="bo-tx-actions"><button type="button" class="bo-tx-action-btn is-approve" data-approve="${esc(r.id)}" title="Approve" aria-label="Approve"><i class="bi bi-check-lg" aria-hidden="true"></i></button><button type="button" class="bo-tx-action-btn is-reject" data-reject="${esc(r.id)}" title="Reject" aria-label="Reject"><i class="bi bi-x-lg" aria-hidden="true"></i></button></div>`:'-'}</td></tr>`;
    }).join('');
    totalPages=Number(pagination?.totalPages)||1;
    const pageSize=resolvePageSize(document.getElementById('depositSize')?.value);
    publishPagerMeta(pagination,pageSize);
    document.getElementById('depositPager').innerHTML=pageButtons(page,totalPages);
    document.getElementById('depositPrevBtn').disabled=page<=1; document.getElementById('depositNextBtn').disabled=page>=totalPages;
    scheduleEvenFill();
  }
  async function load(){
    const body=document.getElementById('depositBody'); if(body)body.innerHTML='<tr><td colspan="8">Loading...</td></tr>';
    try{
      const [json,methods]=await Promise.all([api(endpoint('MEMBER_DEPOSIT_LIST')+'?'+q()),paymentMethods().catch(()=>[])]);
      const data=json.data||{};
      // The list endpoint has existed in both ApiResponse shapes in production:
      // pagination may be top-level and rows may be data.content, data.items/list,
      // or data itself. Keep the transaction page compatible with all of them so
      // the tab count and visible rows can never disagree only because of shape.
      const rows=Array.isArray(data)?data:(data.content||data.items||data.list||json.content||json.items||json.list||[]);
      const pagination=json.pagination||data.pagination||((data&&typeof data==='object')?data:{});
      render(Array.isArray(rows)?rows:[],pagination,methods);
    }
    catch(e){if(body)body.innerHTML='<tr><td colspan="8" class="text-danger">'+esc(e.message)+'</td></tr>';}
  }
  async function action(id,type){
    const row=currentRows.find(x=>String(x.id)===String(id));
    if(type==='reject'){
      const remark=await BO_DIALOG.prompt('Enter an admin remark for this deposit request.','',{title:'Admin Remark',inputLabel:'Admin remark',confirmText:'Continue'});if(remark===null)return;
      if(!(await BO_DIALOG.confirm('Confirm reject deposit request?',{title:'Confirm Deposit Rejection'})))return;
      try{const json=await api(endpoint('MEMBER_DEPOSIT_REJECT')+'/'+encodeURIComponent(id),{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Username':String(BO_AUTH.user()?.username||'ADMIN'),...BO_AUTH.authHeader()},body:JSON.stringify({adminRemark:remark})});BO_DIALOG.alert(json.message||'Done',{title:'Deposit Updated'});await load();await renderBankCards();document.dispatchEvent(new CustomEvent('bo:wallet-request-updated',{detail:{type:'deposit',action:type,id:String(id)}}));}catch(e){BO_DIALOG.alert(e.message||'Action failed',{title:'Deposit Action Failed',type:'error'});}return;
    }
    try{
      const methods=await paymentMethods();
      const playerBank=resolvePlayerBank(row,methods);
      const playerSelectedText=playerBank?bankLabel(playerBank):(row?.paymentMethodDisplayName||row?.paymentMethod||'-');
      const detailSource=playerBank||{displayName:row?.paymentMethodDisplayName,bankName:row?.paymentMethodBankName,accountName:row?.paymentMethodAccountName,accountNumber:row?.paymentMethodAccountNumber,payId:row?.paymentMethodPayId,methodType:row?.paymentMethodMethodType};
      const picked=await approvalPopup({title:'Final Deposit Confirmation',subtitle:'Confirm the bank that actually received this money.',methods,defaultBankId:playerBank?.id,bankLabel:'Actual Receiving Bank',confirmText:'Approve Deposit',warning:playerBank?'Player-selected bank is preselected automatically. Change it only when the money was actually received by another bank.':'This older/ambiguous request does not contain a unique bank ID. Please select the actual receiving bank before approval.',summaryHtml:`<div class="bank-approval-summary"><b>Member:</b> ${esc(row?.username||'-')} (#${esc(row?.memberId||'-')})<br><b>Amount:</b> ${money(row?.amount)}<br><b>Player Selected:</b> ${esc(playerSelectedText)}${bankDetailHtml(detailSource)}${proofPreviewHtml(row)}</div>`});
      if(!picked)return;
      if(!(await BO_DIALOG.confirm(`Approve ${money(row?.amount)} and assign it to the selected receiving bank?`,{title:'Confirm Deposit Approval'})))return;
      const json=await api(endpoint('MEMBER_DEPOSIT_APPROVE')+'/'+encodeURIComponent(id),{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Username':String(BO_AUTH.user()?.username||'ADMIN'),...BO_AUTH.authHeader()},body:JSON.stringify({adminRemark:picked.adminRemark,paymentMethodId:picked.paymentMethodId})});BO_DIALOG.alert(json.message||'Done',{title:'Deposit Updated'});await load();await renderBankCards();document.dispatchEvent(new CustomEvent('bo:wallet-request-updated',{detail:{type:'deposit',action:type,id:String(id)}}));
    }catch(e){BO_DIALOG.alert(e.message||'Action failed',{title:'Deposit Action Failed',type:'error'});}
  }
  document.addEventListener('click',e=>{const proof=e.target.closest?.('[data-proof-preview]');if(proof){e.preventDefault();e.stopPropagation();openProofPreview(proof.dataset.proofPreview);return;}const a=e.target.closest?.('[data-approve]'); const r=e.target.closest?.('[data-reject]'); if(a)action(a.dataset.approve,'approve'); if(r)action(r.dataset.reject,'reject');});
  async function refreshTxTabCounts(){
    const from=document.getElementById('depositFrom')?.value||'';
    const to=document.getElementById('depositTo')?.value||'';
    const status=document.getElementById('depositStatus')?.value||'';
    const statusFilter=status==='ALL'?'':status;
    async function count(key){
      const params=new URLSearchParams({page:'1',size:'1'});
      if(from)params.set('dateFrom',from); if(to)params.set('dateTo',to); if(statusFilter)params.set('status',statusFilter);
      const json=await api(endpoint(key)+'?'+params);
      const d=json.data||{}; const pg=json.pagination||d.pagination||d;
      const n=Number(pg.totalElements);
      if(Number.isFinite(n))return Math.max(0,n);
      const rows=d.content||d.items||d.list||[]; return rows.length;
    }
    try{
      const [d,w]=await Promise.all([count('MEMBER_DEPOSIT_LIST'),count('MEMBER_WITHDRAW_LIST')]);
      const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=String(v);};
      set('boTxCountDeposit',d);set('boTxCountWithdraw',w);set('boTxCountAll',d+w);
    }catch(_e){}
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

  const initDepositPage=()=>{
    // In the combined All tab this script is loaded only for the bank summary.
    // The combined transaction switcher exclusively owns the shared table.
    if(new URLSearchParams(location.search).get('tab')==='all'){
      renderBankCards();
      return;
    }
    syncTxTypeTabs('deposit');
    let keywordTimer=0;
    const runSearch=()=>{page=1;clearLockedAutoSize();load();renderBankCards();refreshTxTabCounts();};
    document.getElementById('depositKeyword')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(keywordTimer);runSearch();}});
    document.getElementById('depositKeyword')?.addEventListener('input',()=>{clearTimeout(keywordTimer);keywordTimer=setTimeout(runSearch,350);});
    document.getElementById('depositStatus')?.addEventListener('change',runSearch);
    document.getElementById('depositSize')?.addEventListener('change',()=>{clearLockedAutoSize();runSearch();});
    ['depositFrom','depositTo'].forEach(id=>document.getElementById(id)?.addEventListener('change',runSearch));
    document.getElementById('depositPrevBtn')?.addEventListener('click',()=>{if(page>1){page--;load();}}); document.getElementById('depositNextBtn')?.addEventListener('click',()=>{if(page<totalPages){page++;load();}});
    document.getElementById('depositPager')?.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(!b)return;const n=Number(b.dataset.page);if(n>=1&&n<=totalPages&&n!==page){page=n;load();}});
    bindEvenFillObserver();
    const tableBodyScroll=document.getElementById('depositTableScroll');
    const tableHead=tableBodyScroll?.closest('.table-wrap')?.querySelector('.bo-tx-table-head');
    if(tableBodyScroll&&tableHead){
      tableBodyScroll.addEventListener('scroll',()=>{tableHead.scrollLeft=tableBodyScroll.scrollLeft;},{passive:true});
    }
    requestAnimationFrame(()=>requestAnimationFrame(async ()=>{
      try{await renderBankCards();}catch(e){}
      clearLockedAutoSize();
      load();
    }));
    let resizeTimer=0;
    window.addEventListener('resize',()=>{
      if(!isAutoPageSize(document.getElementById('depositSize')?.value)) return;
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
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initDepositPage,{once:true});
  else initDepositPage();
})();
