/**
 * Layout Section — CodeMirror 6 hosts (HTML / CSS / JS).
 * Requires importmap on the page (see layout-section.html) so all @codemirror/*
 * packages share one @codemirror/state instance.
 *
 * This file is an ES MODULE (top-level import/export), not a classic page script: the router
 * never re-runs it directly, site-customize.js reaches it with `import()`. Wrapping its body
 * in (function(){ ... })() - the shape the classic page scripts need - is a SyntaxError here
 * and the whole editor silently falls back to the plain textareas.
 */

import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
} from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  undo,
  redo,
} from '@codemirror/commands';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import {
  syntaxHighlighting,
  HighlightStyle,
  foldGutter,
  bracketMatching,
  indentOnInput,
  defaultHighlightStyle,
} from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import {
  search,
  searchKeymap,
  highlightSelectionMatches,
  setSearchQuery,
  SearchQuery,
} from '@codemirror/search';
import { lintKeymap } from '@codemirror/lint';

/* The live mount, so a re-entry into the page can tear the previous one down (see mountLayoutCodeEditors). */
let previous = null;

function isDark() {
  return document.documentElement.getAttribute('data-bo-theme') === 'dark';
}

/* The counter is a position readout, not a report: "1/50001" is not information the user can act
   on, and an uncapped list is what made the array itself, the index scan in currentMatchIndex() and
   Next/Prev all grow with the document. Typing one letter into the 830KB CSS pane built 50k objects
   per keystroke (measured, 16.8ms synchronous). The list is capped and the counter says so ("5000+"). */
const MATCH_LIMIT = 5000;

/* Lowercased copy of a document, cached on the Text object it came from. The find bar re-scanned
   every pane on every run, and doc.toString() + toLowerCase() over ~800KB was a measurable slice of
   each of those scans. A Text is immutable and replaced on every edit, so an entry can never be
   stale - which is also why this is a plain Map with a small cap rather than a WeakMap: CodeMirror's
   undo history keeps the old Text objects alive, so a WeakMap would retain one lowercased copy per
   undo step (100 of them by default). Three panes, current revision, six entries is the whole
   working set; overflow just means one more toLowerCase. */
const LOWER_CACHE_MAX = 6;
const lowerTextCache = new Map();
function lowerText(doc) {
  let text = lowerTextCache.get(doc);
  if (text === undefined) {
    text = doc.toString().toLowerCase();
    if (lowerTextCache.size >= LOWER_CACHE_MAX) lowerTextCache.clear();
    lowerTextCache.set(doc, text);
  }
  return text;
}

/** Full-document scan via indexOf — does not depend on viewport DOM. Sets `matches.capped`. */
function collectMatches(state, query, limit) {
  const cap = limit == null ? MATCH_LIMIT : limit;
  const matches = [];
  const needleRaw = query && query.search != null ? String(query.search) : '';
  if (!needleRaw || cap <= 0) return matches;
  const caseSensitive = !!(query && query.caseSensitive);
  const hay = caseSensitive ? state.doc.toString() : lowerText(state.doc);
  const needle = caseSensitive ? needleRaw : needleRaw.toLowerCase();
  if (!needle) return matches;
  let from = 0;
  while (from <= hay.length - needle.length) {
    const at = hay.indexOf(needle, from);
    if (at < 0) break;
    matches.push({ from: at, to: at + needleRaw.length });
    from = at + Math.max(1, needle.length);
    if (matches.length >= cap) {
      /* Truncated - but one more indexOf says whether "capped" is true or the document simply ended
         exactly on the cap, so the counter never claims "+" it cannot back up. */
      matches.capped = hay.indexOf(needle, from) >= 0;
      return matches;
    }
  }
  return matches;
}

function selectMatch(view, match, focusEditor = true) {
  if (!match) return;
  view.dispatch({
    selection: { anchor: match.from, head: match.to },
    effects: EditorView.scrollIntoView(match.from, { y: 'center', x: 'nearest' }),
  });
  if (focusEditor) view.focus();
}

