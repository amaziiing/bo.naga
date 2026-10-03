(function(){
'use strict';
const base=window.API_BASE||'';const $=id=>document.getElementById(id);const admin=()=>{const u=window.BO_AUTH&&BO_AUTH.user?BO_AUTH.user():{};return u.username||u.displayName||localStorage.getItem('adminUsername')||localStorage.getItem('admin_username')||'ADMIN';};
const state={rules:[],rulePage:0,batches:[],batchPage:0,auditPage:0,auditLast:0,reconPage:0,reconLast:0,vipLevels:[],gameCategories:[]};
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4});
const date=v=>{if(!v)return '-';const d=new Date(v);return isNaN(d)?esc(v):d.toLocaleString('en-GB',{hour12:false});};
const dt=v=>window.BO_FORMAT?.dateTime?BO_FORMAT.dateTime(v):(v?String(v).replace('T',' ').slice(0,19):'-');
function dtParts(v){const full=dt(v);if(!full||full==='-')return{day:'-',time:''};const m=String(full).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T\s]+(\d{1,2}:\d{2}(?::\d{2})?)/);if(!m)return{day:full,time:''};const t=String(m[4]);return{day:String(m[3]).padStart(2,'0')+'/'+String(m[2]).padStart(2,'0')+'/'+m[1],time:t.length<8?t+':00':t};}
function dateCell(v){const p=dtParts(v);if(!p.time)return '<span class="bo-tx-datetime">'+esc(p.day)+'</span>';return '<span class="bo-tx-datetime" tabindex="0" data-tip="'+esc(p.time)+'">'+esc(p.day)+'</span>';}
function ensureTimeTip(){let t=document.getElementById('rebateTimeTip');if(t)return t;t=document.createElement('div');t.id='rebateTimeTip';t.className='um-time-tip';t.setAttribute('role','tooltip');t.setAttribute('aria-hidden','true');document.body.appendChild(t);return t;}
function hideTimeTip(){const tip=document.getElementById('rebateTimeTip');if(tip)tip.classList.remove('is-on','is-below');}
function placeTimeTip(el){const tip=ensureTimeTip(),text=el.getAttribute('data-tip')||'';if(!text){hideTimeTip();return;}tip.textContent=text;tip.classList.add('is-on');const r=el.getBoundingClientRect(),tr=tip.getBoundingClientRect();let top=r.top-tr.height-8,below=false;if(top<8){below=true;top=r.bottom+8;}tip.classList.toggle('is-below',below);const left=Math.max(8,Math.min(r.left+r.width/2-tr.width/2,window.innerWidth-tr.width-8));tip.style.left=Math.round(left)+'px';tip.style.top=Math.round(top)+'px';}
function bindTimeTips(){
  if(window.__boRebateTimeTip)return;window.__boRebateTimeTip=1;
  const find=e=>e.target&&e.target.closest?e.target.closest('.bo-tx-datetime[data-tip]'):null;
  document.addEventListener('mouseover',e=>{const el=find(e);if(el)placeTimeTip(el);});
  document.addEventListener('mouseout',e=>{const el=find(e);if(!el)return;const next=e.relatedTarget;if(next&&el.contains(next))return;hideTimeTip();});
  document.addEventListener('focusin',e=>{const el=find(e);if(el)placeTimeTip(el);});
  document.addEventListener('focusout',e=>{const el=find(e);if(!el)return;const next=e.relatedTarget;if(next&&el.contains(next))return;hideTimeTip();});
  window.addEventListener('scroll',hideTimeTip,true);
  window.addEventListener('resize',hideTimeTip);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')hideTimeTip();});
}
bindTimeTips();
/* Listings show the DATE in the cell and the TIME on hover - the member listing / Wallet Ledger
   recipe. A full `"02/10/2026, 15:04:22"` never fitted the date column, so every row came out as
   `02/10/2026, 15...` with the time unreadable. Both halves come from BO_FORMAT, which is what
   applies the bo_timezone setting; splitting its output keeps the two in step (parsing the raw
   value here would ignore it, as the old `date()` did, in the browser's own zone). The tip
   element and its styles are the global `.um-time-tip` (bo-charcoal-legacy.css, a sheet this
   page already links) - the same reuse admin-login-log makes - so only the delegation is local,
   and it is claimed once per document: the router re-runs this file on every entry into the
   page and a second document-level mouseover would place the tip twice. */
