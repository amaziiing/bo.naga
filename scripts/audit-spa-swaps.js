#!/usr/bin/env node
/* Swap audit - does every page behave like a page loaded directly, when the router swaps it in?

   This is the black-box counterpart to scripts/check-spa-readiness.js. The readiness check
   reads what a page DECLARES; this drives the real router in a real browser and compares the
   result against that declaration:

     ids        every element id the page carries must exist in the document after the swap
                (inside the frame, or moved somewhere by a page script - both are fine, absent
                is not: that is how `slider-edit.js:265` and the two null-binding failures
                looked, and how a whole form card was once left behind)
     extras     body-level elements outside the shell must be the page's own
     sheets     the stylesheets the page ships must be the ones in the document
     title      the top bar title must not still be the previous page's
     errors     no script error that the page does not already produce

   It needs a browser and a local server:

     node .tmp-wip/serve.js 8098 &              # any static server; python's http.server is
     node scripts/audit-spa-swaps.js            # single threaded and distorts the timings

   usage:
     node scripts/audit-spa-swaps.js                     # every page in the manifest
     node scripts/audit-spa-swaps.js a.html b.html       # just these
     node scripts/audit-spa-swaps.js --shell main        # Main panel pages only
     node scripts/audit-spa-swaps.js --base http://127.0.0.1:8099 --port 9800

     node scripts/audit-spa-swaps.js --twice                # enter every page twice          
   Exit code 1 if any page is flagged. Read the reasons, then decide - three of them are
   expected shapes rather than defects, and are listed at the bottom of this file.              */
'use strict';
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path');
const { spawn, execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const BASE = flag('--base', 'http://127.0.0.1:8098');
const PORT = Number(flag('--port', 0)) || 9800 + Math.floor(Math.random() * 150);
const ONLY_SHELL = flag('--shell', '');
/* --twice enters every page a second time. The re-run of a page's own script only happens on a
   second entry, so this is the axis that catches a script which cannot run twice
   ("Identifier 'X' has already been declared" - found on game-provider.html this way). */
const TWICE = args.includes('--twice');
const given = args.filter((a) => a.endsWith('.html'));
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = (u) => new Promise((res, rej) => {
  http.get(u, (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej);
});

/* ---- the pages to audit, and the fake account to audit them with ----------------------- */

/* Date-range pairs owned by the picker files, per file. After a swap every declared pair must
   be BUILT (its two native inputs hidden behind the .bo-range-field host); a pair still visible
   is the "raw dd/mm/yyyy boxes came back on the second tab switch" failure. */
const RANGE_FILES = ['bo-date-range.js', 'bo-date-range-promotion.js', 'bo-date-range-bank-usage.js'];
const RANGE_PAIRS = {};
for (const f of RANGE_FILES) {
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'js', f), 'utf8');
  const body = (src.match(/const PAIRS=\[([\s\S]*?)\];/) || [])[1] || '';
  RANGE_PAIRS[f] = [...body.matchAll(/\['([A-Za-z0-9_]+)','([A-Za-z0-9_]+)'\]/g)].map((m) => [m[1], m[2]]);
}