function makeQuery(searchText) {
  return new SearchQuery({
    search: searchText || '',
    caseSensitive: false,
  });
}

const lightHighlight = HighlightStyle.define([
  { tag: t.comment, color: '#57534E', fontStyle: 'italic' },
  { tag: t.keyword, color: '#7F1D1D', fontWeight: '700' },
  { tag: [t.string, t.special(t.string)], color: '#9A3412', fontWeight: '600' },
  { tag: [t.number, t.bool, t.null, t.atom, t.unit], color: '#7C2D12', fontWeight: '600' },
  { tag: [t.tagName, t.angleBracket], color: '#14532D', fontWeight: '700' },
  { tag: [t.attributeName], color: '#78350F', fontWeight: '600' },
  { tag: [t.propertyName, t.definition(t.propertyName)], color: '#1C1917', fontWeight: '700' },
  { tag: [t.className, t.typeName, t.definition(t.className), t.definition(t.typeName)], color: '#9A3412', fontWeight: '700' },
  { tag: [t.variableName, t.name, t.operator, t.punctuation, t.separator, t.bracket], color: '#0C0A09', fontWeight: '600' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#9A3412', fontWeight: '700' },
  { tag: [t.meta, t.modifier], color: '#44403C', fontWeight: '600' },
  { tag: t.color, color: '#9A3412', fontWeight: '600' },
  { tag: t.invalid, color: '#B91C1C', fontWeight: '700' },
]);

const darkHighlight = HighlightStyle.define([
  { tag: t.comment, color: '#A1A1AA', fontStyle: 'italic' },
  { tag: t.keyword, color: '#F87171', fontWeight: '700' },
  { tag: [t.string, t.special(t.string)], color: '#F59E0B' },
  { tag: [t.number, t.bool, t.null], color: '#FBBF24' },
  { tag: [t.tagName, t.angleBracket], color: '#6EE7B7', fontWeight: '700' },
  { tag: [t.attributeName], color: '#FBBF24' },
  { tag: [t.propertyName], color: '#D4D4D8' },
  { tag: [t.className, t.typeName, t.definition(t.className)], color: '#FBBF24', fontWeight: '700' },
  { tag: [t.variableName, t.operator], color: '#F5F5F4' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#FBBF24' },
  { tag: t.meta, color: '#A1A1AA' },
]);

function editorTheme(dark) {
  if (dark) {
    return EditorView.theme({
      '&': {
        height: '100%',
        fontSize: '14px',
        fontWeight: '500',
        backgroundColor: '#2A2C36',
        color: '#F5F5F4',
      },
      '.cm-scroller': {
        fontFamily: 'Consolas, "Cascadia Mono", "SF Mono", ui-monospace, Menlo, Monaco, monospace',
        lineHeight: '1.6',
        fontWeight: '500',
        backgroundColor: '#2A2C36',
      },
      '.cm-content': {
        caretColor: '#F5F5F4',
        padding: '14px 0',
        fontWeight: '500',
        backgroundColor: 'transparent',
      },
      '.cm-line': {
        backgroundColor: 'transparent',
      },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#FBBF24' },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        backgroundColor: 'transparent',
      },
      '.cm-content ::selection': {
        backgroundColor: 'rgba(245,158,11,.24)',
        color: 'inherit',
      },
      '.cm-selectionMatch': {
        backgroundColor: 'transparent',
      },
      '.cm-searchMatch': {
        backgroundColor: 'rgba(245,158,11,.52)',
        borderRadius: '2px',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: 'rgba(245,158,11,.78)',
      },
      '.cm-panels, .cm-panels-top, .cm-panel.cm-search': {
        backgroundColor: '#383A46',
        color: '#F5F5F4',
        borderBottom: '1px solid rgba(255,255,255,.12)',
      },
      '.cm-panel.cm-search input, .cm-panel.cm-search button': {
        backgroundColor: '#2A2C36',
        color: '#F5F5F4',
        border: '1px solid rgba(255,255,255,.14)',
        borderRadius: '6px',
      },
      '.cm-panel.cm-search label': {
        color: '#A1A1AA',
      },
      '.cm-panel.cm-search [name=close]': {
        color: '#F5F5F4',
      },
      '.cm-activeLine': { backgroundColor: 'rgba(245,158,11,.16)' },
      '.cm-gutters': {
        backgroundColor: '#1F2128',
        color: '#A1A1AA',
        border: 'none',
        borderRight: '1px solid rgba(255,255,255,.12)',
        fontWeight: '600',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'rgba(245,158,11,.12)',
        color: '#FBBF24',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        minWidth: '2.6em',
        padding: '0 8px 0 6px',
      },
    }, { dark: true });
  }

  return EditorView.theme({
    '&': {
      height: '100%',
      fontSize: '14px',
      fontWeight: '600',
      backgroundColor: '#FFF8EB',
      color: '#0C0A09',
    },
    '.cm-scroller': {
      fontFamily: 'Consolas, "Cascadia Mono", "SF Mono", ui-monospace, Menlo, Monaco, monospace',
      lineHeight: '1.6',
      fontWeight: '600',
      backgroundColor: '#FFF8EB',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    },
    '.cm-content': {
      caretColor: '#0C0A09',
      padding: '14px 0',
      /* Must stay transparent — selection layer sits under content. */
      backgroundColor: 'transparent',
      color: '#0C0A09',
      fontWeight: '600',
    },
    '.cm-line': {
      fontWeight: '600',
      backgroundColor: 'transparent',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#D97706', borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'transparent',
    },
    '.cm-content ::selection': {
      backgroundColor: 'rgba(217,119,6,.24)',
      color: 'inherit',
    },
    '.cm-selectionMatch': {
      backgroundColor: 'transparent',
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(217,119,6,.46)',
      borderRadius: '2px',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'rgba(217,119,6,.68)',
    },
    '.cm-panels, .cm-panels-top, .cm-panel.cm-search': {
      backgroundColor: '#FFF8EB',
      color: '#18191C',
      borderBottom: '1px solid #EADCC8',
    },
    '.cm-panel.cm-search input, .cm-panel.cm-search button': {
      backgroundColor: '#FFFCF7',
      color: '#18191C',
      border: '1px solid #EADCC8',
      borderRadius: '6px',
    },
    '.cm-panel.cm-search label': {
      color: '#57534E',
    },
    '.cm-panel.cm-search [name=close]': {
      color: '#18191C',
    },
    '.cm-activeLine': { backgroundColor: 'rgba(217,119,6,.13)' },
    '.cm-gutters': {
      backgroundColor: '#FFF8EB',
      color: '#44403C',
      border: 'none',
      borderRight: '1px solid #EADCC8',
      fontWeight: '700',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(217,119,6,.08)',
      color: '#9A3412',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      minWidth: '2.6em',
      padding: '0 8px 0 6px',
    },
  }, { dark: false });
}

function langExtension(lang) {
  if (lang === 'html') return html();
  if (lang === 'css') return css();
  return javascript();
}

function surfaceColors(dark) {
  if (dark) {
    return { editor: '#2A2C36', gutter: '#1F2128' };
  }
  return { editor: '#FFF8EB', gutter: '#FFF8EB' };
}

function paintHostSurface(prep, dark) {
  const { editor } = surfaceColors(dark);
  prep.editorRoot.style.setProperty('background', editor, 'important');
  prep.editorRoot.style.setProperty('background-color', editor, 'important');
  prep.host.style.setProperty('background', editor, 'important');
  prep.host.style.setProperty('background-color', editor, 'important');
}

function prepareHost(textarea) {
  const editorRoot = textarea.closest('.layout-code-editor');
  if (!editorRoot) return null;

  editorRoot.classList.add('is-cm6');
  const lineBox = editorRoot.querySelector('.layout-line-numbers');
  const wrap = editorRoot.querySelector('.layout-code-input-wrap');
  if (lineBox) lineBox.hidden = true;
  if (wrap) wrap.hidden = true;

  let host = editorRoot.querySelector('.layout-cm6-host');
  if (!host) {
    host = document.createElement('div');
    host.className = 'layout-cm6-host';
    host.setAttribute('role', 'presentation');
    editorRoot.appendChild(host);
  }

  textarea.classList.add('layout-cm6-mirror');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.tabIndex = -1;
  textarea.style.setProperty('pointer-events', 'none', 'important');
  textarea.style.setProperty('display', 'none', 'important');
  if (wrap) {
    wrap.style.setProperty('pointer-events', 'none', 'important');
    wrap.style.setProperty('display', 'none', 'important');
  }

  const prep = { editorRoot, host, textarea, lang: editorRoot.dataset.editorLang || 'js' };
  paintHostSurface(prep, isDark());
  return prep;
}

function createView(prep) {
  const dark = isDark();
  const startDoc = prep.textarea.value || '';
  const themeComp = new Compartment();
  const highlightComp = new Compartment();

  const view = new EditorView({
    parent: prep.host,
    state: EditorState.create({
      doc: startDoc,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        dropCursor(),
        history(),
        foldGutter(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        /* Keep search state for match highlight; UI is the persistent toolbar bar. */
        search({ top: true }),
        highlightSelectionMatches({ maxMatches: 500 }),
        keymap.of([
          indentWithTab,
          /* Explicit Ctrl+Z / Ctrl+Shift+Z on every platform. historyKeymap only maps
             Mod-Shift-z to redo on mac (Windows/Linux default to Mod-y instead), so these
             two bindings are declared ahead of historyKeymap to guarantee the requested
             shortcuts regardless of OS. */
          { key: 'Mod-z', run: undo, preventDefault: true },
          { key: 'Mod-Shift-z', run: redo, preventDefault: true },
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap.filter((b) => b.key !== 'Mod-f'),
          ...historyKeymap,
          ...completionKeymap,
          ...lintKeymap,
        ]),
        langExtension(prep.lang),
        themeComp.of(editorTheme(dark)),
        highlightComp.of(syntaxHighlighting(dark ? darkHighlight : lightHighlight)),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          const value = update.state.doc.toString();
          if (prep.textarea.value !== value) {
            prep.textarea.value = value;
            prep.textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }),
      ],
    }),
  });

  view.boThemeComp = themeComp;
  view.boHighlightComp = highlightComp;
  view.boPrep = prep;
  return view;
}

