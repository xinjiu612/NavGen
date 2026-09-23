# Project website — *Visual Generative Models as a Scalable Data Engine for Embodied 3D Navigation*

Vite + React + Tailwind v4 single-page site. Dark, cinematic, and built
entirely from the paper's own figures, generated videos, real-world flight
recordings and benchmark rollouts.

This is **v2**. v1 is preserved untouched in the parent directory; the two are
independent projects with their own `node_modules`, `public/media` and `dist`.

## What changed from v1

- No conference name anywhere on the page, in the BibTeX, or in the metadata.
- Larger section kickers and headings.
- The numbered contributions block under the teaser is gone.
- **Benchmark is six tiles per task**: Ours (BI) and Ours (AR) first, then the
  four baselines trained on other datasets, all rolled out on the same held-out
  real-world task. Source: `realworld_benchmark_v5/`.
- Every tile is **cut to the first 57 frames** — the length of the bidirectional
  generation — and retimed 2x, so all six cover the same span of flight and land
  on the same 5.7 s. Without the cut the autoregressive column would silently be
  showing 70% more flight time than the bidirectional one.
- The fifteen tasks shown were picked by reviewing **both** rollouts frame by
  frame *after* that cut — every one reaches its target cleanly under each, so
  neither Ours column is a cherry-pick against us. Everything flagged during
  review is out: green trash bin, parked sedan, delivery tricycle, brown bus,
  open door and one of the two green-bus tasks, plus a second pass that rejected
  every remaining candidate whose autoregressive rollout drifts or smears.
- Tile captions carry only the model name, and the task picker carries only the
  task description and scene — no frame counts, no chunk counts, no task ids.
- Short-horizon (17-frame) clips are not shown.
- The separate long-horizon block, the VBench table, the evaluation-protocol
  card, the headline card and the ablation card are all gone, along with the
  prose under the scaling chart.
- Dataset analysis is the two native charts only; the summary cards and the
  duplicated paper figures are gone. Stage 03 no longer repeats the motion
  distribution, and stage 05 no longer shows the Pi3 waypoint figure.
- The gallery shows 40 clips with no `vln_*` identifiers and no trailing pill
  row. Ten were dropped after review: two where an intruding person or hand
  deforms the target, one where the target vanishes mid-clip, one that opens
  inverted after a 180° roll, a fantasy floating island, two with hallucinated
  object motion, and four removed on request (aerial view of a small building,
  roundabout with a blue house, industrial scaffolding interior, pink truck on a
  city street).
- Gallery titles name the **single subject each clip pushes in on** — "Pink hat",
  "Swimming pool", "Red post box" — rather than describing the scene. Every
  label was re-derived by watching the clip and identifying what grows.
- Flight cards carry no caption — the issued command is already burned into each
  recording as a subtitle — so only the scene, duration and a long-horizon tag
  sit beneath the clip.
- Overview, gallery, analysis and hero copy trimmed throughout.
- **Fixed:** lazy clips in the pipeline gallery never started. `AutoVideo`
  attached its `src` asynchronously, so the autoplay call could land before
  there was any data and be a silent no-op. Playback now lives inside
  `AutoVideo`, which retries on `loadeddata`/`canplay`.
  `tools/check_playback.mjs` asserts this stays true.

## Quick start

```bash
npm install --cache ../.npm-cache   # the default npm cache may be read-only here
npm run dev                         # http://127.0.0.1:5173
npm run build && npm run preview    # production build + local preview
```

`dist/` is fully self-contained and uses relative asset paths, so it can be
dropped on GitHub Pages, an nginx root, or any static host without further
configuration.

## Layout

```
index.html                 document shell, meta tags, favicon
src/
  App.jsx                  section order + providers
  index.css                design tokens, component classes, keyframes
  lib/
    site.js                authorship, links, and every number quoted from the paper
    media.jsx              manifest loader + mediaUrl()/compareUrls() helpers
    hooks.js               reveal, in-view, count-up, autoplay, copy-to-clipboard
  components/
    Nav.jsx                sticky nav with scroll-spy + mobile drawer
    Hero.jsx               animated "data wall" backdrop, title, authors, stat strip
    Overview.jsx           the three-way trade-off + pipeline teaser
    Pipeline.jsx           interactive 5-stage engine, motion donut, style-diversification demo
    Gallery.jsx            filterable explorer over the common-task corpus
    Analytics.jsx          Vendi / FD-CLIP charts, drawn natively as SVG
    Benchmark.jsx          six-up comparison player + scaling curve
    ComparePlayer.jsx      five models, one task, played in lockstep
    ScalingChart.jsx       interactive log-x scaling curve with hover readout
    RealWorld.jsx          flight gallery + headline numbers
    Citation.jsx           BibTeX block with copy button + footer
    ui.jsx                 Section, Stat, AutoVideo, Lightbox, ZoomImage, FigureCard
tools/
  build_assets.py          transcodes every raw capture into public/media + manifest.json
  fetch_fonts.py           self-hosts Inter and JetBrains Mono (Latin subsets only)
  review_sheets.py         contact sheets for judging clips for success / hallucination
  shoot.mjs                headless-Chrome screenshot pass for visual review
  check_playback.mjs       asserts every in-view clip is actually playing
```