const manifestSrc = fs.readFileSync(path.join(ROOT, 'assets/js/bo-spa-manifest.js'), 'utf8');
const manifest = manifestSrc.match(/window\.__BO_SPA_PAGES=\{(.*)\};/s)[1]
  .split(',').map((s) => s.split(':')[0].replace(/"/g, '')).filter(Boolean);

function pagesFor(only) {
  if (only && only.length) return only;
  if (!ONLY_SHELL) return manifest;
  return manifest.filter((f) => (ONLY_SHELL === 'main' ? /^main[-_]/.test(f) || f === 'menu-permission.html' : !(/^main[-_]/.test(f) || f === 'menu-permission.html')));
}

/* The account has to satisfy BO_AUTH.enforcePageAccess, which a swap re-runs, or the router is
   told to leave the page and the audit sees a dead JS context instead of a swap. ROOT/rootAdmin
   short-circuits that check; roleType follows the shell being audited because the portal
   isolation rule redirects an account of the other kind. */
function seedScript(shell) {
  const menus = manifest.map((f) => ({
    menuKey: f.replace('.html', '').replace(/[^A-Za-z0-9_]/g, '_'),
    title: f.replace('.html', ''),
    icon: 'bi-dot', url: f, parentKey: '', sortOrder: 1, status: 1, showInSidebar: 1
  }));
  const user = shell === 'main'
    ? { id: 1, username: 'audit', roleType: 'MAIN', mainAdmin: true, rootAdmin: true, name: 'Audit', role: 'Main Root' }
    : { id: 1, username: 'audit', roleType: 'MASTER', rootAdmin: true, name: 'Audit', role: 'Root' };
  return `try {
    localStorage.setItem('bo_admin_token', 'audit-token');
    localStorage.setItem('bo_admin_user', ${JSON.stringify(JSON.stringify(user))});
    localStorage.setItem('bo_theme', 'light');
    localStorage.setItem('bo_api_base', 'http://127.0.0.1:9/api');
    Object.keys(localStorage).forEach(function (k) { if (k.indexOf('bo_shell_nav_v1') === 0) localStorage.removeItem(k); });
  } catch (e) {}
  window.__AUDIT_MENUS = ${JSON.stringify(menus)};`;
}

/* ---- what runs in the page ------------------------------------------------------------- */

const NOISE = /Failed to fetch|net::ERR|WebChannelConnection|127\.0\.0\.1:9|ERR_ABORTED|favicon|firebase/i;

const STEP = (target, start, twice) => `(async () => {
  const t = ${JSON.stringify(target)};
  const twice = ${twice ? 'true' : 'false'};
  const noPin = (s) => String(s).replace(/\\?v=[^?]*$/, '').split('/').pop();
  const ids = (root) => { const o = []; if (root) for (const e of root.querySelectorAll('[id]')) o.push(e.getAttribute('id')); return o; };
  const shellEl = (d) => d.querySelector('.report-shell');
  const extrasIn = (d) => { const sh = shellEl(d); return [...d.body.children].filter(e => e.tagName !== 'SCRIPT' && !(sh && (e === sh || sh.contains(e) || (e.querySelector && e.querySelector('.report-shell'))))); };

  // ---- what the page declares about itself (parsed, never booted)
  const html = await fetch(t, { credentials: 'same-origin' }).then(r => r.text());
  const pd = new DOMParser().parseFromString(html, 'text/html');
  const pf = pd.querySelector('[data-bo-frame]') || pd.querySelector('.report-content');
  const want = {
    frameIds: ids(pf),
    extraIds: extrasIn(pd).map(e => e.getAttribute('id') || (e.className || '').split(' ')[0]).filter(Boolean),
    sheets: [...pd.querySelectorAll('link[rel="stylesheet"]')].map(l => noPin(l.getAttribute('href'))),
    title: (pd.title || '').split(/\\s*[-|·]\\s*/)[0].trim()
  };

  // ---- the swap
  const errs = [];
  const onErr = (e) => errs.push(String(e.message).slice(0, 100));
  window.addEventListener('error', onErr);
  window.BO_SPA.go(${JSON.stringify(start)});
  const wait = async (ms) => { const t0 = Date.now(); while (window.BO_SPA.debug.isBusy() && Date.now() - t0 < ms) await new Promise(r => setTimeout(r, 40)); };
  await wait(9000); await new Promise(r => setTimeout(r, 400));
  errs.length = 0;
  window.BO_SPA.go(t);
  await wait(9000); await new Promise(r => setTimeout(r, 500));
  if (twice) {
    errs.length = 0;
    window.BO_SPA.go(t);
    await wait(9000); await new Promise(r => setTimeout(r, 500));
  }
  window.removeEventListener('error', onErr);

  // ---- what actually arrived
  const d = document;
  const lf = d.querySelector('[data-bo-frame]') || d.querySelector('.report-content');
  const all = ids(d.body);
  const live = {
    frameIds: ids(lf),
    extraIds: extrasIn(d).map(e => e.getAttribute('id') || (e.className || '').split(' ')[0]).filter(Boolean),
    sheets: [...d.querySelectorAll('link[rel="stylesheet"]')].map(l => noPin(l.getAttribute('href'))),
    frameKids: lf ? lf.children.length : -1,
    h1: ((d.querySelector('.report-topbar h1') || {}).textContent || '').trim(),
    url: location.pathname
  };
  const miss = (a, b) => a.filter(x => b.indexOf(x) < 0);
  const last = (window.BO_SPA.debug.navlog() || []).slice(-1)[0] || {};
  /* Date-range pairs this page loads must be BUILT after the swap: the two native boxes are
     hidden behind the .bo-range-field host. A pair still visible is the exact "the picker came
     back as raw dd/mm/yyyy inputs on the second tab switch" failure. */
  const rangeWanted = ${JSON.stringify(RANGE_PAIRS)};
  const rangeRaw = [];
  for (const f in rangeWanted) {
    if (!html.includes('assets/js/' + f)) continue;
    for (const p of rangeWanted[f]) {
      const A = document.getElementById(p[0]), B = document.getElementById(p[1]);
      if (!A || !B) continue;
      if (A.offsetParent !== null || B.offsetParent !== null) rangeRaw.push(p[0] + '/' + p[1]);
    }
  }
  return JSON.stringify({
    page: t,
    declared: { frameIds: want.frameIds.length, extras: want.extraIds.length, sheets: want.sheets.length, title: want.title },
    landed: live.url,
    swapped: last.to === '/' + t && (last.phase === 'ok' || last.phase === 'content'),
    frameKids: live.frameKids,
    idsMissing: miss(want.frameIds, all).filter(Boolean).slice(0, 12),
    idsMovedOutOfFrame: miss(want.frameIds, live.frameIds).filter(id => all.indexOf(id) >= 0).slice(0, 8),
    sheetsMissing: miss(want.sheets, live.sheets).slice(0, 8),
    /* A sheet the target does not declare is NOT a finding: the router never removes a sheet
       any more (removing them stripped the shell - see bo-spa.js). Only a MISSING sheet is. */
    sheetsExtra: [],
    extrasMissing: want.extraIds.filter(x => live.extraIds.indexOf(x) < 0).slice(0, 6),
    title: live.h1,
    rangeRaw,
    errs: errs.filter(e => !${NOISE}.test(e)).slice(0, 5)
  });
})()`;

/* ---- driver ---------------------------------------------------------------------------- */

(async () => {
  const shell = ONLY_SHELL || 'bo';
  const pages = pagesFor(given);
  if (!pages.length) { console.log('no pages to audit'); return; }
  const start = pages[0];
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'spa-audit-'));
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-sandbox',
    '--disable-dev-shm-usage', '--hide-scrollbars', '--window-size=1568,900',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let bad = 0;
  try {
    for (let i = 0; i < 100; i++) { try { await getJson(`http://127.0.0.1:${PORT}/json/version`); break; } catch (e) { await sleep(200); } }
    const list = await getJson(`http://127.0.0.1:${PORT}/json/list`);
    const target = list.find((t) => t.type === 'page');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let id = 0; const pending = new Map();
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
    const send = (method, params) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
    const evalIn = async (expr) => {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result && r.result.exceptionDetails && !(r.result.result)) return { __error: JSON.stringify(r.result.exceptionDetails).slice(0, 200) };
      return r.result && r.result.result ? r.result.result.value : undefined;
    };
    await send('Runtime.enable'); await send('Page.enable');
    await send('Page.addScriptToEvaluateOnNewDocument', { source: seedScript(shell) });
    /* Open the start page for real: the audit runs in a page that has already booted, exactly
       where a user's click would come from. */
    await send('Page.navigate', { url: BASE + '/' + start });
    await sleep(5000);

    let n = 0;
    for (const page of pages) {
      const raw = await evalIn(STEP(page, start, TWICE));
      let f;
      if (raw && raw.__error) f = { page, harnessError: raw.__error };
      else { try { f = JSON.parse(raw); } catch (e) { f = { page, contextDied: String(raw) }; } }
      f.bad = !!(f.harnessError || f.contextDied || f.swapped === false || f.landed !== '/' + page || f.frameKids === 0 ||
        f.idsMissing.length || f.sheetsMissing.length || f.sheetsExtra.length || f.extrasMissing.length || f.errs.length ||
        (f.rangeRaw && f.rangeRaw.length));
      if (f.bad) {
        bad++;
        const why = [];
        if (f.contextDied) why.push('context died during the swap (the page navigated)');
        if (f.harnessError) why.push('harness error: ' + f.harnessError);
        if (f.swapped === false) why.push('did not swap');
        if (f.landed && f.landed !== '/' + page) why.push('landed on ' + f.landed);
        if (f.frameKids === 0) why.push('empty content frame');
        if (f.idsMissing && f.idsMissing.length) why.push('ids missing from the document: ' + f.idsMissing.join(', '));
        if (f.sheetsMissing && f.sheetsMissing.length) why.push('stylesheets missing: ' + f.sheetsMissing.join(', '));
        if (f.sheetsExtra && f.sheetsExtra.length) why.push('stylesheets left over: ' + f.sheetsExtra.join(', '));
        if (f.extrasMissing && f.extrasMissing.length) why.push('page markup outside the shell missing: ' + f.extrasMissing.join(', '));
        if (f.errs && f.errs.length) why.push('script errors: ' + f.errs.join(' | '));
        if (f.rangeRaw && f.rangeRaw.length) why.push('date pickers not built: ' + f.rangeRaw.join(', '));
        console.log('BAD  ' + page.padEnd(34) + why.join(' ; '));
      } else if (process.env.VERBOSE) {
        console.log('ok   ' + page);
      }
      n++;
      // progress on stderr so stdout stays a clean list of findings (grep-able)
      process.stderr.write(`\r[${n}/${pages.length}] ${bad} flagged        `);
      /* Get back to a known page after anything abnormal. A page that redirects itself (or any
         navigation) leaves the session somewhere else, and auditing the next page from there
         reports findings about a document that is being torn down - twenty-seven pages once
         came back with every stylesheet missing because of exactly this. */
      if (f.bad || !f.landed || f.landed !== '/' + page) {
        await send('Page.navigate', { url: BASE + '/' + start });
        await sleep(4000);
      }
    }
    console.log('');
    console.log(pages.length + ' page(s) audited, ' + bad + ' flagged');
    console.log('');
    console.log('Expected flags, not defects:');
    console.log('  context died        a page that redirects itself when opened without a query');
    console.log('                      parameter (provider-detail.html needs providerCode) - a direct');
    console.log('                      load does the same thing, so the swap is not at fault.');
    console.log('  ids missing         check whether the id is inside a <template> (the parser does not');
    console.log('                      descend into template content) or stripped by the page script.');
    ws.close();
  } finally {
    try { execSync(`taskkill /F /T /PID ${chrome.pid}`, { stdio: 'ignore' }); } catch (e) {}
    chrome.kill();
  }
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('audit error:', e); process.exit(2); });
