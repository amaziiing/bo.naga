(function(){
  'use strict';
  var STORAGE_KEY='bo_main_language';
  var DEFAULT_LANG='en';
  var supported={en:'English','zh-CN':'简体中文'};
  var originalText=new WeakMap(), originalAttrs=new WeakMap();
  var busy=false, observer=null;
  function lang(){ try{return localStorage.getItem(STORAGE_KEY)||DEFAULT_LANG;}catch(e){return DEFAULT_LANG;} }
  function dict(){return (window.MAIN_I18N_TRANSLATIONS||{})[lang()]||{};}
  function translated(value){
    if(lang()===DEFAULT_LANG || !value) return value;
    var d=dict(), raw=String(value), trim=raw.trim();
    if(!trim) return value;
    var hit=d[trim];
    if(hit!=null) return raw.replace(trim,hit);
    var m=trim.match(/^Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)\s+(?:results|entries)$/i);
    if(m) return '显示 '+m[1]+' 至 '+m[2]+'，共 '+m[3]+' 条记录';
    m=trim.match(/^Showing\s+(\d+)\s+(?:results|entries)$/i);
    if(m) return '显示 '+m[1]+' 条记录';
    m=trim.match(/^(\d+)\s*\/\s*page$/i); if(m) return m[1]+' / 页';
    m=trim.match(/^Page\s+(\d+)\s+of\s+(\d+)$/i); if(m) return '第 '+m[1]+' 页，共 '+m[2]+' 页';
    return value;
  }
  function skip(el){return !el || el.closest('[data-main-i18n-skip],script,style,code,pre,textarea,[contenteditable="true"]');}
  function textNode(n){
    var p=n.parentElement;if(skip(p))return;
    if(!originalText.has(n)) originalText.set(n,n.nodeValue);
    var base=originalText.get(n); n.nodeValue=lang()===DEFAULT_LANG?base:translated(base);
  }
  var attrs=['placeholder','title','aria-label'];
  function element(el){
    if(skip(el))return;
    attrs.forEach(function(a){
      if(!el.hasAttribute(a))return;
      var rec=originalAttrs.get(el)||{};
      if(!(a in rec)) rec[a]=el.getAttribute(a);
      originalAttrs.set(el,rec);
      el.setAttribute(a,lang()===DEFAULT_LANG?rec[a]:translated(rec[a]));
    });
  }
  function walk(root){
    if(!root)return; busy=true;
    if(root.nodeType===3) textNode(root);
    else if(root.nodeType===1 || root.nodeType===9){
      if(root.nodeType===1) element(root);
      var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT),n;
      while((n=w.nextNode())) n.nodeType===3?textNode(n):element(n);
    }
    document.documentElement.lang=lang()==='zh-CN'?'zh-CN':'en'; busy=false;
  }
  function closeMenus(except){document.querySelectorAll('.main-language-menu.is-open').forEach(function(x){if(x!==except)x.classList.remove('is-open');});}
  function mount(){
    if(document.getElementById('mainLanguageSwitcher'))return;
    var actions=document.querySelector('.report-topbar .report-actions'); if(!actions)return;
    var theme=actions.querySelector('#boThemeToggle,.bo-theme-btn');
    var wrap=document.createElement('div');wrap.id='mainLanguageSwitcher';wrap.className='main-language-switcher';wrap.setAttribute('data-main-i18n-skip','1');
    wrap.innerHTML='<button type="button" class="bo-theme-btn main-language-btn" aria-haspopup="true" aria-expanded="false" title="Change language" aria-label="Change language"><i class="bi bi-translate" aria-hidden="true"></i></button><div class="main-language-menu" role="menu"><button type="button" data-lang="en" role="menuitem">English</button><button type="button" data-lang="zh-CN" role="menuitem">简体中文</button></div>';
    if(theme && theme.nextSibling) actions.insertBefore(wrap,theme.nextSibling); else if(theme) actions.appendChild(wrap); else actions.insertBefore(wrap,actions.firstChild);
    var btn=wrap.querySelector('.main-language-btn'), menu=wrap.querySelector('.main-language-menu');
    function sync(){menu.querySelectorAll('[data-lang]').forEach(function(x){x.classList.toggle('active',x.dataset.lang===lang());});}
    btn.addEventListener('click',function(e){e.stopPropagation();var open=!menu.classList.contains('is-open');closeMenus(menu);menu.classList.toggle('is-open',open);btn.setAttribute('aria-expanded',open?'true':'false');});
    menu.addEventListener('click',function(e){var x=e.target.closest('[data-lang]');if(!x)return;try{localStorage.setItem(STORAGE_KEY,x.dataset.lang);}catch(err){} sync();menu.classList.remove('is-open');btn.setAttribute('aria-expanded','false');walk(document.body);});
    document.addEventListener('click',function(){menu.classList.remove('is-open');btn.setAttribute('aria-expanded','false');}); sync();
  }
  function start(){mount();walk(document.body);observer=new MutationObserver(function(ms){if(busy)return;ms.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType===1||n.nodeType===3)walk(n);});});mount();});observer.observe(document.body,{childList:true,subtree:true});}
  window.MainI18n={setLanguage:function(v){if(!supported[v])return;try{localStorage.setItem(STORAGE_KEY,v);}catch(e){}walk(document.body);},getLanguage:lang,refresh:function(){walk(document.body);}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
