#!/usr/bin/env node
/* Adopt a BO page into the client-side navigation shell (see assets/js/bo-spa.js).

   WHAT IT WRITES, AND WHY EACH LINE IS NEEDED FOR SMOOTHNESS RATHER THAN LOOKS

   1. data-bo-spa="1" and data-bo-shell="bo|main" on <html>
      bo-spa.js is inert without the first, and it refuses to swap into a page that has not
      opted in - so rolling out is incremental and an untouched page still gets a real
      navigation. The second is the shell identity the router compares: it is stamped here,
      from the file name, instead of being guessed from <body> class substrings (which gets
      30 of the 147 pages wrong, including classifying every agent-portal page as BO).

   2. the first-paint canvas <style> as the first child of <head> - BO SHELL ONLY.
      The real canvas colour comes from an external sheet, and until that sheet lands the
      browser paints its own white - the flash on every navigation.

      NOT on the Main-panel shell. That was already tried and reverted (d0eac459, "Take the
      first-paint canvas off the Main-panel pages"): the main-* pages load none of the
      charcoal/wallet sheets, so nothing overrides the inline value and this very block
      repainted their canvas cream. The real criterion is "this page's own sheets override
      html's background", and the bo shell is that set - so the block is granted to 'bo'.

      Granted, never taken away. An earlier version of this script also deleted the block
      from every non-'bo' page, which was too broad in both directions: d0eac459 removed it
      from 24 pages, not from the 15 other Main-panel pages that legitimately carry one, and
      the deletion left an empty line behind. A page whose shell changes must be looked at,
      not swept.
      Colour only, no metric: the drift guard stays happy.

   3. the theme bootstrap <script>, immediately after it
      Sets html[data-bo-theme] from localStorage during parse, so the dark theme is
      already applied when the first sheet is matched. 9 pages were missing it and
      flashed light before turning dark.

   4. <script src="assets/js/bo-spa.js"> just before </body>, if the page does not have it
      already. Opting in with the attribute alone is not enough - the router has to be on the
      page to read it, and two pages carried the attribute without the script.

   5. <link rel="stylesheet"> for bo-global-quicknav.css at the END of <head>
      auth.js#mountSidebarToggle used to inject this sheet from a body-end script, so on
      every page load the rail painted once and was then RESTYLED when the sheet arrived
      (it carries the pin button and the row's right padding). That late re-style is the
      "the sidebar font/layout jumps" report. Pinned last in <head> keeps the cascade
      position it had as the last thing injected, and the data-bo-quicknav-css attribute
      is what auth.js checks for - without it, it would inject a second copy.

   Idempotent: run it again and it writes nothing. Run with --check to report only.

       node scripts/adopt-bo-spa.js            # rewrite
       node scripts/adopt-bo-spa.js --check    # report what is missing, write nothing
*/

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');

/* The pages that actually render the shared shell. A page without it has nothing for the
   router to keep mounted, and bo-spa.js would exit on its own anyway. */
const SHELL = /data-bo-topbar|<nav class="report-nav"/;

/* The agent portal is deliberately left out. AGENTS.md: it "uses agent-portal.js and its
   own profile host" and keeps its own shell, so it is not the shared BO shell and must not
   be unified with it. Its rail is painted by agent-portal.js#initShell from the agent's own
   /agent/me payload, not by auth.js#renderSidebar, so a swap would have neither the render
   path nor the correct shell - it would just lose its navigation. Excluded here rather than
   in bo-spa.js so that the reason is recorded next to the rollout, not only in the router. */
const EXCLUDED = /^agent-/;

/* Shell identity, declared instead of inferred. bo-spa.js compares this value and refuses
   to swap when it differs or is absent. The rule is the file-name rule AGENTS.md already
   uses to scope the shell, which is the only one that gets all 147 pages right - matching
   on body-class substrings misclassifies 30 of them (every agent page reads as BO, and
   main-accounting-report / main-profile / main-stat-detail / main-balance-adjustment carry
   no `main-` token). */
function shellOf(name) {
  if (EXCLUDED.test(name)) return 'agent';
  if (/^main[-_]/.test(name) || name === 'menu-permission.html') return 'main';
  return 'bo';
}

