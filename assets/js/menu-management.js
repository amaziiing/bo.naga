(function(){
  /* A swap re-runs this file; the router replays the DOMContentLoaded block below, so the two
     delegated listeners inside it (row edit/delete/expand and the keyboard expand) were added
     again on each entry. Release the previous run's bindings first. */
  if(window.__boMenuUnbind) window.__boMenuUnbind();
  const unbinds=[];
  const listen=(target,type,fn,opt)=>{ target.addEventListener(type,fn,opt); unbinds.push(()=>target.removeEventListener(type,fn,opt)); };
  window.__boMenuUnbind=()=>{ unbinds.forEach(fn=>fn()); unbinds.length=0; };
  let rows=[],groups=[];
  let activePanel='MAIN';
  let nmMode='group'; // 'item' | 'group'
  let returnToItemAfterGroup=false;
  const PANEL_KEY='bo_menu_mgmt_panel';
  const TREE_EXPAND_KEY='bo_menu_tree_expand_v1';
  const MAIN_GROUP_KEYS=new Set(['root','main_reports_group','main_accounting_group','main_brands_group','main_admin_group']);
  const $=id=>document.getElementById(id);
  let expandedGroups=loadExpandedGroups();

  function loadExpandedGroups(){
    try{
      // Drop legacy collapse map so default stays closed.
      sessionStorage.removeItem('bo_menu_tree_collapse_v1');
      const raw=sessionStorage.getItem(TREE_EXPAND_KEY);
      const parsed=raw?JSON.parse(raw):{};
      return parsed&&typeof parsed==='object'?parsed:{};
    }catch(e){return {};}
  }
  function saveExpandedGroups(){
    try{sessionStorage.setItem(TREE_EXPAND_KEY,JSON.stringify(expandedGroups));}catch(e){}
  }
  function isGroupCollapsed(key){
    // Default closed: only keys explicitly opened stay expanded.
    return !expandedGroups[String(key||'')];
  }
  function toggleGroupCollapse(key){
    const k=String(key||'');
    if(!k) return;
    if(expandedGroups[k]) delete expandedGroups[k];
    else expandedGroups[k]=1;
    saveExpandedGroups();
    render();
  }
  function sortRank(v){
    if(v==null||v==='') return Number.POSITIVE_INFINITY;
    const n=Number(v);
    // 0 / NaN / non-finite → push to bottom; positive sorts ascend normally
    if(!Number.isFinite(n)||n===0) return Number.POSITIVE_INFINITY;
    return n;
  }
  /** Read sort without treating 0 as missing (unlike `x||fallback`). */
  function readSort(v, emptyFallback){
    if(v==null||v==='') return emptyFallback;
    const n=Number(v);
    return Number.isFinite(n)?n:emptyFallback;
  }
  function sortByOrderThenTitle(a,b){
    return sortRank(a.sortOrder)-sortRank(b.sortOrder)||String(a.title||'').localeCompare(String(b.title||''));
  }
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function slug(v){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,100);}
  /** Safe Bootstrap icon class only — blocks title= injection from icon field. */
  function iconClass(v){
    let s=String(v==null?'':v).trim();
    if(!s) return 'bi bi-circle';
    s=s.replace(/^bi\s+/i,'').split(/\s+/)[0];
    if(!s.startsWith('bi-')) s='bi-'+s.replace(/^bi-?/i,'');
    s=s.toLowerCase().replace(/[^a-z0-9-]/g,'');
    if(!/^bi-[a-z0-9-]+$/.test(s)) s='bi-circle';
    return 'bi '+s;
  }
  async function api(url,opt){const r=await fetch(url,opt||{}),j=await r.json().catch(()=>({}));if(!r.ok||j.status==='error')throw new Error(j.message||'Request failed');return j;}
  function status(id,text,type){const e=$(id);if(!e)return;e.textContent=text||'';e.className='upload-status '+(type||'');}
  function groupName(k){if(!k)return 'Top-level';const g=groups.find(x=>String(x.groupKey)===String(k));return g?g.title:String(k).replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}

  function isMainGroupKey(key){
    const k=String(key||'').trim().toLowerCase();
    if(!k) return false;
    return MAIN_GROUP_KEYS.has(k) || k.startsWith('main_');
  }

  function menuPanel(m){
    const explicit=String((m&&(m.panel||m.side||m.scope))||'').trim().toUpperCase();
    if(explicit==='MAIN'||explicit==='BO') return explicit;
    const parent=String((m&&m.parentKey)||'').trim().toLowerCase();
    const key=String((m&&m.menuKey)||'').trim().toLowerCase();
    const url=String((m&&m.url)||'').trim().replace(/^\.\//,'').toLowerCase();
    if(isMainGroupKey(parent)) return 'MAIN';
    if(key.startsWith('main_')||key==='root_control') return 'MAIN';
    if(url.startsWith('main-')||url==='root-control.html') return 'MAIN';
    return 'BO';
  }

  function filteredMenus(){
    return rows.filter(m=>menuPanel(m)===activePanel);
  }

  function filteredGroups(){
    return groups.filter(g=>{
      const key=String(g.groupKey||'').trim().toLowerCase();
      const isMain=isMainGroupKey(key);
      return activePanel==='MAIN' ? isMain : !isMain;
    });
  }

  function syncTabUi(){
    document.querySelectorAll('[data-menu-panel]').forEach(btn=>{
      const on=btn.getAttribute('data-menu-panel')===activePanel;
      btn.classList.toggle('active',on);
      btn.setAttribute('aria-selected',on?'true':'false');
    });
    const mainN=rows.filter(m=>menuPanel(m)==='MAIN').length;
    const boN=rows.filter(m=>menuPanel(m)==='BO').length;
    if($('menuTabMainCount')) $('menuTabMainCount').textContent=String(mainN);
    if($('menuTabBoCount')) $('menuTabBoCount').textContent=String(boN);
  }

  function normalizePanel(panel){
    return String(panel||'').toUpperCase()==='BO' ? 'BO' : 'MAIN';
  }

  function setPanel(panel){
    activePanel=normalizePanel(panel);
    try{sessionStorage.setItem(PANEL_KEY,activePanel);}catch(e){}
    syncTabUi();
    render();
    renderGroupSelect();
    updateLivePreview();
  }

  function renderGroupSelect(selected){
    const sel=$('menuParent');
    if(!sel) return;
    const value=selected==null?sel.value:String(selected);
    const opts=filteredGroups().filter(g=>Number(g.status)===1)
      .sort(sortByOrderThenTitle);
    sel.innerHTML='<option value="">Top-level</option>'+
      opts.map(g=>`<option value="${esc(g.groupKey)}">${esc(g.title)}</option>`).join('');
    if(value && [...sel.options].some(o=>o.value===value)) sel.value=value;
    else sel.value='';
  }

  function statusPill(active){
    return Number(active)===1
      ? '<span class="status-pill active">Active</span>'
      : '<span class="status-pill off">Inactive</span>';
  }

  function actionBtns(opts){
    const {editAttr,editVal,delAttr,delVal,editLabel,delTitle}=opts;
    return `<div class="d-flex gap-2 flex-wrap justify-content-center"><button class="clean-btn" ${editAttr}="${esc(editVal)}"><i class="bi bi-pencil-square"></i> ${esc(editLabel||'Edit')}</button><button class="clean-btn danger" ${delAttr}="${esc(delVal)}" title="${esc(delTitle||'Delete')}"><i class="bi bi-trash3"></i></button></div>`;
  }

  /** Tree roots matching sidebar: top-level items + groups (incl. empty), plus orphan parents. */
  function buildMenuTree(){
    const list=filteredMenus();
    const groupList=filteredGroups();
    const byParent={};
    const topItems=[];
    list.forEach(m=>{
      const pk=String(m.parentKey||'').trim();
      if(pk) (byParent[pk]=byParent[pk]||[]).push(m);
      else topItems.push(m);
    });
    Object.keys(byParent).forEach(k=>{
      byParent[k].sort(sortByOrderThenTitle);
    });

    const used=new Set();
    const roots=[];

    topItems.forEach(m=>{
      roots.push({
        kind:'item',
        id:m.id,
        title:m.title,
        icon:m.icon||'bi-circle',
        sortOrder:readSort(m.sortOrder,0),
        menu:m
      });
    });

    groupList.forEach(g=>{
      const key=String(g.groupKey||'').trim();
      if(!key) return;
      used.add(key);
      const children=byParent[key]||[];
      roots.push({
        kind:'group',
        id:g.id,
        groupKey:key,
        title:g.title,
        icon:g.icon||'bi-folder',
        sortOrder:readSort(g.sortOrder,0),
        status:g.status,
        group:g,
        children
      });
    });

    Object.keys(byParent).forEach(key=>{
      if(used.has(key)) return;
      const children=byParent[key]||[];
      const ranks=children.map(x=>sortRank(x.sortOrder)).filter(n=>Number.isFinite(n)&&n!==Number.POSITIVE_INFINITY);
      const minSort=ranks.length?Math.min.apply(null,ranks):Number.POSITIVE_INFINITY;
      roots.push({
        kind:'orphan',
        id:null,
        groupKey:key,
        title:groupName(key),
        icon:'bi-folder',
        sortOrder:ranks.length?minSort:0,
        status:1,
        group:null,
        children
      });
    });

    roots.sort(sortByOrderThenTitle);
    return {roots, list, groupList};
  }

  function treeToggleBtn(groupKey, childCount, collapsed){
    if(!childCount){
      return `<span class="menu-tree-toggle is-empty" aria-hidden="true"></span>`;
    }
    return `<span class="menu-tree-toggle${collapsed?' is-collapsed':''}" aria-hidden="true"><i class="${iconClass('bi-chevron-'+(collapsed?'right':'down'))}"></i></span>`;
  }

  function menuNameCell(opts){
    const {icon,title,sub,pill,depth,toggleHtml}=opts;
    const depthClass=depth?` menu-tree-depth-${depth}`:'';
    const gutter=toggleHtml||'<span class="menu-tree-toggle is-spacer" aria-hidden="true"></span>';
    const meta=pill?`<div class="menu-name-meta">${pill}</div>`:'';
    return `<div class="menu-name-cell${depthClass}"><span class="menu-tree-gutter">${gutter}</span><i class="${iconClass(icon)}" aria-hidden="true"></i><div class="menu-name-text"><b>${esc(title)}</b><small>${esc(sub||'')}</small></div>${meta}</div>`;
  }

  function renderMenuRow(m, depth, parentTitle){
    const isChild=!!depth;
    const parentCell=isChild
      ? `<span class="menu-parent-chip">${esc(parentTitle||groupName(m.parentKey))}</span>`
      : `<span class="menu-parent-chip top">Top-level</span>`;
    const typePill=isChild?'':'<span class="menu-type-pill item">Page</span>';
    return `<tr class="menu-row-item${isChild?' menu-row-child':''}" data-parent-key="${esc(m.parentKey||'')}">
      <td>${menuNameCell({
        icon:m.icon||'bi-circle',
        title:m.title,
        sub:m.menuKey,
        pill:typePill,
        depth:isChild?1:0,
        toggleHtml:'<span class="menu-tree-toggle is-spacer" aria-hidden="true"></span>'
      })}</td>
      <td><span class="menu-url-code">${esc(m.url)}</span></td>
      <td>${parentCell}</td>
      <td>${readSort(m.sortOrder,0)}</td>
      <td>${statusPill(m.status)}</td>
      <td>${actionBtns({editAttr:'data-edit-menu',editVal:m.id,delAttr:'data-delete-menu',delVal:m.id,delTitle:'Delete menu'})}</td>
    </tr>`;
  }

  function renderGroupRow(node){
    const key=node.groupKey;
    const children=node.children||[];
    const collapsed=isGroupCollapsed(key);
    const editable=node.kind==='group'&&node.id!=null;
    const pill=node.kind==='orphan'
      ? '<span class="menu-type-pill orphan">Unregistered</span>'
      : '<span class="menu-type-pill group">Group</span>';
    const childHint=children.length
      ? `<span class="menu-child-count">${children.length}</span>`
      : '<span class="menu-child-count is-zero">0</span>';
    const actions=editable
      ? actionBtns({editAttr:'data-edit-group',editVal:node.id,delAttr:'data-delete-group',delVal:node.id,delTitle:'Delete group'})
      : `<span class="menu-url-muted">Register via New Menu → Group</span>`;

    const canToggle=children.length>0;
    const rowToggle=canToggle
      ? ` data-toggle-group="${esc(key)}" aria-expanded="${collapsed?'false':'true'}" title="${collapsed?'Click to expand':'Click to collapse'}"`
      : '';
    const groupTr=`<tr class="menu-row-group${collapsed?' is-collapsed':''}${canToggle?' is-toggleable':''}" data-group-key="${esc(key)}"${rowToggle}>
      <td>${menuNameCell({
        icon:node.icon||'bi-folder',
        title:node.title,
        sub:key,
        pill:pill+childHint,
        depth:0,
        toggleHtml:treeToggleBtn(key,children.length,collapsed)
      })}</td>
      <td><span class="menu-url-muted">Sidebar category</span></td>
      <td><span class="menu-parent-chip top">Top-level</span></td>
      <td>${readSort(node.sortOrder,0)}</td>
      <td>${statusPill(node.status)}</td>
      <td>${actions}</td>
    </tr>`;

    if(!children.length||collapsed) return groupTr;

    const childRows=children.map(m=>renderMenuRow(m,1,node.title)).join('');
    return groupTr+childRows;
  }

  function render(){
    const {roots, list, groupList}=buildMenuTree();
    syncTabUi();
    const parts=[];
    if(groupList.length) parts.push(`${groupList.length} Group${groupList.length===1?'':'s'}`);
    parts.push(`${list.length} Menu${list.length===1?'':'s'}`);
    $('menuCountBadge').textContent=parts.join(' · ');

    const tableRows=roots.map(node=>{
      if(node.kind==='item') return renderMenuRow(node.menu,0,'');
      return renderGroupRow(node);
    }).join('');
    $('menuTableBody').innerHTML=tableRows||'<tr><td colspan="6">No menu records found.</td></tr>';

    const cards=[];
    roots.forEach(node=>{
      if(node.kind==='item'){
        const m=node.menu;
        cards.push(`<article class="member-mobile-card menu-mobile-card"><div class="member-card-head"><div class="menu-name-cell"><i class="bi ${esc(m.icon||'bi-circle')}"></i><div><strong>${esc(m.title)}</strong><small>${esc(m.menuKey)}</small></div><span class="menu-type-pill item">Page</span></div>${statusPill(m.status)}</div><div class="member-card-grid"><div><span>Page URL</span><b>${esc(m.url)}</b></div><div><span>Parent</span><b>Top-level</b></div><div><span>Sort</span><b>${readSort(m.sortOrder,0)}</b></div></div><div class="d-flex gap-2"><button class="clean-btn flex-grow-1" data-edit-menu="${esc(m.id)}"><i class="bi bi-pencil-square"></i> Edit</button><button class="clean-btn danger" data-delete-menu="${esc(m.id)}"><i class="bi bi-trash3"></i></button></div></article>`);
        return;
      }
      const collapsed=isGroupCollapsed(node.groupKey);
      const editable=node.kind==='group'&&node.id!=null;
      const pill=node.kind==='orphan'
        ? '<span class="menu-type-pill orphan">Unregistered</span>'
        : '<span class="menu-type-pill group">Group</span>';
      const headActions=editable
        ? `<div class="d-flex gap-2"><button class="clean-btn flex-grow-1" data-edit-group="${esc(node.id)}"><i class="bi bi-pencil-square"></i> Edit Group</button><button class="clean-btn danger" data-delete-group="${esc(node.id)}"><i class="bi bi-trash3"></i></button></div>`
        : '';
      const canToggle=(node.children||[]).length>0;
      const cardToggle=canToggle
        ? ` data-toggle-group="${esc(node.groupKey)}" aria-expanded="${collapsed?'false':'true'}"`
        : '';
      const nameCell=`<div class="menu-name-cell">${treeToggleBtn(node.groupKey,(node.children||[]).length,collapsed)}<i class="${iconClass(node.icon||'bi-folder')}" aria-hidden="true"></i><div class="menu-name-text"><strong>${esc(node.title)}</strong><small>${esc(node.groupKey)}</small></div>${pill}</div>`;
      cards.push(`<article class="member-mobile-card menu-mobile-card menu-mobile-group${collapsed?' is-collapsed':''}${canToggle?' is-toggleable':''}"${cardToggle} title="${canToggle?(collapsed?'Click to expand':'Click to collapse'):''}"><div class="member-card-head">${nameCell}${statusPill(node.status)}</div><div class="member-card-grid"><div><span>Type</span><b>Sidebar category</b></div><div><span>Children</span><b>${(node.children||[]).length}</b></div><div><span>Sort</span><b>${readSort(node.sortOrder,0)}</b></div></div>${headActions}</article>`);
      if(!collapsed){
        (node.children||[]).forEach(m=>{
          cards.push(`<article class="member-mobile-card menu-mobile-card menu-mobile-child"><div class="member-card-head"><div class="menu-name-cell"><i class="bi ${esc(m.icon||'bi-circle')}"></i><div><strong>${esc(m.title)}</strong><small>${esc(m.menuKey)}</small></div></div>${statusPill(m.status)}</div><div class="member-card-grid"><div><span>Page URL</span><b>${esc(m.url)}</b></div><div><span>Parent</span><b>${esc(node.title)}</b></div><div><span>Sort</span><b>${readSort(m.sortOrder,0)}</b></div></div><div class="d-flex gap-2"><button class="clean-btn flex-grow-1" data-edit-menu="${esc(m.id)}"><i class="bi bi-pencil-square"></i> Edit</button><button class="clean-btn danger" data-delete-menu="${esc(m.id)}"><i class="bi bi-trash3"></i></button></div></article>`);
        });
      }
    });
    $('menuMobileCards').innerHTML=cards.join('');
  }

  async function loadGroups(){
    const j=await api(BO_AUTH.menuGroupListAllUrl(),{headers:{...BO_AUTH.authHeader()}});
    groups=j.data||[];
    renderGroupSelect();
    try{localStorage.setItem('bo_menu_group_meta_v1',JSON.stringify(groups.filter(g=>Number(g.status)===1)));}catch(e){}
  }

  async function load(){
    try{
      await loadGroups();
      const j=await api(BO_AUTH.menuListAllUrl(),{headers:{...BO_AUTH.authHeader()}});
      rows=(j.data||[]).sort(sortByOrderThenTitle);
      render();
      updateLivePreview();
    }catch(e){
      $('menuTableBody').innerHTML=`<tr><td colspan="6">${esc(e.message)}</td></tr>`;
    }
  }

  function syncItemIconPreview(){
    const preview=$('menuIconPreview');
    if(preview) preview.className=iconClass($('menuIcon')?.value);
  }
  function syncGroupIconPreview(){
    const preview=$('groupIconPreview');
    if(preview) preview.className=iconClass($('groupIcon')?.value||'bi-folder');
  }

  function setNmMode(mode, opts){
    nmMode=mode==='group'?'group':'item';
    document.querySelectorAll('[data-nm-mode]').forEach(btn=>{
      const on=btn.getAttribute('data-nm-mode')===nmMode;
      btn.classList.toggle('active',on);
      btn.setAttribute('aria-selected',on?'true':'false');
    });
    const groupForm=$('nmGroupForm');
    const itemForm=$('nmItemForm');
    if(groupForm) groupForm.hidden=nmMode!=='group';
    if(itemForm) itemForm.hidden=nmMode!=='item';
    const editingMenu=!!$('menuId')?.value;
    const editingGroup=!!$('groupId')?.value;
    const hint=$('nmModeHint');
    if(hint){
      if(nmMode==='group'){
        hint.textContent=editingGroup
          ? 'Rename or update this first-level sidebar category. Group Key stays locked so child menus keep their parent.'
          : 'Add a collapsible first-level sidebar category (e.g. Finance, Merchants).';
      }else{
        hint.textContent='Add a page under a group with route URL and permission key.';
      }
    }
    const title=$('nmModalTitle');
    const sub=$('nmModalSub');
    const saveLabel=$('nmSaveLabel');
    if(title){
      if(nmMode==='group') title.textContent=editingGroup?'Edit Group':'New Menu';
      else title.textContent=editingMenu?'Edit Menu':'New Menu';
    }
    if(sub){
      sub.textContent=editingGroup||editingMenu
        ? 'Update this sidebar entry. Live preview shows hierarchy on the right.'
        : 'Add a sidebar category or page. Live preview shows hierarchy on the right.';
    }
    if(saveLabel){
      if(nmMode==='group') saveLabel.textContent=editingGroup?'Save Group':'Create Group';
      else saveLabel.textContent=editingMenu?'Save Menu':'Create Menu';
    }
    const keyInput=$('groupKey');
    if(keyInput){
      keyInput.readOnly=editingGroup;
      keyInput.title=editingGroup?'Group Key cannot change while editing (child menus use this key).':'';
    }
    if(!(opts&&opts.skipPreview)) updateLivePreview();
  }

  function mockRow(opts){
    const {icon,title,isNew,badge,indent,chevron}=opts;
    const cls=['nm-mock-item',indent?'nm-mock-sub':'',isNew?'is-new':''].filter(Boolean).join(' ');
    const chev=chevron!==false?`<i class="bi bi-chevron-right nm-mock-chevron" aria-hidden="true"></i>`:'';
    return `<div class="${cls}"><i class="bi ${esc(icon||'bi-folder')}"></i><span>${esc(title)}</span>${badge?`<em>${esc(badge)}</em>`:''}${chev}</div>`;
  }

  function windowAround(list,index,max){
    const n=Math.max(3,max||5);
    if(list.length<=n) return list;
    let start=Math.max(0,index-Math.floor((n-1)/2));
    let end=start+n;
    if(end>list.length){end=list.length;start=Math.max(0,end-n);}
    return list.slice(start,end);
  }

  // Mirror auth.js sidebar roots for the active MAIN/BO panel only
  // (top-level menus + groups that actually have children in that panel).
  function buildPanelRootEntries(){
    const menus=filteredMenus().filter(m=>{
      if(Number(m.status)!==1) return false;
      const url=String(m.url||'').trim();
      return url && url!=='#';
    });
    const top=[];
    const byParent={};
    menus.forEach(m=>{
      const pk=String(m.parentKey||'').trim();
      if(pk) (byParent[pk]=byParent[pk]||[]).push(m);
      else top.push(m);
    });
    const metaMap=(typeof window!=='undefined'&&window.BO_MENU_GROUP_META)||{};
    const entries=[];
    top.forEach(m=>{
      entries.push({
        kind:'item',
        title:m.title,
        icon:m.icon||'bi-circle',
        sortOrder:readSort(m.sortOrder,0)
      });
    });
    Object.keys(byParent).forEach(key=>{
      const g=groups.find(x=>String(x.groupKey)===String(key));
      const meta=metaMap[key]||{};
      let sort=readSort(g&&g.sortOrder,NaN);
      if(!Number.isFinite(sort)) sort=readSort(meta.sortOrder,NaN);
      if(!Number.isFinite(sort)){
        const ranks=byParent[key].map(x=>sortRank(x.sortOrder)).filter(n=>n!==Number.POSITIVE_INFINITY);
        sort=ranks.length?Math.min.apply(null,ranks):0;
      }
      entries.push({
        kind:'group',
        groupKey:key,
        title:(g&&g.title)||meta.title||groupName(key),
        icon:(g&&g.icon)||meta.icon||'bi-folder',
        sortOrder:sort
      });
    });
    return entries.sort(sortByOrderThenTitle);
  }

  function updateLivePreview(){
    const box=$('nmSidebarPreview');
    const meta=$('nmPreviewMeta');
    if(!box) return;
    const panelLabel=activePanel==='BO'?'BO sidebar':'MAIN sidebar';

    if(nmMode==='group'){
      const title=$('groupTitle')?.value.trim()||'New Group';
      const icon=$('groupIcon')?.value.trim()||'bi-folder';
      const key=$('groupKey')?.value.trim()||slug(title)||'new_group';
      const sort=Number($('groupSort')?.value);
      const draftSort=Number.isFinite(sort)?sort:100;
      const draft={__new:true,kind:'group',title,icon,groupKey:key,sortOrder:draftSort};
      const list=buildPanelRootEntries().concat([draft])
        .sort(sortByOrderThenTitle);
      const idx=list.findIndex(g=>g.__new);
      const shown=windowAround(list,Math.max(0,idx),5);
      box.innerHTML=shown.map(g=>g.__new
        ? mockRow({icon,title,isNew:true,badge:'NEW GROUP'})
        : mockRow({icon:g.icon||'bi-folder',title:g.title})
      ).join('')||mockRow({icon,title,isNew:true,badge:'NEW GROUP'});
      if(meta){
        meta.innerHTML=`<div><span>Panel</span><b>${esc(panelLabel)}</b></div>
          <div><span>Group key</span><code>${esc(key)}</code></div>
          <div><span>Level</span><b>Collapsible container (no page URL)</b></div>`;
      }
      return;
    }

    const title=$('menuTitle')?.value.trim()||'New Menu';
    const icon=$('menuIcon')?.value.trim()||'bi-circle';
    const key=$('menuKey')?.value.trim()||slug(title)||'new_menu';
    const parentKey=$('menuParent')?.value||'';
    const parent=groups.find(g=>String(g.groupKey)===String(parentKey));
    const sort=Number($('menuSort')?.value);
    const draftSort=Number.isFinite(sort)?sort:100;
    const draft={__new:true,title,icon,menuKey:key,parentKey,sortOrder:draftSort};

    if(parent){
      const siblings=filteredMenus().filter(m=>String(m.parentKey||'')===String(parentKey)&&Number(m.status)===1)
        .concat([draft])
        .sort(sortByOrderThenTitle);
      const idx=siblings.findIndex(m=>m.__new);
      const shown=windowAround(siblings,idx,4);
      let html=mockRow({icon:parent.icon||'bi-folder',title:parent.title});
      html+=shown.map(m=>m.__new
        ? mockRow({icon,title,isNew:true,badge:'NEW',indent:true,chevron:false})
        : mockRow({icon:m.icon||'bi-circle',title:m.title,indent:true,chevron:false})
      ).join('');
      box.innerHTML=html;
    }else{
      const list=buildPanelRootEntries().concat([{__new:true,kind:'item',title,icon,sortOrder:draftSort}])
        .sort(sortByOrderThenTitle);
      const idx=list.findIndex(m=>m.__new);
      const shown=windowAround(list,Math.max(0,idx),5);
      box.innerHTML=(shown.length?shown:[{__new:true}]).map(m=>m.__new
        ? mockRow({icon,title,isNew:true,badge:'NEW'})
        : mockRow({icon:m.icon||'bi-circle',title:m.title})
      ).join('');
    }
    if(meta){
      meta.innerHTML=`<div><span>Panel</span><b>${esc(panelLabel)}</b></div>
        <div><span>Parent</span><b>${esc(parent?parent.title:'Top-level')}</b></div>
        <div><span>Permission key</span><code>${esc(key)}</code></div>
        <div><span>URL</span><code>${esc($('menuUrl')?.value.trim()||'—')}</code></div>`;
    }
  }

  function resetItemForm(){
    $('nmItemForm')?.reset();
    if($('menuId')) $('menuId').value='';
    if($('menuSort')) $('menuSort').value='100';
    if($('menuStatus')) $('menuStatus').value='1';
    if($('menuShowInSidebar')) $('menuShowInSidebar').value='1';
    document.querySelectorAll('[data-menu-status]').forEach(btn=>{
      btn.classList.toggle('active',btn.getAttribute('data-menu-status')==='1');
    });
    document.querySelectorAll('[data-menu-sidebar]').forEach(btn=>{
      btn.classList.toggle('active',btn.getAttribute('data-menu-sidebar')==='1');
    });
    renderGroupSelect('');
    status('menuFormStatus','','');
    syncItemIconPreview();
  }

  function resetGroupForm(){
    $('nmGroupForm')?.reset();
    if($('groupId')) $('groupId').value='';
    if($('groupSort')) $('groupSort').value='100';
    if($('groupStatus')) $('groupStatus').value='1';
    if($('groupKey')){
      $('groupKey').readOnly=false;
      $('groupKey').title='';
    }
    document.querySelectorAll('[data-group-status]').forEach(btn=>{
      btn.classList.toggle('active',btn.getAttribute('data-group-status')==='1');
    });
    status('groupFormStatus','','');
    syncGroupIconPreview();
  }

  function clearCurrent(){
    if(nmMode==='group') resetGroupForm();
    else resetItemForm();
    updateLivePreview();
  }

  function openModal(mode){
    setNmMode(mode||'item');
    $('newMenuModal')?.classList.add('show');
    document.body.classList.add('modal-open');
    setTimeout(()=>{
      if(nmMode==='group') $('groupTitle')?.focus();
      else $('menuTitle')?.focus();
    },60);
  }

  function closeModal(){
    $('newMenuModal')?.classList.remove('show');
    document.body.classList.remove('modal-open');
    status('menuFormStatus','','');
    status('groupFormStatus','','');
    returnToItemAfterGroup=false;
  }

  function openNew(){
    returnToItemAfterGroup=false;
    resetItemForm();
    resetGroupForm();
    openModal('group');
    updateLivePreview();
  }

  function edit(id){
    const m=rows.find(x=>String(x.id)===String(id));
    if(!m) return;
    const panel=menuPanel(m);
    if(panel!==activePanel) setPanel(panel);
    resetItemForm();
    resetGroupForm();
    $('menuId').value=m.id;
    $('menuTitle').value=m.title||'';
    $('menuKey').value=m.menuKey||'';
    $('menuUrl').value=m.url||'';
    $('menuIcon').value=m.icon||'';
    renderGroupSelect(m.parentKey||'');
    $('menuSort').value=String(readSort(m.sortOrder,0));
    $('menuStatus').value=String(Number(m.status)==1?1:0);
    document.querySelectorAll('[data-menu-status]').forEach(btn=>{
      btn.classList.toggle('active',btn.getAttribute('data-menu-status')===String(Number(m.status)==1?1:0));
    });
    $('menuShowInSidebar').value=String(Number(m.showInSidebar)==0?0:1);
    document.querySelectorAll('[data-menu-sidebar]').forEach(btn=>{
      btn.classList.toggle('active',btn.getAttribute('data-menu-sidebar')===String(Number(m.showInSidebar)==0?0:1));
    });
    syncItemIconPreview();
    openModal('item');
    updateLivePreview();
  }

  function editGroup(id){
    const g=groups.find(x=>String(x.id)===String(id));
    if(!g) return;
    const key=String(g.groupKey||'').trim().toLowerCase();
    const panel=isMainGroupKey(key)?'MAIN':'BO';
    if(panel!==activePanel) setPanel(panel);
    resetItemForm();
    resetGroupForm();
    if($('groupId')) $('groupId').value=g.id;
    if($('groupTitle')) $('groupTitle').value=g.title||'';
    if($('groupKey')){
      $('groupKey').value=g.groupKey||'';
      $('groupKey').readOnly=true;
      $('groupKey').title='Group Key cannot change while editing (child menus use this key).';
    }
    if($('groupIcon')) $('groupIcon').value=g.icon||'bi-folder';
    if($('groupSort')) $('groupSort').value=String(readSort(g.sortOrder,0));
    if($('groupStatus')) $('groupStatus').value=String(Number(g.status)==1?1:0);
    document.querySelectorAll('[data-group-status]').forEach(btn=>{
      btn.classList.toggle('active',btn.getAttribute('data-group-status')===String(Number(g.status)==1?1:0));
    });
    syncGroupIconPreview();
    openModal('group');
    updateLivePreview();
  }

  async function saveItem(){
    const btn=$('nmSaveBtn');
    const payload={
      id:$('menuId').value||null,
      title:$('menuTitle').value.trim(),
      menuKey:slug($('menuKey').value||$('menuTitle').value),
      url:$('menuUrl').value.trim(),
      icon:$('menuIcon').value.trim()||'bi-circle',
      parentKey:$('menuParent').value,
      sortOrder:readSort($('menuSort').value,0),
      status:Number($('menuStatus').value),
      showInSidebar:Number($('menuShowInSidebar').value)
    };
    if(!payload.title||!payload.menuKey||!payload.url){
      status('menuFormStatus','Please complete Menu Title, Permission Key and Page URL.','error');
      return;
    }
    const classified=menuPanel(payload);
    if(classified!==activePanel){
      status(
        'menuFormStatus',
        activePanel==='MAIN'
          ? 'This menu would land on the BO tab. Use a main_* group, or a main-*.html / main_* key.'
          : 'This menu would land on the MAIN tab. Use a non-main_* group (or clear group) and a non-main URL/key.',
        'error'
      );
      return;
    }
    btn.disabled=true;
    status('menuFormStatus','Saving menu...','');
    try{
      const j=await api(BO_AUTH.menuSaveUrl(),{method:'POST',headers:{'Content-Type':'application/json',...BO_AUTH.authHeader()},body:JSON.stringify(payload)});
      status('menuFormStatus',j.message||'Menu saved successfully.','success');
      await load();
      setTimeout(closeModal,450);
    }catch(err){
      status('menuFormStatus',err.message,'error');
    }finally{
      btn.disabled=false;
    }
  }

  async function saveGroup(){
    const btn=$('nmSaveBtn');
    const editingId=$('groupId').value||null;
    let groupKey=String($('groupKey').value||'').trim();
    if(!editingId){
      groupKey=slug(groupKey||$('groupTitle').value);
      if(activePanel==='MAIN'&&!isMainGroupKey(groupKey)){
        groupKey='main_'+groupKey.replace(/^main_/,'');
        $('groupKey').value=groupKey;
      }
    }else{
      // Keep existing key stable so child menus retain parentKey.
      groupKey=slug(groupKey)||groupKey;
    }
    if(activePanel==='BO'&&isMainGroupKey(groupKey)){
      status('groupFormStatus','BO groups cannot use a main_* / root key. Rename the Group Key.','error');
      return;
    }
    const payload={
      id:editingId,
      title:$('groupTitle').value.trim(),
      groupKey:groupKey,
      icon:$('groupIcon').value.trim()||'bi-folder',
      sortOrder:readSort($('groupSort').value,0),
      status:Number($('groupStatus').value)
    };
    if(!payload.title||!payload.groupKey){
      status('groupFormStatus','Please complete Group Title and Group Key.','error');
      return;
    }
    btn.disabled=true;
    status('groupFormStatus','Saving menu group...','');
    try{
      await api(BO_AUTH.menuGroupSaveUrl(),{method:'POST',headers:{'Content-Type':'application/json',...BO_AUTH.authHeader()},body:JSON.stringify(payload)});
      status('groupFormStatus','Menu group saved successfully.','success');
      await loadGroups();
      await load();
      if(returnToItemAfterGroup){
        returnToItemAfterGroup=false;
        resetGroupForm();
        renderGroupSelect(payload.groupKey);
        setNmMode('item');
        status('menuFormStatus','Group created. Continue with the menu item.','success');
      }else{
        setTimeout(closeModal,450);
      }
    }catch(err){
      status('groupFormStatus',err.message,'error');
    }finally{
      btn.disabled=false;
    }
  }

  async function menuDelete(id){
    const m=rows.find(x=>String(x.id)===String(id));
    if(!m) return;
    let yes=false;
    if(window.BO_DIALOG&&typeof BO_DIALOG.confirm==='function'){
      yes=await BO_DIALOG.confirm(`Delete menu "${m.title}"?\n\nThis permanently removes the menu record and its role/menu permission assignments.`,{title:'Delete Menu',confirmText:'Delete',type:'danger'});
    }else{
      yes=window.confirm(`Delete menu "${m.title}"?\n\nThis permanently removes the menu record and its role/menu permission assignments.`);
    }
    if(!yes) return;
    try{
      const url=String(BO_AUTH.menuSaveUrl()).replace(/\/save(?:\?.*)?$/,'')+'/'+encodeURIComponent(id)+'/delete';
      await api(url,{method:'POST',headers:{...BO_AUTH.authHeader()}});
      await load();
    }catch(err){
      window.BO_DIALOG&&BO_DIALOG.alert?BO_DIALOG.alert(err.message,{title:'Delete Menu Failed',type:'danger'}):alert(err.message);
    }
  }

  async function groupDelete(id){
    const g=groups.find(x=>String(x.id)===String(id));
    if(!g) return;
    const childCount=rows.filter(m=>String(m.parentKey||'')===String(g.groupKey||'')).length;
    const childNote=childCount
      ? `\n\n${childCount} menu item${childCount===1?'':'s'} currently use this group. They will become Top-level after delete (or may need re-assignment).`
      : '';
    let yes=false;
    if(window.BO_DIALOG&&typeof BO_DIALOG.confirm==='function'){
      yes=await BO_DIALOG.confirm(`Delete group "${g.title}"?${childNote}`,{title:'Delete Group',confirmText:'Delete',type:'danger'});
    }else{
      yes=window.confirm(`Delete group "${g.title}"?${childNote}`);
    }
    if(!yes) return;
    try{
      await api(BO_AUTH.menuGroupDeleteUrl(id),{method:'POST',headers:{...BO_AUTH.authHeader()}});
      await load();
    }catch(err){
      window.BO_DIALOG&&BO_DIALOG.alert?BO_DIALOG.alert(err.message,{title:'Delete Group Failed',type:'danger'}):alert(err.message);
    }
  }

  let boNavConfig={headerMenuKeys:[],headerConfigured:false,sidebarInteraction:'HOVER'};
  function renderBoNavConfig(){
    const grid=$('boHeaderShortcutGrid'); if(!grid)return;
    const selected=new Set(boNavConfig.headerMenuKeys||[]);
    const list=(rows||[]).filter(m=>Number(m.status)===1&&String(m.url||'').trim()&&String(m.url||'').trim()!=='#').sort(sortByOrderThenTitle);
    grid.innerHTML=list.map(m=>`<label class="bo-nav-shortcut-option" title="${esc(m.title)}"><input type="checkbox" data-bo-header-menu="${esc(m.menuKey)}" ${selected.has(m.menuKey)?'checked':''}><i class="bi ${esc(m.icon||'bi-circle')}"></i><span>${esc(m.title)}</span></label>`).join('')||'<span class="text-muted">No active page menus available.</span>';
    document.querySelectorAll('input[name="sidebarInteraction"]').forEach(x=>x.checked=x.value===String(boNavConfig.sidebarInteraction||'HOVER').toUpperCase());
    updateBoNavCount();
  }
  function updateBoNavCount(){const n=document.querySelectorAll('[data-bo-header-menu]:checked').length;const el=$('boHeaderShortcutCount');if(el)el.textContent=n+' selected';}
  async function loadBoNavConfig(){
    try{const j=await api(API_CONFIG.BASE_URL+'/admin/ui-setting',{headers:{...BO_AUTH.authHeader()}});boNavConfig=Object.assign(boNavConfig,j.data||{});}catch(e){status('boNavConfigStatus',e.message,'error');}
    renderBoNavConfig();
  }
  async function saveBoNavConfig(){
    const btn=$('saveBoNavConfig');if(btn)btn.disabled=true;
    const keys=[...document.querySelectorAll('[data-bo-header-menu]:checked')].map(x=>x.getAttribute('data-bo-header-menu'));
    const mode=document.querySelector('input[name="sidebarInteraction"]:checked')?.value||'HOVER';
    status('boNavConfigStatus','Saving display settings...','');
    try{
      const j=await api(API_CONFIG.BASE_URL+'/admin/ui-setting',{method:'PUT',headers:{'Content-Type':'application/json',...BO_AUTH.authHeader()},body:JSON.stringify({headerMenuKeys:keys,sidebarInteraction:mode})});
      boNavConfig=Object.assign(boNavConfig,j.data||{}, {headerConfigured:true});
      status('boNavConfigStatus','Navigation display saved. It applies to every Backoffice page.','success');
      BO_AUTH.loadUiSetting?.();
    }catch(e){status('boNavConfigStatus',e.message,'error');}finally{if(btn)btn.disabled=false;}
  }
  document.addEventListener('DOMContentLoaded',function(){
    try{
      const saved=sessionStorage.getItem(PANEL_KEY);
      if(saved==='BO'||saved==='MAIN') activePanel=saved;
    }catch(e){}

    document.querySelectorAll('[data-menu-panel]').forEach(btn=>{
      btn.addEventListener('click',()=>setPanel(btn.getAttribute('data-menu-panel')));
    });

    document.querySelectorAll('[data-nm-mode]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        if(btn.getAttribute('data-nm-mode')==='group') returnToItemAfterGroup=false;
        setNmMode(btn.getAttribute('data-nm-mode'));
      });
    });

    $('openMenuModalBtn')?.addEventListener('click',openNew);
    $('refreshMenuBtn')?.addEventListener('click',async()=>{await load();await loadBoNavConfig();});
    $('saveBoNavConfig')?.addEventListener('click',saveBoNavConfig);
    $('boHeaderShortcutGrid')?.addEventListener('change',updateBoNavCount);
    document.querySelectorAll('[data-close-nm]').forEach(x=>x.addEventListener('click',closeModal));
    $('newMenuModal')?.addEventListener('click',e=>{if(e.target===$('newMenuModal'))closeModal();});
    $('nmSaveBtn')?.addEventListener('click',()=>{ if(nmMode==='group') saveGroup(); else saveItem(); });
    $('nmSwitchToGroup')?.addEventListener('click',()=>{
      returnToItemAfterGroup=true;
      resetGroupForm();
      setNmMode('group');
      $('groupTitle')?.focus();
    });

    document.querySelectorAll('[data-group-status]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const v=btn.getAttribute('data-group-status');
        if($('groupStatus')) $('groupStatus').value=v;
        document.querySelectorAll('[data-group-status]').forEach(b=>b.classList.toggle('active',b===btn));
        updateLivePreview();
      });
    });
    document.querySelectorAll('[data-menu-status]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const v=btn.getAttribute('data-menu-status');
        if($('menuStatus')) $('menuStatus').value=v;
        document.querySelectorAll('[data-menu-status]').forEach(b=>b.classList.toggle('active',b===btn));
        updateLivePreview();
      });
    });

    $('menuTitle')?.addEventListener('input',function(){
      if(!$('menuId').value) $('menuKey').value=slug(this.value);
      updateLivePreview();
    });
    $('menuKey')?.addEventListener('input',updateLivePreview);
    $('menuUrl')?.addEventListener('input',updateLivePreview);
    $('menuParent')?.addEventListener('change',updateLivePreview);
    $('menuIcon')?.addEventListener('input',()=>{syncItemIconPreview();updateLivePreview();});
    $('menuSort')?.addEventListener('input',updateLivePreview);
    $('menuSort')?.addEventListener('change',updateLivePreview);
    $('groupTitle')?.addEventListener('input',function(){
      if(!$('groupId').value){
        let k=slug(this.value);
        if(activePanel==='MAIN'&&k&&!isMainGroupKey(k)) k='main_'+k;
        $('groupKey').value=k;
      }
      updateLivePreview();
    });
    $('groupKey')?.addEventListener('input',updateLivePreview);
    $('groupIcon')?.addEventListener('input',()=>{syncGroupIconPreview();updateLivePreview();});
    $('groupSort')?.addEventListener('input',updateLivePreview);
    $('groupSort')?.addEventListener('change',updateLivePreview);

    listen(document,'click',e=>{
      // Action buttons always win.
      const me=e.target.closest('[data-edit-menu]');if(me){edit(me.dataset.editMenu);return;}
      const md=e.target.closest('[data-delete-menu]');if(md){menuDelete(md.dataset.deleteMenu);return;}
      const ge=e.target.closest('[data-edit-group]');if(ge){editGroup(ge.dataset.editGroup);return;}
      const gd=e.target.closest('[data-delete-group]');if(gd){groupDelete(gd.dataset.deleteGroup);return;}

      // Whole group row / card is the expand hit target.
      const row=e.target.closest('tr.menu-row-group.is-toggleable, article.menu-mobile-group.is-toggleable, [data-toggle-group]');
      if(row){
        const key=row.getAttribute('data-toggle-group')||row.getAttribute('data-group-key');
        if(key){
          e.preventDefault();
          toggleGroupCollapse(key);
        }
      }
    });
    listen(document,'keydown',e=>{
      if(e.key!=='Enter'&&e.key!==' ') return;
      const row=e.target.closest('tr.menu-row-group.is-toggleable');
      if(!row||e.target!==row) return;
      e.preventDefault();
      toggleGroupCollapse(row.getAttribute('data-toggle-group')||row.getAttribute('data-group-key'));
    });

    setNmMode('group',{skipPreview:true});
    syncTabUi();
    load().then(loadBoNavConfig);
  });

  document.querySelectorAll('[data-menu-sidebar]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const value=btn.getAttribute('data-menu-sidebar')==='0'?'0':'1';
      if($('menuShowInSidebar')) $('menuShowInSidebar').value=value;
      document.querySelectorAll('[data-menu-sidebar]').forEach(x=>x.classList.toggle('active',x===btn));
      updateLivePreview();
    });
  });
})();
