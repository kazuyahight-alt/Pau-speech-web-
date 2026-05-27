const ALLOWED_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
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
        ok: false,
        error: "Method not allowed"
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "OPENAI_API_KEY belum dipasang di Vercel Environment Variables."
      });
    }

    const body = req.body || {};
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const voice = typeof body.voice === "string" ? body.voice : "alloy";
    const style = typeof body.style === "string" ? body.style.trim() : "Speak clearly and naturally.";
    const speedNumber = Number(body.speed);

    if (!text) {
      return res.status(400).json({
        ok: false,
        error: "Teks masih kosong."
      });
    }

    if (text.length > 4096) {
      return res.status(400).json({
        ok: false,
        error: "Teks terlalu panjang. Maksimal 4096 karakter."
      });
    }

    const safeVoice = ALLOWED_VOICES.has(voice) ? voice : "alloy";
    const safeSpeed = Number.isFinite(speedNumber)
      ? Math.min(Math.max(speedNumber, 0.25), 4)
      : 1;

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: safeVoice,
        input: text,
        instructions: style || "Speak clearly and naturally.",
        response_format: "mp3",
        speed: safeSpeed
      })
    });

    if (!response.ok) {
      let message = "Gagal generate audio dari API.";

      try {
        const errorJson = await response.json();
        message =
          errorJson?.error?.message ||
          errorJson?.message ||
          message;
      } catch (error) {
        message = await response.text();
      }

      return res.status(response.status).json({
        ok: false,
        error: message
      });
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "inline; filename=\"pau-speech.mp3\"");
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(audioBuffer);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || "Server error."
    });
  }
};
