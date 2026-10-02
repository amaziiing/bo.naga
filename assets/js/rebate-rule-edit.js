(function(){
'use strict';
/* Rebate Rule — create / edit on its own page.

   Opened from Rebate Management or Rebate Setting ("+ Add rule") and from a row's pencil
   (?id=<rule id>), which is why the page is one form in two modes rather than two pages:
   the modal it replaces was already both. ?from=setting sends Back/Cancel back to the
   setting list instead of the management one.

   The datetime picker and ruleBody() below are the code that lived in rebate-management.js
   for the modal; the modal is gone, so they live here, re-scoped to this page (#rreForm /
   .rre-workspace) and otherwise unchanged. */
const base=window.API_BASE||'';
const $=id=>document.getElementById(id);
const admin=()=>{const u=window.BO_AUTH&&BO_AUTH.user?BO_AUTH.user():{};return u.username||u.displayName||localStorage.getItem('adminUsername')||localStorage.getItem('admin_username')||'ADMIN';};
const state={vipLevels:[],gameCategories:[]};
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function request(url,opt){opt=opt||{};opt.headers=Object.assign({},window.BO_AUTH&&BO_AUTH.authHeader?BO_AUTH.authHeader():{}, {'X-Admin-Username':admin(),'Cache-Control':'no-cache, no-store'},opt.headers||{});const r=await fetch(url,opt);const j=await r.json().catch(()=>({}));if(!r.ok||j.status==='error')throw Error(j.message||'Request failed');return j.data;}
function showError(e){if(window.BO_DIALOG&&BO_DIALOG.alert)BO_DIALOG.alert(e.message||String(e),{title:'Unable to Continue',type:'error'});}
function qs(){try{return new URLSearchParams(location.search||'');}catch(e){return new URLSearchParams();}}
/* Back / Cancel go to the list this page was opened from. */
function backHref(){return qs().get('from')==='setting'?'daily-rebate-setting.html':'rebate-management.html';}
function input(id,v){const e=$(id);if(e)e.value=v==null?'':v;}
function localDate(v){if(!v)return'';return String(v).slice(0,16);}
function apiEndpoint(key,fallback){
  const cfg=window.API_CONFIG||{};
  return String(cfg.BASE_URL||'')+String((cfg.ENDPOINTS&&cfg.ENDPOINTS[key])||fallback||'');
}
function optionValue(x){return String(x==null?'':x).trim();}
function normalizeCategoryValue(x){
  const raw=optionValue(x.code||x.categoryCode||x.key||x.name).toUpperCase();
  if(raw.includes('SLOT'))return 'SLOT';
  if(raw.includes('LIVE')||raw.includes('CASINO'))return 'LIVE';
  if(raw.includes('SPORT')||raw.includes('SOCCER'))return 'SPORTS';
  return raw.replace(/\s+/g,'_');
}
function asList(payload){
  if(Array.isArray(payload)) return payload;
  if(!payload||typeof payload!=='object') return [];
  if(Array.isArray(payload.content)) return payload.content;
  if(Array.isArray(payload.list)) return payload.list;
  if(Array.isArray(payload.records)) return payload.records;
  if(Array.isArray(payload.rows)) return payload.rows;
  return [];
}
function vipOrder(x){return x&&(x.sortOrder??x.order??x.vipLevel??x.level);}
function vipLabel(x){
  const order=vipOrder(x);
  const name=String((x&&(x.name||x.levelName||x.levelKey))||'').trim();
  if(name&&order!=null&&order!=='') return String(order)+' · '+name;
  if(name) return name;
  return order!=null&&order!==''?String(order):'Level';
}
function syncSelectUi(el){if(el&&window.BOSelectSync&&typeof BOSelectSync.one==='function')BOSelectSync.one(el);}
function renderRuleMetadata(selectedCategory,selectedVip){
  const cat=$('rrGameCategory'),vip=$('rrVipLevel');
  if(cat){
    const defaults=[{value:'SLOT',label:'Slot'},{value:'LIVE',label:'Live'},{value:'SPORTS',label:'Sports'}];
    const map=new Map(defaults.map(x=>[x.value,x.label]));
    state.gameCategories.forEach(x=>{const value=normalizeCategoryValue(x);if(value)map.set(value,x.name||x.categoryName||value.replaceAll('_',' '));});
    if(selectedCategory&&!map.has(String(selectedCategory)))map.set(String(selectedCategory),String(selectedCategory));
    cat.innerHTML='<option value="">All Categories</option>'+[...map].map(([value,label])=>'<option value="'+esc(value)+'">'+esc(label)+'</option>').join('');
    cat.value=selectedCategory||'';
    syncSelectUi(cat);
  }
  if(vip){
    const ordered=[...state.vipLevels]
      .filter(x=>Number(x.enabled??1)!==0)
      .sort((a,b)=>Number(vipOrder(a)||0)-Number(vipOrder(b)||0));
    if(!ordered.length){
      vip.innerHTML='<option value="">No levels configured</option>';
    }else{
      vip.innerHTML='<option value="">Select level</option>'+ordered.map(x=>{
        const order=vipOrder(x);
        return '<option value="'+esc(order)+'">'+esc(vipLabel(x))+'</option>';
      }).join('');
      if(selectedVip!=null&&selectedVip!==''&&!ordered.some(x=>String(vipOrder(x))===String(selectedVip))){
        vip.insertAdjacentHTML('beforeend','<option value="'+esc(selectedVip)+'">'+esc(selectedVip)+'</option>');
      }
    }
    vip.value=selectedVip==null?'':String(selectedVip);
    syncSelectUi(vip);
  }
}
async function loadRuleMetadata(){
  const headers=window.BO_AUTH&&BO_AUTH.authHeader?BO_AUTH.authHeader():{};
  const [vipResult,categoryResult]=await Promise.allSettled([
    fetch(apiEndpoint('VIP_LEVEL_LIST','/admin/vip/levels'),{headers}).then(r=>r.ok?r.json():Promise.reject(Error('VIP list failed'))),
    fetch(apiEndpoint('GAME_CATEGORY_LIST','/admin/game-category/list'),{headers}).then(r=>r.ok?r.json():Promise.reject(Error('Category list failed')))
  ]);
  if(vipResult.status==='fulfilled')state.vipLevels=asList(vipResult.value&&vipResult.value.data);
  if(categoryResult.status==='fulfilled')state.gameCategories=asList(categoryResult.value&&categoryResult.value.data);
  renderRuleMetadata($('rrGameCategory')&&$('rrGameCategory').value,$('rrVipLevel')&&$('rrVipLevel').value);
}
function syncVipScope(){
  const scope=$('rrVipScope'),vip=$('rrVipLevel');
  if(!scope||!vip)return;
  const all=scope.value==='ALL';
  vip.disabled=all;
  if(all)vip.value='';
  syncSelectUi(vip);
}
/* Fill the form. Same field map the modal used; a create opens on the first configured VIP
   level, an edit restores the scope the rule was saved with (no level = All VIP). */
function fillForm(x){
  x=x||{};
  input('rrId',x.id);input('rrName',x.name);input('rrProviderCode',x.providerCode);
  renderRuleMetadata(x.gameCategory,x.vipLevel);
  input('rrVipScope',x.id?(x.vipLevel==null?'ALL':'SPECIFIC'):'SPECIFIC');
  if(!x.id&&$('rrVipLevel')&&!$('rrVipLevel').value){
    const first=[...$('rrVipLevel').options].find(o=>o.value);
    if(first)$('rrVipLevel').value=first.value;
  }
  syncVipScope();
  input('rrMinValidBet',x.minValidBet);input('rrMaxValidBet',x.maxValidBet);
  input('rrRebateRate',x.rebateRate);input('rrMaxRebate',x.maxRebate);
  input('rrPriority',x.priority==null?0:x.priority);
  input('rrCombinationMode',x.combinationMode||'HIGHER_RATE');
  input('rrClaimMode',x.claimMode||'MANUAL');
  input('rrSettlementCycle',x.settlementCycle||'DAILY');
  input('rrStatus',x.status==null?1:x.status);
  input('rrStartAt',localDate(x.startAt));input('rrEndAt',localDate(x.endAt));
  syncDatetimeFields();
}
function setMode(edit){
  const title=edit?'Edit Rebate Rule':'Add Rebate Rule';
  const block=$('rreFormTitle'); if(block)block.textContent=title;
  const pageTitle=$('rrePageTitle'); if(pageTitle)pageTitle.textContent=title;
  const save=$('rreSaveBtn'); if(save)save.innerHTML='<i class="bi bi-save" aria-hidden="true"></i> '+(edit?'Save Changes':'Save Rule');
  document.title=title;
}

function fmtDatetimeLocal(v){
  const raw=String(v||'').trim();
  if(!raw) return '';
  const [datePart,timePart=''] = raw.split('T');
  const bits=datePart.split('-');
  if(bits.length!==3) return raw.replace('T',' ');
  return bits[2]+'/'+bits[1]+'/'+bits[0]+(timePart?' '+timePart.slice(0,5):'');
}
function syncDatetimeField(id){
  const inputEl=$(id); if(!inputEl) return;
  const shell=inputEl.closest('.rebate-dt-shell');
  const text=shell&&shell.querySelector('.rebate-dt-text');
  if(!text) return;
  const label=fmtDatetimeLocal(inputEl.value);
  if(label){
    text.textContent=label;
    text.classList.remove('is-empty');
  }else{
    text.textContent='Select date & time';
    text.classList.add('is-empty');
  }
}
function syncDatetimeFields(){['rrStartAt','rrEndAt'].forEach(syncDatetimeField);}
function closeAllDatetimePops(except){
  document.querySelectorAll('#rreForm .rebate-dt-pop.show').forEach(pop=>{
    if(except&&pop===except) return;
    pop.classList.remove('show');
  });
  document.querySelectorAll('#rreForm .rebate-dt-shell.is-open').forEach(shell=>{
    if(except&&shell.contains(except)) return;
    shell.classList.remove('is-open');
  });
}
function parseDatetimeLocal(v){
  const raw=String(v||'').trim();
  if(!raw) return null;
  const d=new Date(raw.includes('T')?raw:raw+'T00:00');
  return isNaN(d.getTime())?null:d;
}
function toDatetimeLocal(d){
  if(!d||isNaN(d.getTime())) return '';
  const pad=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
}
function ensureDatetimePop(shell,inputEl){
  let pop=shell.querySelector('.rebate-dt-pop');
  if(pop&&pop.dataset.dtV!=='5'){ pop.remove(); pop=null; }
  if(pop) return pop;
  pop=document.createElement('div');
  pop.className='rebate-dt-pop';
  pop.dataset.dtV='5';
  pop.innerHTML=[
    '<div class="rebate-dt-summary">',
    '<span class="rebate-dt-summary-text" data-summary>—</span>',
    '<button type="button" class="rebate-dt-summary-clear" data-clear aria-label="Clear">Clear</button>',
    '</div>',
    '<div class="rebate-dt-body">',
    '<div class="rebate-dt-cal">',
    '<div class="rebate-dt-cal-head">',
    '<button type="button" class="rebate-dt-nav" data-nav="-1" aria-label="Previous month"><i class="bi bi-chevron-left"></i></button>',
    '<button type="button" class="rebate-dt-month" data-month-label></button>',
    '<button type="button" class="rebate-dt-nav" data-nav="1" aria-label="Next month"><i class="bi bi-chevron-right"></i></button>',
    '</div>',
    '<div class="rebate-dt-week"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>',
    '<div class="rebate-dt-days" data-days></div>',
    '</div>',
    '<div class="rebate-dt-time">',
    '<div class="rebate-dt-step" data-step="hour">',
    '<span class="rebate-dt-step-label">Hour</span>',
    '<button type="button" class="rebate-dt-step-btn" data-hour-up aria-label="Hour up"><i class="bi bi-chevron-up"></i></button>',
    '<button type="button" class="rebate-dt-step-val" data-hour-val title="Click to pick">00</button>',
    '<button type="button" class="rebate-dt-step-btn" data-hour-down aria-label="Hour down"><i class="bi bi-chevron-down"></i></button>',
    '</div>',
    '<div class="rebate-dt-time-colon" aria-hidden="true">:</div>',
    '<div class="rebate-dt-step" data-step="min">',
    '<span class="rebate-dt-step-label">Min</span>',
    '<button type="button" class="rebate-dt-step-btn" data-min-up aria-label="Minute up"><i class="bi bi-chevron-up"></i></button>',
    '<button type="button" class="rebate-dt-step-val" data-min-val title="Click to pick">00</button>',
    '<button type="button" class="rebate-dt-step-btn" data-min-down aria-label="Minute down"><i class="bi bi-chevron-down"></i></button>',
    '</div>',
    '</div>',
    '<div class="rebate-dt-pick" data-pick hidden>',
    '<div class="rebate-dt-pick-bar">',
    '<button type="button" class="rebate-dt-pick-back" data-pick-back aria-label="Back"><i class="bi bi-chevron-left"></i></button>',
    '<span class="rebate-dt-pick-title" data-pick-title>Hour</span>',
    '</div>',
    '<div class="rebate-dt-pick-quick" data-pick-quick hidden></div>',
    '<div class="rebate-dt-pick-grid" data-pick-grid></div>',
    '</div>',
    '</div>',
    '<div class="rebate-dt-foot">',
    '<button type="button" class="rebate-dt-foot-ghost" data-today>Today</button>',
    '<button type="button" class="rebate-dt-foot-primary" data-done>Done</button>',
    '</div>'
  ].join('');
  shell.appendChild(pop);
  const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTHS_SHORT=MONTHS;
  const pad=n=>String(n).padStart(2,'0');
  let view=new Date();
  let pickKind=null;
  const pickEl=pop.querySelector('[data-pick]');
  const pickGrid=pop.querySelector('[data-pick-grid]');
  const pickQuick=pop.querySelector('[data-pick-quick]');
  const pickTitle=pop.querySelector('[data-pick-title]');
  function selected(){
    return parseDatetimeLocal(inputEl.value)||null;
  }
  function baseDate(){
    const sel=selected();
    if(sel) return new Date(sel);
    const n=new Date();
    n.setSeconds(0,0);
    return n;
  }
  function commit(d){
    inputEl.value=toDatetimeLocal(d);
    inputEl.dispatchEvent(new Event('input',{bubbles:true}));
    inputEl.dispatchEvent(new Event('change',{bubbles:true}));
    syncDatetimeField(inputEl.id);
    render();
  }
  function nudge(kind,delta){
    const d=baseDate();
    if(kind==='hour') d.setHours((d.getHours()+delta+24)%24);
    else d.setMinutes((d.getMinutes()+delta+60)%60);
    commit(d);
  }
  function closePick(){
    pickKind=null;
    pickEl.hidden=true;
    pop.classList.remove('is-picking');
  }
  function openPick(kind){
    pickKind=kind;
    const cur=baseDate();
    const active=kind==='hour'?cur.getHours():cur.getMinutes();
    pickTitle.textContent=kind==='hour'?'Hour':'Minute';
    pickQuick.hidden=kind!=='min';
    pickQuick.innerHTML='';
    if(kind==='min'){
      [0,15,30,45].forEach(m=>{
        const b=document.createElement('button');
        b.type='button';
        b.className='rebate-dt-pick-chip'+(m===active?' is-selected':'');
        b.textContent=':'+pad(m);
        b.addEventListener('click',e=>{
          e.preventDefault();e.stopPropagation();
          const d=baseDate(); d.setMinutes(m,0,0); commit(d); closePick();
        });
        pickQuick.appendChild(b);
      });
    }
    pickGrid.className='rebate-dt-pick-grid'+(kind==='hour'?' is-hour':' is-min');
    pickGrid.innerHTML='';
    const count=kind==='hour'?24:60;
    for(let i=0;i<count;i++){
      const b=document.createElement('button');
      b.type='button';
      b.className='rebate-dt-pick-opt'+(i===active?' is-selected':'');
      b.textContent=pad(i);
      b.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        const d=baseDate();
        if(kind==='hour') d.setHours(i);
        else d.setMinutes(i,0,0);
        commit(d);
        closePick();
      });
      pickGrid.appendChild(b);
    }
    pickEl.hidden=false;
    pop.classList.add('is-picking');
    const selBtn=pickGrid.querySelector('.is-selected');
    if(selBtn) requestAnimationFrame(()=>selBtn.scrollIntoView({block:'nearest'}));
  }
  function placePop(){
    pop.classList.remove('is-up');
    const body=document.querySelector('.rre-workspace');
    if(!body) return;
    const shellRect=shell.getBoundingClientRect();
    const bodyRect=body.getBoundingClientRect();
    if(shellRect.bottom+300>bodyRect.bottom-8) pop.classList.add('is-up');
  }
  function render(){
    const sel=selected();
    const focus=sel?new Date(sel):view;
    if(!pop.dataset.viewLocked){
      view=new Date(focus.getFullYear(),focus.getMonth(),1);
    }
    pop.querySelector('[data-month-label]').textContent=MONTHS[view.getMonth()]+' '+view.getFullYear();
    const summary=pop.querySelector('[data-summary]');
    if(sel){
      summary.textContent=sel.getDate()+' '+MONTHS_SHORT[sel.getMonth()]+' '+sel.getFullYear()+' · '+pad(sel.getHours())+':'+pad(sel.getMinutes());
      summary.classList.remove('is-empty');
    }else{
      summary.textContent='Pick a date & time';
      summary.classList.add('is-empty');
    }
    const days=pop.querySelector('[data-days]');
    days.innerHTML='';
    const first=new Date(view.getFullYear(),view.getMonth(),1);
    const offset=first.getDay();
    const daysInMonth=new Date(view.getFullYear(),view.getMonth()+1,0).getDate();
    const cellCount=Math.ceil((offset+daysInMonth)/7)*7;
    const selKey=sel?sel.getFullYear()+'-'+pad(sel.getMonth()+1)+'-'+pad(sel.getDate()):'';
    const now=new Date();
    const todayKey=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate());
    for(let i=0;i<cellCount;i++){
      const d=new Date(view.getFullYear(),view.getMonth(),i-offset+1);
      const key=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
      const btn=document.createElement('button');
      btn.type='button';
      btn.textContent=String(d.getDate());
      btn.className='rebate-dt-day'
        +(d.getMonth()!==view.getMonth()?' is-muted':'')
        +(key===selKey?' is-selected':'')
        +(key===todayKey?' is-today':'');
      btn.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        const base=baseDate();
        const next=new Date(d.getFullYear(),d.getMonth(),d.getDate(),base.getHours(),base.getMinutes(),0,0);
        pop.dataset.viewLocked='1';
        view=new Date(d.getFullYear(),d.getMonth(),1);
        commit(next);
      });
      days.appendChild(btn);
    }
    const hour=sel?sel.getHours():baseDate().getHours();
    const minute=sel?sel.getMinutes():baseDate().getMinutes();
    pop.querySelector('[data-hour-val]').textContent=pad(hour);
    pop.querySelector('[data-min-val]').textContent=pad(minute);
  }
  if(!pop.dataset.wired){
    pop.dataset.wired='1';
    pop.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      pop.dataset.viewLocked='1';
      view=new Date(view.getFullYear(),view.getMonth()+Number(b.dataset.nav),1);
      render();
    }));
    pop.querySelector('[data-clear]').addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      inputEl.value='';
      inputEl.dispatchEvent(new Event('input',{bubbles:true}));
      inputEl.dispatchEvent(new Event('change',{bubbles:true}));
      syncDatetimeField(inputEl.id);
      delete pop.dataset.viewLocked;
      closePick();
      closeAllDatetimePops();
    });
    pop.querySelector('[data-today]').addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      delete pop.dataset.viewLocked;
      closePick();
      commit(new Date());
    });
    pop.querySelector('[data-done]').addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      if(!selected()) commit(baseDate());
      closePick();
      closeAllDatetimePops();
    });
    pop.querySelector('[data-hour-up]').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();nudge('hour',1);});
    pop.querySelector('[data-hour-down]').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();nudge('hour',-1);});
    pop.querySelector('[data-min-up]').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();nudge('min',1);});
    pop.querySelector('[data-min-down]').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();nudge('min',-1);});
    pop.querySelector('[data-hour-val]').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openPick('hour');});
    pop.querySelector('[data-min-val]').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openPick('min');});
    pop.querySelector('[data-pick-back]').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closePick();});
    pop.addEventListener('click',e=>e.stopPropagation());
    pop._closePick=closePick;
  }
  pop._render=render;
  pop._place=placePop;
  return pop;
}
function openDatetimePop(inputEl){
  const shell=inputEl.closest('.rebate-dt-shell');
  if(!shell) return;
  const pop=ensureDatetimePop(shell,inputEl);
  const opening=!pop.classList.contains('show');
  closeAllDatetimePops(opening?pop:null);
  if(!opening){ pop.classList.remove('show'); shell.classList.remove('is-open'); if(pop._closePick) pop._closePick(); return; }
  delete pop.dataset.viewLocked;
  if(pop._closePick) pop._closePick();
  pop._render();
  pop.classList.add('show');
  shell.classList.add('is-open');
  pop._place();
}
function wireDatetimeFields(){
  document.querySelectorAll('#rreForm .rebate-dt-trigger').forEach(btn=>{
    if(btn.dataset.dtWired==='1') return;
    btn.dataset.dtWired='1';
    btn.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      const inputEl=$(btn.getAttribute('data-dt-for'));
      if(!inputEl) return;
      openDatetimePop(inputEl);
    });
  });
  ['rrStartAt','rrEndAt'].forEach(id=>{
    const inputEl=$(id); if(!inputEl||inputEl.dataset.dtWired==='1') return;
    inputEl.dataset.dtWired='1';
    inputEl.addEventListener('input',()=>syncDatetimeField(id));
    inputEl.addEventListener('change',()=>syncDatetimeField(id));
  });
  /* document-level listeners: one slot, the previous handler removed first. A "wired" mark
     is not enough here - documentElement survives a SPA swap, so the mark kept the FIRST
     instance's closures bound while the page around them was replaced (SPA.md ②). */
  if(window.__rreDtClick) document.removeEventListener('click',window.__rreDtClick);
  window.__rreDtClick=function(e){
    const t=e.target;
    /* A click can arrive with document/window as its target (a synthetic event, a scrollbar
       drag): `.closest` only exists on an Element. Measured - the unguarded form threw
       "e.target.closest is not a function" and left the popover open. */
    if(t&&t.closest&&t.closest('#rreForm .rebate-dt-shell')) return;
    closeAllDatetimePops();
  };
  document.addEventListener('click',window.__rreDtClick);
  if(window.__rreDtKey) document.removeEventListener('keydown',window.__rreDtKey);
  window.__rreDtKey=function(e){
    if(e.key!=='Escape') return;
    const openPop=document.querySelector('#rreForm .rebate-dt-pop.show');
    if(openPop&&openPop.classList.contains('is-picking')&&openPop._closePick){
      openPop._closePick();
      return;
    }
    closeAllDatetimePops();
  };
  document.addEventListener('keydown',window.__rreDtKey);
  syncDatetimeFields();
}
function ruleBody(){const get=id=>$(id).value.trim(),num=id=>get(id)===''?null:Number(get(id));const vipLevel=get('rrVipScope')==='ALL'?null:num('rrVipLevel');return{id:num('rrId'),name:get('rrName'),providerCode:get('rrProviderCode')||null,gameCategory:get('rrGameCategory')||null,vipLevel:vipLevel,minValidBet:num('rrMinValidBet'),maxValidBet:num('rrMaxValidBet'),rebateRate:num('rrRebateRate'),maxRebate:num('rrMaxRebate'),priority:num('rrPriority')||0,combinationMode:get('rrCombinationMode'),claimMode:get('rrClaimMode'),settlementCycle:get('rrSettlementCycle'),status:num('rrStatus'),startAt:get('rrStartAt')||null,endAt:get('rrEndAt')||null};}

