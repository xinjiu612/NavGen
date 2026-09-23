# Deploying NavGen to GitHub Pages

The site is a **static build** — GitHub does not run `npm run build` on its own.
A workflow in `.github/workflows/deploy.yml` does it for you on every push.

## One-time setup (the only thing you must click)

After the first push, open the repository and go to:

**Settings → Pages → Build and deployment → Source → `GitHub Actions`**

That is the only setting. Nothing else needs configuring — no branch to pick, no
folder to choose, no token to create. The workflow already has the permissions
it needs (`pages: write`, `id-token: write`).

Once set, the site is published at:

```
https://xinjiu612.github.io/NavGen_web/
```

The first run takes about a minute. Progress is under the **Actions** tab;
the live URL also appears under **Settings → Pages** and in the `deploy` job.

> GitHub Pages is free for **public** repositories. A private repository needs a
> paid plan for Pages — if that is a problem, keep the repo public or host the
> `dist/` folder somewhere else.

## Every update afterwards

```bash
git add -A
git commit -m "update"
git push
```

The push triggers a rebuild and redeploy automatically. You can also re-run it
by hand from **Actions → Build and deploy to GitHub Pages → Run workflow**.

## Why the media is committed

`tools/build_assets.py` transcodes the raw captures, but those live outside this
repository (about 1.6 GB of source video). CI cannot re-run that pipeline, so its
output under `public/` — the transcoded clips, posters and `manifest.json` — is
committed instead. `npm run build` then just copies `public/` into `dist/`.

That means: **if you re-encode media locally, commit `public/media` too**, or the
deployed site will keep serving the old clips.

## Size

Comfortably inside every GitHub limit — no external video host is needed.

| | |
|---|---|
| whole `public/` folder | 58 MB |
| 174 video files | 46 MB total, 272 KB average |
| largest file (`paper.pdf`) | 4.0 MB |
| GitHub limit per file | 100 MB (warning at 50 MB) |
| GitHub Pages site limit | 1 GB |

A first page view transfers roughly 1 MB (fonts, CSS, JS, hero stills); the rest
loads lazily as you scroll.

## Running it locally

```bash
npm install
npm run dev          # http://127.0.0.1:5173, hot reload
npm run build        # static output in dist/
./serve.sh start     # serve the built site in the background on :5299
```

`serve.sh` binds `0.0.0.0`, so the page is also reachable from your phone or
another machine on the same network. See `HOW-TO-OPEN.md` for SSH tunnelling and
systemd auto-start.

## Editing content

- `src/lib/site.js` — title, authors, affiliations, links, and every number
  quoted from the paper.
- `src/components/*.jsx` — one file per section.
- `tools/build_assets.py` — the curated task lists, gallery labels and exclusion
  sets used to regenerate the media.

## Verifying a deploy

```bash
node tools/shoot.mjs https://xinjiu612.github.io/NavGen_web/ _scratch/prod
node tools/check_playback.mjs https://xinjiu612.github.io/NavGen_web/
```

The first captures every section and reports console errors; the second asserts
that every clip in view is actually playing.
