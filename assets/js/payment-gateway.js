(function(){
  let gateways=[],selected=null;
  const $=id=>document.getElementById(id); const ep=k=>API_CONFIG.BASE_URL+API_CONFIG.ENDPOINTS[k];
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const auth=()=>({...BO_AUTH.authHeader(),'Content-Type':'application/json','X-Admin-Username':String(BO_AUTH.user()?.username||'ADMIN')});
  async function api(url,opt={}){const res=await fetch(url,{...opt,headers:{...auth(),...(opt.headers||{})}});const j=await res.json().catch(()=>({}));if(!res.ok||j.status==='error')throw new Error(j.message||'Request failed');return j;}
  function notify(msg,type){if(window.BO_DIALOG)BO_DIALOG.alert(msg,{title:type==='error'?'Payment Gateway Error':'Payment Gateway',type:type||'success'});else alert(msg);}
  function pretty(v){try{return JSON.stringify(JSON.parse(v||'{}'),null,2);}catch(e){return v||'{}';}}
  function renderLogoPreview(url){const box=$('pgLogoPreview');if(!box)return;const safe=String(url||'').trim();box.innerHTML=safe?`<img src="${esc(safe)}" alt="Gateway logo" onerror="this.parentElement.innerHTML='<span class=&quot;pg-note&quot;>Invalid logo</span>'">`:'<span class="pg-note">No logo</span>';}
  async function uploadGatewayLogo(file){if(!file)return;const allowed=['image/png','image/jpeg','image/webp','image/gif'];if(!allowed.includes(file.type))throw new Error('Logo must be PNG, JPG, WEBP or GIF.');const fd=new FormData();fd.append('image',file);const res=await fetch(ep('UPLOAD_IMAGE'),{method:'POST',headers:{...BO_AUTH.authHeader(),'X-Admin-Username':String(BO_AUTH.user()?.username||'ADMIN')},body:fd});const j=await res.json().catch(()=>({}));if(!res.ok||j.status==='error'||!j.data?.url)throw new Error(j.message||'Logo upload failed');$('pgLogoUrl').value=j.data.url;renderLogoPreview(j.data.url);}
  function selectedId(){return selected&&selected.id;}
  async function load(){const j=await api(ep('PAYMENT_GATEWAY_LIST'));gateways=(j.data&&j.data.content)||[];renderList();if(selected){selected=gateways.find(g=>String(g.id)===String(selected.id))||null;if(selected){fillGateway(selected);renderConfig();renderChannels();pgPanelsForCurrent();}}}
  /* ---- the listing footer its siblings carry -----------------------------------------------------
     Same three slots as every other table in this module (`table-footer bo-pagination-standard`:
     Show / Showing / ladder) and the same `-` in the size list, which here means "as many rows as the
     panel can hold" and is measured rather than guessed. */
  let pgPage=1;
  /* The list toolbar states what the siblings state: a status filter with its counts on the left and
     the search + actions on the right. The counts follow the search (like the module's other tables),
     and everything funnels through one render so a filter can never disagree with the ladder. */
  let pgStatus='';
  function pgKeyword(){return String(($('pgSearch')||{}).value||'').trim().toLowerCase();}
  function pgMatching(){
    const q=pgKeyword();
    return gateways.filter(g=>!q||[g.displayName,g.gatewayCode,g.baseUrl].some(v=>String(v||'').toLowerCase().includes(q)));
  }
  function pgSetCounts(base){
    const on=base.filter(g=>Number(g.status)===1).length;
    /* The module's own component draws the parentheses (.bo-tx-tab-count::before/:after), so only the
       number goes in - writing '('+n+')' here showed as ((23)). */
    if($('pgCountAll')) $('pgCountAll').textContent=String(base.length);
    if($('pgCountEnabled')) $('pgCountEnabled').textContent=String(on);
    if($('pgCountDisabled')) $('pgCountDisabled').textContent=String(base.length-on);
  }
  function pgAutoRows(){
    const head=document.querySelector('.gateway-main-table thead');
    const foot=document.querySelector('.gateway-list-card .table-footer');
    const row=$('pgGatewayList')&&$('pgGatewayList').querySelector('tr');
    if(!head||!foot) return 10;
    const rowH=(row&&row.getBoundingClientRect().height)||52;
    const fit=Math.floor((foot.getBoundingClientRect().top-head.getBoundingClientRect().bottom)/rowH);
    return Math.max(5,Math.min(100,fit||10));
  }
  function pgPageSize(){
    const v=String(($('pgPageSize')||{}).value||'-');
    if(v==='All') return Infinity;
    const n=Number(v);
    return Number.isFinite(n)&&n>0?n:pgAutoRows();
  }
  function pgSyncFooter(total,from,to){
    if($('pgShowing')) $('pgShowing').textContent='Showing '+(total?from:0)+' to '+(total?to:0)+' of '+total+' entries';
    const pager=$('pgPager'); if(!pager) return;
    const size=pgPageSize(),pages=Number.isFinite(size)?Math.max(1,Math.ceil(total/size)):1;
    /* One page still gets a pager: the module's footers always carry the controls, and an empty right end read
       as a missing piece rather than as "there is nothing to page". */

    let html='<button type="button" class="page-btn" data-pg-page="'+Math.max(1,pgPage-1)+'"'+(pgPage<=1?' disabled':'')+' aria-label="Previous page"><i class="bi bi-chevron-left"></i></button>';
    for(let i=1;i<=pages;i++) html+='<button type="button" class="page-btn'+(i===pgPage?' active':'')+'" data-pg-page="'+i+'"'+(i===pgPage?' aria-current="page"':'')+'>'+i+'</button>';
    html+='<button type="button" class="page-btn" data-pg-page="'+Math.min(pages,pgPage+1)+'"'+(pgPage>=pages?' disabled':'')+' aria-label="Next page"><i class="bi bi-chevron-right"></i></button>';
    pager.innerHTML=html;
  }
  function renderList(){
    const box=$('pgGatewayList');
    const base=pgMatching();
    pgSetCounts(base);
    const rows=pgStatus===''?base:base.filter(g=>String(Number(g.status))===pgStatus);
    if(!rows.length){
      box.innerHTML='<tr><td colspan="6" class="pg-empty">'+(gateways.length?'No gateway matches this filter.':'No gateway configured yet. Create one, configure DEPOSIT / WITHDRAW / STATUS requests, then add channels.')+'</td></tr>';
      pgSyncFooter(0,0,0);return;
    }
    const size=pgPageSize();
    const pages=Number.isFinite(size)?Math.max(1,Math.ceil(rows.length/size)):1;
    if(pgPage>pages) pgPage=pages;
    const start=Number.isFinite(size)?(pgPage-1)*size:0;
    const shown=Number.isFinite(size)?rows.slice(start,start+size):rows;
    box.innerHTML=shown.map(g=>{
      const logo=String(g.logoUrl||'').trim();
      const deposit=Number(g.supportsDeposit)===1, withdraw=Number(g.supportsWithdraw)===1;
      return `<tr>
        <td><div class="gateway-name-cell"><div class="gateway-list-logo">${logo?`<img src="${esc(logo)}" alt="" onerror="this.parentElement.innerHTML='<i class=&quot;bi bi-lightning-charge&quot;></i>'">`:'<i class="bi bi-lightning-charge"></i>'}</div><div><b>${esc(g.displayName||g.gatewayCode)}</b><small class="pg-code">${esc(g.gatewayCode)}</small></div></div></td>
        <td class="pg-code">${esc(g.baseUrl||'-')}</td>
        <td><div class="pg-capabilities"><span class="pg-capability ${deposit?'':'off'}"><i class="bi bi-arrow-down-circle"></i> Deposit</span><span class="pg-capability ${withdraw?'':'off'}"><i class="bi bi-arrow-up-circle"></i> Withdraw</span></div></td>
        <td>${(g.channels||[]).length}</td>
        <td><span class="pg-pill ${Number(g.status)===1?'on':'off'}">${Number(g.status)===1?'ENABLED':'DISABLED'}</span></td>
        <td><div class="gateway-action-wrap"><button class="gateway-action-btn" type="button" data-edit-gateway="${g.id}" title="Edit Gateway"><i class="bi bi-pencil-square"></i></button></div></td>
      </tr>`;
    }).join('');
    pgSyncFooter(rows.length,start+1,start+shown.length);
  }
  /* ---- the editor is a view, not a dialog --------------------------------------------------------
     Owner's call ("这个页面需要优化统一设计 并且所有编辑弹窗和添加弹窗都要做成一页也并且统一设计"): New and Edit
     are the same page, and the three sections are tabs, so a gateway is no longer edited by scrolling
     8.6 screens inside a modal. `selected` decides what the two dependent tabs can do - without a
     saved gateway there is nothing to attach an endpoint or a channel to, so those panels say so
     instead of rendering empty forms. */
  function pgTabState(){
    const has=!!selected;
    document.querySelectorAll('#pgGatewayModal [data-pg-tab]').forEach(function(b){
      const name=b.dataset.pgTab;
      if(name==='endpoints'&&$('pgEndpointsCount')) $('pgEndpointsCount').textContent=String(((selected&&selected.endpoints)||[]).length);
      if(name==='channels'&&$('pgChannelsCount')) $('pgChannelsCount').textContent=String(((selected&&selected.channels)||[]).length);
      const locked=!has&&name!=='gateway';
      b.classList.toggle('is-dim',locked);
      /* `aria-disabled` rather than `disabled`: a disabled button never fires a click, and the owner wants the
         reason to appear when the reader tries the tab. The state still announces itself to assistive tech. */
      b.setAttribute('aria-disabled',locked?'true':'false');
      b.removeAttribute('title');
    });
  }
  /* The reason floats beside the tab that was tried, then leaves. Owner: "我不要把提示词放在外面 而是让用户点选
     api endpoint 还是 channel 才触发悬浮提示词". */
  function pgTabTip(btn,text){
    const old=document.getElementById('pgTabTip');
    if(old) old.remove();
    if(!btn) return;
    const tip=document.createElement('div');
    tip.id='pgTabTip';tip.className='pg-tab-tip';tip.textContent=text;
    document.body.appendChild(tip);
    const r=btn.getBoundingClientRect();
    tip.style.left=Math.round(r.left)+'px';
    tip.style.top=Math.round(r.bottom+8)+'px';
    requestAnimationFrame(function(){tip.classList.add('show');});
    clearTimeout(pgTabTip._t);
    pgTabTip._t=setTimeout(function(){tip.classList.remove('show');setTimeout(function(){tip.remove();},220);},2800);
  }
  function pgTab(name,btn){
    if(!selected&&name!=='gateway'){
      pgTabTip(btn||document.querySelector('#pgGatewayModal [data-pg-tab="'+name+'"]'),
        'Save the gateway first - endpoints and channels attach to a saved gateway.');
      return;
    }
    document.querySelectorAll('#pgGatewayModal [data-pg-tab]').forEach(function(b){
      const on=b.dataset.pgTab===name;
      b.classList.toggle('is-active',on);
      b.setAttribute('aria-selected',on?'true':'false');
      b.setAttribute('aria-pressed',on?'true':'false');
    });
    document.querySelectorAll('#pgGatewayModal [data-pg-panel]').forEach(function(panel){ panel.hidden=panel.dataset.pgPanel!==name; });
    pgTabState();
  }
  /* The segmented control's pill is not CSS: bo-seg-bounce.js builds a `.bo-seg-thumb` behind the active
     item when it is mounted, so an unmounted track renders as plain text - which is what "页面刷新后 胶囊没有
     出现" was, because this only ran when the editor was opened. Both rows are mounted on load: the editor's
     markup is in the DOM from the start, so there is nothing to wait for. */
  function pgMountSegs(){
    if(!window.BO_SEG_BOUNCE||typeof window.BO_SEG_BOUNCE.mount!=='function') return;
    document.querySelectorAll('.pg-list-filter .bo-tx-tabs, .pg-editor-tabs, #pgGatewayModal .bo-tx-tabs').forEach(function(track){
      if(track.dataset.pgSegMounted==='1') return;
      track.dataset.pgSegMounted='1';
      try{ window.BO_SEG_BOUNCE.mount(track,{button:':scope > .bo-tx-tab',anim:'bounce'}); }catch(e){}
    });
  }
  function pgBindTabs(){
    document.querySelectorAll('#pgGatewayModal [data-pg-tab]').forEach(function(b){
      if(b.dataset.pgBound==='1') return;
      b.dataset.pgBound='1';
      b.addEventListener('click',function(){ pgTab(b.dataset.pgTab,b); });
    });
  }
  /* Which panels a view can show: a saved gateway gets its endpoints and channels, an unsaved one gets
     the reason they are not there yet. */
  function pgPanelsForCurrent(){
    if(selected){
      renderConfig();pgCollapseEndpoints($('pgEndpointForms'));renderChannels();
      if($('pgNewChannel')) $('pgNewChannel').disabled=false;
    }else{
      if($('pgEndpointForms')) $('pgEndpointForms').innerHTML='<div class="pg-panel-note">Save this gateway first - API endpoints attach to a saved gateway.</div>';
      if($('pgChannels')) $('pgChannels').innerHTML='<div class="pg-panel-note">Save this gateway first, then add its deposit and withdraw channels here.</div>';
      if($('pgChannelForm')) $('pgChannelForm').hidden=true;
      if($('pgNewChannel')) $('pgNewChannel').disabled=true;
    }
    pgTabState();
  }
  /* ---- the editor has an address ----------------------------------------------------------------
     `?edit=<id>` (or `?edit=new`), so the editor is a page rather than a state: a refresh keeps the user
     where they were and Back returns to the list. Measured before this: the URL said nothing, so a reload
     dropped the editor and Back re-opened it. Owner: "用户点进编辑进到独立页面刷新也不会跳回主功能页面". */
  function pgEditParam(){ return new URLSearchParams(location.search).get('edit'); }
  /* replaceState only, deliberately. Pushing an entry and walking back out of it looked tidier, but the
     step is asynchronous: a close that ended in history.back() left `?edit` on the address if anything
     re-read it in between, and a refresh then reopened the editor - measured on the ordinary
     list -> pencil -> Cancel path. The address is a description of what is on screen, so it is replaced,
     never stacked: refresh keeps the editor, Cancel clears it, and Back leaves the page like any other. */
  function pgWriteUrl(edit){
    const u=new URL(location.href);
    if(edit==null||edit==='') u.searchParams.delete('edit'); else u.searchParams.set('edit',String(edit));
    const url=u.pathname.split('/').pop()+u.search+u.hash;
    try{ history.replaceState({pgEdit:edit==null?'':String(edit)},'',url); }catch(e){}
  }
  /* One function owns what is on screen, derived from the editor's own state rather than set at each call
     site. Setting it imperatively at open/close left two ways to be wrong: a direct `?edit=1` load could
     render the list and the editor together (owner's screenshot: the filter pills and the table above the
     form), and a router swap replaced the frame's markup, dropping the `hidden` the list carried. Both are
     the same defect - a view state that several places had to remember. */
  function pgApplyView(){
    const view=$('pgGatewayModal');
    const open=!!view&&!view.hidden;
    /* The page's own name is in the top bar - that is where the reference form keeps "Create New Agent" - so
       while a gateway is open the bar says which one: `Edit S1PAY` / `New Gateway`. Closing removes the
       override and the bar falls back to the menu row's title. `BO_TOPBAR.refresh()` is the script's own API
       for a page that pins a title, so this does not fight its rendering. */
    const bar=document.querySelector('[data-bo-topbar]');
    if(bar){
      const h1=bar.querySelector('h1');
      if(open){
        const wanted='Edit '+(selected?(selected.displayName||selected.gatewayCode||'Gateway'):'')||'New Gateway';
        const title=selected?('Edit '+(selected.displayName||selected.gatewayCode||'Gateway')):'New Gateway';
        bar.dataset.boTitle=title;
        /* bo-topbar's refresh deliberately leaves the h1 alone while a page pins `data-bo-title` - it hands
           the title to the page - so the page writes it. Closing drops the pin and refresh() writes the menu
           row's own title back. */
        if(h1) h1.textContent=title;
      }else{
        delete bar.dataset.boTitle;
        if(window.BO_TOPBAR&&typeof window.BO_TOPBAR.refresh==='function') window.BO_TOPBAR.refresh();
      }
    }
    const list=document.querySelector('.gateway-list-card'); if(list) list.hidden=open;
    /* Editing is a room of its own: the module's tab row belongs to the list's context and is only a way
       out of the editor, so it goes - and so does the band it leaves behind. Owner: "用户点入编辑页面后
       上面的tab页面切换就不用出现 ... 编辑页面就是让用户专注编辑gateway的东西". */
    document.body.classList.toggle('pg-editing',open);
    /* Coming back from the editor the list is measured again: the seg's thumb and travel are written as inline
       values when it mounts, and the row was display:none while the editor was open, so its geometry has to be
       re-read once the layout is back. The module's own sync() does exactly that, one frame later as it does
       after mount. */
    if(!open&&window.BO_SEG_BOUNCE&&typeof window.BO_SEG_BOUNCE.sync==='function'){
      document.querySelectorAll('.pg-list-filter .bo-tx-tabs').forEach(function(track){
        requestAnimationFrame(function(){ try{ window.BO_SEG_BOUNCE.sync(track); }catch(e){} });
      });
    }
  }
  function openGatewayModal(fromUrl){
    const v=$('pgGatewayModal');
    v.hidden=false;v.classList.add('show');v.setAttribute('aria-hidden','false');
    pgApplyView();
    pgBindTabs();pgPanelsForCurrent();pgTab('gateway');pgMountSegs();
    window.scrollTo(0,0);
    if(!fromUrl) pgWriteUrl(selected&&selected.id?selected.id:'new');
  }
  function closeGatewayModal(fromUrl){
    const v=$('pgGatewayModal');
    v.hidden=true;v.classList.remove('show');v.setAttribute('aria-hidden','true');
    pgApplyView();
    window.scrollTo(0,0);
    if(fromUrl===true) return;
    /* Closing goes back the way the editor was entered: the list entry pushed it, so the history step is
       what removes `?edit`. Landing straight on `?edit=...` has no such entry, so the address is rewritten
       instead of leaving the page. */
    /* A closed editor must not leave `?edit` behind: a refresh would reopen it. */
    pgWriteUrl(null);
  }

  function resetGateway(){selected=null;$('pgId').value='';$('pgCode').value='';$('pgName').value='';$('pgBaseUrl').value='';$('pgAdminUrl').value='';$('pgLogoUrl').value='';renderLogoPreview('');$('pgStatus').value='0';$('pgDeposit').checked=true;$('pgWithdraw').checked=false;$('pgDepositChannelSelection').value='0';$('pgCredentials').value='{}';$('pgCallbackUrl').value='';$('pgDepositCallbackUrl').value='';$('pgWithdrawCallbackUrl').value='';$('pgLinkBackUrl').value='';$('pgCallbackReference').value='referenceId';$('pgCallbackStatus').value='status';$('pgCallbackMap').value='{}';$('pgCallbackVerifyMode').value='NONE';$('pgCallbackVerifyHeader').value='X-Signature';$('pgCallbackVerifyField').value='signature';$('pgCallbackVerifySecret').value='';$('pgCallbackAllowedIps').value='';$('pgDepositStatusPollEnabled').value='1';$('pgConnectTimeout').value='10000';$('pgRequestTimeout').value='20000';$('pgNotes').value='';{const _t=$('pgGatewayFormTitle'); if(_t) _t.textContent='New Gateway';}{const _p=$('pgSelectedPill'); if(_p) _p.textContent='Not selected';}{const _p=$('pgSelectedPill'); if(_p) _p.className='pg-pill off';}$('pgConfigPanel').hidden=true;$('pgChannelPanel').hidden=true;renderList();}
  function fillGateway(g){selected=g;$('pgId').value=g.id||'';$('pgCode').value=g.gatewayCode||'';$('pgName').value=g.displayName||'';$('pgBaseUrl').value=g.baseUrl||'';$('pgAdminUrl').value=g.adminUrl||'';$('pgLogoUrl').value=g.logoUrl||'';renderLogoPreview(g.logoUrl||'');$('pgStatus').value=String(g.status??0);$('pgDeposit').checked=Number(g.supportsDeposit)===1;$('pgWithdraw').checked=Number(g.supportsWithdraw)===1;$('pgDepositChannelSelection').value=String(g.depositChannelSelection??0);$('pgCredentials').value=pretty(g.credentialsJson);$('pgCallbackUrl').value=g.callbackUrl||'';$('pgDepositCallbackUrl').value=g.depositCallbackUrl||g.callbackUrl||'';$('pgWithdrawCallbackUrl').value=g.withdrawCallbackUrl||g.callbackUrl||'';$('pgLinkBackUrl').value=g.linkBackUrl||'';$('pgCallbackReference').value=g.callbackReferenceField||'referenceId';$('pgCallbackStatus').value=g.callbackStatusField||'status';$('pgCallbackMap').value=pretty(g.callbackStatusMapJson);$('pgCallbackVerifyMode').value=g.callbackVerifyMode||'NONE';$('pgCallbackVerifyHeader').value=g.callbackVerifyHeader||'X-Signature';$('pgCallbackVerifyField').value=g.callbackVerifyField||'signature';$('pgCallbackVerifySecret').value=g.callbackVerifySecret||'';$('pgCallbackAllowedIps').value=g.callbackAllowedIps||'';$('pgDepositStatusPollEnabled').value=String(g.depositStatusPollEnabled??1);$('pgConnectTimeout').value=g.connectTimeoutMs||10000;$('pgRequestTimeout').value=g.requestTimeoutMs||20000;$('pgNotes').value=g.notes||'';{const _t=$('pgGatewayFormTitle'); if(_t) _t.textContent='Edit '+(g.displayName||'Gateway');}{const _p=$('pgSelectedPill'); if(_p) _p.textContent=Number(g.status)===1?'Enabled':'Disabled';}{const _p=$('pgSelectedPill'); if(_p) _p.className='pg-pill '+(Number(g.status)===1?'on':'off');}$('pgConfigPanel').hidden=false;$('pgChannelPanel').hidden=false;renderList();}
    pgApplyView();
  function endpointDefaults(action){if(action==='DEPOSIT')return {httpMethod:'POST',contentType:'JSON',enabled:0,path:'',headersTemplate:'{}',bodyTemplate:'{}',successPath:'',successValues:'1',messagePath:'',transactionIdPath:'',redirectUrlPath:'',redirectTransform:'NONE',transactionStatusPath:''};if(action==='WITHDRAW')return {httpMethod:'POST',contentType:'JSON',enabled:0,path:'',headersTemplate:'{}',bodyTemplate:'{}',successPath:'',successValues:'1',messagePath:'',transactionIdPath:'',redirectUrlPath:'',redirectTransform:'NONE',transactionStatusPath:''};return {httpMethod:'POST',contentType:'JSON',enabled:0,path:'',headersTemplate:'{}',bodyTemplate:'{}',successPath:'',successValues:'1',messagePath:'',transactionIdPath:'',redirectUrlPath:'',redirectTransform:'NONE',transactionStatusPath:''};}
  /* Each action's template editor becomes a collapsible block: three of them stacked open were 3.9 screens,
   and the action name plus its enabled state is all a reader needs to pick the one to work on. Same
   pattern as the callback fields, so the page has one idea of "advanced" rather than two. */
  function pgCollapseEndpoints(forms){
    forms.querySelectorAll('form.pg-endpoint').forEach(f=>{
      if(f.parentElement&&f.parentElement.tagName==='DETAILS') return;
      const d=document.createElement('details');d.className='pg-endpoint-details';
      const box=f.querySelector('input[name="enabled"]');
      const on=!!(box&&box.checked);
      const sum=document.createElement('summary');
      sum.innerHTML='<b>'+esc(f.dataset.endpointForm)+'</b><span class="pg-pill '+(on?'on':'off')+'">'+(on?'Enabled':'Disabled')+'</span>';
      f.parentNode.insertBefore(d,f);d.appendChild(sum);d.appendChild(f);
      if(box) box.addEventListener('change',()=>{
        sum.querySelector('.pg-pill').className='pg-pill '+(box.checked?'on':'off');
        sum.querySelector('.pg-pill').textContent=box.checked?'Enabled':'Disabled';
      });
    });
  }
  function renderConfig(){if(!selected)return;const forms=$('pgEndpointForms');const by={};(selected.endpoints||[]).forEach(e=>by[String(e.actionType).toUpperCase()]=e);forms.innerHTML=['DEPOSIT','WITHDRAW','STATUS'].map(action=>{const e={...endpointDefaults(action),...(by[action]||{})};return `<form class="pg-endpoint" data-endpoint-form="${action}"><input type="hidden" name="id" value="${esc(e.id||'')}"><div class="pg-toolbar"><b>${action}</b><label><input type="checkbox" name="enabled" ${Number(e.enabled)===1?'checked':''}> Enabled</label></div><div class="pg-form-grid"><div class="pg-field"><label>HTTP Method</label><select name="httpMethod">${['GET','POST','PUT','PATCH','DELETE'].map(x=>`<option ${x===e.httpMethod?'selected':''}>${x}</option>`).join('')}</select></div><div class="pg-field"><label>Content Type</label><select name="contentType">${['JSON','FORM','QUERY','NONE'].map(x=>`<option ${x===e.contentType?'selected':''}>${x}</option>`).join('')}</select></div><div class="pg-field full"><label>Path or Full URL</label><input name="path" value="${esc(e.path||'')}" placeholder="/ApiRobot/ApiAllocateServer.aspx"></div><div class="pg-field full"><label>Headers JSON</label><textarea name="headersTemplate" rows="3">${esc(pretty(e.headersTemplate))}</textarea></div><div class="pg-field full"><label>Request Body Template</label><textarea name="bodyTemplate" rows="9">${esc(pretty(e.bodyTemplate))}</textarea></div><div class="pg-field"><label>Success JSON Path</label><input name="successPath" value="${esc(e.successPath||'')}" placeholder="Code"></div><div class="pg-field"><label>Accepted Values</label><input name="successValues" value="${esc(e.successValues||'')}" placeholder="1,success"></div><div class="pg-field"><label>Message Path</label><input name="messagePath" value="${esc(e.messagePath||'')}" placeholder="Message"></div><div class="pg-field"><label>Provider Transaction ID Path</label><input name="transactionIdPath" value="${esc(e.transactionIdPath||'')}" placeholder="Data.TransactionId"></div><div class="pg-field"><label>Redirect URL Path</label><input name="redirectUrlPath" value="${esc(e.redirectUrlPath||'')}" placeholder="Data.Domain"></div><div class="pg-field"><label>Redirect Transform</label><select name="redirectTransform"><option ${e.redirectTransform==='NONE'?'selected':''}>NONE</option><option ${e.redirectTransform==='BASE64'?'selected':''}>BASE64</option></select></div><div class="pg-field"><label>Provider Status Path</label><input name="transactionStatusPath" value="${esc(e.transactionStatusPath||'')}" placeholder="Data.Status"></div></div><div class="pg-actions mt-2"><button class="clean-btn primary" type="submit">Save ${action}</button></div></form>`}).join('');renderChannels();}
  function renderChannels(){const box=$('pgChannels');const rows=selected?.channels||[];if(!rows.length){box.innerHTML='<div class="pg-empty">No gateway channels.</div>';return;}box.innerHTML=`<div class="pg-table-wrap"><table class="pg-table"><thead><tr><th>Name</th><th>Direction</th><th>Provider Code</th><th>Min</th><th>Max</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(c=>`<tr><td>${esc(c.displayName)}</td><td>${esc(c.direction)}</td><td class="pg-code">${esc(c.providerCode||'-')}</td><td>${esc(c.minAmount||0)}</td><td>${esc(c.maxAmount||0)}</td><td><span class="pg-pill ${Number(c.status)===1?'on':'off'}">${Number(c.status)===1?'Enabled':'Disabled'}</span></td><td><button class="clean-btn" data-edit-channel="${c.id}">Edit</button></td></tr>`).join('')}</tbody></table></div>`;}
  function editChannel(c){$('pgChannelForm').hidden=false;$('pgChannelId').value=c?.id||'';$('pgChannelName').value=c?.displayName||'';$('pgChannelDirection').value=c?.direction||'DEPOSIT';$('pgChannelCode').value=c?.providerCode||'';$('pgChannelStatus').value=String(c?.status??1);$('pgChannelMin').value=c?.minAmount??0;$('pgChannelMax').value=c?.maxAmount??0;$('pgChannelSort').value=c?.sortOrder??0;$('pgChannelVars').value=pretty(c?.requestVariablesJson||'{}');$('pgChannelName').focus();}
  async function saveGateway(e){e.preventDefault();const body={id:$('pgId').value||null,gatewayCode:$('pgCode').value,displayName:$('pgName').value,baseUrl:$('pgBaseUrl').value,adminUrl:$('pgAdminUrl').value,logoUrl:$('pgLogoUrl').value,status:Number($('pgStatus').value),supportsDeposit:$('pgDeposit').checked?1:0,supportsWithdraw:$('pgWithdraw').checked?1:0,depositChannelSelection:Number($('pgDepositChannelSelection').value||0),credentialsJson:$('pgCredentials').value||'{}',callbackUrl:$('pgCallbackUrl').value,depositCallbackUrl:$('pgDepositCallbackUrl').value,withdrawCallbackUrl:$('pgWithdrawCallbackUrl').value,linkBackUrl:$('pgLinkBackUrl').value,callbackReferenceField:$('pgCallbackReference').value,callbackStatusField:$('pgCallbackStatus').value,callbackStatusMapJson:$('pgCallbackMap').value||'{}',callbackVerifyMode:$('pgCallbackVerifyMode').value,callbackVerifyHeader:$('pgCallbackVerifyHeader').value,callbackVerifyField:$('pgCallbackVerifyField').value,callbackVerifySecret:$('pgCallbackVerifySecret').value,callbackAllowedIps:$('pgCallbackAllowedIps').value,depositStatusPollEnabled:Number($('pgDepositStatusPollEnabled').value||1),connectTimeoutMs:Number($('pgConnectTimeout').value||10000),requestTimeoutMs:Number($('pgRequestTimeout').value||20000),notes:$('pgNotes').value};try{const j=await api(ep('PAYMENT_GATEWAY_SAVE'),{method:'POST',body:JSON.stringify(body)});selected=j.data;await load();notify('Gateway saved.');}catch(e){notify(e.message,'error');}}
  async function saveEndpoint(form){const fd=new FormData(form);const body={id:fd.get('id')||null,gatewayId:selectedId(),actionType:form.dataset.endpointForm,enabled:form.elements.enabled.checked?1:0,httpMethod:fd.get('httpMethod'),contentType:fd.get('contentType'),path:fd.get('path'),headersTemplate:fd.get('headersTemplate')||'{}',bodyTemplate:fd.get('bodyTemplate')||'{}',successPath:fd.get('successPath'),successValues:fd.get('successValues'),messagePath:fd.get('messagePath'),transactionIdPath:fd.get('transactionIdPath'),redirectUrlPath:fd.get('redirectUrlPath'),redirectTransform:fd.get('redirectTransform'),transactionStatusPath:fd.get('transactionStatusPath')};try{await api(ep('PAYMENT_GATEWAY_ENDPOINT_SAVE'),{method:'POST',body:JSON.stringify(body)});await load();notify(form.dataset.endpointForm+' endpoint saved.');}catch(e){notify(e.message,'error');}}
  async function saveChannel(e){e.preventDefault();if(!selected)return;const body={id:$('pgChannelId').value||null,gatewayId:selected.id,displayName:$('pgChannelName').value,direction:$('pgChannelDirection').value,providerCode:$('pgChannelCode').value,status:Number($('pgChannelStatus').value),minAmount:$('pgChannelMin').value||0,maxAmount:$('pgChannelMax').value||0,sortOrder:Number($('pgChannelSort').value||0),requestVariablesJson:$('pgChannelVars').value||'{}'};try{await api(ep('PAYMENT_GATEWAY_CHANNEL_SAVE'),{method:'POST',body:JSON.stringify(body)});$('pgChannelForm').hidden=true;await load();notify('Gateway channel saved.');}catch(e){notify(e.message,'error');}}
  function loadS1PayTemplate(){resetGateway();$('pgCode').value='S1PAY';$('pgName').value='S1PAY';$('pgBaseUrl').value='https://s.s1pay.site';$('pgAdminUrl').value='https://ag.s1pay.site';$('pgStatus').value='0';$('pgDeposit').checked=true;$('pgWithdraw').checked=false;$('pgDepositChannelSelection').value='0';$('pgCredentials').value=pretty('{"username":"","password":"","token":"","secret":""}');$('pgDepositCallbackUrl').value=(location.origin+'/api/payment-gateway/callback/S1PAY');$('pgCallbackReference').value='ReferenceId|referenceId|UserReference';$('pgCallbackStatus').value='Status|status|TransactionStatus|Data.TransactionStatus';$('pgCallbackMap').value=pretty('{"1":"SUCCESS","2":"VOIDED","3":"FAILED","4":"REJECTED","5":"PROCESSING","6":"PROCESSING","7":"FAILED","8":"REFUNDED"}');$('pgCallbackVerifyMode').value='NONE';$('pgDepositStatusPollEnabled').value='1';$('pgNotes').value='S1PAY template from API v1.0.33. Payout requires SecretParam from provider; keep WITHDRAW disabled until it is supplied.';notify('S1PAY base template loaded. Save the gateway, then configure endpoints and channels.');}
  /* Page-private file: the router re-runs it on every entry, and the document outlives the
     frame - each entry left another click/submit/keydown behind (measured: payment-gateway.html
     +3 per entry, payment-gateway.js:42/47/64). One slot per binding. */
  if(window.__boPgClick) document.removeEventListener('click',window.__boPgClick);
  window.__boPgClick=e=>{
    const edit=e.target.closest('[data-edit-gateway]');
    if(edit){selected=gateways.find(g=>String(g.id)===String(edit.dataset.editGateway));if(selected){fillGateway(selected);renderConfig();openGatewayModal();}}
    const b=e.target.closest('[data-edit-channel]');if(b&&selected){const c=(selected.channels||[]).find(x=>String(x.id)===String(b.dataset.editChannel));editChannel(c);}
  };
  document.addEventListener('click',window.__boPgClick);
  if(window.__boPgSubmit) document.removeEventListener('submit',window.__boPgSubmit);
  window.__boPgSubmit=e=>{if(e.target.matches('[data-endpoint-form]')){e.preventDefault();saveEndpoint(e.target);}};
  document.addEventListener('submit',window.__boPgSubmit);
  if(window.__boPgEsc) document.removeEventListener('keydown',window.__boPgEsc);
  window.__boPgEsc=e=>{if(e.key==='Escape'&&$('pgGatewayModal').classList.contains('show'))closeGatewayModal();};
  document.addEventListener('keydown',window.__boPgEsc);
  document.addEventListener('DOMContentLoaded',()=>{
    $('pgGatewayForm').addEventListener('submit',saveGateway);
    $('pgChooseLogo').addEventListener('click',()=>$('pgLogoFile').click());
    $('pgLogoFile').addEventListener('change',async e=>{const file=e.target.files&&e.target.files[0];if(!file)return;try{await uploadGatewayLogo(file);}catch(err){notify(err.message,'error');}finally{e.target.value='';}});
    $('pgRemoveLogo').addEventListener('click',()=>{$('pgLogoUrl').value='';renderLogoPreview('');});
    $('pgLogoUrl').addEventListener('input',e=>renderLogoPreview(e.target.value));
    $('pgChannelForm').addEventListener('submit',saveChannel);
    $('pgRefresh').addEventListener('click',()=>load().catch(e=>notify(e.message,'error')));
    if($('pgPageSize')) $('pgPageSize').addEventListener('change',()=>{pgPage=1;renderList();});
    document.querySelectorAll('.pg-list-filter [data-pg-status]').forEach(b=>b.addEventListener('click',()=>{
      pgStatus=String(b.dataset.pgStatus||'');pgPage=1;
      document.querySelectorAll('.pg-list-filter [data-pg-status]').forEach(x=>{
        const on=x===b;x.classList.toggle('is-active',on);x.setAttribute('aria-pressed',on?'true':'false');
      });
      renderList();
    }));
    if($('pgSearch')) $('pgSearch').addEventListener('input',()=>{pgPage=1;renderList();});
    if($('pgPager')) $('pgPager').addEventListener('click',e=>{const b=e.target.closest('[data-pg-page]');if(!b)return;pgPage=Number(b.dataset.pgPage)||1;renderList();});
    /* `-` is a measurement, so a resize can change it. One slot on window: this file re-runs on every
       router entry and a second listener would page twice per resize. */
    if(window.__boPgResize) window.removeEventListener('resize',window.__boPgResize);
    window.__boPgResize=()=>{if(String(($('pgPageSize')||{}).value||'-')==='-'){pgPage=1;renderList();}};
    window.addEventListener('resize',window.__boPgResize);
    $('pgNewGateway').addEventListener('click',()=>{resetGateway();openGatewayModal();});
    $('pgResetGateway').addEventListener('click',resetGateway);
    $('pgS1PayTemplate').addEventListener('click',loadS1PayTemplate);
    $('pgNewChannel').addEventListener('click',()=>editChannel(null));
    $('pgCancelChannel').addEventListener('click',()=>{$('pgChannelForm').hidden=true;});
    $('pgCloseModal').addEventListener('click',()=>closeGatewayModal());
    $('pgCloseModalBottom').addEventListener('click',()=>closeGatewayModal());
    $('pgGatewayModal').addEventListener('click',e=>{if(e.target===$('pgGatewayModal'))closeGatewayModal();});
    /* The Escape handler is bound once at file scope (the __boPgEsc slot), so it is not
       registered again here - a second registration would stack on every entry. */
    /* Land on the address the URL asks for: `?edit=<id>` opens that gateway, `?edit=new` a blank one, no
       parameter the list. popstate keeps Back/Forward honest - it is the same code path. */
    function pgSyncFromUrl(){
      const want=pgEditParam();
      if(want==null||want===''){ if(!$('pgGatewayModal').hidden) closeGatewayModal(true); return; }
      const found=(want==='new')?null:gateways.find(g=>String(g.id)===String(want));
      if(want!=='new'&&!found){ pgWriteUrl(null); if(!$('pgGatewayModal').hidden) closeGatewayModal(true); return; }
      if(found){ resetGateway(); fillGateway(found); } else { resetGateway(); }
      if($('pgGatewayModal').hidden) openGatewayModal(true);
      else { pgPanelsForCurrent(); pgTab('gateway'); pgApplyView(); }
    }
    window.addEventListener('popstate',()=>{ load().then(pgSyncFromUrl).catch(()=>pgSyncFromUrl()); });
    load().then(pgMountSegs).then(pgSyncFromUrl).catch(e=>notify(e.message,'error'));
    pgMountSegs();
    /* A router swap replaces the frame's markup, so the editor's visibility and the list's are re-derived
       on the page's own mount signal rather than assumed to have survived. */
    if(window.__boPgSpaViewBound) document.removeEventListener('bo:spa:content-mounted',window.__boPgSpaViewBound);
    window.__boPgSpaViewBound=pgApplyView;
    document.addEventListener('bo:spa:content-mounted',window.__boPgSpaViewBound);
  });
})();