async function submit(e){
  e.preventDefault();
  const btn=$('rreSaveBtn');
  try{
    const body=ruleBody();
    if(!body.name)throw Error('Rule name is required');
    if($('rrVipScope').value==='SPECIFIC'&&body.vipLevel==null)throw Error('Please select a VIP level');
    if(body.rebateRate==null||body.rebateRate<0)throw Error('Rebate rate is required');
    if(body.maxValidBet!=null&&body.minValidBet!=null&&body.maxValidBet<body.minValidBet)throw Error('Maximum valid bet must be greater than minimum');
    if(btn)btn.disabled=true;
    await request(base+'/api/admin/rebate/rules/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(window.BO_DIALOG&&BO_DIALOG.alert)await BO_DIALOG.alert('Rebate rule saved successfully.',{title:'Saved'});
    location.href=backHref();
  }catch(err){
    showError(err);
    if(btn)btn.disabled=false;
  }
}
async function boot(){
  const back=backHref();
  ['rreBackLink','rreCancelLink'].forEach(id=>{const a=$(id);if(a)a.href=back;});
  if(!$('rreForm'))return;                       /* not this page - the script is shared-safe */
  const id=qs().get('id');
  setMode(!!id);
  await loadRuleMetadata();
  if(id){
    try{
      const rows=await request(base+'/api/admin/rebate/rules')||[];
      const rule=(rows||[]).find(x=>String(x.id)===String(id));
      if(!rule)throw Error('Rebate rule not found');
      fillForm(rule);
    }catch(err){showError(err);}
  }else{
    fillForm({});
  }
  wireDatetimeFields();
  const scope=$('rrVipScope'); if(scope)scope.onchange=syncVipScope;
  const form=$('rreForm'); if(form)form.onsubmit=submit;
}
document.addEventListener('DOMContentLoaded',boot);

})();