const CANVAS =
  '/* First-paint canvas. The real background (gradient, theme colours) comes from the ' +
  'external sheets, but until they arrive the browser paints its default white - visible ' +
  'as a white flash on every tab switch. This gives the canvas its colour before any ' +
  'request lands, and the sheets override it later (same specificity, later in the ' +
  'cascade). */' +
  'html{background:#FFF8EB}html[data-bo-theme="dark"]{background:#2C2E38}';

/* The head inline: the theme bootstrap plus bo-spa's DOMContentLoaded registry. The
   registry has to be installed BEFORE any other script runs - every page's own script and
   every shared helper registers its DOMContentLoaded listener at parse or at execution,
   and bo-spa.js loads last, at the end of the body. So the wrapper lives here, in the
   first inline script, and bo-spa.js's replayLifecycle reads what it captured.

   Captured per listener: which script registered it (document.currentScript src, so the
   router can tell a page's own script from a shared one), in which navigation epoch, and
   whether it asked for {once:true} (a once listener must never be re-run by the router -
   its native copy already fired on the document's real DOMContentLoaded). */
const THEME_BOOT =
  '<script>!function(){' +
    'try{var t=localStorage.getItem(\'bo_theme\');' +
    'if(t===\'dark\'||t===\'light\')document.documentElement.setAttribute(\'data-bo-theme\',t);}catch(e){}' +
    'try{var R=window.__boDCL=window.__boDCL||[],O=EventTarget.prototype.addEventListener;' +
      'EventTarget.prototype.addEventListener=function(t,f,o){' +
      'if(t===\'DOMContentLoaded\'&&typeof f===\'function\'){try{' +
      'var s=document.currentScript,x=null;' +
      'if(s&&s.tagName===\'SCRIPT\')x=String(s.getAttribute(\'src\')||\'\').split(\'?\')[0].split(\'/\').pop()||null;' +
      'var d=false;for(var i=0;i<R.length;i++){if(R[i].t===this&&R[i].f===f){d=true;break;}}' +
      'if(!d)R.push({t:this,f:f,s:x,o:(o&&typeof o===\'object\'&&o.once===true)?1:0,e:window.__boDclEpoch||0});' +
      '}catch(e){}}' +
      'return O.call(this,t,f,o);};' +
    '}catch(e){}' +
  '}();</script>';

const QUICKNAV_LINK =
  '<link href="assets/css/bo-global-quicknav.css?v=0" rel="stylesheet" data-bo-quicknav-css="1"/>';

/* The exact string this script inserts, so the block it writes has one wording. The pages
   that already carried one were written earlier and say "tab switch" rather than
   "navigation", which is why nothing here matches the canvas by its comment text. */
const CANVAS_BLOCK = '<style>' + CANVAS + '</style>';
function headTag(html) {
  const m = html.match(/<head[^>]*>/i);
  return m ? { tag: m[0], at: m.index + m[0].length } : null;
}

