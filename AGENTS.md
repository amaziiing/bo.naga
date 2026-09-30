# Git workflow rules

These apply to every agent and every human working in this repository. They exist because
a single push from a stale working copy silently deleted a large amount of merged work
(see `DESIGN.md` → Merchant Detail, and commit `f76f208`).

## Always pull before you push

Fetch and integrate before pushing. Never push a branch that is behind or diverged from
its remote.

```sh
git fetch origin
git rebase origin/main      # on your own branch
```

If the fetch brings in commits you did not have, integrate them first. `main` is protected
by a repository ruleset, so a direct push to it will be rejected — do not try to work
around that.

## Never commit a whole stale tree

Before committing or pushing, look at what your commit would remove:

```sh
git diff --stat origin/main..HEAD
```

If files you did not deliberately change show up as **deleted**, stop. Your working copy is
stale and committing it will revert other people's work. Do not run `git add -A` on a copy
you have not just fetched.

## Never touch someone else's work

Do not delete, rename, force-push, or rewrite another person's branch or commits. If a push
of yours would remove files you never edited, that is a bug in your working copy, not a
cleanup opportunity.

## Work on your own branch, land through a pull request

Commit to a personal branch (e.g. `kunzzit01/dev`) and merge through a PR. `main` requires
a pull request; bypassing the ruleset is disabled.

## The server is a deploy target, not a workstation

Do not edit or commit code on the server. Deploy with:

```sh
git fetch origin && git merge --ff-only origin/main
```

`--ff-only` refuses to invent a merge commit and **fails loudly** if the server has diverged
or has local changes — which is the point. A plain `git pull` on a dirty or diverged server
copy hides exactly the problem this rule exists to catch.

## The guard hook

`scripts/git-hooks/pre-commit` blocks a commit that deletes files still present on
`origin/main` — the exact shape of the `f76f208` incident. Install it in your clone:

```sh
cp scripts/git-hooks/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

Hooks are per-clone and are not transferred by git, so install it after every fresh clone.

A `pre-push` hook for "is my branch behind?" is **not** needed: git already refuses a
non-fast-forward push locally and never invokes the hook for it. Verified empirically. The
hole that mattered was a stale *working tree* producing a valid fast-forward, which is what
the pre-commit guard covers.

## Verify before you claim

After deploying or migrating, confirm the result rather than assuming: check the file that
should now exist, or the value that should now be applied.

## The BO shell (topbar · sidebar · content frame)

`assets/css/bo-shell.css` is the **single source of truth for every layout metric** of the
BO shell. Metrics means: `padding*`, `gap*`, `font-size`, `font-weight`, `line-height`,
`letter-spacing`, `height`, `min-height`, `flex*`. Theme sheets keep colours, backgrounds,
border colours, shadows and custom properties - they do not own layout.

This exists because the same shell was re-declared ~2600 times across the module sheets
(`bo-charcoal-shell.css`, `bo-wallet-transaction-amber.css`, `reports.css`, the
`*-executive.css` family). The same sidebar row therefore sat at a different height on
different pages, and the header inset, the counter row, the counter icon outline, the
counter number line-height, the content frame width and the Logout block each drifted.
Every fix had to be forced through with `!important`. Do not reintroduce that pattern.

### The drift guard

`scripts/check-shell-drift.js` fails on a **new** metric declaration on a shell selector
in any stylesheet other than `bo-shell.css`. It is wired into
`scripts/git-hooks/pre-commit` and runs **first and unconditionally** - put it anywhere
after the deletion check and that check's `[ -z "$deleted" ] && exit 0` silently skips it
(this mistake was made once and caught by testing, not by reading).

`scripts/shell-drift-baseline.json` records the declarations that already existed, so the
guard is enforceable today: only new drift fails. Remove a baseline entry when you remove
its declaration.

    node scripts/check-shell-drift.js                    # check (exit 1 on new drift)
    node scripts/check-shell-drift.js --list             # every current violation
    node scripts/check-shell-drift.js --update-baseline  # re-record the current state

The hook is per-clone (like the deletion guard above):

    cp scripts/git-hooks/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

### Scope: BO pages only

The BO shell applies to the normal backoffice pages. The **Main panel** (`main-*`,
`main_*`, `menu-permission.html`) and the **agent portal** (`agent-*.html`, which uses
`agent-portal.js` and its own profile host) keep their own shells. Do not unify them.

### Adding a BO page

The page needs three lines plus a menu row - the shell is rendered, not copied:

    <link href="assets/css/bo-shell.css?v=N" rel="stylesheet" />          <!-- in <head> -->
    <header class="report-topbar" data-bo-topbar></header>                 <!-- first in <main> -->
    <script src="assets/js/bo-topbar.js?v=1"></script>                    <!-- immediately after it -->

The script must sit **immediately after the header**: `reports.js` and `bo-theme.js` bind
`[data-open-sidebar]` / `#boThemeToggle` at `DOMContentLoaded`, so mounting during parse is
what keeps those bindings working and avoids an empty-header flash.

