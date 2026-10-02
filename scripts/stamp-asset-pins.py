#!/usr/bin/env python3
"""Stamp every shared asset reference with a hash of the asset's own content.

Why this exists: the `?v=` query is only a browser cache key. Over time the same
stylesheet ended up pinned ten different ways across the pages (bo-charcoal-cms.css:
`1.0.0` on 19 pages, `1.0.1`, `1.0.18`, `1.0.19`, `1.0.2`, `1.0.30`, `1.0.50`,
`1.0.51`, `1.0.54`, `1.0.56` elsewhere), so two pages could be holding two different
vintages of one file and the same component rendered differently on each. A value
derived from the content cannot drift: it changes exactly when the file changes, and
stays identical wherever the file is used.

Run it after editing any asset under assets/ (it is idempotent):

    python scripts/stamp-asset-pins.py            # rewrite every reference
    python scripts/stamp-asset-pins.py --check     # report drift, write nothing
"""

import hashlib
import io
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = re.compile(r'''(["'])assets/((?:css|js)/[\w\-\.]+\.(?:css|js))(\?v=([\w\.\-]+))?''')
SKIP_DIRS = {".git", "node_modules", "_preview", "_verify", ".interface-design", "scripts"}


def git_ignored():
    """Paths .gitignore already excludes, so scratch snapshots (.tmp-*) are not scanned.

    check-asset-pins.js reads the served pages in the repository root; this walker is
    recursive, so it used to reach the local scratch copies too - hundreds of pages that
    are not part of the tree - and reported (and offered to rewrite) drift inside them.
    Git knows which paths are ignored; one `ls-files` beats walking into them.
    """
    try:
        out = subprocess.check_output(
            ["git", "-C", ROOT, "ls-files", "--others", "--ignored", "--exclude-standard", "--directory", "-z"],
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        return set(), set()
    dirs, files = set(), set()
    for raw in out.decode("utf-8", "replace").split("\0"):
        if raw.endswith("/"):
            dirs.add(raw)
        elif raw:
            files.add(raw)
    return dirs, files


def stamp(path):
    """A pin has to mean the same thing on every machine.

    Hashing the file's bytes made it depend on the checkout: this repository is used from Windows
    (CRLF) and from Linux (LF), so the same unchanged file produced two different pins and every
    run on the other platform rewrote the whole tree's pins again. Normalising the line endings
    first makes the value change exactly when the file changes, which is what the module docstring
    promises.
    """
    with open(path, "rb") as fh:
        return hashlib.sha1(fh.read().replace(b"\r\n", b"\n")).hexdigest()[:8]


def main():
    check = "--check" in sys.argv
    stale, missing, touched = {}, set(), 0
    unpinned = {}
    ignored_dirs, ignored_files = git_ignored()
    for dirpath, dirnames, filenames in os.walk(ROOT):
        rel = os.path.relpath(dirpath, ROOT).replace(os.sep, "/")
        prefix = "" if rel == "." else rel + "/"
        dirnames[:] = [
            d for d in dirnames
            if d not in SKIP_DIRS and (prefix + d + "/") not in ignored_dirs
        ]
        for name in filenames:
            # Pages, and the scripts - a script injects sheets and other scripts at runtime
            # with a pin hard-coded in it (auth.js mounts the shell's quicknav sheet,
            # reports.js the translation panel), which is outside every .html file and was
            # therefore never stamped. The reference must start right after a quote, so prose
            # that names a path is not one, and a script naming itself is skipped (its own
            # hash inside the file can never be stable).
            is_script = rel == "assets/js" and name.endswith(".js")
            if not (name.endswith(".html") or is_script) or (prefix + name) in ignored_files:
                continue
            full = os.path.join(dirpath, name)
            relpath = (prefix + name)
            with io.open(full, encoding="utf-8", errors="replace") as fh:
                text = fh.read()

            def _sub(m, relpath=relpath):
                quote, asset, pinned = m.group(1), "assets/" + m.group(2), m.group(4)
                if relpath == asset:
                    return m.group(0)
                target = os.path.join(ROOT, asset.replace("/", os.sep))
                if not os.path.exists(target):
                    missing.add(asset)
                    return m.group(0)
                want = stamp(target)
                if want == pinned:
                    return m.group(0)
                if pinned is None:
                    unpinned[asset] = want
                else:
                    stale[asset] = want
                return "%s%s?v=%s" % (quote, asset, want)

            new = REF.sub(_sub, text)
            if new != text:
                if not check:
                    with io.open(full, "w", encoding="utf-8", newline="") as fh:
                        fh.write(new)
                touched += 1

    if missing:
        print("referenced but missing on disk: %d" % len(missing))
        for asset in sorted(missing):
            print("   ", asset)
    if stale or unpinned:
        print("%s: %d asset(s) out of date%s%s" % ("drift" if check else "restamped", len(stale),
              ", %d with no pin at all" % len(unpinned) if unpinned else "",
              ":" if (stale or unpinned) else ""))
        for asset in sorted(stale):
            print("    %-46s -> %s" % (asset, stale[asset]))
        for asset in sorted(unpinned):
            print("    %-46s -> %s (had no pin)" % (asset, unpinned[asset]))
    print("%s: %d page(s)" % ("would change" if check else "rewritten", touched))
    return 1 if (check and (stale or unpinned)) else 0


if __name__ == "__main__":
    sys.exit(main())
