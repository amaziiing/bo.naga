(function(){
  const form = document.getElementById('changePasswordForm');
  const statusEl = document.getElementById('changePasswordStatus');
  function setStatus(message, type){ statusEl.textContent = message || ''; statusEl.className = 'upload-status mb-3 ' + (type || ''); }
  /* Bound once per form ELEMENT, not once per script run: the router re-runs this file on
     every entry (the page carries data-bo-spa-rerun, because main-profile.html loads the same
     file), and the form it binds is a fresh clone each time - while an unguarded
     addEventListener would stack a second handler and POST the change twice per submit. */
  if (form && form.dataset.cpSubmitBound !== '1') {
    form.dataset.cpSubmitBound = '1';
    form.addEventListener('submit', async function(e){
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if(newPassword !== confirmPassword){ setStatus('Confirm password does not match.', 'error'); return; }
    setStatus('Changing password...', '');
    try{
      const res = await fetch(BO_AUTH.changePasswordUrl(), {
        method:'POST', headers:{'Content-Type':'application/json', ...BO_AUTH.authHeader()},
        body: JSON.stringify({ currentPassword: document.getElementById('currentPassword').value, newPassword })
      });
      const json = await res.json().catch(() => ({}));
      if(!res.ok || json.status === 'error') throw new Error(json.message || 'Change password failed');
      form.reset(); setStatus(json.message || 'Password changed successfully', 'success');
    }catch(err){ setStatus(err.message || 'Change password failed', 'error'); }
    });
  }
})();
