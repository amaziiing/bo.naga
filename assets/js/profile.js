(function(){
  const form = document.getElementById('profileForm');
  const statusEl = document.getElementById('profileStatus');
  if (!form && !statusEl && !document.getElementById('profileUsername')) return;
  function setStatus(message, type){
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.className = 'upload-status mb-3 ' + (type || '');
  }
  function fill(user){
    user = user || {};
    const username = document.getElementById('profileUsername');
    const displayName = document.getElementById('profileDisplayName');
    const adminId = document.getElementById('profileAdminId');
    const adminStatus = document.getElementById('profileAdminStatus');
    if (username) username.value = user.username || '';
    if (displayName) displayName.value = user.displayName || '';
    if (adminId) adminId.textContent = user.id || '-';
    if (adminStatus) adminStatus.textContent = Number(user.status) === 1 ? 'Active' : 'Inactive';
  }
  BO_AUTH.refreshMe().then(user => fill(user || BO_AUTH.user()));
  /* Once per form ELEMENT (the router re-runs this file on every entry - profile.html and
     main-profile.html share it - and each entry brings a fresh form; an unguarded listener
     would stack and save the profile twice per submit). */
  if (form && form.dataset.profileSubmitBound !== '1') {
    form.dataset.profileSubmitBound = '1';
    form.addEventListener('submit', async function(e){
    e.preventDefault(); setStatus('Saving profile...', '');
    try{
      const res = await fetch(BO_AUTH.profileUpdateUrl(), {
        method:'POST', headers:{'Content-Type':'application/json', ...BO_AUTH.authHeader()},
        body: JSON.stringify({ username: document.getElementById('profileUsername')?.value.trim() || '', displayName: document.getElementById('profileDisplayName')?.value.trim() || '' })
      });
      const json = await res.json().catch(() => ({}));
      if(!res.ok || json.status === 'error') throw new Error(json.message || 'Update profile failed');
      BO_AUTH.saveUser(json.data || {}); fill(json.data || {}); setStatus(json.message || 'Profile updated successfully', 'success');
    }catch(err){ setStatus(err.message || 'Update profile failed', 'error'); }
    });
  }
})();
