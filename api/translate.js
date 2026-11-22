module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not set in Vercel." });
  }

  try {
    const { audio, mimeType, dialect } = req.body;
    if (!audio) {
      return res.status(400).json({ error: "No audio received." });
    }

    const cleanMime = (mimeType || "audio/mp4").split(";")[0];
    const targetDialect = dialect === "Cantonese" ? "Hong Kong Cantonese (Traditional Chinese)" : "Mandarin (Simplified Chinese)";

    const prompt = `Detect if audio is Tamil or Chinese. Transcribe accurately. If Tamil, translate to natural ${targetDialect}. If Chinese, translate to natural spoken Tamil. Return ONLY JSON: {"detected":"ta"|"zh","original":"...","translated":"..."}`;

    const models = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];
    let lastError = "Translation failed";

    for (const model of models) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: cleanMime, data: audio } }
                ]
              }
            ],
            generationConfig: { responseMimeType: "application/json" }
          })
        }
      );

      const data = await response.json();
      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const result = JSON.parse(data.candidates[0].content.parts[0].text);
        return res.status(200).json(result);
      }

      lastError = data.error?.message || `Error ${response.status}`;
    }

    return res.status(503).json({ error: lastError });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};