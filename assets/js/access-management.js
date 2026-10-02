(function(){
  /* A swap re-runs this file against a fresh frame: the delegations in the lower half and the
     amber topbar observer were added again on each entry, so N entries meant N change/click/
     keydown copies (each one able to fire a permission sync or a role save twice). Release the
     previous run's bindings first. */
  if(window.__boAmUnbind) window.__boAmUnbind();
  const unbinds=[];
  const listen=(target,type,fn,opt)=>{ target.addEventListener(type,fn,opt); unbinds.push(()=>target.removeEventListener(type,fn,opt)); };
  window.__boAmUnbind=()=>{ unbinds.forEach(fn=>fn()); unbinds.length=0; };
  try{(JSON.parse(localStorage.getItem('bo_menu_group_meta_v1')||'[]')||[]).forEach(function(g){if(window.BO_MENU_GROUP_META&&g.groupKey)window.BO_MENU_GROUP_META[g.groupKey]={title:g.title,icon:g.icon,sortOrder:g.sortOrder};});}catch(e){}
  const page = document.body.dataset.accessPage;
  const isMerchantRolesPage = document.body.classList.contains('main-merchant-roles-page');
  const isMenuPermissionPage = page === 'menu-permission' || isMerchantRolesPage;
  /* ADMIN sidebar -> menu-permission.html: MAIN menus only (no BO tab / BO matrix). */
  const hideBoPermissionScope = page === 'menu-permission' && !isMerchantRolesPage;
  const roleStatusEl = document.getElementById('accessStatus');
  const GROUP_META = {
    root:{title:'Main Menu',icon:'bi-grid'}, access:{title:'Access Control',icon:'bi-shield-lock'},
    wallet:{title:'Wallet Management',icon:'bi-wallet2'}, agent_management_group:{title:'Agent Management',icon:'bi-person-workspace'}, report:{title:'Report',icon:'bi-bar-chart-line'},
    game:{title:'Game Management',icon:'bi-controller'}, bonus:{title:'Bonus Management',icon:'bi-gift'},
    design:{title:'Design',icon:'bi-palette'}, setting:{title:'Setting',icon:'bi-gear'}, support:{title:'Support',icon:'bi-headset'},
    main_reports_group:{title:'Reports',icon:'bi-file-earmark-bar-graph'}, main_accounting_group:{title:'Accounting & Provider Ops',icon:'bi-cash-stack'}, main_brands_group:{title:'Brands',icon:'bi-buildings'},
    main_admin_group:{title:'Admin',icon:'bi-shield-lock'}
  };
  const GROUP_ORDER=['root','main_reports_group','main_accounting_group','main_brands_group','main_admin_group','access','wallet','agent_management_group','report','game','bonus','design','setting','support'];
  const GROUP_BLURB={
    root:'Top-level pages and entry points',
    access:'Roles, menus, logs, and security gates',
    wallet:'Member funds, deposits, and payouts',
    agent_management_group:'Agent ops, commission, and settlement',
    report:'Operational and performance reports',
    game:'Providers, catalogues, and game ops',
    bonus:'Promotions, rebate, and VIP',
    design:'Site layout and creative surfaces',
    setting:'Frontend and compliance settings',
    support:'Live chat and support tools',
    main_reports_group:'MAIN executive reports',
    main_accounting_group:'Accounting and provider ops',
    main_brands_group:'Brand portfolio controls',
    main_admin_group:'MAIN administrator accounts and access'
  };
  let menuCache=[];
  let roleCache=[];
  let editingRoleType='';
  let mpBaselineIds=[];
  let mpWorkingIds=null; // Set<string> — full selection across Main/BO scopes
  let mpFilterQuery='';
  let mpScope=isMerchantRolesPage?'bo':'main'; // 'main' | 'bo'
  let mpOpenGroups=null; // null = all open (first render)
  const MAIN_GROUP_KEYS=new Set(['main_reports_group','main_accounting_group','main_brands_group','main_admin_group']);
  const GROUP_DESC=[
    [/dashboard|overview/i,'Core metrics, operational overviews & monitor charts'],
    [/admin/i,'Administrator accounts, roles & security gates'],
    [/access|permission|role/i,'System user profiles, menu endpoints, ACL & audit tracking'],
    [/business|operation/i,'Customer channels, providers, promotional banners & support'],
    [/account|settle|finance/i,'Provider balances, reconciliations & payout audit records'],
    [/report|analytic/i,'Aggregated transactional reports, Win/Lose figures & exports'],
    [/wallet/i,'Member funds, deposits, withdrawals & payment configuration'],
    [/agent/i,'Agent hierarchy, commission, settlement & payout'],
    [/game/i,'Providers, categories, game catalogue & effects'],
    [/bonus|promo/i,'Promotions, rebate programs & VIP tiers'],
    [/design|layout|site/i,'Site layout, sections & creative surfaces'],
    [/setting|config/i,'Frontend display, compliance & system settings'],
    [/support|chat/i,'Live chat rooms & template messages'],
    [/brand/i,'Brand portfolio, ownership & configuration']
  ];
  function pickByTitle(list,title,key){
    const hay=`${title||''} ${key||''}`;
    const hit=list.find(([re])=>re.test(hay));
    return hit?hit[1]:'';
  }
  function leadingNumber(title){
    const m=String(title||'').trim().match(/^(\d+)[.、\s]/);
    return m?m[1]:'';
  }
  const currentAdmin = (window.BO_AUTH && BO_AUTH.user) ? BO_AUTH.user() : {};
  const currentRoleType = String(currentAdmin?.roleType||'').toUpperCase();
  const mainAdmin = currentRoleType==='MAIN';
  // Role type is authoritative here. Do not let legacy/stale boolean flags make a MAIN
  // account behave like MASTER and expose protected platform roles.
  const rootAdmin = currentAdmin && !mainAdmin && (currentRoleType==='ROOT' || (Number(currentAdmin.id)===1 && currentAdmin.brandId==null));
  const masterAdmin = currentAdmin && !mainAdmin && !rootAdmin && currentRoleType==='MASTER';
  const tenantAdmin = currentAdmin && currentAdmin.brandId != null && !rootAdmin && !mainAdmin;
  const platformRoleAdmin = currentAdmin && !tenantAdmin && (rootAdmin || masterAdmin || mainAdmin || currentAdmin.brandId == null);
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function networkErrorMessage(err, fallback){
    const msg = String((err && err.message) || '');
    if(/failed to fetch|networkerror|load failed|network request failed/i.test(msg)){
      try{
        const host = String(location.hostname || '');
        if(host === 'localhost' || host === '127.0.0.1'){
          return 'Cannot reach local API (http://localhost:8080). Start the backend, or set localStorage.bo_api_base.';
        }
      }catch(e){}
      return 'Unable to reach server. Check network / Cloudflare protection and try again.';
    }
    return msg || fallback || 'Request failed';
  }
  function msg(el,text,cls){if(el){el.textContent=text||'';el.className='upload-status '+(cls||'');}}
  async function api(url,opt){
    try{
      const res=await fetch(url,opt||{});
      const j=await res.json().catch(()=>({}));
      if(!res.ok||j.status==='error') throw new Error(j.message||'Request failed');
      return j;
    }catch(e){
      throw new Error(networkErrorMessage(e, 'Request failed'));
    }
  }
  async function bootstrap(){try{await api(API_CONFIG.BASE_URL+API_CONFIG.ENDPOINTS.ACCESS_BOOTSTRAP,{headers:{...BO_AUTH.authHeader()}});}catch(e){}}
  function merchantScopeId(){
    if(!isMerchantRolesPage) return '';
    try{
      const q=new URLSearchParams(location.search||'').get('merchantId');
      if(q && Number(q)>0) return String(Number(q));
    }catch(e){}
    const saved=localStorage.getItem('bo_active_brand_id');
    return saved && Number(saved)>0 ? String(Number(saved)) : '';
  }
  async function fetchRoles(){
    // Merchant Roles & Permissions manages reusable/global Brand Owner templates.
    // Do not scope this request to the currently selected merchant: doing so hides
    // BRAND_OWNER roles whose brand_id is NULL (for example brand_owner_global).
    if(isMerchantRolesPage){
      const primary = BO_AUTH.roleListAllUrl ? BO_AUTH.roleListAllUrl() : BO_AUTH.roleListUrl();
      let j=await api(primary,{headers:{...BO_AUTH.authHeader()}});
      let rows=Array.isArray(j.data)?j.data:[];
      if(!rows.length && primary!==BO_AUTH.roleListUrl()){
        try{j=await api(BO_AUTH.roleListUrl(),{headers:{...BO_AUTH.authHeader()}});rows=Array.isArray(j.data)?j.data:[];}catch(e){}
      }
      return rows;
    }
    // Platform Role Management shows the existing platform catalogue.
    const primary = platformRoleAdmin && BO_AUTH.roleListAllUrl ? BO_AUTH.roleListAllUrl() : BO_AUTH.roleListUrl();
    let j=await api(primary,{headers:{...BO_AUTH.authHeader()}});
    let rows=Array.isArray(j.data)?j.data:[];
    if(!rows.length && primary!==BO_AUTH.roleListUrl()){
      try{j=await api(BO_AUTH.roleListUrl(),{headers:{...BO_AUTH.authHeader()}});rows=Array.isArray(j.data)?j.data:[];}catch(e){}
    }
    return rows;
  }

  async function fetchMenus(){
    const url=platformRoleAdmin&&BO_AUTH.menuListAllUrl?BO_AUTH.menuListAllUrl():BO_AUTH.menuListUrl();
    const j=await api(url,{headers:{...BO_AUTH.authHeader()}});
    return (j.data||[]).filter(m=>Number(m.status==null?1:m.status)===1);
  }
  async function fetchRoleMenuIds(roleId){const j=await api(BO_AUTH.roleMenusUrl(roleId),{headers:{...BO_AUTH.authHeader()}});return j.data?.menuIds||[];}
  function expandAdminMenuAliases(ids){
    // Persist exactly the menu rows selected in Role & Permissions. Do not add
    // hidden/legacy menu aliases in JavaScript; database role->menu mapping is authoritative.
    return Array.from(new Set((ids||[]).map(Number).filter(Number.isFinite)));
  }

  function groupMenus(menus){
    const groups={};
    menus.forEach(m=>{const key=(m.parentKey||'').trim()||'root';(groups[key]||(groups[key]=[])).push(m);});
    Object.values(groups).forEach(rows=>rows.sort((a,b)=>Number(a.sortOrder||0)-Number(b.sortOrder||0)||String(a.title||'').localeCompare(String(b.title||''))));
    return Object.keys(groups).sort((a,b)=>{const ai=GROUP_ORDER.indexOf(a),bi=GROUP_ORDER.indexOf(b);return (ai<0?999:ai)-(bi<0?999:bi)||a.localeCompare(b);}).map(key=>({key,rows:groups[key]}));
  }

  function isMainMenu(m){
    const parent=String((m&&m.parentKey)||'').trim().toLowerCase();
    const key=String((m&&m.menuKey)||'').trim().toLowerCase();
    const url=String((m&&m.url)||'').trim().toLowerCase().replace(/^\.\//,'');
    if(MAIN_GROUP_KEYS.has(parent) || parent.startsWith('main_')) return true;
    if(key.startsWith('main_') || key.startsWith('main-')) return true;
    if(/^main[-_]/.test(url) || url.startsWith('main-')) return true;
    return false;
  }
  function menusForScope(scope){
    const wantMain=String(scope||mpScope)==='main';
    return (menuCache||[]).filter(m=>isMainMenu(m)===wantMain);
  }
  function syncWorkingFromDom(){
    const roleOn=!!document.getElementById('menuPermissionRoleId')?.value;
    if(!roleOn){ mpWorkingIds=null; return; }
    if(!(mpWorkingIds instanceof Set)) mpWorkingIds=new Set();
    document.querySelectorAll('#menuPermissionCheckList .mp-menu-card input').forEach(input=>{
      const id=String(input.value);
      if(input.checked) mpWorkingIds.add(id);
      else mpWorkingIds.delete(id);
    });
  }
  function currentSelectionIds(){
    syncWorkingFromDom();
    return [...(mpWorkingIds instanceof Set ? mpWorkingIds : [])].map(Number).filter(Number.isFinite);
  }
  function setMpScope(scope){
    if(isMerchantRolesPage) scope='bo';
    if(hideBoPermissionScope) scope='main';
    const next=scope==='bo'?'bo':'main';
    if(next===mpScope) return;
    syncWorkingFromDom();
    mpScope=next;
    document.querySelectorAll('[data-mp-scope]').forEach(btn=>{
      const on=btn.getAttribute('data-mp-scope')===mpScope;
      btn.classList.toggle('is-active',on);
      btn.setAttribute('aria-selected',on?'true':'false');
    });
    mpOpenGroups=null;
    const roleOn=!!document.getElementById('menuPermissionRoleId')?.value;
    const ids=roleOn ? currentSelectionIds() : (mpWorkingIds instanceof Set ? [...mpWorkingIds].map(Number) : []);
    renderMenuPermissionMatrix(ids);
    applyMatrixInteractiveState();
  }

  function applyMainOnlyPermissionUi(){
    if(!hideBoPermissionScope) return;
    document.body.classList.add('mp-main-only');
    mpScope='main';
    const scopeWrap=document.querySelector('.mp-toolbar .mp-scope');
    if(scopeWrap){
      scopeWrap.hidden=true;
      scopeWrap.setAttribute('aria-hidden','true');
    }
    const boBtn=document.getElementById('menuPermissionScopeBo');
    if(boBtn){
      boBtn.hidden=true;
      boBtn.setAttribute('aria-hidden','true');
      boBtn.disabled=true;
    }
    const mainBtn=document.getElementById('menuPermissionScopeMain');
    if(mainBtn){
      mainBtn.hidden=true;
      mainBtn.setAttribute('aria-hidden','true');
      mainBtn.disabled=true;
    }
  }

  function currentPageFile(){
    return String(location.pathname||'').split('/').pop().toLowerCase()||'';
  }
  function menuFile(m){
    return String((m&&m.url)||'').trim().replace(/^\.\//,'').split('/').pop().split('#')[0].toLowerCase();
  }
  function menuBadge(m){
    const file=menuFile(m);
    const key=String((m&&m.menuKey)||'').toLowerCase();
    const url=String((m&&m.url)||'').toLowerCase();
    if(file && file===currentPageFile()) return {text:'CURRENT',cls:'is-current'};
    if(/root|master|super/.test(key)||/root-control/.test(url)) return {text:'SUPER',cls:'is-super'};
    if(/^role$|role_|roles/.test(key)) return {text:'ROLES',cls:'is-roles'};
    if(/log|audit|lock|whitelist/.test(key)) return {text:'AUDIT',cls:'is-audit'};
    if(/permission|access|admin_user|^admin$/.test(key)) return {text:'AUTH',cls:'is-auth'};
    if(/live_chat|livechat_room|^livechat$/.test(key)) return {text:'OP',cls:'is-op'};
    if(/online|realtime|real_time|main-dashboard/.test(key+url)) return {text:'LIVE',cls:'is-live'};
    if(/slider|banner|image|template|layout|section/.test(key)) return {text:'WRITE',cls:'is-write'};
    if(/report|dashboard|overview|stat|history|log/.test(key)) return {text:'GET',cls:'is-get'};
    if(/setting|config|customize|display|brand|timezone|social|compliance/.test(key)) return {text:'CONFIG',cls:'is-config'};
    return {text:'CRUD',cls:'is-crud'};
  }
  function groupMeta(key){
    const live=(window.BO_MENU_GROUP_META&&window.BO_MENU_GROUP_META[key])||{};
    const fallback=GROUP_META[key]||{};
    const title=live.title||fallback.title||String(key||'').replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    return {
      title,
      icon:live.icon||fallback.icon||'bi-folder2-open',
      blurb:pickByTitle(GROUP_DESC,title,key)||GROUP_BLURB[key]||'Sidebar category menus',
      num:leadingNumber(title)
    };
  }

  function renderPermissionGroupsInto(boxId,selected){
    const box=document.getElementById(boxId); if(!box)return;
    if(boxId==='menuPermissionCheckList'){
      renderMenuPermissionMatrix(selected);
      return;
    }
    const set=new Set((selected||[]).map(String));
    // Always render the complete active Menu Management catalogue for every editable role.
    // ROOT decides the permission assignment; role type must not silently hide menu choices.
    const visibleMenus=menuCache;
    box.innerHTML=groupMenus(visibleMenus).map(g=>{
      const meta=groupMeta(g.key);
      return `<section class="permission-group" data-permission-group="${esc(g.key)}">
        <div class="permission-group-head"><div class="permission-group-title"><i class="bi ${esc(meta.icon)}"></i><span>${esc(meta.title)}</span></div><label class="permission-group-toggle"><input type="checkbox" data-group-toggle="${esc(g.key)}"> Select group</label></div>
        <div class="permission-menu-grid">${g.rows.map(m=>`<label class="permission-item"><input type="checkbox" value="${esc(m.id)}" ${set.has(String(m.id))?'checked':''}><span><b><i class="bi ${esc(m.icon||'bi-circle')} me-1"></i>${esc(m.title)}</b><small>${esc(m.url)}${m.parentKey?' / '+esc(m.parentKey):''}</small></span></label>`).join('')}</div>
      </section>`;
    }).join('')||'<div class="permission-empty">No active menu found.</div>';
    syncGroupToggles();
  }

  function renderMenuPermissionMatrix(selected){
    const box=document.getElementById('menuPermissionCheckList'); if(!box)return;
    const set=new Set((selected||[]).map(String));
    if(document.getElementById('menuPermissionRoleId')?.value){
      mpWorkingIds=new Set(set);
    }
    const q=String(mpFilterQuery||'').trim().toLowerCase();
    const scoped=menusForScope(mpScope);
    const groups=groupMenus(scoped).map(g=>{
      const rows=q?g.rows.filter(m=>{
        const hay=`${m.title||''} ${m.url||''} ${m.menuKey||''} ${m.parentKey||''}`.toLowerCase();
        return hay.includes(q);
      }):g.rows.slice();
      return {...g,rows};
    }).filter(g=>g.rows.length);
    if(!groups.length){
      const emptyMsg=q
        ? 'No menus match this filter.'
        : (mpScope==='main' ? 'No Main menus found.' : 'No BO menus found.');
      box.innerHTML=`<div class="permission-empty">${emptyMsg}</div>`;
      syncGroupToggles();
      applyMatrixInteractiveState();
      updateMenuPermissionChrome();
      return;
    }
    if(mpOpenGroups===null){
      mpOpenGroups=new Set();
    }
    box.innerHTML=groups.map(g=>{
      const meta=groupMeta(g.key);
      const checked=g.rows.filter(m=>set.has(String(m.id))).length;
      const open=!!q || mpOpenGroups.has(g.key);
      return `<section class="mp-group${open?' is-open':''}" data-permission-group="${esc(g.key)}">
        <div class="mp-group-head">
          <button type="button" class="mp-group-toggle" data-mp-accordion aria-expanded="${open?'true':'false'}">
            <i class="bi bi-chevron-down mp-chevron" aria-hidden="true"></i>
            <span class="mp-group-icon"><i class="bi ${esc(meta.icon)}"></i></span>
            <span class="mp-group-copy">
              <strong>${esc(meta.title)}</strong>
              <small>${esc(meta.blurb)}</small>
            </span>
          </button>
          <div class="mp-group-side">
            <span class="mp-group-count" data-group-count>${checked} / ${g.rows.length} Selected</span>
            <label class="mp-group-select"><input type="checkbox" data-group-toggle="${esc(g.key)}"><span>Select Group</span></label>
          </div>
        </div>
        <div class="mp-group-body" ${open?'':'hidden'}>
          <div class="mp-menu-grid">${g.rows.map((m,i)=>{
            const badge=menuBadge(m);
            const on=set.has(String(m.id));
            const isCurrent=badge.cls==='is-current';
            const rawTitle=String(m.title||'');
            const numbered=meta.num && !/^\d+(\.\d+)?[.\s]/.test(rawTitle) ? `${meta.num}.${i+1} ${rawTitle}` : rawTitle;
            return `<label class="mp-menu-card${on?' is-checked':''}${isCurrent?' is-current':''}">
              <input type="checkbox" value="${esc(m.id)}" ${on?'checked':''}>
              <span class="mp-menu-card-main">
                <b>${esc(numbered)}</b>
                <small>/${esc(String(m.url||'').replace(/^\.?\//,''))}</small>
              </span>
              <em class="mp-menu-badge ${badge.cls}">${esc(badge.text)}</em>
            </label>`;
          }).join('')}</div>
        </div>
      </section>`;
    }).join('');
    syncGroupToggles();
    applyMatrixInteractiveState();
    updateMenuPermissionChrome();
  }

  function renderPermissionGroups(selected){renderPermissionGroupsInto('checkList',selected);}
  function syncGroupToggles(){
    document.querySelectorAll('[data-permission-group]').forEach(group=>{
      const items=[...group.querySelectorAll('.permission-item input, .mp-menu-card input')];
      const toggle=group.querySelector('[data-group-toggle]');
      if(!toggle)return;
      const checked=items.filter(x=>x.checked).length;
      toggle.checked=items.length>0&&checked===items.length;
      toggle.indeterminate=checked>0&&checked<items.length;
      const count=group.querySelector('[data-group-count]');
      if(count) count.textContent=`${checked} / ${items.length} Selected`;
      items.forEach(input=>{
        const card=input.closest('.mp-menu-card');
        if(card) card.classList.toggle('is-checked',input.checked);
      });
    });
  }

  function selectedMenuPermissionIds(){
    return currentSelectionIds();
  }
  function idsEqual(a,b){
    const aa=[...a].map(Number).filter(Number.isFinite).sort((x,y)=>x-y);
    const bb=[...b].map(Number).filter(Number.isFinite).sort((x,y)=>x-y);
    return aa.length===bb.length&&aa.every((v,i)=>v===bb[i]);
  }
  function dirtyCount(){
    const now=new Set(currentSelectionIds().map(String));
    const base=new Set(mpBaselineIds.map(String));
    let n=0;
    now.forEach(id=>{if(!base.has(id)) n++;});
    base.forEach(id=>{if(!now.has(id)) n++;});
    return n;
  }
  function setMenuPermissionControlsEnabled(on){
    ['menuPermissionFilter','menuPermissionToggleAll','menuPermissionSelectAll','menuPermissionClearAll']
      .forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=!on;});
  }
  function applyMatrixInteractiveState(){
    const roleOn=!!document.getElementById('menuPermissionRoleId')?.value;
    const matrix=document.getElementById('menuPermissionCheckList');
    if(matrix){
      matrix.classList.toggle('is-locked',!roleOn);
      matrix.querySelectorAll('input').forEach(x=>{x.disabled=!roleOn;});
    }
    setMenuPermissionControlsEnabled(roleOn);
  }
  function roleOptionLabel(role){
    return String(role?.name||role?.code||'Role').trim();
  }
  function syncRoleSelectLabels(selectedId){
    const select=document.getElementById('menuPermissionRoleSelect');
    if(!select) return;
    const want=selectedId==null?'':String(selectedId);
    [...select.options].forEach(opt=>{
      if(!opt.value){opt.textContent='Select role...';return;}
      const role=roleCache.find(r=>String(r.id)===String(opt.value));
      if(!role) return;
      opt.textContent=roleOptionLabel(role);
    });
    if(want && [...select.options].some(o=>String(o.value)===want)) select.value=want;
    else if(!want) select.value='';
    const wrap=select.closest('.rounded-select-wrap');
    if(wrap) wrap.dataset.boAutoWidth='1';
    if(window.BOSelectSync && typeof BOSelectSync.one==='function') BOSelectSync.one(select);
    else select.dispatchEvent(new Event('bo:select-sync',{bubbles:true}));
  }
  function updateScopeCounts(){
    const mainEl=document.getElementById('menuPermissionScopeMainCount');
    const boEl=document.getElementById('menuPermissionScopeBoCount');
    if(mainEl) mainEl.textContent=String(menusForScope('main').length);
    if(boEl) boEl.textContent=String(menusForScope('bo').length);
  }
  function updateMenuPermissionChrome(){
    const roleId=document.getElementById('menuPermissionRoleId')?.value||'';
    const role=roleCache.find(r=>String(r.id)===String(roleId));
    const total=menuCache.length;
    const assigned=roleId ? currentSelectionIds().length : 0;
    const pill=document.getElementById('menuPermissionAssignedPill');
    const pillText=document.getElementById('menuPermissionAssignedText');
    const footer=document.getElementById('menuPermissionFooter');
    const footerRole=document.getElementById('menuPermissionFooterRole');
    const footerDirty=document.getElementById('menuPermissionFooterDirty');
    const reset=document.getElementById('menuPermissionResetBtn');
    const save=document.getElementById('saveMenuPermissionBtn');
    syncRoleSelectLabels(roleId);
    updateScopeCounts();
    if(pill&&pillText){
      if(roleId){
        pill.hidden=false;
        const boCount=menusForScope('bo').filter(m=>mpWorkingIds&&mpWorkingIds.has(String(m.id))).length;
        if(isMerchantRolesPage){
          const boTotal=menusForScope('bo').length;
          pillText.textContent=`Assigned: ${boCount} / ${boTotal} Menus`;
        }else if(hideBoPermissionScope){
          const mainTotal=menusForScope('main').length;
          const mainCount=menusForScope('main').filter(m=>mpWorkingIds&&mpWorkingIds.has(String(m.id))).length;
          pillText.textContent=`Assigned: ${mainCount} / ${mainTotal} Menus`;
        }else{
          const mainCount=menusForScope('main').filter(m=>mpWorkingIds&&mpWorkingIds.has(String(m.id))).length;
          pillText.textContent=`Assigned: ${assigned} / ${total} Menus · Main ${mainCount} · BO ${boCount}`;
        }
      }else{
        pill.hidden=true;
      }
    }
    if(footer){
      footer.hidden=!roleId;
      document.body.classList.toggle('mp-footer-visible',!!roleId);
      if(footerRole) footerRole.textContent=roleId?(role?.name||role?.code||'Role'):'—';
      const dirty=roleId?dirtyCount():0;
      if(footerDirty){
        footerDirty.textContent=dirty?`${dirty} change${dirty===1?'':'s'} pending verification`:'No pending changes';
        footerDirty.classList.toggle('is-dirty',dirty>0);
      }
      if(reset) reset.disabled=!dirty;
      if(save) save.disabled=!roleId;
    }
    syncDeleteRoleButton();
  }
  function setGroupOpen(group,open){
    if(!group) return;
    const key=group.getAttribute('data-permission-group');
    group.classList.toggle('is-open',open);
    const btn=group.querySelector('[data-mp-accordion]');if(btn)btn.setAttribute('aria-expanded',open?'true':'false');
    const body=group.querySelector('.mp-group-body');if(body)body.hidden=!open;
    if(open) mpOpenGroups.add(key); else mpOpenGroups.delete(key);
  }
  function slugify(name){return String(name||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,60)||('group_'+Date.now());}

  function openModal(){const m=document.getElementById('roleCreateModal');m?.classList.add('show');document.body.classList.add('modal-open');setTimeout(()=>document.getElementById('name')?.focus(),50);}
  function closeModal(){const m=document.getElementById('roleCreateModal');m?.classList.remove('show');document.body.classList.remove('modal-open');msg(roleStatusEl,'','');}
  function resetModal(){
    document.getElementById('accessForm')?.reset();
    document.getElementById('roleEditId').value='';
    document.getElementById('roleEditCode').value='';
    const title=document.getElementById('roleModalTitle');
    const sub=document.getElementById('roleModalSubtitle');
    if(title) title.textContent=page==='menu-permission'?'Add Role':'Add Permission Group';
    if(sub) sub.textContent=page==='menu-permission'
      ?'Enter a role name and select its menu permissions.'
      :'Enter a group name and select its menu permissions.';
    renderPermissionGroups([]);
    msg(roleStatusEl,'','');
  }
  async function openCreate(){editingRoleType='';resetModal();openModal();}
  async function openEdit(roleId){
    const role=roleCache.find(r=>String(r.id)===String(roleId)); if(!role)return;
    editingRoleType=String(role.roleType||'').toUpperCase();
    const systemRole = Number(role.systemRole)===1;
    const roleType = String(role.roleType||'').toUpperCase();
    const editableSystemRole = systemRole && ((rootAdmin && roleType!=='ROOT') || (masterAdmin && roleType==='BRAND_OWNER'));
    if(systemRole && !editableSystemRole){msg(roleStatusEl,'This system role is protected.','error');return;}
    resetModal();document.getElementById('roleEditId').value=role.id;document.getElementById('roleEditCode').value=role.code||'';document.getElementById('name').value=role.name||'';
    /* Null-guarded like resetModal above: on the create/edit PAGE (role-create.html) there is no
       modal, and an unguarded write here threw before the permission fetch below - which is what
       left the page's matrix unchecked in edit mode while the name and id were already filled. */
    const mTitle=document.getElementById('roleModalTitle'),mSub=document.getElementById('roleModalSubtitle');
    if(mTitle) mTitle.textContent=editableSystemRole?'System Role Access':'Edit Permission Group';
    if(mSub) mSub.textContent=editableSystemRole?'Update the menu access for this system role. The role code/type remains protected.':'Update the group name or its menu permissions.';
    openModal();msg(roleStatusEl,'Loading permissions...','');
    try{let selected=await fetchRoleMenuIds(role.id);renderPermissionGroups(selected);msg(roleStatusEl,'','');}catch(e){msg(roleStatusEl,e.message,'error');}
  }

  async function loadRoleList(){
    const body=document.getElementById('accessTableBody'), cards=document.getElementById('roleMobileCards'); if(!body)return;
    try{
      roleCache=await fetchRoles();
      const details=await Promise.all(roleCache.map(async r=>{try{return {...r,permissionCount:(await fetchRoleMenuIds(r.id)).length};}catch(e){return {...r,permissionCount:0};}}));
      document.getElementById('roleCountBadge').textContent=`${details.length} Group${details.length===1?'':'s'}`;
      const editPage=document.body.dataset.roleEditPage;
      body.innerHTML=details.map(r=>{const rt=String(r.roleType||'').toUpperCase();const sys=Number(r.systemRole)===1;const canEditSystem=sys&&((rootAdmin&&rt!=='ROOT')||(masterAdmin&&rt==='BRAND_OWNER'));const action=sys?(canEditSystem?(editPage?'<a class="clean-btn role-edit-btn" href="'+editPage+'?roleId='+esc(r.id)+'"><i class="bi bi-sliders"></i> Edit Access</a>':'<button class="clean-btn role-edit-btn" type="button" data-edit-role="'+esc(r.id)+'"><i class="bi bi-sliders"></i> Edit Access</button>'):'<span class="status-pill active">Protected</span>'):(editPage?'<a class="clean-btn role-edit-btn" href="'+editPage+'?roleId='+esc(r.id)+'"><i class="bi bi-pencil-square"></i> Edit</a>':'<button class="clean-btn role-edit-btn" type="button" data-edit-role="'+esc(r.id)+'"><i class="bi bi-pencil-square"></i> Edit</button>');return `<tr data-ac-status="${r.status==1?'active':'suspended'}"><td><b>${esc(r.name)}</b></td><td><span class="role-code-pill">${esc(r.code)}</span><small class="role-type-label">${esc(r.roleType||'CUSTOM')}</small></td><td><span class="role-permission-count"><i class="bi bi-shield-check"></i>${r.permissionCount} Menu${r.permissionCount===1?'':'s'}</span></td><td>${r.status==1?'<span class="status-pill active">Active</span>':'<span class="status-pill off">Inactive</span>'}</td><td>${action}</td></tr>`;}).join('')||'<tr><td colspan="5">No permission group found.</td></tr>';
      if(cards)cards.innerHTML=details.map(r=>{const rt=String(r.roleType||'').toUpperCase();const sys=Number(r.systemRole)===1;const canEditSystem=sys&&((rootAdmin&&rt!=='ROOT')||(masterAdmin&&rt==='BRAND_OWNER'));const action=sys?(canEditSystem?(editPage?'<a class="clean-btn role-edit-btn w-100" href="'+editPage+'?roleId='+esc(r.id)+'"><i class="bi bi-sliders"></i> Edit Access</a>':'<button class="clean-btn role-edit-btn w-100" type="button" data-edit-role="'+esc(r.id)+'"><i class="bi bi-sliders"></i> Edit Access</button>'):'<span class="status-pill active">Protected</span>'):(editPage?'<a class="clean-btn role-edit-btn w-100" href="'+editPage+'?roleId='+esc(r.id)+'"><i class="bi bi-pencil-square"></i> Edit Group</a>':'<button class="clean-btn role-edit-btn w-100" type="button" data-edit-role="'+esc(r.id)+'"><i class="bi bi-pencil-square"></i> Edit Group</button>');return `<article class="member-mobile-card role-mobile-card"><div class="member-card-head"><div><strong>${esc(r.name)}</strong><small>${esc(r.code)}</small></div>${r.status==1?'<span class="status-pill active">Active</span>':'<span class="status-pill off">Inactive</span>'}</div><div class="member-card-grid"><div><span>Permissions</span><b>${r.permissionCount} Menus</b></div></div>${action}</article>`;}).join('');
    }catch(e){body.innerHTML=`<tr><td colspan="5">${esc(e.message)}</td></tr>`;if(cards)cards.innerHTML='';}
  }

  function canEditRoleMenus(role){
    const rt=String(role?.roleType||'').toUpperCase();
    const sys=Number(role?.systemRole)===1;
    if(!sys)return true;
    if(rootAdmin)return rt!=='ROOT';
    if(masterAdmin)return rt==='BRAND_OWNER';
    // MAIN/Boss can manage every permission group below ROOT. ROOT is the only
    // super-admin role that must never be shown or editable from MAIN.
    if(mainAdmin) return rt!=='ROOT';
    return false;
  }

  function canDeleteRole(role){
    if(!role) return false;
    if(!canEditRoleMenus(role)) return false;
    const rt=String(role.roleType||'').toUpperCase();
    if(['ROOT','MAIN','MASTER'].includes(rt)) return false;
    return true;
  }

  function syncDeleteRoleButton(){
    const btn=document.getElementById('menuPermissionDeleteRoleBtn');
    if(!btn) return;
    const roleId=document.getElementById('menuPermissionRoleId')?.value||'';
    const role=roleCache.find(r=>String(r.id)===String(roleId));
    if(!roleId || !role){
      btn.hidden=true;
      btn.disabled=true;
      btn.removeAttribute('data-role-id');
      btn.title='Delete role';
      return;
    }
    const allowed=canDeleteRole(role);
    btn.hidden=false;
    btn.disabled=!allowed;
    btn.dataset.roleId=String(role.id);
    btn.title=allowed
      ? ('Delete role "' + (role.name || role.code || 'Role') + '"')
      : 'System roles cannot be deleted';
  }

  async function deleteSelectedRole(){
    const status=document.getElementById('menuPermissionStatus');
    const roleId=document.getElementById('menuPermissionRoleId')?.value||'';
    const role=roleCache.find(r=>String(r.id)===String(roleId));
    if(!roleId || !role){
      msg(status,'Please select a role first.','error');
      return;
    }
    if(!canDeleteRole(role)){
      msg(status,'This system role is protected and cannot be deleted.','error');
      return;
    }
    const label=role.name || role.code || ('Role #' + role.id);
    let yes=false;
    if(window.BO_DIALOG && typeof BO_DIALOG.confirm==='function'){
      yes=await BO_DIALOG.confirm(
        'Delete role "' + label + '"?\n\nThis permanently removes the role and its menu permission assignments. Accounts still using this role may need to be reassigned first.',
        {title:'Delete Role',confirmText:'Delete',type:'danger'}
      );
    }else{
      yes=window.confirm('Delete role "' + label + '"?');
    }
    if(!yes) return;

    const btn=document.getElementById('menuPermissionDeleteRoleBtn');
    if(btn) btn.disabled=true;
    msg(status,'Deleting role...','');
    try{
      await api(BO_AUTH.roleDeleteUrl(role.id),{method:'POST',headers:{...BO_AUTH.authHeader()}});
      msg(status,'Role "' + label + '" deleted.','success');
      const select=document.getElementById('menuPermissionRoleSelect');
      if(select) select.value='';
      await loadMenuPermissionWorkspace();
    }catch(err){
      const raw=String(err?.message||'Unable to delete role.');
      // Fallback: soft-disable via ROLE_SAVE when hard-delete endpoint is unavailable.
      if(/404|405|not\s*found|unsupported|no\s*static\s*resource|method\s*not\s*allowed/i.test(raw)){
        try{
          await api(BO_AUTH.roleSaveUrl(),{
            method:'POST',
            headers:{'Content-Type':'application/json',...BO_AUTH.authHeader()},
            body:JSON.stringify({
              id:Number(role.id),
              name:role.name||label,
              code:role.code||('role_'+role.id),
              remark:role.remark||'',
              status:0
            })
          });
          msg(status,'Role "' + label + '" deleted.','success');
          const select=document.getElementById('menuPermissionRoleSelect');
          if(select) select.value='';
          await loadMenuPermissionWorkspace();
          return;
        }catch(softErr){
          const softMsg=String(softErr?.message||raw);
          if(window.BO_DIALOG&&BO_DIALOG.alert) BO_DIALOG.alert(softMsg,{title:'Delete Role Failed',type:'danger'});
          msg(status,softMsg,'error');
          return;
        }
      }
      if(window.BO_DIALOG&&BO_DIALOG.alert) BO_DIALOG.alert(raw,{title:'Delete Role Failed',type:'danger'});
      msg(status,raw,'error');
    }finally{
      syncDeleteRoleButton();
    }
  }

  async function loadMenuPermissionWorkspace(){
    const select=document.getElementById('menuPermissionRoleSelect');
    const list=document.getElementById('menuPermissionCheckList');
    if(!select||!list)return;
    try{
      roleCache=await fetchRoles();
      const editable=roleCache.filter(r=>{
        const rt=String(r?.roleType||'').toUpperCase();
        const active=Number(r?.status==null?1:r.status)===1;
        if(!active) return false;

        // Merchant Roles & Permissions is exclusively for reusable merchant-owner
        // permission templates. Never mix normal Admin/Main/Designer roles here.
        if(isMerchantRolesPage){
          const globalOwner = rt==='BRAND_OWNER' && r?.brandId == null && r?.brand_id == null && r?.merchantId == null;
          return globalOwner && canEditRoleMenus(r);
        }

        // MAIN/Boss sees all active platform/global roles maintained by ROOT, but
        // merchant Brand Owner roles stay inside Merchant Roles & Permissions.
        // ROOT/Super Admin is always hidden from MAIN.
        if(mainAdmin && !isMerchantRolesPage){
          const merchantOwner = rt==='BRAND_OWNER';
          return rt!=='ROOT' && !merchantOwner && canEditRoleMenus(r);
        }

        // For non-MAIN platform actors keep merchant-specific roles in the
        // merchant role workspace so the normal platform list stays clean.
        if(!isMerchantRolesPage){
          const merchantScoped = r?.brandId != null || r?.brand_id != null || r?.merchantId != null || rt==='BRAND_OWNER';
          if(merchantScoped) return false;
        }
        return canEditRoleMenus(r);
      }).sort((a,b)=>{
        const an=String(a?.name||a?.code||'').trim();
        const bn=String(b?.name||b?.code||'').trim();
        return an.localeCompare(bn, undefined, {sensitivity:'base', numeric:true});
      });
      select.innerHTML='<option value="">Select role...</option>'+editable.map(r=>`<option value="${esc(r.id)}">${esc(roleOptionLabel(r))}</option>`).join('');
      const roleWrap=select.closest('.rounded-select-wrap');
      if(roleWrap) roleWrap.dataset.boAutoWidth='1';
      if(window.BOSelectSync && typeof BOSelectSync.one==='function') BOSelectSync.one(select);
      mpBaselineIds=[];
      mpWorkingIds=null;
      mpFilterQuery='';
      mpScope=isMerchantRolesPage?'bo':'main';
      if(hideBoPermissionScope) mpScope='main';
      applyMainOnlyPermissionUi();
      document.querySelectorAll('[data-mp-scope]').forEach(btn=>{
        const on=btn.getAttribute('data-mp-scope')===mpScope;
        btn.classList.toggle('is-active',on);
        btn.setAttribute('aria-selected',on?'true':'false');
      });
      const filter=document.getElementById('menuPermissionFilter');if(filter)filter.value='';
      renderMenuPermissionMatrix([]);
      updateMenuPermissionChrome();
      const hint=document.getElementById('menuPermissionRoleHint');
      if(hint)hint.textContent=editable.length?'Select a role to load its assigned menus.':'No editable permission group is available for this account.';
      let preselect='';
      try{ preselect=String(new URLSearchParams(location.search||'').get('roleId')||''); }catch(e){}
      if(preselect && editable.some(r=>String(r.id)===preselect)){
        select.value=preselect;
        await loadSelectedMenuPermissionRole(preselect);
        try{
          const clean=isMerchantRolesPage?'main-merchant-roles.html':'menu-permission.html';
          history.replaceState({},'', clean);
        }catch(e){}
      }
    }catch(e){msg(document.getElementById('menuPermissionStatus'),e.message,'error');}
  }

  async function loadSelectedMenuPermissionRole(roleId){
    const status=document.getElementById('menuPermissionStatus');
    const hidden=document.getElementById('menuPermissionRoleId');
    const nextId=roleId?String(roleId):'';
    if(hidden) hidden.value=nextId;
    if(!nextId){
      mpBaselineIds=[];
      mpWorkingIds=null;
      mpFilterQuery='';
      const filter=document.getElementById('menuPermissionFilter');if(filter)filter.value='';
      renderMenuPermissionMatrix([]);
      updateMenuPermissionChrome();
      msg(status,'','');
      return;
    }
    const role=roleCache.find(r=>String(r.id)===String(nextId));
    if(!role||!canEditRoleMenus(role)){
      if(hidden) hidden.value='';
      renderMenuPermissionMatrix([]);
      updateMenuPermissionChrome();
      msg(status,'This role is protected.','error');
      return;
    }
    msg(status,'Loading menu permissions...','');
    try{
      const selected=await fetchRoleMenuIds(role.id);
      // Guard against stale async responses after the user switched roles.
      if(String(document.getElementById('menuPermissionRoleId')?.value||'')!==String(role.id)) return;
      mpBaselineIds=selected.map(Number).filter(Number.isFinite);
      mpWorkingIds=new Set(mpBaselineIds.map(String));
      mpOpenGroups=null;
      renderMenuPermissionMatrix(mpBaselineIds);
      updateMenuPermissionChrome();
      msg(status,'','');
    }catch(e){
      if(hidden) hidden.value='';
      renderMenuPermissionMatrix([]);
      updateMenuPermissionChrome();
      msg(status,e.message,'error');
    }
  }

  function resetMenuPermissionChanges(){
    mpWorkingIds=new Set(mpBaselineIds.map(String));
    renderMenuPermissionMatrix(mpBaselineIds);
    updateMenuPermissionChrome();
    msg(document.getElementById('menuPermissionStatus'),'Changes discarded.','');
  }

  async function saveMenuPermissions(e){
    e.preventDefault();
    const roleId=document.getElementById('menuPermissionRoleId').value;
    const status=document.getElementById('menuPermissionStatus');
    const btn=document.getElementById('saveMenuPermissionBtn');
    const ids=expandAdminMenuAliases(currentSelectionIds());
    if(!roleId){msg(status,'Please select a role.','error');return;}
    btn.disabled=true;msg(status,'Saving menu permissions...','');
    try{
      const saved=await api(BO_AUTH.roleMenusUrl(roleId),{method:'POST',headers:{'Content-Type':'application/json',...BO_AUTH.authHeader()},body:JSON.stringify({menuIds:ids})});
      const persisted=(saved.data?.menuIds||[]).map(Number).filter(Number.isFinite);
      const persistedSet=new Set(persisted);
      const missing=ids.filter(id=>!persistedSet.has(id));
      if(missing.length)throw new Error('Some selected menu permissions were rejected by the API.');
      mpBaselineIds=persisted;
      mpWorkingIds=new Set(persisted.map(String));
      renderMenuPermissionMatrix(persisted);
      updateMenuPermissionChrome();
      msg(status,'Menu permissions saved successfully.','success');
    }catch(err){msg(status,String(err?.message||'Unable to save menu permissions.'),'error');}
    finally{btn.disabled=false;updateMenuPermissionChrome();}
  }

  async function saveRole(e){
    e.preventDefault();
    const btn=document.getElementById('saveRoleBtn'), name=document.getElementById('name').value.trim(), editId=document.getElementById('roleEditId').value, oldCode=document.getElementById('roleEditCode').value;
    const ids=expandAdminMenuAliases([...document.querySelectorAll('#checkList .permission-item input:checked')].map(x=>Number(x.value)));
    if(!name){msg(roleStatusEl,'Group name is required.','error');return;}
    if(!ids.length){msg(roleStatusEl,'Please select at least one menu permission.','error');return;}
    btn.disabled=true;msg(roleStatusEl,'Saving group and permissions...','');
    try{
      const payload={name,code:editId?(oldCode||slugify(name)):slugify(name),remark:'',status:1};if(editId)payload.id=Number(editId);
      const editingRole=editId?roleCache.find(r=>String(r.id)===String(editId)):null;
      const protectedSystemEdit=!!(editingRole&&Number(editingRole.systemRole)===1);
      let roleId=editId;
      // System Role Access changes menu mappings only. Never rewrite protected role metadata
      // (name/code/type/status) just to update its permissions.
      if(!protectedSystemEdit){
        const saved=await api(BO_AUTH.roleSaveUrl(),{method:'POST',headers:{'Content-Type':'application/json',...BO_AUTH.authHeader()},body:JSON.stringify(payload)});
        roleId=saved.data?.id||editId;
        if(!roleId){const roles=await fetchRoles();roleId=roles.find(r=>r.code===payload.code)?.id;}
      }
      if(!roleId)throw new Error('Role saved but role ID was not returned.');
      const menuSave=await api(BO_AUTH.roleMenusUrl(roleId),{method:'POST',headers:{'Content-Type':'application/json',...BO_AUTH.authHeader()},body:JSON.stringify({menuIds:ids})});
      const persisted=(menuSave.data?.menuIds||[]).map(Number).filter(Number.isFinite);
      const requestedSet=new Set(ids.map(Number));
      const persistedSet=new Set(persisted);
      const missing=[...requestedSet].filter(id=>!persistedSet.has(id));
      if(missing.length){
        throw new Error('Some selected MAIN menu permissions were rejected by the API. Please deploy the matching Spring Boot permission fix and save again.');
      }
      msg(roleStatusEl,editId?'Group updated successfully.':'Group created successfully.','success');
      if(page==='menu-permission'){
        await loadMenuPermissionWorkspace();
        const select=document.getElementById('menuPermissionRoleSelect');
        if(select && roleId){
          select.value=String(roleId);
          await loadSelectedMenuPermissionRole(String(roleId));
        }
      }else{
        await loadRoleList();
      }
      setTimeout(closeModal,500);
    }catch(err){
      const raw=String(err?.message||'Unable to save the permission group.');
      const friendly=/duplicate entry|constraint|could not execute statement|sql \[/i.test(raw)
        ? 'Unable to update permissions. Please refresh and try again.'
        : raw;
      msg(roleStatusEl,friendly,'error');
    }finally{btn.disabled=false;}
  }

  listen(document,'change',e=>{
    if(e.target.matches('[data-group-toggle]')){
      const group=e.target.closest('[data-permission-group]');
      group.querySelectorAll('.permission-item input, .mp-menu-card input').forEach(x=>x.checked=e.target.checked);
      syncGroupToggles();
      if(document.body.dataset.accessPage==='menu-permission' || document.body.classList.contains('main-merchant-roles-page')){
        syncWorkingFromDom();
        updateMenuPermissionChrome();
      }
    }
    if(e.target.matches('.permission-item input, .mp-menu-card input')){
      syncGroupToggles();
      if(document.body.dataset.accessPage==='menu-permission' || document.body.classList.contains('main-merchant-roles-page')){
        syncWorkingFromDom();
        updateMenuPermissionChrome();
      }
    }
  });
  listen(document,'click',e=>{
    if(e.target.closest('#openRoleModalBtn'))openCreate();
    const edit=e.target.closest('[data-edit-role]');if(edit)openEdit(edit.dataset.editRole);
    if(e.target.closest('#menuPermissionDeleteRoleBtn')){
      e.preventDefault();
      deleteSelectedRole();
      return;
    }
    if(e.target.closest('[data-close-role-modal]'))closeModal();
    if(e.target.id==='roleCreateModal')closeModal();
    const accordion=e.target.closest('[data-mp-accordion]');
    if(accordion){
      const group=accordion.closest('.mp-group');
      if(group) setGroupOpen(group,!group.classList.contains('is-open'));
    }
  });
  listen(document,'keydown',e=>{if(e.key!=='Escape')return;if(document.getElementById('roleCreateModal')?.classList.contains('show'))closeModal();});

  function viewerRoleLabel(){
    const user = (window.BO_AUTH && typeof BO_AUTH.user === 'function') ? (BO_AUTH.user() || {}) : {};
    const type = String(user.roleType || user.role || '').toUpperCase();
    if(user.rootAdmin === true || Number(user.rootAdmin) === 1 || type === 'ROOT') return 'Root';
    if(type === 'MAIN' || user.mainAdmin === true || Number(user.mainAdmin) === 1) return 'Superadmin';
    if(type === 'MASTER') return 'Master';
    if(type === 'BRAND_OWNER') return 'Brand Owner';
    if(user.role) return String(user.role);
    return 'Admin';
  }

  function enhanceAmberTopbarProfile(){
    const pageEl = document.body;
    if(!pageEl || !pageEl.classList.contains('menu-permission-page')) return;
    const host = pageEl.querySelector('.report-actions [data-bo-profile]');
    if(!host) return;
    const link = host.querySelector('a.bo-account-link');
    if(!link) return;

    const href = String(link.getAttribute('href') || '');
    if(!href || href === '#' || href === 'profile.html'){
      link.setAttribute('href', 'profile.html#password');
    }
    link.style.pointerEvents = 'auto';
    link.style.cursor = 'pointer';
    link.setAttribute('title', 'Account settings / Change password');
    link.setAttribute('aria-label', 'Open account settings and change password');

    const already = link.classList.contains('is-mp-amber-profile')
      && link.querySelector('.bo-account-meta')
      && link.querySelector('.report-avatar i.bi-person');
    if(already){
      const roleEl = link.querySelector('[data-admin-role]');
      const nextRole = viewerRoleLabel();
      if(roleEl && roleEl.textContent !== nextRole) roleEl.textContent = nextRole;
      return;
    }

    const avatar = link.querySelector('.report-avatar');
    let name = link.querySelector('.bo-account-name');
    const gear = link.querySelector('.bo-account-setting-icon');
    if(gear) gear.setAttribute('hidden', '');

    let meta = link.querySelector('.bo-account-meta');
    if(!meta && name){
      meta = document.createElement('span');
      meta.className = 'bo-account-meta';
      name.replaceWith(meta);
      meta.appendChild(name);
    }
    name = link.querySelector('.bo-account-name');

    let role = link.querySelector('[data-admin-role]');
    if(!role && meta){
      role = document.createElement('span');
      role.className = 'bo-account-role';
      role.setAttribute('data-admin-role', '');
      meta.appendChild(role);
    }
    if(role) role.textContent = viewerRoleLabel();

    if(avatar){
      avatar.removeAttribute('data-admin-avatar');
      if(!avatar.querySelector('i.bi-person')){
        avatar.textContent = '';
        const icon = document.createElement('i');
        icon.className = 'bi bi-person';
        icon.setAttribute('aria-hidden', 'true');
        avatar.appendChild(icon);
      }
      if(meta && (meta.parentNode !== link || avatar.previousElementSibling !== meta)){
        link.appendChild(meta);
        link.appendChild(avatar);
      }
    }

    link.classList.add('is-mp-amber-profile');
  }

  function bindAmberTopbarProfile(){
    enhanceAmberTopbarProfile();
    const host = document.querySelector('.report-actions [data-bo-profile]');
    if(!host || host.dataset.mpAmberObserved === '1') return;
    host.dataset.mpAmberObserved = '1';
    let scheduled = false;
    const run = function(){
      if(scheduled) return;
      scheduled = true;
      requestAnimationFrame(function(){
        scheduled = false;
        enhanceAmberTopbarProfile();
      });
    };
    const obs = new MutationObserver(run);
    obs.observe(host, { childList: true });
    unbinds.push(() => obs.disconnect());
    listen(document,'bo:profile-updated', run);
    setTimeout(enhanceAmberTopbarProfile, 80);
    setTimeout(enhanceAmberTopbarProfile, 400);
  }

  document.addEventListener('DOMContentLoaded',async()=>{
    bindAmberTopbarProfile();
    await bootstrap();
    if(page==='role'){
      try{menuCache=await fetchMenus();renderPermissionGroups([]);await loadRoleList();}catch(e){msg(roleStatusEl,e.message,'error');}
      const accessFormEl=document.getElementById('accessForm');
      if(accessFormEl) accessFormEl.onsubmit=saveRole;
      const selectAllBtn=document.getElementById('selectAllPermission');
      if(selectAllBtn) selectAllBtn.onclick=()=>{document.querySelectorAll('#checkList .permission-item input').forEach(x=>x.checked=true);syncGroupToggles();};
      const clearAllBtn=document.getElementById('clearAllPermission');
      if(clearAllBtn) clearAllBtn.onclick=()=>{document.querySelectorAll('#checkList .permission-item input').forEach(x=>x.checked=false);syncGroupToggles();};
    }
    if(isMenuPermissionPage){
      applyMainOnlyPermissionUi();
      try{
        if(isMerchantRolesPage && window.MERCHANT_ROLE_SCOPE_READY){
          await window.MERCHANT_ROLE_SCOPE_READY;
        }
        menuCache=await fetchMenus();
        await loadMenuPermissionWorkspace();
      }catch(e){msg(document.getElementById('menuPermissionStatus'),e.message,'error');}
      const form=document.getElementById('menuPermissionForm');if(form)form.onsubmit=saveMenuPermissions;
      const select=document.getElementById('menuPermissionRoleSelect');
      if(select){
        const onRoleChange=()=>loadSelectedMenuPermissionRole(select.value);
        select.addEventListener('change',onRoleChange);
        select.addEventListener('input',onRoleChange);
      }
      const filter=document.getElementById('menuPermissionFilter');
      if(filter){
        filter.addEventListener('input',()=>{
          syncWorkingFromDom();
          mpFilterQuery=filter.value||'';
          const roleOn=!!document.getElementById('menuPermissionRoleId')?.value;
          renderMenuPermissionMatrix(roleOn ? currentSelectionIds() : []);
        });
      }
      if(!isMerchantRolesPage && !hideBoPermissionScope){
        document.querySelectorAll('[data-mp-scope]').forEach(btn=>{
          btn.addEventListener('click',()=>{
            if(btn.disabled) return;
            setMpScope(btn.getAttribute('data-mp-scope')||'main');
          });
        });
      }
      document.getElementById('menuPermissionCheckList')?.addEventListener('click',function(e){
        if(document.getElementById('menuPermissionRoleId')?.value) return;
        const hit=e.target.closest('.mp-menu-card, .mp-group-select, input');
        if(!hit) return;
        e.preventDefault();
        msg(document.getElementById('menuPermissionStatus'),'Select a role above before editing permissions.','error');
        const btn=document.querySelector('.mp-role-row .rounded-select-btn');
        if(btn){
          btn.classList.add('is-attention');
          btn.focus();
          try{ btn.click(); }catch(err){}
          window.setTimeout(function(){ btn.classList.remove('is-attention'); },1800);
        }
      },true);
      document.getElementById('menuPermissionToggleAll')?.addEventListener('click',()=>{
        const groups=[...document.querySelectorAll('#menuPermissionCheckList .mp-group')];
        const openCount=groups.filter(g=>g.classList.contains('is-open')).length;
        const makeOpen=openCount < groups.length/2;
        groups.forEach(g=>setGroupOpen(g,makeOpen));
      });
      document.getElementById('menuPermissionSelectAll')?.addEventListener('click',()=>{
        document.querySelectorAll('#menuPermissionCheckList .mp-menu-card input:not(:disabled)').forEach(x=>x.checked=true);
        syncGroupToggles();syncWorkingFromDom();updateMenuPermissionChrome();
      });
      document.getElementById('menuPermissionClearAll')?.addEventListener('click',()=>{
        document.querySelectorAll('#menuPermissionCheckList .mp-menu-card input:not(:disabled)').forEach(x=>x.checked=false);
        syncGroupToggles();syncWorkingFromDom();updateMenuPermissionChrome();
      });
      document.getElementById('menuPermissionResetBtn')?.addEventListener('click',resetMenuPermissionChanges);
    }
    if(page==='account-lock')loadAccountLock();
  });

  async function loadAccountLock(){const body=document.getElementById('lockTableBody');try{const rows=(await api(BO_AUTH.memberListUrl(),{headers:{...BO_AUTH.authHeader()}})).data||[];body.innerHTML=rows.map(m=>`<tr><td><b>${esc(m.username)}</b><br><small>${esc(m.fullName||m.mobile)}</small></td><td>${m.locked==1?'<span class="status-pill off">Locked</span>':'<span class="status-pill active">Normal</span>'}</td><td><button class="clean-btn" data-lock-id="${m.id}" data-lock="${m.locked==1?0:1}">${m.locked==1?'Unlock':'Lock'}</button></td></tr>`).join('')||'<tr><td colspan="3">No member.</td></tr>';}catch(e){body.innerHTML='<tr><td colspan="3">'+esc(e.message)+'</td></tr>';}}
  listen(document,'click',async e=>{const b=e.target.closest('[data-lock-id]');if(!b)return;await api(BO_AUTH.memberUpdateUrl(b.dataset.lockId),{method:'POST',headers:{'Content-Type':'application/json',...BO_AUTH.authHeader()},body:JSON.stringify({locked:Number(b.dataset.lock)})});loadAccountLock();});
})();
