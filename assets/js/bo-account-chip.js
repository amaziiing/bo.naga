/* Topbar account chip — the merchant family's single implementation.
   auth.js only renders initials plus a gear. Every page that wanted the locked chrome from
   DESIGN.md used to re-implement this enhancement locally (five copies exist across the
   admin / dashboard / menu-permission / merchant scripts), so the chip drifted: Merchant
   Detail injected <i class="bi bi-person"> and the .bo-account-meta stack, while its
   siblings got neither and fell back to the stylesheet's person-fill ::before with no role
   line at all. Ported from main-merchant-detail.js so that page stays the reference.

   Opt in with class="bo-account-chip" on <body> (paired with assets/css/bo-account-chip.css).

   WHERE THE CHIP LIVES
   The block does not stay in the header: it takes the "Backoffice" title's place at the top of the
   rail, left of the rail toggle, which is where the Main panel keeps it (main-sidebar-account.js,
   whose comment records the same instruction). Owner: "bo右上角的名字和icon要跟main的一样", then,
   pointing at the rail's own toggle, "位置不是在sidebar 的收起的按键的左边 与main的页面一样？".
   This file owns the move rather than bo-topbar.js: that script replaces the topbar markup but is
   only loaded by pages opting into the shared header, while the legacy-layout pages (brand-detail,
   contact-sync, currency-management) ship their own header and still load this one.
   Two differences from the Main panel's version, both forced:
     - auth.js's profileHtml() renders the three pending-operation counters INSIDE the same host as
       the link, and for a BO account those counters stay in the header, so the host cannot be
       deleted the way the Main panel deletes it (it is empty there: counters are '' for a MAIN
       account). The link alone travels, and auth.js's own `data-admin-*` hooks keep it in step, so
       there is no second sync path here either.
     - auth.js re-paints that host on every /me refresh, so the move is re-asserted instead of done
       once.
   Collapsed rail: the card moves to the row above Logout as the avatar alone, because reports.css
   hides every `.report-brand > div:not(.logo)` at 72px. */
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
  /* Document-level, so it cannot be left to the element marker above: that marker lives on the
     topbar host, and the router replaces the whole topbar with a clone on every swap - so
     `bind()` runs again on the next entry and registered one more listener every time
     (measured 10x index<->member-deposit: bo-account-chip.js:97 grew by one per entry). One
     slot on window, the pattern bo-date-range and friends already use: the handler is one
     function, so re-binding is replace, not stack. */
  if(window.__boAccountChipProfileBound) document.removeEventListener('bo:profile-updated',window.__boAccountChipProfileBound);
  window.__boAccountChipProfileBound=run;
  document.addEventListener('bo:profile-updated',run);
  setTimeout(enhance,80);
  setTimeout(enhance,400);
  setTimeout(enhance,1200);
 }
 /* ---- the rail's account card (see WHERE THE CHIP LIVES above) ---- */
 const RAIL_CARD='bo-rail-account';
 const RAIL_SEL='.report-sidebar';
 /* The Main panel moves this same block itself (main-sidebar-account.js) and its card must not be
    fought over - same predicate that file uses, kept in step with it. */
 function isMainPanelPage(){
  const u=(window.BO_AUTH&&typeof window.BO_AUTH.user==='function')?window.BO_AUTH.user():{};
  const host=String(location.hostname||'').toLowerCase();
  if(host==='main.titanx7.com'||host==='www.main.titanx7.com') return true;
  const f=String(location.pathname||'').split('/').pop().split('?')[0].toLowerCase();
  if(/^main[-_]/.test(f)||f==='menu-permission') return true;
  const type=String(u.roleType||'').toUpperCase();
  return type==='MAIN'||u.mainAdmin===true||Number(u.mainAdmin)===1;
 }
 /* Built only when there is a block to place: a page with no account chip at all (dashboard.html
    ships its own header and no [data-bo-profile]) must keep its brand row exactly as it is - an
    empty card there would only have pushed the "Backoffice" title out. */
 /* No chip on this page: auth.js renders the block into any [data-bo-profile] host, so a hidden one
    is added, painted by auth.js itself (never a second copy of the markup - that is what made five
    chips drift), the link taken out of it, and the host removed so its counter row never shows. */
 let borrowedChip=false;
 function borrowChipFromAuth(){
  /* Once per document, and never on a page that ships its own host. Every sync asks for a link
     inside a host, but this file MOVES that link into the rail - so from the second sync on the
     query is empty and this function used to run again, which asks auth.js to re-render its markup
     (`injectProfile` -> `loadHeaderCounters` -> `BO_OPERATION_NOTIFICATION_CONTROL.refresh` ->
     `/notifications/pending-summary`), whose DOM writes come straight back through the body observer
     below as another sync. Measured on the local build: 583 notification requests in the first ten
     seconds of an agent-settlement page and 600 in the next ten - about 60 a second, ~16ms apart,
     on every BO page (owner: "我的页面加载很慢"). With the borrow pinned to one per document the
     same page asks once a second, which is the interval the poller is built for. */
  if(borrowedChip) return null;
  if(!window.BO_AUTH||typeof window.BO_AUTH.injectProfile!=='function') return null;
  if(document.documentElement.getAttribute('data-bo-shell')!=='bo') return null;
  /* A page that ships its own host needs nothing borrowed: auth.js paints that one. */
  if(document.querySelector('[data-bo-profile]')) return null;
  borrowedChip=true;
  const host=document.createElement('div');
  host.setAttribute('data-bo-profile','');
  host.style.display='none';
  document.body.appendChild(host);
  try{ window.BO_AUTH.injectProfile(); }catch(e){ host.parentNode.removeChild(host); return null; }
  const link=host.querySelector('.bo-account-link');
  if(link) document.body.appendChild(link);
  host.parentNode.removeChild(host);
  return link;
 }
 function railCard(){
  const rail=document.querySelector(RAIL_SEL);
  if(!rail) return null;
  let card=rail.querySelector('.'+RAIL_CARD);
  if(card) return card;
  card=document.createElement('div');
  card.className=RAIL_CARD;
  const brand=rail.querySelector('.report-brand');
  if(brand){
   /* The brand's own title steps aside for the card, exactly as on the Main panel: one row, the
      account on the left and the rail toggle keeping the right-hand slot. */
   Array.prototype.slice.call(brand.children).forEach(function(child){
    if(child.tagName==='DIV'&&child.className.indexOf('logo')===-1) brand.removeChild(child);
   });
   brand.insertBefore(card,brand.firstChild);
  }else{
   rail.insertBefore(card,rail.firstChild);
  }
  return card;
 }
 /* Expanded rail: the brand row. Collapsed rail: the row above Logout, because the brand row is the
    toggle's own slot at 72px (reports.css hides that row's divs there). */
 function placeRailCard(){
  const card=document.querySelector(RAIL_SEL+' .'+RAIL_CARD);
  if(!card) return;
  const rail=card.closest(RAIL_SEL);
  if(!rail) return;
  const footer=rail.querySelector('.bo-sidebar-account-footer');
  const brand=rail.querySelector('.report-brand');
  if(document.body.classList.contains('sidebar-mini')&&footer){
   if(card.parentNode!==footer.parentNode||card.nextElementSibling!==footer) footer.parentNode.insertBefore(card,footer);
   return;
  }
  if(brand&&card.parentNode!==brand) brand.insertBefore(card,brand.firstChild);
 }
 /* Idempotent: the link is moved, never copied, and auth.js's re-paints hand over a fresh node -
    the card drops the one it was holding first. */
 function syncRailAccount(){
  if(isMainPanelPage()) return;
  const rail=document.querySelector(RAIL_SEL);
  if(!rail) return;
  /* Every host, not only the header's: a page that renders the chip somewhere else (dashboard.js's
     own header, the legacy layouts) moves the same way. */
  let link=document.querySelector('[data-bo-profile] .bo-account-link');
  if(!link){
   /* A BO page may ship no account chip at all (dashboard.html has no [data-bo-profile]): ask
      auth.js for its own markup in a hidden host and take the block out of it, so every BO rail
      states the account instead of a bare "Backoffice". */
   link=borrowChipFromAuth();
  }
  if(!link){
   /* Still nothing to place: leave the brand row alone rather than park an empty card in it. */
   const empty=rail.querySelector('.'+RAIL_CARD);
   if(empty&&!empty.querySelector('.bo-account-link')) empty.parentNode.removeChild(empty);
   return;
  }
  const card=railCard();
  if(!card) return;
  if(link.parentNode!==card){
   const held=card.querySelector('.bo-account-link');
   if(held&&held!==link) held.parentNode.removeChild(held);
   card.appendChild(link);
  }
  /* One card, one block: the owner saw two on screen, and both halves can come back on their own -
     a rail or header re-render leaves an earlier card behind, and auth.js's re-paint puts a fresh
     link in a host the card no longer owns. Only the shell's own blocks are touched; a page that
     authored its own account link keeps it. */
  Array.prototype.slice.call(rail.querySelectorAll('.'+RAIL_CARD)).forEach(function(other){
   if(other!==card) other.parentNode.removeChild(other);
  });
  Array.prototype.slice.call(document.querySelectorAll('.bo-account-link')).forEach(function(other){
   if(other===link) return;
   if(other.closest('.report-actions, .report-brand, [data-bo-profile]')) other.parentNode.removeChild(other);
  });
  placeRailCard();
 }
 /* rAF-coalesced: the observer below watches the whole body, so a busy page (a repainting table, the
    counters) must not run the sync once per mutation. */
 let railSyncQueued=false;
 function queueRailSync(){
  if(railSyncQueued) return;
  railSyncQueued=true;
  requestAnimationFrame(function(){ railSyncQueued=false; syncRailAccount(); });
 }
 function bootRailAccount(){
  syncRailAccount();
  /* One slot per document: this file is replayed across swaps, so a re-run must replace its
     observers rather than add another set (the same reason `bo:profile-updated` is one slot). */
  if(window.__boAccountChipDomWatch) window.__boAccountChipDomWatch.disconnect();
  window.__boAccountChipDomWatch=new MutationObserver(queueRailSync);
  window.__boAccountChipDomWatch.observe(document.body,{childList:true,subtree:true});
  if(window.__boAccountChipBodyWatch) window.__boAccountChipBodyWatch.disconnect();
  window.__boAccountChipBodyWatch=new MutationObserver(placeRailCard);
  window.__boAccountChipBodyWatch.observe(document.body,{attributes:true,attributeFilter:['class']});
  /* The router's own signal, bound per document like this file's other listeners - a swap replaces
     the content frame (and the header clone) without re-running this file. */
  if(window.__boAccountChipSpaBound) document.removeEventListener('bo:spa:content-mounted',window.__boAccountChipSpaBound);
  window.__boAccountChipSpaBound=queueRailSync;
  document.addEventListener('bo:spa:content-mounted',window.__boAccountChipSpaBound);
  setTimeout(syncRailAccount,80);
  setTimeout(syncRailAccount,400);
  setTimeout(syncRailAccount,1200);
 }
 function boot(){
  if(document.body&&document.body.classList.contains(BODY_CLASS)) bind();
  /* Not gated on BODY_CLASS: member-deposit.html and friends take the chip without opting into the
     chip's CSS class, and the rail card is the same block wherever it renders. */
  bootRailAccount();
 }
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
 else boot();
})();
