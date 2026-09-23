#!/usr/bin/env python3
"""Self-host the two webfonts the site uses.

Fetches the Google Fonts CSS with a modern browser UA (so we get woff2 rather
than ttf), keeps only the Latin subsets, downloads the files into
``src/assets/fonts`` and rewrites the stylesheet to reference them locally.

Run once; the result is committed alongside the site.
"""

from __future__ import annotations

import re
import sys
import urllib.request
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
OUT = SITE / "src" / "assets" / "fonts"

CSS_URL = (
    "https://fonts.googleapis.com/css2"
    "?family=Inter:wght@400..800"
    "&family=JetBrains+Mono:wght@400..600"
    "&display=swap"
)
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

# Latin and Latin-Extended unicode ranges, as emitted by the css2 endpoint.
KEEP_RANGES = ("U+0000-00FF", "U+0100-02BA")


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    css = fetch(CSS_URL).decode("utf-8")

    blocks = re.findall(r"@font-face\s*\{(.*?)\}", css, re.S)
    kept: list[str] = []
    seen: dict[str, str] = {}

    for block in blocks:
        urange = re.search(r"unicode-range:\s*([^;]+);", block)
        if urange and not any(r in urange.group(1) for r in KEEP_RANGES):
            continue

        family = re.search(r"font-family:\s*'([^']+)'", block).group(1)
        weight = re.search(r"font-weight:\s*([^;]+);", block).group(1).strip()
        url = re.search(r"url\((https://[^)]+\.woff2)\)", block)
        if not url:
            continue

        remote = url.group(1)
        if remote not in seen:
            slug = f"{family.lower().replace(' ', '-')}-{weight.replace(' ', '_')}"
            fname = f"{slug}-{len(seen):02d}.woff2"
            (OUT / fname).write_bytes(fetch(remote))
            seen[remote] = fname
            print(f"  {family} {weight} -> {fname}")
        local = seen[remote]

        kept.append(
            "@font-face{"
            f"font-family:'{family}';font-style:normal;font-weight:{weight};"
            "font-display:swap;"
            f"src:url('./{local}') format('woff2');"
            + (f"unicode-range:{urange.group(1).strip()};" if urange else "")
            + "}"
        )

    (OUT / "fonts.css").write_text("\n".join(kept) + "\n", encoding="utf-8")
    total = sum(f.stat().st_size for f in OUT.glob("*.woff2"))
    print(f"Wrote {len(kept)} @font-face rules, {total / 1024:.0f} KB of woff2")
    return 0


if __name__ == "__main__":
    sys.exit(main())
