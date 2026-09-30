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
const REF = /assets\/((?:css|js)\/[\w\-.]+\.(?:css|js))\?v=([\w.\-]+)/g;

function pinOf(rel) {
  const buf = fs.readFileSync(path.join(ROOT, rel));
  return crypto.createHash('sha1')
    .update(buf.toString('binary').replace(/\r\n/g, '\n'), 'binary')
    .digest('hex').slice(0, 8);
}

const files = fs.readdirSync(ROOT)
  .filter((f) => f.endsWith('.html') && !f.startsWith('_') && !f.startsWith('.'))
  .sort();

const stale = new Map();
let pages = 0, refs = 0, fixedPages = 0;
for (const f of files) {
  const full = path.join(ROOT, f);
  const html = fs.readFileSync(full, 'utf8');
  let out = html, hits = 0;
  REF.lastIndex = 0;
  out = html.replace(REF, (whole, rel, pinned) => {
    refs++;
    const asset = 'assets/' + rel;               // the capture group starts at css/ or js/
    const target = path.join(ROOT, asset);
    if (!fs.existsSync(target)) return whole;      // a missing asset is a different check
    const want = pinOf(asset);
    if (want === pinned) return whole;
    hits++;
    stale.set(asset, want);
    return 'assets/' + rel + '?v=' + want;
  });
  if (hits) {
    pages++;
    if (listAll) console.log('  ' + f.padEnd(44) + hits + ' stale');
    if (fix) { fs.writeFileSync(full, out, 'utf8'); fixedPages++; }
  }
}
console.log('pages: ' + files.length + '   references: ' + refs + '   stale references: ' + stale.size + ' on ' + pages + ' page(s)');
if (stale.size && !fix && !listAll) {
  for (const rel of [...stale.keys()].slice(0, 10)) console.log('  ! ' + rel + ' -> ' + stale.get(rel));
  console.log('');
  console.log('  ⛔ an asset changed without its cache key changing, so a browser holding the old');
  console.log('     URL keeps serving the old file. Fix: node scripts/check-asset-pins.js --fix');
}
if (fix) console.log('rewrote ' + fixedPages + ' page(s)');
process.exit(stale.size && !fix ? 1 : 0);
