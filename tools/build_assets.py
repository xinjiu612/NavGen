#!/usr/bin/env python3
"""Transcode the raw ICRA-2027 capture media into web-optimised site assets.

Raw material lives outside ``public/`` (roughly 1.6 GB of it).  This script
produces ``public/media/**`` plus ``public/media/manifest.json``, which the
React app reads at runtime.  It is idempotent: an output is skipped when it is
newer than its source, unless ``--force`` is passed.

Usage
-----
    python3 tools/build_assets.py            # incremental
    python3 tools/build_assets.py --force    # rebuild everything
    python3 tools/build_assets.py --only gallery,realworld
"""

from __future__ import annotations

import argparse
import concurrent.futures as futures
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

# --------------------------------------------------------------------------- #
# paths
# --------------------------------------------------------------------------- #

SITE = Path(__file__).resolve().parent.parent


def _find_up(start: Path, marker: str) -> Path:
    """Walk up from ``start`` until a directory containing ``marker`` is found."""
    for p in [start, *start.parents]:
        if (p / marker).exists():
            return p
    raise SystemExit(f"cannot locate a parent containing {marker!r} from {start}")


# The site may live in a sub-directory (v2/, v3/, ...) of the capture folder, so
# resolve the two roots by searching upwards rather than assuming a fixed depth.
WORK = _find_up(SITE, "video/generated_videos")              # .../icra_2027
CAPTURE = _find_up(SITE, "realworld_benchmark_v5")           # .../icra_2027/website

OUT = SITE / "public" / "media"

SRC_REALWORLD = CAPTURE / "html"
SRC_BENCH = CAPTURE / "realworld_benchmark_v5"
SRC_FIGURES = CAPTURE / "icra_2027 (1)" / "figures"
SRC_WAN = WORK / "video" / "generated_videos" / "wan"
SRC_DIV = WORK / "video" / "generated_videos" / "diversified"
SRC_DIV2 = WORK / "video" / "generated_videos" / "diversified_2"
SRC_METHOD_DIV = WORK / "figure" / "method_diversification"
SRC_WORDCLOUD = WORK / "figure" / "data_analysis" / "cap3d_objects_wordcloud.png"
SRC_PAPER = WORK / "submit" / "icra.pdf"
SRC_TEASER_ALT = WORK / "figure" / "toutu" / "teaser_bottom5.png"

# --------------------------------------------------------------------------- #
# encoding profiles
# --------------------------------------------------------------------------- #

# ``speed`` retimes the clip (PTS/n) and ``out_fps`` resamples it, because the
# policy rollouts were written at 5 FPS and play back far too slowly on a page.
PROFILES = {
    # name          crf  preset  max_w  poster_at  speed  out_fps
    # The autoregressive rollouts are 97 frames (19.4 s) and the bidirectional
    # generations 57 frames (11.4 s). Every tile is cut to the first 57 frames
    # and retimed 2x, so all six cover the same span of flight and land on the
    # same 5.7 s — otherwise the AR column would be showing more flight time.
    "compare":     dict(crf=32, preset="slow", max_w=640, poster_at=0.60,
                        speed=2.0, out_fps=15, max_frames=57),
    "compare_bi":  dict(crf=30, preset="slow", max_w=640, poster_at=0.55,
                        speed=2.0, out_fps=15, max_frames=57),
    "realworld":   dict(crf=29, preset="slow", max_w=640, poster_at=0.20, speed=1.0, out_fps=None),
    # Every gallery clip is a push-in, so the poster is taken late: that is
    # where the subject named in the label is largest and most legible.
    "gallery":     dict(crf=29, preset="slow", max_w=640, poster_at=0.80, speed=2.5, out_fps=16),
    "diversify":   dict(crf=28, preset="slow", max_w=640, poster_at=0.35, speed=1.0, out_fps=None),
}

# --------------------------------------------------------------------------- #
# hand-curated metadata
# --------------------------------------------------------------------------- #

