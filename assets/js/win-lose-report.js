(function(){
/* A swap re-runs this file and the router replays its DOMContentLoaded block, so the resize
   handler below was added once more per entry. Release the previous run's bindings first. */
if(window.__boWlrUnbind) window.__boWlrUnbind();
const unbinds=[];
const listen=(target,type,fn,opt)=>{ target.addEventListener(type,fn,opt); unbinds.push(()=>target.removeEventListener(type,fn,opt)); };
window.__boWlrUnbind=()=>{ unbinds.forEach(fn=>fn()); unbinds.length=0; };
let page=1,totalPages=1,totalElements=0,pageSize=20,pageSizeLock=null,autoRefined=false,providers=[],vipLevels=[];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number(v||0)||0, money=v=>num(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
async function api(url){const r=await fetch(url,{headers:BO_AUTH.authHeader()});const j=await r.json().catch(()=>({}));if(!r.ok||j.status==='error')throw new Error(j.message||'Request failed');return j;}
function today(){if(window.BO_FORMAT?.today)return BO_FORMAT.today();const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
/* Page-size resolution — the LISTING standard, not this page's own reading of it.
   The house semantics (assets/js/pagination-standardizer.js → resolvePageSize, which is
   what the ~130 non-report listings run, and the same shape casino-report.js /
   player-game-ranking.js already implement for the rest of the family) are:
     `-` / blank / `auto`  →  FIT the rows to the panel
     `All`                 →  everything
     a number              →  that number, defaulting to the fit if unparsable
   This page read `-` as a hard 20, so with the control on its house default the panel
   was over-filled and scrolled behind the pinned head — owner: "默认show - entries 的话
   可是仍然能scroll". `pageSizeLock` keeps one fit per session so the size cannot drift
   between loads; it is measured from the BODY scroller, subtracting the head only when
   the head is still inside it (report-table-split.js lifts it out at ≥992px). */
function isAutoPageSize(){const el=document.getElementById('wlPageSize');const v=String(el?el.value:'-').trim();return v===''||v==='-'||/^auto$/i.test(v)}
function measureAutoPageSize(){
  const wrap=document.querySelector('.table-card .table-wrap');
  if(!wrap)return null;
  const head=wrap.querySelector('thead');
  const headH=head?Math.ceil(head.getBoundingClientRect().height):0;
  const cell=wrap.querySelector('tbody tr td');
  if(!cell)return null;
  const rowH=Math.max(34,Math.round(cell.getBoundingClientRect().height))||41;
  return Math.max(5,Math.min(200,Math.floor((Math.floor(wrap.clientHeight)-headH)/rowH)||20));
}
function currentPageSize(){
  const raw=String(wlPageSize?.value??'-').trim();
  if(/^all$/i.test(raw))return 10000;
  if(isAutoPageSize()){
    if(pageSizeLock==null){const m=measureAutoPageSize();if(m==null)return 20;pageSizeLock=m;}
    return pageSizeLock;
  }
  const n=Number(raw);
  return Number.isFinite(n)&&n>0?n:20;
}
function providerCategories(p){return String(p.categoryIds||p.providerType||'').split(',').map(x=>x.trim().toUpperCase());}
function fillProviders(){const cat=document.getElementById('wlCategory').value;const el=document.getElementById('wlProvider');const list=!cat?providers:providers.filter(p=>providerCategories(p).includes(cat)||String(p.providerType||'').toUpperCase().includes(cat));el.innerHTML='<option value="">All game providers under the category</option>'+list.map(p=>`<option value="${esc(p.code)}">${esc(p.name||p.code)}</option>`).join('');}
async function initOptions(){const vip=document.getElementById('wlVip');try{const v=await api(API_CONFIG.BASE_URL+API_CONFIG.ENDPOINTS.VIP_LEVEL_LIST);vipLevels=(Array.isArray(v.data)?v.data:[]).filter(x=>Number(x.enabled)!==0).sort((a,b)=>Number(a.sortOrder||0)-Number(b.sortOrder||0));vip.innerHTML='<option value="">All VIP Tiers</option>'+vipLevels.map(x=>`<option value="${esc(x.sortOrder)}">VIP ${esc(x.sortOrder)} - ${esc(x.name||x.levelKey||'')}</option>`).join('');}catch(e){vip.innerHTML='<option value="">All VIP Tiers</option>';}try{const j=await api(API_CONFIG.BASE_URL+API_CONFIG.ENDPOINTS.GAME_PROVIDER_LIST);providers=Array.isArray(j.data)?j.data:(j.data?.content||[]);fillProviders();}catch(e){}}
function vipLabel(level){const n=Number(level||0),x=vipLevels.find(v=>Number(v.sortOrder||0)===n);return x?`VIP ${n} - ${x.name||x.levelKey||''}`:`VIP ${n}`;}
function params(){const q=new URLSearchParams({fromDate:wlFrom.value,toDate:wlTo.value,page,size:pageSize});if(wlCategory.value)q.set('category',wlCategory.value);if(wlProvider.value)q.set('providerCode',wlProvider.value);if(wlVip.value!=='')q.set('vipTier',wlVip.value);return q}
/* The locked ladder anatomy, identical to the other ten report pages and to the
   listings: First · Previous · numbered window (±2 around current, always 1 and the
   last, gaps > 1 collapsed to an ellipsis) · Next · Last, every rung on the family's
   `.smart-page` chrome (36px, 8px radius, amber active). This page used to emit
   classless `‹` / `›` buttons, which missed the rung geometry entirely — the family
   stylesheet sizes `.smart-page`, not `.pagination-clean button`. */
function renderPages(){const w=document.getElementById('wlPager');if(!w)return;const total=Math.max(1,Number(totalPages)||1);const current=Math.max(1,Math.min(Number(page)||1,total));const pages=[];const add=n=>{if(n>=1&&n<=total&&!pages.includes(n))pages.push(n)};add(1);for(let n=current-2;n<=current+2;n++)add(n);add(total);pages.sort((a,b)=>a-b);let html='';html+=`<button type="button" class="smart-page first" data-page="1" ${current<=1?'disabled':''} title="First page" aria-label="First page"><i class="bi bi-chevron-bar-left" aria-hidden="true"></i></button>`;html+=`<button type="button" class="smart-page nav-text" data-page="${current-1}" ${current<=1?'disabled':''} title="Previous page" aria-label="Previous page"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>`;let prev=0;pages.forEach(n=>{if(prev&&n-prev>1)html+='<span class="smart-page-ellipsis" aria-hidden="true">&hellip;</span>';html+=`<button type="button" class="smart-page${n===current?' active':''}" data-page="${n}" ${n===current?'aria-current="page"':''}>${n}</button>`;prev=n});html+=`<button type="button" class="smart-page nav-text" data-page="${current+1}" ${current>=total?'disabled':''} title="Next page" aria-label="Next page"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>`;html+=`<button type="button" class="smart-page last" data-page="${total}" ${current>=total?'disabled':''} title="Last page" aria-label="Last page"><i class="bi bi-chevron-bar-right" aria-hidden="true"></i></button>`;w.innerHTML=html}
function renderInfo(rowCount){const info=document.getElementById('wlPageInfo');if(!info)return;const from=totalElements&&rowCount?((page-1)*pageSize+1):0;const to=totalElements?Math.min((page-1)*pageSize+rowCount,totalElements):0;info.textContent=`Showing ${from} to ${to} of ${totalElements} entries`}
let wlLoadSeq=0;
async function load(){const loadSeq=++wlLoadSeq;pageSize=currentPageSize();try{const j=await api(API_CONFIG.BASE_URL+API_CONFIG.ENDPOINTS.WIN_LOSE_REPORT_LIST+'?'+params());if(loadSeq!==wlLoadSeq)return;const d=j.data||{}, rows=d.content||[], pg=d.pagination||{}, sum=d.summary||{};wlTotalBet.textContent=money(sum.total_bet||sum.totalBet);wlValidBet.textContent=money(sum.valid_bet||sum.validBet);wlWinLose.textContent=money(sum.win_lose||sum.winLose);wlMembers.textContent=Number(pg.totalElements||0).toLocaleString();wlBody.innerHTML=rows.length?rows.map((r,i)=>`<tr><td>${(page-1)*pageSize+i+1}</td><td><a href="member-detail.html?memberId=${encodeURIComponent(r.member_id||r.memberId)}"><b>${esc(r.username)}</b></a></td><td>${esc(vipLabel(r.vip_tier??r.vipTier??0))}</td><td>${money(r.total_bet||r.totalBet)}</td><td>${money(r.valid_bet||r.validBet)}</td><td><span class="status-pill ${num(r.win_lose||r.winLose)>=0?'active':'off'}">${money(r.win_lose||r.winLose)}</span></td></tr>`).join(''):'<tr><td colspan="6">No records found.</td></tr>';totalPages=Number(pg.totalPages)||1;totalElements=Number(pg.totalElements||0);renderPages();renderInfo(rows.length);
/* One refinement per session, the casino pages' pattern: the fit resolved before the
   request was measured from the placeholder row, so it is re-measured from real rows
   once they exist and the page is reloaded only if the two disagree. */
if(!autoRefined&&isAutoPageSize()){autoRefined=true;const fitted=measureAutoPageSize();if(fitted!=null&&fitted!==pageSize){pageSizeLock=fitted;page=1;return load();}}
}catch(e){if(loadSeq!==wlLoadSeq)return;totalPages=1;totalElements=0;wlBody.innerHTML=`<tr><td colspan="6" class="text-danger">${esc(e.message)}</td></tr>`;renderPages();renderInfo(0)}}
document.addEventListener('DOMContentLoaded',async()=>{wlFrom.value=wlTo.value=today();await initOptions();
// Every filter applies itself. The Search button is gone by owner request
// ("通常选中那些选项就自动输出数据了"), so the selects, the VIP tier and the
// date range each reload on change. The range picker commits by dispatching
// `change` on wlFrom *and* wlTo in the same task, so the reload is deferred one
// tick and collapsed — otherwise one date pick would fire two identical requests.
let queued=0;
// Collapse rapid preset/filter clicks into one request.  This also prevents the
// same control being clicked several times from making the listing visually jump.
const reload=()=>{clearTimeout(queued);queued=setTimeout(()=>{page=1;load()},120)};
wlCategory.addEventListener('change',()=>{fillProviders();reload()});wlProvider.addEventListener('change',reload);wlVip.addEventListener('change',reload);wlFrom.addEventListener('change',reload);wlTo.addEventListener('change',reload);wlPager.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(!b||b.disabled)return;const n=Number(b.dataset.page);if(n>=1&&n<=totalPages&&n!==page){page=n;load()}});wlPageSize.addEventListener('change',()=>{pageSizeLock=null;autoRefined=false;page=1;load()});load();
/* In auto mode the fit follows the panel: the family's other pages re-fit on resize
   (casino-report.js, player-game-ranking.js), so a window resize that changes how many
   rows fit re-requests that many instead of leaving the panel short or over-filled. */
let fitT=0;listen(window,'resize',()=>{if(!isAutoPageSize())return;clearTimeout(fitT);fitT=setTimeout(()=>{const prev=pageSizeLock;pageSizeLock=null;const next=currentPageSize();if(next!==prev){autoRefined=true;page=1;load()}else pageSizeLock=prev},250)});});
})();