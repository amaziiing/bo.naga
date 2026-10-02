#!/usr/bin/env node
/* Every asset reference must point at the content it is actually loading.

   The `?v=` on assets/css|js/... is a browser cache key, and the only thing that keeps it honest
   is matching the file. For a while it did not: DESIGN.md records it as a known drift - "hashing
   every assets/css|js/...?v= reference against its file finds ~1400 out-of-date ones today" - and
   that drift has a visible cost. A browser that already holds the old URL serves the old sheet,
   so a stylesheet change simply does not arrive until the user hard-refreshes: that is how the
   module row's new spacing (bo-shell.css blocks 0c-1 / 0c-2) failed to apply on every module page
   while the file on disk was correct. Counted on promotion.html: 35 of its 39 references were
   stale.

   The value is a hash of the file's content with line endings normalised, so it means the same
   thing on a Linux checkout and on a Windows one, and changes exactly when the file changes.

   A reference whose file is not on disk cannot be pinned at all, and a 404 leaves the page
   silently without that script or sheet, so a missing asset is reported and fails the check
   too (assets/js/dialog.js was one, on two pages). This walk reads the served pages in the
   repository root only - scratch directories .gitignore excludes are not part of it.

   Two things made a reference invisible to this check while being the same failure:

   - the pins a SCRIPT writes at runtime. auth.js mounts the shell's quicknav sheet, reports.js
     loads the translation panel, member-transaction-page.js swaps the transaction modules - all
     with a pin hard-coded in the script, outside any .html file. Two of them had gone stale:
     auth.js asked for bo-global-quicknav.css?v=c84f0546 while the file was 7bad56b7 (the rail
     and quicknav, so a cached copy is a visibly old design), and reports.js asked for
     dynamic-translation.js?v=1.1.0 while the file was 5ad59a20. The scripts are scanned now.
   - a reference with NO pin at all (ip-whitelist-security.html loaded config.js unpinned,
     wbet-bet-limit.html its own script). A stable url is whatever the cache happens to hold,
     which is the same stale file with no way to bust it. Reported as unpinned and rewritten.

   A reference must start right after a quote - an attribute value or a JS string. Prose that
   names a path ("see assets/js/foo.js") is not a reference and is left alone.

   usage:
     node scripts/check-asset-pins.js            # exit 1 on a stale reference
     node scripts/check-asset-pins.js --list     # list them
     node scripts/check-asset-pins.js --fix      # rewrite them (same as stamp-asset-pins.py)  */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const listAll = process.argv.includes('--list');
const fix = process.argv.includes('--fix');
const REF = /assets\/((?:css|js)\/[\w\-.]+\.(?:css|js))(\?v=([\w.\-]+))?/g;

function pinOf(rel) {
  const buf = fs.readFileSync(path.join(ROOT, rel));
  return crypto.createHash('sha1')
    .update(buf.toString('binary').replace(/\r\n/g, '\n'), 'binary')
    .digest('hex').slice(0, 8);
}

const pageFiles = fs.readdirSync(ROOT)
  .filter((f) => f.endsWith('.html') && !f.startsWith('_') && !f.startsWith('.'))
  .sort();
const scriptFiles = fs.readdirSync(path.join(ROOT, 'assets', 'js'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => 'assets/js/' + f)
  .sort();
const files = [...pageFiles, ...scriptFiles];

const stale = new Map();
const unpinned = new Map();
const missing = new Map();
let pages = 0, refs = 0, fixedFiles = 0;
for (const f of files) {
  const full = path.join(ROOT, f);
  const text = fs.readFileSync(full, 'utf8');
  let hits = 0;
  REF.lastIndex = 0;
  const out = text.replace(REF, (whole, rel, pinPart, pinned, offset, source) => {
    /* Only a real reference: the url must start right after a quote. */
    const prev = source[offset - 1];
    if (prev !== '"' && prev !== "'") return whole;
    const asset = 'assets/' + rel;               // the capture group starts at css/ or js/
    /* A script may name itself in its own documentation (bo-topbar.js shows the tag a page
       ships). That pin can never be right for long - writing the hash into the file changes
       the file - so it is not a reference and is left alone. */
    if (f === asset) return whole;
    const target = path.join(ROOT, asset);
    if (!fs.existsSync(target)) {                  // cannot be pinned - reported below
      refs++;
      if (!missing.has(asset)) missing.set(asset, new Set());
      missing.get(asset).add(f);
      return whole;
    }
    refs++;
    const want = pinOf(asset);
    if (pinned === want) return whole;
    hits++;
    if (pinned) stale.set(asset, want); else unpinned.set(asset, want);
    return 'assets/' + rel + '?v=' + want;
  });
  if (hits) {
    pages++;
    if (listAll) console.log('  ' + f.padEnd(44) + hits + (fix ? '' : ' to fix'));
    if (fix) { fs.writeFileSync(full, out, 'utf8'); fixedFiles++; }
  }
}
console.log('files: ' + files.length + ' (' + pageFiles.length + ' pages + ' + scriptFiles.length + ' scripts)'
  + '   references: ' + refs
  + '   stale references: ' + stale.size + ' on ' + pages + ' file(s)'
  + (unpinned.size ? '   references with no pin: ' + unpinned.size : '')
  + (missing.size ? '   missing assets: ' + missing.size : ''));
if ((stale.size || unpinned.size) && !fix && !listAll) {
  for (const rel of [...stale.keys()].slice(0, 10)) console.log('  ! stale    ' + rel + ' -> ' + stale.get(rel));
  for (const rel of [...unpinned.keys()].slice(0, 10)) console.log('  ! unpinned ' + rel + ' -> ' + unpinned.get(rel));
  console.log('');
  console.log('  ⛔ an asset changed without its cache key changing (or an asset referenced with no');
  console.log('     key at all), so a browser holding the old url keeps serving the old file.');
  console.log('     Fix: node scripts/check-asset-pins.js --fix');
}
if (missing.size) {
  for (const [asset, on] of missing) console.log('  ? ' + asset + ' is not on disk (referenced by ' + on.size + ' page(s): ' + [...on].slice(0, 4).join(', ') + ')');
  console.log('');
  console.log('  ⛔ a page asks for an asset that does not exist, so the request 404s and the page');
  console.log('     runs without it. Fix: delete the reference, or restore the file.');
}
if (fix) console.log('rewrote ' + fixedFiles + ' file(s)');
process.exit((((stale.size || unpinned.size) && !fix) || missing.size) ? 1 : 0);
