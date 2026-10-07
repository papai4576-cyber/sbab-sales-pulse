const { compactMonths } = require("./_lib/compact");
const { callOpenRouter } = require("./_lib/openrouter");

const MAX_QUESTION_LENGTH = 600;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }

  try {
    const { question, months } = req.body || {};
    if (!question || typeof question !== "string" || !question.trim()) {
      res.status(400).json({ error: 'Missing "question".' });
      return;
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      res.status(400).json({ error: `Question is too long (max ${MAX_QUESTION_LENGTH} characters).` });
      return;
    }

    const data = compactMonths(months || {});
    if (!data.length) {
      res.status(400).json({ error: "No month data was sent with the request." });
      return;
    }

    const systemPrompt = [
      "You are a sales analyst for Baidyanath (SBAB) and its sub-brand Goodcare, a D2C ayurvedic/wellness brand in India.",
      "Figures are in INR, net of returns. \"revenue\" is taxable value before GST (the dashboard's primary net-revenue figure). \"grossRevenue\" is total invoice value including GST; it is null for months where that wasn't tracked -- say so rather than estimating it.",
      "Answer only using the JSON month data given below -- never invent numbers or products.",
      "Be concise: plain text, short paragraphs or lines starting with \"- \" for lists. No markdown headers or bold.",
      "Name the specific month(s) and numbers behind your answer. If the data doesn't answer the question, say so plainly instead of guessing.",
      "Output ONLY the final answer. Do not show your reasoning, planning, or restate these instructions.",
      "",
      "Monthly data, oldest to newest (revenue in INR):",
      JSON.stringify(data),
    ].join("\n");

    const { text, model } = await callOpenRouter({
      systemPrompt,
      userPrompt: question.trim(),
      maxTokens: 650,
    });

    res.status(200).json({ answer: text, model });
  } catch (e) {
    const status = e && e.code === "no_key" ? 503 : 502;
    res.status(status).json({ error: (e && e.message) || "AI request failed." });
  }
};
