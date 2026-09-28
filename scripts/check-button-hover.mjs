#!/usr/bin/env node
// Forces a real :hover on a real element and reports what changes -- the check that a
// resting-state sweep cannot make.
//
// Why this exists: `bo-charcoal-legacy.css` restates the primary's resting paint at one ID
// level so it cannot lose to the ghost base in the same file. Those restatements had no
// `:hover` counterpart, so on every `bo-charcoal` page the resting gradient out-ranked
// every hover rule in the cascade (the strongest hover anywhere is (0,4,1), the
// restatement is (1,4,2)) and the primary's hover was silently **dead**. Measured on
// main-provider-create.html: its "Create Provider" button changed 0 properties on hover
// while every non-charcoal sibling changed 3.
//
// A static check cannot see this. With no pointer over the element, getComputedStyle
// returns the resting values whether the hover rule is winning, losing, or identical, so a
// dead hover and a working one are byte-identical. `CSS.forcePseudoState` is the only way
// to ask the real question. scripts/check-button-standard.py covers what is decidable from
// the source; this covers what is not.
//
// USAGE
//   node scripts/check-button-hover.mjs <page.html> <selector> [light|dark] [base-url]
//
// The page must be reachable and must not redirect. In this repo the pages gate on a
// session, so point it at whatever preview harness you have (the default assumes one on
// 127.0.0.1:8080 serving the workspace root), e.g.:
//
//   node scripts/check-button-hover.mjs main-provider-create.html '.mac-footer-actions .mad-btn-navy'
//   node scripts/check-button-hover.mjs main-provider-create.html '.mac-footer-actions .mad-btn-ghost' dark
//
// Exit code 0 = the hover changes something, 1 = the hover is dead (or the element was not
// found). Prints the resting and hovered value of every paint property plus transform.

import { spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 9333;
const CHROME = process.env.CHROME ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PROPS = ['background-image', 'background-color', 'border-top-color', 'color',
               'transform', 'box-shadow', 'filter', 'transition'];

const [, , page, selector, themeArg, baseArg] = process.argv;
const theme = themeArg === 'dark' ? 'dark' : 'light';
const base = baseArg || 'http://127.0.0.1:8080/.tmp-btnstd/';

if (!page || !selector) {
  console.error('usage: node scripts/check-button-hover.mjs <page.html> <selector> [light|dark] [base-url]');
  process.exit(2);
}

function cdp(ws, id, method, params) {
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id === id) { ws.removeEventListener('message', onMsg); resolve(m); }
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params: params || {} }));
    setTimeout(() => reject(new Error('cdp timeout: ' + method)), 30000);
  });
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bo-hover-'));
const child = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile,
  '--window-size=1400,900', 'about:blank'
], { stdio: 'ignore' });

let targets = null;
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch('http://127.0.0.1:' + PORT + '/json/list');
    targets = await r.json();
    if (targets && targets.length) break;
  } catch { /* endpoint not up yet */ }
  await new Promise(r => setTimeout(r, 250));
}
if (!targets) {
  console.error('chrome devtools endpoint never came up; is the browser installed at ' + CHROME + '?');
  child.kill();
  process.exit(2);
}
const target = targets.find(t => t.type === 'page') || targets[0];
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.addEventListener('open', res);
  ws.addEventListener('error', rej);
});

let n = 1;
await cdp(ws, n++, 'Page.enable');
await cdp(ws, n++, 'DOM.enable');
await cdp(ws, n++, 'CSS.enable');

const url = base + page + '?theme=' + theme;
const loaded = new Promise(res => {
  const h = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Page.loadEventFired') { ws.removeEventListener('message', h); res(); }
  };
  ws.addEventListener('message', h);
});
await cdp(ws, n++, 'Page.navigate', { url });
await loaded;
// let the page settle: bo-ui-standard.js repaints buttons from a mutation observer
await new Promise(r => setTimeout(r, 2500));

const doc = await cdp(ws, n++, 'DOM.getDocument', { depth: -1 });
const q = await cdp(ws, n++, 'DOM.querySelector',
  { nodeId: doc.result.root.nodeId, selector });
const nodeId = q.result && q.result.nodeId;
if (!nodeId) {
  console.log('page     : ' + page + '  (' + theme + ')');
  console.log('selector : ' + selector);
  console.log('RESULT: element not found (does this page render it in this theme?)');
  ws.close(); child.kill();
  process.exit(1);
}

const snapExpr = '(' + function (props, sel) {
  const el = document.querySelector(sel);
  if (!el) return null;
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const out = { __box: Math.round(rect.width) + 'x' + Math.round(rect.height) };
  props.forEach(p => { out[p] = cs.getPropertyValue(p); });
  return out;
}.toString() + ')(' + JSON.stringify(PROPS) + ',' + JSON.stringify(selector) + ')';

const snap = async () => {
  const r = await cdp(ws, n++, 'Runtime.evaluate', { expression: snapExpr, returnByValue: true });
  return r.result && r.result.result ? r.result.result.value : null;
};

const before = await snap();
await cdp(ws, n++, 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] });
await new Promise(r => setTimeout(r, 700));
const after = await snap();
await cdp(ws, n++, 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });

console.log('page     : ' + page + '  (' + theme + ')');
console.log('selector : ' + selector);
console.log('box      : ' + (after && after.__box));
console.log('');

let changed = 0;
for (const p of PROPS) {
  const a = before ? before[p] : '';
  const b = after ? after[p] : '';
  const same = a === b;
  if (!same) changed++;
  console.log('  ' + (same ? '=' : '~') + ' ' + p);
  console.log('      resting: ' + String(a).slice(0, 96));
  if (!same) console.log('      hover  : ' + String(b).slice(0, 96));
}
console.log('');
console.log(changed === 0
  ? 'RESULT: hover changes NOTHING (dead hover)'
  : 'RESULT: hover changes ' + changed + ' propert' + (changed === 1 ? 'y' : 'ies'));

ws.close();
child.kill();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* best effort */ }
process.exit(changed === 0 ? 1 : 0);