# 300K common-task episodes generated with Wan2.2 14B T2V.
# scene/label read off a contact sheet of frame 16 of every clip.
# One entry per generated episode. Each clip is a push-in on a single subject,
# so the label is the name of that subject rather than a description of the
# scene — that is also what the captioner was asked to write about.
WAN_LABELS: dict[str, tuple[str, str]] = {
    "vln_100162": ("outdoor", "Red post box"),
    "vln_106200": ("outdoor", "Grey building"),
    "vln_111724": ("indoor",  "Pink hat"),
    "vln_118105": ("outdoor", "Beige apartment building"),
    "vln_118288": ("outdoor", "Swimming pool"),
    "vln_129367": ("outdoor", "Brick building"),
    "vln_161597": ("outdoor", "Blue house"),
    "vln_162148": ("indoor",  "Staircase"),
    "vln_167624": ("indoor",  "3D-printed models"),
    "vln_168580": ("outdoor", "Bird"),
    "vln_173390": ("outdoor", "White truck"),
    "vln_174164": ("outdoor", "Apartment complex"),
    "vln_183231": ("indoor",  "Spiral staircase"),
    "vln_189159": ("indoor",  "Model ship"),
    "vln_192030": ("outdoor", "Rooftop pool"),
    "vln_198761": ("outdoor", "White apartment building"),
    "vln_210264": ("outdoor", "White building"),
    "vln_220817": ("outdoor", "Stadium"),
    "vln_225762": ("indoor",  "Shoebox"),
    "vln_229621": ("indoor",  "Flower"),
    "vln_238744": ("indoor",  "Goldfish model"),
    "vln_240640": ("outdoor", "Green bowl"),
    "vln_262035": ("indoor",  "Purple truck"),
    "vln_263611": ("outdoor", "Model plane"),
    "vln_271085": ("indoor",  "Wooden box"),
    "vln_276000": ("outdoor", "Yellow taxi"),
    "vln_284894": ("indoor",  "Christmas tree"),
    "vln_306348": ("outdoor", "Windmill"),
    "vln_307112": ("outdoor", "White apartment towers"),
    "vln_313588": ("outdoor", "Brick apartment building"),
    "vln_349969": ("outdoor", "White house"),
    "vln_350191": ("outdoor", "Playground"),
    "vln_357054": ("outdoor", "Blue kiosk"),
    "vln_391700": ("indoor",  "Roast chicken"),
    "vln_47650":  ("outdoor", "Grey apartment tower"),
    "vln_60483":  ("outdoor", "Modern building"),
    "vln_64694":  ("outdoor", "Stone ruins"),
    "vln_71334":  ("outdoor", "Rooftop pool"),
    "vln_73430":  ("outdoor", "Red car"),
    "vln_89738":  ("indoor",  "Green bird figurine"),
}

# Real-world zero-shot deployment flights (DJI Osmo Action 5 Pro onboard).
# ``label`` matches the subtitle burned into each recording.
REALWORLD = [
    ("black_box",           "indoor",  "Orbit around the black box"),
    ("black_car",           "outdoor", "Fly to the black car"),
    ("down_ground",         "outdoor", "Fly down to the ground"),
    ("down_parking_lot",    "outdoor", "Fly down to the underground parking lot"),
    ("fire_hydrant",        "outdoor", "Move to the red fire hydrant"),
    ("green_fan",           "outdoor", "Move to the green fan"),
    ("mirror",              "indoor",  "Move to the mirror"),
    ("mountain",            "indoor",  "Move to the grey mountain"),
    ("move_outdoors",       "indoor",  "Move to the outdoors"),
    ("orbit_mountain",      "indoor",  "Orbit around the grey mountain"),
    ("pass_gate",           "outdoor", "Pass through the circular frame"),
    ("qr_code",             "indoor",  "Fly to the QR code"),
    ("tree",                "indoor",  "Move to the tree"),
    ("under_parking_lot_2", "outdoor", "Move to the underground parking lot"),
    ("yellow_doll",         "outdoor", "Fly to the yellow doll"),
    ("yellow_traffic",      "outdoor", "Fly to the yellow traffic cone"),
]

COMPARE_METHODS = [
    # key, label, highlight, kind ("bucket" = {17f,97f} rollout dirs, "bi" = stitched chunks)
    ("ours_bi",   "Ours (BI)",  True,  "bi"),
    ("ours_ar",   "Ours (AR)",  True,  "bucket"),
    ("uavflow",   "UAV-Flow",   False, "bucket"),
    ("indooruav", "IndoorUAV",  False, "bucket"),
    ("openfly",   "OpenFly",    False, "bucket"),
    ("traveluav", "TravelUAV",  False, "bucket"),
]