function applyTheme(views) {
  const dark = isDark();
  const theme = editorTheme(dark);
  const highlight = syntaxHighlighting(dark ? darkHighlight : lightHighlight);
  views.forEach((view) => {
    if (view.boPrep) paintHostSurface(view.boPrep, dark);
    view.dispatch({
      effects: [
        view.boThemeComp.reconfigure(theme),
        view.boHighlightComp.reconfigure(highlight),
      ],
    });
  });
}

/**
 * @param {{ html?: HTMLTextAreaElement|null, css?: HTMLTextAreaElement|null, js?: HTMLTextAreaElement|null }} textareas
 */
export function mountLayoutCodeEditors(textareas) {
  /* site-customize.js boots this on every entry - a swap into the page runs its script again -
     and `import()` hands back the same, already-evaluated module. Without this, each entry left
     the previous mount alive: a second theme observer, a second document-level Ctrl+F/F3
     handler, and a second set of live CodeMirror views over the same (now detached) editors.
     Destroying the previous mount keeps exactly one of each. */
  if (previous && typeof previous.destroy === 'function') {
    try { previous.destroy(); } catch (err) { /* a detached previous mount is already inert */ }
  }
  const slots = [
    { key: 'html', el: textareas.html },
    { key: 'css', el: textareas.css },
    { key: 'js', el: textareas.js },
  ].filter((slot) => slot.el);

  const views = {};

  slots.forEach((slot) => {
    const prep = prepareHost(slot.el);
    if (!prep) return;
    views[slot.key] = createView(prep);
  });

  const list = Object.values(views);

  const themeObserver = new MutationObserver(() => applyTheme(list));
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-bo-theme'],
  });

  function viewForEventTarget(target) {
    const node = target && target.nodeType === 1 ? target : target?.parentElement;
    if (!node) return null;
    for (let i = 0; i < list.length; i += 1) {
      if (list[i].dom.contains(node)) return list[i];
    }
    return null;
  }

  let lastFocusedView = views.css || list[0] || null;

  list.forEach((view) => {
    view.dom.addEventListener('focusin', () => {
      lastFocusedView = view;
    });
  });

  function pickSearchView(target) {
    return (
      viewForEventTarget(target)
      || list.find((view) => view.hasFocus)
      || lastFocusedView
      || views.css
      || list[0]
      || null
    );
  }

  const findInput = document.getElementById('layoutFindInput');
  const findCount = document.getElementById('layoutFindCount');
  const findPrev = document.getElementById('layoutFindPrev');
  const findNextBtn = document.getElementById('layoutFindNext');

  /** Stable editor order for cross-pane search: HTML → CSS → JS */
  function orderedViews() {
    return [views.html, views.css, views.js].filter(Boolean);
  }

  /* The counter keeps the three spans the sheet styles (.layout-find-cur / -sep / -tot) and the
     data-empty="1" + :empty contract that hides it. The markup used to be rebuilt with innerHTML on
     every keystroke - a parse and three new elements per key; the spans are built once now and only
     their text changes. `showZero` is the difference between "no query" (hidden) and "0/0", which
     is how a query with no hits is meant to read. */
  let findCountParts = null;
  function setFindCount(current, total, capped, showZero) {
    if (!findCount) return;
    if (!total && !current && !showZero) {
      findCountParts = null;
      findCount.textContent = '';
      findCount.dataset.empty = '1';
      return;
    }
    findCount.dataset.empty = total ? '0' : '1';
    if (!findCountParts) {
      const cur = document.createElement('span');
      cur.className = 'layout-find-cur';
      const sep = document.createElement('span');
      sep.className = 'layout-find-sep';
      sep.textContent = '/';
      const tot = document.createElement('span');
      tot.className = 'layout-find-tot';
      findCount.textContent = '';
      findCount.append(cur, sep, tot);
      findCountParts = { cur, tot };
    }
    findCountParts.cur.textContent = String(current);
    findCountParts.tot.textContent = capped ? `${total}+` : String(total);
  }

  function applyQueryToAll(q) {
    list.forEach((view) => {
      view.dispatch({ effects: setSearchQuery.of(q) });
    });
  }

  /** Collect matches across every editor pane, capped at MATCH_LIMIT overall. */
  function collectAllMatches(q) {
    const out = [];
    if (!q || !q.search) return out;
    const views = orderedViews();
    for (let i = 0; i < views.length; i += 1) {
      const found = collectMatches(views[i].state, q, MATCH_LIMIT - out.length);
      for (let j = 0; j < found.length; j += 1) {
        out.push({ view: views[i], from: found[j].from, to: found[j].to });
      }
      if (found.capped || out.length >= MATCH_LIMIT) {
        out.capped = true;
        break;
      }
    }
    return out;
  }

  /* Which match the bar is currently sitting on, remembered instead of re-derived from the carets.

     Every pane keeps its own selection, and two matches in different panes can share offsets
     ("alpha" at 23-28 in the CSS pane and 6-11 in the JS pane of the harness), so identifying the
     current match by offsets alone resolved to a match in the WRONG pane. Measured on the shipped
     code, typing "alpha" and pressing Next: 1/5 -> 2/5 -> 3/5 -> 4/5 -> 4/5 -> 4/5 -> 4/5, the CSS
     pane's third match shadowing the JS pane's first one, so the fifth match was unreachable and
     Prev from there skipped a match (4/5 -> 2/5). The remembered index is confirmed against the
     match's own pane selection first, so an edit or a section reload between two presses cannot
     leave Next pointing at a match that no longer exists. */
  let findMatchIdx = -1;

  function currentMatchIndex(matches) {
    if (!matches.length) return -1;
    if (findMatchIdx >= 0 && findMatchIdx < matches.length) {
      const m = matches[findMatchIdx];
      const sel = m.view.state.selection.main;
      if (sel.from === m.from && sel.to === m.to) return findMatchIdx;
    }
    for (let i = 0; i < matches.length; i += 1) {
      const m = matches[i];
      const sel = m.view.state.selection.main;
      if (sel.from === m.from && sel.to === m.to) return i;
    }
    /* Nothing of this bar's is selected - the caret moved by hand. Continue from it, in its pane. */
    const focusView = lastFocusedView || pickSearchView(document.activeElement);
    if (focusView) {
      const head = focusView.state.selection.main.from;
      const idx = matches.findIndex((m) => m.view === focusView && m.from >= head);
      if (idx >= 0) return idx;
      const firstInView = matches.findIndex((m) => m.view === focusView);
      if (firstInView >= 0) return firstInView;
    }
    return 0;
  }

  function goToMatch(matches, idx, keepFindFocus) {
    const match = matches[idx];
    if (!match) return;
    findMatchIdx = idx;
    lastFocusedView = match.view;
    selectMatch(match.view, match, !keepFindFocus);
  }

  function refreshFind(jumpToMatch) {
    if (!findInput || !findCount) return [];
    const q = makeQuery(findInput.value);
    applyQueryToAll(q);
    const matches = collectAllMatches(q);
    if (!q.search || !matches.length) {
      findMatchIdx = -1;
      setFindCount(0, 0, false, !!q.search);
      return matches;
    }
    const queryChanged = q.search !== lastFindQuery;
    lastFindQuery = q.search;
    let idx = queryChanged ? 0 : currentMatchIndex(matches);
    if (idx < 0) idx = 0;
    if (jumpToMatch) {
      goToMatch(matches, idx, document.activeElement === findInput);
    }
    setFindCount(idx + 1, matches.length, matches.capped);
    return matches;
  }

  function jumpFind(delta) {
    cancelScheduledFind();
    const q = makeQuery(findInput?.value || '');
    applyQueryToAll(q);
    const matches = collectAllMatches(q);
    if (!matches.length) {
      findMatchIdx = -1;
      setFindCount(0, 0, false, true);
      return;
    }
    /* A query the settled run has not seen yet - typed, then Next pressed inside the settle window -
       has no current match to step from: it starts at the first one, which is where the settled run
       would have put it a moment later. Without this, Next inside that window stepped from whatever
       the PREVIOUS query had selected. */
    let idx = q.search !== lastFindQuery ? 0 : currentMatchIndex(matches);
    lastFindQuery = q.search;
    if (idx < 0) idx = 0;
    else idx = (idx + delta + matches.length) % matches.length;
    goToMatch(matches, idx, document.activeElement === findInput);
    setFindCount(idx + 1, matches.length, matches.capped);
  }

  function focusFindBar() {
    if (!findInput) return false;
    findInput.focus();
    findInput.select();
    return true;
  }

  /* Typing a query must land on the FIRST match. It used to be positioned by currentMatchIndex(), which
     continues from the caret in the last-focused pane - so typing "alpha" with the caret at the end of the
     CSS pane jumped straight to 4/5 and the first three matches could only be reached by wrapping around
     (measured). The caret rule still applies while the query is unchanged: Ctrl+F with the same text, Next,
     Prev and F3 all keep continuing from where the user was. */
  let lastFindQuery = null;

  /* The heavy half of a find - the full-document scan of all three panes, the counter and the jump
     to the first match - is coalesced to one run per typing burst. What it costs, measured with the
     CPU profiler in this repo's headless harness while typing "padding" into the CSS pane:

       CSS 830KB   sync 13.5ms median per keystroke (max 18.9) - collectMatches 3-5ms, and the rest
                   CodeMirror work reached through goToMatch()'s dispatch: readSelectionRange -> eq,
                   then coordsAt/getClientRects under scrollIntoView in the measure pass.
       CSS 73KB    sync  8.7ms median per keystroke (max 13.3) - collectMatches is down to noise, so
                   the CM6 half does not shrink with the document: it is the per-keystroke selection
                   dispatch and the scroll it asks for, not the scan, that makes the bar feel heavy.

     The query itself is still applied on every keystroke: it is a 0.06ms dispatch (measured) and it
     is what makes the matches light up while you type. Only the scan+counter+jump waits for the
     typing to pause, which is also when the user is actually looking at where match 1 landed.

     Measured after, same harness and same page, one session apart: 0.6ms median / 1.0ms max (830KB)
     and 1.0ms / 4.3ms (73KB) on the real page, and in the isolated harness a three-point curve of
     1.0 / 0.4 / 0.4ms median (5KB / 73KB / 830KB) against 2.6 / 2.5 / 5.3ms before, worst keystroke
     10.2ms -> 1.4ms. The counter lands on the same value it always did (1/10, 1/188, 1/857). */
  const FIND_SETTLE_MS = 140;
  let findSettleTimer = 0;

  function cancelScheduledFind() {
    if (findSettleTimer) {
      clearTimeout(findSettleTimer);
      findSettleTimer = 0;
    }
  }

  function scheduleFind() {
    cancelScheduledFind();
    findSettleTimer = setTimeout(() => {
      findSettleTimer = 0;
      refreshFind(true);
    }, FIND_SETTLE_MS);
  }

  findInput?.addEventListener('input', () => {
    lastFindQuery = null;
    const text = findInput.value;
    if (!text) {
      /* Clearing the query is cheap and must read as instant: no matches, counter hidden. */
      cancelScheduledFind();
      refreshFind(false);
      return;
    }
    applyQueryToAll(makeQuery(text));
    scheduleFind();
  });
  findNextBtn?.addEventListener('click', () => jumpFind(1));
  findPrev?.addEventListener('click', () => jumpFind(-1));
  findInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      jumpFind(event.shiftKey ? -1 : 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      findInput.blur();
      (lastFocusedView || pickSearchView(document.activeElement))?.focus();
    }
  });

  /* Ctrl/Cmd+F focuses the persistent search bar (not browser Find). */
  const onDocFind = (event) => {
    const mod = event.ctrlKey || event.metaKey;
    if (!mod || event.altKey) return;
    const key = String(event.key || '').toLowerCase();
    if (key !== 'f') return;
    if (!document.body.classList.contains('layout-section-page')) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    cancelScheduledFind();
    focusFindBar();
    if (findInput && findInput.value) refreshFind(true);
  };
  document.addEventListener('keydown', onDocFind, true);
  window.addEventListener('keydown', onDocFind, true);

  const onDocF3 = (event) => {
    if (event.key !== 'F3') return;
    if (!document.body.classList.contains('layout-section-page')) return;
    event.preventDefault();
    cancelScheduledFind();
    jumpFind(event.shiftKey ? -1 : 1);
  };
  document.addEventListener('keydown', onDocF3, true);

  function get(key) {
    const view = views[key];
    if (view) return view.state.doc.toString();
    const el = textareas[key];
    return el ? el.value || '' : '';
  }

  function set(key, value) {
    const next = value == null ? '' : String(value);
    const view = views[key];
    const el = textareas[key];
    if (el) el.value = next;
    if (!view) return;
    const cur = view.state.doc.toString();
    if (cur === next) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: next },
    });
  }

  const api = {
    getHtml: () => get('html'),
    getCss: () => get('css'),
    getJs: () => get('js'),
    getValues: () => ({ html: get('html'), css: get('css'), js: get('js') }),
    setValues: (data) => {
      set('html', data?.html || '');
      set('css', data?.css || '');
      set('js', data?.js || '');
    },
    setHtml: (v) => set('html', v),
    setCss: (v) => set('css', v),
    setJs: (v) => set('js', v),
    refreshTheme: () => applyTheme(list),
    destroy: () => {
      cancelScheduledFind();
      document.removeEventListener('keydown', onDocFind, true);
      window.removeEventListener('keydown', onDocFind, true);
      document.removeEventListener('keydown', onDocF3, true);
      themeObserver.disconnect();
      list.forEach((view) => view.destroy());
    },
    openFind: () => focusFindBar(),
  };
  previous = api;
  return api;
}

export default mountLayoutCodeEditors;
