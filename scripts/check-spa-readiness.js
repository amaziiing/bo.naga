#!/usr/bin/env node
/* Does every page carry what "click a link and it swaps" needs to be smooth?

   The router can only be as smooth as the pages it swaps between. A page that is missing
   one of these still loads fine on its own, which is exactly why the gaps went unnoticed -
   they only show up as a flash, a font jump, or a full reload in the middle of a session:

     data-bo-spa    the page opted in. Without it the router refuses the target and the link
                    is a full page load - the flash the whole exercise exists to remove.
     data-bo-shell  which shell owns this page (declared, never inferred: the body-class
                    heuristic misclassified 30 of 147 pages and would let the router swap
                    between two different shells).
     frame          the content area the router swaps (.report-content). A page that opted in
                    without one can never be swapped into, and the router would still fetch
                    it first and only then fall back to a full load - slower than never
                    intercepting the link at all. It is the one marker with no exemption:
                    such a page is simply left out of the generated manifest below.
     canvas         must NOT be there. The first-paint canvas used to be injected per page; main
                    unified the page background in one place (bo-charcoal-shell.css, commit
                    d05bd7c5) and removed it from every page, because two sources for one canvas
                    made the same shell paint two different backgrounds on a page switch. A page
                    still carrying the old inline canvas is a regression of that decision.
     boot           the theme bootstrap + DOMContentLoaded registry in <head>. Without the
                    registry a swapped-in page's boot listeners cannot be replayed.
     quicknav       the rail stylesheet as a real <link>, not injected from a body-end
                    script. Late injection is what restyled the rail after first paint and
                    made the font look like it jumped.
     router         bo-spa.js itself, pinned to the file actually in the tree.

   It also owns assets/js/bo-spa-manifest.js - the list of pages the router is allowed to
   intercept a link for. Everything else (the agent portal, redirect stubs, fragments, the
   legacy layouts) is left to a plain browser navigation.

   usage:
     node scripts/check-spa-readiness.js              # verify markers AND manifest freshness
     node scripts/check-spa-readiness.js --list       # every page and what it carries
     node scripts/check-spa-readiness.js --write-manifest   # regenerate the manifest        */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const listAll = process.argv.includes('--list');
const writeManifest = process.argv.includes('--write-manifest');

const pin = crypto.createHash('sha1')
  .update(fs.readFileSync(path.join(ROOT, 'assets/js/bo-spa.js')).toString('binary').replace(/\r\n/g, '\n'), 'binary')
  .digest('hex').slice(0, 8);

const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'spa-readiness-baseline.json'), 'utf8'));
const exempt = baseline.exempt || {};

/* Which shell owns a page.

   Three kinds of file in this tree look like a page and are not:
     agent-*.html    the agent portal. It keeps its own shell on purpose (AGENTS.md); the
                     router must not swap into it, and links to it are meant to reload.
     a redirect stub a few hundred bytes that meta-refreshes or location.replaces onto a
                     real page (an old bookmark's landing spot). Nothing to adopt.
     a fragment      an HTML snippet pulled in by a workspace script, with no <html> or no
                     <body class> of its own. Never navigated to.
   None of them is a defect; they are classified so the adopted count means something. */
/* Which shell owns a page.

   Three kinds of file in this tree look like a page and are not:
     the agent portal  the pages that load agent-portal.js. They keep their own shell on
                     purpose (AGENTS.md); the router must not swap into them, and links to
                     them are meant to reload. The test is that script, NOT the file name:
                     nine agent-*.html pages are ordinary back-office pages in the BO shell
                     (agent-management.html and the module tabs beside it), and excluding
                     them by name left every click to them a full page load.
     a redirect stub a few hundred bytes that meta-refreshes or location.replaces onto a
                     real page (an old bookmark's landing spot). Nothing to adopt.
     a fragment      an HTML snippet pulled in by a workspace script, with no <html> or no
                     <body class> of its own. Never navigated to.
   None of them is a defect; they are classified so the adopted count means something. */
