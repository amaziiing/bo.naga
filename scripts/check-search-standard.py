#!/usr/bin/env python3
"""Guard the one search control: the markup uses a known frame, and the sheets know every frame.

Why this exists: the search field drifted once already, and the drift was invisible because
nothing measured it. Eleven different wrappers were authored by different hands (`.mad-search`,
`.mp-search`, `.category-search-control`, `.banner-search`, ...), and each new one had to be added
by hand to the long `:not(...)` exclusion lists that the generic input themes in reports.css /
bo-charcoal-legacy.css / bo-ui-standard.css use to leave bespoke components alone.
`.bo-search-control` - the site-wide standard defined in bo-input-fill.css - was the newest name and
was never added, so on every page that loads reports.css the generic theme out-specified the
standard and painted a second border and fill INSIDE the control's own frame. On admin-user.html
the owner saw it as "怪怪的".

The rule the checks below enforce, and the state measured on 51 pages / 62 controls:

  * the frame carries `bo-search-control`, or a legacy frame name that reports.css already
    normalises to the same shape (`.mad-search`, `.mp-search`, ... - all 62 currently satisfy one
    of these), and that frame owns the magnifier as a DIRECT CHILD;
  * every frame name that appears in the markup is named in the exclusion lists of all four
    sheets, so no generic input theme can paint inside it.

The second point is the one that rots: a new bespoke wrapper that nobody wired into the lists
renders a box inside a box and nothing says so. This script says so.

Run after touching any search control or any of the four sheets:

    python scripts/check-search-standard.py            # check, print findings
    python scripts/check-search-standard.py --quiet     # exit code only

Exit code 0 = clean, 1 = findings.
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {'.git', 'node_modules', '_preview', '_verify', '.interface-design', 'scripts',
             '__pycache__'}
# The tree also carries untracked scratch: dot-directories such as `.tmp-ac-before/` hold
# pre-change snapshots of the pages, and checking those reports drift that no longer exists.
SHEETS = ['assets/css/reports.css', 'assets/css/bo-charcoal-legacy.css',
          'assets/css/bo-ui-standard.css', 'assets/css/bo-input-fill.css',
          'assets/css/bo-field-standard.css']
CANONICAL = 'bo-search-control'
CLAUSE = re.compile(r':not\(\.[a-z0-9-]+ input\)')
INPUT = re.compile(r'<input\b[^>]*>', re.I)
TAG = re.compile(r'<(/?)([a-zA-Z0-9]+)\b[^>]*?(/?)>')
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source',
        'track', 'wbr'}
# A search box that is deliberately NOT a listing search: the Layout editor's find-in-page bar
# (28px toolbar control with a Ctrl+Ctrl hint, documented in DESIGN.md).
EXEMPT_FILES = {'layout-section.html'}


def is_search_field(tag):
    if re.search(r'type\s*=\s*["\']search["\']', tag, re.I):
        return True
    m = re.search(r'placeholder\s*=\s*["\']([^"\']*)["\']', tag, re.I)
    return bool(m and re.search(r'search|搜索', m.group(1), re.I))


def enclosing_frame(html, pos):
    """Walk backwards over tags, balancing closes, to find the element holding this input."""
    depth = 0
    opens = list(TAG.finditer(html, 0, pos))
    for m in reversed(opens):
        closing, name, selfclose = m.group(1), m.group(2).lower(), m.group(3)
        if closing:
            depth += 1
        elif name in VOID or selfclose:
            continue
        else:
            if depth == 0:
                return m.group(0)
            depth -= 1
    return ''


def classes_of(open_tag):
    m = re.search(r'class\s*=\s*["\']([^"\']*)["\']', open_tag or '')
    return (m.group(1) if m else '').split()


def strip_css_comments(text):
    return re.sub(r'/\*.*?\*/', '', text, flags=re.S)


def html_files():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith('.')]
        for name in filenames:
            # `.tmp-*` files at the root are untracked scratch snapshots of these same pages
            if name.endswith('.html') and not name.startswith('.tmp-'):
                yield os.path.relpath(os.path.join(dirpath, name), ROOT).replace(os.sep, '/')


def known_frame_names(findings):
    """The frame names the sheets' exclusion lists enumerate, plus the canonical one."""
    known, silent = {CANONICAL}, {}
    for sheet in SHEETS:
        path = os.path.join(ROOT, sheet)
        if not os.path.exists(path):
            findings.append(f'{sheet}: missing')
            continue
        with io.open(path, encoding='utf-8', errors='replace') as fh:
            text = strip_css_comments(fh.read())
        lists = 0
        for m in re.finditer(r'([^{}]+)\{', text):
            sel = m.group(1)
            if len(CLAUSE.findall(sel)) < 2:
                continue
            lists += 1
            known.update(re.findall(r':not\(\.([a-z0-9-]+) input\)', sel))
            if f':not(.{CANONICAL} input)' not in sel:
                silent.setdefault(sheet, []).append(text[:m.start(1)].count('\n') + 1)
    for sheet, lines in silent.items():
        shown = ', '.join(map(str, lines[:6]))
        findings.append(f'{sheet}: {len(lines)} exclusion list(s) do not name `.{CANONICAL} input` '
                        f'(lines {shown}{" ..." if len(lines) > 6 else ""})')
    return known


def main():
    findings = []
    known = known_frame_names(findings)
    frames_used, checked = set(), 0
    for rel in sorted(html_files()):
        if rel in EXEMPT_FILES:
            continue
        with io.open(os.path.join(ROOT, rel), encoding='utf-8', errors='replace') as fh:
            html = fh.read()
        for m in INPUT.finditer(html):
            if not is_search_field(m.group(0)):
                continue
            checked += 1
            frame = enclosing_frame(html, m.start())
            classes = classes_of(frame)
            line = html[:m.start()].count('\n') + 1
            ident = re.search(r'id\s*=\s*["\']([^"\']*)["\']', m.group(0))
            where = f'{rel}:{line} #{ident.group(1) if ident else "(no id)"}'
            frame_names = [c for c in classes if c in known or 'search' in c.lower()]
            frames_used.update(frame_names)
            if not frame_names:
                findings.append(f'MARKUP  {where}\n'
                                f'        no search frame on the input: <{frame or "?"}> '
                                f'class="{ " ".join(classes) }"')
                continue
            if not any(c in known for c in frame_names):
                findings.append(f'MARKUP  {where}\n'
                                f'        frame `.{frame_names[0]}` is not a name the sheets know - '
                                f'add it to the exclusion lists in {", ".join(SHEETS)}')
                continue
            # the frame must own the magnifier as a direct child, not an absolutely positioned overlay
            inner = html[m.end():html.find('</', m.end()) + 400]
            before = html[max(0, m.start() - 300):m.start()]
            if not re.search(r'<i[^>]*class="[^"]*bi-search', before + inner, re.I):
                findings.append(f'MARKUP  {where}\n'
                                f'        frame `.{frame_names[0]}` has no `i.bi-search` child')

    if '--quiet' not in sys.argv:
        print(f'search-standard check: {checked} search control(s) across the tree, '
              f'{len(frames_used)} frame name(s) in use, {len(known)} known to the sheets')
        if findings:
            print(f'\n{len(findings)} finding(s):\n')
            for f in findings:
                print(f'  {f}\n')
        else:
            print('OK - one control, and every list knows it.')
    return 1 if findings else 0


if __name__ == '__main__':
    sys.exit(main())