# Tasks kept after reviewing both rollouts frame by frame: every one of these
# reaches its target cleanly under the autoregressive *and* the bidirectional
# policy, so neither column of the comparison is a cherry-pick against us.
COMPARE_TASKS: list[tuple[str, str, str]] = [
    ("0000", "indoor",  "Fly to the grey refrigerator"),
    ("0003", "indoor",  "Fly to the standing fan"),
    ("0006", "indoor",  "Fly to the white column"),
    ("0016", "indoor",  "Fly to the window"),
    ("0018", "indoor",  "Fly to the glass door"),
    ("0020", "outdoor", "Fly to the recycling bins"),
    ("0024", "outdoor", "Fly to the grey electric car"),
    ("0027", "outdoor", "Fly to the white SUV"),
    ("0030", "outdoor", "Fly to the traffic cones"),
    ("0036", "outdoor", "Fly to the black SUV"),
    ("0049", "outdoor", "Fly to the underground garage entrance"),
    ("0050", "outdoor", "Fly to the red truck"),
    ("0056", "outdoor", "Fly to the white bus"),
    ("0058", "outdoor", "Fly to the green bus"),
    ("0060", "outdoor", "Fly to the reflecting pool"),
]

# The BI run numbers its folders independently of the rollout task index, so the
# two are aligned on the source image timestamp.
STAMP_RE = re.compile(r"(IPS_\d{4}-\d{2}-\d{2}\.\d{2}\.\d{2}\.\d{2})$")

# Clips dropped after frame-by-frame review: an intruding person or hand that
# deforms the target, a target that vanishes mid-clip, one that opens inverted
# after a 180-degree roll and reads as a glitch, and a fantasy floating island
# that undercuts the realism claim the gallery is making.
GALLERY_EXCLUDE = {
    "vln_274069",  # legs walk in and the easel disappears
    "vln_326433",  # a hand enters and deforms the mat
    "vln_251560",  # opens inverted after a 180-degree roll
    "vln_128241",  # fantasy floating island
    "vln_302493",  # banana hallucination
    "vln_313886",  # rooftop dome hallucination
    "vln_297483",  # aerial view of a small building
    "vln_46811",   # roundabout with a blue house
    "vln_354369",  # industrial scaffolding interior
    "vln_336442",  # pink truck on a city street
}

# Captions for the style-diversification demo groups.
DIVERSIFY_LABELS = {
    "vln_0001": "Long-tail clip A",
    "vln_0012": "Long-tail clip B",
    "vln_0019_v2": "Long-tail clip C",
}

# Figures copied from the paper, keyed by the slug the React app imports.
# Only the figures v2 actually renders: the pipeline teaser, the dataset
# statistics panel, the diversification ablation and the waypoint decoder.
# Everything else is either redrawn natively on the page or no longer shown.
FIGURES = {
    "teaser": "toutu_v5.jpg",
}

# --------------------------------------------------------------------------- #
# small helpers
# --------------------------------------------------------------------------- #

def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL,
                   stderr=subprocess.PIPE)


def ffprobe(src: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,nb_frames,duration",
         "-of", "json", str(src)],
        check=True, capture_output=True, text=True).stdout
    st = json.loads(out)["streams"][0]
    return {
        "w": int(st["width"]),
        "h": int(st["height"]),
        "frames": int(st.get("nb_frames") or 0),
        "duration": float(st.get("duration") or 0.0),
    }


def fresh(dst: Path, src: Path, force: bool) -> bool:
    """True when ``dst`` can be reused."""
    return (not force) and dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime


def encode_video(src: Path, dst: Path, profile: str, force: bool) -> int:
    p = PROFILES[profile]
    if fresh(dst, src, force):
        return dst.stat().st_size
    dst.parent.mkdir(parents=True, exist_ok=True)

    filters = []
    max_frames = p.get("max_frames")
    if max_frames:
        filters.append(f"trim=end_frame={max_frames}")
    speed = p.get("speed") or 1.0
    filters.append(f"setpts=(PTS-STARTPTS)/{speed}" if speed != 1.0 else "setpts=PTS-STARTPTS")
    filters.append(f"scale='min({p['max_w']},iw)':-2:flags=lanczos")
    if p.get("out_fps"):
        filters.append(f"fps={p['out_fps']}")

    run(["ffmpeg", "-v", "error", "-y", "-i", str(src),
         "-vf", ",".join(filters),
         "-c:v", "libx264", "-crf", str(p["crf"]), "-preset", p["preset"],
         "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0",
         "-movflags", "+faststart", "-an",
         "-loglevel", "error", str(dst)])
    return dst.stat().st_size