function classify(file, html) {
  const declared = (html.match(/<html[^>]*\sdata-bo-shell="([a-z]+)"/i) || [])[1];
  if (declared) return declared;
  if (/assets\/js\/agent-portal\.js/.test(html)) return 'agent';
  if (/http-equiv="refresh"/i.test(html) || /location\.(replace|href)\s*=/.test(html)) return 'stub';
  return 'fragment';
}

/* A page whose module tab row exists has to link the sheet that styles it - auth.js states the
   contract next to the table and sixteen of the forty-eight pages had drifted away from it, so
   their tab row rendered as plain links with no spacing and no active state (on a fresh load as
   much as after a swap; origin/main had the same gap). */
function moduleTabPages() {
  const auth = fs.readFileSync(path.join(ROOT, 'assets/js/auth.js'), 'utf8');
  const start = auth.indexOf('const MODULE_TABS');
  const table = auth.slice(start, auth.indexOf('const MODULE_ANCHORS', start));
  const anchors = auth.slice(auth.indexOf('const MODULE_ANCHORS', start), auth.indexOf('const MODULE_LABELS', start));
  return new Set([
    ...[...table.matchAll(/'(\w[\w\-.]*\.html)'\s*:\s*\{/g)].map((m) => m[1]),
    ...[...anchors.matchAll(/'(\w[\w\-.]*\.html)'/g)].map((m) => m[1])
  ]);
}
const needsModuleTabsCss = moduleTabPages();

const pages = fs.readdirSync(ROOT)
  .filter((f) => f.endsWith('.html') && !f.startsWith('_') && !f.startsWith('.'))
  .sort();

const rows = [];
for (const file of pages) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const head = (html.split(/<\/head>/i)[0] || '');
  const shell = classify(file, html);
  const spa = /<html[^>]*\sdata-bo-spa="1"/i.test(html);
  // Inverted marker: the old per-page canvas must not be present (see the header).
  const staleCanvas = /First-paint canvas/.test(head);
  const hasModuleTabsCss = /bo-module-tabs\.css/.test(head);
  const needsTabsCss = needsModuleTabsCss.has(file);
  const boot = /window\.__boDCL/.test(head);
  /* The sheet has to be a real <link> in <head>, which is what keeps the rail's styling out
     of a body-end script that restyled it after first paint (the font jump). The
     data-bo-quicknav-css attribute is only the rollout's own bookkeeping - a page that
     links the sheet without it is just as smooth, so it is not part of the test. */
  const quicknav = /bo-global-quicknav\.css/.test(head);
  const router = new RegExp('bo-spa\\.js\\?v=' + pin + '(?![0-9a-z])').test(html);
  const routerAny = /bo-spa\.js/.test(html);
  const topbar = /data-bo-topbar/.test(html);
  const shellCss = /bo-shell\.css/.test(html);
  /* The frame the router swaps. A standard page has .report-content; a page that predates the
     standard shell declares its own with data-bo-frame (see the comment in bo-spa.js). Both
     count as "has a frame"; what does not count is having neither, because the router would
     then fetch the page, find nothing to swap and fall back to a real navigation. */
  const frame = /class="report-content/.test(html) || /data-bo-frame/.test(html);

  const missing = [];
  if (shell === 'bo' || shell === 'main') {
    if (!spa) missing.push('data-bo-spa');
    if (!boot) missing.push('boot');
    if (!quicknav) missing.push('quicknav');
    if (!router) missing.push(routerAny ? 'router-pin' : 'router');
    /* Not a swap target, so it is excused - and left out of the manifest below, which is
       the mechanism that makes it harmless rather than the audit having to fail forever. */
    if (!frame) missing.push('frame');
    if (staleCanvas) missing.push('stale-canvas');
    if (needsTabsCss && !hasModuleTabsCss) missing.push('module-tabs.css');
    if (shell === 'bo') {
      if (!topbar) missing.push('topbar');
      if (!shellCss) missing.push('bo-shell.css');
    }
  }
  // An exemption only ever excuses a marker; the page's reason has to be in the baseline.
  const excused = (shell === 'bo' || shell === 'main') && exempt[file] ? missing.slice() : [];
  const real = missing.filter((m) => excused.indexOf(m) < 0);
  rows.push({ file, shell, spa, canvas: staleCanvas, boot, quicknav, router, frame, missing, excused, real, why: exempt[file] });
}

