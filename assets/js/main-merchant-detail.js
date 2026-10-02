(function(){'use strict';
 /* A swap re-runs this file against a fresh frame, so the document/window bindings below were
    added again on each entry: N entries meant N resize / password-toggle / Escape handlers.
    Release the previous run's bindings first; they close over the frame on screen. */
 if(window.__boMmdUnbind) window.__boMmdUnbind();
 const unbinds=[];
 const listen=(target,type,fn,opt)=>{ target.addEventListener(type,fn,opt); unbinds.push(()=>target.removeEventListener(type,fn,opt)); };
 window.__boMmdUnbind=()=>{ unbinds.forEach(fn=>fn()); unbinds.length=0; };
 const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=v=>Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
 const body=$('madTableBody'),search=$('madSearchInput'),roleFilter=$('madRoleFilter'),currencyFilter=$('madCurrencyFilter'),editWorkspace=$('madEditWorkspace'),listWorkspace=$('madListWorkspace'),form=$('madEditForm');
 const tableWrap=document.querySelector('.mad-table-wrap');
 const pageSizeEl=$('madEntriesPageSize');
 const pageTitle=document.querySelector('.report-topbar h1');
 const pageLead=document.querySelector('.report-topbar .user-title-wrap p');
 const PAGE_TITLE_LIST='Merchants';
 const PAGE_LEAD_LIST='Manage merchants (existing Brand records), domains, credit, access, and account status.';
 const PAGE_TITLE_EDIT='Edit Merchant';
 const PAGE_LEAD_EDIT='Update brand tenant details, credit policy, and provider pricing.';
 function setPageChrome(editing){
  if(pageTitle) pageTitle.textContent=editing?PAGE_TITLE_EDIT:PAGE_TITLE_LIST;
  if(pageLead) pageLead.textContent=editing?PAGE_LEAD_EDIT:PAGE_LEAD_LIST;
 }
 const selectAllInput=$('madSelectAll'),selectAllWrap=$('madSelectAllWrap'),bulkDeleteBtn=$('madBulkDeleteBtn'),resetBtn=$('madResetBtn');
 let rows=[],filtered=[],page=1,status='active',editing=null,editingMaster=null,detail=null;
 let platformProviders=[];
 let currencyOptions=[];
 const selectedCodes=new Set();
 const overrideByCode=new Map();
 const enabledCurrencies=new Set(['MYR']);
 const listFilterCurrencies=new Set();
 let currencyModalContext='edit';
 const currencyModalDraft=new Set(['MYR']);
 const currencyModalSelected=new Set();
 let providerSearch='';
 const selectedMerchantIds=new Set();
 const PAGE=10;
 let pageSize=10;
 let autoPageSize=null;
 function isAutoPageSize(value){
  const v=String(value==null?'-':value).trim();
  return v===''||v==='-'||/^auto$/i.test(v);
 }
 function measureAutoPageSize(){
  if(!tableWrap) return PAGE;
  const head=tableWrap.querySelector('thead');
  const sample=tableWrap.querySelector('tbody tr:not(.mad-empty)');
  const rowHeight=sample?Math.max(36,Math.round(sample.getBoundingClientRect().height)):44;
  const available=Math.max(0,Math.floor(tableWrap.clientHeight)-(head?Math.ceil(head.getBoundingClientRect().height):0));
  /* Floor only — never add a row that would overflow and clip. Leftover seam
     (< one row height) is stretched evenly by evenFillRowHeights(). */
  return Math.max(5,Math.min(200,Math.floor(available/rowHeight)||PAGE));
 }
 function resetEvenFill(){
  if(!body) return;
  const table=body.closest('table');
  if(table){
   table.classList.remove('bo-tx-evenfill');
   table.style.height='';
  }
  tableWrap?.removeAttribute('data-bo-autofit');
  [...body.querySelectorAll('tr')].forEach(tr=>{
   tr.style.height='';
   tr.querySelectorAll('td').forEach(td=>{td.style.height='';td.style.minHeight='';});
  });
 }
 /* Show `-`: stretch leftover seam across painted rows when gap < one full row height. */
 function evenFillRowHeights(){
  if(!body||!tableWrap) return;
  resetEvenFill();
  if(!pageSizeEl||!isAutoPageSize(pageSizeEl.value)) return;
  const table=body.closest('table');
  if(!table) return;
  const rows=[...body.querySelectorAll('tr.mad-row')];
  if(!rows.length) return;
  void table.offsetHeight;
  const head=tableWrap.querySelector('thead');
  const avail=Math.max(0,Math.floor(tableWrap.clientHeight)-(head?Math.ceil(head.getBoundingClientRect().height):0));
  const natural=rows.reduce((sum,tr)=>sum+Math.ceil(tr.getBoundingClientRect().height),0);
  const rowH=Math.max(36,Math.round(natural/rows.length)||44);
  if(natural>avail+1&&autoPageSize!=null&&autoPageSize>5){
   autoPageSize=Math.max(5,autoPageSize-1);
   render();
   return;
  }
  const gap=avail-natural;
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
  table.style.height=(avail+(head?Math.ceil(head.getBoundingClientRect().height):0))+'px';
  tableWrap.setAttribute('data-bo-autofit','');
  if(tableWrap.scrollHeight>tableWrap.clientHeight){
   const over=tableWrap.scrollHeight-tableWrap.clientHeight;
   const shrink=Math.ceil(over/rows.length)||1;
   rows.forEach(tr=>{
    const h=Math.max(rowH,(parseFloat(tr.style.height)||base)-shrink);
    tr.style.height=h+'px';
    tr.querySelectorAll('td').forEach(td=>{td.style.height=h+'px';});
   });
  }
 }
 function scheduleEvenFill(){
  requestAnimationFrame(()=>requestAnimationFrame(evenFillRowHeights));
 }
 function resolvePageSize(){
  const raw=String(pageSizeEl&&pageSizeEl.value||'-').trim();
  if(/^all$/i.test(raw)) return 10000;
  if(isAutoPageSize(raw)){
   if(autoPageSize==null) autoPageSize=measureAutoPageSize();
   return autoPageSize;
  }
  const n=Number(raw);
  return Number.isFinite(n)&&n>0?n:PAGE;
 }
 function pageButtons(current, total){
  total=Math.max(1, Number(total)||1);
  current=Math.max(1, Math.min(Number(current)||1, total));
  const pages=[];
  const add=n=>{ if(n>=1 && n<=total && !pages.includes(n)) pages.push(n); };
  add(1);
  for(let n=current-2;n<=current+2;n++) add(n);
  add(total);
  pages.sort((a,b)=>a-b);
  let html='';
  html+='<button type="button" class="smart-page nav-text" data-page="'+Math.max(1,current-1)+'" '+(current<=1?'disabled':'')+'>Previous</button>';
  let prev=0;
  pages.forEach(n=>{
   if(prev && n-prev>1) html+='<span class="smart-page-ellipsis">…</span>';
   html+='<button type="button" class="smart-page '+(n===current?'active':'')+'" data-page="'+n+'" '+(n===current?'aria-current="page"':'')+'>'+n+'</button>';
   prev=n;
  });
  html+='<button type="button" class="smart-page nav-text" data-page="'+Math.min(total,current+1)+'" '+(current>=total?'disabled':'')+'>Next</button>';
  return html;
 }
 async function api(path,opt={}){const r=await fetch(API_CONFIG.BASE_URL+path,opt),j=await r.json().catch(()=>({}));if(!r.ok||j.status==='error')throw Error(j.message||'Request failed');return j.data}
 const hdr=()=>({'Content-Type':'application/json',...BO_AUTH.authHeader()}),active=b=>Number(b.status)===1,dt=v=>v?new Date(v).toLocaleString():'-';
 function parseDate(value){
  if(!value) return null;
  try{const d=new Date(value);return isNaN(d.getTime())?null:d;}catch(e){return null;}
 }
 function timeOnly(value){
  const d=parseDate(value); if(!d) return '-';
  const pad=n=>String(n).padStart(2,'0');
  return pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
 }
 function dateMmDdYyyy(value){
  const d=parseDate(value); if(!d) return '';
  const pad=n=>String(n).padStart(2,'0');
  return pad(d.getMonth()+1)+'/'+pad(d.getDate())+'/'+d.getFullYear();
 }
 function timeWithDateTip(value){
  if(!value) return '<span class="mad-muted">-</span>';
  const t=timeOnly(value);
  if(t==='-') return '<span class="mad-muted">-</span>';
  const date=dateMmDdYyyy(value);
  if(!date) return '<span class="mad-time">'+esc(t)+'</span>';
  return '<span class="mad-time mad-time-tip" data-date="'+esc(date)+'" tabindex="0">'+esc(t)+'</span>';
 }
 function firstNonEmpty(){
  for(let i=0;i<arguments.length;i++){
   const v=arguments[i];
   if(v==null) continue;
   const s=String(v).trim();
   if(s) return s;
  }
  return '';
 }
 function auditDateParts(value){
  const d=parseDate(value);
  if(!d) return {date:'—', time:'—', empty:true};
  const pad=n=>String(n).padStart(2,'0');
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return {
   date: pad(d.getDate())+' '+months[d.getMonth()]+' '+d.getFullYear(),
   time: pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds()),
   empty:false
  };
 }
 function setAuditText(id, text, empty){
  const el=$(id);
  if(!el) return;
  el.textContent=text||'—';
  el.classList.toggle('is-empty', !!empty || !text || text==='—');
 }
 function setAuditDateTime(dateId, timeId, value){
  const parts=auditDateParts(value);
  setAuditText(dateId, parts.date, parts.empty);
  setAuditText(timeId, parts.time, parts.empty);
 }
 function hydrateAuditMeta(b, m){
  const brand=b||{};
  const master=m||{};
  setAuditDateTime(
   'madAuditCreatedDate',
   'madAuditCreatedTime',
   firstNonEmpty(brand.createdAt, brand.createTime, brand.created_at, master.createdAt)
  );
  setAuditText(
   'madAuditCreatedBy',
   firstNonEmpty(brand.createdByName, brand.createdByUsername, brand.createdBy, master.createdByName, master.createdByUsername, 'Legacy / Migration'),
   false
  );
  setAuditDateTime(
   'madAuditUpdatedDate',
   'madAuditUpdatedTime',
   firstNonEmpty(brand.updatedAt, brand.updateTime, brand.updated_at, brand.lastUpdatedAt, master.updatedAt)
  );
  setAuditText(
   'madAuditUpdatedBy',
   firstNonEmpty(brand.updatedByName, brand.updatedByUsername, brand.updatedBy, brand.lastUpdatedByName, brand.lastUpdatedBy, master.updatedByName, master.updatedByUsername, '—'),
   !firstNonEmpty(brand.updatedByName, brand.updatedByUsername, brand.updatedBy, brand.lastUpdatedByName, brand.lastUpdatedBy, master.updatedByName, master.updatedByUsername)
  );
  setAuditDateTime(
   'madAuditLoginDate',
   'madAuditLoginTime',
   firstNonEmpty(brand.masterLastLoginAt, brand.lastLoginAt, master.lastLoginAt, master.lastLogin)
  );
  setAuditDateTime(
   'madAuditLogoutDate',
   'madAuditLogoutTime',
   firstNonEmpty(brand.masterLastLogoutAt, brand.lastLogoutAt, master.lastLogoutAt, master.lastLogout)
  );
 }
 function statusSelect(b){
  const on=active(b);
  const next=on?0:1;
  return `<button type="button" class="mad-status-chip ${on?'is-active':'is-suspended'}" data-merchant-status-toggle="${esc(b.id)}" data-next-status="${next}" title="${on?'Click to Suspend':'Click to Activate'}" aria-label="${on?'Active, click to Suspend':'Suspended, click to Activate'}">
    <i class="mad-status-dot" aria-hidden="true"></i>
    <span class="mad-status-chip-label">${on?'Active':'Suspended'}</span>
  </button>`;
 }
 function roleName(b){
  const nested=b.masterAccount||b.master||null;
  return b.masterRoleName || b.roleName || nested?.roleName || nested?.role || b.masterRole || b.role || b.masterRoleType || b.roleType || nested?.roleType || 'Brand Owner';
 }
 function roleTone(name){
  const n=String(name||'').toLowerCase();
  if(n.includes('regional')) return 'is-regional';
  if(n.includes('super')||n.includes('root')||n.includes('master')||n.includes('owner')) return 'is-super';
  if(n.includes('partner')) return 'is-partner';
  if(n.includes('risk')) return 'is-risk';
  if(n.includes('tech')) return 'is-tech';
  if(n.includes('merchant')||n.includes('brand')||n.includes('sub')) return 'is-merchant';
  return '';
 }
 // Avatar initials come from the company name, not the code: the code is already printed
 // right next to the tile, so repeating it made the avatar carry no information.
 function avatarInitials(b){
  const name=String(b.name||'').trim();
  if(name){
   const parts=name.split(/[\s\-_]+/).filter(Boolean);
   if(parts.length>=2) return (parts[0][0]+parts[1][0]).toUpperCase();
   return name.slice(0,2).toUpperCase();
  }
  return String(b.code||'M').slice(0,2).toUpperCase();
 }
 async function updateMerchantStatus(id, nextStatus, chipEl){
  const row=rows.find(x=>Number(x.id)===Number(id));
  if(!row) return;
  const prev=String(row.status??1);
  if(String(nextStatus)===prev) return;
  if(chipEl){ chipEl.disabled=true; chipEl.classList.add('is-saving'); }
  try{
   await api('/admin/merchants/save',{
    method:'POST',
    headers:hdr(),
    body:JSON.stringify({
     id:Number(id),
     code:row.code||'',
     name:row.name||'',
     primaryDomain:row.primaryDomain||'',
     currency:row.currency||'MYR',
     frontendRoot:row.frontendRoot||'',
     creditMode:row.creditMode||'WHOLE',
     status:Number(nextStatus),
     domainAliases:row.domainAliases||'',
     lowCreditThreshold:row.lowCreditThreshold||0,
     providerMarkupPercent:Number(row.providerMarkupPercent||0)
    })
   });
   row.status=Number(nextStatus);
   if(Number(nextStatus)===1) selectedMerchantIds.delete(String(id));
   apply();
  }catch(e){
   if(window.BO_DIALOG?.alert) BO_DIALOG.alert(e.message,{title:'Unable to Update Status',type:'error'});
   else alert(e.message);
  }finally{
   if(chipEl){ chipEl.disabled=false; chipEl.classList.remove('is-saving'); }
  }
 }
 function selectableIdsOnPage(){
  return [...(body?.querySelectorAll('[data-merchant-select]')||[])].map(el=>String(el.getAttribute('data-merchant-select')));
 }
 function syncSelectionUi(){
  const showSelect=status==='suspended'||status==='all';
  const isActiveView=status==='active';
  document.body.classList.toggle('mad-view-active', isActiveView);
  document.body.classList.toggle('mad-view-suspended', status==='suspended');
  document.body.classList.toggle('mad-view-all', status==='all');
  if(resetBtn) resetBtn.hidden=isActiveView;
  if(selectAllWrap) selectAllWrap.hidden=!showSelect;
  if(bulkDeleteBtn){
   bulkDeleteBtn.hidden=!showSelect;
   bulkDeleteBtn.disabled=!showSelect||selectedMerchantIds.size===0;
  }
  if(!showSelect){
   if(selectAllInput){
    selectAllInput.checked=false;
    selectAllInput.indeterminate=false;
   }
   return;
  }
  const ids=selectableIdsOnPage();
  const selectedOnPage=ids.filter(id=>selectedMerchantIds.has(id));
  if(selectAllInput){
   selectAllInput.checked=ids.length>0&&selectedOnPage.length===ids.length;
   selectAllInput.indeterminate=selectedOnPage.length>0&&selectedOnPage.length<ids.length;
  }
 }
 function clearMerchantSelection(){
  selectedMerchantIds.clear();
  syncSelectionUi();
 }
 function apply(){
  const q=(search?.value||'').trim().toLowerCase();
  const role=(roleFilter?.value||'').trim();
  const cur=(currencyFilter?.value||'').trim();
  filtered=rows.filter(b=>{
   if(!(status==='all'||(status==='active'&&active(b))||(status==='suspended'&&!active(b)))) return false;
   if(cur && String(b.currency||'MYR')!==cur) return false;
   if(role && roleName(b)!==role) return false;
   if(q && ![b.code,b.name,b.primaryDomain,b.createdByName,b.masterUsername,roleName(b)].join(' ').toLowerCase().includes(q)) return false;
   return true;
  });
  page=1;
  render();
 }
 function syncFilterOptions(){
  const roles=[...new Set(rows.map(roleName).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  ensureListCurrencyPool();
  const currencies=[...new Set([
   ...[...listFilterCurrencies],
   ...rows.map(x=>normalizeCurrencyCode(x.currency||'MYR')).filter(Boolean)
  ])].sort((a,b)=>a.localeCompare(b));
  const keepRole=roleFilter?.value||'';
  const keepCur=currencyFilter?.value||'';
  if(roleFilter){
   roleFilter.innerHTML='<option value="">All Roles</option>'+roles.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('');
   if(keepRole && roles.includes(keepRole)) roleFilter.value=keepRole;
  }
  if(currencyFilter){
   currencyFilter.innerHTML='<option value="">All Currencies</option>'+currencies.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
   if(keepCur && currencies.includes(keepCur)) currencyFilter.value=keepCur;
   else if(keepCur && !currencies.includes(keepCur)) currencyFilter.value='';
   if(window.BOSelectSync?.one) window.BOSelectSync.one(currencyFilter);
  }
 }
 function ensureListCurrencyPool(){
  if(listFilterCurrencies.size) return;
  rows.forEach(x=>{
   const code=normalizeCurrencyCode(x.currency||'MYR');
   if(code) listFilterCurrencies.add(code);
  });
  if(!listFilterCurrencies.size) listFilterCurrencies.add('MYR');
 }
 function render(){
  const all=rows.length,act=rows.filter(active).length;
  $('madCountAll').textContent=all;
  $('madCountActive').textContent=act;
  $('madCountSuspended').textContent=all-act;
  pageSize=resolvePageSize();
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize)),st=(page-1)*pageSize,s=filtered.slice(st,st+pageSize);
  const showSelectCol=status==='suspended'||status==='all';
  body.innerHTML=s.length?s.map(b=>{
   const canDelete=!active(b);
   const idStr=String(b.id);
   const checked=canDelete&&selectedMerchantIds.has(idStr)?' checked':'';
   const selectHtml=!showSelectCol
     ?''
     :(canDelete
       ?`<label class="mad-row-check"><input type="checkbox" class="mad-row-check-input" data-merchant-select="${esc(b.id)}"${checked} aria-label="Select ${esc(b.code||b.name||'merchant')}"><span class="mad-row-check-box" aria-hidden="true"></span></label>`
       :'<span class="mad-row-check mad-row-check-spacer" aria-hidden="true"></span>');
   const deleteBtn=canDelete
     ?`<button class="mad-merchant-icon-btn is-danger" data-delete="${esc(b.id)}" type="button" data-tip="Delete" aria-label="Delete merchant"><i class="bi bi-trash3" aria-hidden="true"></i></button>`
     :'';
   const rn=roleName(b);
   const creditBtn=`<button class="mad-merchant-icon-btn mad-merchant-credit-btn" data-credit="${esc(b.id)}" type="button" data-tip="Add / reclaim credit" aria-label="Add or reclaim credit"><i class="bi bi-plus-lg" aria-hidden="true"></i></button>`;
   const resetPassBtn=`<button class="mad-merchant-icon-btn mad-merchant-key-btn" data-reset-pass="${esc(b.id)}" type="button" data-tip="Reset password" aria-label="Reset password"><i class="bi bi-key" aria-hidden="true"></i></button>`;
   return `<tr class="mad-row${canDelete?' is-suspended-row':''}">`+
     `<td data-label="Merchant"><div class="mad-user">${selectHtml}<span class="mad-avatar">${esc(avatarInitials(b))}</span><div class="mad-user-copy"><b>${esc(b.code||'-')}</b><div class="mad-user-meta">#${esc(b.id)}</div></div></div></td>`+
     `<td data-label="Company"><b>${esc(b.name||'-')}</b><small class="d-block text-muted">${esc(b.primaryDomain||'-')}</small></td>`+
     `<td data-label="Role"><span class="mad-role ${roleTone(rn)}">${esc(rn)}</span></td>`+
     `<td data-label="Currency">${esc(b.currency||'MYR')}</td>`+
     `<td data-label="Credit Balance"><span class="mad-money">${money(b.creditBalance)}</span></td>`+
     `<td data-label="Last Active">${timeWithDateTip(b.lastActiveAt||b.masterLastLoginAt||b.updatedAt)}</td>`+
     `<td data-label="Status">${statusSelect(b)}</td>`+
     `<td data-label="Created By">${esc(b.createdByName||b.createdByUsername||'Legacy / Migration')}</td>`+
     `<td data-label="Last Login">${timeWithDateTip(b.masterLastLoginAt)}</td>`+
     `<td data-label="Last Logout">${timeWithDateTip(b.masterLastLogoutAt)}</td>`+
     `<td data-label="Actions"><div class="mad-merchant-actions">${creditBtn}${resetPassBtn}<button class="mad-merchant-icon-btn" data-view="${esc(b.id)}" type="button" data-tip="Edit" aria-label="View / Edit Merchant"><i class="bi bi-pencil" aria-hidden="true"></i></button>${deleteBtn}</div></td>`+
   `</tr>`;
  }).join(''):'<tr><td colspan="11" class="mad-empty">No merchants found.</td></tr>';
  if(!s.length) resetEvenFill();
  else scheduleEvenFill();
  $('madTableInfo').textContent=filtered.length?`Showing ${st+1} to ${st+s.length} of ${filtered.length} merchants`:'Showing 0 to 0 of 0 merchants';
  $('madPager').innerHTML=pageButtons(page, pages);
  syncSelectionUi();
 }
 async function deleteMerchantsByIds(ids){
  const list=[...new Set((ids||[]).map(String).filter(Boolean))];
  if(!list.length){
   if(window.BO_DIALOG?.alert) await BO_DIALOG.alert('No merchants selected.');
   return;
  }
  const targets=list.filter(id=>{
   const row=rows.find(x=>String(x.id)===String(id));
   return row&&!active(row);
  });
  if(!targets.length){
   if(window.BO_DIALOG?.alert) await BO_DIALOG.alert('Selected merchants cannot be deleted. Suspend them first.',{title:'Cannot Delete',type:'error'});
   return;
  }
  const label=targets.length===1
   ?('Delete merchant "'+(rows.find(x=>String(x.id)===targets[0])?.code||('#'+targets[0]))+'"? This cannot be undone.')
   :('Delete '+targets.length+' merchants? This cannot be undone.');
  const ok=window.BO_DIALOG?.confirm
   ?await BO_DIALOG.confirm(label,{title:'Delete Merchant',confirmText:'Delete',type:'danger'})
   :confirm(label);
  if(!ok) return;
  const errors=[];
  for(const id of targets){
   try{
    await api('/admin/merchants/'+encodeURIComponent(id)+'/delete',{method:'POST',headers:BO_AUTH.authHeader()});
    selectedMerchantIds.delete(String(id));
   }catch(e){
    errors.push((e&&e.message)||('Failed to delete #'+id));
   }
  }
  await load();
  if(errors.length){
   if(window.BO_DIALOG?.alert) await BO_DIALOG.alert(errors[0],{title:'Delete incomplete',type:'error'});
  }else if(window.BO_DIALOG?.alert){
   await BO_DIALOG.alert(targets.length===1?'Merchant deleted successfully':(targets.length+' merchants deleted successfully'));
  }
 }
 function setStatus(id,val,type){
  const el=$(id); if(!el) return;
  el.textContent=val||'';
  el.className='upload-status mb-3'+(type?' '+type:'');
 }
 let creditOpenSeq=0;
 let creditFocusTimer=0;
 let creditAction='ADD';
 let creditBalances={player:0,provider:0,byProvider:{}};
 function currentWalletBalance(){
  const wallet=$('madCreditWallet')?.value||'__WHOLE_PROVIDER__';
  if(!wallet) return Number(creditBalances.player)||0;
  if(wallet==='__WHOLE_PROVIDER__') return Number(creditBalances.provider)||0;
  const per=creditBalances.byProvider[String(wallet).toUpperCase()];
  if(per!=null) return Number(per)||0;
  return Number(creditBalances.provider)||0;
 }
 function syncCreditMode(){
  const deduct=creditAction==='DEDUCT';
  const modal=$('madCreditModal');
  if(modal) modal.classList.toggle('is-reclaim', deduct);
  document.querySelectorAll('[data-credit-action]').forEach(btn=>{
   const on=btn.getAttribute('data-credit-action')===creditAction;
   btn.classList.toggle('is-active', on);
   btn.setAttribute('aria-checked', on?'true':'false');
  });
  const title=$('madCreditTitle');
  if(title) title.textContent=deduct?'Reclaim Credit':'Add Credit';
  const lead=$('madCreditLead');
  if(lead) lead.textContent=deduct?'Take back merchant provider credit.':'Top up merchant provider credit.';
  const icon=modal?.querySelector('.mad-modal-icon i');
  if(icon) icon.className=deduct?'bi bi-dash-lg':'bi bi-plus-lg';
  const remark=$('madCreditRemark');
  if(remark) remark.placeholder=deduct?'Optional reclaim remark':'Optional top-up remark';
  const submit=$('madCreditSubmit');
  if(submit){
   submit.innerHTML=deduct
     ?'<i class="bi bi-dash-circle" aria-hidden="true"></i> Confirm Reclaim'
     :'<i class="bi bi-plus-circle" aria-hidden="true"></i> Confirm Top Up';
  }
 }
 function showCreditModal(modal){
  if(!modal) return;
  modal.hidden=false;
  modal.removeAttribute('hidden');
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
 }
 function closeCredit(){
  creditOpenSeq++;
  if(creditFocusTimer){ clearTimeout(creditFocusTimer); creditFocusTimer=0; }
  const modal=$('madCreditModal');
  if(!modal) return;
  const active=document.activeElement;
  if(active && modal.contains(active) && typeof active.blur==='function'){
   try{ active.blur(); }catch(e){}
  }
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
  modal.hidden=true;
  modal.setAttribute('hidden','');
  if(!document.querySelector('.modal-clean.show')) document.body.classList.remove('modal-open');
 }
 async function openCredit(id){
  const row=rows.find(x=>Number(x.id)===Number(id));
  if(!row){
   if(window.BO_DIALOG?.alert) BO_DIALOG.alert('Merchant not found');
   return;
  }
  const modal=$('madCreditModal');
  if(!modal) return;
  const seq=++creditOpenSeq;
  if(creditFocusTimer){ clearTimeout(creditFocusTimer); creditFocusTimer=0; }
  const idEl=$('madCreditId'), nameEl=$('madCreditName'), subEl=$('madCreditSub');
  const avatarEl=$('madCreditAvatar'), balEl=$('madCreditBalance');
  if(idEl) idEl.value=String(row.id);
  if(nameEl) nameEl.textContent=row.code||row.name||('#'+row.id);
  if(subEl) subEl.textContent=(row.name||row.code||'')+(row.currency?' · '+row.currency:'');
  if(avatarEl) avatarEl.textContent=String(row.code||'M').slice(0,2).toUpperCase();
  if(balEl) balEl.textContent=money(row.providerCreditBalance??row.creditBalance);
  if($('madCreditAmount')) $('madCreditAmount').value='';
  if($('madCreditRemark')) $('madCreditRemark').value='';
  setStatus('madCreditStatus','');
  creditAction='ADD';
  creditBalances={player:Number(row.creditBalance||0),provider:Number(row.providerCreditBalance||0),byProvider:{}};
  syncCreditMode();
  const wallet=$('madCreditWallet');
  if(wallet) wallet.value='__WHOLE_PROVIDER__';
  showCreditModal(modal);
  try{
   const d=await api('/admin/merchants/'+encodeURIComponent(id),{headers:BO_AUTH.authHeader()});
   if(seq!==creditOpenSeq) return;
   const b=d?.brand||d||row;
   const ps=d?.providers||[];
   const byProvider={};
   ps.forEach(p=>{
    const code=String(p.providerCode||'').toUpperCase();
    if(code) byProvider[code]=Number(p.creditBalance||0);
   });
   creditBalances={player:Number(b.creditBalance||0),provider:Number(b.providerCreditBalance||0),byProvider};
   if(balEl) balEl.textContent=money(b.providerCreditBalance||0);
  }catch(e){
   if(seq!==creditOpenSeq) return;
   setStatus('madCreditStatus',e.message||'Unable to load credit details.','error');
  }
  if(seq!==creditOpenSeq) return;
  creditFocusTimer=setTimeout(()=>$('madCreditAmount')?.focus(),40);
 }
 function generatePassword(len){
  const upper='ABCDEFGHJKLMNPQRSTUVWXYZ', lower='abcdefghijkmnopqrstuvwxyz', digits='23456789', symbols='!@#$%^&*';
  const all=upper+lower+digits+symbols;
  const picks=[
   upper[Math.floor(Math.random()*upper.length)],
   lower[Math.floor(Math.random()*lower.length)],
   digits[Math.floor(Math.random()*digits.length)],
   symbols[Math.floor(Math.random()*symbols.length)]
  ];
  while(picks.length<len) picks.push(all[Math.floor(Math.random()*all.length)]);
  for(let i=picks.length-1;i>0;i--){
   const j=Math.floor(Math.random()*(i+1));
   const t=picks[i]; picks[i]=picks[j]; picks[j]=t;
  }
  return picks.join('');
 }
 let resetPassMerchantId=null;
 let resetPassMaster=null;
 let resetPassLastFocus=null;
 async function openResetPassword(id){
  const row=rows.find(x=>Number(x.id)===Number(id));
  if(!row){
   if(window.BO_DIALOG?.alert) BO_DIALOG.alert('Merchant not found');
   return;
  }
  const modal=$('madResetPasswordModal');
  if(!modal) return;
  resetPassLastFocus=document.activeElement;
  resetPassMerchantId=String(id);
  resetPassMaster=null;
  const a=$('madResetNewPassword'), b=$('madResetConfirmPassword');
  if(a){ a.value=''; a.type='password'; }
  if(b){ b.value=''; b.type='password'; }
  modal.querySelectorAll('[data-toggle-password]').forEach(eye=>{
   eye.setAttribute('aria-pressed','false');
   eye.setAttribute('aria-label','Show password');
   const icon=eye.querySelector('i');
   if(icon) icon.className='bi bi-eye';
  });
  setStatus('madResetPassStatus','');
  const sub=$('madResetPassSub');
  if(sub) sub.textContent='Loading merchant master account...';
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
  try{
   const d=await api('/admin/merchants/'+encodeURIComponent(id),{headers:BO_AUTH.authHeader()});
   const m=d?.masterAccount||await api('/admin/merchants/'+encodeURIComponent(id)+'/master-account',{headers:BO_AUTH.authHeader()}).catch(()=>null);
   const username=m?.username||d?.brand?.masterUsername||row.masterUsername||'';
   if(!username){
    setStatus('madResetPassStatus','This merchant has no master account yet.','error');
    if(sub) sub.textContent='Set a new password for the merchant master login.';
    return;
   }
   resetPassMaster={
    username,
    displayName:m?.displayName||m?.name||row.name||username,
    status:m?.status==null?1:Number(m.status),
    roleId:m?.roleId!=null?Number(m.roleId):null,
    roleType:m?.roleType||m?.role||null
   };
   if(sub) sub.textContent='Set a new password for '+username+(row.code?' · '+row.code:'')+'.';
   setTimeout(()=>a?.focus(),30);
  }catch(e){
   setStatus('madResetPassStatus',e.message||'Unable to load master account.','error');
   if(sub) sub.textContent='Set a new password for the merchant master login.';
  }
 }
 function closeResetPassword(){
  const modal=$('madResetPasswordModal');
  if(modal){
   modal.classList.remove('show');
   modal.setAttribute('aria-hidden','true');
  }
  resetPassMerchantId=null;
  resetPassMaster=null;
  if(!document.querySelector('.modal-clean.show')) document.body.classList.remove('modal-open');
  const restore=resetPassLastFocus;
  resetPassLastFocus=null;
  if(restore&&typeof restore.focus==='function'){
   setTimeout(()=>{ try{ restore.focus(); }catch(e){} },0);
  }
 }
 async function applyResetPassword(){
  if(!resetPassMerchantId){ setStatus('madResetPassStatus','Missing merchant.','error'); return; }
  if(!resetPassMaster?.username){ setStatus('madResetPassStatus','This merchant has no master account yet.','error'); return; }
  const pass=($('madResetNewPassword')?.value||'');
  const confirm=($('madResetConfirmPassword')?.value||'');
  if(!pass){ setStatus('madResetPassStatus','Please enter a new password.','error'); return; }
  if(pass.length<8){ setStatus('madResetPassStatus','Password must be at least 8 characters.','error'); return; }
  if(pass!==confirm){ setStatus('madResetPassStatus','Confirm password does not match.','error'); return; }
  const applyBtn=$('madResetPassApply');
  try{
   if(applyBtn) applyBtn.disabled=true;
   setStatus('madResetPassStatus','Updating password...');
   await api('/admin/merchants/'+encodeURIComponent(resetPassMerchantId)+'/master-account/reset-password',{
    method:'POST',
    headers:hdr(),
    body:JSON.stringify({password:pass,confirmPassword:confirm})
   });
   closeResetPassword();
   if(window.BO_DIALOG?.alert) await BO_DIALOG.alert('Password updated successfully');
  }catch(err){
   setStatus('madResetPassStatus',err.message||'Update password failed.','error');
  }finally{
   if(applyBtn) applyBtn.disabled=false;
  }
 }
 function setText(id,val){const el=$(id);if(el) el.textContent=val;}
 async function submitCredit(e){
  e.preventDefault();
  const id=$('madCreditId')?.value;
  const amount=Number($('madCreditAmount')?.value||0);
  const providerCode=$('madCreditWallet')?.value||'__WHOLE_PROVIDER__';
  const remark=($('madCreditRemark')?.value||'').trim();
  const action=creditAction==='DEDUCT'?'DEDUCT':'ADD';
  if(!id){ setStatus('madCreditStatus','Merchant missing.','error'); return; }
  if(!(amount>0)){ setStatus('madCreditStatus','Amount must be greater than 0.','error'); return; }
  if(action==='DEDUCT'){
   const avail=currentWalletBalance();
   if(amount>avail){
    setStatus('madCreditStatus','Reclaim amount cannot exceed Provider Credit ('+money(avail)+').','error');
    return;
   }
  }
  const btn=$('madCreditSubmit');
  try{
   if(btn) btn.disabled=true;
   setStatus('madCreditStatus',action==='DEDUCT'?'Processing reclaim...':'Processing top up...');
   if(action==='DEDUCT'){
    await api('/admin/brands/'+encodeURIComponent(id)+'/credit/adjust',{
     method:'POST',
     headers:hdr(),
     body:JSON.stringify({amount,action:'DEDUCT',providerCode,remark:remark||'Merchant credit reclaim'})
    });
    setStatus('madCreditStatus','Credit reclaimed successfully.','success');
   }else{
   await api('/admin/merchants/'+encodeURIComponent(id)+'/topup',{
    method:'POST',
    headers:hdr(),
    body:JSON.stringify({amount,providerCode,remark:remark||'Merchant credit top up'})
   });
   setStatus('madCreditStatus','Top up completed successfully.','success');
   }
   await load();
   setTimeout(closeCredit,450);
  }catch(err){
   setStatus('madCreditStatus',err.message||(action==='DEDUCT'?'Reclaim failed.':'Top up failed.'),'error');
  }finally{
   if(btn) btn.disabled=false;
  }
 }
 async function load(){try{rows=await api('/admin/merchants',{headers:BO_AUTH.authHeader()})||[];syncFilterOptions();apply();$('madSyncLabel').innerHTML='<i class="bi bi-arrow-repeat"></i> Synced just now'}catch(e){body.innerHTML=`<tr><td colspan="11" class="mad-empty text-danger">${esc(e.message)}</td></tr>`;syncSelectionUi();}}

 function primaryCurrency(){
  return String($('madEditCurrency')?.value||'').trim().toUpperCase();
 }
 function normalizeCurrencyCode(raw){
  return String(raw||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
 }
 function activeCurrencyRows(){
  const rows=currencyOptions.length?currencyOptions:[{currencyCode:'MYR',displayName:'Malaysian Ringgit',rateFromBase:1,status:1}];
  return rows.filter(x=>Number(x.status??1)===1);
 }
 function currencyRowByCode(code){
  const key=normalizeCurrencyCode(code);
  return activeCurrencyRows().find(x=>String(x.currencyCode||'').toUpperCase()===key)||null;
 }
 function ensureCurrencyOption(code, displayName){
  const key=normalizeCurrencyCode(code);
  if(!key) return '';
  const name=String(displayName||'').trim();
  const existing=currencyOptions.find(x=>String(x.currencyCode||'').toUpperCase()===key);
  if(existing){
   if(name && !String(existing.displayName||'').trim()) existing.displayName=name;
   return key;
  }
  currencyOptions.push({currencyCode:key,displayName:name||key,rateFromBase:1,decimalPlaces:2,status:1,_local:true});
  return key;
 }
 function syncEnabledWithPrimary(){
  const primary=primaryCurrency();
  if(primary) enabledCurrencies.add(primary);
 }
 function enabledCurrencyPayload(){
  syncEnabledWithPrimary();
  return [...enabledCurrencies].filter(Boolean);
 }
 function setCurrencyModalStatus(msg, kind){
  const el=$('madCurrencyModalStatus');
  if(!el) return;
  el.textContent=msg||'';
  el.className='upload-status mb-0'+(kind?(' '+kind):'');
 }
 function currencyModalItemHtml(code, side){
  const selected=currencyModalSelected.has(code+'|'+side);
  // Only the left (Added) pane carries a discard control: Apply never commits that pane, so a
  // staged code can be dropped outright. The right pane IS the committed list.
  const remove=side==='added'
   ?'<span class="mac-currency-pane-item-remove" role="button" tabindex="0" data-mad-currency-remove="'+esc(code)+'" aria-label="Discard '+esc(code)+'" title="Discard '+esc(code)+'">&times;</span>'
   :'';
  return '<button type="button" class="mac-currency-pane-item'+(selected?' is-selected':'')+'" role="listitem" data-mad-currency-side="'+side+'" data-mad-currency-code="'+esc(code)+'" aria-pressed="'+(selected?'true':'false')+'"><span class="mac-currency-pane-item-code">'+esc(code)+'</span>'+remove+'</button>';
 }
 function renderCurrencyDualLists(){
  const addedList=$('madCurrencyAddedList');
  const availableList=$('madCurrencyAvailableList');
  const addedCount=$('madCurrencyAddedCount');
  const availableCount=$('madCurrencyAvailableCount');
  if(!addedList || !availableList) return;
  // currencyModalDraft = Available (dropdown source). Added = catalog leftovers / typed staging.
  const available=[...currencyModalDraft].filter(Boolean).sort((a,b)=>a.localeCompare(b));
  const availablePool=new Set();
  activeCurrencyRows().forEach(x=>{
   const code=String(x.currencyCode||'').toUpperCase();
   if(code) availablePool.add(code);
  });
  const added=[...availablePool].filter(code=>!currencyModalDraft.has(code)).sort((a,b)=>a.localeCompare(b));
  addedList.innerHTML=added.length?added.map(code=>currencyModalItemHtml(code,'added')).join(''):'<div class="mac-currency-modal-empty">No currencies added yet.</div>';
  availableList.innerHTML=available.length?available.map(code=>currencyModalItemHtml(code,'available')).join(''):'<div class="mac-currency-modal-empty">No currencies in Available.</div>';
  if(addedCount) addedCount.textContent=String(added.length);
  if(availableCount) availableCount.textContent=String(available.length);
  const canToAdded=[...currencyModalSelected].some(key=>key.endsWith('|available'));
  const canToAvailable=[...currencyModalSelected].some(key=>key.endsWith('|added'));
  const moveLeftBtn=$('madCurrencyMoveLeft');
  const moveRightBtn=$('madCurrencyMoveRight');
  if(moveLeftBtn) moveLeftBtn.disabled=!canToAdded;
  if(moveRightBtn) moveRightBtn.disabled=!canToAvailable;
 }
 function toggleCurrencyModalSelection(code, side){
  const key=code+'|'+side;
  if(currencyModalSelected.has(key)) currencyModalSelected.delete(key);
  else{
   [...currencyModalSelected].forEach(k=>{ if(!k.endsWith('|'+side)) currencyModalSelected.delete(k); });
   currencyModalSelected.add(key);
  }
  renderCurrencyDualLists();
 }
 function discardStagedCurrency(code){
  const key=normalizeCurrencyCode(code);
  if(!key) return;
  // The left pane is derived (activeCurrencyRows − draft), so dropping the catalog entry is the
  // only lever that removes it. Apply commits the right pane alone, so nothing committed changes.
  const i=currencyOptions.findIndex(x=>String(x.currencyCode||'').toUpperCase()===key);
  if(i>=0) currencyOptions.splice(i,1);
  currencyModalSelected.delete(key+'|added');
  setCurrencyModalStatus(key+' discarded.', 'success');
  renderCurrencyDualLists();
 }
 function moveSelectedToAdded(){
  const codes=[...currencyModalSelected].filter(key=>key.endsWith('|available')).map(key=>key.split('|')[0]).filter(Boolean);
  if(!codes.length){ setCurrencyModalStatus('Select a currency on the right (Available) to move to Added.', 'error'); return; }
  codes.forEach(code=>{ ensureCurrencyOption(code, currencyRowByCode(code)?.displayName || code); currencyModalDraft.delete(code); });
  currencyModalSelected.clear(); setCurrencyModalStatus(''); renderCurrencyDualLists();
 }
 function moveSelectedToAvailable(){
  const codes=[...currencyModalSelected].filter(key=>key.endsWith('|added')).map(key=>key.split('|')[0]).filter(Boolean);
  if(!codes.length){ setCurrencyModalStatus('Select a currency on the left (Added) to move to Available.', 'error'); return; }
  codes.forEach(code=>{ ensureCurrencyOption(code, currencyRowByCode(code)?.displayName || code); currencyModalDraft.add(code); });
  currencyModalSelected.clear(); setCurrencyModalStatus(''); renderCurrencyDualLists();
 }
 function addTypedCurrencyToDraft(){
  const input=$('madCurrencyModalCode');
  const typedCode=normalizeCurrencyCode(input?.value);
  if(!typedCode){ setCurrencyModalStatus('Enter a currency to add.', 'error'); input?.focus(); return; }
  if(typedCode.length<3){ setCurrencyModalStatus('Currency must be at least 3 characters (e.g. THB).', 'error'); input?.focus(); return; }
  const alreadyAvailable=currencyModalDraft.has(typedCode);
  const alreadyAdded=!alreadyAvailable && activeCurrencyRows().some(x=>String(x.currencyCode||'').toUpperCase()===typedCode);
  if(alreadyAdded){ setCurrencyModalStatus(typedCode+' is already in Added. Move it to Available for the dropdown.', 'error'); input?.focus(); return; }
  ensureCurrencyOption(typedCode, currencyRowByCode(typedCode)?.displayName || typedCode);
  // Typed Add always lands in Added (left). Move right to Available to include in dropdown.
  currencyModalDraft.delete(typedCode);
  currencyModalSelected.clear();
  currencyModalSelected.add(typedCode+'|added');
  if(input) input.value='';
  setCurrencyModalStatus(
    alreadyAvailable
      ? typedCode+' moved to Added. Move to Available, then Apply for the dropdown.'
      : typedCode+' added to Added. Move to Available, then Apply for the dropdown.',
    'success'
  );
  renderCurrencyDualLists();
  input?.focus();
 }
 function openCurrencyModal(context){
  const modal=$('madCurrencyModal');
  if(!modal) return;
  currencyModalContext=context==='list'?'list':'edit';
  const lead=$('madCurrencyModalLead');
  if(lead){
   lead.textContent='Type Add → Added. Move to Available for the Primary Currency dropdown. Apply writes Available into the dropdown.';
  }
  currencyModalDraft.clear();
  if(currencyModalContext==='list'){
   ensureListCurrencyPool();
   listFilterCurrencies.forEach(code=>currencyModalDraft.add(code));
  }else{
   syncEnabledWithPrimary();
   enabledCurrencies.forEach(code=>currencyModalDraft.add(code));
  }
  currencyModalSelected.clear();
  const codeInput=$('madCurrencyModalCode');
  if(codeInput) codeInput.value='';
  setCurrencyModalStatus('');
  renderCurrencyDualLists();
  modal.hidden=false;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
  codeInput?.focus();
 }
 function closeCurrencyModal(){
  const modal=$('madCurrencyModal');
  if(!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
  modal.hidden=true;
  document.body.classList.remove('modal-open');
  currencyModalSelected.clear();
  setCurrencyModalStatus('');
  currencyModalContext='edit';
 }
 function confirmCurrencyModal(){
  if(currencyModalContext==='list'){
   listFilterCurrencies.clear();
   currencyModalDraft.forEach(code=>{
    const key=normalizeCurrencyCode(code);
    if(!key) return;
    ensureCurrencyOption(key, currencyRowByCode(key)?.displayName || key);
    listFilterCurrencies.add(key);
   });
   if(!listFilterCurrencies.size) listFilterCurrencies.add('MYR');
   syncFilterOptions();
   apply();
   closeCurrencyModal();
   return;
  }
  // Primary Currency dropdown = Available list only.
  enabledCurrencies.clear();
  currencyModalDraft.forEach(code=>{
   const key=normalizeCurrencyCode(code);
   if(!key) return;
   ensureCurrencyOption(key, currencyRowByCode(key)?.displayName || key);
   enabledCurrencies.add(key);
  });
  renderCurrencyOptions(primaryCurrency());
  closeCurrencyModal();
 }
 function renderCurrencyOptions(preferredCode){
  const sel=$('madEditCurrency');
  if(!sel) return;
  // Dropdown options come only from enabledCurrencies (Available after Apply).
  [...enabledCurrencies].forEach(code=>{ if(!code) enabledCurrencies.delete(code); });
  [...enabledCurrencies].forEach(code=>{ ensureCurrencyOption(code, currencyRowByCode(code)?.displayName || code); });
  const current=normalizeCurrencyCode(preferredCode||primaryCurrency());
  const ordered=[...enabledCurrencies].filter(Boolean).sort((a,b)=>a.localeCompare(b));
  if(!ordered.length){
   sel.innerHTML='<option value="">Select currency</option>';
   sel.value='';
   syncCurrencyUnits();
   if(window.BOSelectSync?.one) window.BOSelectSync.one(sel);
   return;
  }
  const preferred=ordered.includes(current)?current:ordered[0];
  sel.innerHTML=ordered.map(code=>'<option value="'+esc(code)+'"'+(code===preferred?' selected':'')+'>'+esc(code)+'</option>').join('');
  if(preferred) sel.value=preferred;
  syncCurrencyUnits();
  if(window.BOSelectSync?.one) window.BOSelectSync.one(sel);
 }
 async function loadCurrencies(){
  try{
   const d=await api('/public/currency/options',{headers:BO_AUTH.authHeader()});
   window.__currencyBase=String(d.baseCurrency||'MYR').toUpperCase();
   const localOnly=currencyOptions.filter(x=>x&&x._local);
   currencyOptions=Array.isArray(d.rates)?d.rates.slice():[];
   localOnly.forEach(row=>{
    const code=String(row.currencyCode||'').toUpperCase();
    if(code && !currencyOptions.some(x=>String(x.currencyCode||'').toUpperCase()===code)) currencyOptions.push(row);
   });
   if(!enabledCurrencies.size) enabledCurrencies.add(String(d.baseCurrency||'MYR').toUpperCase());
   renderCurrencyOptions();
  }catch(e){
   currencyOptions=[{currencyCode:'MYR',displayName:'Malaysian Ringgit',rateFromBase:1,status:1}];
   if(!enabledCurrencies.size){ enabledCurrencies.clear(); enabledCurrencies.add('MYR'); }
   renderCurrencyOptions();
  }
 }
 function syncCurrencyUnits(){
  const cur=primaryCurrency()||'—';
  if($('madEditThresholdUnit')) $('madEditThresholdUnit').textContent=cur;
  if($('madEditThresholdLabel')) $('madEditThresholdLabel').textContent='('+cur+')';
 }
 function hydrateEnabledCurrencies(b){
  enabledCurrencies.clear();
  const list=Array.isArray(b?.enabledCurrencies)?b.enabledCurrencies:(Array.isArray(b?.currencies)?b.currencies:[]);
  list.forEach(item=>{
   const code=normalizeCurrencyCode(typeof item==='string'?item:(item?.currencyCode||item?.code||item?.currency));
   if(code){ ensureCurrencyOption(code, currencyRowByCode(code)?.displayName||code); enabledCurrencies.add(code); }
  });
  const primary=normalizeCurrencyCode(b?.currency||'MYR')||'MYR';
  ensureCurrencyOption(primary, currencyRowByCode(primary)?.displayName||primary);
  enabledCurrencies.add(primary);
  renderCurrencyOptions(primary);
 }
 function providerCode(p){ return String(p.code||'').toUpperCase(); }
 function markupRaw(){ return String($('madProviderMarkup')?.value??'').trim(); }
 function markupValue(){ return Number(markupRaw()||0); }
 function appliedMarkupValue(){ const raw=markupRaw(); return (raw===''||raw==='0')?'':raw; }
 function applyMarkupToSelected(){
  const synced=appliedMarkupValue();
  selectedCodes.forEach(code=>{
   if(synced==='') overrideByCode.delete(code);
   else overrideByCode.set(code, synced);
  });
 }
 function filteredProviders(){
  const q=providerSearch.trim().toLowerCase();
  if(!q) return platformProviders.slice();
  return platformProviders.filter(p=>{
   const code=providerCode(p).toLowerCase();
   const name=String(p.name||'').toLowerCase();
   return code.includes(q) || name.includes(q);
  });
 }
 function syncOverrideInputsFromDom(){
  document.querySelectorAll('#madProviderSelectedBody [data-provider-override]').forEach(inp=>{
   const code=String(inp.getAttribute('data-provider-override')||'').toUpperCase();
   if(!code) return;
   const raw=String(inp.value||'').trim();
   if(raw==='') overrideByCode.delete(code);
   else overrideByCode.set(code, raw);
  });
 }
 function updateProviderCounts(){
  const catalogCount=$('madProviderCatalogCount');
  const selectedCount=$('madProviderSelectedCount');
  if(catalogCount) catalogCount.textContent=String(filteredProviders().length);
  if(selectedCount) selectedCount.textContent=String(selectedCodes.size);
 }
 function renderCatalog(){
  const out=$('madProviderCatalogList');
  if(!out) return;
  if(out.querySelector('.mac-provider-empty.is-error') && !platformProviders.length) return;
  const rows=filteredProviders();
  if(!rows.length){
   out.innerHTML='<div class="mac-provider-empty">'+(platformProviders.length?'No providers match your search.':'No platform providers configured.')+'</div>';
   updateProviderCounts();
   return;
  }
  out.innerHTML=rows.map(p=>{
   const code=providerCode(p);
   const checked=selectedCodes.has(code);
   const name=String(p.name||'').trim();
   const showName=name && name.toUpperCase()!==code;
   return '<button type="button" class="mac-provider-chip'+(checked?' is-selected':'')+'" data-provider-pick="'+esc(code)+'" role="listitem" aria-pressed="'+(checked?'true':'false')+'"><b>'+esc(code)+'</b>'+(showName?'<small>'+esc(name)+'</small>':'')+'</button>';
  }).join('');
  updateProviderCounts();
 }
 function renderSelected(){
  const out=$('madProviderSelectedBody');
  if(!out) return;
  const selected=platformProviders.filter(p=>selectedCodes.has(providerCode(p)));
  if(!selected.length){
   out.innerHTML='<div class="mac-provider-empty">Select providers on the left to configure pricing.</div>';
   updateProviderCounts();
   return;
  }
  out.innerHTML=selected.map(p=>{
   const code=providerCode(p);
   const base=Number(p.settlementCostPercent||0);
   const basis=String(p.settlementCostBasis||'HOUSE_WIN').toUpperCase();
   const ov=overrideByCode.has(code)?overrideByCode.get(code):'';
   const add=String(ov||'').trim()!==''?Number(ov):0;
   const eff=base+Number(add||0);
   const basisLabel=basis==='TURNOVER'?'TO':'GGR';
   return '<article class="mac-provider-selected-card" data-provider-row="'+esc(code)+'" data-base="'+base+'" data-basis="'+esc(basis)+'">'+
    '<div class="mac-provider-selected-title"><b>'+esc(code)+'</b><span class="mac-provider-base-tag" title="Provider base '+base.toFixed(4)+'% · '+(basis==='TURNOVER'?'Turnover':'House Win / GGR')+'">Base '+base.toFixed(2)+'% · '+esc(basisLabel)+'</span></div>'+
    '<div class="mac-provider-selected-fields">'+
    '<label class="mac-provider-override-wrap"><span class="mac-provider-field-label">Override</span><span class="mac-provider-override-control"><input type="number" min="0" max="100" step="0.0001" data-provider-override="'+esc(code)+'" value="'+esc(ov||'')+'" placeholder="—"><span class="mac-provider-override-unit">%</span></span></label>'+
    '<div class="mac-provider-eff-wrap"><span class="mac-provider-field-label">Effective</span><b class="mac-provider-eff" data-provider-effective="'+esc(code)+'">'+eff.toFixed(4)+'%</b></div>'+
    '</div></article>';
  }).join('');
  updateProviderCounts();
 }
 function recalcSelectedEffective(){
  document.querySelectorAll('#madProviderSelectedBody [data-provider-row]').forEach(r=>{
   const code=r.dataset.providerRow;
   const base=Number(r.dataset.base||0);
   const inp=r.querySelector('[data-provider-override]');
   const ovRaw=String(inp?.value||'').trim();
   const add=ovRaw!==''?Number(ovRaw):0;
   const eff=r.querySelector('[data-provider-effective]');
   if(eff) eff.textContent=(base+Number(add||0)).toFixed(4)+'%';
   if(code){
    if(ovRaw==='') overrideByCode.delete(code);
    else overrideByCode.set(code, ovRaw);
   }
  });
 }
 function setProviderSelected(code, on){
  const key=String(code||'').toUpperCase();
  if(!key) return;
  if(on) selectedCodes.add(key);
  else selectedCodes.delete(key);
  renderCatalog();
  renderSelected();
 }
 function selectedProviderPayload(){
  syncOverrideInputsFromDom();
  return platformProviders
   .filter(p=>selectedCodes.has(providerCode(p)))
   .map(p=>{
    const code=providerCode(p);
    const ov=overrideByCode.has(code)?overrideByCode.get(code):'';
    return {providerCode:code,defaultChargePercent:Number(ov||0),chargeBasis:String(p.settlementCostBasis||'HOUSE_WIN')};
   });
 }
 function hydrateProviders(d){
  const list=d?.platformProviders||[];
  platformProviders=(list||[])
   .filter(p=>Number(p.status??1)===1)
   .map(p=>({
    code:p.code,
    name:p.name,
    settlementCostPercent:p.settlementCostPercent??p.settlement_cost_percent??0,
    settlementCostBasis:p.settlementCostBasis||p.settlement_cost_basis||'HOUSE_WIN'
   }))
   .sort((a,b)=>String(a.code||'').localeCompare(String(b.code||'')));
  selectedCodes.clear();
  overrideByCode.clear();
  const assigned=new Map((d.providers||[]).map(x=>[String(x.providerCode||'').toUpperCase(),x]));
  const markupRawVal=String($('madProviderMarkup')?.value ?? d.brand?.providerMarkupPercent ?? '').trim();
  const markup=Number(markupRawVal||0);
  platformProviders.forEach(p=>{
   const code=providerCode(p);
   const bp=assigned.get(code);
   const checked=!!bp && String(bp.ownership||'PLATFORM').toUpperCase()==='PLATFORM';
   if(!checked) return;
   selectedCodes.add(code);
   const savedOv=Number(bp?.defaultChargePercent||0);
   const ovShow=savedOv>0?String(savedOv):(markupRawVal!==''&&markup!==0?markupRawVal:'');
   if(ovShow!=='') overrideByCode.set(code, ovShow);
  });
  if($('madProviderSearch')) $('madProviderSearch').value='';
  providerSearch='';
  renderCatalog();
  renderSelected();
 }

 async function saveProviderPricing(id){await api('/admin/merchants/'+id+'/provider-pricing',{method:'POST',headers:hdr(),body:JSON.stringify({providerMarkupPercent:markupValue(),providers:selectedProviderPayload()})});}
 async function open(id){try{const d=await api('/admin/merchants/'+id,{headers:BO_AUTH.authHeader()}),b=d.brand||d;detail=d;editing=b;const m=d.masterAccount||await api('/admin/merchants/'+id+'/master-account',{headers:BO_AUTH.authHeader()}).catch(()=>null);$('madEditId').value=b.id;$('madEditCode').value=b.code||'';$('madEditName').value=b.name||'';$('madEditDomain').value=b.primaryDomain||'';$('madEditAliases').value=b.domainAliases||'';hydrateEnabledCurrencies(b);$('madEditFrontendRoot').value=b.frontendRoot||'';$('madEditCreditMode').value=b.creditMode||'WHOLE';$('madEditStatus').value=String(b.status??1);const thr=Number(b.lowCreditThreshold||0);if($('madEditThreshold'))$('madEditThreshold').value=Number.isFinite(thr)?thr:0;editingMaster=m||null;loadEditMasterRoles(m||null,b,rows.find(r=>r&&Number(r.id)===Number(id))||null);$('madViewMaster').value=m?.username||b.masterUsername||'-';$('madViewCreatedBy').value=b.createdByName||b.createdByUsername||m?.createdByName||'Legacy / Migration';hydrateAuditMeta(b,m);if($('madViewCreditBalance'))$('madViewCreditBalance').value=money(b.creditBalance);const passA=$('madEditMasterPassword'),passB=$('madEditMasterPasswordConfirm');if(passA){passA.type='password';passA.value='';}if(passB){passB.type='password';passB.value='';}document.querySelectorAll('#madEditWorkspace [data-toggle-password]').forEach(btn=>{const icon=btn.querySelector('i');if(icon)icon.className='bi bi-eye-slash';btn.setAttribute('aria-pressed','false');btn.setAttribute('aria-label',btn.getAttribute('data-toggle-password')==='madEditMasterPasswordConfirm'?'Show confirm password':'Show password');});$('madProviderMarkup').value=Number(b.providerMarkupPercent||0);hydrateProviders(d);$('madEditFormStatus').textContent='';if(listWorkspace){listWorkspace.hidden=true;listWorkspace.setAttribute('aria-hidden','true');}if(editWorkspace){editWorkspace.hidden=false;editWorkspace.setAttribute('aria-hidden','false');}document.body.classList.add('mad-editing');setPageChrome(true);window.scrollTo({top:0,behavior:'smooth'});}catch(e){if(window.BO_DIALOG?.alert)BO_DIALOG.alert(e.message,{title:'Unable to Load Merchant',type:'error'});else alert(e.message)}}
 function close(){if(editWorkspace){editWorkspace.hidden=true;editWorkspace.setAttribute('aria-hidden','true');}if(listWorkspace){listWorkspace.hidden=false;listWorkspace.setAttribute('aria-hidden','false');}document.body.classList.remove('mad-editing');editingMaster=null;setPageChrome(false);}
 // Merchant master roles are reusable platform role templates (one role can serve many brands;
 // tenant isolation still comes from admin_user.brand_id), so this mirrors the create form's
 // selector and never offers ROOT/MASTER/MAIN executive roles.
 async function loadEditMasterRoles(master, brand, row){
  const sel=$('madEditMasterRole');
  if(!sel) return;
  // Current role, honoured the way the list grid shows it (roleName(b) uses this same
  // forgiving chain) rather than trusting master.roleId alone. A merchant created by an old
  // path may have _no_ master account yet (login shown as "-") yet carry a role on the brand.
  // The list row is the last source: the grid is proven to carry the role (that is where it
  // renders "Brand Owner"), so the name resolves even if the detail payload omits it.
  const currentId=master&&master.roleId!=null?String(master.roleId):'';
  const currentType=String((master&&(master.roleType||master.role))||'').toUpperCase();
  const nested=master||null;
  const currentLabel=String(
    (brand&&(brand.masterRoleName||brand.roleName)) ||
    (nested&&(nested.roleName||nested.role||nested.roleType)) ||
    (brand&&(brand.masterRole||brand.role||brand.masterRoleType||brand.roleType)) ||
    (row&&(row.masterRoleName||row.roleName||row.masterRole||row.role||row.masterRoleType||row.roleType)) ||
    ''
  ).toUpperCase();
  let use=[];
  try{
   const primary=BO_AUTH.roleListAllUrl?BO_AUTH.roleListAllUrl():BO_AUTH.roleListUrl();
   let rows=[];
   try{
    const j=await fetch(primary,{headers:BO_AUTH.authHeader(),cache:'no-store'}).then(r=>r.json());
    if(j&&j.status!=='error') rows=Array.isArray(j.data)?j.data:[];
   }catch(_){
    const j=await fetch(BO_AUTH.roleListUrl(),{headers:BO_AUTH.authHeader(),cache:'no-store'}).then(r=>r.json());
    if(j&&j.status!=='error') rows=Array.isArray(j.data)?j.data:[];
   }
   use=rows.filter(r=>{
    const type=String(r.roleType||r.type||'CUSTOM').toUpperCase();
    const global=r.brandId==null||r.brandId==='';
    return global && Number(r.status==null?1:r.status)===1 && type==='BRAND_OWNER';
   });
  }catch(e){ use=[]; }
  const items=use.map(r=>{
   const id=r.id!=null&&r.id!==''?String(r.id):'';
   return {id,type:String(r.roleType||r.type||'BRAND_OWNER').toUpperCase(),label:String(r.name||r.code||'Brand Owner')};
  });
  // Prefer matching a template by the current display label, then by id, then by type.
  // Only when none hit does the master really have an assignable role in the template list.
  let match=items.find(o=>currentLabel&&o.label.toUpperCase()===currentLabel)||
            items.find(o=>o.id&&o.id===currentId)||
            items.find(o=>currentType&&o.type===currentType)||
            null;
  const hasCurrent=!!(currentId||currentType||currentLabel);
  if(!match){
   if(hasCurrent){
    // The master's role is not one of the Brand Owner templates — keep it selectable, so merely
    // opening this form can never silently rewrite it on save.
    items.unshift({id:currentId,type:currentType||'BRAND_OWNER',
      label:(currentLabel||currentType||currentId)+' (current)'});
    match=items[0];
   }else if(items.length){
    // Nothing anywhere carries a role. The list grid shows every such merchant as "Brand Owner"
    // (roleName() ends in a hardcoded 'Brand Owner' default, and the filter/export reuse it), so
    // this picker matches the grid instead of inventing a "No role assigned" state that no other
    // view has. The templates are already filtered to BRAND_OWNER, so the first is that role.
    match=items[0];
   }else{
    // No templates configured at all — the only honest thing left to show.
    items.unshift({id:'',type:'',label:'No role assigned'});
    match=items[0];
   }
  }
  sel.innerHTML=items.map(o=>'<option value="'+esc(o.id)+'" data-role-type="'+esc(o.type)+'"'+
   (o===match?' selected':'')+'>'+esc(o.label)+'</option>').join('');
 }

 document.querySelectorAll('[data-mad-status]').forEach(btn=>{
  btn.addEventListener('click',()=>{
   status=btn.getAttribute('data-mad-status')||'all';
   document.querySelectorAll('[data-mad-status]').forEach(b=>{
    const on=b===btn;
    b.classList.toggle('is-active',on);
    b.setAttribute('aria-pressed',on?'true':'false');
   });
   if(status!=='suspended'&&status!=='all') clearMerchantSelection();
   apply();
  });
 });
 search?.addEventListener('input',apply);
 roleFilter?.addEventListener('change',apply);
 currencyFilter?.addEventListener('change',apply);
 resetBtn?.addEventListener('click',()=>{
  if(search) search.value='';
  if(roleFilter) roleFilter.value='';
  if(currencyFilter) currencyFilter.value='';
  status='active';
  document.querySelectorAll('[data-mad-status]').forEach(b=>{
   const on=b.getAttribute('data-mad-status')==='active';
   b.classList.toggle('is-active',on);
   b.setAttribute('aria-pressed',on?'true':'false');
  });
  clearMerchantSelection();
  apply();
 });
 $('madPager')?.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b && !b.disabled){page=+b.dataset.page;render()}});
 pageSizeEl?.addEventListener('change',()=>{
  autoPageSize=null;
  page=1;
  render();
 });
 listen(window,'resize',()=>{
  if(!pageSizeEl||!isAutoPageSize(pageSizeEl.value)) return;
  autoPageSize=null;
  render();
 });
 body?.addEventListener('change',e=>{
  const input=e.target.closest&&e.target.closest('[data-merchant-select]');
  if(!input) return;
  const id=String(input.getAttribute('data-merchant-select')||'');
  if(!id) return;
  if(input.checked) selectedMerchantIds.add(id);
  else selectedMerchantIds.delete(id);
  syncSelectionUi();
 });
 selectAllInput?.addEventListener('change',()=>{
  const ids=selectableIdsOnPage();
  if(selectAllInput.checked) ids.forEach(id=>selectedMerchantIds.add(id));
  else ids.forEach(id=>selectedMerchantIds.delete(id));
  body.querySelectorAll('[data-merchant-select]').forEach(el=>{ el.checked=selectAllInput.checked; });
  syncSelectionUi();
 });
 bulkDeleteBtn?.addEventListener('click',()=>deleteMerchantsByIds([...selectedMerchantIds]));
 body?.addEventListener('click',e=>{
  const viewBtn=e.target.closest('[data-view]');
  if(viewBtn){ open(viewBtn.dataset.view); return; }

  const creditBtn=e.target.closest('[data-credit]');
  if(creditBtn){ openCredit(creditBtn.dataset.credit); return; }

  const resetBtnEl=e.target.closest('[data-reset-pass]');
  if(resetBtnEl){ openResetPassword(resetBtnEl.dataset.resetPass); return; }

  const deleteBtn=e.target.closest('[data-delete]');
  if(deleteBtn){ deleteMerchantsByIds([deleteBtn.dataset.delete]); return; }

  const chipBtn=e.target.closest('[data-merchant-status-toggle]');
  if(chipBtn){
   if(chipBtn.disabled||chipBtn.classList.contains('is-saving')) return;
   updateMerchantStatus(chipBtn.getAttribute('data-merchant-status-toggle'), chipBtn.getAttribute('data-next-status'), chipBtn);
  }
 });
 document.querySelectorAll('[data-mad-close-edit]').forEach(b=>b.onclick=close);
 document.querySelectorAll('[data-mad-close-credit]').forEach(b=>b.onclick=closeCredit);
 document.querySelectorAll('[data-mad-close-pass]').forEach(b=>b.addEventListener('click',closeResetPassword));
 $('madCreditModal')?.addEventListener('click',e=>{ if(e.target===$('madCreditModal')) closeCredit(); });
 $('madResetPasswordModal')?.addEventListener('click',e=>{ if(e.target===$('madResetPasswordModal')) closeResetPassword(); });
 $('madCreditForm')?.addEventListener('click',e=>{
  const btn=e.target.closest('[data-credit-action]');
  if(!btn) return;
  const next=String(btn.getAttribute('data-credit-action')||'').toUpperCase();
  if(next!=='ADD' && next!=='DEDUCT') return;
  if(creditAction===next) return;
  creditAction=next;
  setStatus('madCreditStatus','');
  syncCreditMode();
 });
 $('madCreditForm')?.addEventListener('submit',submitCredit);
 $('madEditGeneratePassword')?.addEventListener('click',()=>{
  const pwd=generatePassword(14);
  const a=$('madEditMasterPassword'), b=$('madEditMasterPasswordConfirm');
  if(a){ a.type='text'; a.value=pwd; }
  if(b){ b.type='text'; b.value=pwd; }
  document.querySelectorAll('[data-toggle-password="madEditMasterPassword"], [data-toggle-password="madEditMasterPasswordConfirm"]').forEach(btn=>{
   const eye=btn.querySelector('i');
   if(eye) eye.className='bi bi-eye';
   btn.setAttribute('aria-pressed','true');
   btn.setAttribute('aria-label', btn.getAttribute('data-toggle-password')==='madEditMasterPasswordConfirm'?'Hide confirm password':'Hide password');
  });
  if($('madEditFormStatus')) $('madEditFormStatus').textContent='Strong password generated. Copy it before saving.';
 });
 $('madResetGeneratePassword')?.addEventListener('click',()=>{
  const pwd=generatePassword(14);
  const a=$('madResetNewPassword'), b=$('madResetConfirmPassword');
  if(a){ a.type='text'; a.value=pwd; }
  if(b){ b.type='text'; b.value=pwd; }
  document.querySelectorAll('[data-toggle-password="madResetNewPassword"], [data-toggle-password="madResetConfirmPassword"]').forEach(btn=>{
   const eye=btn.querySelector('i');
   if(eye) eye.className='bi bi-eye';
   btn.setAttribute('aria-pressed','true');
   btn.setAttribute('aria-label','Hide password');
  });
  setStatus('madResetPassStatus','Strong password generated. Copy it before applying.','success');
 });
 $('madResetPassApply')?.addEventListener('click',applyResetPassword);
 listen(document,'click',e=>{
  const toggle=e.target.closest&&e.target.closest('[data-toggle-password]');
  if(!toggle) return;
  const id=toggle.getAttribute('data-toggle-password');
  const input=$(id);
  if(!input) return;
  const revealing=input.type==='password';
  input.type=revealing?'text':'password';
  const visible=input.type==='text';
  toggle.setAttribute('aria-pressed',visible?'true':'false');
  const isConfirm=/confirm/i.test(id||'');
  toggle.setAttribute('aria-label', visible
   ? (isConfirm?'Hide confirm password':'Hide password')
   : (isConfirm?'Show confirm password':'Show password'));
  const icon=toggle.querySelector('i');
  // Open eye = password visible; closed eye = password hidden.
  if(icon) icon.className=visible?'bi bi-eye':'bi bi-eye-slash';
 });
 listen(document,'keydown',e=>{
  if(e.key!=='Escape') return;
  if($('madCurrencyModal')?.classList.contains('show')){ closeCurrencyModal(); return; }
  if($('madResetPasswordModal')?.classList.contains('show')) closeResetPassword();
 });
  form?.addEventListener('submit',async e=>{e.preventDefault();const st=$('madEditFormStatus');try{const pass=($('madEditMasterPassword')?.value||'');const confirm=($('madEditMasterPasswordConfirm')?.value||'');const masterUser=(editingMaster?.username||'').trim();if(pass||confirm){if(pass.length<8) throw new Error('Merchant Master password must be at least 8 characters');if(pass!==confirm) throw new Error('Confirm password does not match');if(pass&&!masterUser) throw new Error('This merchant has no master account yet.');}st.textContent='Saving merchant and provider pricing...';const id=+$('madEditId').value;await api('/admin/merchants/save',{method:'POST',headers:hdr(),body:JSON.stringify({id,code:$('madEditCode').value,name:$('madEditName').value.trim(),primaryDomain:$('madEditDomain').value.trim(),currency:($('madEditCurrency').value||'').trim()||'MYR',enabledCurrencies:enabledCurrencyPayload(),frontendRoot:$('madEditFrontendRoot').value.trim(),creditMode:$('madEditCreditMode').value,status:+$('madEditStatus').value,domainAliases:($('madEditAliases')?.value||'').trim(),lowCreditThreshold:Number($('madEditThreshold')?.value||0),providerMarkupPercent:Number($('madProviderMarkup').value||0)})});await saveProviderPricing(id);if(masterUser){const roleSel=$('madEditMasterRole');const pickedId=roleSel?.value||'';const pickedType=(roleSel?.selectedOptions?.[0]?.getAttribute('data-role-type')||'').toUpperCase();const payload={id:editingMaster?.id??null,displayName:editingMaster?.displayName||editingMaster?.name||masterUser,username:masterUser,password:pass||null,status:editingMaster?.status==null?1:Number(editingMaster.status)};const roleId=pickedId||(editingMaster?.roleId!=null?String(editingMaster.roleId):'');const roleType=pickedType||String(editingMaster?.roleType||editingMaster?.role||'').toUpperCase();if(roleId) payload.roleId=Number(roleId);if(roleType) payload.roleType=roleType;await api('/admin/merchants/'+encodeURIComponent(id)+'/master-account',{method:'POST',headers:hdr(),body:JSON.stringify(payload)});}st.textContent='Merchant updated successfully.';await load();setTimeout(close,450)}catch(x){st.textContent=x.message}});
 $('madEditCurrency')?.addEventListener('change',()=>{
  syncEnabledWithPrimary();
  syncCurrencyUnits();
  if(window.BOSelectSync?.one) window.BOSelectSync.one($('madEditCurrency'));
 });
 $('madEditCurrencyAdd')?.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); openCurrencyModal('edit'); });
 $('madAddCurrencyBtn')?.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); openCurrencyModal('list'); });
 $('madCurrencyModalConfirm')?.addEventListener('click', ()=>confirmCurrencyModal());
 // Delegated handlers so Add still works if the button node is restyled/replaced.
 $('madCurrencyModal')?.addEventListener('click', e=>{
  if(e.target===$('madCurrencyModal')){ closeCurrencyModal(); return; }
  const addBtn=e.target.closest&&e.target.closest('#madCurrencyModalAddBtn');
  if(addBtn){ e.preventDefault(); e.stopPropagation(); addTypedCurrencyToDraft(); }
 });
 $('madCurrencyModalCode')?.addEventListener('input', e=>{
  setCurrencyModalStatus('');
  const code=normalizeCurrencyCode(e.target.value);
  if(e.target.value!==code) e.target.value=code;
 });
 $('madCurrencyModalCode')?.addEventListener('keydown', e=>{
  if(e.key==='Enter'){ e.preventDefault(); addTypedCurrencyToDraft(); }
 });
 $('madCurrencyMoveLeft')?.addEventListener('click', ()=>moveSelectedToAdded());
 $('madCurrencyMoveRight')?.addEventListener('click', ()=>moveSelectedToAvailable());
 $('madCurrencyDual')?.addEventListener('click', e=>{
  const remove=e.target.closest&&e.target.closest('[data-mad-currency-remove]');
  if(remove){ e.preventDefault(); e.stopPropagation(); discardStagedCurrency(remove.getAttribute('data-mad-currency-remove')); return; }
  const item=e.target.closest&&e.target.closest('[data-mad-currency-code]');
  if(!item) return;
  const code=normalizeCurrencyCode(item.getAttribute('data-mad-currency-code'));
  const side=String(item.getAttribute('data-mad-currency-side')||'');
  if(!code || (side!=='added' && side!=='available')) return;
  if(e.detail>=2){
   currencyModalSelected.clear();
   currencyModalSelected.add(code+'|'+side);
   if(side==='available') moveSelectedToAdded();
   else moveSelectedToAvailable();
   return;
  }
  toggleCurrencyModalSelection(code, side);
 });
 // The discard control is a span[role=button] inside the item button, so Enter/Space needs
 // handling here — the parent button would otherwise absorb the key as a selection.
 $('madCurrencyDual')?.addEventListener('keydown', e=>{
  if(e.key!=='Enter' && e.key!==' ') return;
  const remove=e.target.closest&&e.target.closest('[data-mad-currency-remove]');
  if(!remove) return;
  e.preventDefault(); e.stopPropagation();
  discardStagedCurrency(remove.getAttribute('data-mad-currency-remove'));
 });
 document.querySelectorAll('[data-mad-currency-close]').forEach(btn=>btn.addEventListener('click', ()=>closeCurrencyModal()));
 $('madProviderSearch')?.addEventListener('input', e=>{ providerSearch=e.target.value||''; renderCatalog(); });
 $('madProviderSelectAll')?.addEventListener('click', ()=>{ filteredProviders().forEach(p=>selectedCodes.add(providerCode(p))); renderCatalog(); renderSelected(); });
 $('madProviderClearAll')?.addEventListener('click', ()=>{
  if(providerSearch.trim()) filteredProviders().forEach(p=>selectedCodes.delete(providerCode(p)));
  else selectedCodes.clear();
  renderCatalog();
  renderSelected();
 });
 $('madProviderCatalogList')?.addEventListener('click', e=>{
  const chip=e.target.closest&&e.target.closest('[data-provider-pick]');
  if(!chip) return;
  const code=String(chip.getAttribute('data-provider-pick')||'').toUpperCase();
  setProviderSelected(code, !selectedCodes.has(code));
 });
 $('madProviderSelectedBody')?.addEventListener('input', e=>{
  if(!e.target.closest||!e.target.closest('[data-provider-override]')) return;
  recalcSelectedEffective();
 });
 $('madProviderApplyMarkup')?.addEventListener('click', ()=>{
  applyMarkupToSelected();
  renderSelected();
 });
 $('madExportBtn')?.addEventListener('click',()=>{const csv=[['Merchant','Company','Domain','Role','Currency','Credit Balance','Status','Created By','Last Login','Last Logout'],...filtered.map(b=>[b.code,b.name,b.primaryDomain,roleName(b),b.currency,b.creditBalance,active(b)?'Active':'Suspended',b.createdByName||b.createdByUsername||'Legacy / Migration',b.masterLastLoginAt,b.masterLastLogoutAt])].map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='merchants.csv';a.click();URL.revokeObjectURL(a.href)});
 // Topbar account chip: deliberately no local copy here. The merchant family renders it
 // from assets/js/bo-account-chip.js; this page opts in with class="bo-account-chip" on <body>.
 document.body.classList.add('mad-view-active');
 loadCurrencies();
 load();
})();