async function request(url,opt){opt=opt||{};opt.headers=Object.assign({},window.BO_AUTH&&BO_AUTH.authHeader?BO_AUTH.authHeader():{}, {'X-Admin-Username':admin(),'Cache-Control':'no-cache, no-store'},opt.headers||{});const r=await fetch(url,opt);const j=await r.json().catch(()=>({}));if(!r.ok||j.status==='error')throw Error(j.message||'Request failed');return j.data;}
function showError(e){if(window.BO_DIALOG)BO_DIALOG.alert(e.message||String(e),{title:'Unable to Continue',type:'error'});}
function setModal(id,show){const m=$(id);if(!m)return;m.classList.toggle('show',show);m.setAttribute('aria-hidden',show?'false':'true');document.body.classList.toggle('modal-open',show);}
/* Row Edit / "+ Add rule" open the rule form page. The form is a page, not a modal, so the
   link carries the id and (from the setting list) which list to come back to. */
const ruleEditHref=id=>'rebate-rule-edit.html'+(id==null?'':'?id='+encodeURIComponent(id))+(/daily-rebate-setting\.html$/i.test(location.pathname)?'&from=setting':'');
function statusBadge(v){const active=String(v)==='1'||String(v).toUpperCase()==='ACTIVE'||String(v).toUpperCase()==='COMPLETED'||String(v).toUpperCase()==='MATCHED';return '<span class="standard-status '+(active?'active':'inactive')+'"><i></i>'+esc(String(v==null?'-':v).replaceAll('_',' '))+'</span>';}
function pager(target,page,totalPages,handler){
  const el=$(target);if(!el)return;
  const pages=Math.max(0,Number(totalPages)||0);
  const p=Math.max(0,Math.min(Number(page)||0,Math.max(0,pages-1)));
  const empty=!pages;
  const btn=(label,targetPage,disabled,active,icon)=>'<button type="button" class="page-btn'+(active?' active':'')+'" data-p="'+targetPage+'" '+(disabled?'disabled':'')+' aria-label="'+label+'"'+(active?' aria-current="page"':'')+'>'+(icon?'<i class="bi '+icon+'"></i>':label)+'</button>';
  let h=btn('First',0,p<=0||empty,false,'bi-chevron-bar-left')+btn('Previous',p-1,p<=0||empty,false,'bi-chevron-left');
  if(empty){h+=btn('1',0,true,true);}
  else{const lo=Math.max(0,p-2),hi=Math.min(pages-1,p+2);for(let i=lo;i<=hi;i++)h+=btn(String(i+1),i,false,i===p);}
  h+=btn('Next',p+1,p>=pages-1||empty,false,'bi-chevron-right')+btn('Last',pages-1,p>=pages-1||empty,false,'bi-chevron-bar-right');
  el.innerHTML=h;
  el.onclick=e=>{const b=e.target.closest('[data-p]');if(!b||b.disabled)return;handler(Number(b.dataset.p));};
}
function clientPage(rows,page,size){const total=rows.length,pages=Math.ceil(total/size),safe=pages?Math.min(page,pages-1):0,start=safe*size;return{rows:rows.slice(start,start+size),page:safe,pages,total,start};}
function pageSize(id,fallback){
  const el=$(id);const raw=String(el&&el.value!=null?el.value:(fallback||20)).trim();
  if(/^all$/i.test(raw)) return 10000;
  if(raw===''||raw==='-'||/^auto$/i.test(raw)) return Number(fallback)||20;
  const n=Number(raw);
  return Number.isFinite(n)&&n>0?n:(Number(fallback)||20);
}
function switchTab(name){
  document.querySelectorAll('[data-tab]').forEach(b=>{
    const on=b.dataset.tab===name;
    b.classList.toggle('active',on);
    b.classList.toggle('is-active',on);
    if(on) b.setAttribute('aria-selected','true'); else b.setAttribute('aria-selected','false');
  });
  document.querySelectorAll('[data-panel]').forEach(p=>p.classList.toggle('active',p.dataset.panel===name));
  document.querySelectorAll('[data-actions]').forEach(el=>{
    const on=el.dataset.actions===name;
    el.hidden=!on;
    el.classList.toggle('is-active',on);
  });
  if(name==='batches')loadBatches();
  if(name==='audit')loadAudit();
  if(name==='reconciliation')loadRecon();
}

