#!/usr/bin/env node
/* Shell drift guard.

   WHAT IT PROTECTS
   The BO shell (topbar, sidebar rail, content frame) is defined ONCE in
   assets/css/bo-shell.css. The per-module theme sheets used to re-declare the same
   layout metrics with slightly different values, which is why the same category sat at
   a different height on different pages, the header inset / counter row / Logout block
   each drifted, and every fix had to be pushed through with !important.

   This script refuses a NEW metric declaration on a shell selector inside any other
   stylesheet. Colours and CSS custom properties stay allowed there - those are the
   theme's job.

   WHY A BASELINE
   The duplicates that already exist cannot be deleted in one step, so they are recorded
   in scripts/shell-drift-baseline.json. Only violations that are NOT in the baseline
   fail the check, so the guard is enforceable from today while the old ones are retired
   one theme at a time. Adding a new one is what the guard blocks.

   USAGE
     node scripts/check-shell-drift.js                  # check (exit 1 on new drift)
     node scripts/check-shell-drift.js --update-baseline # re-record the current state
     node scripts/check-shell-drift.js --list            # print every current violation
*/

'use strict';
const fs = require('fs');
const path = require('path');

const CSS_DIR = 'assets/css';
const BASELINE = path.join('scripts', 'shell-drift-baseline.json');

/* The shell's own stylesheet is where these belong, so it is not scanned. */
const OWNER_FILE = 'bo-shell.css';
const LEGACY_OWNER = 'bo-topbar.css';   // pre-rename name of the same file

/* Selectors that belong to the BO shell. A rule touching any of these is in scope. */
const SHELL_SELECTOR = new RegExp([
  '\\.report-topbar', '\\.user-title-(wrap|icon|block)',
  '\\.report-sidebar', '\\.report-nav', '\\.report-brand',
  '\\.bo-sidebar-', '\\.nav-group', '\\.report-sub', '\\.bo-rail-label',
  '\\.bo-header-counter', '\\.report-avatar', '\\.bo-account-(link|meta|name|role)',
  '\\.report-content'
].join('|'));

/* The Main panel is a DIFFERENT shell, and AGENTS.md forbids unifying the two - but it has
   its own `.report-shell` / `.report-main` / `.report-content`, so the selector list above
   catches its frame too. A rule scoped by `data-bo-shell="main"` can never match a BO page:
   the attribute is stamped per page by scripts/adopt-bo-spa.js and the two values are
   mutually exclusive. Such a rule is the Main panel's own frame, not the BO shell drifting,
   so it is out of this guard's scope - otherwise every change to the Main panel's content
   rhythm would have to be smuggled into bo-shell.css (which no Main page even links) or
   recorded as a duplicate it is not. */
const MAIN_SHELL_SCOPE = /data-bo-shell\s*=\s*["']?main/;

/* Layout metrics - the properties that caused every drift so far. Colour, background,
   border-colour, box-shadow and custom properties are deliberately NOT listed. */
const BANNED = [
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'gap', 'row-gap', 'column-gap',
  'font-size', 'font-weight', 'line-height', 'letter-spacing',
  'height', 'min-height', 'max-height',
  'flex', 'flex-basis'
];

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/* Return [{selector, property}] for one stylesheet, including rules nested in at-rules
   (media / supports / layer) - the drift lived in those as much as at top level. */
function scan(css) {
  const out = [];
  const src = stripComments(css);

  function walk(text) {
    let i = 0;
    while (i < text.length) {
      const brace = text.indexOf('{', i);
      if (brace < 0) break;

      // Find the matching close brace, skipping nested blocks.
      let depth = 1, j = brace + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === '{') depth++;
        else if (text[j] === '}') depth--;
        j++;
      }
      const head = text.slice(i, brace).trim();
      const body = text.slice(brace + 1, j - 1);

      if (/^@(media|supports|layer|container)/i.test(head)) {
        walk(body);
      } else if (head) {
        const props = [];
        body.replace(/([-a-z]+)\s*:/gi, (m, p) => { props.push(p.toLowerCase()); return m; });
        for (const part of head.split(',')) {
          const sel = part.replace(/\s+/g, ' ').trim();
          if (SHELL_SELECTOR.test(sel) && !MAIN_SHELL_SCOPE.test(sel)) {
            for (const p of props) if (BANNED.includes(p)) out.push({ selector: sel, property: p });
          }
        }
      }
      i = j;
    }
  }
  walk(src);
  return out;
}

function collect() {
  const found = [];
  for (const file of fs.readdirSync(CSS_DIR).sort()) {
    if (!file.endsWith('.css')) continue;
    if (file === OWNER_FILE || file === LEGACY_OWNER) continue;
    const rows = scan(fs.readFileSync(path.join(CSS_DIR, file), 'utf8'));
    for (const r of rows) found.push({ file: path.join(CSS_DIR, file), selector: r.selector, property: r.property });
  }
  return found;
}

const key = v => v.file + ' :: ' + v.selector + ' :: ' + v.property;
const args = process.argv.slice(2);
const violations = collect();

if (args.includes('--update-baseline')) {
  const payload = {
    note: 'Shell metric declarations that already existed when the guard was added. ' +
          'Delete an entry once that declaration is removed from the theme sheet.',
    updated: new Date().toISOString().slice(0, 10),
    entries: [...new Set(violations.map(key))].sort()
  };
  fs.writeFileSync(BASELINE, JSON.stringify(payload, null, 2) + '\n');
  console.log('baseline written: ' + payload.entries.length + ' entries -> ' + BASELINE);
  process.exit(0);
}

if (args.includes('--list')) {
  violations.forEach(v => console.log('  ' + key(v)));
  console.log(violations.length + ' declaration(s) currently present');
  process.exit(0);
}

let known = [];
try {
  known = JSON.parse(fs.readFileSync(BASELINE, 'utf8')).entries || [];
} catch (e) {
  console.error('shell-drift: cannot read ' + BASELINE + ' - run with --update-baseline to create it.');
  process.exit(1);
}
const knownSet = new Set(known);
const fresh = [...new Set(violations.map(key))].filter(k => !knownSet.has(k));

if (!fresh.length) {
  console.log('shell-drift: OK (' + violations.length + ' known declaration(s) still on the baseline)');
  process.exit(0);
}

console.error('');
console.error('  ⛔ new shell metric declaration(s) - the BO shell is defined in assets/css/bo-shell.css');
console.error('');
fresh.forEach(k => console.error('     ' + k));
console.error('');
console.error('     A layout metric (padding / gap / font-size / font-weight / line-height /');
console.error('     letter-spacing / height / flex) on a shell selector must live in');
console.error('     assets/css/bo-shell.css only. Theme sheets may keep colours, background,');
console.error('     border-colour, box-shadow and custom properties.');
console.error('');
console.error('     If this declaration is intentional and belongs to the theme, remove the');
console.error('     metric from the theme sheet. To accept it as pre-existing instead:');
console.error('       node scripts/check-shell-drift.js --update-baseline');
console.error('     (please do not do that to silence a real duplicate).');
console.error('');
process.exit(1);
