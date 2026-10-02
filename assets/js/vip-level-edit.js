(function(){
  /* A swap re-runs this file: the three document delegations below were added again on each
     entry, so N entries meant N input/click copies (each one able to re-render or re-open a
     status menu twice). Release the previous run's bindings first. */
  if(window.__boVleUnbind) window.__boVleUnbind();
  const unbinds=[];
  const listen=(target,type,fn,opt)=>{ target.addEventListener(type,fn,opt); unbinds.push(()=>target.removeEventListener(type,fn,opt)); };
  window.__boVleUnbind=()=>{ unbinds.forEach(fn=>fn()); unbinds.length=0; };
  const $=s=>document.querySelector(s);
  let stepRows=[], listCount=0;
  const url=k=>API_CONFIG.BASE_URL+API_CONFIG.ENDPOINTS[k];
  const headers=()=>Object.assign({'Content-Type':'application/json'},window.BO_AUTH?BO_AUTH.authHeader():{});
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const val=(id,v)=>{const e=$(id);if(e)e.value=v==null?'':v};
  const num=id=>Number(($(id)?.value)||0);
  const params=new URLSearchParams(location.search||'');
  let editId=params.get('id');
  if(!editId){
    const hash=String(location.hash||'').replace(/^#/, '');
    if(hash){
      if(hash.startsWith('id=')) editId=new URLSearchParams(hash).get('id');
      else if(/^\d+$/.test(hash)) editId=hash;
      else editId=new URLSearchParams(hash).get('id');
    }
  }

  function syncPageChrome(){
    const enabled=String($('#vipEnabled')?.value||'1')==='1';
    const pill=$('#vipPageStatus');
    if(pill){
      pill.textContent=enabled?'Enabled':'Disabled';
      pill.classList.toggle('is-enabled',enabled);
      pill.classList.toggle('is-disabled',!enabled);
    }
  }

  function autosizeDescription(){
    const el=$('#vipDescription');
    if(!el)return;
    el.style.height='auto';
    el.style.height=Math.max(120,el.scrollHeight)+'px';
  }

  const imagePreview=u=>{
    const p=$('#vipImagePreview');if(!p)return;
    const safe=String(u||'').trim();
    p.innerHTML=safe?`<img src="${esc(safe)}" alt="VIP level image">`:'<i class="bi bi-image"></i><span>No image uploaded</span>';
  };

  function normalizeStep(x,i){
    return {
      id:x&&x.id||null,
      stepKey:x&&x.stepKey||'',
      name:x&&x.name||`Level ${i+1}`,
      requiredExperience:Number(x&&x.requiredExperience||100),
      rewardAmount:Number(x&&x.rewardAmount||0),
      turnoverMultiplier:Number(x&&x.turnoverMultiplier||0),
      maxWithdrawal:Number(x&&x.maxWithdrawal||0),
      depositBonusPercent:Number(x&&x.depositBonusPercent||0),
      rewardDescription:x&&x.rewardDescription||'',
      rewardImageUrl:x&&x.rewardImageUrl||'',
      depositBonusImageUrl:x&&x.depositBonusImageUrl||'',
      turnoverImageUrl:x&&x.turnoverImageUrl||'',
      bannerImageUrl:x&&x.bannerImageUrl||'',
      bannerDetailHtml:x&&x.bannerDetailHtml||'',
      enabled:x&&x.enabled==null?1:Number(x&&x.enabled),
      sortOrder:Number(x&&x.sortOrder||i+1)
    };
  }

  function renderStepSummaryOnly(){
    const sum=$('#vipStepSummary');
    if(!sum)return;
    const total=stepRows.filter(x=>Number(x.enabled)===1).reduce((a,x)=>a+Number(x.requiredExperience||0),0);
    sum.textContent=`${stepRows.length} step(s) · ${total.toLocaleString()} EXP total`;
  }

  function renderSteps(){
    const wrap=$('#vipStepList');if(!wrap)return;
    stepRows=stepRows.map((x,i)=>Object.assign(x,{sortOrder:i+1}));
    renderStepSummaryOnly();
    if(!stepRows.length){
      wrap.innerHTML='<div class="vip-step-empty">No inner level yet. Click <b>Add Step</b> to create Bronze 1, Bronze 2, etc.</div>';
      return;
    }
    const statusField=(x)=>`<div class="vip-step-status-select" data-step-status><input type="hidden" data-step-field="enabled" value="${Number(x.enabled)===1?1:0}"><button class="vip-step-status-btn ${Number(x.enabled)===1?'is-enabled':'is-disabled'}" type="button" data-step-status-toggle aria-haspopup="listbox" aria-expanded="false"><span>${Number(x.enabled)===1?'Enabled':'Disabled'}</span><i class="bi bi-chevron-down"></i></button><div class="vip-step-status-menu" role="listbox"><button type="button" role="option" data-step-status-value="1" class="${Number(x.enabled)===1?'selected':''}">Enabled<i class="bi bi-check-lg"></i></button><button type="button" role="option" data-step-status-value="0" class="${Number(x.enabled)!==1?'selected':''}">Disabled<i class="bi bi-check-lg"></i></button></div></div>`;
    const imageBox=(url,label,field,i)=>`<div class="vip-step-artwork"><div class="vip-step-artwork-title">${label}</div><input type="hidden" data-step-field="${field}" value="${esc(url||'')}"><div class="vip-step-image-box">${url?`<img src="${esc(url)}" alt="${esc(label)}">`:'<i class="bi bi-image"></i><span>No image</span>'}</div><div class="vip-step-image-actions"><button type="button" class="clean-btn" data-step-image-upload="${i}" data-step-image-field="${field}"><i class="bi bi-upload"></i> Upload</button>${url?`<button type="button" class="clean-btn danger" data-step-image-remove="${i}" data-step-image-field="${field}" title="Remove"><i class="bi bi-trash"></i></button>`:''}</div></div>`;
    wrap.innerHTML=stepRows.map((x,i)=>`<section class="vip-step-row" data-step-row="${i}">
      <div class="vip-step-card-head">
        <div class="vip-step-no">#${i+1}</div>
        <div class="vip-step-card-copy"><b>${esc(x.name||('Level '+(i+1)))}</b><small>Milestone reward · EXP unlocks claim</small></div>
        <div class="vip-step-card-tools">${statusField(x)}<button class="clean-btn danger vip-step-remove" data-remove-step="${i}" type="button" title="Remove step" aria-label="Remove step"><i class="bi bi-trash"></i></button></div>
      </div>
      <div class="vip-step-main-grid">
        <label class="vle-field vip-step-name">Step name<input data-step-field="name" value="${esc(x.name)}" placeholder="Bronze 1" ${x.id?`data-translation-key="step.${x.id}.name" data-translation-label="Step ${i+1} Name"`:''}></label>
        <label class="vle-field">EXP<input data-step-field="requiredExperience" type="number" min="1" step="1" value="${Number(x.requiredExperience||1)}"></label>
        <label class="vle-field">Reward<input data-step-field="rewardAmount" type="number" min="0" step="0.01" value="${Number(x.rewardAmount||0)}"><small>MYR · claim</small></label>
        <label class="vle-field">Turnover<input data-step-field="turnoverMultiplier" type="number" min="0" step="0.01" value="${Number(x.turnoverMultiplier||0)}"><small>× after claim</small></label>
        <label class="vle-field">Max WD<input data-step-field="maxWithdrawal" type="number" min="0" step="0.01" value="${Number(x.maxWithdrawal||0)}"></label>
        <label class="vle-field">Dep bonus<input data-step-field="depositBonusPercent" type="number" min="0" step="0.01" value="${Number(x.depositBonusPercent||0)}"><small>%</small></label>
        <label class="vle-field vip-step-note">Reward / Note<input data-step-field="rewardDescription" value="${esc(x.rewardDescription||'')}" placeholder="Level completion reward" ${x.id?`data-translation-key="step.${x.id}.rewardDescription" data-translation-label="Step ${i+1} Reward / Note"`:''}></label>
      </div>
      <div class="vip-step-media-title"><i class="bi bi-images"></i><div><b>Milestone artwork</b><small>Four slots · banner overrides the other three when set</small></div></div>
      <div class="vip-step-media-grid">
        ${imageBox(x.rewardImageUrl,'Reward','rewardImageUrl',i)}
        ${imageBox(x.depositBonusImageUrl,'Deposit','depositBonusImageUrl',i)}
        ${imageBox(x.turnoverImageUrl,'Turnover','turnoverImageUrl',i)}
        ${imageBox(x.bannerImageUrl,'Banner','bannerImageUrl',i)}
      </div>
      <div class="vip-banner-html-field">
        <div class="vip-step-media-title"><i class="bi bi-code-slash"></i><div><b>Banner click HTML</b><small>Optional · opens on banner tap</small></div></div>
        <textarea data-step-field="bannerDetailHtml" rows="3" placeholder="&lt;h2&gt;VIP Bonus&lt;/h2&gt;">${esc(x.bannerDetailHtml||'')}</textarea>
      </div>
      <div class="vip-step-banner-help"><i class="bi bi-info-circle"></i> Banner image replaces the other three artwork slots on Naga until removed.</div>
    </section>`).join('');
  }

  function readSteps(){
    document.querySelectorAll('[data-step-row]').forEach(row=>{
      const i=Number(row.dataset.stepRow),x=stepRows[i];if(!x)return;
      row.querySelectorAll('[data-step-field]').forEach(el=>{
        const k=el.dataset.stepField;
        x[k]=['requiredExperience','rewardAmount','turnoverMultiplier','maxWithdrawal','depositBonusPercent','enabled'].includes(k)?Number(el.value||0):el.value;
      });
    });
    return stepRows.map((x,i)=>({
      id:x.id||null,
      stepKey:x.stepKey||`step-${i+1}`,
      name:String(x.name||`Level ${i+1}`).trim(),
      requiredExperience:Math.max(1,Number(x.requiredExperience||1)),
      rewardAmount:Number(x.rewardAmount||0),
      turnoverMultiplier:Number(x.turnoverMultiplier||0),
      maxWithdrawal:Number(x.maxWithdrawal||0)||null,
      depositBonusPercent:Number(x.depositBonusPercent||0),
      rewardDescription:String(x.rewardDescription||'').trim(),
      rewardImageUrl:String(x.rewardImageUrl||'').trim(),
      depositBonusImageUrl:String(x.depositBonusImageUrl||'').trim(),
      turnoverImageUrl:String(x.turnoverImageUrl||'').trim(),
      bannerImageUrl:String(x.bannerImageUrl||'').trim(),
      bannerDetailHtml:String(x.bannerDetailHtml||'').trim(),
      enabled:Number(x.enabled)===1?1:0,
      sortOrder:i+1
    }));
  }

  function fillForm(x){
    x=x||{};
    [['#vipId','id'],['#vipName','name'],['#vipKey','levelKey'],['#vipExp','requiredExperience'],['#vipDepositRequirement','depositRequirement'],['#vipOrder','sortOrder'],['#vipLive','rebateLiveCasino'],['#vipSport','rebateSportsbook'],['#vipSlots','rebateSlots'],['#vipOne','oneTimeBonus'],['#vipMonthly','monthlyBonus'],['#vipWeekly','weeklyBonus'],['#vipBirthday','birthdayBonus'],['#vipMonthlyTurnover','monthlyBonusTurnoverMultiplier'],['#vipWeeklyTurnover','weeklyBonusTurnoverMultiplier'],['#vipUpgradeTurnover','upgradeBonusTurnoverMultiplier'],['#vipMonthlyMax','monthlyBonusMaxWithdrawal'],['#vipWeeklyMax','weeklyBonusMaxWithdrawal'],['#vipUpgradeMax','upgradeBonusMaxWithdrawal'],['#vipMonthlyMaintenance','monthlyMaintenanceDeposit'],['#vipWeeklyMaintenance','weeklyMaintenanceDeposit'],['#vipFrequency','withdrawalFrequency'],['#vipWithdrawAmount','withdrawalAmount'],['#vipDailyMaxWithdrawal','dailyMaxWithdrawalAmount'],['#vipMinWithdrawal','minWithdrawalAmount'],['#vipFreeWithdrawalCount','dailyFreeWithdrawalCount'],['#vipWithdrawalFee','withdrawalFeePercentage'],['#vipChannels','withdrawalChannels'],['#vipTheme','themeKey'],['#vipIcon','iconClass'],['#vipImageUrl','imageUrl'],['#vipEnabled','enabled'],['#vipDescription','description']].forEach(a=>val(a[0],x[a[1]]));
    imagePreview(x.imageUrl);
    if($('#vipImageFile'))$('#vipImageFile').value='';
    if(!x.id){
      val('#vipOrder',listCount+1);
      val('#vipEnabled',1);
      val('#vipTheme','bronze');
      val('#vipIcon','fa-solid fa-crown');
      val('#vipExp',0);
    }
    stepRows=(Array.isArray(x.steps)?x.steps:[]).map(normalizeStep);
    renderSteps();
    const isEdit=!!x.id;
    document.title=isEdit?'Edit VIP Level':'Add VIP Level';
    const title=$('#vipPageTitle');
    if(title)title.textContent=isEdit?'Edit VIP Level':'Add VIP Level';
    syncPageChrome();
    autosizeDescription();
    setTimeout(()=>{
      if(window.DynamicTranslation)window.DynamicTranslation.autoAttach(document);
      document.querySelector('#vipForm [data-refresh-translation]')?.click();
      autosizeDescription();
    },0);
  }

  async function loadSteps(id){
    try{
      const r=await fetch(url('VIP_LEVEL_LIST')+'/'+id+'/steps',{headers:headers()});
      const j=await r.json();
      if(Array.isArray(j.data))return j.data;
      if(Array.isArray(j))return j;
    }catch(e){}
    return [];
  }

  async function boot(){
    const r=await fetch(url('VIP_LEVEL_LIST'),{headers:headers()});
    const j=await r.json();
    const rows=Array.isArray(j.data)?j.data:[];
    listCount=rows.length;
    if(editId){
      const found=rows.find(x=>String(x.id)===String(editId));
      if(!found){
        alert('VIP level not found.');
        location.href='vip-management.html';
        return;
      }
      found.steps=await loadSteps(found.id);
      fillForm(found);
      return;
    }
    fillForm({});
  }

  async function uploadVipImage(file){
    if(!file)return;
    const allowed=['image/png','image/jpeg','image/webp','image/gif'];
    if(!allowed.includes(file.type))return alert('Please select a PNG, JPG, WEBP or GIF image.');
    const fd=new FormData();fd.append('image',file);
    const h=window.BO_AUTH?BO_AUTH.authHeader():{};
    const r=await fetch(url('VIP_IMAGE_UPLOAD'),{method:'POST',headers:h,body:fd});
    const j=await r.json();
    if(!r.ok||j.status==='error')throw new Error(j.message||'Image upload failed');
    const imageUrl=j.data&&j.data.url;
    if(!imageUrl)throw new Error('Upload response does not contain an image URL');
    val('#vipImageUrl',imageUrl);imagePreview(imageUrl);
  }

  async function uploadStepImage(file,index,field){
    if(!file)return;
    const allowed=['image/png','image/jpeg','image/webp','image/gif'];
    if(!allowed.includes(file.type))throw new Error('Please select a PNG, JPG, WEBP or GIF image.');
    const fd=new FormData();fd.append('image',file);
    const h=window.BO_AUTH?BO_AUTH.authHeader():{};
    const r=await fetch(url('VIP_IMAGE_UPLOAD'),{method:'POST',headers:h,body:fd});
    const j=await r.json();
    if(!r.ok||j.status==='error')throw new Error(j.message||'Image upload failed');
    const imageUrl=j.data&&j.data.url;
    if(!imageUrl)throw new Error('Upload response does not contain an image URL');
    readSteps();
    if(stepRows[index])stepRows[index][field]=imageUrl;
    renderSteps();
  }

  listen(document,'input',e=>{
    const row=e.target.closest('[data-step-row]');
    if(row&&e.target.matches('[data-step-field]')){readSteps();renderStepSummaryOnly();}
  });
  $('#vipEnabled')?.addEventListener('change',syncPageChrome);
  $('#vipDescription')?.addEventListener('input',autosizeDescription);

  listen(document,'click',e=>{
    const toggle=e.target.closest('[data-step-status-toggle]');
    if(toggle){
      e.preventDefault();e.stopPropagation();
      const box=toggle.closest('[data-step-status]');
      document.querySelectorAll('[data-step-status].open').forEach(x=>{
        if(x!==box){x.classList.remove('open');x.querySelector('[data-step-status-toggle]')?.setAttribute('aria-expanded','false');}
      });
      const open=!box.classList.contains('open');
      box.classList.toggle('open',open);
      toggle.setAttribute('aria-expanded',open?'true':'false');
      return;
    }
    const opt=e.target.closest('[data-step-status-value]');
    if(opt){
      e.preventDefault();e.stopPropagation();
      const box=opt.closest('[data-step-status]'),input=box?.querySelector('[data-step-field="enabled"]'),btn=box?.querySelector('[data-step-status-toggle]');
      if(!box||!input||!btn)return;
      const v=opt.dataset.stepStatusValue==='1'?'1':'0';
      input.value=v;
      btn.querySelector('span').textContent=v==='1'?'Enabled':'Disabled';
      btn.classList.toggle('is-enabled',v==='1');
      btn.classList.toggle('is-disabled',v!=='1');
      box.querySelectorAll('[data-step-status-value]').forEach(x=>x.classList.toggle('selected',x.dataset.stepStatusValue===v));
      box.classList.remove('open');
      btn.setAttribute('aria-expanded','false');
      readSteps();renderStepSummaryOnly();
      return;
    }
    document.querySelectorAll('[data-step-status].open').forEach(x=>{
      x.classList.remove('open');
      x.querySelector('[data-step-status-toggle]')?.setAttribute('aria-expanded','false');
    });
  });

  listen(document,'click',async e=>{
    if(e.target.closest('#vipChooseImage'))$('#vipImageFile')?.click();
    const stepUpload=e.target.closest('[data-step-image-upload]');
    if(stepUpload){
      const idx=Number(stepUpload.dataset.stepImageUpload),field=stepUpload.dataset.stepImageField||'rewardImageUrl';
      const input=document.createElement('input');
      input.type='file';input.accept='image/png,image/jpeg,image/webp,image/gif';
      input.onchange=async()=>{
        const file=input.files&&input.files[0];if(!file)return;
        try{await uploadStepImage(file,idx,field)}catch(err){alert(err.message||'Image upload failed')}
      };
      input.click();
    }
    const stepRemoveImage=e.target.closest('[data-step-image-remove]');
    if(stepRemoveImage){
      readSteps();
      const idx=Number(stepRemoveImage.dataset.stepImageRemove),field=stepRemoveImage.dataset.stepImageField||'rewardImageUrl';
      if(stepRows[idx])stepRows[idx][field]='';
      renderSteps();
    }
    if(e.target.closest('#vipRemoveImage')){
      val('#vipImageUrl','');
      if($('#vipImageFile'))$('#vipImageFile').value='';
      imagePreview('');
    }
    if(e.target.closest('#vipAddStep')){
      readSteps();
      const tier=($('#vipName')?.value||'VIP').trim()||'VIP';
      stepRows.push(normalizeStep({name:`${tier} ${stepRows.length+1}`,requiredExperience:100},stepRows.length));
      renderSteps();
    }
    const rm=e.target.closest('[data-remove-step]');
    if(rm){readSteps();stepRows.splice(Number(rm.dataset.removeStep),1);renderSteps();}
  });

  $('#vipImageFile')?.addEventListener('change',async e=>{
    const file=e.target.files&&e.target.files[0];if(!file)return;
    try{await uploadVipImage(file)}catch(err){alert(err.message||'Image upload failed');e.target.value='';}
  });

  $('#vipForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const steps=readSteps();
    if(steps.some(x=>x.requiredExperience<1))return alert('Every enabled progression step must require at least 1 EXP.');
    const data={
      id:$('#vipId').value?Number($('#vipId').value):null,
      name:$('#vipName').value.trim(),
      levelKey:$('#vipKey').value.trim(),
      requiredExperience:num('#vipExp'),
      depositRequirement:num('#vipDepositRequirement'),
      sortOrder:num('#vipOrder'),
      rebateLiveCasino:num('#vipLive'),
      rebateSportsbook:num('#vipSport'),
      rebateSlots:num('#vipSlots'),
      oneTimeBonus:num('#vipOne'),
      monthlyBonus:num('#vipMonthly'),
      weeklyBonus:num('#vipWeekly'),
      birthdayBonus:num('#vipBirthday'),
      monthlyBonusTurnoverMultiplier:num('#vipMonthlyTurnover'),
      weeklyBonusTurnoverMultiplier:num('#vipWeeklyTurnover'),
      upgradeBonusTurnoverMultiplier:num('#vipUpgradeTurnover'),
      monthlyBonusMaxWithdrawal:num('#vipMonthlyMax'),
      weeklyBonusMaxWithdrawal:num('#vipWeeklyMax'),
      upgradeBonusMaxWithdrawal:num('#vipUpgradeMax'),
      monthlyMaintenanceDeposit:num('#vipMonthlyMaintenance'),
      weeklyMaintenanceDeposit:num('#vipWeeklyMaintenance'),
      withdrawalFrequency:num('#vipFrequency'),
      withdrawalAmount:num('#vipWithdrawAmount'),
      dailyMaxWithdrawalAmount:num('#vipDailyMaxWithdrawal'),
      minWithdrawalAmount:num('#vipMinWithdrawal'),
      dailyFreeWithdrawalCount:num('#vipFreeWithdrawalCount'),
      withdrawalFeePercentage:num('#vipWithdrawalFee'),
      withdrawalChannels:$('#vipChannels').value.trim(),
      themeKey:$('#vipTheme').value,
      iconClass:$('#vipIcon').value.trim(),
      imageUrl:$('#vipImageUrl').value.trim(),
      enabled:num('#vipEnabled'),
      description:$('#vipDescription').value.trim()
    };
    const btn=$('#vipSaveLevel');
    if(btn){btn.disabled=true;btn.classList.add('is-busy');}
    try{
      const r=await fetch(url('VIP_LEVEL_SAVE'),{method:'POST',headers:headers(),body:JSON.stringify(data)});
      const j=await r.json();
      if(j.status==='error')return alert(j.message||'Save failed');
      const saved=j.data||{};
      if(saved.id){
        const sr=await fetch(url('VIP_LEVEL_LIST')+'/'+saved.id+'/steps',{method:'POST',headers:headers(),body:JSON.stringify(steps)});
        const sj=await sr.json();
        if(!sr.ok||sj.status==='error')return alert(sj.message||'VIP level saved, but progression steps failed to save.');
      }
      location.href='vip-management.html';
    }finally{
      if(btn){btn.disabled=false;btn.classList.remove('is-busy');}
    }
  });

  boot().catch(()=>alert('Unable to load VIP level.'));
})();