document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));


function workerStatusText(status,run,detail){
  const st=String(status||'').toUpperCase().replaceAll('_',' ');
  const when=run?date(run):'—';
  const msg=String(detail||'').trim();
  const ok=/^(SUCCESS|COMPLETED|OK|DONE)$/i.test(st);
  const fail=/^(FAIL|FAILED|ERROR)$/i.test(st);
  return {status:st||'—',when,detail:msg,ok,fail};
}
function applyWorkerFoot(prefix,info){
  const statusEl=$(prefix+'Status'),whenEl=$(prefix),msgEl=$(prefix+'Message');
  if(statusEl){
    statusEl.textContent=info.status;
    statusEl.classList.toggle('is-ok',!!info.ok);
    statusEl.classList.toggle('is-fail',!!info.fail);
    statusEl.classList.toggle('is-empty',!info.status||info.status==='—');
  }
  if(whenEl)whenEl.textContent=info.when;
  if(msgEl){
    if(info.detail){msgEl.hidden=false;msgEl.textContent=info.detail;}
    else{msgEl.hidden=true;msgEl.textContent='';}
  }
}
function updateSchedulePeek(){
  const peek=$('schedulePeek');
  const dailyOn=String($('rwDailyEnabled')?.value)==='1';
  const weeklyOn=String($('rwWeeklyEnabled')?.value)==='1';
  const dailyBadge=$('rwDailyBadge'),weeklyBadge=$('rwWeeklyBadge');
  if(dailyBadge){dailyBadge.textContent=dailyOn?'On':'Off';dailyBadge.classList.toggle('is-off',!dailyOn);}
  if(weeklyBadge){weeklyBadge.textContent=weeklyOn?'On':'Off';weeklyBadge.classList.toggle('is-off',!weeklyOn);}
  const dailyCard=document.querySelector('.rebate-cycle-card[data-cycle="daily"]');
  const weeklyCard=document.querySelector('.rebate-cycle-card[data-cycle="weekly"]');
  if(dailyCard)dailyCard.classList.toggle('is-disabled',!dailyOn);
  if(weeklyCard)weeklyCard.classList.toggle('is-disabled',!weeklyOn);
  if(!peek)return;
  const auto=String($('rwAutomaticEnabled')?.value)==='1';
  const dailyTime=$('rwDailyTime')?.value||'00:01';
  const weeklyTime=$('rwWeeklyTime')?.value||'00:15';
  const weekMap={1:'Mon',2:'Tue',3:'Wed',4:'Thu',5:'Fri',6:'Sat',7:'Sun'};
  const weeklyDay=weekMap[Number($('rwWeeklyDay')?.value||1)]||'Mon';
  const tz=$('rwTimeZone')?.value||'Asia/Kuala_Lumpur';
  if(!auto){peek.textContent='Automatic settlement off · '+tz;return;}
  peek.textContent=(dailyOn?'Daily '+dailyTime:'Daily off')+' · '+(weeklyOn?'Weekly '+weeklyDay+' '+weeklyTime:'Weekly off')+' · '+tz;
}
function setScheduleOpen(open){
  const card=document.querySelector('.rebate-schedule');
  const body=$('rebateScheduleBody');
  const btn=$('toggleRebateSchedule');
  if(!card||!body||!btn)return;
  card.dataset.scheduleOpen=open?'1':'0';
  body.hidden=!open;
  btn.setAttribute('aria-expanded',open?'true':'false');
}
function renderWorkerSetting(s){
  s=s||{};
  input('rwAutomaticEnabled',s.automaticEnabled==null?1:s.automaticEnabled);
  input('rwTimeZone',s.timeZone||'Asia/Kuala_Lumpur');
  input('rwDailyEnabled',s.dailyEnabled==null?1:s.dailyEnabled);
  input('rwDailyTime',s.dailyTime||'00:01');
  input('rwWeeklyEnabled',s.weeklyEnabled==null?1:s.weeklyEnabled);
  input('rwWeeklyDay',s.weeklyDay==null?1:s.weeklyDay);
  input('rwWeeklyTime',s.weeklyTime||'00:15');
  applyWorkerFoot('rwLastDaily',workerStatusText(s.lastDailyStatus,s.lastDailyRun,s.lastDailyMessage));
  applyWorkerFoot('rwLastWeekly',workerStatusText(s.lastWeeklyStatus,s.lastWeeklyRun,s.lastWeeklyMessage));
  updateSchedulePeek();
}
async function loadWorkerSetting(){try{renderWorkerSetting(await request(base+'/api/admin/rebate/worker-settings'));}catch(e){showError(e);}}
function workerBody(){return{automaticEnabled:Number($('rwAutomaticEnabled').value),timeZone:$('rwTimeZone').value.trim(),dailyEnabled:Number($('rwDailyEnabled').value),dailyTime:$('rwDailyTime').value,weeklyEnabled:Number($('rwWeeklyEnabled').value),weeklyDay:Number($('rwWeeklyDay').value),weeklyTime:$('rwWeeklyTime').value};}
const saveRebateWorker=$('saveRebateWorker');if(saveRebateWorker)saveRebateWorker.onclick=async()=>{try{const b=workerBody();if(!b.timeZone)throw Error('Timezone is required');if(!b.dailyTime)throw Error('Daily settlement time is required');if(!b.weeklyTime)throw Error('Weekly settlement time is required');const out=await request(base+'/api/admin/rebate/worker-settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});renderWorkerSetting(out);BO_DIALOG.alert('Rebate settlement schedule saved. The scheduler will use the new settings without server restart.',{title:'Schedule Saved'});}catch(e){showError(e);}};
['rwAutomaticEnabled','rwTimeZone','rwDailyEnabled','rwDailyTime','rwWeeklyEnabled','rwWeeklyDay','rwWeeklyTime'].forEach(id=>{const el=$(id);if(el)el.addEventListener('change',updateSchedulePeek);if(el)el.addEventListener('input',updateSchedulePeek);});
const toggleRebateSchedule=$('toggleRebateSchedule');
if(toggleRebateSchedule)toggleRebateSchedule.onclick=()=>{
  const open=toggleRebateSchedule.getAttribute('aria-expanded')!=='true';
  setScheduleOpen(open);
};

async function loadRules(){try{state.rules=await request(base+'/api/admin/rebate/rules')||[];state.rules.sort((a,b)=>(Number(b.priority||0)-Number(a.priority||0))||(Number(b.id)-Number(a.id)));$('ruleCount').textContent=state.rules.length.toLocaleString('en-US');$('activeRuleCount').textContent=state.rules.filter(x=>Number(x.status)===1).length.toLocaleString('en-US');renderRules();}catch(e){$('rebateRows').innerHTML='<tr><td colspan="9" class="table-empty">'+esc(e.message)+'</td></tr>';showError(e);}}
function renderRules(){const size=pageSize('rulePageSize'),d=clientPage(state.rules,state.rulePage,size);state.rulePage=d.page;$('rebateRows').innerHTML=d.rows.length?d.rows.map((x,i)=>'<tr><td>'+(d.start+i+1)+'</td><td><div class="table-primary">'+esc(x.name)+'</div><small>#'+esc(x.id)+'</small></td><td><div class="table-primary">'+esc(x.providerCode||'All Providers')+'</div><small>'+esc(x.gameCategory||'All Categories')+(x.vipLevel?' · VIP '+esc(x.vipLevel):'')+'</small></td><td>'+money(x.minValidBet||0)+' – '+(x.maxValidBet==null||Number(x.maxValidBet)<=0?'No limit':money(x.maxValidBet))+'</td><td><b>'+Number(x.rebateRate||0).toFixed(6).replace(/0+$/,'').replace(/\.$/,'')+'%</b><small>Cap: '+(x.maxRebate==null||Number(x.maxRebate)<=0?'None':money(x.maxRebate))+'</small></td><td>'+esc((x.combinationMode||'HIGHER_RATE').replaceAll('_',' '))+'</td><td>'+esc((x.claimMode||'MANUAL').replaceAll('_',' '))+'<small>'+esc((x.settlementCycle||'DAILY').replaceAll('_',' '))+' settlement</small></td><td>'+statusBadge(x.status===1?'Active':'Inactive')+'</td><td><div class="standard-actions"><a class="icon-action-btn edit" href="'+ruleEditHref(x.id)+'" title="Edit"><i class="bi bi-pencil"></i></a><button class="icon-action-btn delete" data-delete="'+x.id+'" title="Delete"><i class="bi bi-trash"></i></button></div></td></tr>').join(''):'<tr><td colspan="9" class="table-empty">No rebate rules found.</td></tr>';const from=d.total?d.start+1:0,to=Math.min(d.start+size,d.total);$('rebateShowing').textContent='Showing '+from+' to '+to+' of '+d.total+' entries';pager('rebatePager',d.page,d.pages,p=>{state.rulePage=p;renderRules();});}
function input(id,v){const e=$(id);if(e)e.value=v==null?'':v;}
$('rulePageSize').onchange=()=>{state.rulePage=0;renderRules();};
$('rebateRows').onclick=async e=>{const del=e.target.closest('[data-delete]');if(del){const x=state.rules.find(r=>String(r.id)===del.dataset.delete);if(await BO_DIALOG.confirm('Delete '+(x?x.name:'this rebate rule')+'?',{title:'Delete Rebate Rule',confirmText:'Delete',danger:true})){try{await request(base+'/api/admin/rebate/rules/delete/'+del.dataset.delete,{method:'POST'});await loadRules();}catch(err){showError(err);}}}};
$('runSettle').onclick=async()=>{if(!await BO_DIALOG.confirm('Run yesterday rebate settlement now? The cursor batch is idempotent and will not duplicate completed records.',{title:'Run Rebate Settlement',confirmText:'Run Settlement'}))return;try{const out=await request(base+'/api/admin/rebate/settle',{method:'POST'});BO_DIALOG.alert('Settlement completed. Batch #'+(out&&out.id||'-'),{title:'Settlement Complete'});loadBatches();}catch(e){showError(e);}};
const runWeeklySettleBtn=$('runWeeklySettle');if(runWeeklySettleBtn)runWeeklySettleBtn.onclick=async()=>{if(!await BO_DIALOG.confirm('Finalize the previous completed week now? Weekly rules will compare the member weekly rebate total against the auto-credit threshold.',{title:'Finalize Weekly Rebate',confirmText:'Finalize Week'}))return;try{const out=await request(base+'/api/admin/rebate/settle-weekly',{method:'POST'});BO_DIALOG.alert('Weekly rebate finalized for '+(out?.from||'-')+' to '+(out?.to||'-')+'.',{title:'Weekly Rebate Complete'});}catch(e){showError(e);}};

async function loadBatches(){try{state.batches=await request(base+'/api/admin/rebate/batches')||[];const b=state.batches[0];$('latestBatchStatus').textContent=b?String(b.status||'-').replaceAll('_',' '):'-';$('latestBatchText').textContent=b?String(b.settlementDate||'')+' · '+Number(b.processedCount||0).toLocaleString('en-US')+' processed':'No batch record';renderBatches();}catch(e){$('batchRows').innerHTML='<tr><td colspan="10" class="table-empty">'+esc(e.message)+'</td></tr>';}}
function renderBatches(){const size=pageSize('batchPageSize'),d=clientPage(state.batches,state.batchPage,size);state.batchPage=d.page;$('batchRows').innerHTML=d.rows.length?d.rows.map(x=>'<tr><td>#'+esc(x.id)+'</td><td>'+esc(x.settlementDate||'-')+'</td><td>'+statusBadge(x.status)+'</td><td>'+Number(x.processedCount||0).toLocaleString('en-US')+'</td><td>'+Number(x.successCount||0).toLocaleString('en-US')+'</td><td>'+Number(x.failedCount||0).toLocaleString('en-US')+'</td><td><b>'+money(x.totalRebate)+'</b></td><td>'+dateCell(x.startedAt)+'</td><td>'+dateCell(x.completedAt)+'</td><td>'+esc(x.createdBy||'SYSTEM')+'</td></tr>').join(''):'<tr><td colspan="10" class="table-empty">No settlement batches found.</td></tr>';const from=d.total?d.start+1:0,to=Math.min(d.start+size,d.total);$('batchShowing').textContent='Showing '+from+' to '+to+' of '+d.total+' entries';pager('batchPager',d.page,d.pages,p=>{state.batchPage=p;renderBatches();});}
$('batchPageSize').onchange=()=>{state.batchPage=0;renderBatches();};$('refreshBatches').onclick=loadBatches;

/* The audit filters are pickers now. The endpoint matches exactly and says nothing when it
   matches nothing, so a typed value that was nearly right came back as an empty table with no
   hint why (placeholder offered "PROMOTION / REBATE_RULE"). The options are the values this feed
   actually carries, collected as pages load rather than guessed: it is the shared admin operation
   log, so its vocabulary keeps growing (MANUAL_REBATE_APPROVAL and ADMIN_OPERATION on one page).
   "All …" is the unfiltered query, and a value already picked stays listed after a reload even
   when the filtered page no longer contains it. reports.js re-syncs the visible button/menu from
   the select's own MutationObserver, so rewriting the options is enough to keep the control in
   step - no BOSelectSync call needed. */
const auditFacets={entityType:new Set(),action:new Set(),actor:new Set()};
function fillAuditFacet(id,key,allLabel,rows){
  const el=$(id);if(!el)return;
  const picked=el.value;   /* read BEFORE any rewrite: setting innerHTML resets the selection */
  (rows||[]).forEach(x=>{if(x[key])auditFacets[key].add(String(x[key]));});
  const values=Array.from(auditFacets[key]).sort((a,b)=>a.localeCompare(b));
  const stamp=allLabel+'|'+values.join(', ');
  if(el.dataset.boFacets!==stamp){
    el.innerHTML='<option value="">'+esc(allLabel)+'</option>'+values.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');
    el.dataset.boFacets=stamp;
  }
  el.value=picked;
  if(el.value!==picked)el.value='';
}
function fillAuditFacets(rows){
  fillAuditFacet('auditEntity','entityType','All Entities',rows);
  fillAuditFacet('auditAction','action','All Actions',rows);
  fillAuditFacet('auditActor','actor','All Actors',rows);
}
['auditEntity','auditAction','auditActor'].forEach(id=>{const el=$(id);if(el)el.addEventListener('change',()=>{state.auditPage=0;loadAudit();});});

async function loadAudit(){const size=pageSize('auditPageSize'),q=new URLSearchParams({page:state.auditPage,size});if($('auditEntity').value.trim())q.set('entityType',$('auditEntity').value.trim());if($('auditAction').value.trim())q.set('action',$('auditAction').value.trim());if($('auditActor').value.trim())q.set('actor',$('auditActor').value.trim());try{const d=await request(base+'/api/admin/rebate/audit?'+q)||{},rows=d.content||[];fillAuditFacets(rows);state.auditLast=Math.max(0,(d.totalPages||0)-1);$('auditRows').innerHTML=rows.length?rows.map(x=>'<tr><td>'+dateCell(x.createdAt)+'</td><td><div class="table-primary">'+esc(x.entityType||'-')+'</div></td><td>'+esc(x.entityId||'-')+'</td><td>'+statusBadge(x.action||'-')+'</td><td>'+esc(x.actor||'SYSTEM')+'</td><td>'+esc(x.ipAddress||'-')+'</td><td class="detail-cell" title="'+esc(x.detail||'-')+'">'+esc(x.detail||'-')+'</td><td><button class="icon-action-btn view" data-audit-id="'+x.id+'"><i class="bi bi-eye"></i></button></td></tr>').join(''):'<tr><td colspan="8" class="table-empty">No audit records found.</td></tr>';$('auditRows').dataset.rows=JSON.stringify(rows);const from=d.numberOfElements?d.number*size+1:0,to=d.number*size+(d.numberOfElements||0);$('auditShowing').textContent='Showing '+from+' to '+to+' of '+(d.totalElements||0)+' entries';pager('auditPager',d.number||0,d.totalPages||0,p=>{state.auditPage=p;loadAudit();});}catch(e){$('auditRows').innerHTML='<tr><td colspan="8" class="table-empty">'+esc(e.message)+'</td></tr>';}}
$('auditPageSize').onchange=()=>{state.auditPage=0;loadAudit();};/* No Search button: the pickers apply themselves, the way every other filter row in the BO does. The guard keeps the legacy twin page (daily-rebate-setting.html), which still has one, working. */const searchAuditBtn=$('searchAudit');if(searchAuditBtn)searchAuditBtn.onclick=()=>{state.auditPage=0;loadAudit();};$('refreshAudit').onclick=loadAudit;
$('auditRows').onclick=e=>{const b=e.target.closest('[data-audit-id]');if(!b)return;const rows=JSON.parse($('auditRows').dataset.rows||'[]'),x=rows.find(r=>String(r.id)===b.dataset.auditId);if(!x)return;$('auditDetailContent').innerHTML='<dl><dt>Date</dt><dd>'+date(x.createdAt)+'</dd><dt>Entity</dt><dd>'+esc(x.entityType)+' #'+esc(x.entityId)+'</dd><dt>Action</dt><dd>'+esc(x.action)+'</dd><dt>Actor / IP</dt><dd>'+esc(x.actor||'SYSTEM')+' / '+esc(x.ipAddress||'-')+'</dd><dt>Detail</dt><dd>'+esc(x.detail||'-')+'</dd></dl><h5>Before</h5><pre>'+esc(formatJson(x.beforeJson))+'</pre><h5>After</h5><pre>'+esc(formatJson(x.afterJson))+'</pre>';setModal('auditDetailModal',true);};
function formatJson(v){if(!v)return'-';try{return JSON.stringify(JSON.parse(v),null,2);}catch(e){return String(v);}}
$('closeAuditDetail').onclick=$('closeAuditDetailBottom').onclick=()=>setModal('auditDetailModal',false);

async function loadRecon(){const size=pageSize('reconPageSize'),q=new URLSearchParams({page:state.reconPage,size});try{const d=await request(base+'/api/admin/rebate/reconciliations?'+q)||{},rows=d.content||[];state.reconLast=Math.max(0,(d.totalPages||0)-1);const issues=Number(d.totalElements||0)&&rows.filter(x=>String(x.status).toUpperCase()!=='MATCHED').length;$('reconIssueCount').textContent=Number(issues||0).toLocaleString('en-US');$('reconRows').innerHTML=rows.length?rows.map(x=>'<tr><td>'+dateCell(x.createdAt)+'</td><td>#'+esc(x.sessionId||'-')+'</td><td>'+esc(x.memberId||'-')+'</td><td>'+esc(x.providerCode||'-')+'</td><td>'+money(x.expectedMain)+'</td><td>'+money(x.expectedBonus)+'</td><td>'+money(x.actualProviderBalance)+'</td><td class="'+(Math.abs(Number(x.differenceAmount||0))>.01?'negative':'')+'">'+money(x.differenceAmount)+'</td><td>'+statusBadge(x.status)+'</td><td class="detail-cell" title="'+esc(x.detail||'-')+'">'+esc(x.detail||'-')+'</td></tr>').join(''):'<tr><td colspan="10" class="table-empty">No reconciliation records found.</td></tr>';const from=d.numberOfElements?d.number*size+1:0,to=d.number*size+(d.numberOfElements||0);$('reconShowing').textContent='Showing '+from+' to '+to+' of '+(d.totalElements||0)+' entries';pager('reconPager',d.number||0,d.totalPages||0,p=>{state.reconPage=p;loadRecon();});}catch(e){$('reconRows').innerHTML='<tr><td colspan="10" class="table-empty">'+esc(e.message)+'</td></tr>';}}
$('reconPageSize').onchange=()=>{state.reconPage=0;loadRecon();};$('refreshRecon').onclick=loadRecon;

loadWorkerSetting();loadRules();loadBatches();
})();
