const VOICES = new Set([
  "alloy",
  "ash",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer"
]);

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed."
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY belum diisi di Vercel Environment Variables."
      });
    }

    const { text, voice, speed, style } = req.body || {};

    const cleanText = typeof text === "string" ? text.trim() : "";
    const cleanVoice = VOICES.has(voice) ? voice : "alloy";
    const cleanStyle = typeof style === "string" && style.trim()
      ? style.trim()
      : "Speak clearly and naturally.";

    const cleanSpeed = Number.isFinite(Number(speed))
      ? Math.min(Math.max(Number(speed), 0.5), 2)
      : 1;

    if (!cleanText) {
      return res.status(400).json({
        error: "Teks kosong."
      });
    }

    if (cleanText.length > 4096) {
      return res.status(400).json({
        error: "Teks terlalu panjang. Maksimal 4096 karakter."
      });
    }

    const openaiRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        input: cleanText,
        voice: cleanVoice,
        instructions: cleanStyle,
        response_format: "mp3",
        speed: cleanSpeed
      })
    });

    if (!openaiRes.ok) {
      let message = "OpenAI TTS API error.";

      try {
        const data = await openaiRes.json();
        message = data?.error?.message || message;
      } catch {
        message = await openaiRes.text();
      }

      return res.status(openaiRes.status).json({
        error: message
      });
    }

    const buffer = Buffer.from(await openaiRes.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "inline; filename=pau-speech.mp3");
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(buffer);
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Server error."
    });
  }
};
