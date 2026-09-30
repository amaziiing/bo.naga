/**
 * Layout Section — CodeMirror 6 hosts (HTML / CSS / JS).
 * Requires importmap on the page (see layout-section.html) so all @codemirror/*
 * packages share one @codemirror/state instance.
 */
(function () {

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

function isDark() {
  return document.documentElement.getAttribute('data-bo-theme') === 'dark';
}

/** Full-document scan via indexOf — does not depend on viewport DOM. */
function collectMatches(state, query) {
  const matches = [];
  const needleRaw = query && query.search != null ? String(query.search) : '';
  if (!needleRaw) return matches;
  const caseSensitive = !!(query && query.caseSensitive);
  const hay = caseSensitive ? state.doc.toString() : state.doc.toString().toLowerCase();
  const needle = caseSensitive ? needleRaw : needleRaw.toLowerCase();
  if (!needle) return matches;
  let from = 0;
  while (from <= hay.length - needle.length) {
    const at = hay.indexOf(needle, from);
    if (at < 0) break;
    matches.push({ from: at, to: at + needleRaw.length });
    from = at + Math.max(1, needle.length);
    if (matches.length > 50000) break;
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

  function setFindCount(current, total) {
    if (!findCount) return;
    if (!total && !current) {
      findCount.innerHTML = '';
      findCount.dataset.empty = '1';
      return;
    }
    findCount.dataset.empty = total ? '0' : '1';
    findCount.innerHTML =
      `<span class="layout-find-cur">${current}</span>` +
      `<span class="layout-find-sep">/</span>` +
      `<span class="layout-find-tot">${total}</span>`;
  }

  function applyQueryToAll(q) {
    list.forEach((view) => {
      view.dispatch({ effects: setSearchQuery.of(q) });
    });
  }

  /** Collect matches across every editor pane. */
  function collectAllMatches(q) {
    const out = [];
    if (!q || !q.search) return out;
    orderedViews().forEach((view) => {
      collectMatches(view.state, q).forEach((m) => {
        out.push({ view, from: m.from, to: m.to });
      });
    });
    return out;
  }

  function currentMatchIndex(matches) {
    if (!matches.length) return -1;
    for (let i = 0; i < matches.length; i += 1) {
      const m = matches[i];
      const sel = m.view.state.selection.main;
      if (sel.from === m.from && sel.to === m.to) return i;
      if (sel.from >= m.from && sel.from < m.to) return i;
    }
    /* Prefer continuing from last-focused pane */
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

  function goToMatch(match, keepFindFocus) {
    if (!match) return;
    lastFocusedView = match.view;
    selectMatch(match.view, match, !keepFindFocus);
  }

  function refreshFind(jumpToMatch) {
    if (!findInput || !findCount) return [];
    const q = makeQuery(findInput.value);
    applyQueryToAll(q);
    const matches = collectAllMatches(q);
    if (!q.search) {
      setFindCount(0, 0);
      return matches;
    }
    if (!matches.length) {
      findCount.dataset.empty = '1';
      findCount.innerHTML =
        `<span class="layout-find-cur">0</span>` +
        `<span class="layout-find-sep">/</span>` +
        `<span class="layout-find-tot">0</span>`;
      return matches;
    }
    let idx = currentMatchIndex(matches);
    if (idx < 0) idx = 0;
    if (jumpToMatch) {
      const keepFindFocus = document.activeElement === findInput;
      goToMatch(matches[idx], keepFindFocus);
    }
    setFindCount(idx + 1, matches.length);
    return matches;
  }

  function jumpFind(delta) {
    const q = makeQuery(findInput?.value || '');
    applyQueryToAll(q);
    const matches = collectAllMatches(q);
    if (!matches.length) {
      setFindCount(0, 0);
      findCount.dataset.empty = '1';
      findCount.innerHTML =
        `<span class="layout-find-cur">0</span>` +
        `<span class="layout-find-sep">/</span>` +
        `<span class="layout-find-tot">0</span>`;
      return;
    }
    let idx = currentMatchIndex(matches);
    if (idx < 0) idx = 0;
    else idx = (idx + delta + matches.length) % matches.length;
    goToMatch(matches[idx], document.activeElement === findInput);
    setFindCount(idx + 1, matches.length);
  }

  function focusFindBar() {
    if (!findInput) return false;
    findInput.focus();
    findInput.select();
    return true;
  }

  findInput?.addEventListener('input', () => refreshFind(true));
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
    focusFindBar();
    if (findInput && findInput.value) refreshFind(true);
  };
  document.addEventListener('keydown', onDocFind, true);
  window.addEventListener('keydown', onDocFind, true);

  const onDocF3 = (event) => {
    if (event.key !== 'F3') return;
    if (!document.body.classList.contains('layout-section-page')) return;
    event.preventDefault();
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

  return {
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
      document.removeEventListener('keydown', onDocFind, true);
      window.removeEventListener('keydown', onDocFind, true);
      document.removeEventListener('keydown', onDocF3, true);
      themeObserver.disconnect();
      list.forEach((view) => view.destroy());
    },
    openFind: () => focusFindBar(),
  };
}

export default mountLayoutCodeEditors;
})();