def encode_poster(src: Path, dst: Path, profile: str, force: bool) -> int:
    p = PROFILES[profile]
    if fresh(dst, src, force):
        return dst.stat().st_size
    dst.parent.mkdir(parents=True, exist_ok=True)
    info = ffprobe(src)
    at = max(0.0, info["duration"] * p["poster_at"])
    run(["ffmpeg", "-v", "error", "-y", "-ss", f"{at:.3f}", "-i", str(src),
         "-frames:v", "1",
         "-vf", f"scale='min({p['max_w']},iw)':-2:flags=lanczos",
         "-c:v", "libwebp", "-quality", "82", "-compression_level", "6",
         "-loglevel", "error", str(dst)])
    return dst.stat().st_size


def encode_image(src: Path, dst: Path, max_w: int, quality: int = 88,
                 force: bool = False) -> int:
    if fresh(dst, src, force):
        return dst.stat().st_size
    dst.parent.mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-v", "error", "-y", "-i", str(src),
         "-vf", f"scale='min({max_w},iw)':-2:flags=lanczos",
         "-c:v", "libwebp", "-quality", str(quality),
         "-compression_level", "6", "-loglevel", "error", str(dst)])
    return dst.stat().st_size


def webpify(src: Path, dst: Path, max_w: int, quality: int = 88,
            force: bool = False) -> int:
    """Like encode_image but skips silently when the source is missing."""
    if not src.exists():
        print(f"  !! missing source: {src}")
        return 0
    return encode_image(src, dst, max_w, quality, force)


def key_white(src: Path, dst: Path, max_w: int, quality: int = 88,
              force: bool = False, threshold: int = 232, feather: int = 26) -> int:
    """Turn a near-white figure backdrop into alpha.

    Paper figures are drawn on white, which reads as a bright slab on a dark
    page. Keying the backdrop out lets the artwork sit directly on the site
    background while every saturated element survives untouched.
    """
    if not src.exists():
        print(f"  !! missing source: {src}")
        return 0
    if fresh(dst, src, force):
        return dst.stat().st_size

    from PIL import Image, ImageChops

    dst.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert('RGBA')
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)

    r, g, b, _ = im.split()
    # A white backdrop has every channel high, so the darkest channel is the
    # safest discriminator: saturated text keeps at least one low channel.
    darkest = ImageChops.darker(ImageChops.darker(r, g), b)
    lo = max(0, threshold - feather)
    alpha = darkest.point(
        lambda v: 0 if v >= threshold else (255 if v <= lo else int(255 * (threshold - v) / feather))
    )
    im.putalpha(alpha)
    im.save(dst, 'WEBP', quality=quality, method=6)
    return dst.stat().st_size


def figure_dark(src: Path, dst: Path, max_w: int, quality: int = 90,
                force: bool = False, threshold: int = 232, feather: int = 26,
                text_lum: int = 140, text_sat: int = 48,
                text_color: tuple[int, int, int] = (198, 208, 226)) -> int:
    """Dark-mode treatment for a matplotlib figure.

    Two passes: neutral dark pixels (axis text, ticks, thin rules) are lifted to
    a light grey so they stay readable, then the white canvas is keyed out.
    Saturated pixels — the bars, slices and lines that carry the data — are left
    exactly as published.
    """
    if not src.exists():
        print(f"  !! missing source: {src}")
        return 0
    if fresh(dst, src, force):
        return dst.stat().st_size

    from PIL import Image, ImageChops

    dst.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert('RGBA')
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)

    r, g, b, _ = im.split()
    lightest = ImageChops.lighter(ImageChops.lighter(r, g), b)
    darkest = ImageChops.darker(ImageChops.darker(r, g), b)
    saturation = ImageChops.subtract(lightest, darkest)
    luminance = im.convert('L')

    is_dark = luminance.point(lambda v: 255 if v < text_lum else 0)
    is_neutral = saturation.point(lambda v: 255 if v < text_sat else 0)
    lift_mask = ImageChops.darker(is_dark, is_neutral)

    rgb = Image.composite(
        Image.new('RGB', im.size, text_color), im.convert('RGB'), lift_mask
    )

    lo = max(0, threshold - feather)
    alpha = darkest.point(
        lambda v: 0 if v >= threshold else (255 if v <= lo else int(255 * (threshold - v) / feather))
    )
    out = rgb.convert('RGBA')
    out.putalpha(alpha)
    out.save(dst, 'WEBP', quality=quality, method=6)
    return dst.stat().st_size


