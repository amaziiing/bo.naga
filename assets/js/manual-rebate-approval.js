(function(){'use strict';const base=window.API_BASE||'', $=id=>document.getElementById(id);let page=0,last=0,current=[],selected=new Set(),allMatching=false;const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const money=v=>Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4});
function headers(json){const h=Object.assign({},window.BO_AUTH&&BO_AUTH.authHeader?BO_AUTH.authHeader():{});const u=window.BO_AUTH&&BO_AUTH.user?BO_AUTH.user():{};if(u&&u.username)h['X-Admin-Username']=u.username;if(json)h['Content-Type']='application/json';return h;}
async function request(url,opt){opt=opt||{};opt.headers=Object.assign(headers(!!opt.body),opt.headers||{});const r=await fetch(url,opt),j=await r.json().catch(()=>({}));if(!r.ok||j.status==='error')throw Error(j.message||'Request failed');return j.data;}
function today(){if(window.BO_FORMAT?.today)return BO_FORMAT.today();const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());}function modal(id,on){const e=$(id);e.classList.toggle('show',on);e.setAttribute('aria-hidden',on?'false':'true');}
function status(v){const x=String(v||'').toUpperCase(),ok=x==='CREDITED',warn=x==='PENDING_APPROVAL'||x==='AVAILABLE';return '<span class="standard-status '+(ok?'active':warn?'pending':'inactive')+'"><i></i>'+esc(x.replaceAll('_',' '))+'</span>';}
function resolvePageSize(raw){const v=String(raw??'20').trim();if(v==='-'||v==='')return 20;if(/^all$/i.test(v))return 10000;const n=Number(v);return Number.isFinite(n)&&n>0?n:20;}
function updateSelection(){const n=allMatching?Number($('sumMembers').textContent.replace(/,/g,''))||0:selected.size;$('sumSelected').textContent=n.toLocaleString('en-US');const hint=$('selectionHint');if(hint)hint.textContent=allMatching?'All matching results selected':n+' member(s) selected';$('selectAllResults').checked=allMatching;$('headerCheck').checked=current.filter(x=>x.approvable).length>0&&current.filter(x=>x.approvable).every(x=>selected.has(x.memberId)||allMatching);}
function syncRange(){const f=$('manualFrom'),t=$('manualTo');if(f&&t){const from=f.value||today(),to=t.value||from;f.value=from;t.value=to;$('dateFilter').value=to;return{from,to};}const d=$('dateFilter').value||today();return{from:d,to:d};}
async function load(){const range=syncRange();const size=resolvePageSize($('pageSize').value),q=new URLSearchParams({date:range.to,dateFrom:range.from,dateTo:range.to,page,size});if($('searchFilter').value.trim())q.set('search',$('searchFilter').value.trim());if($('statusFilter').value)q.set('status',$('statusFilter').value);$('rows').innerHTML='<tr><td colspan="9" class="table-empty">Loading...</td></tr>';try{const d=await request(base+'/api/admin/rebate/manual-approval?'+q)||{};current=d.content||[];last=Math.max(0,(d.totalPages||0)-1);$('rows').innerHTML=current.length?current.map(x=>'<tr><td><input class="row-check" type="checkbox" data-id="'+x.memberId+'" '+(!x.approvable?'disabled':'')+' '+(selected.has(x.memberId)||allMatching?'checked':'')+'></td><td><div class="table-primary">'+esc(x.username)+'</div><small>#'+esc(x.memberId)+'</small></td><td>'+money(x.liveValidTurnover)+'</td><td>'+money(x.slotValidTurnover)+'</td><td>'+money(x.soccerValidTurnover)+'</td><td><b>'+money(x.totalValidTurnover)+'</b></td><td><b>'+money(x.totalRebateAmount)+'</b></td><td>'+status(x.status)+'</td><td><button class="icon-action-btn view" data-detail="'+x.memberId+'" title="View"><i class="bi bi-eye"></i></button></td></tr>').join(''):'<tr><td colspan="9" class="table-empty">No rebate records found.</td></tr>';const from=d.numberOfElements?d.number*size+1:0,to=d.number*size+(d.numberOfElements||0);$('showing').textContent='Showing '+from+' to '+to+' of '+(d.totalElements||0)+' entries';$('sumMembers').textContent=Number(d.totalElements||0).toLocaleString('en-US');$('sumRebate').textContent=money(current.reduce((s,x)=>s+Number(x.totalRebateAmount||0),0));$('sumDate').textContent=(range.from===range.to?range.to:(range.from+' - '+range.to));renderPager(d.number||0,d.totalPages||0);updateSelection();}catch(e){$('rows').innerHTML='<tr><td colspan="9" class="table-empty">'+esc(e.message)+'</td></tr>';if(window.BO_DIALOG)BO_DIALOG.alert(e.message,{title:'Unable to Load',type:'error'});}}
function renderPager(cur,total){
  const pages=Math.max(1,Number(total)||0);
  const page=Math.max(0,Math.min(Number(cur)||0,Math.max(0,pages-1)));
  const empty=!total;
  const btn=(label,target,disabled,active,icon)=>'<button type="button" class="page-btn'+(active?' active':'')+'" data-page="'+target+'" '+(disabled?'disabled':'')+' aria-label="'+label+'"'+(active?' aria-current="page"':'')+'>'+(icon?'<i class="bi '+icon+'"></i>':label)+'</button>';
  let h=btn('First',0,page<=0||empty,false,'bi-chevron-bar-left')+btn('Previous',page-1,page<=0||empty,false,'bi-chevron-left');
  if(empty){h+=btn('1',0,true,true);}
  else{const lo=Math.max(0,page-2),hi=Math.min(pages-1,page+2);for(let i=lo;i<=hi;i++)h+=btn(String(i+1),i,false,i===page);}
  h+=btn('Next',page+1,page>=pages-1||empty,false,'bi-chevron-right')+btn('Last',pages-1,page>=pages-1||empty,false,'bi-chevron-bar-right');
  $('pager').innerHTML=h;
}
$('rows').onclick=e=>{const c=e.target.closest('.row-check');if(c){const id=Number(c.dataset.id);if(c.checked)selected.add(id);else selected.delete(id);allMatching=false;updateSelection();return;}const b=e.target.closest('[data-detail]');if(!b)return;const range=syncRange();const row=current.find(x=>String(x.memberId)===String(b.dataset.detail));const q=new URLSearchParams({memberId:String(b.dataset.detail),dateFrom:range.from,dateTo:range.to,date:range.to});if(row&&row.username)q.set('username',row.username);location.href='manual-rebate-detail.html?'+q.toString();};
$('headerCheck').onchange=e=>{current.filter(x=>x.approvable).forEach(x=>e.target.checked?selected.add(x.memberId):selected.delete(x.memberId));allMatching=false;$('selectPage').checked=e.target.checked;load();};$('selectPage').onchange=e=>{$('headerCheck').checked=e.target.checked;$('headerCheck').dispatchEvent(new Event('change'));};$('selectAllResults').onchange=e=>{allMatching=e.target.checked;if(allMatching)selected.clear();updateSelection();load();};
$('approveBtn').onclick=()=>{const n=allMatching?Number($('sumMembers').textContent.replace(/,/g,'')):selected.size;if(!n)return BO_DIALOG.alert('Please tick at least one pending member.',{type:'error'});const range=syncRange();$('approveSummary').innerHTML='<p><b>Settlement Period:</b> '+esc(range.from)+(range.from===range.to?'':' - '+esc(range.to))+'</p><p><b>Selected Members:</b> '+Number(n).toLocaleString('en-US')+'</p><p>This will credit the calculated rebate into each member main wallet and create wallet ledger, batch, item and admin audit records.</p>';$('approveRemark').value='';modal('approveModal',true);};
$('confirmApprove').onclick=async()=>{const remark=$('approveRemark').value.trim();if(!remark)return BO_DIALOG.alert('Remark is required for admin audit.',{type:'error'});const range=syncRange();const body={settlementDate:range.to,settlementDateFrom:range.from,settlementDateTo:range.to,memberIds:Array.from(selected),approveAllMatching:allMatching,search:$('searchFilter').value.trim(),status:$('statusFilter').value,remark};try{$('confirmApprove').disabled=true;const out=await request(base+'/api/admin/rebate/manual-approval/approve',{method:'POST',body:JSON.stringify(body)});modal('approveModal',false);selected.clear();allMatching=false;await load();const successCount=Number(out.successCount||0),failedCount=Number(out.failedCount||0);const resultType=failedCount===0&&successCount>0?'success':successCount>0?'warning':'error';const resultIcon=resultType==='success'?'bi-check-circle':resultType==='warning'?'bi-exclamation-triangle':'bi-x-circle';BO_DIALOG.alert('Batch '+(out.referenceNo||'#'+out.id)+' completed. Success: '+successCount+', Failed: '+failedCount+'.',{title:'Manual Rebate Completed',type:resultType,icon:resultIcon});}catch(e){BO_DIALOG.alert(e.message,{type:'error'});}finally{$('confirmApprove').disabled=false;}};
$('closeApprove').onclick=$('cancelApprove').onclick=()=>modal('approveModal',false);
function applyFilters(){page=0;selected.clear();allMatching=false;load();}
$('statusFilter').onchange=applyFilters;
$('searchFilter').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();applyFilters();}};
let searchTimer=0;
$('searchFilter').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(applyFilters,350);};
$('manualFrom').addEventListener('change',applyFilters);
$('manualTo').addEventListener('change',applyFilters);
$('pageSize').onchange=()=>{page=0;load();};
$('pager').onclick=e=>{const b=e.target.closest('[data-page]');if(!b||b.disabled)return;page=Number(b.dataset.page);if(page>=0&&page<=last)load();};
const y=today();
try{
  const sp=new URLSearchParams(location.search||'');
  const from=String(sp.get('dateFrom')||sp.get('from')||'').trim();
  const to=String(sp.get('dateTo')||sp.get('date')||sp.get('to')||'').trim();
  if($('manualFrom'))$('manualFrom').value=from||y;
  if($('manualTo'))$('manualTo').value=to||from||y;
}catch(e){
  if($('manualFrom'))$('manualFrom').value=y;
  if($('manualTo'))$('manualTo').value=y;
}
$('dateFilter').value=$('manualTo')?$('manualTo').value:y;
load();
})();
