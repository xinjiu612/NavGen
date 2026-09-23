#!/usr/bin/env python3
"""Build contact sheets for reviewing generated clips.

Each row is one clip: evenly spaced frames, left to right, with the task index
burned in. Rows are grouped into sheets so a whole benchmark split can be judged
for task success and for hallucinated motion at a glance.

    python3 tools/review_sheets.py pair     [--rows 16] [--frames 5]
    python3 tools/review_sheets.py ar       # ours_ar 97f only
    python3 tools/review_sheets.py bi       # ours_bi stitched only
    python3 tools/review_sheets.py gallery  # the T2V corpus

`pair` puts the autoregressive rollout and the bidirectional generation of the
same task side by side, which is how the comparison player reads them.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

SITE = Path(__file__).resolve().parent.parent


def _find_up(start: Path, marker: str) -> Path:
    for p in [start, *start.parents]:
        if (p / marker).exists():
            return p
    raise SystemExit(f"cannot locate a parent containing {marker!r}")


WORK = _find_up(SITE, "video/generated_videos")
CAPTURE = _find_up(SITE, "realworld_benchmark_v5")

BENCH = CAPTURE / "realworld_benchmark_v5"
AR = BENCH / "ours_ar"
BI = BENCH / "ours_bi"
GALLERY = WORK / "video" / "generated_videos" / "wan"

TILE_W = 150
LABEL_W = 110
STAMP = re.compile(r"(IPS_\d{4}-\d{2}-\d{2}\.\d{2}\.\d{2}\.\d{2})$")


def _only_step(root: Path) -> Path:
    steps = [p for p in root.iterdir() if p.is_dir() and p.name.startswith("step")]
    if not steps:
        raise SystemExit(f"no step-* directory under {root}")
    return sorted(steps)[-1]


def _ar_index_by_stamp() -> dict[str, int]:
    root = _only_step(AR) / "97f" / "seed0"
    manifest = json.loads((root / "manifest.json").read_text())
    out = {}
    for item in manifest:
        m = STAMP.search(Path(item["source"]).stem)
        if m:
            out[m.group(1)] = item["index"]
    return out


def ar_tasks() -> list[tuple[str, Path]]:
    root = _only_step(AR) / "97f" / "seed0"
    by_stamp = _ar_index_by_stamp()
    return [(f"{by_stamp[s]:04d}", root / f"{by_stamp[s]:04d}.mp4")
            for s in sorted(by_stamp)]


def bi_tasks() -> list[tuple[str, Path]]:
    """BI folders are numbered independently; align them by the image timestamp."""
    by_stamp = _ar_index_by_stamp()
    out = []
    for folder in sorted(p for p in _only_step(BI).iterdir() if p.is_dir()):
        m = STAMP.search(folder.name)
        if not m or m.group(1) not in by_stamp:
            continue
        video = next(iter(folder.glob("*_long_2chunks.mp4")), None)
        if video:
            out.append((f"{by_stamp[m.group(1)]:04d}", video))
    return sorted(out)


def sources(mode: str):
    if mode == "ar":
        return ar_tasks()
    if mode == "bi":
        return bi_tasks()
    if mode == "gallery":
        return [(p.stem, p) for p in sorted(GALLERY.glob("*.mp4"))]
    raise SystemExit(f"unknown mode {mode}")


def grab(video: Path, n: int, tmp: Path, tag: str, limit: int | None = None) -> list[Path]:
    out = tmp / tag
    out.mkdir(parents=True, exist_ok=True)
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=nb_frames", "-of", "csv=p=0", str(video)],
        capture_output=True, text=True, check=True).stdout.strip()
    total = max(1, int(probe or 1))
    if limit:
        total = min(total, limit)
    idxs = [round(i * (total - 1) / (n - 1)) for i in range(n)] if n > 1 else [0]
    for k, i in enumerate(idxs):
        dst = out / f"{k:02d}.png"
        if dst.exists():
            continue
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", str(video),
             "-vf", f"select='eq(n\\,{i})',scale={TILE_W}:-2",
             "-frames:v", "1", str(dst)],
            check=True, stderr=subprocess.DEVNULL)
    return sorted(out.glob("*.png"))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["pair", "ar", "bi", "gallery"])
    ap.add_argument("--out", default="_scratch/review")
    ap.add_argument("--rows", type=int, default=16)
    ap.add_argument("--frames", type=int, default=5)
    ap.add_argument("--ar-limit", type=int, default=None,
                    help="pair mode: sample the AR rollout only from its first N frames")
    args = ap.parse_args()

    out_dir = SITE / args.out
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.mode == "pair":
        bi = dict(bi_tasks())
        rows = [(tid, ar, bi[tid]) for tid, ar in ar_tasks() if tid in bi]
    else:
        rows = [(label, path, None) for label, path in sources(args.mode)]

    n = args.frames
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        for s in range(0, len(rows), args.rows):
            chunk = rows[s:s + args.rows]
            lim = args.ar_limit if args.mode == "pair" else None
            th = Image.open(grab(chunk[0][1], n, tmp, f"{chunk[0][0]}_a", lim)[0]).height
            cols = n * (2 if args.mode == "pair" else 1)
            sheet = Image.new("RGB", (LABEL_W + TILE_W * cols, th * len(chunk) + 8),
                              (10, 12, 18))
            draw = ImageDraw.Draw(sheet)

            for r, (tid, a, b) in enumerate(chunk):
                y = r * th
                draw.text((8, y + th // 2 - 6), tid, fill=(140, 220, 240))
                for c, f in enumerate(grab(a, n, tmp, f"{tid}_a", lim)):
                    sheet.paste(Image.open(f), (LABEL_W + c * TILE_W, y))
                if b is not None:
                    for c, f in enumerate(grab(b, n, tmp, f"{tid}_b")):
                        sheet.paste(Image.open(f), (LABEL_W + (n + c) * TILE_W, y))

            name = f"{args.mode}_{s // args.rows + 1:02d}.png"
            sheet.save(out_dir / name)
            tail = ""
            if args.mode == "pair":
                tail = "  (left: AR | right: BI)"
                if lim:
                    tail += f"  AR limited to first {lim} frames"
            print(f"  {name}  {sheet.width}x{sheet.height}  rows {s}..{s + len(chunk) - 1}{tail}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
