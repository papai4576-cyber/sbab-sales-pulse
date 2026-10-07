# SBAB Sales Pulse

A standalone monthly sales dashboard for Baidyanath (SBAB) + Goodcare D2C.
Opens in any browser — no login, no server required.

## Quick start

```bash
# 1. Build the dashboard (bakes data/months/*.json into index.html)
python3 build.py

# 2a. Just open it
#     double-click index.html, or:
#     open index.html        (macOS)   /   start index.html (Windows)

# 2b. Or preview it like a real site
python3 -m http.server 8000
#     then open http://localhost:8000/index.html
```

## What's in here

| Path | What it is |
|------|------------|
| `index.html` | The built, ready-to-share dashboard (run `build.py` to regenerate) |
| `dashboard-template.html` | Dashboard source + brand master |
| `data/months/*.json` | The sales data — one file per month |
| `build.py` | Bakes the data into `index.html` |
| `CLAUDE.md` | Notes for working on this with Claude Code |

## Add a new month
1. Create `data/months/2026-09.json` matching the shape of the existing files
   (see `CLAUDE.md`).
2. Run `python3 build.py`.
3. Re-deploy / re-send `index.html`.

## Deploy (free)
`index.html` is a single file. Upload it to any static host:
- **Netlify Drop** — app.netlify.com/drop (drag the file, instant URL)
- **GitHub Pages** — commit as `index.html`, enable Pages
- **Cloudflare Pages** — connect the repo

⚠️ These free tiers serve the page publicly. It contains internal revenue
figures, so only use public hosting if that's acceptable; otherwise just send
the `index.html` file directly.

## Requirements
Python 3 (standard library only). No pip installs needed.