# --------------------------------------------------------------------------- #
# scaling-curve data (mirrors figure/datasets_benchmark/plot_scaling_full_steps.py)
# --------------------------------------------------------------------------- #

SCALING_RAW = {
    "IndoorUAV": {
        "steps":  [100, 300, 500, 700, 1000, 1500, 2000],
        "epochs": [0.093, 0.279, 0.464, 0.650, 0.929, 1.393, 1.858],
        "score":  [1.125, 1.703, 1.609, 1.453, 1.656, 1.406, 1.516],
    },
    "OpenFly": {
        "steps":  [100, 300, 500, 700, 1000, 2000, 3000, 4000],
        "epochs": [0.032, 0.096, 0.160, 0.224, 0.319, 0.639, 0.958, 1.277],
        "score":  [1.047, 1.375, 1.141, 1.391, 1.359, 1.297, 1.172, 1.391],
    },
    "Ours(ar)": {
        "steps":  [100, 300, 500, 700, 1000, 5000, 10000, 14000, 20000],
        "epochs": [0.006, 0.017, 0.029, 0.040, 0.057, 0.286, 0.573, 0.802, 1.145],
        "score":  [1.625, 1.641, 1.750, 1.844, 1.828, 2.031, 2.109, 1.969, 2.078],
    },
    "Ours(bi)": {
        "steps":  [416, 1000, 17000, 35000, 52000],
        "epochs": [0.006, 0.014, 0.243, 0.501, 0.744],
        "score":  [0.610, 0.703, 0.812, 0.800, 0.804],
    },
    "TravelUAV": {
        "steps":  [100, 300, 500, 700, 1000, 2000],
        "epochs": [0.208, 0.625, 1.041, 1.458, 2.082, 4.165],
        "score":  [1.062, 1.281, 0.797, 1.047, 0.312, 0.766],
    },
    "UAVFlow": {
        "steps":  [100, 300, 500, 700, 1000, 2000, 3000, 4000, 5000],
        "epochs": [0.124, 0.373, 0.622, 0.870, 1.243, 2.486, 3.730, 4.973, 6.217],
        "score":  [0.531, 0.875, 0.844, 0.891, 0.766, 1.406, 1.578, 1.312, 1.453],
    },
}

SCALING_STYLE = {
    "IndoorUAV": dict(color="#4f8ff7", marker="circle",   label="IndoorUAV"),
    "OpenFly":   dict(color="#3fbf6f", marker="square",   label="OpenFly"),
    "Ours(ar)":  dict(color="#e0559f", marker="diamond",  label="Ours (AR)"),
    "Ours(bi)":  dict(color="#f0453f", marker="triangle", label="Ours (BI)"),
    "TravelUAV": dict(color="#f0a878", marker="triangleUp", label="TravelUAV"),
    "UAVFlow":   dict(color="#9b8ce0", marker="plus",     label="UAV-Flow"),
}


def build_scaling() -> dict:
    samples_per_step = 32
    series = []
    for name, data in SCALING_RAW.items():
        keep = ([i for i, e in enumerate(data["epochs"]) if e <= 1.0]
                if name == "Ours(ar)" else list(range(len(data["steps"]))))

        if name == "Ours(bi)":
            scale = 400_000 / data["steps"][-1]
            samples = [int(data["steps"][i] * scale) for i in keep]
            samples[-1] = 400_000
            progress = [data["score"][i] for i in keep]
        else:
            samples = [data["steps"][i] * samples_per_step for i in keep]
            samples[-1] = 400_000
            progress = [data["score"][i] / 3.0 for i in keep]

        epochs = [data["epochs"][i] for i in keep]
        if samples[0] > 1000:
            samples = [1000] + samples
            progress = [progress[0]] + progress
            epochs = [epochs[0]] + epochs

        one_epoch = min(range(len(epochs)), key=lambda i: abs(epochs[i] - 1.0))
        series.append({
            **SCALING_STYLE[name],
            "key": name,
            "samples": samples,
            "progress": progress,
            "epochs": epochs,
            "oneEpochIndex": one_epoch,
            "highlight": name.startswith("Ours"),
        })
    return {"series": series}


# --------------------------------------------------------------------------- #
# section builders
# --------------------------------------------------------------------------- #

@dataclass
class Job:
    fn: object
    args: tuple
    label: str = ""


