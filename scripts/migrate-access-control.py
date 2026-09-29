#!/usr/bin/env python3
"""Bring the Access Control family (sidebar group 11) onto one design.

DESIGN.md section "Access Control family" records why. Measured on the rendered
pages before this pass (harness at .tmp-ac-review/, both themes, 2026-09-23):

  dark  admin-user   .admin-cell-user b     #18191C on #2A2C36   contrast 1.27
                     .admin-cell-user small #57534E on #2A2C36   contrast 1.82
  dark  role         .role-permission-count i/span  #57534E/#18191C  1.8 / 1.3
                     role-type sub-label    #667085 (inline in JS)  2.79
                     .role-code-pill        #F5EBDC light chip on a dark row
  dark  ip-whitelist .ipw-control-card p    #57534E on #383A46   1.8
                     .ipw-warning           #FFF7ED band, radius 15px
  both  op-log       Details cell clientWidth 157 vs scrollWidth 396, nowrap +
                     overflow:visible -> text painted over the Result badge
  both  login-log    pager markup corrupted (U+FFFD in place of the chevron
                     icons), so prev/next rendered as literal garbage text

The stylesheet `assets/css/access-control-executive.css` carries the treatment;
this script does the wiring and the three markup/JS repairs CSS cannot do.

Idempotent: every substitution is a no-op once applied.
"""
import io
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LINK = '<link href="assets/css/access-control-executive.css?v=00000000" rel="stylesheet" />'
MARKER = "access-control-executive.css"

PAGES = [
    "menu-permission.html",
    "admin-user.html",
    "role.html",
    "admin-login-log.html",
    "admin-operation-log.html",
    "ip-whitelist-security.html",
]

# The app-wide pager, copied from admin-user.js so the family ends with one.
PAGE_BUTTONS = """  function pageButtons(current,total){
    total=Math.max(1,Number(total)||1); current=Math.max(1,Math.min(Number(current)||1,total));
    const pages=[]; const add=n=>{if(n>=1&&n<=total&&!pages.includes(n))pages.push(n);};
    add(1); for(let n=current-2;n<=current+2;n++) add(n); add(total); pages.sort((a,b)=>a-b);
    let html='';
    html+='<button type="button" class="smart-page first" data-page="1" '+(current<=1?'disabled':'')+' title="First page"><i class="bi bi-chevron-bar-left"></i></button>';
    let prev=0; pages.forEach(n=>{if(prev&&n-prev>1)html+='<span class="smart-page-ellipsis">\\u2026</span>'; html+='<button type="button" class="smart-page '+(n===current?'active':'')+'" data-page="'+n+'" '+(n===current?'aria-current="page"':'')+'>'+n+'</button>'; prev=n;});
    html+='<button type="button" class="smart-page last" data-page="'+total+'" '+(current>=total?'disabled':'')+' title="Last page"><i class="bi bi-chevron-bar-right"></i></button>';
    return html;
  }

"""


def sub1(s, pattern, repl, flags=0):
    out, n = re.subn(pattern, repl, s, count=1, flags=flags)
    return out, n


def edit(path, fn):
    full = os.path.join(ROOT, path)
    s = io.open(full, encoding="utf-8", errors="surrogateescape").read()
    new, notes = fn(s)
    if new != s:
        io.open(full, "w", encoding="utf-8", newline="", errors="surrogateescape").write(new)
    print("%-34s %s" % (path, ", ".join(notes) if notes else "unchanged"))


def page_edits(s):
    """The three edits every family page takes."""
    notes = []

    if "bo-access-control" not in s:
        s, n = sub1(s, r'(<body class="report-body[^"]*)"', lambda m: m.group(1) + ' bo-access-control"')
        notes.append("body marker" if n else "BODY NOT MATCHED")

    if MARKER not in s:
        s, n = sub1(s, r"</head>", lambda m: LINK + "</head>")
        notes.append("link" if n else "HEAD NOT MATCHED")

    if "</link></head>" in s:
        s = s.replace("</link></head>", "</head>")
        notes.append("stray </link>")

    return s, notes


def ipw_edits(s):
    """The input-fill link sat BETWEEN </head> and <body>: the parser moves it
    into the body, so it loaded, but the head stopped owning its own stylesheet
    list part-way through. It is re-stated inside the head, in its original
    position in the cascade (after the charcoal layers), and the family link
    follows it.

    Note for anyone editing this: do NOT simply delete the stray line -- that
    silently drops bo-input-fill.css from the page. It has to be *moved*."""
    stray = '<link href="assets/css/bo-input-fill.css?v=3005315e" rel="stylesheet" />\n<body'
    if stray not in s:
        return s, []
    anchor = '<link href="assets/css/bo-charcoal-primitives.css?v=7b2815b6" rel="stylesheet" />'
    if anchor not in s:
        return s, ["INPUT-FILL ANCHOR NOT MATCHED -- left alone"]
    s = s.replace(stray, "<body")
    s = s.replace(
        anchor,
        anchor + '<link href="assets/css/bo-input-fill.css?v=3005315e" rel="stylesheet" />',
        1,
    )
    return s, ["input-fill link -> inside head"]


