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
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = re.compile(r'(assets/(?:css|js)/[\w\-\.]+\.(?:css|js))\?v=([\w\.\-]+)')
SKIP_DIRS = {".git", "node_modules", "_preview", "_verify", ".interface-design", "scripts"}


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
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if not name.endswith(".html"):
                continue
            full = os.path.join(dirpath, name)
            with io.open(full, encoding="utf-8", errors="replace") as fh:
                text = fh.read()
            new = text
            for asset, pinned in REF.findall(text):
                target = os.path.join(ROOT, asset.replace("/", os.sep))
                if not os.path.exists(target):
                    missing.add(asset)
                    continue
                want = stamp(target)
                if want != pinned:
                    stale[asset] = want
                    new = new.replace("%s?v=%s" % (asset, pinned), "%s?v=%s" % (asset, want))
            if new != text:
                if not check:
                    with io.open(full, "w", encoding="utf-8", newline="") as fh:
                        fh.write(new)
                touched += 1

    if missing:
        print("referenced but missing on disk: %d" % len(missing))
        for asset in sorted(missing):
            print("   ", asset)
    if stale:
        print("%s: %d asset(s) out of date" % ("drift" if check else "restamped", len(stale)))
        for asset in sorted(stale):
            print("    %-46s -> %s" % (asset, stale[asset]))
    print("%s: %d page(s)" % ("would change" if check else "rewritten", touched))
    return 1 if (check and stale) else 0


if __name__ == "__main__":
    sys.exit(main())
