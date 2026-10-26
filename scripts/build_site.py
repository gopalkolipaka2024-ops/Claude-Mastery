#!/usr/bin/env python3
"""Wrap src/store.html into a full page for static hosting (GitHub Pages, Netlify).

The artifact preview adds its own <!doctype>/<head>; a real web host needs them in the file.
Writes docs/index.html and docs/catalog.js.

Run:  python3 scripts/build_catalog.py && python3 scripts/build_site.py
"""
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = (ROOT / "src" / "store.html").read_text()
head_end = src.index("</style>") + len("</style>")
head, body = src[:head_end], src[head_end:]
head = re.sub(r'<meta name="claude:[^>]*>\n?', "", head)
page = ("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
        + head + "\n</head>\n<body>\n" + body + "\n</body>\n</html>\n")
out = ROOT / "docs"
out.mkdir(exist_ok=True)
(out / "index.html").write_text(page)
shutil.copy(ROOT / "catalog.js", out / "catalog.js")
if (ROOT / "photos").exists():
    shutil.copytree(ROOT / "photos", out / "photos", dirs_exist_ok=True)
(out / ".nojekyll").write_text("")
print("wrote", out / "index.html")
