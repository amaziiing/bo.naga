#!/usr/bin/env node
/* A page script may not declare a global that another page script declares.

   On a full page load only one page's scripts ever share the global scope, so two files may
   each declare `const X` and nothing notices. A swap runs the target page's scripts in the
   SAME global scope as the page it came from, so the second declaration is a SyntaxError and
   that whole script - and everything it wires - never runs. That is how
   game-category.html broke after game-sub-category-edit.html: both declare
   `const GAME_CATEGORY_API`, and the page rendered with nothing working.

   Only a `const` / `let` / `class` at the TOP LEVEL of a file is such a global. A file whose
   body sits inside (function(){ ... })() declares nothing global even though its lines start
   at column 0 - which is most of this tree - so this walks each file with a small tokenizer
   (strings, template literals, comments and regex literals) and records declarations only at
   brace depth 0. A column-based scan reports collisions that cannot happen.

   usage:
     node scripts/check-global-collisions.js            # exit 1 on a new collision
     node scripts/check-global-collisions.js --list     # every top-level global per file       */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'assets/js');
const listAll = process.argv.includes('--list');

/* Names already known to collide, if any. Keep this empty if you can - the fix is a rename in
   one of the two files, which is what makes the class disappear for good. */
const baselinePath = path.join(__dirname, 'global-collisions-baseline.json');
const baseline = fs.existsSync(baselinePath)
  ? (JSON.parse(fs.readFileSync(baselinePath, 'utf8')).known || {})
  : {};

function topLevelNames(src) {
  const out = [];
  let i = 0, depth = 0, n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '\n') { i++; continue; }
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < n) { if (src[i] === '\\') { i += 2; continue; } if (src[i] === q) { i++; break; } i++; }
      continue;
    }
    if (c === '/') {
      let j = i - 1;
      while (j >= 0 && /\s/.test(src[j])) j--;
      const prev = j >= 0 ? src[j] : '';
      if (!/[\w$)\]'"`]/.test(prev)) {
        i++;
        while (i < n) {
          if (src[i] === '\\') { i += 2; continue; }
          if (src[i] === '[') { while (i < n && src[i] !== ']') { if (src[i] === '\\') i++; i++; } }
          if (src[i] === '/' || src[i] === '\n') { i++; break; }
          i++;
        }
        continue;
      }
    }
    if (c === '{') { depth++; i++; continue; }
    if (c === '}') { if (depth > 0) depth--; i++; continue; }
    if (depth === 0 && /[A-Za-z_$]/.test(c)) {
      const m = /^(const|let|class)\s+([A-Za-z_$][\w$]*)/.exec(src.slice(i, i + 200));
      if (m) {
        let j = i - 1;
        while (j >= 0 && /\s/.test(src[j])) j--;
        const prev = j >= 0 ? src[j] : '';
        if (prev === '' || prev === ';' || prev === '}' || src[j] === '\n') {
          out.push(m[2]);
          i += m[0].length;
          continue;
        }
      }
    }
    i++;
  }
  return out;
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.js')).sort();
const byName = {};
const perFile = {};
for (const f of files) {
  const names = topLevelNames(fs.readFileSync(path.join(DIR, f), 'utf8'));
  perFile[f] = names;
  for (const nm of names) (byName[nm] = byName[nm] || []).push(f);
}

if (listAll) {
  for (const f of files) if (perFile[f].length) console.log(f.padEnd(34) + perFile[f].join(', '));
  console.log('');
}
// Only place a page could actually load both is a real break; but two different pages in one
// session is enough, so every collision counts.
const clash = Object.keys(byName).filter((k) => byName[k].length > 1).sort();
const fresh = clash.filter((k) => !baseline[k]);
console.log('files scanned: ' + files.length + '   top-level globals: ' + Object.keys(byName).length + '   colliding names: ' + clash.length);
for (const k of clash) console.log('  ' + (baseline[k] ? '(known) ' : '!! ') + k + '  declared in: ' + byName[k].join(', '));
if (fresh.length) {
  console.log('');
  console.log('  ⛔ ' + fresh.length + ' NEW colliding global name(s). A swap into either page will throw');
  console.log('     "Identifier already been declared" and the rest of that script will not run.');
  console.log('     Fix: rename one of them in one file (see the comment at the top).');
}
process.exit(fresh.length ? 1 : 0);