@dataclass
class Builder:
    force: bool
    only: set[str]
    jobs: list[Job] = field(default_factory=list)
    sizes: dict[str, int] = field(default_factory=dict)

    def want(self, section: str) -> bool:
        return not self.only or section in self.only

    def add(self, section: str, fn, *args, label: str = "") -> None:
        if self.want(section):
            self.jobs.append(Job(fn, args, label or section))


def section_realworld(b: Builder) -> list[dict]:
    items = []
    for slug, scene, label in REALWORLD:
        src = SRC_REALWORLD / f"{slug}.mp4"
        if not src.exists():
            print(f"  !! missing real-world clip: {src}")
            continue
        info = ffprobe(src)
        vid = OUT / "realworld" / f"{slug}.mp4"
        pos = OUT / "realworld" / f"{slug}.webp"
        b.add("realworld", encode_video, src, vid, "realworld", b.force)
        b.add("realworld", encode_poster, src, pos, "realworld", b.force)
        items.append({
            "id": slug,
            "label": label,
            "scene": scene,
            "video": f"realworld/{slug}.mp4",
            "poster": f"realworld/{slug}.webp",
            "duration": round(info["duration"], 2),
            "frames": info["frames"],
            "aspect": round(info["w"] / info["h"], 4),
        })
    items.sort(key=lambda d: (-d["duration"], d["id"]))
    return items


def section_gallery(b: Builder) -> list[dict]:
    items = []
    for src in sorted(SRC_WAN.glob("*.mp4")):
        vid_id = src.stem
        if vid_id in GALLERY_EXCLUDE:
            continue
        scene, label = WAN_LABELS.get(vid_id, ("outdoor", vid_id))
        vid = OUT / "gallery" / f"{vid_id}.mp4"
        pos = OUT / "gallery" / f"{vid_id}.webp"
        b.add("gallery", encode_video, src, vid, "gallery", b.force)
        b.add("gallery", encode_poster, src, pos, "gallery", b.force)
        items.append({
            "id": vid_id,
            "label": label,
            "scene": scene,
            "video": f"gallery/{vid_id}.mp4",
            "poster": f"gallery/{vid_id}.webp",
            "source": "Wan2.2 14B T2V",
        })
    return items


def section_diversify(b: Builder) -> list[dict]:
    """Reference long-tail clip + its Qwen-Image-Edit / LTX style variants."""
    sets: list[tuple[str, Path, str]] = []

    if SRC_METHOD_DIV.exists():
        for ref in sorted(SRC_METHOD_DIV.glob("vln_*.mp4")):
            if "__style_" in ref.name:
                continue
            sets.append((ref.stem, ref, SRC_METHOD_DIV))
    for folder, suffix in ((SRC_DIV, ""), (SRC_DIV2, "_v2")):
        if not folder.exists():
            continue
        for ref in sorted(folder.glob("vln_*.mp4")):
            if "__style_" in ref.name:
                continue
            sets.append((f"{ref.stem}{suffix}", ref, folder))

    groups = []
    for gid, ref, folder in sets:
        base = ref.stem
        styles = []
        for style_src in sorted(folder.glob(f"{base}__style_*.mp4")):
            sid = style_src.stem.split("__style_")[-1]
            out_dir = OUT / "diversify" / gid
            vid = out_dir / f"style_{sid}.mp4"
            pos = out_dir / f"style_{sid}.webp"
            b.add("diversify", encode_video, style_src, vid, "diversify", b.force)
            b.add("diversify", encode_poster, style_src, pos, "diversify", b.force)

            edit_src = style_src.with_suffix(".png")
            edit_rel = None
            if edit_src.exists():
                edit_out = out_dir / f"style_{sid}_edit.webp"
                b.add("diversify", encode_image, edit_src, edit_out, 512, 86, b.force)
                edit_rel = f"diversify/{gid}/style_{sid}_edit.webp"

            styles.append({
                "id": sid,
                "video": f"diversify/{gid}/style_{sid}.mp4",
                "poster": f"diversify/{gid}/style_{sid}.webp",
                "edit": edit_rel,
            })
        if not styles:
            continue

        ref_dir = OUT / "diversify" / gid
        ref_vid = ref_dir / "reference.mp4"
        ref_pos = ref_dir / "reference.webp"
        b.add("diversify", encode_video, ref, ref_vid, "diversify", b.force)
        b.add("diversify", encode_poster, ref, ref_pos, "diversify", b.force)

        groups.append({
            "id": gid,
            "label": DIVERSIFY_LABELS.get(gid, gid),
            "reference": {
                "video": f"diversify/{gid}/reference.mp4",
                "poster": f"diversify/{gid}/reference.webp",
            },
            "styles": styles,
        })
    return groups


