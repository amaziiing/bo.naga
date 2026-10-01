(function(){
  'use strict';
  var STORAGE_KEY='bo_main_language';
  var DEFAULT_LANG='en';
  var supported={en:'English','zh-CN':'简体中文'};
  var originalText=new WeakMap(), originalAttrs=new WeakMap();
  var renderedText=new WeakMap(), renderedAttrs=new WeakMap();
  var busy=false, observer=null;
  var OBSERVER_OPTIONS={childList:true,subtree:true,characterData:true};
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
    m=trim.match(/^(\d+)\s+(?:mins?|minutes?)\s+ago$/i); if(m) return m[1]+' 分钟前';
    m=trim.match(/^(\d+)\s+(?:hrs?|hours?)\s+ago$/i); if(m) return m[1]+' 小时前';
    m=trim.match(/^(\d+)\s+days?\s+ago$/i); if(m) return m[1]+' 天前';
    m=trim.match(/^Synced\s+(\d+)\s+(?:mins?|minutes?)\s+ago$/i); if(m) return m[1]+' 分钟前已同步';
    m=trim.match(/^Synced\s+(\d+)\s+(?:hrs?|hours?)\s+ago$/i); if(m) return m[1]+' 小时前已同步';
    m=trim.match(/^(Active|Enabled|Suspended|Pending|Approved|Rejected|All)\s*\((\d+)\)$/i);
    if(m){var labels={active:'启用',enabled:'启用',suspended:'已暂停',pending:'待处理',approved:'已批准',rejected:'已拒绝',all:'全部'};return labels[m[1].toLowerCase()]+' ('+m[2]+')';}
    m=trim.match(/^Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)\s+(administrators|merchants|providers)$/i);
    if(m){var nouns={administrators:'个管理员',merchants:'个商户',providers:'个供应商'};return '显示 '+m[1]+' 至 '+m[2]+'，共 '+m[3]+' '+nouns[m[4].toLowerCase()];}
    m=trim.match(/^Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)\s+records$/i);
    if(m) return '显示 '+m[1]+' 至 '+m[2]+'，共 '+m[3]+' 条记录';
    m=trim.match(/^All\s+(.+)$/i);
    if(m && d[m[1]]) return '所有'+d[m[1]];
    return value;
  }
  function skip(el){return !el || el.closest('[data-main-i18n-skip],script,style,code,pre,textarea,[contenteditable="true"]');}
  function textNode(n){
    var p=n.parentElement;if(skip(p))return;
    var current=n.nodeValue;
    if(!originalText.has(n)) originalText.set(n,current);
    else {
      var lastRendered=renderedText.get(n);
      /* Only adopt a changed value when it came from the application. A value that
         equals our own last render must never become the new source language text.
         This is what makes zh-CN -> English switch immediately without a reload. */
      if(lastRendered!==undefined && current!==lastRendered) originalText.set(n,current);
    }
    var base=originalText.get(n), next=lang()===DEFAULT_LANG?base:translated(base);
    if(n.nodeValue!==next) n.nodeValue=next;
    renderedText.set(n,next);
  }
  var attrs=['placeholder','title','aria-label'];
  function element(el){
    if(skip(el))return;
    attrs.forEach(function(a){
      if(!el.hasAttribute(a))return;
      var rec=originalAttrs.get(el)||{}, renderedRec=renderedAttrs.get(el)||{};
      var current=el.getAttribute(a);
      if(!(a in rec)) rec[a]=current;
      else if((a in renderedRec) && current!==renderedRec[a]) rec[a]=current;
      originalAttrs.set(el,rec);
      var next=lang()===DEFAULT_LANG?rec[a]:translated(rec[a]);
      if(current!==next) el.setAttribute(a,next);
      renderedRec[a]=next;
      renderedAttrs.set(el,renderedRec);
    });
  }
  function walk(root){
    if(!root || busy)return;
    busy=true;
    /* Temporarily stop observing while we write translated text. Otherwise every
       translation write creates another observer batch; on pages whose controllers
       also repaint the shell this can become a translate/render feedback loop. */
    var reconnect=!!observer;
    if(reconnect) observer.disconnect();
    try{
      if(root.nodeType===3) textNode(root);
      else if(root.nodeType===1 || root.nodeType===9){
        if(root.nodeType===1) element(root);
        var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT),n;
        while((n=w.nextNode())) n.nodeType===3?textNode(n):element(n);
      }
      document.documentElement.lang=lang()==='zh-CN'?'zh-CN':'en';
    } finally {
      busy=false;
      if(reconnect && document.body) observer.observe(document.body,OBSERVER_OPTIONS);
    }
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
    /* One slot, not one listener per entry: the router replaces the header on every swap, so
       mount() builds a new switcher and used to add another document click handler while the
       previous one (holding the previous switcher) stayed on `document` forever. Measured on
       the Main provider pages: +1 click handler per entry. The window slot also covers a fresh
       EXECUTION of this file, where this closure's variable would be a different one. */
    if(window.__boMainI18nOutsideClick) document.removeEventListener('click',window.__boMainI18nOutsideClick);
    window.__boMainI18nOutsideClick=function(){menu.classList.remove('is-open');btn.setAttribute('aria-expanded','false');};
    document.addEventListener('click',window.__boMainI18nOutsideClick); sync();
  }
  var refreshTimer=null;
  function settleRefresh(){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(function(){ if(!busy){mount();walk(document.body);} },0);
  }
  function start(){
    mount();walk(document.body);
    /* The router replays DOMContentLoaded for the target page's own scripts, so start() runs on
       every entry into one of the 40 pages that load this file - and the previous observer kept
       observing document.body (which survives a swap) for the rest of the session. Disconnect it
       first; the window slot also covers a fresh execution of this file, whose module variable
       would otherwise be a new one. */
    if(window.__boMainI18nObserver){try{window.__boMainI18nObserver.disconnect();}catch(e){}}
    observer=new MutationObserver(function(ms){
      if(busy){settleRefresh();return;}
      ms.forEach(function(m){
        if(m.type==='characterData') textNode(m.target);
        m.addedNodes.forEach(function(n){if(n.nodeType===1||n.nodeType===3)walk(n);});
      });
      mount();
      /* BO tables/pagination can redraw their footer again at the end of the same
         render cycle. Re-run once after that cycle so English cannot win the race. */
      settleRefresh();
    });
    observer.observe(document.body,OBSERVER_OPTIONS);
    window.__boMainI18nObserver=observer;
    /* Some page controllers render after DOMContentLoaded without producing a stable
       footer until API/table initialization completes. These bounded passes cover
       initial load only; the MutationObserver handles subsequent redraws. */
    [50,150,350,750,1500,2500].forEach(function(delay){setTimeout(function(){mount();walk(document.body);},delay);});
    window.addEventListener('load',function(){walk(document.body);setTimeout(function(){walk(document.body);},100);},{once:true});
  }
  window.MainI18n={setLanguage:function(v){if(!supported[v])return;try{localStorage.setItem(STORAGE_KEY,v);}catch(e){}walk(document.body);},getLanguage:lang,refresh:function(){walk(document.body);}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