## Assets

The site never touches the raw captures at build time — `tools/build_assets.py`
turns them into `public/media/**` plus a single `manifest.json` that the React
app fetches at runtime. Raw material lives outside `public/` and is git-ignored.
The script locates the capture root by walking up from its own directory, so the
site can live in a sub-folder (`v2/`, `v3/`, …) without any path edits.

```bash
python3 tools/build_assets.py                 # incremental
python3 tools/build_assets.py --force         # rebuild everything
python3 tools/build_assets.py --only gallery  # one section
```

| Section | Source | Output |
|---|---|---|
| `realworld` | `html/*.mp4` — 16 onboard flights | `media/realworld/` |
| `gallery` | `video/generated_videos/wan/*.mp4` | `media/gallery/` |
| `diversify` | `figure/method_diversification/`, `video/generated_videos/diversified{,_2}/` | `media/diversify/` |
| `compare` | `realworld_benchmark_v5/<method>/step-*/97f/seed0/*.mp4` and `ours_bi/step_*/**/*_long_2chunks.mp4` | `media/compare/` |
| `figures` | `icra_2027 (1)/figures/toutu_v5.jpg`, `figure/data_analysis/cap3d_objects_wordcloud.png` | `media/figures/` |
| `hero` | stills sampled from the gallery and real-world clips | `media/hero/` |
| `paper` | `submit/icra.pdf` | `public/paper.pdf` |

Encoding is H.264 CRF 28–32 at 640 px wide, `+faststart`, audio stripped, with a
WebP poster per clip. Everything is lazy: videos carry `preload="none"` and only
attach a `src` once they come within 400 px of the viewport.

The word cloud is drawn on white, which reads as a bright slab on a dark page,
so `key_white()` keys that canvas out to alpha; the teaser keeps its white plate
because there the white is part of the artwork. `figure_dark()` is kept in the
pipeline for chart-style figures (`DARK_FIGURES`, currently empty) — it keys the
canvas out *and* lifts neutral dark ink to a light grey, leaving saturated data
marks exactly as published.

Total: **55 MB** in `public/media`, and roughly **1 MB** for a first paint
(fonts + CSS + JS + the hero stills).

## Editing content

- All prose, statistics and table values come from the paper. `src/lib/site.js`
  is the single place to edit copy; the scaling-curve data is transcribed from
  `figure/datasets_benchmark/plot_scaling_full_steps.py` into
  `build_assets.py::SCALING_RAW`.
- The curated comparison and long-horizon task lists, their short prompts and
  the gallery exclusion set all live at the top of `build_assets.py`.
- The site is **not anonymous** — it carries the full author list, affiliations
  and corresponding-author marks. For a double-blind release, replace
  `AUTHORS`/`AFFILIATIONS` in `src/lib/site.js`.
- `LINKS` in `src/lib/site.js` currently exposes only the paper PDF. Fill in
  `video`, `code`, `dataset` and `weights` when they exist and the buttons appear
  automatically.

## Reviewing clips

```bash
python3 tools/review_sheets.py pair --rows 16 --ar-limit 57   # AR | BI side by side
python3 tools/review_sheets.py ar                # autoregressive rollouts only
python3 tools/review_sheets.py bi                # bidirectional generations only
python3 tools/review_sheets.py gallery --frames 4
node tools/shoot.mjs http://127.0.0.1:5173/ _scratch/shots
node tools/check_playback.mjs http://127.0.0.1:5173/
```

`review_sheets.py` writes contact sheets into `_scratch/review/` so a whole
split can be judged for task success and for hallucinated motion at a glance.
`shoot.mjs` captures every section, each pipeline stage, deeper scroll positions
and a mobile pass with the system Chrome, and reports console errors, failed
requests and page errors. Both write to `_scratch/`, which is git-ignored.
