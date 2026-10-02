(function(){
  'use strict';

  function currentUser(){
    try {
      if (window.BO_AUTH && typeof BO_AUTH.user === 'function') return BO_AUTH.user() || {};
      return JSON.parse(localStorage.getItem('bo_admin_user') || '{}') || {};
    } catch (e) { return {}; }
  }

  function isMainPortalOwner(user){
    var roleType = String((user && user.roleType) || '').toUpperCase();
    return !!(user && user.rootAdmin === true) || roleType === 'ROOT' || roleType === 'MAIN';
  }

  function pageName(){
    return (location.pathname || '').split('/').pop().toLowerCase();
  }

  function apply(){
    var user = currentUser();
    if (isMainPortalOwner(user)) return; // MAIN/ROOT keep the full Merchant portal.

    // Delegated admins created by MAIN (Customer Support/Leader/custom roles)
    // can manage Merchants (incl. list Add Credit) when permitted, but
    // Merchant role administration and merchant-wide security/audit stay MAIN/ROOT only.
    document.querySelectorAll('a[href="main-merchant-roles.html"], a[href^="main-merchant-roles.html?"], a[href="main-merchant-security.html"], a[href^="main-merchant-security.html?"], a[href="main-merchant-role-create.html"], a[href^="main-merchant-role-create.html?"]').forEach(function(el){
      el.remove();
    });

    var current = pageName();
    if (current === 'main-merchant-roles.html' || current === 'main-merchant-role-create.html' || current === 'main-merchant-security.html') {
      location.replace('main-merchant-detail.html');
    }
  }

  /* SPA: this file is shared by every merchant page, so the router does not re-run it on a
     swap and an old {once:true} boot is no longer replayed (once means once). Its work is
     per-content, though - re-apply it on the hook the router fires after the frame has been
     replaced, with a window slot so a fresh execution of this file never stacks a second
     listener. */
  if (!window.__boMmvSpaBound) {
    window.__boMmvSpaBound = 1;
    document.addEventListener('bo:spa:content', apply);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, {once:true});
  else apply();
})();
