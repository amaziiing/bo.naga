(function(){'use strict';
const $=id=>document.getElementById(id),base=()=>API_CONFIG.BASE_URL,token=()=>localStorage.getItem('agent_token')||'',esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=v=>Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}),num=v=>Number(v||0).toLocaleString();
async function api(path,opt={}){opt.headers=Object.assign({},opt.headers||{},token()?{Authorization:'Bearer '+token()}:{});const r=await fetch(base()+path,opt),j=await r.json().catch(()=>({}));if(!r.ok||j.status==='error')throw Error(j.message||'Request failed');return j.data??j;}
const dialog={alert:(m,o)=>window.BO_DIALOG?BO_DIALOG.alert(m,o):Promise.resolve(alert(m)),confirm:(m,o)=>window.BO_DIALOG?BO_DIALOG.confirm(m,o):Promise.resolve(confirm(m))};
const MENU=[['dashboard','Dashboard','bi-grid','agent-dashboard.html'],['products','Products','bi-box-seam','agent-products.html'],['reports','Reports','bi-graph-up-arrow','agent-bet-report.html'],['bonus','Promotion','bi-megaphone','agent-bonus.html']];
const UTILITY=new Set(['profile','password']);
/* Pages the portal no longer carries because they exist only to show customers. A menu key that
   outlives its page (agents were granted `players` before this) must not become a URL a curious
   agent can still open, so the guard refuses the page itself, not just its rail row. */
const RETIRED_PAGES=new Set(['players','provider_detail']);
const PERM_ALIAS={products:'bet_report',provider_detail:'bet_report',reports:'bet_report',player_game_report:'bet_report',finance:'wallet',withdraw:'settlement',bonus:'wallet'};
function permissionKey(k){return PERM_ALIAS[k]||k}
function menuHref(k){const row=MENU.find(x=>x[0]===k);if(row)return row[3];if(k==='bet_report')return 'agent-bet-report.html';if(k==='settlement')return 'agent-withdraw.html';if(k==='wallet')return 'agent-wallet.html';return 'agent-dashboard.html'}
function landingFor(keys){for(const k of (keys||[])){const h=menuHref(k);if(h!=='agent-dashboard.html'||k==='dashboard')return h}return 'agent-profile.html'}
/* Login page: bound BELOW MENU/menuHref/landingFor on purpose, and ABOVE the data-agent-page guard.
   agent-login.html declares no data-agent-page, so it never gets past that guard - a handler bound under it
   is never installed at all. Bound above MENU instead (where it used to sit) it fires on submit and reaches
   landingFor() -> menuHref() -> `const MENU`, which on this page was never initialized: every sign-in died
   with "Cannot access 'MENU' before initialization", the token was stored, and the page never navigated.
   Keep this block between the MENU declaration and the guard. */