def login_log_pager(s):
    """Restore a real pager. The two buttons held U+FFFD where their chevron
    icons should be, so the footer rendered the literal string `?/button>` twice
    and offered no next arrow. Replaced with the family's pager mount point --
    the app-wide `.smart-page` pager, already themed in both modes."""
    if 'id="loginLogPager"' in s:
        return s, []
    s, n = sub1(s, r'<div class="pagination-clean">.*?</div>',
                lambda m: '<div class="pagination-clean" id="loginLogPager"></div>', flags=re.S)
    return s, (["pager -> smart pager mount"] if n else ["PAGER NOT MATCHED"])


def login_log_js(s):
    """Swap the bare prev/page/next for the app-wide pager."""
    notes = []

    if "function pageButtons(" not in s:
        s, n = sub1(s, r"\(function\(\)\{\n", lambda m: m.group(0) + PAGE_BUTTONS)
        if not n:
            s, n = sub1(s, r"\(function\(\)\{", lambda m: m.group(0) + "\n" + PAGE_BUTTONS)
        notes.append("pageButtons helper" if n else "helper NOT MATCHED")
    else:
        notes.append("helper present")

    s, n = sub1(
        s,
        r"document\.getElementById\('loginLogPage'\)\.textContent=page;\s*"
        r"document\.getElementById\('loginLogPrev'\)\.disabled=page<=1;\s*"
        r"document\.getElementById\('loginLogNext'\)\.disabled=page>=pages;",
        lambda m: "document.getElementById('loginLogPager').innerHTML=pageButtons(page,pages);",
    )
    notes.append("pager render" if n else "render present")

    s, n = sub1(
        s,
        r"document\.getElementById\('loginLogPrev'\)\.onclick=\(\)=>\{page--;render\(\);\};\s*"
        r"document\.getElementById\('loginLogNext'\)\.onclick=\(\)=>\{page\+\+;render\(\);\};",
        lambda m: "document.getElementById('loginLogPager').onclick=e=>{const b=e.target.closest('[data-page]');"
                  "if(!b||b.disabled)return;page=Number(b.dataset.page)||1;render();};",
    )
    notes.append("pager clicks" if n else "clicks present")

    return s, notes


def op_log_js(s):
    """Give the clipped Details cell the full sentence on hover. The cell now
    ellipsises (CSS), so the text has to stay reachable."""
    if "title=\"'+detail(x)+'\"" in s:
        return s, []
    s, n = sub1(s, r"<td>'\+detail\(x\)\+'</td>",
                lambda m: "<td title=\"'+detail(x)+'\">'+detail(x)+'</td>")
    return s, (["detail title"] if n else ["DETAILS CELL NOT MATCHED"])


def access_mgmt_js(s):
    """The role type sub-label carried its colour as an inline style -- a cool
    slate (#667085) that measured 2.79 contrast in dark and that no theme could
    correct, because inline beats every selector without !important. It becomes a
    class the stylesheet owns."""
    old = '<small style="display:block;margin-top:4px;color:#667085">'
    n = s.count(old)
    if not n:
        return s, []
    s = s.replace(old, '<small class="role-type-label">')
    return s, ["role-type-label x%d" % n]


def as_page_step(fn):
    """Run a page-specific repair first, then the common page edits."""
    def step(s):
        s, notes = fn(s)
        s, more = page_edits(s)
        return s, notes + more
    return step


LISTING_JS = '<script src="assets/js/access-control-listing.js?v=00000000"></script>'


def footer_optin(card_old, card_new):
    """Opt a listing into the shared family footer (access-control-listing.js).

    Staff Permission and IP Whitelist Security each shipped no footer at all,
    while Admin Management, Admin Login Log and Admin Operation Log each end in
    the same bar: `Show N entries` / `Showing a to b of c` / the `.smart-page`
    pager. The script owns the footer; the page keeps owning its rows."""
    def step(s):
        notes = []
        if card_new not in s:
            if s.count(card_old) != 1:
                return s, ["CARD ANCHOR %d MATCHES" % s.count(card_old)]
            s = s.replace(card_old, card_new, 1)
            notes.append("card opt-in")
        anchor = '<script src="assets/js/bo-account-chip.js?v=1.0.20"></script>'
        if "access-control-listing.js" not in s:
            if s.count(anchor) != 1:
                return s, notes + ["SCRIPT ANCHOR %d MATCHES" % s.count(anchor)]
            s = s.replace(anchor, anchor + "\n" + LISTING_JS, 1)
            notes.append("script")
        return s, notes
    return step


def chain(*fns):
    """Run several page repairs in order, merging their notes."""
    def step(s):
        notes = []
        for fn in fns:
            s, more = fn(s)
            notes += more
        return s, notes
    return step


extras = {
    "ip-whitelist-security.html": chain(
        ipw_edits,
        footer_optin('<div class="table-card"><div class="user-toolbar',
                     '<div class="table-card" data-ac-listing data-ac-pagesize="10"><div class="user-toolbar'),
    ),
    "admin-login-log.html": login_log_pager,
    "role.html": footer_optin('<div class="table-card role-listing-card">',
                              '<div class="table-card role-listing-card" data-ac-listing data-ac-pagesize="10">'),
}

for page in PAGES:
    edit(page, as_page_step(extras[page]) if page in extras else page_edits)

for js, fn in [
    ("assets/js/admin-login-log.js", login_log_js),
    ("assets/js/admin-operation-log.js", op_log_js),
    ("assets/js/access-management.js", access_mgmt_js),
]:
    edit(js, fn)
