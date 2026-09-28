#!/usr/bin/env python3
"""Guard the one field theme: every text field reads the same in both themes.

Why this exists: the panel's field recipe was stated per-theme in a couple of legacy sheets, but
the rule that actually painted most fields carried NO theme guard. It declared the light values
once and applied them in both themes, and because its selector list carries nine `:not(#...)`
steps it out-specified every properly themed dark rule. The owner saw the result as "Member's
Create User dialog is right, the rest of the site is not" - and the dialog was right because it
lives on index.html, one of the NINE pages that do not load reports.css.

Measured on the real pages with headless Chrome, dark theme, before the fix: 318 fields on a grey
focus border with the light amber ring, and 300+ more keeping the #FFF8EB cream fill on the
#2C2E38 canvas.

WHAT THIS SCRIPT PROTECTS. The rendering is now held up by `assets/css/bo-field-standard.css`, a
last-in-cascade standard that states the recipe for both themes. Four things about it can break
silently, so they are checked here:

  1. the sheet is present, and every real page links it LAST in its head;
  2. the token pairs still hold the canonical values (light #FFF8EB / #DCC9A8 / #18191C /
     #78716C / focus #D97706 + rgba(217,119,6,.14); dark #2A2C36 / rgba(255,255,255,.12) /
     #F5F5F4 / #A1A1AA / focus #F59E0B + rgba(245,158,11,.18));
  3. every declaration still carries `!important`. This is the one that bit during development:
     the sheet loaded, parsed and matched, and changed nothing, because the legacy rules it
     competes with all declare `!important` and an important declaration beats a normal one
     whatever the specificity. A quiet removal of one `!important` is invisible on screen until
     someone looks at a page it used to fix;
  4. the exclusion list still leaves search frames alone - that half is enforced by
     scripts/check-search-standard.py, which now includes this sheet in its SHEETS list.

It also reports, without failing, how many field rules elsewhere still carry no theme guard.
Those are the latent copies of the original bug: harmless while the standard sheet wins, live
again if it is removed. Treat the number as debt that may only go down.

Run after touching any field rule:

    python scripts/check-field-standard.py            # check, print findings
    python scripts/check-field-standard.py --debt     # also list the unguarded rules
    python scripts/check-field-standard.py --quiet    # exit code only

Exit code 0 = clean, 1 = findings.
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {".git", "node_modules", "_preview", "_verify", ".interface-design", "scripts",
             "__pycache__"}

SHEET = "assets/css/bo-field-standard.css"
# Not pages: an HTML fragment, a meta-refresh stub, and two redirect stubs with no stylesheets.
NON_PAGES = {"backup_provider.html", "agent-settlement.html", "change-password.html",
             "merchant-profit.html"}

CANON_TOKENS = {
    "--bo-field-fill": {"light": "#FFF8EB", "dark": "#2A2C36"},
    "--bo-field-border": {"light": "#DCC9A8", "dark": "rgba(255,255,255,.12)"},
    "--bo-field-ink": {"light": "#18191C", "dark": "#F5F5F4"},
    "--bo-field-placeholder": {"light": "#78716C", "dark": "#A1A1AA"},
    "--bo-field-focus-border": {"light": "#D97706", "dark": "#F59E0B"},
    "--bo-field-focus-ring": {"light": "rgba(217,119,6,.14)", "dark": "rgba(245,158,11,.18)"},
}

# --- debt scan (unchanged from the audit that produced it) ------------------------------------
FIELD_SEL = re.compile(
    r"(^|[\s,>+~])(input|select|textarea)\b"
    r"|\.form-control\b|\.form-select\b|\.form-check-input\b"
    r"|\.(mac|mad|ad|pg|vle|mrc|mas|mp|fd|pc|gpc)-field\b|\.field\b", re.I)
FOCUSY = re.compile(r":focus\b|:focus-within\b|:focus-visible\b")
PROPS = ("border-color", "border", "background-color", "background", "color", "box-shadow",
         "outline")
LIGHT_LITERALS = ("#fff8eb", "#f5ebdc", "#f0e4d0", "#ede4d4", "#eadcc8", "#dcc9a8", "#18191c",
                  "#78716c", "#57534e", "rgba(217,119,6", "#d97706", "#b45309", "#e8901a",
                  "rgb(255,248,235)", "rgb(234,220,200)", "rgb(220,201,168)", "rgb(24,25,28)",
                  "rgb(120,113,108)")
DARK_LITERALS = ("#2a2c36", "#383a46", "#f5f5f4", "rgba(245,158,11", "#f59e0b", "#a1a1aa",
                 "rgba(255,255,255,.12)", "rgba(255,255,255,.14)")
THEME_GUARD = re.compile(r'\[data-bo-theme\s*[~|^$*]?=\s*"?(dark|light)"?\]')
VAR_ONLY = re.compile(r"var\(--")


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


def scan_debt():
    findings = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".tmp")]
        for name in sorted(filenames):
            if not name.endswith(".css") or name.startswith("."):
                continue
            path = os.path.join(dirpath, name)
            rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
            if rel == SHEET:
                continue
            with io.open(path, encoding="utf-8", errors="replace") as fh:
                css = fh.read()
            for sel, body, off in iter_rules(strip_comments(css)):
                if not FIELD_SEL.search(sel.lower()) or not FOCUSY.search(sel.lower()):
                    continue
                if THEME_GUARD.search(sel):
                    continue
                decls = []
                for part in body.split(";"):
                    if ":" not in part:
                        continue
                    prop, _, val = part.partition(":")
                    prop, val = prop.strip().lower(), val.strip().lower()
                    if prop in PROPS and not VAR_ONLY.search(val):
                        decls.append((prop, val))
                hit = [(p, v) for p, v in decls
                       for t in (LIGHT_LITERALS + DARK_LITERALS) if t in v]
                if hit:
                    findings.append((rel, css.count("\n", 0, off) + 1, sel, hit[:2]))
    return findings


# --- invariant checks -------------------------------------------------------------------------
def check_sheet():
    problems = []
    path = os.path.join(ROOT, SHEET)
    if not os.path.exists(path):
        return ["%s is missing" % SHEET], None
    with io.open(path, encoding="utf-8", errors="replace") as fh:
        css = fh.read()
    # Tokens.
    for name, want in CANON_TOKENS.items():
        for theme, value in want.items():
            scoped = (css if theme == "light" else css.split('html[data-bo-theme="dark"]')[-1])
            scoped = scoped.split("}")[0] if theme == "dark" else scoped.split("}")[0]
            m = re.search(re.escape(name) + r"\s*:\s*([^;]+);", scoped)
            if not m:
                problems.append("%s: %s not declared" % (SHEET, name))
            elif m.group(1).strip() != value:
                problems.append("%s: %s is %s, expected %s (%s)"
                                % (SHEET, name, m.group(1).strip(), value, theme))
    # !important on every declaration of the FIELD rules. The token blocks are deliberately
    # excluded: a custom property is not a competing declaration, so it must not carry
    # !important (and doing so would make the token un-overridable at the use site).
    plain = []
    for sel, body, off in iter_rules(strip_comments(css)):
        if not re.search(r"\b(input|select|textarea)\b", sel):
            continue
        for part in body.split(";"):
            if ":" not in part:
                continue
            prop, _, val = part.partition(":")
            prop = prop.strip()
            if not prop or prop.startswith("--") or prop.startswith("/*"):
                continue
            if "!important" not in val.lower():
                plain.append("%s:%d  %s: %s"
                             % (SHEET, css.count("\n", 0, off) + 1, prop, val.strip()))
    if plain:
        problems.append("declarations missing !important (the sheet then loads, matches, and "
                        "changes nothing):")
        problems += ["    " + p for p in plain[:6]]
    return problems, css


def check_pages():
    problems = []
    for name in sorted(os.listdir(ROOT)):
        if not name.endswith(".html") or name.startswith(".") or name in NON_PAGES:
            continue
        with io.open(os.path.join(ROOT, name), encoding="utf-8", errors="replace") as fh:
            text = fh.read()
        head_end = text.lower().find("</head>")
        head = text if head_end < 0 else text[:head_end]
        links = re.findall(r"<link\b[^>]*stylesheet[^>]*>", head, re.I)
        have = [i for i, l in enumerate(links) if SHEET in l]
        if not have:
            problems.append("%s does not link %s" % (name, SHEET))
        elif have[-1] != len(links) - 1:
            problems.append("%s links %s but not last (position %d of %d)"
                            % (name, SHEET, have[-1] + 1, len(links)))
    return problems


def main():
    quiet = "--quiet" in sys.argv
    show_debt = "--debt" in sys.argv
    problems, _ = check_sheet()
    problems += check_pages()
    debt = scan_debt()

    if problems:
        print("%d problem(s) with the field standard:" % len(problems))
        for p in problems[:40]:
            print("  " + p)
        return 1

    if not quiet:
        pages = len([n for n in os.listdir(ROOT)
                     if n.endswith(".html") and not n.startswith(".") and n not in NON_PAGES])
        print("ok: %s present, canonical token pair intact, !important on every declaration, "
              "loaded last on %d page(s)" % (SHEET, pages))
        print("ok: %d field rule(s) elsewhere still carry no theme guard (debt, not a failure; "
              "--debt lists them)" % len(debt))
    if show_debt:
        for rel, line, sel, hit in debt:
            print("  %s:%d" % (rel, line))
            print("      %s" % sel[:140])
            for prop, val in hit:
                print("      %s: %s" % (prop, val[:70]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