const adopted = rows.filter((r) => r.shell === 'bo' || r.shell === 'main');
const short = adopted.filter((r) => r.real.length);
const other = adopted.filter((r) => !r.real.length && r.excused.length);

/* The pages the router may intercept a link for: opted in AND carrying the frame the swap
   lands in. Generated, never hand-edited - a new page that is not in it is not broken, its
   links just navigate the ordinary way until this is run again. */
const manifestPages = rows
  .filter((r) => (r.shell === 'bo' || r.shell === 'main') && r.spa && r.frame)
  .map((r) => r.file)
  .sort();
const manifestBody =
  '/* GENERATED by scripts/check-spa-readiness.js - do not hand-edit.\n' +
  '   Pages the router may intercept a link for: opted in, and carrying the content frame a\n' +
  '   swap lands in. Anything absent navigates the ordinary way, which is the safe direction:\n' +
  '   a link to a page that cannot be swapped costs one navigation, never a wasted fetch\n' +
  '   followed by a reload. Re-run the script after adding or adopting a page. */\n' +
  'window.__BO_SPA_PAGES={' + manifestPages.map((f) => JSON.stringify(f) + ':1').join(',') + '};\n';
const manifestPath = path.join(ROOT, 'assets/js/bo-spa-manifest.js');
const manifestOld = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : '';
/* A Windows checkout writes CRLF into the working copy (core.autocrlf) while the generated
   body is LF; comparing the raw strings made every Windows run report STALE and rewrite a
   file that was already current. Compare with line endings normalised, as the pin guards do. */
const manifestFresh = manifestOld.replace(/\r\n/g, '\n') === manifestBody;

if (writeManifest) {
  if (!manifestFresh) {
    fs.writeFileSync(manifestPath, manifestBody, 'utf8');
    console.log('wrote assets/js/bo-spa-manifest.js (' + manifestPages.length + ' pages)');
  } else {
    console.log('assets/js/bo-spa-manifest.js already current (' + manifestPages.length + ' pages)');
  }
}

if (listAll) {
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('page', 44) + pad('shell', 9) + pad('spa', 5) + pad('frame', 7) + pad('canvas', 8) + pad('boot', 6) + pad('quick', 7) + pad('router', 7) + 'missing');
  for (const r of rows) {
    console.log(pad(r.file, 44) + pad(r.shell, 9) + pad(r.spa ? 'y' : '-', 5) + pad(r.frame ? 'y' : '-', 7) + pad(r.canvas ? 'y' : '-', 8) + pad(r.boot ? 'y' : '-', 6) + pad(r.quicknav ? 'y' : '-', 7) + pad(r.router ? 'y' : '-', 7) + (r.real.join(',') || (r.excused.length ? '(exempt: ' + r.excused.join(',') + ')' : '')));
  }
  console.log('');
}

const byShell = {};
for (const r of rows) byShell[r.shell] = (byShell[r.shell] || 0) + 1;
console.log('bo-spa.js pin: ' + pin);
console.log('pages: ' + rows.length + '   ' + Object.keys(byShell).sort().map((s) => s + '=' + byShell[s]).join(' '));
console.log('in scope (bo+main): ' + adopted.length + '   complete: ' + (adopted.length - short.length - other.length) + '   exempt: ' + other.length + '   short: ' + short.length);
console.log('manifest: ' + manifestPages.length + ' swappable pages' + (manifestFresh ? '   (current)' : '   *** STALE - run --write-manifest ***'));
if (short.length) {
  console.log('\nshort pages:');
  for (const r of short) console.log('  ' + r.file + '  [' + r.shell + ']  missing: ' + r.real.join(','));
}
if (other.length) {
  console.log('\nexempt:');
  for (const r of other) console.log('  ' + r.file + '  (' + r.excused.join(',') + ') - ' + r.why);
}
const counts = {};
for (const r of short) for (const m of r.real) counts[m] = (counts[m] || 0) + 1;
if (Object.keys(counts).length) console.log('\nmissing by marker: ' + Object.keys(counts).sort().map((k) => k + '=' + counts[k]).join(' '));

process.exit(short.length || !manifestFresh ? 1 : 0);
