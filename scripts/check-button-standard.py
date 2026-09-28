#!/usr/bin/env python3
"""Guard the three chrome button roles: Back control, footer Cancel, footer Save.

Why this exists: the same three controls drifted into ~20 owners, and the drift was
invisible because nothing measured it. The sweep that fixed it (2026-09-28, DESIGN.md
-> "One button recipe for the three chrome roles") found the footer ghost's resting
fill shipping in THREE shapes at once, `34 of 35` primary controls carrying a shadow
the spec forbids outright, and one class name -- `.mad-btn-navy` -- rendering solid
navy on three pages and amber on six, decided by source order.

The checks below are the three that are (a) unambiguous in the spec and (b) cheap to
state statically, so a future edit to any family sheet fails loudly instead of quietly
re-introducing a second recipe:

  1. No declaration that paints a PRIMARY role may set a `box-shadow`. `system.md ->
     Primary CTA` says "Do **not** add amber glow, inset highlight, `translateY` lift,
     or any `box-shadow` on Primary". Focus rings drawn with `box-shadow` are exempt:
     they are an affordance, not depth.
  2. No rule may paint `.mad-btn-navy` / `.mad-btn-primary` / `.bo-ui-button-primary`
     with a navy or cyan surface -- "Never restore navy fill as primary".
  3. The RESTING ghost fill of a role class must not use either two-stop form of the
     cream: the undocumented `#FFFCF7 -> #F5EBDC` or the listing `#FFF8EB -> #F3E8D6`,
     which is allowed only for a listing Export. Hover rules are exempt -- the
     reverse-cream hover IS the locked value.
  4. No ghost/secondary role `:hover` may use the amber fill wash (#FFFBEB / #FEF3C7).
     system.md -> Ghost / Export locks the hover to reverse cream with no amber wash; an
     amber wash at (0,5,3) was out-ranking the correct reverse-cream rule at (0,4,1), so
     every create-family Cancel hovered amber.

NOT CHECKED HERE, deliberately: whether a control's hover actually fires. An id-weight
`!important` resting rule out-ranks every hover in the cascade and leaves the control with
a dead hover -- that is how "Create Provider" shipped with no hover at all, because
bo-charcoal-legacy.css's id-level primary restatements pinned the resting gradient above a
best hover of (0,4,1). It cannot be decided from the source: a first cut of this file tried,
and returned 22 findings on a tree whose hovers all work, because whether a hover wins needs
the DOM's cascade. Run the runtime checker instead:

    node scripts/check-button-hover.mjs main-provider-create.html '.mac-footer-actions .mad-btn-navy'

It forces a real :hover through the DevTools protocol and reports the properties that
change; "changes NOTHING" is the failure this file cannot see.

Run after touching any button rule or any family sheet:

    python scripts/check-button-standard.py            # check, print findings
    python scripts/check-button-standard.py --quiet     # exit code only

Exit code 0 = clean, 1 = findings.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS = os.path.join(ROOT, 'assets', 'css')

PRIMARY = ['mad-btn-navy', 'mad-btn-primary', 'mrc-btn-primary', 'mp-btn-save',
           'nm-btn-primary', 'md-btn-primary', 'btn-primary-clean',
           'bo-ui-button-primary', 'settlement-primary-btn']
GHOST = ['mad-btn-ghost', 'md-btn-ghost', 'mrc-btn-ghost', 'mp-btn-ghost',
         'nm-btn-ghost', 'banner-edit-back', 'vle-back-list', 'mrc-back-list',
         'mac-back-section', 'mprr-back', 'main-mod-back', 'template-back']
# `.bo-ui-button-secondary` is deliberately NOT in GHOST: bo-ui-standard.js applies it to any
# button it classifies as secondary, so it lands on components whose hover is their own --
# a livechat inbox row's amber active state was the false positive that proved it.

# Two-stop cream forms that must not be a role's RESTING fill.
BAD_RESTING_FILL = [
    'linear-gradient(180deg,#FFFCF7 0%,#F5EBDC 100%)',
    'linear-gradient(180deg,#FFF8EB 0%,#F3E8D6 100%)',
]
AMBER_WASH = re.compile(r'FFFBEB|FEF3C7', re.I)
NAVY = ['#18191C', 'var(--bo-navy)', '#1B93C0', '#00AEEF', '#1E3A8A', '#18191c']

# A rule that merely EXCLUDES a primary (`:not(.mad-btn-primary)`) does not paint one.
NOT_GROUP = re.compile(r':not\([^)]*\)')
PSEUDO_STATE = re.compile(r':(hover|active|focus|focus-visible|visited)\b', re.I)


def blocks(css):
    """Yield (line, selector, body) for every declaration block."""
    i, n, buf = 0, len(css), []
    while i < n:
        ch = css[i]
        if ch == '{':
            # A leading /* comment */ sits in the same buffer; it is not part of the selector.
            sel = re.sub(r'/\*.*?\*/', '', ''.join(buf), flags=re.S).strip()
            buf = []
            depth, j = 1, i + 1
            while j < n and depth:
                if css[j] == '{':
                    depth += 1
                elif css[j] == '}':
                    depth -= 1
                j += 1
            body = css[i + 1:j - 1]
            if sel.startswith('@') and '{' in body:
                for sub in blocks(body):
                    yield i + 1 + sub[0], sub[1], sub[2]
            elif not sel.startswith('@'):
                yield i + 1, sel, body
            i = j
            continue
        buf.append(ch)
        i += 1


def split_sels(sel):
    """Split a selector list on commas at paren depth 0.

    A naive split breaks `:is([data-access-page="a"],[data-access-page="b"])` into pieces,
    which is how a first cut of the hover-twin check produced findings naming half an
    attribute selector as if it were a selector of its own.
    """
    out, buf, depth = [], [], 0
    for ch in sel:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth = max(0, depth - 1)
        if ch == ',' and depth == 0:
            out.append(''.join(buf).strip())
            buf = []
        else:
            buf.append(ch)
    if ''.join(buf).strip():
        out.append(''.join(buf).strip())
    return [x for x in out if x]


def names(sel, classes, cls_expansion=('primary',)):
    if 'clean-btn' in cls_expansion and re.search(r'\.clean-btn\.primary(?![\w-])', sel):
        return True
    return any(re.search(r'\.' + re.escape(c) + r'(?![\w-])', sel) for c in classes)


def decls(body):
    out = []
    for part in re.split(r';', body):
        if ':' not in part:
            continue
        k, v = part.split(':', 1)
        out.append((k.strip().lower(), ' '.join(v.split())))
    return out


def check():
    findings = []
    for name in sorted(os.listdir(CSS)):
        if not name.endswith('.css'):
            continue
        with open(os.path.join(CSS, name), encoding='utf-8', errors='surrogateescape',
                  newline='') as fh:
            raw = fh.read()
        for start, sel, body in blocks(raw):
            bare = NOT_GROUP.sub('', sel)
            line = raw.count('\n', 0, start) + 1
            prop = dict(decls(body))

            # 1. primary must never carry depth
            if names(bare, PRIMARY) and not PSEUDO_STATE.search(bare):
                shadow = prop.get('box-shadow', '')
                if shadow and shadow.replace(' ', '').lower() not in ('none', 'none!important'):
                    findings.append((
                        'primary carries a box-shadow the spec forbids',
                        '%s:%d' % (name, line), sel, 'box-shadow: ' + shadow[:70]))

            # 2. no navy / cyan primary
            if names(bare, PRIMARY):
                for p in ('background', 'background-color', 'background-image', 'border-color'):
                    v = prop.get(p, '')
                    for bad in NAVY:
                        if bad in v:
                            findings.append((
                                'primary painted with a navy/cyan surface (spec: never)',
                                '%s:%d' % (name, line), sel, '%s: %s' % (p, v[:70])))
                            break

            # 3. resting ghost fill must be the locked three-stop form cream
            if names(bare, GHOST) and not PSEUDO_STATE.search(bare):
                for p in ('background', 'background-image'):
                    v = prop.get(p, '')
                    for bad in BAD_RESTING_FILL:
                        if bad in v.replace(' ', ''):
                            findings.append((
                                'resting ghost fill is a two-stop cream, not the locked '
                                'three-stop #FFFCF7 -> #F5EBDC 55% -> #EDE4D4',
                                '%s:%d' % (name, line), sel, '%s: %s' % (p, v[:70])))


            # 5. ghost hover must not be the amber fill wash
            if names(bare, GHOST) and re.search(r':hover\b', sel):
                blob = ' '.join(prop.get(p, '') for p in
                                ('background', 'background-image', 'border-color'))
                if AMBER_WASH.search(blob):
                    findings.append((
                        'ghost hover is the amber fill wash; the locked hover is reverse '
                        'cream #FFF8EB -> #F3E8D6 with border #E0D0B8 and no amber wash',
                        '%s:%d' % (name, line), sel, blob[:70]))
    return findings


def main():
    quiet = '--quiet' in sys.argv
    findings = check()
    if not quiet:
        print('button standard: %d sheet(s) scanned' % len(
            [f for f in os.listdir(CSS) if f.endswith('.css')]))
        if not findings:
            print('clean - the three chrome roles each have one recipe.')
        for why, where, sel, detail in findings:
            print('\n%s' % why)
            print('  %s' % where)
            print('  %s' % ' '.join(sel.split())[:150])
            print('  %s' % detail)
    return 1 if findings else 0


if __name__ == '__main__':
    sys.exit(main())
