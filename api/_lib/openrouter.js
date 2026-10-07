// Thin wrapper around the OpenRouter chat completions API.
//
// OPENROUTER_API_KEY must be set as an environment variable on the Vercel
// project (Project Settings -> Environment Variables) -- never hardcode it
// here or ship it to the browser. OPENROUTER_MODEL can override the model;
// otherwise we try a short list of free models in order, since free-tier
// models on OpenRouter occasionally rate-limit or go down.

// OpenRouter's free catalog turns over often -- slugs that exist today can
// 404 in a few months. If every model below starts failing, refresh this
// list from the live catalog: curl https://openrouter.ai/api/v1/models |
// jq -r '.data[] | select(.id | endswith(":free")) | .id'
// Verified against /api/diag on 2026-10-07: laguna-s-2.1 gives clean,
// direct answers; the Gemma models are solid but were rate-limited on
// OpenRouter's shared free pool at the time (may recover, worth keeping);
// the Nemotron "reasoning" models tend to dump their chain-of-thought as
// the answer instead of a clean final response, even when told not to, so
// they're last-resort only. Re-run /api/diag if this list goes stale.
const FALLBACK_FREE_MODELS = [
  "poolside/laguna-s-2.1:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
];

function candidateModels() {
  const configured = (process.env.OPENROUTER_MODEL || "").trim();
  const list = configured ? [configured, ...FALLBACK_FREE_MODELS] : FALLBACK_FREE_MODELS;
  return [...new Set(list)];
}

async function callOpenRouter({ systemPrompt, userPrompt, maxTokens = 700, temperature = 0.3 }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const err = new Error(
      "OPENROUTER_API_KEY is not set on this deployment. Add it in the Vercel project's Environment Variables, then redeploy."
    );
    err.code = "no_key";
    throw err;
  }

  let lastError = null;
  for (const model of candidateModels()) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      let res;
      try {
        res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://sbab-sales-pulse.vercel.app",
            "X-Title": "SBAB Sales Pulse",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: maxTokens,
            temperature,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        lastError = new Error(`${model} responded ${res.status}: ${body.slice(0, 300)}`);
        continue;
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content || !content.trim()) {
        lastError = new Error(`${model} returned an empty response.`);
        continue;
      }
      return { text: content.trim(), model };
    } catch (e) {
      lastError = e;
      continue;
    }
  }
  throw lastError || new Error("All OpenRouter models failed.");
}

module.exports = { callOpenRouter };
