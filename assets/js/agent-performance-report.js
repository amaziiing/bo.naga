(function(){'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=v=>Number(v||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2}),num=v=>Number(v||0).toLocaleString('en-US');
const API=String(window.API_CONFIG?.BASE_URL||'').replace(/\/+$/,'');function url(p){p=String(p||'');if(/\/api$/i.test(API)&&/^\/api\//i.test(p))p=p.replace(/^\/api/i,'');return API+(p.startsWith('/')?p:'/'+p)}
async function req(p){const r=await fetch(url(p),{headers:{...BO_AUTH.authHeader()}}),j=await r.json().catch(()=>({}));if(!r.ok||j.status==='error')throw Error(j.message||'Request failed');return j.data}
function user(){try{return JSON.parse(localStorage.getItem('bo_admin_user')||'{}')}catch(e){return {}}}function isMain(){return String(user().roleType||'').toUpperCase()==='MAIN'}
/* Same tile as every other report page now: `.quick-stats > .metric` (owner: "卡片的设计需要去统一"
   — these were the only tiles with per-tile green/purple/red wells and an amber value).
   The icon chip and the note are written HERE rather than left to reports.js's decorator:
   that decorator walks `.quick-stats .metric` descendants of a mutated node, so a tile set
   written wholesale into the strip is never matched and would render without its amber well
   (measured: tile present, `.bo-summary-icon` null). Every other page's tiles are in the
   markup at load, which is why they are decorated. The glyphs are this page's own. */
function card(icon,label,value){return `<div class="metric"><div class="bo-summary-icon"><i class="bi ${icon}"></i></div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`}
let data=null;
let perfRowsData=null,perfPage=1;
/* Page-size resolution — the LISTING standard, and the same reading the other ten report
   pages use (`pagination-standardizer.js` → resolvePageSize on the ~130 non-report
   listings; casino-report.js / player-game-ranking.js / operations-report.js here):
     `-` / blank / `auto`  →  FIT the rows to the panel
     `All`                 →  everything (this page's internal `0` = "no slice")
     a number              →  that number
   This was the only one of the eleven whose control had no `-` option at all and whose
   default was a hard 20, so its footer could not read the family's default and its rows
   did not fit the panel. Body-scroller geometry, subtracting the head only while it is
   still inside the scroll box (report-table-split.js lifts it out at ≥992px). */
function isAutoSize(){const v=$('perfSize')?String($('perfSize').value):'-';return v===''||v==='-'||/^auto$/i.test(v)}
function measureFit(){
  const wrap=document.querySelector('.perf-table-card .table-wrap');
  if(!wrap)return null;
  const head=wrap.querySelector('thead');
  const headH=head?Math.ceil(head.getBoundingClientRect().height):0;
  const cell=wrap.querySelector('tbody tr td');
  if(!cell)return null;
  const rowH=Math.max(34,Math.round(cell.getBoundingClientRect().height))||41;
  return Math.max(5,Math.min(200,Math.floor((Math.floor(wrap.clientHeight)-headH)/rowH)||20));
}
let sizeLock=null,autoSteps=0;
function perfSize(){const v=$('perfSize')?$('perfSize').value:'-';if(String(v).toLowerCase()==='all')return 0;if(isAutoSize()){if(sizeLock==null){const m=measureFit();if(m==null)return 20;sizeLock=m}return sizeLock}const n=Number(v);return n>0?n:20}
function perfRow(a,i){return `<tr><td>${i+1}</td><td><div class="perf-agent-cell"><span class="perf-avatar">${esc(String(a.agentName||a.agentCode||'A').charAt(0).toUpperCase())}</span><div><b>${esc(a.agentName||'-')}</b><small>${esc(a.agentCode||'')}</small></div></div></td><td>${num(a.totalPlayers)}</td><td>${num(a.activePlayers)}</td><td>+${num(a.newPlayers)}</td><td>${money(a.turnover)}</td><td class="${Number(a.houseProfit||0)>=0?'perf-pos':'perf-neg'}">${money(a.houseProfit)}</td><td>RM ${money(Number(a.houseProfit||0)*Number(a.commissionPercent||0)/100)}</td><td>RM ${money(a.depositAmount)} <small class="d-block">${num(a.depositCount)} tx</small></td><td>RM ${money(a.withdrawAmount)} <small class="d-block">${num(a.withdrawCount)} tx</small></td><td>RM ${money(a.bonusAmount)}</td><td class="perf-pos">RM ${money(a.playerWin)}</td><td class="perf-neg">RM ${money(a.playerLoss)}</td><td>RM ${money(a.settlementAmount)}${Number(a.pendingSettlement||0)>0?`<small class="d-block text-warning">Pending RM ${money(a.pendingSettlement)}</small>`:''}</td><td><span class="perf-status ${Number(a.status)!==1?'off':''}">${Number(a.status)===1?'Active':'Suspended'}</span></td><td><button class="perf-eye" data-view="${a.agentId}" title="View agent betting details"><i class="bi bi-eye"></i></button></td></tr>`}
function paintPager(pages){const host=$('perfPager');if(!host)return;/* always render: the family's ladder shows First/Prev/window/Next/Last with the ends disabled on a single page (owner: "当前页面好像没有设计到 页数器") — hiding it entirely was this page's own behaviour */const cur=perfPage,win=new Set([1,pages]);for(let n=cur-2;n<=cur+2;n++)if(n>=1&&n<=pages)win.add(n);const nums=Array.from(win).sort((a,b)=>a-b);let mid='',prev=0;nums.forEach(n=>{if(prev&&n-prev>1)mid+='<span class="smart-page-ellipsis" aria-hidden="true">\u2026</span>';mid+='<button type="button" class="smart-page'+(n===cur?' active':'')+'" data-perf-page="'+n+'" aria-label="Page '+n+'"'+(n===cur?' aria-current="page"':'')+'>'+n+'</button>';prev=n});const nav=(p,label,icon,off)=>'<button type="button" class="smart-page" data-perf-page="'+p+'" aria-label="'+label+'"'+(off?' disabled':'')+'><i class="bi '+icon+'"></i></button>';host.innerHTML=nav(1,'First page','bi-chevron-bar-left',cur===1)+nav(cur-1,'Previous page','bi-chevron-left',cur===1)+mid+nav(cur+1,'Next page','bi-chevron-right',cur===pages)+nav(pages,'Last page','bi-chevron-bar-right',cur===pages)}
function paintRows(){const rows=perfRowsData||[],total=rows.length,size=perfSize(),pages=size?Math.max(1,Math.ceil(total/size)):1;if(perfPage>pages)perfPage=pages;if(perfPage<1)perfPage=1;const start=size?(perfPage-1)*size:0,slice=size?rows.slice(start,start+size):rows;$('perfRows').innerHTML=slice.map((a,i)=>perfRow(a,start+i)).join('')||'<tr><td colspan="16" class="perf-empty">No agent performance records for this period.</td></tr>';const from=total?start+1:0,to=size?Math.min(start+size,total):total;$('perfShowing').textContent='Showing '+num(from)+' to '+num(to)+' of '+num(total)+' agent'+(total===1?'':'s');paintPager(pages);settleFit(size);}/* Settled against the painted rows, and VERIFIED one frame later.
   Two failures were measured here, not theorised. The first estimate runs before any row exists.
   Then a fit that converges against the panel's *transient* height stays one row too long, because
   the body box moves after the first paint — the head is split out by `report-table-split.js` and
   this table's own `min-width:1500px` horizontal scrollbar claims 6px — measured: 10 rows at 57px
   = 570 in a 562px panel, so the last 6px of the last row sat behind the bar. Hence the
   `requestAnimationFrame` re-check: the same post-paint verification `operations-report.js` does. */
function settleFit(size){
  if(!isAutoSize())return;
  const wrap=document.querySelector('.perf-table-card .table-wrap');
  if(!wrap)return;
  const tr=wrap.querySelector('tbody tr');
  const rowH=tr?Math.max(34,Math.round(tr.getBoundingClientRect().height)):57;
  const over=wrap.scrollHeight>wrap.clientHeight+1;
  const room=wrap.clientHeight-wrap.scrollHeight;
  let target=size;
  if(over)target=Math.max(5,size-1);
  else if(room>=rowH)target=size+1;
  if(target!==size&&autoSteps<3){autoSteps++;sizeLock=target;perfPage=1;paintRows();return}
  autoSteps=0;
  verifyOverflow();
}
/* The painted rows are checked against the panel until they fit.
   A one-frame re-check loses corrections to its own pending flag — measured on this page: the panel
   wanted 10 rows and the chain stopped at 11 with the table 41px too tall, and nothing re-armed it,
   so the default “-” kept a scrollbar. A bounded timer cannot be lost that way, and it only runs while
   the table actually overflows; each pass drops one row, so it converges in at most three. */
let verifyT=0;
function verifyOverflow(tries){
  tries=tries||0;
  if(tries>=3)return;
  clearTimeout(verifyT);
  verifyT=setTimeout(()=>{
    if(!isAutoSize())return;
    const w=document.querySelector(".perf-table-card .table-wrap");
    if(!w||w.scrollHeight<=w.clientHeight+1)return;
    const cur=sizeLock||perfSize();
    if(cur<=5)return;
    sizeLock=cur-1;autoSteps=0;perfPage=1;paintRows();
    verifyOverflow(tries+1);
  },160);
}
function stabilizePerfFilters(){
  const card=document.querySelector('.perf-filter-card'),brandField=$('perfBrandField'),agentField=$('perfAgentField');
  if(brandField){brandField.style.setProperty('--bo-select-width','190px','important');}
  if(agentField){agentField.style.setProperty('--bo-select-width','180px','important');}
  const bind=el=>{if(!el||el.dataset.perfMenuBound==='1')return;el.dataset.perfMenuBound='1';
    const open=()=>{if(window.innerWidth>1100)card?.classList.add('select-menu-open')};
    const close=()=>setTimeout(()=>card?.classList.remove('select-menu-open'),80);
    el.addEventListener('mousedown',open);el.addEventListener('keydown',e=>{if(['Enter',' ','ArrowDown','ArrowUp'].includes(e.key))open()});
    el.addEventListener('change',close);el.addEventListener('blur',close);
  };
  bind($('perfBrand'));bind($('perfAgent'));
}

async function brands(){if(!isMain()){$('perfBrandField').classList.add('hidden');return;}const list=await req('/api/admin/reports/agent-performance/brands');$('perfBrand').innerHTML='<option value="">Select Brand</option>'+list.map(b=>`<option value="${b.brandId}">${esc(b.brandName)} (${esc(b.brandCode)})</option>`).join('');stabilizePerfFilters();}
function q(){const p=new URLSearchParams();if($('perfFrom').value)p.set('from',$('perfFrom').value);if($('perfTo').value)p.set('to',$('perfTo').value);if($('perfBrand')?.value)p.set('brandId',$('perfBrand').value);if($('perfAgent').value)p.set('agentId',$('perfAgent').value);if($('perfKeyword').value.trim())p.set('keyword',$('perfKeyword').value.trim());return p.toString()}
let perfLoadSeq=0;
async function load(){const loadSeq=++perfLoadSeq;if(isMain()&&!$('perfBrand').value){$('perfKpis').innerHTML=[['bi-people','Total Agents','0'],['bi-person-check','Active Agents','0'],['bi-person-plus','New Players','0'],['bi-stack','Total Players','0'],['bi-coin','Total Turnover','RM 0.00'],['bi-graph-up-arrow','Total Profit','RM 0.00']].map(x=>card(x[0],x[1],x[2])).join('');$('perfRows').innerHTML='<tr><td colspan="16" class="perf-empty">Select a brand to view its agent performance.</td></tr>';$('perfShowing').textContent='Showing 0 to 0 of 0 agents';$('perfPager').innerHTML='';return;}data=await req('/api/admin/reports/agent-performance?'+q());if(loadSeq!==perfLoadSeq)return;const s=data.summary||{};$('perfKpis').innerHTML=card('bi-people','Total Agents',num(s.totalAgents))+card('bi-person-check','Active Agents',num(s.activeAgents))+card('bi-person-plus','New Players',num(s.newPlayers))+card('bi-stack','Total Players',num(s.totalPlayers))+card('bi-coin','Total Turnover','RM '+money(s.totalTurnover))+card('bi-graph-up-arrow','Total Profit','RM '+money(s.totalProfit));
const rows=data.rows||[];$('perfAgent').innerHTML='<option value="">All Agents</option>'+rows.map(a=>`<option value="${a.agentId}">${esc(a.agentCode)} - ${esc(a.agentName)}</option>`).join('');stabilizePerfFilters();perfRowsData=rows;paintRows();}
function exportCsv(){if(!data)return;const rows=data.rows||[],h=['Agent Code','Agent Name','Players','Active Players','New Players','Turnover','Profit','Commission %','Deposit','Withdraw','Bonus','Player Win','Player Loss','Settlement'];const csv=[h,...rows.map(a=>[a.agentCode,a.agentName,a.totalPlayers,a.activePlayers,a.newPlayers,a.turnover,a.houseProfit,a.commissionPercent,a.depositAmount,a.withdrawAmount,a.bonusAmount,a.playerWin,a.playerLoss,a.settlementAmount])].map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');const b=new Blob([csv],{type:'text/csv'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='agent-performance.csv';a.click();URL.revokeObjectURL(a.href)}
async function init(){BO_AUTH.requireLogin();await BO_AUTH.refreshMe();stabilizePerfFilters();await brands();stabilizePerfFilters();/* No Search button on this family (owner: "report的所有reset，search，refresh按键全去除").
   The filters now apply themselves — the brand and agent selects and the date range on change,
   the keyword field on a debounce — which is what that button used to trigger. The old
   assignment was unguarded, so removing the button alone would have thrown on load. */
  const perfLoad=()=>load().catch(e=>BO_DIALOG.alert(e.message,{title:'Agent Performance',type:'error'}));
  ['perfBrand','perfAgent','perfFrom','perfTo'].forEach(id=>{const el=$(id);if(el)el.addEventListener('change',perfLoad)});
  (function(){const el=$('perfKeyword');if(!el)return;let t=0;el.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(perfLoad,400)});el.addEventListener('keydown',e=>{if(e.key==='Enter')perfLoad()});})();$('perfRows').onclick=e=>{const b=e.target.closest('[data-view]');if(!b)return;const p=new URLSearchParams({agentId:b.dataset.view,from:$('perfFrom').value,to:$('perfTo').value});if($('perfBrand')?.value)p.set('brandId',$('perfBrand').value);location.href='agent-performance-detail.html?'+p.toString()};$('perfExport').onclick=exportCsv;$('perfSize').onchange=()=>{sizeLock=null;autoSteps=0;perfPage=1;paintRows()};$('perfPager').onclick=e=>{const b=e.target.closest('[data-perf-page]');if(!b||b.disabled)return;perfPage=Number(b.dataset.perfPage)||1;paintRows()};
/* In auto mode the fit follows the panel, as on the family's other pages. */
let perfFitT=0;window.addEventListener('resize',()=>{if(!isAutoSize())return;clearTimeout(perfFitT);perfFitT=setTimeout(()=>{const prev=sizeLock,m=measureFit();if(m==null){sizeLock=prev;return}if(m!==prev){sizeLock=m;autoSteps=0;perfPage=1;paintRows()}else sizeLock=prev},250)});
setTimeout(()=>load().catch(e=>BO_DIALOG.alert(e.message,{title:'Agent Performance',type:'error'})),50)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
