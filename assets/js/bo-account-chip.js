/* Topbar account chip — the merchant family's single implementation.
   auth.js only renders initials plus a gear. Every page that wanted the locked chrome from
   DESIGN.md used to re-implement this enhancement locally (five copies exist across the
   admin / dashboard / menu-permission / merchant scripts), so the chip drifted: Merchant
   Detail injected <i class="bi bi-person"> and the .bo-account-meta stack, while its
   siblings got neither and fell back to the stylesheet's person-fill ::before with no role
   line at all. Ported from main-merchant-detail.js so that page stays the reference.

   Opt in with class="bo-account-chip" on <body> (paired with assets/css/bo-account-chip.css). */
(function(){
 const BODY_CLASS='bo-account-chip';
 const HOST_SEL='.report-actions [data-bo-profile]';
 // Merchant Detail's precedence is the reference for the family: an explicit roleName wins.
 // The menu-permission copy checks rootAdmin first, so the very same signed-in user would be
 // labelled "Root" on one merchant page and "Main Account" on another.
 function roleLabel(){
  const user=(window.BO_AUTH&&typeof window.BO_AUTH.user==='function')?window.BO_AUTH.user():{};
  if(user.roleName) return String(user.roleName);
  const type=String(user.roleType||'').toUpperCase();
  if(user.rootAdmin===true||Number(user.rootAdmin)===1||type==='ROOT') return 'Root';
  if(type==='MAIN'||user.mainAdmin===true||Number(user.mainAdmin)===1) return 'Superadmin';
  if(type==='MASTER') return 'Master';
  if(type==='BRAND_OWNER') return 'Brand Owner';
  if(user.role) return String(user.role);
  return 'Admin';
 }
 let watchedRole=null;
 function watchRole(link){
  const role=link.querySelector('[data-admin-role]');
  if(!role||role===watchedRole) return;
  watchedRole=role;
  // A page script that also owns this chip (the menu-permission copy on the Merchant Roles
  // pages) may rewrite the label after us. Re-assert the reference wording; writing only on
  // a real difference is what keeps this from looping.
  new MutationObserver(function(){
   const next=roleLabel();
   if(role.textContent!==next) role.textContent=next;
  }).observe(role,{childList:true,characterData:true,subtree:true});
 }
 function enhance(){
  const host=document.querySelector(HOST_SEL);
  const link=host&&host.querySelector('a.bo-account-link');
  if(!link) return;
  const href=String(link.getAttribute('href')||'');
  const user=(window.BO_AUTH&&typeof window.BO_AUTH.user==='function')?window.BO_AUTH.user():{};
  const isMain=String(user.roleType||'').toUpperCase()==='MAIN'||user.mainAdmin===true||Number(user.mainAdmin)===1;
  const accountPage=isMain?'main-profile.html':'profile.html';
  if(!href||href==='#'||href==='profile.html'||href==='main-profile.html') link.setAttribute('href',accountPage+'#password');
  link.style.pointerEvents='auto';
  link.style.cursor='pointer';
  link.setAttribute('title','Account settings / Change password');
  link.setAttribute('aria-label','Open account settings and change password');
  const avatar=link.querySelector('.report-avatar');
  const gear=link.querySelector('.bo-account-setting-icon');
  if(gear) gear.setAttribute('hidden','');
  let name=link.querySelector('.bo-account-name');
  let meta=link.querySelector('.bo-account-meta');
  if(!meta&&name){
   meta=document.createElement('span');
   meta.className='bo-account-meta';
   name.replaceWith(meta);
   meta.appendChild(name);
  }
  name=link.querySelector('.bo-account-name');
  let role=link.querySelector('[data-admin-role]');
  if(!role&&meta){
   role=document.createElement('span');
   role.className='bo-account-role';
   role.setAttribute('data-admin-role','');
   meta.appendChild(role);
  }
  const label=roleLabel();
  if(role&&role.textContent!==label) role.textContent=label;
  if(avatar){
   avatar.removeAttribute('data-admin-avatar');
   if(!avatar.querySelector('i.bi-person')){
    avatar.textContent='';
    const icon=document.createElement('i');
    icon.className='bi bi-person';
    icon.setAttribute('aria-hidden','true');
    avatar.appendChild(icon);
   }
   if(meta&&(meta.parentNode!==link||avatar.previousElementSibling!==meta)){
    link.appendChild(meta);
    link.appendChild(avatar);
   }
  }
  link.classList.add('is-mad-amber-profile');
  watchRole(link);
 }
 function bind(){
  enhance();
  const host=document.querySelector(HOST_SEL);
  if(!host||host.dataset.boAccountChip==='1') return;
  host.dataset.boAccountChip='1';
  let scheduled=false;
  const run=function(){
   if(scheduled) return;
   scheduled=true;
   requestAnimationFrame(function(){
    scheduled=false;
    enhance();
   });
  };
  // auth.js re-injects the whole chip from its own markup on every /me refresh; re-apply on
  // those structural reinjects only, so a click in flight is never disturbed.
  new MutationObserver(run).observe(host,{childList:true});
  document.addEventListener('bo:profile-updated',run);
  setTimeout(enhance,80);
  setTimeout(enhance,400);
  setTimeout(enhance,1200);
 }
 if(document.body&&document.body.classList.contains(BODY_CLASS)){
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind);
  else bind();
 }
})();
