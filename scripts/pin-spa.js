#!/usr/bin/env node
/* Re-pin the two SPA assets the pages load.

   assets/js/bo-spa.js and assets/js/bo-spa-manifest.js are requested with ?v=<sha1[:8]> so a
   browser that cached the previous revision cannot keep running it after a deploy - the
   router lives in the page for the whole session, and an old copy of it in a tab is exactly
   the "I fixed that already" that is impossible to debug from the outside.

   Run this after touching either file; the readiness check does not do it for you.

   usage:  node scripts/pin-spa.js [--check]                                                */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');

const TARGETS = ['assets/js/bo-spa.js', 'assets/js/bo-spa-manifest.js'].map((rel) => ({
  rel,
  hash: crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex').slice(0, 8)
}));

const files = fs.readdirSync(ROOT)
  .filter((f) => f.endsWith('.html') && !f.startsWith('_') && !f.startsWith('.'))
  .sort();

let changed = 0;
const notes = [];
for (const name of files) {
  const file = path.join(ROOT, name);
  const before = fs.readFileSync(file, 'utf8');
  let html = before;
  const pageNotes = [];
  for (const t of TARGETS) {
    const marker = t.rel + '?v=';
    let i = html.indexOf(marker);
    while (i !== -1) {
      const start = i + marker.length;
      let end = start;
      while (end < html.length && !/["'&\s>]/.test(html[end])) end++;
      if (html.slice(start, end) !== t.hash) {
        html = html.slice(0, start) + t.hash + html.slice(end);
        pageNotes.push(t.rel.replace('assets/js/', '') + ' -> ' + t.hash);
      }
      i = html.indexOf(marker, i + marker.length);
    }
  }
  if (html !== before) {
    changed++;
    notes.push('  ' + name.padEnd(42) + pageNotes.join(', '));
    if (!CHECK) fs.writeFileSync(file, html, 'utf8');
  }
}
for (const t of TARGETS) console.log(t.rel + ' -> ' + t.hash);
console.log(changed + ' page(s) ' + (CHECK ? 'need' : 'got') + ' a new pin');
if (CHECK && notes.length) for (const n of notes.slice(0, 10)) console.log(n);
process.exit(CHECK && changed ? 1 : 0);
