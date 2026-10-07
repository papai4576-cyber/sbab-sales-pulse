// Thin wrapper around the OpenRouter chat completions API.
//
// OPENROUTER_API_KEY must be set as an environment variable on the Vercel
// project (Project Settings -> Environment Variables) -- never hardcode it
// here or ship it to the browser. OPENROUTER_MODEL can override the model;
// otherwise we try a short list of free models in order, since free-tier
// models on OpenRouter occasionally rate-limit or go down.

const FALLBACK_FREE_MODELS = [
  "deepseek/deepseek-chat-v3.1:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "qwen/qwen-2.5-72b-instruct:free",
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
