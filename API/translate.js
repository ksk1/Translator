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
    const targetDialect = dialect === "Cantonese" ? "Cantonese" : "Mandarin";

    const prompt = `Listen to this audio carefully.
1. Detect whether the speaker is speaking Tamil or Chinese (Mandarin/Cantonese).
2. Transcribe what they said accurately in the original script.
3. If they spoke Tamil, translate it to natural ${targetDialect} (${targetDialect === "Cantonese" ? "Traditional Chinese / Hong Kong Cantonese" : "Simplified Chinese"}).
4. If they spoke Chinese, translate it to natural spoken Tamil.
Return ONLY valid JSON in this exact format:
{"detected": "ta" or "zh", "original": "transcribed text", "translated": "translated text"}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
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
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Gemini API Error" });
    }

    const rawText = data.candidates[0].content.parts[0].text;
    const result = JSON.parse(rawText);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};