const loginForm=$('agentLoginForm');if(loginForm){loginForm.onsubmit=async e=>{e.preventDefault();const msg=$('agentLoginMsg');msg.textContent='Signing in...';msg.className='upload-status';try{const r=await fetch(base()+'/agent/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('agentLoginUser').value,password:$('agentLoginPass').value})}),j=await r.json().catch(()=>({}));if(!r.ok||j.status==='error'||!j.token)throw Error(j.message||'Login failed');localStorage.setItem('agent_token',j.token);const menus=j.data?.portalMenuKeys||['dashboard'];location.href=landingFor(menus);}catch(x){msg.textContent=x.message;msg.className='upload-status error';}};return;}
const page=document.body.dataset.agentPage;if(!page)return;if(!token()){location.href='agent-login.html';return;}
let profile=null,lastSettlementReport=null,playersCache=[],walletCache=[],settlementsCache=[];
function initials(name){return String(name||'A').trim().split(/\s+/).map(x=>x[0]||'').join('').slice(0,2).toUpperCase()||'A'}
function agentProfileHtml(){
 /* BO's standard account chip (bo-account-chip.css / bo-account-chip.js): one <a class="bo-account-link">
    holding the avatar and a .bo-account-meta stack, and it is a LINK, not a menu - on every BO page
    bo-account-chip.js points it at the account settings page's password section
    (href = profile.html#password, title "Account settings / Change password"), so one click reaches
    both the profile and the password form. The portal keeps its own two pages, so this links to the
    profile page, which now carries the same Change Password door (owner: "agent 卡片的点入直接可查看
    profile和change password这点需要去统一").
    The body already opts into the chip's stylesheet (class="bo-account-chip" on <body>), so the
    markup below renders through the BO's own CSS. It is authored here rather than left to
    bo-account-chip.js because that script labels the role from BO_AUTH, which the portal does not load. */
 const name=profile?.name||'Agent',user=profile?.loginUsername||profile?.code||'agent';
 return `<a class="bo-account-link" href="agent-profile.html#password" title="Account settings / Change password" aria-label="Open account settings and change password"><span class="report-avatar" aria-hidden="true"><i class="bi bi-person"></i></span><span class="bo-account-meta"><span class="bo-account-name">${esc(name)}</span><span class="bo-account-role">Agent &middot; ${esc(user)}</span></span></a>`;
}
function bindProfileMenu(){const btn=document.querySelector('[data-agent-profile-toggle]'),menu=$('agentProfileMenu'),side=$('agentSidebarProfileCard'),sideMenu=$('agentSidebarProfileMenu');if(btn&&menu){btn.onclick=e=>{e.stopPropagation();menu.classList.toggle('show')}}if(side&&sideMenu){const toggle=e=>{e.preventDefault();e.stopPropagation();const open=!sideMenu.classList.contains('show');sideMenu.classList.toggle('show',open);side.classList.toggle('open',open);side.setAttribute('aria-expanded',String(open))};side.addEventListener('click',e=>{if(e.target.closest('.agent-sidebar-profile-menu a'))return;toggle(e)});side.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')toggle(e)})}/* `wrap` was never declared: this handler threw a ReferenceError on every click (the portal's top
   chip is a plain link now, agentProfileHtml above, so there is no menu to close either). The
   container is resolved per click and an absent menu is a no-op. */
document.addEventListener('click',e=>{const wrap=$('agentTopProfile');if(wrap&&menu&&!wrap.contains(e.target))menu.classList.remove('show');if(side&&!side.contains(e.target)){sideMenu?.classList.remove('show');side.classList.remove('open');side.setAttribute('aria-expanded','false')}});document.querySelectorAll('[data-agent-logout]').forEach(a=>a.onclick=e=>{e.preventDefault();localStorage.removeItem('agent_token');location.href='agent-login.html'});}
async function initShell(){try{profile=await api('/agent/me');const allowed=new Set(profile.portalMenuKeys||['dashboard']);const required=permissionKey(page);if(!UTILITY.has(page)&&(RETIRED_PAGES.has(page)||!allowed.has(required))){location.href=landingFor([...allowed]);return false;}const nav=$('agentPortalNav');if(nav){let html='';for(const x of MENU){const pk=permissionKey(x[0]);if(!allowed.has(pk))continue;const navActive=x[0]===page||(x[0]==='products'&&page==='provider_detail')||(x[0]==='reports'&&page==='player_game_report');html+=`<a class="report-nav-item ${navActive?'active':''}" href="${x[3]}"><i class="bi ${x[2]}"></i><span>${x[1]}</span></a>`;}const financeVisible=allowed.has('wallet')||allowed.has('settlement');if(financeVisible){const active=['finance','withdraw'].includes(page);html+=`<div class="nav-group agent-finance-group ${active?'open':''}" data-menu-group="finance">`+
`<button type="button" class="nav-group-btn" data-finance-toggle aria-expanded="${active?'true':'false'}"><span><i class="bi bi-wallet2 me-2"></i>Finance</span><i class="bi bi-chevron-down"></i></button>`+
`<div class="nav-group-list ${active?'show':''}"><div class="bo-flyout-title">Finance</div>`+
(allowed.has('wallet')?`<a class="report-sub ${page==='finance'?'active':''}" href="agent-wallet.html" data-menu-key="wallet"><span><i class="bi bi-wallet2 me-2"></i>Wallet</span></a>`:'')+
(allowed.has('settlement')?`<a class="report-sub ${page==='withdraw'?'active':''}" href="agent-withdraw.html" data-menu-key="withdraw"><span><i class="bi bi-cash-stack me-2"></i>Withdraw</span></a>`:'')+
`</div></div>`;}
nav.innerHTML=html;const ft=nav.querySelector('[data-finance-toggle]');if(ft){
  /* Delegated, like auth.js's own bindDynamicSidebarEvents for this rail: the nav is rebuilt by initShell (and
     can be rebuilt again by a menu refresh), so listeners hung on the group element disappear with it, and a
     listener on the row misses a pointer that lands on a child (the icon or the label). The handlers therefore
     live on the document and resolve the group per event. The behaviour itself is the Main rail's
     (reports.js:91-232): 140ms intent delay before opening, a 400ms close grace that entering the panel cancels,
     hover bound unconditionally (the pointer-capability query lies on touch laptops), a click fallback for
     pointer-less devices, and the panel positioned at left = sidebar.right + 6. */
  const isDesktop=()=>window.innerWidth>=992;
  const onPage=()=>page==='finance'||page==='withdraw';
  let openGroup=null,openTimer=0,closeTimer=0;
  const parts=function(g){
    if(!g)return {};
    return {grp:g,btn:g.querySelector('.nav-group-btn'),list:g.querySelector('.nav-group-list')};
  };
  /* auth.js:positionSidebarFlyout writes two custom properties on the group and the shell sheet
     (bo-global-quicknav.css) consumes them with position:fixed!important - the panel's top is the row's top,
     its left is the rail's right edge + 6, and its height is capped to the room below. */
  const placeFlyout=function(g){
    const p=parts(g),rail=$('reportSidebar');
    if(!p.btn||!p.list||!rail)return;
    const sr=rail.getBoundingClientRect(),br=p.btn.getBoundingClientRect();
    const left=Math.max(8,Math.round(sr.right+6));
    let top=Math.round(br.top);
    const room=window.innerHeight-top-12,cap=Math.max(160,Math.min(Math.round(window.innerHeight*0.62),room));
    if(top+cap>window.innerHeight-12)top=Math.max(12,window.innerHeight-cap-12);
    g.style.setProperty('--bo-sidebar-flyout-left',left+'px');
    g.style.setProperty('--bo-sidebar-flyout-top',top+'px');
    g.style.setProperty('--bo-sidebar-flyout-max',cap+'px');
  };
  const hideNow=function(g){
    const p=parts(g||openGroup);
    if(!p.grp)return;
    clearTimeout(openTimer);clearTimeout(closeTimer);
    p.grp.classList.remove('bo-flyout-hover','open');
    if(p.list)p.list.classList.remove('show');
    if(p.btn){p.btn.setAttribute('aria-expanded','false');if(!onPage())p.btn.classList.remove('active');}
    if(openGroup===p.grp)openGroup=null;
  };
  const show=function(g){
    const p=parts(g);
    if(!p.grp)return;
    if(openGroup&&openGroup!==p.grp)hideNow(openGroup);
    clearTimeout(closeTimer);clearTimeout(openTimer);
    openTimer=setTimeout(function(){
      if(!isDesktop())return;
      /* The original rail's flag is `.bo-flyout-hover` (auth.js:openSidebarFlyoutOnHover). reports.css:7296 hides
         every `.nav-group:not(.bo-flyout-hover) > .nav-group-list` with display:none / visibility:hidden /
         pointer-events:none, all !important - so the panel can only be opened by that class. Opening it with
         `.open` + inline !important overrides (what this did before) paints the panel but leaves
         pointer-events:none in force: visible, and the pointer falls through it onto the table beneath. */
      p.grp.classList.add('bo-flyout-hover','open');
      if(p.list)p.list.classList.add('show');
      if(p.btn)p.btn.setAttribute('aria-expanded','true');
      placeFlyout(p.grp);
      openGroup=p.grp;
    },140);
  };
  const scheduleHide=function(g){
    clearTimeout(openTimer);clearTimeout(closeTimer);
    closeTimer=setTimeout(function(){hideNow(g);},400);
  };
  const groupOf=function(node){
    return node&&node.closest?node.closest('.report-sidebar .nav-group'):null;
  };
  document.addEventListener('mouseover',function(e){
    const g=groupOf(e.target);
    if(!g)return;
    if(g===openGroup){
      /* Still inside the open group (the pointer moved from the row into the panel, or between its rows).
         This branch must cancel the pending close: returning silently left the 400ms timer scheduled by the
         mouseout on the row, so the panel disappeared before the user could reach it - "I cannot click Wallet".
         The panel is a child of the group, so moving onto it fires mouseover, not mouseout, for the group. */
      clearTimeout(closeTimer);
      return;
    }
    show(g);
  });
  document.addEventListener('mouseout',function(e){
    const g=groupOf(e.target);
    if(!g||g!==openGroup)return;
    const to=e.relatedTarget,p=parts(g);
    if(to&&(g.contains(to)||(p.list&&p.list.contains(to))))return;
    scheduleHide(g);
  });
  document.addEventListener('click',function(e){
    const g=groupOf(e.target);
    if(!g)return;
    const onBtn=e.target.closest&&e.target.closest('.nav-group-btn');
    if(!onBtn)return;
    if(window.matchMedia('(hover: hover)').matches&&openGroup===g)return;
    e.preventDefault();
    if(g.classList.contains('open'))hideNow(g);else show(g);
  });
  document.addEventListener('keydown',function(e){
    if(e.key!=='Enter'&&e.key!==' ')return;
    const g=groupOf(e.target);
    if(!g||!e.target.closest('.nav-group-btn'))return;
    e.preventDefault();
    if(g.classList.contains('open'))hideNow(g);else show(g);
  });
  /* No default-open on the group's own pages. The original rail marks the current section with `.open` /
     `.show` (the template above does that) and leaves the panel hidden - reports.css hides every
     `.nav-group:not(.bo-flyout-hover) > .nav-group-list` - while the parent row is lit by the shell's
     `:has(.report-sub.active)`. Adding `.bo-flyout-hover` here pinned the panel open over the page of the
     link just clicked, with the pointer long gone. */
}}if($('agentSidebarIdentity'))$('agentSidebarIdentity').textContent=(profile.code||'Agent')+' · '+Number(profile.commissionPercent||0).toFixed(2)+'%';const sf=$('agentSidebarFooter');if(sf)sf.innerHTML=`<div class="bo-sidebar-account-footer"><a class="bo-sidebar-logout" href="#logout" data-agent-logout><i class="bi bi-box-arrow-right"></i><span>Logout</span></a></div>`;if($('agentTopProfile'))$('agentTopProfile').innerHTML=agentProfileHtml();bindProfileMenu();
 /* The rail's own toggle, in the BO's slot: .report-brand holds the label and this button, laid out
     space-between (see the parity sheet), and it stays visible when the rail is collapsed - which is
     what BO does (measured: BO's topbar has NO hamburger; its rail keeps one at 42x42 in both
     states). The portal had the hamburger only in the topbar, so it could not sit where the owner
     pointed. reports.js binds [data-open-sidebar] wherever it is. */
 const brand=document.querySelector('.report-brand');
 if(brand&&!brand.querySelector('.hamb')){
   const hb=document.createElement('button');
   hb.className='hamb dashboard-sidebar-toggle';
   hb.type='button';hb.setAttribute('data-open-sidebar','');
   hb.setAttribute('aria-label','Toggle sidebar');hb.setAttribute('title','Toggle sidebar');
   hb.innerHTML='<i class="bi bi-list"></i>';
   const close=brand.querySelector('.close-side');
   if(close)brand.insertBefore(hb,close);else brand.appendChild(hb);
 }document.querySelectorAll('[data-open-sidebar]').forEach(b=>b.onclick=()=>document.body.classList.add('sidebar-open'));document.querySelectorAll('[data-close-sidebar]').forEach(b=>b.onclick=()=>document.body.classList.remove('sidebar-open'));return true;}catch(e){localStorage.removeItem('agent_token');location.href='agent-login.html';return false;}}
function setAgentFormStatus(id,message,type=''){
 const el=$(id);if(!el)return;el.textContent=message||'';el.className='upload-status'+(type?' '+type:'');
}
function refreshAgentIdentity(){
 if($('agentSidebarIdentity'))$('agentSidebarIdentity').textContent=(profile?.code||'Agent')+' · '+Number(profile?.commissionPercent||0).toFixed(2)+'%';
 if($('agentTopProfile'))$('agentTopProfile').innerHTML=agentProfileHtml();
 const card=$('agentSidebarProfileCard');
 if(card){const name=card.querySelector('div > b'),sub=card.querySelector('div > small');if(name)name.textContent=profile?.name||profile?.code||'Agent';if(sub)sub.textContent=(profile?.code||'Agent')+' · Agent';}
 bindProfileMenu();
}
function initProfile(){
 const form=$('agentProfileForm');if(!form)return;
 const fill=()=>{
  $('agentProfileCode').value=profile?.code||'';
  $('agentProfileUsername').value=profile?.loginUsername||'';
  $('agentProfileName').value=profile?.name||'';
  $('agentProfileCommission').value=Number(profile?.commissionPercent||0).toFixed(2)+'%';
 };
 fill();
 form.onsubmit=async e=>{
  e.preventDefault();setAgentFormStatus('agentProfileStatus','Saving...');
  const loginUsername=String($('agentProfileUsername')?.value||'').trim(),name=String($('agentProfileName')?.value||'').trim();
  if(!loginUsername||!name){setAgentFormStatus('agentProfileStatus','Login username and display name are required.','error');return;}
  try{
   profile=await api('/agent/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({loginUsername,name})});
   fill();refreshAgentIdentity();setAgentFormStatus('agentProfileStatus','Profile updated successfully.','success');
  }catch(x){setAgentFormStatus('agentProfileStatus',x.message||'Unable to update profile.','error');}
 };
}
function initPassword(){
 const form=$('agentChangePasswordForm');if(!form)return;
 form.onsubmit=async e=>{
  e.preventDefault();const currentPassword=$('agentCurrentPassword')?.value||'',newPassword=$('agentNewPassword')?.value||'',confirmPassword=$('agentConfirmPassword')?.value||'';
  setAgentFormStatus('agentPasswordStatus','');
  if(newPassword.length<8){setAgentFormStatus('agentPasswordStatus','New password must be at least 8 characters.','error');return;}
  if(newPassword!==confirmPassword){setAgentFormStatus('agentPasswordStatus','Confirm password does not match.','error');return;}
  setAgentFormStatus('agentPasswordStatus','Updating...');
  try{
   await api('/agent/password/change',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword,newPassword})});
   form.reset();setAgentFormStatus('agentPasswordStatus','Password changed successfully.','success');
  }catch(x){setAgentFormStatus('agentPasswordStatus',x.message||'Unable to change password.','error');}
 };
}
function metric(label,value,small){const icons={'Players':'bi-people','Turnover':'bi-arrow-repeat','Customer Loss':'bi-graph-down-arrow','Estimated Profit':'bi-cash-coin','Wallet':'bi-wallet2','Bet Count':'bi-receipt','KPI Target':'bi-bullseye','KPI Shortfall':'bi-exclamation-circle','Total Bet':'bi-cash-stack','Valid Bet':'bi-check2-circle','Total Win':'bi-trophy','Agent Commission':'bi-percent','KPI Achieved':'bi-graph-up-arrow','Carry Out Preview':'bi-arrow-right-circle','Daily Capital':'bi-bank','Current Wallet Balance':'bi-wallet2'};return `<div class="metric"><i class="bi ${icons[label]||'bi-bar-chart'} bo-summary-icon"></i><span>${esc(label)}</span><strong>${esc(value)}</strong>${small?`<small class="bo-summary-note">${esc(small)}</small>`:''}</div>`}
function isoLocal(d){const z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,10)}function today(){return isoLocal(new Date())}function ensureRange(fromId,toId){const a=$(fromId),b=$(toId);if(a&&!a.value)a.value=today();if(b&&!b.value)b.value=today();return[a?.value||'',b?.value||'']}
let agentHeaderClockTimer=null;
function agentTimezone(){return localStorage.getItem('bo_timezone')||'Asia/Kuala_Lumpur';}
function renderAgentHeaderClock(){
 const clock=$('agentLastUpdated');if(!clock)return;
 const z=agentTimezone(),now=new Date();
 try{
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:z,year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now),v={};
  parts.forEach(p=>{if(p.type!=='literal')v[p.type]=p.value;});
  if(clock){clock.textContent=`${z} · ${v.day} ${v.month} ${v.year} ${v.hour}:${v.minute}:${v.second}`;clock.setAttribute('aria-label','Current BO timezone and time');}
 }catch(_){
  if(clock)clock.textContent=now.toLocaleString();
 }
}
function startAgentHeaderClock(){if(agentHeaderClockTimer)clearInterval(agentHeaderClockTimer);renderAgentHeaderClock();agentHeaderClockTimer=setInterval(renderAgentHeaderClock,1000);}
window.addEventListener('storage',e=>{if(e.key==='bo_timezone')renderAgentHeaderClock();});
function inDateRange(v,from,to){const d=String(v||'').slice(0,10);return(!from||d>=from)&&(!to||d<=to)}
function statusPill(s){const v=String(s||'').toLowerCase();return `<span class="status-pill ${v}">${esc(s||'-')}</span>`}
async function loadDashboard(){
 const [from,to]=ensureRange('agentDashFrom','agentDashTo'),monthFrom=to.slice(0,8)+'01';
 const [d,month,players,trend,bet,ledgerData,settleRows,settlementReport]=await Promise.all([
  api('/agent/dashboard?'+new URLSearchParams({from,to})),api('/agent/dashboard?'+new URLSearchParams({from:monthFrom,to})),fetchPlayers().catch(()=>[]),api('/agent/dashboard/trend?days=30').catch(()=>[]),api('/agent/bet-report?'+new URLSearchParams({from,to,page:0,size:5})).catch(()=>({rows:[],summary:{}})),api('/agent/ledger').catch(()=>({rows:[],balance:0})),api('/agent/settlements').catch(()=>[]),api('/agent/settlement/report?'+new URLSearchParams({from,to})).catch(()=>null)
 ]);
 const now=new Date();renderAgentHeaderClock();if($('agentGreeting'))$('agentGreeting').textContent='Good '+(now.getHours()<12?'morning':now.getHours()<18?'afternoon':'evening')+', '+(profile.name||profile.code||'Agent')+'! 👋';
 const pending=(settleRows||[]).filter(x=>String(x.settlementStatus||'').toUpperCase()==='PENDING').reduce((a,x)=>a+Number(x.requestedAmount||0),0);
 /* Available Balance is the money the agent can still take out, so it reads the SAME endpoint and the
    SAME formula as the withdraw page (agent-withdraw.html's `availableCommission ?? agentProfit`, and
    that endpoint answers with the KPI-cycle figure whatever range is sent - the withdraw page overwrites
    its own date fields with d.kpiPeriodFrom/To for exactly that reason). It used to paint
    /agent/dashboard's `walletBalance`, a different quantity from a different endpoint, so the two pages
    carried one label with two numbers (measured on ag1001: RM 1.35 against RM 1.19). The monthly
    dashboard payload is the fallback for an agent whose portal menus do not include settlement. */
 const availableCommission=Math.max(0,Number(settlementReport?.availableCommission??settlementReport?.agentProfit??month.availableCommission??month.agentProfit??0));
 const cards=[['bi-wallet2','Available Balance','RM '+money(availableCommission),'<a class="agent-card-action" href="agent-settlement.html">Withdraw</a>'],['bi-percent',"Today's Commission",'RM '+money(d.availableCommission??Math.max(0,Number(d.agentProfit||0))),'<small>'+(Number(d.agentProfit||0)>=0?'+':'')+money(d.agentProfit||0)+'</small>'],['bi-cash-coin','This Month Commission','RM '+money(month.availableCommission??Math.max(0,Number(month.agentProfit||0))),'<small>Current month</small>'],['bi-wallet','Pending Settlement','RM '+money(pending),'<a class="agent-card-action" href="agent-settlement.html">View Details</a>']];
 if($('agentHeroMetrics'))$('agentHeroMetrics').innerHTML=cards.map(x=>`<div class="agent-kpi-card"><span class="agent-kpi-icon"><i class="bi ${x[0]}"></i></span><div><span>${x[1]}</span><strong>${x[2]}</strong>${x[3]}</div></div>`).join('');
 const active=players.filter(p=>sameDay(p.lastLoginAt,to)).length,newPlayers=players.filter(p=>String(p.createdAt||'').slice(0,7)===to.slice(0,7)).length,inactive=players.filter(p=>daysAgo(p.lastLoginAt)>7).length;
 if($('agentPlayerOverview'))$('agentPlayerOverview').innerHTML=`<div class="agent-data-list">${[['bi-person','Total Players',players.length],['bi-activity','Active Today',active],['bi-person-plus','New Players',newPlayers],['bi-person-x','Inactive Players',inactive]].map(x=>`<div class="agent-data-row"><i class="bi ${x[0]}"></i><span>${x[1]}</span><b>${num(x[2])}</b></div>`).join('')}</div>`;
 if($('agentPerformance'))$('agentPerformance').innerHTML=`<div class="agent-performance-list">${[['Total Bet','RM '+money(bet.summary?.totalBet)],['Valid Bet','RM '+money(bet.summary?.totalValidBet)],['Customer P/L','RM '+money(-Number(bet.summary?.customerLoss||0)),Number(bet.summary?.customerLoss||0)<0?'agent-positive':'agent-negative'],['Bet Count',num(bet.summary?.betCount)],['Commission','RM '+money(d.availableCommission??Math.max(0,Number(d.agentProfit||0))),'agent-positive']].map(x=>`<div class="agent-perf-row"><span>${x[0]}</span><b class="${x[2]||''}">${x[1]}</b></div>`).join('')}</div>`;
 renderTrend(trend);
 const byId=new Map(players.map(p=>[String(p.id),p])); const tx=(ledgerData.rows||[]).slice(0,5);if($('agentRecentTransactions'))$('agentRecentTransactions').innerHTML=tx.map(x=>`<tr><td>${esc(niceType(x.ledgerType))}</td><td class="${Number(x.amount)>=0?'agent-positive':'agent-negative'}">${Number(x.amount)>=0?'+':'-'}RM ${money(Math.abs(Number(x.amount||0)))}</td><td><span class="agent-status">Completed</span></td><td>${esc(shortDateTime(x.createdAt))}</td></tr>`).join('')||'<tr><td colspan="4" class="text-muted text-center">No recent transactions.</td></tr>';
}
function sameDay(v,d){return String(v||'').slice(0,10)===d}function daysAgo(v){if(!v)return 9999;return Math.floor((Date.now()-new Date(v).getTime())/86400000)}function timeOnly(v){if(!v)return '-';try{return new Date(v).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false})}catch(e){return String(v).slice(11,16)}}function shortDateTime(v){if(!v)return '-';const d=new Date(v),now=new Date();const date=d.toDateString()===now.toDateString()?'Today':d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});return date+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false})}function niceType(v){return String(v||'Transaction').replace(/_/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase())}
function renderTrend(rows){const el=$('agentTrendChart');if(!el)return;const a=(rows||[]).map(x=>({date:x.date,value:Number(x.commission||0)}));if(!a.length){el.innerHTML='<div class="agent-chart-empty">No commission trend data.</div>';return}const w=560,h=210,left=42,right=12,top=14,bottom=34,plotW=w-left-right,plotH=h-top-bottom,maxRaw=Math.max(1,...a.map(x=>x.value)),step=maxRaw<=500?100:maxRaw<=1000?250:maxRaw<=2500?500:maxRaw<=5000?1000:Math.ceil(maxRaw/5/1000)*1000,max=Math.ceil(maxRaw/step)*step,y=v=>top+plotH-(v/max)*plotH,x=i=>left+plotW*(i/Math.max(1,a.length-1)),fmtY=v=>v>=1000?((v%1000===0?(v/1000).toFixed(0):(v/1000).toFixed(1))+'K'):String(Math.round(v)),ticks=5,grid=Array.from({length:ticks},(_,i)=>{const v=max*(ticks-1-i)/(ticks-1),yy=top+plotH*i/(ticks-1);return `<line x1="${left}" y1="${yy}" x2="${w-right}" y2="${yy}" stroke="#eef2f6" stroke-width="1"/><text x="${left-10}" y="${yy+4}" text-anchor="end" font-size="10" fill="#526175">${fmtY(v)}</text>`}).join(''),pts=a.map((v,i)=>[x(i),y(v.value)]),path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' '),area=`M${left},${top+plotH} `+pts.map(p=>`L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')+` L${w-right},${top+plotH} Z`,labelIdx=[0,Math.round((a.length-1)*.2),Math.round((a.length-1)*.4),Math.round((a.length-1)*.6),Math.round((a.length-1)*.8),a.length-1].filter((v,i,z)=>z.indexOf(v)===i),labels=labelIdx.map(i=>{const d=new Date(a[i].date+'T00:00:00'),txt=isNaN(d)?String(a[i].date).slice(5):d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});return `<text x="${x(i)}" y="${h-9}" text-anchor="middle" font-size="10" fill="#526175">${txt}</text>`}).join(''),dots=pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="2.8" fill="#D97706"/>`).join('');el.innerHTML=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="agentTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFEDD5" stop-opacity=".62"/><stop offset="100%" stop-color="#FFF7ED" stop-opacity=".08"/></linearGradient></defs><text x="2" y="11" font-size="10" fill="#526175">RM</text>${grid}<path d="${area}" fill="url(#agentTrendFill)"/><path d="${path}" fill="none" stroke="#D97706" stroke-width="2.2" vector-effect="non-scaling-stroke"/>${dots}${labels}</svg>`}

async function fetchPlayers(){playersCache=await api('/agent/players');return playersCache}
let playerPage=1,playerPageSize=10,playerTab='';
function renderPlayers(){const q=String($('agentPlayerSearch')?.value||'').toLowerCase(),vip=$('agentPlayerVip')?.value??'',status=playerTab==='new'?'':(playerTab||($('agentPlayerStatus')?.value??'')),last=$('agentPlayerLastActive')?.value||'',regFrom=$('agentPlayerFrom')?.value||'',regTo=$('agentPlayerTo')?.value||'';const baseRows=playersCache.filter(p=>{const rd=String(p.createdAt||'').slice(0,10);return(!q||[p.id,p.username,p.fullName].some(v=>String(v||'').toLowerCase().includes(q)))&&(vip===''||String(p.vipLevel??0)===vip)&&(!regFrom||rd>=regFrom)&&(!regTo||rd<=regTo)&&(last==='today'?sameDay(p.lastLoginAt,today()):(!last||daysAgo(p.lastLoginAt)<=Number(last)))});const active=baseRows.filter(p=>Number(p.status)===1).length,inactive=baseRows.filter(p=>Number(p.status)!==1).length,newCount=baseRows.filter(p=>daysAgo(p.createdAt)<=30).length;let rows=baseRows.filter(p=>status===''||String(p.status??0)===status);if(playerTab==='new')rows=baseRows.filter(p=>daysAgo(p.createdAt)<=30);if($('agentPlayerCount'))$('agentPlayerCount').textContent='('+baseRows.length+')';[['tabAllCount',baseRows.length],['tabActiveCount',active],['tabInactiveCount',inactive],['tabNewCount',newCount]].forEach(x=>{if($(x[0]))$(x[0]).textContent='('+x[1]+')'});if($('agentPlayerStats'))$('agentPlayerStats').innerHTML=[['bi-people','Total Players',baseRows.length,'Selected period'],['bi-activity','Active Players',active,'Selected period'],['bi-person-plus','New Players',newCount,'Selected period'],['bi-person-x','Inactive Players',inactive,'Selected period']].map(x=>`<div class="agent-player-stat-card"><span class="agent-stat-icon"><i class="bi ${x[0]}"></i></span><div><span>${x[1]}</span><strong>${num(x[2])}</strong><small>${x[3]}</small></div></div>`).join('');const pages=Math.max(1,Math.ceil(rows.length/playerPageSize));playerPage=Math.min(Math.max(1,playerPage),pages);const shown=rows.slice((playerPage-1)*playerPageSize,playerPage*playerPageSize);if($('agentPlayersShowing'))$('agentPlayersShowing').textContent=`Showing ${rows.length?((playerPage-1)*playerPageSize+1):0} to ${Math.min(playerPage*playerPageSize,rows.length)} of ${rows.length} players`;$('agentPlayersRows').innerHTML=shown.map(p=>{const pl=Number(p.playerPL||0);return `<tr><td>AG${String(profile.id||'').padStart(4,'0')}-${String(p.id).padStart(6,'0')}</td><td><div class="agent-player-name-cell"><b>${esc(p.username)}</b><span class="agent-vip-pill">${esc(p.vipLevelName||('VIP '+(p.vipLevel||0)))}</span></div></td><td>${Number(p.status)===1?'<span class="agent-status">● Active</span>':'<span class="agent-status inactive">● Inactive</span>'}</td><td>${esc(String(p.createdAt||'').slice(0,10)||'-')}</td><td>${esc(p.lastLoginAt?shortDateTime(p.lastLoginAt):'-')}</td><td>${esc(p.vipLevelName||('VIP '+(p.vipLevel||0)))}</td><td>RM ${money(p.totalBet)}</td><td>RM ${money(p.validBet)}</td><td class="${pl>=0?'agent-positive':'agent-negative'}">${pl>=0?'+':''}RM ${money(pl)}</td><td>RM ${money(p.commission)}</td><td><div class="agent-action-wrap"><a class="icon-action view" title="View" aria-label="View player" href="agent-player-detail.html?id=${p.id}"><i class="bi bi-eye"></i></a></div></td></tr>`}).join('')||'<tr><td colspan="11" class="text-muted text-center py-4">No players found for this filter.</td></tr>';renderPlayerPagination(pages)}
let productPage=1,productPageSize=10,productRowsCache=[],productRange={from:'',to:''};function renderProductRows(){const total=productRowsCache.length,pages=Math.max(1,Math.ceil(total/productPageSize));if(productPage>pages)productPage=pages;const start=(productPage-1)*productPageSize,rows=productRowsCache.slice(start,start+productPageSize);if($('agentProductRows'))$('agentProductRows').innerHTML=rows.map(r=>`<tr><td><b>${esc(r.providerName||r.providerCode||'-')}</b><small class="d-block text-muted">${esc(r.providerCode||'')}</small></td><td>${Number(r.status)===1?'<span class="agent-status">● Online</span>':'<span class="agent-status inactive">● Maintenance</span>'}</td><td>${num(r.games)}</td><td>${num(r.players)}</td><td>RM ${money(r.totalBet)}</td><td>RM ${money(r.validBet)}</td><td>${plHtml(r.playerPL)}</td></tr>`).join('')||'<tr><td colspan="7" class="table-empty">No provider activity for this period.</td></tr>';if($('agentProductsShowing'))$('agentProductsShowing').textContent=`Showing ${total?start+1:0} to ${Math.min(start+productPageSize,total)} of ${total} providers`;renderProductPagination(pages)}function renderProductPagination(pages){const el=$('agentProductPagination');if(!el)return;let html=`<button ${productPage<=1?'disabled':''} data-page="1" title="First page"><i class="bi bi-chevron-double-left"></i></button>`+`<button ${productPage<=1?'disabled':''} data-page="${productPage-1}" title="Previous page"><i class="bi bi-chevron-left"></i></button>`;for(let i=1;i<=pages;i++){if(pages>7&&i>2&&i<pages-1&&Math.abs(i-productPage)>1){if(i===3)html+='<button disabled>...</button>';continue}html+=`<button class="${i===productPage?'active':''}" data-page="${i}">${i}</button>`}html+=`<button ${productPage>=pages?'disabled':''} data-page="${productPage+1}" title="Next page"><i class="bi bi-chevron-right"></i></button>`+`<button ${productPage>=pages?'disabled':''} data-page="${pages}" title="Last page"><i class="bi bi-chevron-double-right"></i></button>`;el.innerHTML=html;el.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{productPage=Number(b.dataset.page);renderProductRows()})}function renderPlayerPagination(pages){const el=$('agentPlayerPagination');if(!el)return;let html=`<button ${playerPage<=1?'disabled':''} data-page="1" title="First page"><i class="bi bi-chevron-double-left"></i></button>`+`<button ${playerPage<=1?'disabled':''} data-page="${playerPage-1}" title="Previous page"><i class="bi bi-chevron-left"></i></button>`;for(let i=1;i<=pages;i++){if(pages>7&&i>2&&i<pages-1&&Math.abs(i-playerPage)>1){if(i===3)html+='<button disabled>...</button>';continue}html+=`<button class="${i===playerPage?'active':''}" data-page="${i}">${i}</button>`}html+=`<button ${playerPage>=pages?'disabled':''} data-page="${playerPage+1}" title="Next page"><i class="bi bi-chevron-right"></i></button>`+`<button ${playerPage>=pages?'disabled':''} data-page="${pages}" title="Last page"><i class="bi bi-chevron-double-right"></i></button>`;el.innerHTML=html;el.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{playerPage=Number(b.dataset.page);renderPlayers()})}
function initVipFilter(){const s=$('agentPlayerVip');if(!s)return;const vals=[...new Map(playersCache.map(p=>[String(p.vipLevel??0),p.vipLevelName||('VIP '+(p.vipLevel||0))])).entries()].sort((a,b)=>Number(a[0])-Number(b[0]));s.innerHTML='<option value="">All VIP</option>'+vals.map(x=>`<option value="${esc(x[0])}">${esc(x[1])}</option>`).join('')}
function exportPlayersCsv(){const head=['Player ID','Username','Name','Status','VIP Tier','Registered','Last Active','Total Bet','Valid Bet','P/L','Commission'];const lines=[head,...playersCache.map(p=>[p.id,p.username,p.fullName,Number(p.status)===1?'Active':'Inactive',p.vipLevelName||('VIP '+(p.vipLevel||0)),p.createdAt,p.lastLoginAt,p.totalBet,p.validBet,p.playerPL,p.commission])].map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(','));const blob=new Blob([lines.join('\n')],{type:'text/csv'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='agent-players-'+today()+'.csv';a.click();URL.revokeObjectURL(a.href)}
async function loadPlayerDetail(){const id=new URLSearchParams(location.search).get('id');if(!id)throw Error('Player ID is missing');const d=await api('/agent/players/'+encodeURIComponent(id)+'/detail'),p=d.player||{},s=d.summary||{},tags=d.tags||[];if($('agentPlayerIdentity'))$('agentPlayerIdentity').innerHTML=`<div class="agent-id-main"><div class="agent-player-avatar"><i class="bi bi-person-fill"></i></div><div><div class="agent-id-name"><h2>${esc(p.username||'-')}</h2>${Number(p.status)===1?'<span class="agent-status">● Active</span>':'<span class="agent-status inactive">● Inactive</span>'}</div><div class="agent-id-meta"><div><span>Player ID</span><b>AG${String(profile.id||'').padStart(4,'0')}-${String(p.id).padStart(6,'0')}</b></div><div><span>Registered</span><b>${esc(String(p.createdAt||'').slice(0,10)||'-')}</b></div><div><span>VIP Level</span><b>${esc(p.vipLevelName||('VIP '+(p.vipLevel||0)))}</b></div><div><span>Last Active</span><b>${esc(p.lastLoginAt?shortDateTime(p.lastLoginAt):'-')}</b></div></div></div></div><div class="agent-contact-list"><div><span>Phone</span><b>${esc(p.mobile||'-')}</b></div><div><span>Player Name</span><b>${esc(p.fullName||'-')}</b></div><div><span>KYC Status</span><b>${esc(p.kycStatus||'-')}</b></div></div><div class="agent-tags-inline"><h3>Player Tags</h3><div class="agent-tags">${tags.map(x=>`<span class="agent-tag"><i class="bi bi-tag"></i>${esc(x)}</span>`).join('')||'<span class="text-muted small">No tags</span>'}</div></div>`;if($('agentDetailSummary'))$('agentDetailSummary').innerHTML=[['bi-cash-stack','Total Bet',s.totalBet],['bi-check2-circle','Valid Bet',s.validBet],['bi-trophy','Total Win',s.totalWin],['bi-graph-up-arrow','Player P/L',s.playerPL],['bi-cash-coin','Commission',s.commission]].map((x,i)=>`<div class="agent-summary-card"><span class="agent-summary-icon"><i class="bi ${x[0]}"></i></span><div><span>${x[1]}</span><strong class="${i===3?(Number(x[2])>=0?'agent-positive':'agent-negative'):''}">RM ${money(x[2])}</strong></div></div>`).join('');if($('agentFavoriteGames'))$('agentFavoriteGames').innerHTML=(d.favoriteGames||[]).map(x=>`<tr><td>${esc(x.gameName||x.gameCode||'-')}</td><td>${esc(x.providerCode||'-')}</td><td>${esc(x.category||'-')}</td><td>RM ${money(x.totalBet)}</td><td class="${Number(x.playerPL)>=0?'agent-positive':'agent-negative'}">${Number(x.playerPL)>=0?'+':''}RM ${money(x.playerPL)}</td></tr>`).join('')||'<tr><td colspan="5" class="text-muted text-center">No game data.</td></tr>';if($('agentPlayerInformation'))$('agentPlayerInformation').innerHTML=[['Registration IP',p.registrationIp],['Last Login IP',p.lastLoginIp],['Registration Channel',p.marketingSource||p.registrationDomain||('Referral ('+(profile.code||'Agent')+')')],['KYC Status',p.kycStatus],['Risk Status',p.riskStatus]].map(x=>`<div class="agent-info-row"><span>${x[0]}</span><b>${esc(x[1]||'-')}</b></div>`).join('');if($('agentPlayerTags'))$('agentPlayerTags').innerHTML=tags.map(x=>`<span class="agent-tag"><i class="bi bi-tag"></i>${esc(x)}</span>`).join('')||'<span class="text-muted small">No tags</span>';window.__agentDetail=d;renderDetailTab('overview');document.querySelectorAll('[data-detail-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-detail-tab]').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderDetailTab(b.dataset.detailTab)})}
function renderDetailTab(tab){const el=$('agentDetailTabContent'),d=window.__agentDetail||{};if(!el)return;if(tab==='overview'){const rows=(d.recentBets||[]).slice(0,6);el.innerHTML=`<div class="agent-panel-title"><h2>Recent Bet Activity</h2></div>${detailBetTable(rows)}`}else if(tab==='bets')el.innerHTML=detailBetTable(d.recentBets||[]);else{const rows=d.transactions||[];el.innerHTML=`<div class="table-wrap"><table class="agent-detail-table"><thead><tr><th>Time</th><th>Type</th><th>Amount</th><th>Before</th><th>After</th><th>Reference</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(shortDateTime(x.createdAt))}</td><td>${esc(niceType(x.ledgerType))}</td><td class="${Number(x.amount)>=0?'agent-positive':'agent-negative'}">RM ${money(x.amount)}</td><td>RM ${money(x.beforeBalance)}</td><td>RM ${money(x.afterBalance)}</td><td>${esc(x.referenceNo||'-')}</td></tr>`).join('')||'<tr><td colspan="6" class="text-muted text-center">No transactions.</td></tr>'}</tbody></table></div>`}}
function detailBetTable(rows){return `<div class="table-wrap"><table class="agent-detail-table"><thead><tr><th>Time</th><th>Provider</th><th>Game</th><th>Bet</th><th>Valid Bet</th><th>Win</th><th>P/L</th><th>Status</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(shortDateTime(x.settlementAt))}</td><td>${esc(x.providerCode||'-')}</td><td>${esc(x.gameCode||'-')}</td><td>RM ${money(x.betAmount)}</td><td>RM ${money(x.validBetAmount)}</td><td>RM ${money(x.winAmount)}</td><td class="${Number(x.playerPL)>=0?'agent-positive':'agent-negative'}">RM ${money(x.playerPL)}</td><td><span class="agent-status">${esc(x.status||'Completed')}</span></td></tr>`).join('')||'<tr><td colspan="8" class="text-muted text-center">No bet history.</td></tr>'}</tbody></table></div>`}

let betPage=0,betTotalPages=0;async function initBetPlayers(){loadBetAllTimeTiles();const ps=playersCache.length?playersCache:await fetchPlayers();$('agentBetPlayer').innerHTML='<option value="">All My Players</option>'+ps.map(p=>`<option value="${p.id}">${esc(p.username)} (#${p.id})</option>`).join('')}
/* The bet-report strip is all time (owner: 带有卡片的 total 显示所有 不会被 date Range 和 Entry 影响).
   Same endpoint without from/to; the page's other filters stay, and the table keeps the date range. */
async function loadBetAllTimeTiles(){
  const el=$('agentBetMetrics'); if(!el) return;
  try{
    const qs=new URLSearchParams();
    [['memberId','agentBetPlayer'],['providerCode','agentBetProvider'],['gameCode','agentBetGame'],['eventType','agentBetEvent']]
      .forEach(function(pair){ const v=$(pair[1])?.value?.trim(); if(v) qs.set(pair[0], v); });
    const d=await api('/agent/bet-report?'+qs);
    const sm=d.summary||{};
    el.innerHTML=[metric('Total Bet',money(sm.totalBet)),metric('Valid Bet',money(sm.totalValidBet)),metric('Total Win',money(sm.totalWin)),metric('Customer Loss',money(sm.customerLoss)),metric('Bet Count',num(sm.betCount))].join('');
  }catch(e){/* leave the strip rather than show a partial total */}
}
let agentBetLoadSeq=0;async function loadBetReport(){const loadSeq=++agentBetLoadSeq;const[from,to]=ensureRange('agentBetFrom','agentBetTo'),qs=new URLSearchParams({page:String(betPage),size:'20',from,to});[['memberId','agentBetPlayer'],['providerCode','agentBetProvider'],['gameCode','agentBetGame'],['eventType','agentBetEvent']].forEach(([k,id])=>{const v=$(id)?.value?.trim();if(v)qs.set(k,v)});const d=await api('/agent/bet-report?'+qs);if(loadSeq!==agentBetLoadSeq)return;betTotalPages=Number(d.totalPages||0);/* Tiles are all time - painted by loadBetAllTimeTiles(). */$('agentBetRows').innerHTML=(d.rows||[]).map(r=>`<tr><td>${esc(String(r.settlementAt||'').replace('T',' ').slice(0,19))}</td><td><b>${esc(r.username)}</b></td><td>${esc(r.providerCode)}</td><td>${esc(r.gameCode)}</td><td>${money(r.betAmount)}</td><td>${money(r.validBetAmount)}</td><td>${money(r.winAmount)}</td><td class="${Number(r.customerLoss)<0?'agent-negative':'agent-positive'}">${money(r.customerLoss)}</td><td>${esc(r.eventType)}</td><td>${esc(r.status)}</td></tr>`).join('')||'<tr><td colspan="10" class="table-empty">No bet records.</td></tr>';$('agentBetShowing').textContent=`Showing page ${Number(d.page||0)+1} of ${Math.max(1,betTotalPages)} · ${num(d.totalElements)} records`;$('agentBetPrev').disabled=betPage<=0;$('agentBetNext').disabled=betPage>=betTotalPages-1;}
let agentBankAccounts=[];
function maskBankNumber(v){const s=String(v||'').replace(/\s+/g,'');if(!s)return '';return (s.length<=4?'**** ':('*'.repeat(Math.max(4,s.length-4))+' '))+s.slice(-4)}
function selectedBankAccount(){const id=Number($('agentPayoutAccount')?.value||0);return agentBankAccounts.find(x=>Number(x.id)===id)||agentBankAccounts.find(x=>Number(x.isDefault)===1)||agentBankAccounts[0]||null}
function renderBankAccounts(){
 const sel=$('agentPayoutAccount');if(sel){const current=sel.value;sel.innerHTML='<option value="">Select bank account</option>'+agentBankAccounts.map(x=>`<option value="${x.id}">${esc(x.bankName)} · ${maskBankNumber(x.accountNumber)}</option>`).join('');const preferred=agentBankAccounts.find(x=>Number(x.isDefault)===1)||agentBankAccounts[0];sel.value=(agentBankAccounts.some(x=>String(x.id)===String(current))?current:(preferred?.id||''));}
 const a=selectedBankAccount();if($('withdrawBankName'))$('withdrawBankName').textContent=a?.bankName||'No bank account';if($('withdrawAccountDetail'))$('withdrawAccountDetail').textContent=a?(maskBankNumber(a.accountNumber)+' · '+(a.accountHolder||'')):'Add a bank account before submitting a withdrawal.';
 const list=$('agentBankAccountList');if(list)list.innerHTML=agentBankAccounts.map(x=>`<div class="agent-bank-account-item"><span class="agent-bank-icon"><i class="bi bi-bank"></i></span><div class="bank-main"><b>${esc(x.bankName||'-')} ${Number(x.isDefault)===1?'<span class="agent-bank-badge">Default</span>':''}</b><span>${esc(x.accountHolder||'-')} · ${esc(maskBankNumber(x.accountNumber))}</span></div><div class="agent-bank-actions"><button type="button" data-bank-edit="${x.id}">Edit</button><button type="button" class="danger" data-bank-delete="${x.id}">Delete</button></div></div>`).join('')||'<div class="table-empty">No bank accounts yet.</div>';
 document.querySelectorAll('[data-bank-edit]').forEach(b=>b.onclick=()=>editBankAccount(Number(b.dataset.bankEdit)));document.querySelectorAll('[data-bank-delete]').forEach(b=>b.onclick=()=>deleteBankAccount(Number(b.dataset.bankDelete)));
}
async function loadBankAccounts(){try{agentBankAccounts=await api('/agent/payout-accounts')||[];}catch(e){agentBankAccounts=[];}renderBankAccounts()}
function openBankModal(){if($('agentBankModal'))$('agentBankModal').hidden=false;renderBankAccounts()}function closeBankModal(){if($('agentBankModal'))$('agentBankModal').hidden=true}
function clearBankForm(){if($('agentBankAccountId'))$('agentBankAccountId').value='';if($('agentBankName'))$('agentBankName').value='';if($('agentBankHolder'))$('agentBankHolder').value='';if($('agentBankNumber'))$('agentBankNumber').value='';if($('agentBankDefault'))$('agentBankDefault').checked=agentBankAccounts.length===0;if($('agentBankFormStatus'))$('agentBankFormStatus').textContent=''}
function editBankAccount(id){const x=agentBankAccounts.find(a=>Number(a.id)===Number(id));if(!x)return;openBankModal();$('agentBankAccountId').value=x.id;$('agentBankName').value=x.bankName||'';$('agentBankHolder').value=x.accountHolder||'';$('agentBankNumber').value=x.accountNumber||'';$('agentBankDefault').checked=Number(x.isDefault)===1}
async function saveBankAccount(e){e.preventDefault();const id=Number($('agentBankAccountId').value||0),body={bankName:$('agentBankName').value.trim(),accountHolder:$('agentBankHolder').value.trim(),accountNumber:$('agentBankNumber').value.trim(),isDefault:$('agentBankDefault').checked?1:0};if(!body.bankName||!body.accountHolder||!body.accountNumber)return dialog.alert('Bank name, account holder and account number are required.',{title:'Bank Account Required',type:'error'});try{$('agentBankFormStatus').textContent='Saving...';await api('/agent/payout-accounts'+(id?'/'+id:''),{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});await loadBankAccounts();clearBankForm();$('agentBankFormStatus').textContent='Bank account saved.';}catch(e){$('agentBankFormStatus').textContent=e.message}}
async function deleteBankAccount(id){const ok=await dialog.confirm('Delete this bank account?',{title:'Delete Bank Account',confirmText:'Delete'});if(!ok)return;try{await api('/agent/payout-accounts/'+id,{method:'DELETE'});await loadBankAccounts();clearBankForm()}catch(e){await dialog.alert(e.message,{title:'Delete Failed',type:'error'})}}
async function loadSettlement(){
 const[from,to]=ensureRange('agentSettlementFrom','agentSettlementTo');
 const d=await api('/agent/settlement/report?'+new URLSearchParams({from,to}));
 lastSettlementReport=d;
 if(d.kpiPeriodFrom&&$('agentSettlementFrom'))$('agentSettlementFrom').value=d.kpiPeriodFrom;
 if(d.kpiPeriodTo&&$('agentSettlementTo'))$('agentSettlementTo').value=d.kpiPeriodTo;
 const min=Number(profile.minimumSettlementAmount||0),available=Math.max(0,Number(d.availableCommission??d.agentProfit??0));
 const redShare=Number(d.redShareEnabled||profile.redShareEnabled)===1,lossCarryOut=Number(d.redShareLossCarryOut||0),lossClose=redShare&&available<=0&&lossCarryOut<0;
 settlementsCache=await api('/agent/settlements')||[];
 const pending=settlementsCache.filter(x=>['PENDING','APPROVED'].includes(String(x.settlementStatus||'').toUpperCase())).reduce((a,x)=>a+Number(x.requestedAmount??Math.max(0,Number(x.agentProfit||0))),0);const remaining=Math.max(0,available-pending);
 const rm=v=>'RM '+money(v||0);
 if($('withdrawAvailable'))$('withdrawAvailable').textContent=rm(available);
 if($('withdrawWithdrawable'))$('withdrawWithdrawable').textContent=rm(remaining);
 if($('withdrawFee'))$('withdrawFee').textContent=rm(0);
 if($('withdrawDailyLimit'))$('withdrawDailyLimit').textContent=rm(remaining)+' / —';
 if($('withdrawPending'))$('withdrawPending').textContent=rm(pending);
 if($('limitAvailable'))$('limitAvailable').textContent=rm(available);
 if($('limitPending'))$('limitPending').textContent=rm(pending);
 if($('limitRemaining'))$('limitRemaining').textContent=rm(remaining);
 if($('limitMinimum'))$('limitMinimum').textContent=rm(min);
 if($('withdrawMinNote'))$('withdrawMinNote').textContent='Minimum withdraw amount is '+rm(min)+'.';
 if($('agentSettlementMin'))$('agentSettlementMin').textContent=money(min);
 if($('agentSettlementMax'))$('agentSettlementMax').textContent=money(remaining);
 if($('agentSettlementAmount')){$('agentSettlementAmount').min=String(Math.max(.01,min));$('agentSettlementAmount').max=String(remaining);$('agentSettlementAmount').disabled=false;}
 if($('agentSettlementSubmit')){$('agentSettlementSubmit').disabled=!lossClose&&(remaining<=0||remaining<min);$('agentSettlementSubmit').textContent=lossClose?'Submit Red Share Loss Carry':'Submit Withdraw Request';}
 if($('agentSettlementKpiBasis'))$('agentSettlementKpiBasis').textContent='KPI Cycle: '+String(d.kpiPeriod||profile.kpiPeriod||'MONTHLY');
 if($('agentSettlementAchieved'))$('agentSettlementAchieved').textContent=money(d.kpiAchieved)+' achieved';
 if($('agentSettlementTarget'))$('agentSettlementTarget').textContent=money(d.kpiTarget)+' target';
 if($('agentSettlementBar'))$('agentSettlementBar').style.width=Math.max(0,Math.min(100,Number(d.kpiProgressPercent||0)))+'%';
 if($('agentSettlementShortfall'))$('agentSettlementShortfall').textContent='Remaining KPI: '+money(d.kpiShortfall);
 renderWithdrawHistory();
 updateWithdrawSummary();
}
function updateWithdrawSummary(){const amount=Math.max(0,Number($('agentSettlementAmount')?.value||0)),fee=0,receive=Math.max(0,amount-fee);if($('summaryAmount'))$('summaryAmount').textContent='RM '+money(amount);if($('summaryFee'))$('summaryFee').textContent='- RM '+money(fee);if($('summaryReceive'))$('summaryReceive').textContent='RM '+money(receive);}
function renderWithdrawHistory(){const from=$('agentSettlementFrom')?.value||'',to=$('agentSettlementTo')?.value||'',status=String($('withdrawHistoryStatus')?.value||'').toUpperCase();const rows=(settlementsCache||[]).filter(x=>{const a=String(x.periodFrom||((x.settlementMonth||'')+'-01')),b=String(x.periodTo||((x.settlementMonth||'')+'-31')),st=String(x.settlementStatus||'').toUpperCase();return(!from||b>=from)&&(!to||a<=to)&&(!status||st===status)});if($('agentSettlementRows'))$('agentSettlementRows').innerHTML=rows.map(x=>{const requested=Number(x.requestedAmount??Math.max(0,Number(x.agentProfit||0))),created=String(x.createdAt||x.requestedAt||x.periodTo||'').replace('T',' ').slice(0,16),st=String(x.settlementStatus||'');return `<tr><td><b>#${esc(x.id??'-')}</b></td><td>${esc(created||'-')}</td><td><i class="bi bi-bank me-1"></i> Agent Commission Payout</td><td>${money(requested)}</td><td>0.00</td><td>${money(requested)}</td><td>${statusPill(st)}</td><td>${esc(x.remark||'-')}</td><td>${esc(x.paymentReference||'-')}</td></tr>`}).join('')||'<tr><td colspan="9" class="table-empty">No withdrawal history for this period.</td></tr>';if($('withdrawHistoryShowing'))$('withdrawHistoryShowing').textContent=rows.length?`Showing 1 to ${rows.length} of ${rows.length} records`:'Showing 0 to 0 of 0 records';}
async function submitSettlement(){const[from,to]=ensureRange('agentSettlementFrom','agentSettlementTo'),grossMax=Number(lastSettlementReport?.availableCommission??lastSettlementReport?.agentProfit??0),pending=(settlementsCache||[]).filter(x=>['PENDING','APPROVED'].includes(String(x.settlementStatus||'').toUpperCase())).reduce((a,x)=>a+Number(x.requestedAmount||0),0),max=Math.max(0,grossMax-pending),min=Number(profile.minimumSettlementAmount||0),redShare=Number(lastSettlementReport?.redShareEnabled||profile.redShareEnabled)===1,lossCarryOut=Number(lastSettlementReport?.redShareLossCarryOut||0),lossClose=redShare&&max<=0&&lossCarryOut<0,amount=lossClose?0:Number($('agentSettlementAmount').value||0);if(!lossClose&&(!amount||amount<=0))return dialog.alert('Please enter a settlement / withdrawal amount greater than 0.',{title:'Amount Required',type:'error'});if(!lossClose&&min>0&&amount<min)return dialog.alert('Minimum settlement amount is MYR '+money(min)+'.',{title:'Below Minimum Settlement',type:'error'});if(amount>max)return dialog.alert('Requested amount cannot exceed your available Agent Commission of MYR '+money(max)+'.',{title:'Amount Exceeds Commission',type:'error'});const prompt=lossClose?`Close ${from} to ${to} with Red Share loss carry MYR ${money(lossCarryOut)}? No withdrawal will be created.`:`Submit MYR ${money(amount)} settlement / withdrawal request for ${from} to ${to}?`;const bank=selectedBankAccount();if(!lossClose&&!bank)return dialog.alert('Please add and select a bank account before submitting a withdrawal.',{title:'Bank Account Required',type:'error'});const ok=await dialog.confirm(prompt,{title:lossClose?'Confirm Red Share Loss Carry':'Confirm Settlement / Withdrawal',confirmText:lossClose?'Submit Loss Carry':'Submit Request'});if(!ok)return;try{$('agentSettlementSubmit').disabled=true;$('agentSettlementMsg').textContent='Submitting...';await api('/agent/settlement/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({from,to,amount,bankAccountId:bank?.id||null,remark:$('withdrawRemark')?.value?.trim()||null})});$('agentSettlementAmount').value='';$('agentSettlementMsg').textContent=lossClose?'Submitted. Waiting for BO approval to carry the Red Share loss.':'Submitted. Waiting for BO approval and payout.';await dialog.alert(lossClose?'Red Share loss carry submitted successfully.':'Settlement / withdrawal request submitted successfully.',{title:'Request Submitted',type:'success'});await loadSettlement();}catch(e){$('agentSettlementMsg').textContent=e.message;await dialog.alert(e.message,{title:'Settlement Failed',type:'error'});}finally{const gross=Number(lastSettlementReport?.availableCommission??lastSettlementReport?.agentProfit??0),pending=(settlementsCache||[]).filter(x=>['PENDING','APPROVED'].includes(String(x.settlementStatus||'').toUpperCase())).reduce((a,x)=>a+Number(x.requestedAmount||0),0),remaining=Math.max(0,gross-pending),min=Number(profile.minimumSettlementAmount||0),redShare=Number(lastSettlementReport?.redShareEnabled||profile.redShareEnabled)===1,lossCarryOut=Number(lastSettlementReport?.redShareLossCarryOut||0),lossClose=redShare&&remaining<=0&&lossCarryOut<0;if($('agentSettlementSubmit')){$('agentSettlementSubmit').disabled=!lossClose&&(remaining<=0||remaining<min);$('agentSettlementSubmit').textContent=lossClose?'Submit Red Share Loss Carry':'Submit Withdraw Request';}}}
async function fetchWallet(){const d=await api('/agent/ledger');walletCache=d.rows||[];$('agentWalletMetrics').innerHTML=metric('Current Wallet Balance',money(d.balance),'Available Agent Wallet balance');return d}
function renderWallet(){const[from,to]=ensureRange('agentWalletFrom','agentWalletTo'),type=$('agentWalletType')?.value||'',q=String($('agentWalletKeyword')?.value||'').toLowerCase();const rows=walletCache.filter(x=>Number(x.amount||0)!==0&&inDateRange(x.createdAt,from,to)&&(!type||String(x.ledgerType||'')===type)&&(!q||[x.referenceType,x.referenceId,x.remark].some(v=>String(v||'').toLowerCase().includes(q))));$('agentWalletShowing').textContent=`Showing ${rows.length} of ${walletCache.length} entries`;$('agentLedgerRows').innerHTML=rows.map(x=>`<tr><td>${esc(String(x.createdAt||'').replace('T',' ').slice(0,19))}</td><td>${esc(x.ledgerType)}</td><td class="${Number(x.amount)<0?'agent-negative':'agent-positive'}">${money(x.amount)}</td><td>${money(x.balanceBefore)}</td><td>${money(x.balanceAfter)}</td><td>${esc((x.referenceType||'')+(x.referenceId?' #'+x.referenceId:''))}</td><td>${esc(x.remark)}</td></tr>`).join('')||'<tr><td colspan="7" class="table-empty">No wallet entries for this filter.</td></tr>';}

function daterange(fromId,toId){return ensureRange(fromId,toId)}
function plHtml(v){const n=Number(v||0);return `<span class="${n>=0?'agent-positive':'agent-negative'}">${n>=0?'+':''}RM ${money(n)}</span>`}
async function loadProducts(){/* read the two fields directly instead of daterange(): that helper is ensureRange(), which fills in today whenever the range is empty - the opposite of what this page needs, since an empty range here means all time. */const _pf=$('agentProductFrom'),_pt=$('agentProductTo'),from=_pf?_pf.value:'',to=_pt?_pt.value:'',q=String($('agentProductSearch')?.value||'').trim();/* the range starts empty and means "all time": omitting it is what keeps the page's numbers independent of a date range until one is chosen. The status filter was removed from the page, so it is not sent either. *//* An empty range means ALL TIME, and the endpoint has to be told a range it can act on: a request with the dates omitted came back with nothing on the live API. So the empty state is sent as the widest range instead - the control still reads "Select date range" and the user's own range, once picked, is passed through unchanged. */const _pq=new URLSearchParams({q});_pq.set('from',from||'2000-01-01');_pq.set('to',to||today());const d=await api('/agent/products?'+_pq);const rows=(d.rows||[]).filter(r=>Number(r.games||0)>0||Number(r.players||0)>0||Number(r.totalBet||0)!==0||Number(r.validBet||0)!==0||Number(r.playerPL||0)!==0);const summary={providers:rows.length,games:rows.reduce((a,r)=>a+Number(r.games||0),0),players:rows.reduce((a,r)=>a+Number(r.players||0),0),totalBet:rows.reduce((a,r)=>a+Number(r.totalBet||0),0)};if($('agentProductMetrics'))$('agentProductMetrics').innerHTML=[['bi-box','Total Providers',summary.providers],['bi-controller','Total Games',summary.games],['bi-people','Players',summary.players],['bi-cash-stack','Total Bet','RM '+money(summary.totalBet)]].map(x=>`<div class="agent-player-stat-card"><span class="agent-stat-icon"><i class="bi ${x[0]}"></i></span><div><span>${x[1]}</span><strong>${esc(x[2])}</strong><small>Selected period</small></div></div>`).join('');/* paging is client side, exactly like the players list: the fetch keeps filling productRowsCache and this renders the current slice. The detail link gets the range actually in effect (the resolved one), not the raw field - an empty field means the all-time range sent to the API. */const _pfrom=from||'2000-01-01',_pto=to||today();productRange={from:_pfrom,to:_pto};productRowsCache=rows;productPage=1;renderProductRows();}
async function loadProviderDetail(){const sp=new URLSearchParams(location.search),provider=sp.get('provider')||'',from=sp.get('from')||today(),to=sp.get('to')||today();if($('agentProviderTitle'))$('agentProviderTitle').textContent=provider||'Provider';if($('agentProviderRange'))$('agentProviderRange').textContent=from+' - '+to;const d=await api('/agent/products/'+encodeURIComponent(provider)+'/players?'+new URLSearchParams({from,to}));if($('agentProviderPlayerRows')){const rows=(d.rows||[]).filter(r=>Number(r.games||0)>0||Number(r.totalBet||0)!==0||Number(r.validBet||0)!==0||Number(r.playerPL||0)!==0);$('agentProviderPlayerRows').innerHTML=rows.map(r=>`<tr><td><b>${esc(r.username)}</b></td><td>${num(r.games)}</td><td>${r.gameNames?.map(g=>`<span class="agent-game-chip">${esc(g)}</span>`).join(' ')||'-'}</td><td>RM ${money(r.totalBet)}</td><td>RM ${money(r.validBet)}</td><td>${plHtml(r.playerPL)}</td></tr>`).join('')||'<tr><td colspan="6" class="table-empty">No players for this provider and period.</td></tr>';} }
let reportTab='players',reportPage=1,providerPage=1,reportPageSize=10,providerPageSize=10,reportRange={from:'',to:''};
/* Paging reads the DOM the existing render produced: one page unit is a row plus, in the players pane, the
   expandable detail row that belongs to it. Detail rows always stay collapsed while paging. */
function pagePane(paneId,pagerId,showingId,label,page,size,onPage){
  const rerun=onPage||renderReportPanes;
  /* selectors are used directly rather than $() - $() is an id lookup that would not accept a '#id' */
  const pane=document.querySelector(paneId);if(!pane)return 1;const tbody=pane.querySelector('tbody');if(!tbody)return 1;
  const kids=Array.prototype.slice.call(tbody.children);
  if(kids.length===1&&kids[0].querySelector('td[colspan]')){
    const e0=document.querySelector(pagerId);if(e0)e0.innerHTML='';const s0=document.querySelector(showingId);if(s0)s0.textContent='Showing 0 to 0 of 0 '+label;return 1;}
  const units=[];let cur=null;
  kids.forEach(function(tr){if(tr.classList.contains('agent-report-detail-row')){if(cur)cur.push(tr);}
    else{cur=[tr];units.push(cur);}});
  const total=units.length,pages=Math.max(1,Math.ceil(total/size)),use=Math.min(Math.max(1,page),pages),start=(use-1)*size;
  units.forEach(function(unit,i){const show=i>=start&&i<start+size;unit.forEach(function(tr){
    if(tr.classList.contains('agent-report-detail-row')){tr.hidden=true;}else{tr.hidden=!show;}})});
  const el=document.querySelector(pagerId);
  if(el){let html='<button '+(use<=1?'disabled':'')+' data-page="1" title="First page"><i class="bi bi-chevron-double-left"></i></button>'
    +'<button '+(use<=1?'disabled':'')+' data-page="'+(use-1)+'" title="Previous page"><i class="bi bi-chevron-left"></i></button>';
    for(let i=1;i<=pages;i++){if(pages>7&&i>2&&i<pages-1&&Math.abs(i-use)>1){if(i===3)html+='<button disabled>...</button>';continue;}
      html+='<button class="'+(i===use?'active':'')+'" data-page="'+i+'">'+i+'</button>';}
    html+='<button '+(use>=pages?'disabled':'')+' data-page="'+(use+1)+'" title="Next page"><i class="bi bi-chevron-right"></i></button>';
    html+='<button '+(use>=pages?'disabled':'')+' data-page="'+pages+'" title="Last page"><i class="bi bi-chevron-double-right"></i></button>';
    el.innerHTML=html;el.querySelectorAll('[data-page]').forEach(function(b){b.onclick=function(){
      if(paneId==='#agentReportPaneProviders'){providerPage=Number(b.dataset.page);}else{reportPage=Number(b.dataset.page);}
      rerun();}});}
  const sh=document.querySelector(showingId);if(sh)sh.textContent='Showing '+(total?start+1:0)+' to '+Math.min(start+size,total)+' of '+total+' '+label;
  return pages;}
let gameReportPage=1,gameReportSize=10;
function renderGameReportPaging(){return pagePane('.table-card','#agentGameReportPagination','#agentGameReportShowing','games',gameReportPage,gameReportSize,renderGameReportPaging)}
function renderReportPanes(){
  if(reportTab==='providers')pagePane('#agentReportPaneProviders','#agentReportPagination','#agentReportsShowing','providers',providerPage,providerPageSize);
  else pagePane('#agentReportPanePlayers','#agentReportPagination','#agentReportsShowing','players',reportPage,reportPageSize);}
function showReportTab(name){reportTab=name;
  const pl=$('agentReportPanePlayers'),pv=$('agentReportPaneProviders');
  if(pl)pl.hidden=name!=='players';if(pv)pv.hidden=name!=='providers';
  document.querySelectorAll('#agentReportTabs button').forEach(function(b){b.classList.toggle('active',b.dataset.reportTab===name);});
  renderReportPanes();}
async function loadReports(){ /* the range fields are read directly and an empty range is sent as the widest one - the convention the products page uses; daterange() would fill in today instead. */
  const _rf=$('agentReportFrom'),_rt=$('agentReportTo'),from=(_rf&&_rf.value)?_rf.value:'2000-01-01',to=(_rt&&_rt.value)?_rt.value:today(),
        player=String($('agentReportPlayerSearch')?.value||'').trim(),
        provider=String($('agentReportProvider')?.value||'').trim(),
        game=String($('agentReportGame')?.value||'').trim();
  const qs=new URLSearchParams({from,to,player,provider,game});
  reportRange={from,to};const d=await api('/agent/reports/players?'+qs);
  if($('agentReportMetrics')){
    $('agentReportMetrics').innerHTML=[
      metric('Total Bet','RM '+money(d.summary?.totalBet||0),'Selected period'),
      metric('Valid Bet','RM '+money(d.summary?.validBet||0),'Selected period'),
      metric('Total Win','RM '+money(d.summary?.totalWin||0),'Selected period'),
      metric('Customer P/L','RM '+money(d.summary?.playerPL||0),'Selected period'),
      metric('Bet Count',num(d.summary?.betCount||0),'Selected period')
    ].join('');
  }
  if($('agentReportRows')){
    const reportRows=(d.rows||[]).filter(r=>Number(r.totalBet||0)!==0||Number(r.validBet||0)!==0||Number(r.totalWin||0)!==0||Number(r.playerPL||0)!==0||Number(r.providerCount||0)>0||Number(r.gameCount||0)>0||Number(r.betCount||0)>0);$('agentReportRows').innerHTML=reportRows.map(r=>`<tr>
      <td>${esc(r.fullName||r.username||'-')}</td>
      <td>RM ${money(r.totalBet)}</td>
      <td>RM ${money(r.validBet)}</td>
      <td>RM ${money(r.totalWin)}</td>
      <td>${plHtml(r.playerPL)}</td>
      <td>${num(r.providerCount)}</td>
      <td>${num(r.gameCount)}</td>
      <td class="text-center"><a class="icon-action view" title="View report" aria-label="View report" href="agent-player-game-report.html?id=${encodeURIComponent(r.memberId||'')}&from=${encodeURIComponent(reportRange.from)}&to=${encodeURIComponent(reportRange.to)}"><i class="bi bi-eye"></i></a></td>`).join('')||'<tr><td colspan="8" class="table-empty">No player betting data for this period.</td></tr>';
  }
  document.querySelectorAll('[data-report-expand]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.reportExpand,row=$('reportDetail'+id),opening=row.hidden;
    document.querySelectorAll('.agent-report-detail-row').forEach(x=>x.hidden=true);
    document.querySelectorAll('[data-report-expand] i').forEach(i=>i.className='bi bi-chevron-down');
    if(!opening)return;
    row.hidden=false;b.querySelector('i').className='bi bi-chevron-up';
    const detail=await api('/agent/reports/player/'+id+'/games?'+new URLSearchParams({from,to}));
    const rows=detail.rows||[];
    const grouped={};
    rows.forEach(g=>{const key=g.providerName||g.providerCode||'-';(grouped[key]||(grouped[key]=[])).push(g)});
    row.querySelector('.agent-inline-detail').innerHTML=`<div class="agent-expanded-report">
      <div class="agent-expanded-head"><strong>Provider & Game Report</strong><span>${num(Object.keys(grouped).length)} providers · ${num(rows.length)} games</span></div>
      <div class="agent-expanded-provider-grid">${Object.entries(grouped).map(([name,games])=>`<section class="agent-expanded-provider"><div class="agent-expanded-provider-head"><b>${esc(name)}</b><span>${num(games.length)} games</span></div><div class="agent-expanded-game-list">${games.map(g=>`<a class="agent-expanded-game" href="agent-player-game-report.html?id=${encodeURIComponent(id)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&provider=${encodeURIComponent(g.providerCode||'')}&game=${encodeURIComponent(g.gameCode||'')}"><span><b>${esc(g.gameName||g.gameCode||'-')}</b><small>${esc(g.gameCategory||'')}</small></span><span class="agent-expanded-game-amount">RM ${money(g.totalBet)}<small>Valid RM ${money(g.validBet)}</small></span><i class="bi bi-chevron-right"></i></a>`).join('')}</div></section>`).join('')||'<div class="table-empty">No provider/game detail.</div>'}</div>
    </div>`;
  });
  const pd=await api('/agent/reports/providers?'+qs);
  if($('agentProviderReportRows')){const providerRows=(pd.rows||[]).filter(r=>Number(r.players||0)>0||Number(r.games||0)>0||Number(r.totalBet||0)!==0||Number(r.validBet||0)!==0||Number(r.playerPL||0)!==0);$('agentProviderReportRows').innerHTML=providerRows.map(r=>`<tr><td><b>${esc(r.providerName||r.providerCode)}</b><small class="d-block text-muted">${r.providerName?esc(r.providerCode||''):''}</small></td><td>${num(r.players)}</td><td>${num(r.games)}</td><td>RM ${money(r.totalBet)}</td><td>RM ${money(r.validBet)}</td><td>${plHtml(r.playerPL)}</td></tr>`).join('')||'<tr><td colspan="6" class="table-empty">No provider data.</td></tr>';}
}

async function loadPlayerGameReport(){const sp=new URLSearchParams(location.search),id=sp.get('id'),from=sp.get('from')||today(),to=sp.get('to')||today(),providerFilter=sp.get('provider')||'',gameFilter=sp.get('game')||'';const d=await api('/agent/reports/player/'+encodeURIComponent(id)+'/games?'+new URLSearchParams({from,to}));if($('agentGameReportTitle'))$('agentGameReportTitle').textContent=d.player?.fullName||d.player?.username||'Player';if($('agentGameReportRange'))$('agentGameReportRange').textContent=from+' - '+to;let rows=(d.rows||[]).filter(r=>Number(r.totalBet||0)!==0||Number(r.validBet||0)!==0||Number(r.totalWin||0)!==0||Number(r.playerPL||0)!==0||Number(r.betCount||0)>0);if(providerFilter)rows=rows.filter(r=>String(r.providerCode||'').toUpperCase()===providerFilter.toUpperCase());if(gameFilter)rows=rows.filter(r=>String(r.gameCode||'').toUpperCase()===gameFilter.toUpperCase());if($('agentGameReportRows'))$('agentGameReportRows').innerHTML=rows.map(r=>`<tr><td>${esc(r.providerName||r.providerCode)}</td><td><b>${esc(r.gameName||r.gameCode)}</b>${r.gameName?`<small class="d-block text-muted">${esc(r.gameCode||'')}</small>`:''}</td><td>${esc(r.gameCategory||'-')}</td><td>RM ${money(r.totalBet)}</td><td>RM ${money(r.validBet)}</td><td>RM ${money(r.totalWin)}</td><td>${plHtml(r.playerPL)}</td><td>${num(r.betCount)}</td></tr>`).join('')||'<tr><td colspan="8" class="table-empty">No game report data.</td></tr>';}

async function loadFinance(){const[from,to]=daterange('agentWalletFrom','agentWalletTo'),d=await fetchWallet();const rows=walletCache.filter(x=>inDateRange(x.createdAt,from,to));const earned=rows.filter(x=>Number(x.amount)>0).reduce((a,x)=>a+Number(x.amount||0),0),spent=Math.abs(rows.filter(x=>Number(x.amount)<0).reduce((a,x)=>a+Number(x.amount||0),0)),pending=(await api('/agent/settlements').catch(()=>[])).filter(x=>String(x.settlementStatus||'').toUpperCase()==='PENDING').reduce((a,x)=>a+Number(x.requestedAmount||0),0);if($('agentFinanceCards'))$('agentFinanceCards').innerHTML=[['bi-wallet2','Available Balance',d.balance],['bi-clock','Pending Payout',pending],['bi-graph-up-arrow','Total Earned',earned],['bi-graph-down-arrow','Total Spent',spent]].map((x,i)=>`<div class="agent-player-stat-card"><span class="agent-stat-icon"><i class="bi ${x[0]}"></i></span><div><span>${x[1]}</span><strong>RM ${money(x[2])}</strong><small>Selected period</small></div></div>`).join('');renderWallet();if($('agentExpenseRows'))$('agentExpenseRows').innerHTML=rows.filter(x=>Number(x.amount)<0&&Number(x.amount)!==0).map(x=>`<tr><td>${esc(shortDateTime(x.createdAt))}</td><td>${esc(niceType(x.ledgerType))}</td><td class="agent-negative">-RM ${money(Math.abs(Number(x.amount||0)))}</td><td>${esc(x.remark||'-')}</td></tr>`).join('')||'<tr><td colspan="4" class="table-empty">No company-paid expense deductions in this period.</td></tr>';}
async function submitReimbursement(){const f=$('agentReimburseProof')?.files?.[0],amount=Number($('agentReimburseAmount')?.value||0),remark=String($('agentReimburseRemark')?.value||'').trim();if(!f)return dialog.alert('Please upload the advertising receipt / proof image.',{title:'Proof Required',type:'error'});if(!(amount>0))return dialog.alert('Please enter a reimbursement amount greater than 0.',{title:'Amount Required',type:'error'});const btn=$('agentReimburseSubmit');try{btn.disabled=true;btn.textContent='Uploading...';const fd=new FormData();fd.append('image',f);const r=await fetch(base()+'/uploads/image',{method:'POST',body:fd}),j=await r.json();if(!r.ok||j.status==='error'||!j.data?.url)throw Error(j.message||'Image upload failed');await api('/agent/wallet/reimbursement',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount,remark,proofImageUrl:j.data.url})});$('agentReimburseForm').reset();await dialog.alert('Reimbursement claim submitted for company approval.',{title:'Claim Submitted',type:'success'});await loadFinance();}catch(e){await dialog.alert(e.message,{title:'Upload Failed',type:'error'});}finally{btn.disabled=false;btn.innerHTML='<i class="bi bi-upload"></i> Upload & Submit Claim';}}
let promotionCache=null;
function promoMoney(v){return 'RM '+money(v)}
function meaningfulCampaign(x){const active=promoStatus(x)==='Active',hasPeriod=!!(x.startAt||x.endAt),activity=Number(x.totalReward||0)!==0||Number(x.playersClaimed||0)>0||Number(x.totalClaims||0)>0||Number(x.agentDeduction||0)!==0;return active||activity||hasPeriod}
function promoStatus(p){return String(p.status||'').toUpperCase()==='ACTIVE'?'Active':'Ended'}
function promoTypeLabel(v){const x=String(v||'Promotion').replaceAll('_',' ').toLowerCase();return x.replace(/\b\w/g,c=>c.toUpperCase())}
function promoDate(v){if(!v)return '-';const d=new Date(v);return Number.isNaN(d.getTime())?String(v).slice(0,10):d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
/* The bonus page's three tables are tabs (owner: "要给每个table 分tab"), in the BO/Main module tab row's
   own design (`bo-module-tabs.css`, the sheet the sibling agent pages already link): text-only
   `.bo-module-tab`s, the active one marked `is-active` - what that sheet paints with a 2px orange
   underline. One panel per table (`data-bonus-panel`), the first open on load. The rows themselves are
   unaffected: each renderer keeps writing into its own tbody, visible or not. */
function initBonusTabs(){
  /* `bo-ui-standard.js:sizeNativeSelect` sizes a select to its widest option + 54px, which does not count the
     native arrow, so "All Statuses" rendered as "All St...". The BO pins its own --bo-select-width for the same
     reason; this one field takes an explicit width after that script has run. */
  function pinStatusWidth(){
    const st=$('agentBonusStatus');if(!st)return;
    const wrap=st.closest('.bo-filter-select-item');
    [st,wrap,st.closest('.field')].forEach(function(el){
      if(!el)return;
      el.style.setProperty('width','160px','important');
      el.style.setProperty('min-width','160px','important');
      el.style.setProperty('flex','0 0 160px','important');
    });
  }
  window.addEventListener('load',pinStatusWidth);
  /* The page-size control is a native select sitting at the bottom of a page that deliberately does not scroll:
     its popup is browser UI, opens downwards and fell off the window, so the options could not be reached. It is
     replaced by a small list that opens *upwards*; the hidden select stays the state holder so
     promoCampaignSize() and the existing change wiring are untouched. */
  (function(){
    const btn=$('agentCampaignSizeBtn'),menu=$('agentCampaignSizeMenu'),sel=$('agentCampaignSize'),label=$('agentCampaignSizeLabel');
    if(!btn||!menu||!sel)return;
    const close=function(){menu.hidden=true;btn.setAttribute('aria-expanded','false');};
    btn.addEventListener('click',function(e){e.stopPropagation();const open=menu.hidden;menu.hidden=!open;btn.setAttribute('aria-expanded',open?'true':'false');});
    menu.querySelectorAll('[data-size]').forEach(function(o){
      o.addEventListener('click',function(){
        sel.value=o.dataset.size;
        menu.querySelectorAll('[data-size]').forEach(x=>x.classList.toggle('is-active',x===o));
        if(label)label.textContent=o.textContent.trim();
        close();
        sel.dispatchEvent(new Event('change',{bubbles:true}));
      });
    });
    document.addEventListener('click',function(e){if(!menu.hidden&&!e.target.closest('.agent-size-picker'))close();});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
  })();
  /* the auto page size follows the window, so the footer stays inside the viewport without a scrollbar */
  let _reBonus=null;
  window.addEventListener('resize',function(){clearTimeout(_reBonus);_reBonus=setTimeout(function(){if(page==='bonus')paintPromotionCampaigns();},150);});
  const tabs=[...document.querySelectorAll('[data-bonus-section]')];
  const panels=[...document.querySelectorAll('.agent-bonus-panel')];
  if(!tabs.length||!panels.length)return;
  const show=key=>{
    tabs.forEach(b=>{
      const on=b.dataset.bonusSection===key;
      b.classList.toggle('is-active',on);
      b.setAttribute('aria-selected',on?'true':'false');
    });
    panels.forEach(p=>p.classList.toggle('is-active',p.dataset.bonusPanel===key));
  };
  tabs.forEach(b=>b.addEventListener('click',()=>show(b.dataset.bonusSection)));
  show(tabs[0].dataset.bonusSection);
}

function renderPromotionOverview(items){const target=$('agentPromotionOverview');if(!target)return;const sums={};let total=0;(items||[]).forEach(x=>{const k=promoTypeLabel(x.type||'Promotion'),v=Number(x.agentDeduction||0);sums[k]=(sums[k]||0)+v;total+=v});const rows=Object.entries(sums).sort((a,b)=>b[1]-a[1]).slice(0,4);target.innerHTML=`<div class="agent-promo-donut"><div><strong>${promoMoney(total)}</strong><small>Total Agent Deduction</small></div></div><div class="agent-promo-legend">${rows.map(([k,v],i)=>`<div><span class="agent-promo-dot dot-${i+1}"></span><b>${esc(k)}</b><em>${promoMoney(v)}${total>0?` (${(v/total*100).toFixed(1)}%)`:''}</em></div>`).join('')||'<div class="table-empty">No promotion deduction in this period.</div>'}</div>`}
/* The campaigns table pages client-side, on the family's own ladder (`paintPager` on the performance
   page is the same markup: First / Prev / window / Next / Last, the ends disabled on a single page -
   the owner asked for that ladder there: "当前页面好像没有设计到 页数器"). `-` is the family default
   page of 10, `all` shows everything. */
let promoCampaignRows=[],promoCampaignPage=1;
function promoCampaignSize(){
  const sel=$('agentCampaignSize');
  const v=sel?sel.value:'';
  if(v==='all')return 0;
  const n=Number(v);
  if(n>0)return n;
  /* "-" is the auto option: the row count comes from the free space so the table fills the window down to an
     small margin, the way index.html's card reaches the bottom edge. 40px is what sits below the card itself:
     its own 16px margin-bottom plus the 16px padding-bottom on `section.report-content` (which is also an
     `overflow:auto` box, so anything past it puts a scrollbar on the inner frame) plus an 8px breathing space. */
  const wrap=document.querySelector('.agent-promo-campaign-card > .table-wrap');
  const foot=document.querySelector('.agent-promo-campaign-card > .agent-table-footer');
  if(!wrap)return 10;
  const row=document.querySelector('.agent-promo-campaign-card tbody tr');
  const rowH=row?Math.round(row.getBoundingClientRect().height):66;
  const top=wrap.getBoundingClientRect().top;
  const footH=foot?Math.round(foot.getBoundingClientRect().height):65;
  const avail=(window.innerHeight-40)-top-47-footH;
  return Math.max(5,Math.floor(avail/Math.max(24,rowH)));
}
function promoRowHeight(size){
  /* the rows share the free space equally, so every row is the same height whatever the data does */
  const wrap=document.querySelector('.agent-promo-campaign-card > .table-wrap');
  const foot=document.querySelector('.agent-promo-campaign-card > .agent-table-footer');
  if(!wrap||!size)return 0;
  const top=wrap.getBoundingClientRect().top;
  const footH=foot?Math.round(foot.getBoundingClientRect().height):65;
  const avail=(window.innerHeight-40)-top-47-footH;
  return Math.max(40,Math.floor(avail/size));
}
function promoCampaignPager(pages){
  const el=$('agentCampaignPager');
  if(!el)return;
  /* index.html's own ladder (owner's choice): first / prev / numbers with an ellipsis run / next / last, all
     icon buttons. The icons are pointer-events:none in CSS so a click on the glyph still lands on the button. */
  let html=`<button ${promoCampaignPage<=1?'disabled':''} data-promo-page="1" title="First page" aria-label="First page"><i class="bi bi-chevron-double-left" aria-hidden="true"></i></button>`
    +`<button ${promoCampaignPage<=1?'disabled':''} data-promo-page="${promoCampaignPage-1}" title="Previous page" aria-label="Previous page"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>`;
  for(let i=1;i<=pages;i++){
    if(pages>7&&i>2&&i<pages-1&&Math.abs(i-promoCampaignPage)>1){if(i===3)html+='<button disabled class="dots" aria-hidden="true">\u2026</button>';continue}
    html+=`<button class="${i===promoCampaignPage?'active':''}" data-promo-page="${i}" title="Page ${i}" aria-label="Page ${i}">${i}</button>`;
  }
  html+=`<button ${promoCampaignPage>=pages?'disabled':''} data-promo-page="${promoCampaignPage+1}" title="Next page" aria-label="Next page"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>`
    +`<button ${promoCampaignPage>=pages?'disabled':''} data-promo-page="${pages}" title="Last page" aria-label="Last page"><i class="bi bi-chevron-double-right" aria-hidden="true"></i></button>`;
  el.innerHTML=html;
}
function paintPromotionCampaigns(){
  const tbody=$('agentCampaignRows');
  if(!tbody)return;
  const size=promoCampaignSize();const rowH=promoRowHeight(size);
  const _card=document.querySelector('.agent-promo-campaign-card');
  if(_card)_card.style.setProperty('--bonus-row-h',(rowH||66)+'px');
  const total=promoCampaignRows.length;
  const pages=size?Math.max(1,Math.ceil(total/size)):1;
  promoCampaignPage=Math.max(1,Math.min(promoCampaignPage,pages));
  const start=size?(promoCampaignPage-1)*size:0;
  const slice=size?promoCampaignRows.slice(start,start+size):promoCampaignRows;
  tbody.innerHTML=slice.map(promoCampaignRowHtml).join('')||'<tr><td colspan="9" class="table-empty">No campaigns found for this period.</td></tr>';
  /* a short last page must not shorten the table (owner): keep the wrapper at a full page of rows */
  const _wrap=tbody.closest('.table-wrap');
  if(_wrap){const _r=tbody.querySelector('tr');const _rh=_r?Math.round(_r.getBoundingClientRect().height):66;
    _wrap.style.minHeight=(size?size*_rh:0)+'px';}
  const meta=$('agentCampaignMeta');
  if(meta)meta.textContent=total?('Showing '+num(start+1)+' to '+num(start+slice.length)+' of '+num(total)+' campaign'+(total===1?'':'s')):'Showing 0 campaigns';
  promoCampaignPager(pages);
  document.querySelectorAll('[data-promo-id]').forEach(b=>b.onclick=()=>openPromotionDetail(Number(b.dataset.promoId)));
}
function promoCampaignRowHtml(x){return `<tr><td><b>${esc(x.name||'-')}</b><small class="agent-promo-cell-sub">${esc(x.code||'')}</small></td><td><span class="agent-promo-type">${esc(promoTypeLabel(x.type))}</span></td><td><span class="agent-status ${promoStatus(x)==='Active'?'':'inactive'}">${promoStatus(x)}</span></td><td>${promoDate(x.startAt)} - ${promoDate(x.endAt)}</td><td>${promoMoney(x.totalReward)}</td><td>${num(x.playersClaimed)}</td><td>${num(x.totalClaims)}</td><td class="agent-negative">${promoMoney(x.agentDeduction)}</td><td><button class="agent-view-btn agent-view-eye" type="button" data-promo-id="${x.id}" title="View campaign details" aria-label="View campaign details"><i class="bi bi-eye" aria-hidden="true"></i></button></td></tr>`;}
function renderPromotionCampaigns(d){const all=(d.campaigns||[]).filter(meaningfulCampaign);promoCampaignRows=all;promoCampaignPage=1;paintPromotionCampaigns();}
function renderRecentClaims(d){const rows=(d.recentClaims||[]).filter(x=>x.claimTime||x.playerId||x.playerName||Number(x.reward||0)!==0||Number(x.agentDeduction||0)!==0);const tbody=$('agentRecentClaimRows');if(tbody)tbody.innerHTML=rows.slice(0,5).map(x=>`<tr><td>${esc(x.playerId||'-')}</td><td>${esc(x.playerName||'-')}</td><td>${esc(x.campaignName||'-')}</td><td>${esc(shortDateTime(x.claimTime))}</td><td>${promoMoney(x.reward)}</td><td class="agent-negative">${promoMoney(x.agentDeduction)}</td></tr>`).join('')||'<tr><td colspan="6" class="table-empty">No claims for this period.</td></tr>'}
function openPromotionDetail(id){const x=(promotionCache?.campaigns||[]).find(r=>Number(r.id)===Number(id));if(!x)return;const m=$('agentPromoModal');if(!m)return;$('agentPromoModalTitle').textContent=x.name||'Campaign Details';$('agentPromoModalBody').innerHTML=`<div class="agent-promo-detail-grid"><div><span>Campaign Type</span><b>${esc(promoTypeLabel(x.type))}</b></div><div><span>Status</span><b>${promoStatus(x)}</b></div><div><span>Period</span><b>${promoDate(x.startAt)} - ${promoDate(x.endAt)}</b></div><div><span>Players Claimed</span><b>${num(x.playersClaimed)}</b></div><div><span>Total Claims</span><b>${num(x.totalClaims)}</b></div><div><span>Agent Deduction</span><b class="agent-negative">${promoMoney(x.agentDeduction)}</b></div></div>`;if(m)m.hidden=false;document.body.classList.add('agent-modal-open')}
function closePromotionDetail(){const m=$('agentPromoModal');if(m)m.hidden=true;document.body.classList.remove('agent-modal-open')}
function exportPromotionCsv(){const rows=(promotionCache?.campaigns||[]).filter(meaningfulCampaign);if(!rows.length)return;const data=[['Campaign','Type','Status','Start','End','Players Claimed','Total Claims','Agent Deduction'],...rows.map(x=>[x.name,promoTypeLabel(x.type),promoStatus(x),x.startAt||'',x.endAt||'',x.playersClaimed,x.totalClaims,x.agentDeduction])];const csv=data.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='agent-promotion-campaigns.csv';a.click();URL.revokeObjectURL(a.href)}
async function loadBonus(){const[from,to]=daterange('agentBonusFrom','agentBonusTo'),q=encodeURIComponent($('agentBonusSearchText')?.value||''),st=encodeURIComponent($('agentBonusStatus')?.value||''),tp=encodeURIComponent($('agentBonusType')?.value||'');const d=await api(`/agent/promotions?from=${from}&to=${to}&q=${q}&status=${st}&type=${tp}`);promotionCache=d;const cards=[['bi-gift','Active Campaigns',d.metrics?.activeCampaigns||0,'Currently active'],['bi-person-check','Total Players Claimed',d.metrics?.playersClaimed||0,'Unique assigned players'],['bi-people','Total Claims',d.metrics?.totalClaims||0,'Claims in selected period'],['bi-cash-coin','Total Agent Deduction',promoMoney(d.metrics?.agentDeduction||0),'Selected period']];if($('agentBonusMetrics'))$('agentBonusMetrics').innerHTML=cards.map((x,i)=>`<div class="agent-player-stat-card"><span class="agent-stat-icon"><i class="bi ${x[0]}"></i></span><div><span>${x[1]}</span><strong>${x[2]}</strong><small>${x[3]}</small></div></div>`).join('');renderPromotionCampaigns(d);renderRecentClaims(d);renderPromotionOverview((d.campaigns||[]).filter(meaningfulCampaign))}

(async()=>{if(!await initShell())return;try{if(page==='dashboard'){startAgentHeaderClock();ensureRange('agentDashFrom','agentDashTo');const refreshBtn=$('agentPortalRefresh');if(refreshBtn)refreshBtn.onclick=loadDashboard;['agentDashFrom','agentDashTo'].forEach(id=>{const e=$(id);if(e)e.addEventListener('change',loadDashboard)});if($('agentTrendDays'))$('agentTrendDays').onchange=async()=>{const days=$('agentTrendDays').value;const label=document.querySelector('.agent-trend-panel .agent-panel-title h2 span');if(label)label.textContent='('+days+' Days)';renderTrend(await api('/agent/dashboard/trend?days='+days));};await loadDashboard();}if(page==='players'){if(location.pathname.endsWith('agent-player-detail.html')){await loadPlayerDetail();}else{/* no ensureRange here - same as products: the range starts empty and an empty range means every player, which is what makes this list independent of the control until a range is picked */;await fetchPlayers();initVipFilter();const psb=$('agentPlayerSearchBtn');if(psb)psb.onclick=()=>{playerPage=1;renderPlayers()};if($('agentPlayerExport'))$('agentPlayerExport').onclick=exportPlayersCsv;document.querySelectorAll('[data-player-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-player-tab]').forEach(x=>x.classList.remove('active'));b.classList.add('active');playerTab=b.dataset.playerTab;playerPage=1;renderPlayers()});const pageSizeSel=$('agentPlayerPageSize');if(pageSizeSel){pageSizeSel.value=String(playerPageSize);pageSizeSel.onchange=()=>{playerPageSize=Number(pageSizeSel.value)||10;playerPage=1;renderPlayers()};}['agentPlayerSearch','agentPlayerStatus','agentPlayerFrom','agentPlayerTo','agentPlayerLastActive','agentPlayerVip'].forEach(id=>{const e=$(id);if(!e)return;e.addEventListener(e.tagName==='INPUT'?'input':'change',()=>{playerPage=1;renderPlayers()});/* The date fields are <input>s, so the line above binds them to `input` - but the range widget only ever emits a native `change` from commit() (see bo-date-range.js). Without this the page never hears a picked range and the list ignores it. */if(id==='agentPlayerFrom'||id==='agentPlayerTo')e.addEventListener('change',()=>{playerPage=1;renderPlayers()})});renderPlayers();}}if(page==='products'){const pps=$('agentProductPageSize');if(pps){pps.value=String(productPageSize);pps.onchange=()=>{productPageSize=Number(pps.value)||10;productPage=1;renderProductRows()}}/* no ensureRange here: the date range starts empty and an empty range means all time, which is what keeps this page's numbers independent of the control until a range is picked *//* the Search button is gone (the players page has none either): the fields filter as they change. The text box debounces because loadProducts() fetches. */let pDeb=null;const pSearch=$('agentProductSearch');if(pSearch)pSearch.addEventListener('input',()=>{clearTimeout(pDeb);pDeb=setTimeout(()=>loadProducts(),250)});[$('agentProductFrom'),$('agentProductTo')].forEach(e=>{if(e)e.addEventListener('change',()=>loadProducts())});await loadProducts();}if(page==='provider_detail'){await loadProviderDetail();}const _reAfter=function(){reportPage=1;providerPage=1;renderReportPanes();};
document.querySelectorAll('#agentReportTabs button').forEach(function(b){b.onclick=function(){showReportTab(b.dataset.reportTab);};});
const _rps=$('agentReportPageSize');if(_rps){_rps.onchange=function(){reportPageSize=providerPageSize=Number(_rps.value)||10;reportPage=1;providerPage=1;renderReportPanes();};}
const _rSearch=$('agentReportPlayerSearch');let _rDeb=null;
if(_rSearch)_rSearch.addEventListener('input',function(){clearTimeout(_rDeb);_rDeb=setTimeout(function(){loadReports().then(_reAfter);},250);});
['agentReportProvider','agentReportGame'].forEach(function(id){const e=$(id);if(e)e.addEventListener('change',function(){loadReports().then(_reAfter);});});
/* the range widget emits change, and these two are <input>s - the same mismatch that made the players page's
   range look dead, so it is bound explicitly here. */
['agentReportFrom','agentReportTo'].forEach(function(id){const e=$(id);if(e)e.addEventListener('change',function(){loadReports().then(_reAfter);});});
const _rReset=$('agentReportReset');if(_rReset)_rReset.onclick=function(){['agentReportPlayerSearch','agentReportProvider','agentReportGame','agentReportFrom','agentReportTo'].forEach(function(id){if($(id))$(id).value='';});loadReports().then(_reAfter);};
if(page==='reports'){await loadReports();reportPage=1;providerPage=1;renderReportPanes();}if(page==='player_game_report'){await loadPlayerGameReport();gameReportPage=1;renderGameReportPaging();const gps=$('agentGameReportPageSize');if(gps){gps.onchange=function(){gameReportSize=Number(gps.value)||10;gameReportPage=1;renderGameReportPaging()}}}if(page==='withdraw'){ensureRange('agentSettlementFrom','agentSettlementTo');await loadBankAccounts();$('agentSettlementRefresh').onclick=loadSettlement;$('agentSettlementSubmit').onclick=submitSettlement;if($('agentSettlementAmount'))$('agentSettlementAmount').addEventListener('input',updateWithdrawSummary);if($('withdrawAllBtn'))$('withdrawAllBtn').onclick=()=>{const gross=Number(lastSettlementReport?.availableCommission??lastSettlementReport?.agentProfit??0),pending=(settlementsCache||[]).filter(x=>['PENDING','APPROVED'].includes(String(x.settlementStatus||'').toUpperCase())).reduce((a,x)=>a+Number(x.requestedAmount||0),0),max=Math.max(0,gross-pending);$('agentSettlementAmount').value=max.toFixed(2);updateWithdrawSummary()};if($('withdrawRemark'))$('withdrawRemark').addEventListener('input',()=>{if($('withdrawRemarkCount'))$('withdrawRemarkCount').textContent=String($('withdrawRemark').value.length)});if($('agentAddBankAccount'))$('agentAddBankAccount').onclick=()=>{clearBankForm();openBankModal()};if($('agentManageBankAccounts'))$('agentManageBankAccounts').onclick=openBankModal;if($('agentBankModalClose'))$('agentBankModalClose').onclick=closeBankModal;if($('agentBankModal'))$('agentBankModal').addEventListener('click',e=>{if(e.target===$('agentBankModal'))closeBankModal()});if($('agentBankAccountForm'))$('agentBankAccountForm').onsubmit=saveBankAccount;if($('agentBankFormReset'))$('agentBankFormReset').onclick=clearBankForm;if($('agentPayoutAccount'))$('agentPayoutAccount').onchange=renderBankAccounts;if($('withdrawHistoryStatus'))$('withdrawHistoryStatus').onchange=renderWithdrawHistory;await loadSettlement();}if(page==='finance'){ensureRange('agentWalletFrom','agentWalletTo');/* The controls apply themselves, the shape this portal uses everywhere else (agent bonus, players,
   products): selects and dates on `change`, the keyword after a 400ms pause or on Enter. Clearing a
   control IS the reset, so the Reset and Search buttons are gone. */
['agentWalletFrom','agentWalletTo','agentWalletType'].forEach(function(id){var e=$(id);if(e)e.addEventListener('change',function(){loadFinance&&loadFinance();});});
(function(){var e=$('agentWalletKeyword');if(!e)return;var t=0;e.addEventListener('input',function(){clearTimeout(t);t=setTimeout(function(){loadFinance&&loadFinance();},400);});e.addEventListener('keydown',function(ev){if(ev.key==='Enter'){clearTimeout(t);loadFinance&&loadFinance();}});})();
if($('agentReimburseSubmit'))$('agentReimburseSubmit').onclick=submitReimbursement;await loadFinance();}if(page==='bonus'){initBonusTabs();$('agentCampaignSize')?.addEventListener('change',()=>{promoCampaignPage=1;paintPromotionCampaigns()});$('agentCampaignPager')?.addEventListener('click',e=>{const b=e.target.closest('[data-promo-page]');if(!b||b.disabled)return;promoCampaignPage=Number(b.dataset.promoPage)||1;paintPromotionCampaigns()});ensureRange('agentBonusFrom','agentBonusTo');/* The filter row has no Search / Reset buttons any more (owner: "再把reset 和搜索按键去除"): every
   control applies itself - selects and dates on `change`, the keyword after a 400ms pause or on
   Enter, the same shape agent-performance-report.js uses. Clearing a control IS the reset: the
   option lists and an emptied box carry their own "All". */['agentBonusStatus','agentBonusType','agentBonusFrom','agentBonusTo'].forEach(id=>{const el=$(id);if(el)el.addEventListener('change',loadBonus)});(function(){const el=$('agentBonusSearchText');if(!el)return;let t=0;el.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(loadBonus,400)});el.addEventListener('keydown',e=>{if(e.key==='Enter'){clearTimeout(t);loadBonus()}})})();if($('agentPromotionExport'))$('agentPromotionExport').onclick=exportPromotionCsv;if($('agentPromoModalClose'))$('agentPromoModalClose').onclick=closePromotionDetail;if($('agentPromoModal'))$('agentPromoModal').onclick=e=>{if(e.target===$('agentPromoModal'))closePromotionDetail()};await loadBonus();}if(page==='profile')initProfile();   /* the password form now lives on the profile page under id="password" (BO's layout), so initPassword() runs here too - it self-guards on the form's existence. */if(page==='profile'||page==='password')initPassword();}catch(e){if(/Unauthorized|disabled/i.test(e.message)){localStorage.removeItem('agent_token');location.href='agent-login.html';}else await dialog.alert(e.message,{title:'Unable to Load',type:'error'});}})();
})();
