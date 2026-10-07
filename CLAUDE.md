# SBAB Sales Pulse — project notes for Claude Code

## What this is
A single-page dashboard that tracks monthly D2C sales for Baidyanath (SBAB) and
its sub-brand Goodcare. It shows revenue/units/orders/AOV trends, month-to-month
comparisons, product seasonality, portfolio concentration, and FY targets.

Revenue figures are **taxable value (ex-tax), net of returns**. Brand and
category come from a built-in FG brand master; SKUs not in the master are
labelled "Unmapped/Other".

## How it works (important)
- `dashboard-template.html` is the dashboard source. It began as an interactive
  Claude artifact that read/wrote months to Claude's artifact database.
- `data/months/*.json` holds the real data — one file per month
  (`YYYY-MM.json`), currently Sep 2025 → Aug 2026 (12 months).
- `build.py` bakes every month in `data/months/` into the template and writes
  **`index.html`** — a fully standalone page with no Claude runtime, no login,
  and no database. That's the file you deploy or open.
- The brand master (SKU → name/brand/division map) lives inside the template as
  the `MASTER` object.

So the data lives in `data/months/`, NOT in the HTML. Edit the JSON, rebuild.

## Common tasks
- **Rebuild the dashboard:** `python3 build.py`
- **Preview locally:** `python3 -m http.server 8000` then open
  http://localhost:8000/index.html
- **Add a month:** create `data/months/2026-09.json` with the same shape as the
  others, then `python3 build.py`.
- **Deploy:** host `index.html` on any static host (Netlify, GitHub Pages,
  Cloudflare Pages). It's a single self-contained file.

## Month JSON shape
```json
{
  "label": "September 2026",
  "revenue": 1234567.89,   // taxable value, net of returns
  "units": 4321,
  "orders": 1800,
  "aov": 685.87,
  "note": null,            // optional free-text note for the month
  "products": [
    {"code": 1011312304500020, "name": "ABHAYARISTHA 450 ML (PET)",
     "brand": "Baidyanath", "division": "ASAV ARISHTA",
     "units": 19, "revenue": 3211.34}
  ]
}
```

## Not yet built (ask if you want it)
- A Python parser that turns a raw Shopify export workbook (the one with
  "Sale format" / "Return Format" sheets) into a `data/months/YYYY-MM.json`
  file, so new months can be added without the browser. The parsing logic
  currently lives in `parseWorkbook()` inside `dashboard-template.html`.
- The "Marketing" tab is a placeholder (no Meta/Google Ads data wired in yet).

## Privacy note
`index.html` contains internal SKU-level revenue. If you host it publicly
(Netlify/GitHub Pages free tiers are public), anyone with the link can read it.
