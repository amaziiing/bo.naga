(function () {
function adminApi(pathKey){ return API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS[pathKey]; }
function esc(v){ return String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s])); }
async function apiJson(url, opt){ const res = await fetch(url,opt); const json = await res.json().catch(()=>({})); if(!res.ok || json.status==='error') throw new Error(json.message || 'Request failed'); return json; }
const state = { languages: [], translations: {} };
function setBox(id,msg,type){ const el=document.getElementById(id); if(!el) return; el.textContent=msg||''; el.className='upload-status '+(type||''); }
async function loadLanguages(){
  const json = await apiJson(adminApi('LANGUAGE_LIST'));
  state.languages = json.data || [];
  const box = document.getElementById('languageList');
  if(box){ box.innerHTML = state.languages.map(l=>`<div class="translation-lang"><b>${esc(l.name)}</b><small>${esc(l.code)} · ${Number(l.status)===1?'Active':'Inactive'}</small><button type="button" data-edit-lang="${esc(l.code)}">Edit</button></div>`).join('') || '<div class="slider-empty">No language yet</div>'; }
}
async function saveLanguage(e){
  e.preventDefault();
  const fd = new FormData();
  fd.append('code', document.getElementById('langCode').value.trim());
  fd.append('name', document.getElementById('langName').value.trim());
  fd.append('sortOrder', document.getElementById('langSort').value || '0');
  fd.append('status', document.getElementById('langStatus').value || '1');
  setBox('languageStatus','Saving...','');
  try{ await apiJson(adminApi('LANGUAGE_SAVE'),{method:'POST',body:fd}); setBox('languageStatus','Language saved.','success'); await loadLanguages(); }
  catch(err){ setBox('languageStatus',err.message,'error'); }
}
function getFields(){ return document.getElementById('fieldKeys').value.split(',').map(x=>x.trim()).filter(Boolean); }
async function loadTranslation(){
  const refType=document.getElementById('refType').value;
  const refId=document.getElementById('refId').value;
  if(!refId){ setBox('translationStatus','Please enter entity ID.','error'); return; }
  setBox('translationStatus','Loading...','');
  try{
    if(!state.languages.length) await loadLanguages();
    const qs = new URLSearchParams({refType, refId});
    const json = await apiJson(adminApi('TRANSLATION_GET') + '?' + qs.toString());
    state.translations = json.data || {};
    renderEditor(refType, refId);
    setBox('translationStatus','Ready.','success');
  }catch(err){ setBox('translationStatus',err.message,'error'); }
}
function renderEditor(refType, refId){
  const editor=document.getElementById('translationEditor');
  const fields=getFields();
  const langs=state.languages.filter(l=>Number(l.status ?? 1) === 1 && String(l.code).toLowerCase() !== 'en');
  editor.innerHTML = langs.map(lang => `<div class="translation-card"><h3>${esc(lang.name)} <small>${esc(lang.code)}</small></h3>${fields.map(field=>{
    const data=(state.translations[lang.code] || {});
    const isImage = /image|icon|logo|favicon|banner|background/i.test(field);
    const value = isImage ? (data[field+'Url'] || data[field] || '') : (data[field] || '');
    return `<div class="translation-row"><label>${esc(field)}</label>${isImage ? `<div class="translation-image-line"><input type="file" accept="image/*" data-lang="${esc(lang.code)}" data-field="${esc(field)}"><span class="translation-image-preview" data-preview-lang="${esc(lang.code)}" data-preview-field="${esc(field)}">${value ? `<img src="${esc(value)}" alt="${esc(field)}">` : '<em>No image</em>'}</span><button type="button" data-save-image="1" data-lang="${esc(lang.code)}" data-field="${esc(field)}">Save Image</button></div>` : `<div class="translation-text-line"><input class="form-control" value="${esc(value)}" data-lang="${esc(lang.code)}" data-field="${esc(field)}"><button type="button" data-save-text="1" data-lang="${esc(lang.code)}" data-field="${esc(field)}">Save Text</button></div>`}</div>`;
  }).join('')}</div>`).join('') || '<div class="slider-empty">No active extra language. Add a language first.</div>';
}
function previewImage(input){
  const file = input.files && input.files[0];
  const line = input.closest('.translation-image-line');
  const preview = line ? line.querySelector('.translation-image-preview') : null;
  if(!preview || !file) return;
  if(!file.type || !file.type.startsWith('image/')){
    input.value = '';
    setBox('translationStatus','Please choose image file only.','error');
    return;
  }
  const old = preview.dataset.objectUrl;
  if(old) URL.revokeObjectURL(old);
  const url = URL.createObjectURL(file);
  preview.dataset.objectUrl = url;
  preview.innerHTML = `<img src="${url}" alt="Preview">`;
  setBox('translationStatus','Preview ready. Click Save Image to upload.','success');
}
async function saveText(btn){
  const refType=document.getElementById('refType').value, refId=document.getElementById('refId').value, lang=btn.dataset.lang, field=btn.dataset.field;
  const input=document.querySelector(`input[data-lang="${CSS.escape(lang)}"][data-field="${CSS.escape(field)}"]`);
  const fd=new FormData(); fd.append('refType',refType); fd.append('refId',refId); fd.append('langCode',lang); fd.append('fieldKey',field); fd.append('textValue',input.value);
  await apiJson(adminApi('TRANSLATION_TEXT'),{method:'POST',body:fd}); setBox('translationStatus','Text saved.','success');
}
async function saveImage(btn){
  const refType=document.getElementById('refType').value, refId=document.getElementById('refId').value, lang=btn.dataset.lang, field=btn.dataset.field;
  const input=document.querySelector(`input[type="file"][data-lang="${CSS.escape(lang)}"][data-field="${CSS.escape(field)}"]`);
  if(!input.files[0]){ setBox('translationStatus','Please choose image.','error'); return; }
  const fd=new FormData(); fd.append('refType',refType); fd.append('refId',refId); fd.append('langCode',lang); fd.append('fieldKey',field); fd.append('image',input.files[0]);
  await apiJson(adminApi('TRANSLATION_IMAGE'),{method:'POST',body:fd}); setBox('translationStatus','Image saved.','success'); await loadTranslation();
}
document.addEventListener('DOMContentLoaded',()=>{
  loadLanguages().catch(e=>setBox('languageStatus',e.message,'error'));
  document.getElementById('languageForm')?.addEventListener('submit', saveLanguage);
  document.getElementById('refreshLangBtn')?.addEventListener('click', loadLanguages);
  document.getElementById('loadTranslationBtn')?.addEventListener('click', loadTranslation);
  document.getElementById('languageList')?.addEventListener('click', e=>{ const b=e.target.closest('[data-edit-lang]'); if(!b) return; const l=state.languages.find(x=>x.code===b.dataset.editLang); if(!l) return; langCode.value=l.code; langName.value=l.name; langSort.value=l.sortOrder||0; langStatus.value=String(l.status??1); });
  document.getElementById('translationEditor')?.addEventListener('click', e=>{ const t=e.target.closest('[data-save-text]'); const i=e.target.closest('[data-save-image]'); if(t) saveText(t).catch(err=>setBox('translationStatus',err.message,'error')); if(i) saveImage(i).catch(err=>setBox('translationStatus',err.message,'error')); });
  document.getElementById('translationEditor')?.addEventListener('change', e=>{ const f=e.target.closest('input[type="file"][data-lang][data-field]'); if(f) previewImage(f); });
});
})();