def _only_step(root: Path) -> Path | None:
    """The single step-*/ directory under a method folder, if any."""
    if not root.is_dir():
        return None
    steps = [p for p in root.iterdir() if p.is_dir() and p.name.startswith("step")]
    return sorted(steps)[-1] if steps else None


def _ar_manifest() -> dict[int, dict]:
    root = _only_step(SRC_BENCH / "ours_ar")
    return {it["index"]: it for it in json.loads((root / "97f" / "seed0" / "manifest.json").read_text())}


def _bi_by_index() -> dict[int, Path]:
    """Map rollout task index -> stitched bidirectional clip."""
    by_stamp = {}
    for idx, item in _ar_manifest().items():
        m = STAMP_RE.search(Path(item["source"]).stem)
        if m:
            by_stamp[m.group(1)] = idx

    out: dict[int, Path] = {}
    root = _only_step(SRC_BENCH / "ours_bi")
    if root is None:
        return out
    for folder in sorted(p for p in root.iterdir() if p.is_dir()):
        m = STAMP_RE.search(folder.name)
        if not m or m.group(1) not in by_stamp:
            continue
        video = next(iter(folder.glob("*_long_2chunks.mp4")), None)
        if video:
            out[by_stamp[m.group(1)]] = video
    return out


def section_compare(b: Builder) -> dict:
    """Six tiles per task: five datasets trained policies plus our bidirectional run."""
    manifest = _ar_manifest()
    bi = _bi_by_index()

    rows = []
    for tid, scene, label in COMPARE_TASKS:
        idx = int(tid)
        if idx not in bi:
            print(f"  !! compare task {tid} has no bidirectional clip")
            continue
        rows.append({
            "id": tid,
            "scene": scene,
            "label": label,
            "prompt": manifest.get(idx, {}).get("prompt", ""),
        })

    methods = []
    for key, label, highlight, kind in COMPARE_METHODS:
        step = _only_step(SRC_BENCH / key)
        if step is None:
            print(f"  !! compare method {key} has no step-* directory")
            continue
        profile = "compare_bi" if kind == "bi" else "compare"
        for row in rows:
            src = bi[int(row["id"])] if kind == "bi" else step / "97f" / "seed0" / f"{row['id']}.mp4"
            if not src.exists():
                print(f"  !! missing {key}/{row['id']}")
                continue
            dst_dir = OUT / "compare" / key
            b.add("compare", encode_video, src, dst_dir / f"{row['id']}.mp4", profile, b.force)
            b.add("compare", encode_poster, src, dst_dir / f"{row['id']}.webp", profile, b.force)
        methods.append({
            "key": key,
            "label": label,
            "highlight": highlight,
            "video": f"compare/{key}/{{task}}.mp4",
            "poster": f"compare/{key}/{{task}}.webp",
        })

    return {
        "methods": methods,
        "tasks": rows,
        "clipCount": len(rows) * len(methods),
        "note": "long-horizon rollouts, all retimed to the same duration",
    }



DARK_FIGURES: set[str] = set()


def section_figures(b: Builder) -> dict:
    out = {}
    for slug, fname in FIGURES.items():
        out[slug] = f"figures/{slug}.webp"
        fn = figure_dark if slug in DARK_FIGURES else webpify
        b.add("figures", fn, SRC_FIGURES / fname,
              OUT / "figures" / f"{slug}.webp", 2200, 90, b.force)
    out["wordcloud"] = "figures/wordcloud.webp"
    b.add("figures", key_white, SRC_WORDCLOUD,
          OUT / "figures" / "wordcloud.webp", 1500, 90, b.force)
    return out