function transform(html, shell) {
  const notes = [];

  // 1. data-bo-spa + data-bo-shell on <html>. Tested against the <html> tag alone, not the
  // whole document: a page that merely mentions the attribute further down must still get
  // its own tag stamped.
  const tag = html.match(/<html[^>]*>/i);
  if (tag && (!/data-bo-spa=/i.test(tag[0]) || !/data-bo-shell=/i.test(tag[0]))) {
    html = html.replace(/<html([^>]*)>/i, function (all, attrs) {
      let next = attrs;
      if (!/data-bo-spa=/i.test(next)) { next += ' data-bo-spa="1"'; notes.push('data-bo-spa'); }
      if (!/data-bo-shell=/i.test(next)) { next += ' data-bo-shell="' + shell + '"'; notes.push('data-bo-shell=' + shell); }
      return '<html' + next + '>';
    });
  }

  const head = headTag(html);

  // 2. + 3. canvas and theme bootstrap (+ the DCL registry), at the very top of <head> so
  // all three run before any stylesheet is matched and before any other script registers.
  // The registry version REPLACES an older bare bootstrap on a rolled-out page: a page can
  // already carry the theme snippet without the wrapper (every page in the first rollout
  // did), so `wantsTheme` alone is not enough - the wrapper is a hard requirement for a
  // rollable page, and the old snippet is removed when it lacks it.
  const wantsCanvas = shell === 'bo' && !/First-paint canvas/.test(html);
  const needsBoot = !/window\.__boDCL/.test(html);
  if (head && (wantsCanvas || needsBoot)) {
    let tail = html.slice(head.at);
    if (needsBoot) {
      // Drop an older inline script that sets bo_theme but carries no registry. Both
      // spellings seen in the wild: the standard bootstrap and main pages' early
      // dark-only guard. The lookahead keeps the match inside ONE <script> element.
      tail = tail.replace(/<script>(?:(?!<\/script>)[\s\S])*?bo_theme(?:(?!<\/script>)[\s\S])*?<\/script>/, '');
    }
    const inject = (wantsCanvas ? CANVAS_BLOCK : '') +
                   (needsBoot ? THEME_BOOT : '');
    html = html.slice(0, head.at) + inject + tail;
    if (wantsCanvas) notes.push('first-paint canvas');
    if (needsBoot) notes.push('theme bootstrap + DCL registry');
  }

  if (!head) return { html, notes };

  // 5. the router itself. A page can carry data-bo-spa and still not load bo-spa.js - two
  //    did (main-dashboard.html, currency-management.html), which leaves the attribute inert
  //    and the page silently never swapped. Opting in has to include the script. Appended at
  //    the very end of the body, the position it already has on the pages that load it.
  if (!/bo-spa\.js/.test(html)) {
    const i = html.lastIndexOf('</body>');
    if (i === -1) {
      notes.push('!! NO </body>: bo-spa.js NOT inserted');
    } else {
      html = html.slice(0, i) + '<script src="assets/js/bo-spa.js?v=0"></script>' + '\n' + html.slice(i);
      notes.push('bo-spa.js script tag');
    }
  }

  // 4b. the generated manifest of swappable pages, immediately BEFORE the router. The
  //     router reads it synchronously to decide whether a link is worth intercepting at all;
  //     without it, it fetches the destination first and only then discovers it cannot swap
  //     it, which is a wasted request in front of every ordinary navigation.
  if (!/bo-spa-manifest\.js/.test(html)) {
    const j = html.search(/<script[^>]*src="[^"]*bo-spa\.js/);
    if (j === -1) {
      notes.push('!! bo-spa.js tag not found: manifest NOT inserted');
    } else {
      html = html.slice(0, j) + '<script src="assets/js/bo-spa-manifest.js?v=0"></script>' + html.slice(j);
      notes.push('bo-spa manifest');
    }
  }

  // 4. the quicknav sheet, pinned last in <head> (see the header comment).
  if (!/bo-global-quicknav\.css/.test(html)) {
    // Prefer </head>. One page (casino-overview-report.html) ships a <head> with no closing
    // tag at all - the browser copes, but a search for </head> finds nothing and the sheet
    // was silently skipped there. Fall back to the last moment still inside the head: the
    // start of the body. Reported rather than silently skipped when neither exists.
    let close = html.search(/<\/head>/i);
    if (close === -1) close = html.search(/<body[\s>]/i);
    if (close === -1) {
      notes.push('!! NO </head> AND NO <body>: quicknav css NOT inserted');
    } else {
      html = html.slice(0, close) + QUICKNAV_LINK + html.slice(close);
      notes.push('quicknav css');
    }
  }

  return { html, notes };
}

function main() {
  const files = fs.readdirSync(ROOT)
    .filter((f) => f.endsWith('.html') && !f.startsWith('_') && !f.startsWith('.'))
    .sort();

  const touched = [];
  for (const name of files) {
    const file = path.join(ROOT, name);
    const before = fs.readFileSync(file, 'utf8');
    if (before.indexOf('\u0000') !== -1) continue;   // not text
    if (!SHELL.test(before)) continue;
    if (EXCLUDED.test(name)) continue;
    const { html, notes } = transform(before, shellOf(name));
    if (!notes.length) continue;
    touched.push({ name, notes });
    if (!CHECK) fs.writeFileSync(file, html, 'utf8');
  }

  const noun = CHECK ? 'needs' : 'updated';
  console.log(`${touched.length} page(s) ${noun} changes`);
  for (const t of touched) console.log(`  ${t.name.padEnd(42)} ${t.notes.join(', ')}`);
  if (!touched.length) console.log('  (nothing to do)');
}

main();
