// Turns the full MONTHS object (same shape as data/months/*.json, keyed by
// "YYYY-MM") into a compact per-month summary safe to hand to an LLM:
// totals, top divisions/brands, and the top SKUs by revenue. Keeps token
// usage low and avoids shipping ~225 SKUs x 13 months of raw rows.

const TOP_PRODUCTS = 12;
const TOP_DIVISIONS = 8;

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function compactMonths(months) {
  const keys = Object.keys(months || {}).sort();
  return keys.map((key) => {
    const m = months[key] || {};
    const products = Array.isArray(m.products) ? m.products : [];

    const divisionTotals = {};
    const brandTotals = {};
    products.forEach((p) => {
      const rev = Number(p.revenue) || 0;
      const div = p.division || "Uncategorized";
      const brand = p.brand || "Unmapped/Other";
      divisionTotals[div] = (divisionTotals[div] || 0) + rev;
      brandTotals[brand] = (brandTotals[brand] || 0) + rev;
    });

    const topDivisions = Object.entries(divisionTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_DIVISIONS)
      .map(([division, revenue]) => ({ division, revenue: round2(revenue) }));

    const topBrands = Object.entries(brandTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([brand, revenue]) => ({ brand, revenue: round2(revenue) }));

    const topProducts = [...products]
      .sort((a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0))
      .slice(0, TOP_PRODUCTS)
      .map((p) => ({
        name: p.name,
        brand: p.brand,
        division: p.division,
        revenue: round2(p.revenue),
        units: Number(p.units) || 0,
      }));

    return {
      key,
      label: m.label || key,
      revenue: round2(m.revenue),
      units: Number(m.units) || 0,
      orders: Number(m.orders) || 0,
      aov: Number(m.aov) || 0,
      note: m.note || null,
      skuCount: products.length,
      topDivisions,
      topBrands,
      topProducts,
    };
  });
}

module.exports = { compactMonths };
