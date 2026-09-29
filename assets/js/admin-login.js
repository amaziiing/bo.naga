(function(){
  const form = document.getElementById('adminLoginForm');
  const btn = document.getElementById('adminLoginBtn');
  const status = document.getElementById('adminLoginStatus');

  function setStatus(message, type){
    status.textContent = message || '';
    status.className = 'upload-status mb-3 ' + (type || '');
  }

  if(form){
    form.addEventListener('submit', async function(e){
      e.preventDefault();
      btn.disabled = true;
      setStatus('Logging in...', '');
      try{
        const res = await fetch(BO_AUTH.loginUrl(), {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            username: document.getElementById('adminUsername').value.trim(),
            password: document.getElementById('adminPassword').value
          })
        });
        const json = await res.json().catch(() => ({}));
        if(!res.ok || json.status === 'error') throw new Error(json.message || 'Login failed');
        // Validate the authenticated account against the portal BEFORE saving the
        // session or navigating. The page guard remains as a second line of defense,
        // but a wrong-portal login must behave like a failed login on this screen
        // instead of briefly entering the BO and then bouncing back to login.
        const loginUser = json.data || {};
        const host = String(window.location.hostname || '').toLowerCase();
        const roleType = String(loginUser.roleType || '').toUpperCase();
        const isMain = roleType === 'MAIN' || loginUser.mainAdmin === true || Number(loginUser.mainAdmin) === 1;
        const mainPortal = host === 'main.titanx7.com' || host === 'www.main.titanx7.com';
        const boPortal = host === 'bo.titanx7.com';
        if ((mainPortal && !isMain) || (boPortal && isMain)) {
          // Do not persist a token issued for an account that belongs to the other portal.
          try {
            localStorage.removeItem(BO_AUTH.tokenKey);
            localStorage.removeItem(BO_AUTH.userKey);
            sessionStorage.removeItem('bo_login_return_to');
          } catch(ignore) {}
          throw new Error('Invalid password');
        }

        BO_AUTH.save(json);
        try {
          const loginMarker = Date.now() + '-' + Math.random().toString(36).slice(2);
          sessionStorage.setItem('bo_operation_login_marker', loginMarker);
          localStorage.setItem('bo_operation_login_marker', loginMarker);
          sessionStorage.removeItem('bo_operation_login_played');
        } catch(ignore){}
        let user = json.data || {};
        try{
          const meRes = await fetch(BO_AUTH.adminMeUrl(), {headers: {...BO_AUTH.authHeader()}});
          const meJson = await meRes.json().catch(() => ({}));
          if(meRes.ok && meJson.status !== 'error' && meJson.data){
            user = meJson.data;
            BO_AUTH.saveUser(user);
          }
        }catch(ignore){}
        // Make the just-authenticated tenant brand authoritative before the landing page
        // starts loading. This prevents a previous BO session's active brand from being
        // observed by early page scripts during the first paint/refresh.
        try{
          const role=String(user.roleType||'').toUpperCase();
          const platform=!!(user.rootAdmin||user.masterAdmin||role==='ROOT'||role==='MASTER'||role==='MAIN');
          const brandId=Number(user.brandId||user.adminBrandId||0);
          if(!platform&&Number.isFinite(brandId)&&brandId>0){
            localStorage.setItem('bo_active_brand_id',String(brandId));
          }else if(platform){
            // A fresh platform-account login must never inherit another session's tenant.
            // Root/Master/Main can switch brand later from the authorized control page,
            // but the original TitanX account always starts on default brand 1.
            localStorage.setItem('bo_active_brand_id','1');
          }
          sessionStorage.removeItem('bo_brand_context_cache_v3');
          sessionStorage.removeItem('bo_online_users_cache');
          if(window.BO_BRAND&&BO_BRAND.invalidate)BO_BRAND.invalidate();
        }catch(ignore){}
        // If the user arrived at login from a protected BO URL, return to that
        // exact local page after successful authentication instead of always losing
        // the destination and jumping to the role's first menu. The destination page
        // still calls BO_AUTH.enforcePageAccess(), so ROOT-managed permissions remain
        // authoritative and an unassigned page will still be redirected safely.
        let destination='';
        try{
          destination=String(sessionStorage.getItem('bo_login_return_to')||'').trim();
          sessionStorage.removeItem('bo_login_return_to');
          if(!destination || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(destination) || /(?:^|\/)login\.html(?:[?#]|$)/i.test(destination)) destination='';
        }catch(ignore){ destination=''; }
        window.location.replace(destination || BO_AUTH.landingPage(user));
      }catch(err){
        setStatus(err.message || 'Login failed', 'error');
      }finally{
        btn.disabled = false;
      }
    });
  }
})();
