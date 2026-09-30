#!/usr/bin/env node
/* Two rules that a page script has to satisfy for content replacement to be safe:

   A. It must not declare a global that another script (page or shared) also declares.
      A full page load runs one page's scripts, so two files may each `const X` and nothing
      notices; a swap runs the target's scripts in the same global scope as the page it came
      from, so the second declaration is a SyntaxError and that whole script never runs. This is
      how game-category.html broke after game-sub-category-edit.html (both `const
      GAME_CATEGORY_API`) and how game-provider.html broke on re-entry (`const PROVIDER_API`).

   B. A page's own script must be re-runnable, because the router runs it again every time the
      page is entered - that is what re-renders its data. A file whose body is `const X = ...` at
      the top level cannot run twice in one realm (SyntaxError). (function(){ ... })() declares
      nothing and is fine; that is what the ~160 other files in assets/js already do.

   "Top level" means: not inside a wrapper, and not indented. A column-based scan alone reports
   the thousands of declarations that sit inside a file-wide IIFE (most of this tree starts with
   `(function(){` and never indents), so a file whose first code is a wrapper call is skipped
   entirely.

   usage:
     node scripts/check-global-collisions.js            # exit 1 on a new violation
     node scripts/check-global-collisions.js --list     # every top-level global, per file        */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const JS_DIR = path.join(ROOT, 'assets/js');
const listAll = process.argv.includes('--list');

/* Violations that already existed when this check was added, each with a reason. Empty is the
   goal: the fix is to wrap the file or rename the name, which removes the class for good. */
const baselinePath = path.join(__dirname, 'global-collisions-baseline.json');
const baseline = fs.existsSync(baselinePath)
  ? (JSON.parse(fs.readFileSync(baselinePath, 'utf8')).known || {})
  : {};

const DECL = /^(const|let|class|function|var)\s+([A-Za-z_$][\w$]*)/;

function stripLeadingComments(src) {
  let i = 0;
  for (;;) {
    while (i < src.length && /\s/.test(src[i])) i++;
    if (src[i] === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (src[i] === '/' && src[i + 1] === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    return src.slice(i);
  }
}

/* A file is "wrapped" when its body is one wrapper call: (function(){ ... })() and friends.
   Nothing it declares reaches the global scope, so it can collide with nothing and can run
   again. Detected from the shape of the file rather than by tracking braces, because brace
   tracking over regex literals and template strings is where a scanner goes wrong. */
function isWrapped(src) {
  const body = stripLeadingComments(src).replace(/\s+/g, ' ').trim();
  if (!/^\(\s*(async\s+)?function\b/.test(body) && !/^\(\s*(\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/.test(body)) return false;
  return /\(\s*\)\s*;?\s*$/.test(body) || /\)\s*\(\s*\)\s*;?\s*$/.test(body) || /\(\s*\)\s*\)\s*;?\s*$/.test(body);
}

function topLevelDecls(src) {
  if (isWrapped(src)) return [];
  const out = [];
  const lines = src.split(/\r?\n/);
  let inBlockComment = false;
  for (const line of lines) {
    if (inBlockComment) { if (line.includes('*/')) inBlockComment = false; continue; }
    const t = line.trimStart();
    if (t.startsWith('/*')) { if (!t.includes('*/')) inBlockComment = true; continue; }
    if (/^\s/.test(line)) continue;            // indented: inside something
    if (t.startsWith('//') || !t) continue;
    const m = t.match(DECL);
    if (m) out.push({ kind: m[1], name: m[2] });
  }
  return out;
}

/* Which pages load each file - a file loaded by many pages is shared and is never re-run. */
const pages = fs.readdirSync(ROOT)
  .filter((f) => f.endsWith('.html') && !f.startsWith('_') && !f.startsWith('.'))
  .sort();
const loads = {};
for (const p of pages) {
  const html = fs.readFileSync(path.join(ROOT, p), 'utf8');
  for (const m of html.matchAll(/assets\/js\/([\w\-.]+\.js)/g)) (loads[m[1]] = loads[m[1]] || new Set()).add(p);
}

const files = fs.readdirSync(JS_DIR).filter((f) => f.endsWith('.js')).sort();
const perFile = {};
const byName = {};
for (const f of files) {
  const src = fs.readFileSync(path.join(JS_DIR, f), 'utf8');
  const decls = topLevelDecls(src);
  perFile[f] = decls;
  for (const d of decls) {
    if (d.kind === 'function' || d.kind === 'var') continue;   // legal to redeclare
    (byName[d.name] = byName[d.name] || []).push(f);
  }
}

if (listAll) {
  for (const f of files) {
    if (!perFile[f].length) continue;
    const who = (loads[f] || new Set()).size;
    console.log(f.padEnd(34) + 'pages=' + String(who).padEnd(4) + perFile[f].map((d) => d.kind + ' ' + d.name).join(', '));
  }
  console.log('');
}

const collisions = Object.keys(byName).filter((n) => byName[n].length > 1).sort();
const freshCollisions = collisions.filter((n) => !baseline['collision:' + n]);

/* A page-own script that declares globals cannot be re-run, which is rule B. */
const notRerunnable = files.filter((f) => {
  const who = (loads[f] || new Set()).size;
  if (who === 0 || who > 3) return false;                     // shared scripts are never re-run
  return perFile[f].some((d) => d.kind === 'const' || d.kind === 'let' || d.kind === 'class');
}).filter((f) => !baseline['notRerunnable:' + f]);

console.log('files scanned: ' + files.length + '   wrapped (nothing global): ' + files.filter((f) => isWrapped(fs.readFileSync(path.join(JS_DIR, f), 'utf8'))).length);
console.log('global names declared by more than one file: ' + collisions.length + (freshCollisions.length ? '  (' + freshCollisions.length + ' new)' : ''));
for (const n of collisions) console.log('  ' + (baseline['collision:' + n] ? '(known) ' : '!! ') + n + '  in: ' + byName[n].join(', '));
console.log('page scripts that cannot be re-run (top-level declaration, <=3 pages): ' + notRerunnable.length);
for (const f of notRerunnable) console.log('  !! ' + f + '  pages=' + (loads[f] || new Set()).size + '  ' + perFile[f].filter((d) => d.kind !== 'function' && d.kind !== 'var').map((d) => d.name).join(', '));

const fails = freshCollisions.length + notRerunnable.length;
if (fails) {
  console.log('');
  console.log('  ⛔ ' + fails + ' violation(s).');
  console.log('     A colliding global: rename it in one file. A page script that cannot be re-run:');
  console.log('     wrap its body in (function () { ... })(); - see SPA.md section 4.');
  console.log('     Both are SyntaxErrors at run time, and the script that throws does nothing at all.');
}
process.exit(fails ? 1 : 0);
