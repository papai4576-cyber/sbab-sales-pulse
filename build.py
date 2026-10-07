#!/usr/bin/env python3
"""
Build the standalone SBAB Sales Pulse dashboard.

Reads:
  - dashboard-template.html   (the dashboard source)
  - data/months/*.json        (one file per saved month)

Writes:
  - index.html                (self-contained dashboard, ready to open or host)

The template was originally an interactive Claude artifact that saved months
to Claude's artifact database. This script bakes every month in data/months/
directly into the page, so index.html works on any plain web server (or by
just double-clicking it) with no Claude runtime, no login, and no database.

Usage:
    python3 build.py

To add a new month: put its JSON in data/months/ (e.g. 2026-09.json) using the
same shape as the existing files, then run this script again.
"""

import json
import glob
import os

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, "dashboard-template.html")
DATA_DIR = os.path.join(HERE, "data", "months")
OUT = os.path.join(HERE, "index.html")

MONTH_KEYS = ["label", "revenue", "grossRevenue", "units", "orders", "aov", "products", "note"]


def load_months():
    seed = {}
    for path in sorted(glob.glob(os.path.join(DATA_DIR, "*.json"))):
        key = os.path.splitext(os.path.basename(path))[0]
        with open(path, encoding="utf-8") as fh:
            d = json.load(fh)
        seed[key] = {k: d.get(k) for k in MONTH_KEYS}
    return seed


def bake_seed(html, seed):
    seed_js = json.dumps(seed, ensure_ascii=False, separators=(",", ":"))
    lines = html.split("\n")
    hits = 0
    for i, line in enumerate(lines):
        if line.startswith("const SEED_MONTHS ="):
            lines[i] = "const SEED_MONTHS = " + seed_js + ";"
            hits += 1
    if hits != 1:
        raise SystemExit(f"Expected exactly one SEED_MONTHS line, found {hits}")
    return "\n".join(lines)


def patch_csv_download(html):
    """Make the 'Download CSV' button work with a plain-browser download when
    Claude's downloads capability isn't present (i.e. everywhere but Claude)."""
    old = """let downloadsCap = null;
(async () => {
  try { downloadsCap = window.claude?.use ? await window.claude.use("downloads") : null; } catch(e){ downloadsCap = null; }
  document.getElementById('downloadCsvBtn').hidden = !downloadsCap;
})();
document.getElementById('downloadCsvBtn').hidden = true; // hidden until capability check resolves
document.getElementById('downloadCsvBtn').addEventListener('click', async () => {
  if(!downloadsCap) return;
  const rows = window.__VISIBLE_ROWS__ || [];
  const header = ['Product','Brand','Category',`${shortMonthLabel(compareKeyA)} units`,`${shortMonthLabel(compareKeyB)} units`,`${shortMonthLabel(compareKeyA)} revenue`,`${shortMonthLabel(compareKeyB)} revenue`,'Status'];
  const lines = [header.join(',')].concat(rows.map(p => [p.name,p.brand,p.division,p.prev_units,p.cur_units,p.prev_revenue,p.cur_revenue,p.status].map(csvEscape).join(',')));
  try {
    await downloadsCap.save({filename: 'sbab-product-comparison.csv', data: lines.join('\\n')});
  } catch(e){ /* viewer declined or save unavailable — no-op */ }
});"""

    new = """let downloadsCap = null;
(async () => {
  try { downloadsCap = window.claude?.use ? await window.claude.use("downloads") : null; } catch(e){ downloadsCap = null; }
})();
document.getElementById('downloadCsvBtn').hidden = false; // standalone build: always available via browser download
document.getElementById('downloadCsvBtn').addEventListener('click', async () => {
  const rows = window.__VISIBLE_ROWS__ || [];
  const header = ['Product','Brand','Category',`${shortMonthLabel(compareKeyA)} units`,`${shortMonthLabel(compareKeyB)} units`,`${shortMonthLabel(compareKeyA)} revenue`,`${shortMonthLabel(compareKeyB)} revenue`,'Status'];
  const lines = [header.join(',')].concat(rows.map(p => [p.name,p.brand,p.division,p.prev_units,p.cur_units,p.prev_revenue,p.cur_revenue,p.status].map(csvEscape).join(',')));
  const csv = lines.join('\\n');
  if(downloadsCap){
    try { await downloadsCap.save({filename: 'sbab-product-comparison.csv', data: csv}); return; } catch(e){ /* fall through */ }
  }
  try {
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sbab-product-comparison.csv';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
  } catch(e){ /* no-op */ }
});"""

    if old not in html:
        raise SystemExit("CSV download block not found in template (did the template change?)")
    return html.replace(old, new)


def hide_db_dot(html):
    old = '<span class="dbdot-wrap" id="dbStatus" title="connecting to database…"><span class="dbdot off"></span></span>'
    new = '<span class="dbdot-wrap" id="dbStatus" title="connecting to database…" style="display:none;"><span class="dbdot off"></span></span>'
    if old not in html:
        raise SystemExit("dbStatus element not found in template")
    return html.replace(old, new)


def main():
    with open(TEMPLATE, encoding="utf-8") as fh:
        html = fh.read()
    seed = load_months()
    if not seed:
        raise SystemExit(f"No month files found in {DATA_DIR}")
    html = bake_seed(html, seed)
    html = patch_csv_download(html)
    html = hide_db_dot(html)
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(html)
    print(f"Built {OUT}  ({os.path.getsize(OUT):,} bytes)")
    print(f"Months baked: {len(seed)} -> {', '.join(sorted(seed))}")


if __name__ == "__main__":
    main()
