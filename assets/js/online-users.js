(function(){
  'use strict';
  /* A swap re-runs this file against a fresh frame, so the DCL block below was replayed on each
     entry: N entries meant N resize/visibility handlers and N 5s presence timers. Release the
     previous run's bindings first; the timer stops itself once the page is gone. */
  if(window.__boOuUnbind) window.__boOuUnbind();
  const unbinds=[];
  const listen=(target,type,fn,opt)=>{ target.addEventListener(type,fn,opt); unbinds.push(()=>target.removeEventListener(type,fn,opt)); };
  window.__boOuUnbind=()=>{ unbinds.forEach(fn=>fn()); unbinds.length=0; };
  const $=id=>document.getElementById(id);
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const first=(o,ks,d='')=>{for(const k of ks){if(o&&o[k]!==undefined&&o[k]!==null&&o[k]!=='')return o[k]}return d;};
  const money=v=>(Number(v)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const dt=v=>{if(!v)return '-'; const d=new Date(v); return Number.isNaN(d.getTime())?String(v):d.toLocaleString();};
  async function api(url,opts={}){const r=await fetch(url,opts);let j=null;try{j=await r.json()}catch(e){}if(!r.ok||j?.success===false)throw new Error(j?.message||('Request failed ('+r.status+')'));return j||{};}
  function status(m){if(Number(first(m,['locked','isLocked'],0))===1)return'LOCKED';const x=first(m,['status','accountStatus'],1);return Number(x)===0||String(x).toLowerCase()==='inactive'?'INACTIVE':'ACTIVE';}
  function pagerButtons(cur,total){const btn=(p,t,dis=false,active=false)=>`<button type="button" data-online-page="${p}" ${dis?'disabled':''} class="${active?'active':''}">${t}</button>`;let h=btn(Math.max(1,cur-1),'‹',cur<=1);const from=Math.max(1,cur-2),to=Math.min(total,from+4);for(let p=from;p<=to;p++)h+=btn(p,p,false,p===cur);h+=btn(Math.min(total,cur+1),'›',cur>=total);return h;}
  function isAutoPageSize(raw){
    const v=String(raw??'-').trim();
    return v===''||v==='-'||/^auto$/i.test(v);
  }
  function measureAutoPageSize(){
    const wrap=document.querySelector('.table-wrap');
    const rowH=44;
    const avail=wrap?Math.max(rowH*3,wrap.clientHeight-8):440;
    return Math.max(5,Math.min(50,Math.floor(avail/rowH)||10));
  }
  function resolvePageSize(raw){
    const v=String(raw??$('onlinePageSize')?.value??'-').trim();
    if(isAutoPageSize(v)) return measureAutoPageSize();
    if(/^all$/i.test(v)) return 10000;
    const n=Number(v);
    return Number.isFinite(n)&&n>0?n:measureAutoPageSize();
  }
  let all=[],filtered=[],page=1,size=10,timer=null,loading=false;
  let cachedMembersPayload=null,cachedWalletPayload=null,lastHeavyRefreshAt=0;
  const HEAVY_REFRESH_MS=60000;
  function match(m){
    const q=id=>String($(id)?.value||'').trim().toLowerCase();
    const name=q('onlineSearchName'),mobile=q('onlineSearchMobile'),agent=q('onlineSearchAgent'),bank=q('onlineSearchBank'),st=q('onlineSearchStatus'),lock=q('onlineSearchLock');
    if(name&&!(`${first(m,['username'],'')} ${first(m,['fullName','name','displayName'],'')}`.toLowerCase().includes(name)))return false;
    if(mobile&&!String(first(m,['mobile','phone','mobileNo'],'')).toLowerCase().includes(mobile))return false;
    if(agent&&!String(first(m,['referrerCode','referrer','agent','agentName'],'')).toLowerCase().includes(agent))return false;
    if(bank&&!String(first(m,['bank','bankName'],'')).toLowerCase().includes(bank))return false;
    const s=status(m).toLowerCase(); if(st&&s!==st)return false;
    const l=s==='locked'?'locked':'normal'; if(lock&&l!==lock)return false;
    return true;
  }
  function render(){
    size=resolvePageSize($('onlinePageSize')?.value);
    filtered=all.filter(match); const total=filtered.length,totalPages=Math.max(1,Math.ceil(total/size));page=Math.min(Math.max(1,page),totalPages);const start=(page-1)*size,rows=filtered.slice(start,start+size);
    $('onlineMetricCount').textContent=all.length.toLocaleString(); $('onlineUsersFoundBadge').textContent=total+' Users Found';
    const body=$('onlineUsersBody');
    body.innerHTML=rows.length?rows.map((m,i)=>{const id=first(m,['id','memberId','userId'],'');const s=status(m);return `<tr><td>${start+i+1}</td><td>${esc(dt(first(m,['createdAt','registerDate','created_at'],'-')))}</td><td><div class="online-user-name"><span class="online-live-dot"></span><div><b>${esc(first(m,['username'],'-'))}</b><br><small>${esc(first(m,['fullName','name','displayName'],'-'))}</small></div></div></td><td>${esc(first(m,['mobile','phone','mobileNo'],'-'))}</td><td>${esc(first(m,['bank','bankName'],'-'))}</td><td><b>${money(first(m,['mainWalletBalance','mainBalance','balance'],0))}</b></td><td>${esc(dt(first(m,['lastLoginAt','lastLogin','last_login_at'],'-')))}</td><td>VIP ${esc(first(m,['vipLevel'],0))}</td><td>${esc(first(m,['kycStatus'],'UNVERIFIED'))}</td><td><small class="status-pill ${s==='LOCKED'?'off':''}">${esc(s)}</small></td><td class="online-last-seen"><b>ONLINE</b><br><small>${esc(dt(m.lastSeenAt||m.presenceLastSeenAt))}</small></td><td><a class="icon-action view" title="View member" href="member-detail.html?memberId=${encodeURIComponent(id)}"><i class="bi bi-eye"></i></a></td></tr>`}).join(''):'<tr><td colspan="12">No online users found.</td></tr>';
    const cards=$('onlineCardList'); if(cards)cards.innerHTML=rows.map(m=>`<div class="member-card"><div class="member-card-head"><h3><span class="online-live-dot"></span> ${esc(first(m,['username'],'-'))}</h3><span class="status-pill">ONLINE</span></div><div class="meta">${esc(first(m,['fullName','name','displayName'],'-'))} • ${esc(first(m,['mobile','phone','mobileNo'],'-'))}</div><div class="member-grid"><span>Main Wallet</span><b>${money(first(m,['mainWalletBalance','mainBalance','balance'],0))}</b><span>VIP</span><b>VIP ${esc(first(m,['vipLevel'],0))}</b><span>Last Seen</span><b>${esc(dt(m.lastSeenAt||m.presenceLastSeenAt))}</b></div><a class="clean-btn primary w-100 mt-3" href="member-detail.html?memberId=${encodeURIComponent(first(m,['id','memberId','userId'],''))}">View Details</a></div>`).join('');
    $('onlinePageInfo').textContent=total?`Showing ${start+1} to ${start+rows.length} of ${total} entries`:'Showing 0 to 0 of 0 entries'; $('onlinePager').innerHTML=pagerButtons(page,totalPages);
  }
  function mergeMembers(members,presence,wallets){const pm=new Map(presence.map(p=>[String(p.memberId),p])),wm=new Map(wallets.map(w=>[String(first(w,['memberId','id','userId'],'')),w]));return members.filter(m=>pm.has(String(first(m,['id','memberId','userId'],'')))).map(m=>{const id=String(first(m,['id','memberId','userId'],'')),p=pm.get(id)||{},w=wm.get(id)||{};return Object.assign({},m,w,{lastSeenAt:p.lastSeenAt||p.seenAt||p.updatedAt,online:true});});}
  async function load(showLoading=false,forceHeavy=false){if(loading)return;loading=true;if(showLoading)$('onlineUsersBody').innerHTML='<tr><td colspan="12">Loading online users...</td></tr>';try{
    const headers={...BO_AUTH.authHeader()};
    const needHeavy=forceHeavy||!cachedMembersPayload||(Date.now()-lastHeavyRefreshAt>=HEAVY_REFRESH_MS);
    const presencePromise=api(API_CONFIG.BASE_URL+(API_CONFIG.ENDPOINTS.MEMBER_ONLINE||'/admin/member/online'),{headers,cache:'no-store'});
    const memberPromise=needHeavy?api(BO_AUTH.memberListUrl(),{headers,cache:'no-store'}):Promise.resolve(cachedMembersPayload);
    const walletPromise=needHeavy
      ?(API_CONFIG.ENDPOINTS.MEMBER_WALLET_LIST?api(API_CONFIG.BASE_URL+API_CONFIG.ENDPOINTS.MEMBER_WALLET_LIST+'?page=1&size=10000',{headers,cache:'no-store'}).catch(()=>({data:{content:[]}})):Promise.resolve({data:{content:[]}}))
      :Promise.resolve(cachedWalletPayload||{data:{content:[]}});
    const [pj,mj,wj]=await Promise.all([presencePromise,memberPromise,walletPromise]);
    if(needHeavy){cachedMembersPayload=mj;cachedWalletPayload=wj;lastHeavyRefreshAt=Date.now();}
    const pData=pj.data||{},presence=Array.isArray(pData.content)?pData.content:[],members=Array.isArray(mj.data)?mj.data:(Array.isArray(mj.data?.content)?mj.data.content:[]),wallets=Array.isArray(wj.data)?wj.data:(Array.isArray(wj.data?.content)?wj.data.content:[]);
    all=mergeMembers(members,presence,wallets).sort((a,b)=>new Date(b.lastSeenAt||0)-new Date(a.lastSeenAt||0));render();$('onlineRefreshNote').textContent='Presence updated '+new Date().toLocaleTimeString()+' · details refresh every 60 seconds';
  }catch(e){$('onlineUsersBody').innerHTML='<tr><td colspan="12" class="text-danger">'+esc(e.message||'Unable to load online users')+'</td></tr>';}finally{loading=false;}}
  function reset(){['onlineSearchName','onlineSearchMobile','onlineSearchAgent','onlineSearchBank','onlineSearchStatus','onlineSearchLock'].forEach(id=>{if($(id))$(id).value=''});page=1;render();}
  function exportCsv(){const rows=filtered.map((m,i)=>[i+1,first(m,['username'],'-'),first(m,['fullName','name'],'-'),first(m,['mobile','phone'],'-'),first(m,['bank','bankName'],'-'),money(first(m,['mainWalletBalance','balance'],0)),'VIP '+first(m,['vipLevel'],0),status(m),dt(m.lastSeenAt)]);const csv=[['#','Username','Name','Mobile','Bank','Main Wallet','VIP Level','Status','Last Seen'],...rows].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));a.download='online-users-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}
  document.addEventListener('DOMContentLoaded',()=>{
    const alive=()=>!!$('onlineSearchName');
    size=resolvePageSize($('onlinePageSize')?.value); load(true,true);
    timer=setInterval(()=>{ if(!alive()){ clearInterval(timer); timer=null; return; } load(false,false); },5000);
    unbinds.push(()=>{ if(timer){ clearInterval(timer); timer=null; } });
    ['onlineSearchName','onlineSearchMobile','onlineSearchAgent','onlineSearchBank'].forEach(id=>$(id)?.addEventListener('input',()=>{page=1;render()}));
    ['onlineSearchStatus','onlineSearchLock'].forEach(id=>$(id)?.addEventListener('change',()=>{page=1;render()}));
    $('onlineSearchBtn')?.addEventListener('click',()=>{page=1;render()}); $('onlineFilterResetBtn')?.addEventListener('click',reset); $('onlineManualRefreshBtn')?.addEventListener('click',()=>load(true,true)); $('onlineExportBtn')?.addEventListener('click',exportCsv);
    $('onlinePageSize')?.addEventListener('change',()=>{size=resolvePageSize($('onlinePageSize')?.value);page=1;render()});
    $('onlinePager')?.addEventListener('click',e=>{const b=e.target.closest('[data-online-page]');if(!b||b.disabled)return;page=Number(b.dataset.onlinePage)||1;render();document.querySelector('.user-main-table')?.scrollIntoView({behavior:'smooth',block:'start'});});
    let resizeTimer=null;
    listen(window,'resize',()=>{
      if(!isAutoPageSize($('onlinePageSize')?.value)) return;
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(()=>{const next=resolvePageSize('-'); if(next!==size){size=next;page=1;render();}},150);
    });
    listen(document,'visibilitychange',()=>{if(!document.hidden&&alive())load(false)}); listen(window,'focus',()=>{if(alive())load(false)});
  });
})();
