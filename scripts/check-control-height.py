#!/usr/bin/env python3
"""Guard the one control height: every panel control is 36px, on every page.

Why this exists: the owner's 2026-10-03 report was "检查所有页面的输入框 没有统一高度 36px". The height
had been drifting for months because three different layers each stated it: the `--bo-filter-height`
token in bo-ui-standard.css (42px), the `--bo-control-height` token in reports.css (42px), and
bo-charcoal-primitives.css's `.rounded-select-btn{height:40px!important}`. A per-page fix could not
hold against any of them, so pages disagreed with each other: measured before the pass, 57 filter-row
controls over 16 pages were on 42px, 18 pages carried a 42px date trigger, and the table footer's
"Show N" sat at 40px on 25 pages, 34px on 5 and 42px on 3 while 49 others showed 36.

WHAT THIS SCRIPT PROTECTS. Four things can break silently, so they are checked here:

  1. `assets/css/bo-control-height.css` states `36px` — for height, min-height and max-height — with
     `!important` on every declaration. Without `!important` the sheet loads, parses, matches and
     changes nothing, because the legacy rules it competes with all declare `!important` and an
     important declaration beats a normal one whatever the specificity.
  2. That sheet contains no complex `:not()` (a `:not()` holding a descendant combinator). Measured:
     `:not(.mad-modal *)` made the engine apply a rule to an element that `Element.matches()` says
     does not match it — the hidden `<select>` inside `.rounded-select-wrap` picked up 36px, which
     draws a second box under the driver. The dialog exclusion is structural (dialogs are appended
     to `document.body`, i.e. outside `.report-main`), never a `:not()`.
  3. Every real page links the sheet, next to `bo-field-standard.css` (immediately before it, so that
     sheet keeps the position its own guard claims).
  4. Neither token has drifted back to 42px in the sheets that own them.

It also reports, without failing, how many rules elsewhere still pin a literal non-36 height on a
panel-family selector. Those are the latent copies of the original bug; treat the number as debt that
may only go down.

Run after touching any control height:

    python scripts/check-control-height.py            # check, print findings
    python scripts/check-control-height.py --debt     # also list the literals elsewhere
    python scripts/check-control-height.py --quiet    # exit code only

Exit code 0 = clean, 1 = findings.
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {".git", "node_modules", "_preview", "_verify", ".interface-design", "scripts",
             "__pycache__"}

SHEET = "assets/css/bo-control-height.css"
# Not pages: an HTML fragment, three redirect stubs with no stylesheets, and the two stubs that
# only carry a JS redirect to their detail page (their content is the detail page's).
NON_PAGES = {"backup_provider.html", "agent-settlement.html", "change-password.html",
             "merchant-profit.html", "bonus-category-title.html", "main-admin-credit.html",
             "main-merchant-credit.html"}

SIBLING_SHEET = "assets/css/bo-field-standard.css"

# The canonical 36px. A panel control is one height in both themes; there is no dark variant.
CANON = "36px"

# Owner of each token, and the value it must hold. The first two are the sources; the third is the
# variant sheet the three pages that load no reports.css use.
TOKENS = {
    "assets/css/bo-ui-standard.css": "--bo-filter-height",
    "assets/css/reports.css": "--bo-control-height",
    "assets/css/reports-dashboard-original.css": "--bo-control-height",
}

HEIGHT_PROPS = ("height", "min-height", "max-height")

# A selector that names a panel control family. Used only for the debt report — these are the rules
# that would re-introduce drift if they are given a literal height.
PANEL_SEL = re.compile(
    r"\.bo-filter-row|\.mad-filters|\.banner-filterbar|\.main-mod-filters|\.entries-control"
    r"|\.table-footer|\.mad-footer|\.main-mod-footer|\.provider-footer|\.mre-page-size-label"
    r"|\.bo-pagination-standard|\.standard-pagination|\.mad-page-size-control|\.pagination-clean"
    r"|\.bo-range-trigger|\.ref-range-trigger", re.I)
NUMBERED_HEIGHT = re.compile(r"^\s*(\d+(?:\.\d+)?)px\s*(!important)?\s*$", re.I)

COMPLEX_NOT = re.compile(r":not\([^)]*\s[^)]*\)")


def strip_comments(text):
    out, i, n = [], 0, len(text)
    while i < n:
        if text.startswith("/*", i):
            j = text.find("*/", i + 2)
            i = n if j < 0 else j + 2
            continue
        out.append(text[i])
        i += 1
    return "".join(out)


def iter_rules(text):
    """Yield (selector, body, offset) for every style rule, @media bodies included."""
    i, n = 0, len(text)
    while i < n:
        brace = text.find("{", i)
        if brace < 0:
            return
        sel = text[i:brace].strip()
        depth, j = 1, brace + 1
        while j < n and depth:
            if text[j] == "{":
                depth += 1
            elif text[j] == "}":
                depth -= 1
            j += 1
        body = text[brace + 1:j - 1]
        if sel.startswith("@") and "{" in body:
            for sub in iter_rules(body):
                yield sub
        elif sel and not sel.startswith("@"):
            yield sel, body, i
        i = j


def declarations(body):
    for part in body.split(";"):
        if ":" not in part:
            continue
        prop, _, val = part.partition(":")
        prop, val = prop.strip().lower(), val.strip()
        if prop and not prop.startswith("--") and not prop.startswith("/*"):
            yield prop, val


# --- invariant checks -------------------------------------------------------------------------
def check_sheet():
    problems = []
    path = os.path.join(ROOT, SHEET)
    if not os.path.exists(path):
        return ["%s is missing" % SHEET]
    css = io.open(path, encoding="utf-8", errors="replace").read()
    stripped = strip_comments(css)

    for m in COMPLEX_NOT.finditer(stripped):
        problems.append("%s: a complex :not() is not safe to match against — measured, the engine "
                        "applies it to elements Element.matches() rejects (%s)" % (SHEET, m.group(0)))

    seen = 0
    for sel, body, off in iter_rules(stripped):
        line = stripped.count("\n", 0, off) + 1
        for prop, val in declarations(body):
            if "!important" not in val.lower():
                problems.append("%s:%d  %s: %s has no !important (the sheet then loads, matches "
                                "and changes nothing)" % (SHEET, line, prop, val))
            if prop in HEIGHT_PROPS:
                seen += 1
                if not val.lower().startswith(CANON):
                    problems.append("%s:%d  %s: %s — the panel control height is %s"
                                    % (SHEET, line, prop, val, CANON))
    if seen == 0:
        problems.append("%s declares no height at all" % SHEET)
    return problems


def check_tokens():
    problems = []
    for rel, token in sorted(TOKENS.items()):
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            problems.append("%s is missing" % rel)
            continue
        css = strip_comments(io.open(path, encoding="utf-8", errors="replace").read())
        found = re.findall(re.escape(token) + r"\s*:\s*([^;}]+)", css)
        if not found:
            problems.append("%s no longer declares %s" % (rel, token))
            continue
        for value in found:
            if value.strip().lower() != CANON:
                problems.append("%s: %s is %s, expected %s" % (rel, token, value.strip(), CANON))
    return problems


def check_pages():
    problems = []
    for name in sorted(os.listdir(ROOT)):
        if not name.endswith(".html") or name.startswith(".") or name.startswith("_") \
                or name in NON_PAGES:
            continue
        text = io.open(os.path.join(ROOT, name), encoding="utf-8", errors="replace").read()
        head_end = text.lower().find("</head>")
        head = text if head_end < 0 else text[:head_end]
        links = re.findall(r"<link\b[^>]*stylesheet[^>]*>", head, re.I)
        mine = [i for i, l in enumerate(links) if SHEET in l]
        sib = [i for i, l in enumerate(links) if SIBLING_SHEET in l]
        if not mine:
            problems.append("%s does not link %s" % (name, SHEET))
        elif sib and mine[-1] > sib[-1]:
            problems.append("%s links %s after %s — that sheet's guard expects to stay closest to "
                            "the end of the head" % (name, SHEET, SIBLING_SHEET))
    return problems


def scan_debt():
    """Rules elsewhere that pin a literal non-36 height on a panel-family selector."""
    findings = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".tmp")]
        for name in sorted(filenames):
            if not name.endswith(".css") or name.startswith("."):
                continue
            rel = os.path.relpath(os.path.join(dirpath, name), ROOT).replace(os.sep, "/")
            if rel == SHEET:
                continue
            css = io.open(os.path.join(dirpath, name), encoding="utf-8", errors="replace").read()
            for sel, body, off in iter_rules(strip_comments(css)):
                if not PANEL_SEL.search(sel):
                    continue
                for prop, val in declarations(body):
                    if prop not in HEIGHT_PROPS:
                        continue
                    m = NUMBERED_HEIGHT.match(val)
                    if not m or m.group(1) == "36":
                        continue
                    findings.append((rel, css.count("\n", 0, off) + 1, sel, prop, val))
    return findings


def main():
    quiet = "--quiet" in sys.argv
    show_debt = "--debt" in sys.argv
    problems = check_sheet() + check_tokens() + check_pages()
    debt = scan_debt()

    if problems:
        print("%d problem(s) with the control height standard:" % len(problems))
        for p in problems[:40]:
            print("  " + p)
        return 1

    if not quiet:
        pages = len([n for n in os.listdir(ROOT)
                     if n.endswith(".html") and not n.startswith(".") and not n.startswith("_")
                     and n not in NON_PAGES])
        print("ok: %s present, %s on every height declaration, no complex :not(), "
              "loaded on %d page(s)" % (SHEET, CANON, pages))
        print("ok: %s" % ", ".join("%s = %s" % (t, CANON) for t in sorted(TOKENS.values())))
        print("ok: %d rule(s) elsewhere pin a literal non-36 height on a panel-family selector "
              "(debt, not a failure; --debt lists them)" % len(debt))
    if show_debt:
        for rel, line, sel, prop, val in debt:
            print("  %s:%d" % (rel, line))
            print("      %s" % sel[:140])
            print("      %s: %s" % (prop, val[:60]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