Title and icon come from the menu row (Menu Management) matched by URL, falling back to
`document.title`. Add a menu row for the page, or pin them on the header:

    data-bo-title / data-bo-icon    pin a title or icon for a page with no menu row
    data-bo-subtitle                optional second line under the title
    data-bo-h1-id                   when page JS uses an id on the h1
    data-bo-title-block-class       when the page wraps the title in its own class
    data-bo-title-row-class         when the title sits in a row beside a status pill
    data-bo-hamb-aria / data-bo-icon-id / data-bo-icon-aria   aria + ids on those slots
    <span data-bo-topbar-title-extra>  a live counter/badge that belongs beside the title
    <span data-bo-topbar-extra>        page-specific buttons inside the right-hand group

**Do not write shell metric CSS in the new page or in its module sheet.** Colours are
fine. The guard will refuse the commit and name the file, selector and property.

### Changing the shell design

Edit `bo-shell.css` once and every adopted page follows - that is the point. Verify by
rendering a sample across themes (a charcoal page, a `bo-wallet-tx` page, and one without
either) and comparing **computed values**, not by eye alone.

### Measuring a shell problem

Measure the element that actually carries the text or the box in question, not its
container. Two real misses in this codebase: a `letter-spacing` that made one page's
sidebar read cramped was set on the label `<span>` (inherited from the open group button's
`-0.01em`) while the row element reported `normal`; and the theme toggle's icon size lives
on `i[data-theme-icon]`, not on the button, whose inherited `font-size` does not matter.

## The SPA layer (bo-spa.js)

`assets/js/bo-spa.js` makes the rail and the module-tab row swap the content frame instead
of reloading the page. It is opt-in per page via `<html data-bo-spa="1">` and only
ever intercepts a link whose destination is listed in the generated
`assets/js/bo-spa-manifest.js`. Everything else - the agent portal, the redirect stubs, the
fragments, the legacy layouts - is left to the browser, which is also the safe direction: a
link that cannot be swapped costs one navigation, never a fetch followed by a reload.

Adding a BO page means running the rollout and regenerating the manifest:

    node scripts/adopt-bo-spa.js --check     # what a page is missing
    node scripts/adopt-bo-spa.js             # stamp it
    node scripts/check-spa-readiness.js --write-manifest
    node scripts/pin-spa.js

### The readiness and pin guards

`scripts/check-spa-readiness.js` tests every page for the markers a smooth swap needs
(`data-bo-spa`, the `.report-content` frame, the first-paint canvas, the head bootstrap and
DCL registry, the static quicknav `<link>`, the router tag at the current pin) and refuses a
built manifest that no longer matches the tree. `scripts/pin-spa.js` refuses a commit whose
pages still request the previous revision of the router or the manifest - a browser that
cached it keeps running it for the whole session, which is indistinguishable from a fix that
did not work.

Both run in `scripts/git-hooks/pre-commit`, unconditionally, before the deletion check's
`exit 0`. A page that is in the shell but genuinely not a swap target belongs in
`scripts/spa-readiness-baseline.json` with a reason; a page without a `.report-content`
frame is left out of the manifest instead.

### Diagnosing a swap that goes wrong

    BO_SPA.report()          # JSON string: every navigation with the ms offset of each phase
    BO_SPA.debug.navlog()    # the same as records
    BO_SPA.debug.canSwap('x.html')   # why a link did not swap (no fetch, no navigation)

Each navigation logs one line per phase (`fetched` / `content` / `scripts` / `ok`). A swap
that wedges writes the phase it was stuck in into the record as the 8s watchdog gives up and
falls back to a full load, so the failure names its own cause. Kill switches:
`localStorage.bo_spa = '0'` or `window.BO_SPA_OFF = true`.
