// Diagnostic-only: hits each candidate OpenRouter model directly with a
// trivial prompt and reports per-model success/failure. Not linked from the
// UI; useful when the fallback chain keeps landing on the same model and we
// want to know why the earlier ones in the list are failing.

const MODELS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3.5-lightning:free",
  "liquid/lfm-2.5-2.6b:free",
  "apodex/apodex-1.1-mini:free",
  "inclusionai/ling-3.0-flash-sante:free",
  "dots-studio/dots-3-note-preview:free",
  "poolside/laguna-s-2.1:free",
];

module.exports = async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "OPENROUTER_API_KEY not set." });
    return;
  }

  const results = [];
  for (const model of MODELS) {
    const started = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      let r;
      try {
        r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://sbab-sales-pulse.vercel.app",
            "X-Title": "SBAB Sales Pulse (diag)",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "Reply with exactly: ok" }],
            max_tokens: 10,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      const ms = Date.now() - started;
      if (!r.ok) {
        const body = await r.text().catch(() => "");
        results.push({ model, ok: false, status: r.status, ms, body: body.slice(0, 200) });
        continue;
      }
      const data = await r.json();
      const content = data?.choices?.[0]?.message?.content;
      results.push({ model, ok: true, ms, content: (content || "").slice(0, 60) });
    } catch (e) {
      results.push({ model, ok: false, ms: Date.now() - started, error: (e && e.message) || String(e) });
    }
  }
  res.status(200).json({ results });
};