def section_hero(b: Builder, gallery: list[dict], realworld: list[dict]) -> list[str]:
    """A handful of stills used for the animated hero data-wall."""
    picks: list[tuple[Path, str]] = []

    # Spread picks across the gallery so the wall mixes indoor and outdoor.
    step = max(1, len(gallery) // 16)
    for item in gallery[::step][:16]:
        picks.append((SRC_WAN / f"{item['id']}.mp4", item["id"]))
    for item in realworld[:8]:
        picks.append((SRC_REALWORLD / f"{item['id']}.mp4", f"rw_{item['id']}"))

    rel = []
    for src, tag in picks:
        dst = OUT / "hero" / f"{tag}.webp"
        b.add("hero", _hero_frame, src, dst, 460, b.force)
        rel.append(f"hero/{tag}.webp")
    return rel


def _hero_frame(src: Path, dst: Path, max_w: int, force: bool) -> int:
    if fresh(dst, src, force):
        return dst.stat().st_size
    dst.parent.mkdir(parents=True, exist_ok=True)
    info = ffprobe(src)
    at = max(0.0, info["duration"] * 0.5)
    run(["ffmpeg", "-v", "error", "-y", "-ss", f"{at:.3f}", "-i", str(src),
         "-frames:v", "1", "-vf", f"scale={max_w}:-2:flags=lanczos",
         "-c:v", "libwebp", "-quality", "68", "-compression_level", "6",
         "-loglevel", "error", str(dst)])
    return dst.stat().st_size


def section_paper(b: Builder) -> str | None:
    """The PDF is a committed asset — it gets replaced by hand, not generated.

    A copy is pulled from SRC_PAPER only when the published file is missing, so
    an ordinary pipeline run can never revert a newer upload. `--force` still
    refreshes it from the source.
    """
    dst = SITE / "public" / "paper.pdf"
    if dst.exists() and not b.force:
        return "paper.pdf"
    if not SRC_PAPER.exists():
        print(f"  !! no paper.pdf, and no fallback source at {SRC_PAPER}")
        return None
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SRC_PAPER, dst)
    return "paper.pdf"


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--force", action="store_true",
                    help="rebuild outputs even when they are already fresh")
    ap.add_argument("--only", default="",
                    help="comma-separated sections: realworld,gallery,diversify,"
                         "compare,figures,hero,paper")
    ap.add_argument("--jobs", type=int, default=min(8, (os.cpu_count() or 4)))
    args = ap.parse_args()

    only = {s.strip() for s in args.only.split(",") if s.strip()}
    b = Builder(force=args.force, only=only)

    print("Scanning sources ...")
    # Metadata is always computed (it is cheap) so the manifest stays complete
    # even on a partial rebuild.
    realworld = section_realworld(b)
    gallery = section_gallery(b)
    diversify = section_diversify(b)
    compare = section_compare(b)
    figures = section_figures(b)
    hero = section_hero(b, gallery, realworld)
    paper = section_paper(b)

    print(f"Encoding {len(b.jobs)} assets with {args.jobs} workers ...")
    done = 0
    with futures.ThreadPoolExecutor(max_workers=args.jobs) as pool:
        pending = {pool.submit(j.fn, *j.args): j for j in b.jobs}
        for fut in futures.as_completed(pending):
            job = pending[fut]
            done += 1
            try:
                fut.result()
            except subprocess.CalledProcessError as exc:
                err = (exc.stderr or b"").decode(errors="replace").strip()
                print(f"  !! {job.label} failed: {err[:300]}")
            if done % 50 == 0 or done == len(b.jobs):
                print(f"  {done}/{len(b.jobs)}")

    manifest = {
        "title": "Visual Generative Models as a Scalable Data Engine "
                 "for Embodied 3D Navigation",
        "hero": hero,
        "figures": figures,
        "paper": paper,
        "gallery": gallery,
        "realworld": realworld,
        "diversify": diversify,
        "compare": compare,
        "scaling": build_scaling(),
        "stats": {
            "episodes": 400_000,
            "commonEpisodes": 300_000,
            "longTailEpisodes": 100_000,
            "longTailSource": 10_000,
            "vendi": 47.6,
            "vendiBaseline": 16.8,
            "vendiRatio": 2.8,
            "fdClip": 0.806,
            "fdClipReal": 0.691,
            "successRate": 75,
            "fps": 47,
            "speedup": 244.4,
            "latencyOriginal": 171.568,
            "latencyFinal": 0.702,
        },
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")

    total = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
    counts = {
        "realworld": len(realworld),
        "gallery": len(gallery),
        "diversify": sum(1 + len(g["styles"]) for g in diversify),
        "compare clips": compare["clipCount"],
        "hero frames": len(hero),
    }
    print("\nBuilt sections:", ", ".join(f"{k}={v}" for k, v in counts.items()))
    print(f"public/media total: {total / 1e6:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
