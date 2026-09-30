/* Shared theme toggle. Key: localStorage bo_theme = light|dark.
   The name is historical: the retired Deep Navy Cyan palette is gone and both themes now
   render the locked Charcoal + Amber system (DESIGN.md). A page opts in by shipping
   <button class="bo-theme-btn" id="boThemeToggle"> inside .report-actions. */
(function(global){
  'use strict';
  const THEME_KEY = 'bo_theme';

  function currentTheme(){
    try{ return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; }
    catch(e){ return 'light'; }
  }

  function applyTheme(theme){
    const next = theme === 'dark' ? 'dark' : 'light';
    const isDark = next === 'dark';
    document.documentElement.setAttribute('data-bo-theme', next);
    try{ localStorage.setItem(THEME_KEY, next); }catch(e){}
    const btn = document.getElementById('boThemeToggle');
    if(!btn) return;
    btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    const sun = btn.querySelector('[data-theme-icon="sun"]');
    const moon = btn.querySelector('[data-theme-icon="moon"]');
    if(sun) sun.hidden = isDark;
    if(moon) moon.hidden = !isDark;
  }

  function initThemeToggle(){
    applyTheme(currentTheme());
    const btn = document.getElementById('boThemeToggle');
    if(btn) btn.dataset.boThemeBound = '1';
    bindDelegate();
  }

  /* ONE delegated listener on the document, not a binding per button.

     bo-spa.js replaces `.report-main > .report-topbar` with a clone of the target page's own
     header on EVERY swap, so the #boThemeToggle the click was bound to no longer exists
     afterwards - the new one carries no listener at all and the toggle is dead for the rest of
     the session. Measured in a real browser on index.html -> menu-management.html: after the
     swap the button read `bound=-` and two clicks left `data-bo-theme` at `light`, while the
     same two clicks before the swap flipped it. Owner: "我切换页面时 我的夜间模式点不了".

     Delegation is the same answer reports.js already uses for `[data-open-sidebar]`, and it is
     also what keeps a re-run of this file from double-binding (two listeners = two toggles on
     one click = the button looks dead again). The flag lives on `window`, which survives a swap
     in the same realm. */
  function bindDelegate(){
    if(global.__boThemeDelegateBound) return;
    global.__boThemeDelegateBound = 1;
    document.addEventListener('click', function(e){
      const t = e.target;
      const btn = t && t.closest ? t.closest('#boThemeToggle,.bo-theme-btn') : null;
      if(!btn) return;
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
  }

  global.BO_THEME = { currentTheme, applyTheme, initThemeToggle, THEME_KEY };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initThemeToggle);
  }else{
    initThemeToggle();
  }
})(window);
