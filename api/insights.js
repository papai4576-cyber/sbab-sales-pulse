const { compactMonths } = require("./_lib/compact");
const { callOpenRouter } = require("./_lib/openrouter");

const HISTORY_MONTHS = 7; // target month + up to 6 prior

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }

  try {
    const { monthKey, months } = req.body || {};
    if (!monthKey || typeof monthKey !== "string") {
      res.status(400).json({ error: 'Missing "monthKey".' });
      return;
    }

    const data = compactMonths(months || {});
    const idx = data.findIndex((m) => m.key === monthKey);
    if (idx === -1) {
      res.status(404).json({ error: `No data found for month ${monthKey}.` });
      return;
    }

    const target = data[idx];
    const history = data.slice(Math.max(0, idx - (HISTORY_MONTHS - 1)), idx + 1);

    const systemPrompt = [
      "You are a sales analyst for Baidyanath (SBAB) and its sub-brand Goodcare, a D2C ayurvedic/wellness brand in India.",
      "Figures are in INR, net of returns. \"revenue\" is taxable value before GST (the dashboard's primary net-revenue figure). \"grossRevenue\" is total invoice value including GST; it is null for months where that wasn't tracked -- don't estimate it.",
      "Use only the JSON data given below -- never invent numbers or products.",
      `Write a short monthly insight note for ${target.label}, for a reader who already knows the business.`,
      'Plain text only, no markdown headers or bold. Use three short sections, each as lines starting with "- ":',
      "Headline: one line on how the month went overall versus recent months.",
      "Standouts: notable SKU or division moves, up or down, with the actual numbers.",
      "Risks: concentration, anomalies, or anything in the data that looks off.",
      "Keep the whole note under 160 words.",
      "Output ONLY the final note in that structure. Do not show your reasoning, planning, or restate these instructions.",
      "",
      `Target month: ${target.key} (${target.label})`,
      "History, oldest to newest, target month last:",
      JSON.stringify(history),
    ].join("\n");

    const { text, model } = await callOpenRouter({
      systemPrompt,
      userPrompt: `Write the insight note for ${target.label}.`,
      maxTokens: 700,
    });

    res.status(200).json({ insights: text, model, monthKey });
  } catch (e) {
    const status = e && e.code === "no_key" ? 503 : 502;
    res.status(status).json({ error: (e && e.message) || "AI request failed." });
  }
};
