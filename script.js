const textEl = document.getElementById("text");
const countEl = document.getElementById("count");
const voiceEl = document.getElementById("voice");
const speedEl = document.getElementById("speed");
const speedTextEl = document.getElementById("speedText");
const styleEl = document.getElementById("style");

const aiBtn = document.getElementById("aiBtn");
const browserBtn = document.getElementById("browserBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const stopBtn = document.getElementById("stopBtn");
const clearBtn = document.getElementById("clearBtn");

const audioEl = document.getElementById("audio");
const downloadEl = document.getElementById("download");
const statusEl = document.getElementById("status");

let audioUrl = null;
let loading = false;

function setStatus(text) {
  statusEl.textContent = text;
}

function updateCount() {
  countEl.textContent = `${textEl.value.length} / 4096`;
}

function setLoading(value) {
  loading = value;
  aiBtn.disabled = value;
  browserBtn.disabled = value;
  clearBtn.disabled = value;
  aiBtn.textContent = value ? "Generating..." : "Generate AI MP3";
}

function clearAudio() {
  if (audioUrl) {
    URL.revokeObjectURL(audioUrl);
    audioUrl = null;
  }

  audioEl.removeAttribute("src");
  audioEl.load();

  downloadEl.removeAttribute("href");
  downloadEl.classList.add("hide");
}

function stopBrowserSpeech() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

async function generateAI() {
  const text = textEl.value.trim();

  if (!text) {
    setStatus("Teks masih kosong.");
    return;
  }

  if (loading) return;

  stopBrowserSpeech();
  clearAudio();
  setLoading(true);
  setStatus("Membuat suara AI...");

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        voice: voiceEl.value,
        speed: Number(speedEl.value),
        style: styleEl.value.trim()
      })
    });

    if (!res.ok) {
      let msg = "Gagal membuat audio.";

      try {
        const data = await res.json();
        msg = data.error || msg;
      } catch {
        msg = await res.text();
      }

      throw new Error(msg);
    }

    const blob = await res.blob();

    if (!blob.size) {
      throw new Error("Audio kosong.");
    }

    audioUrl = URL.createObjectURL(blob);
    audioEl.src = audioUrl;
    downloadEl.href = audioUrl;
    downloadEl.classList.remove("hide");

    try {
      await audioEl.play();
      setStatus("Memutar audio AI.");
    } catch {
      setStatus("Audio berhasil dibuat. Klik play untuk memutar.");
    }
  } catch (err) {
    clearAudio();
    setStatus(err.message || "Error.");
  } finally {
    setLoading(false);
  }
}

function browserSpeech() {
  const text = textEl.value.trim();

  if (!text) {
    setStatus("Teks masih kosong.");
    return;
  }

  if (!("speechSynthesis" in window)) {
    setStatus("Browser tidak mendukung speech synthesis.");
    return;
  }

  clearAudio();
  stopBrowserSpeech();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "id-ID";
  utter.rate = Number(speedEl.value);
  utter.pitch = 1;
  utter.volume = 1;

  utter.onstart = () => setStatus("Memutar browser speech.");
  utter.onend = () => setStatus("Browser speech selesai.");
  utter.onerror = () => setStatus("Browser speech error.");

  window.speechSynthesis.speak(utter);
}

function pauseSpeech() {
  if (audioEl.src && !audioEl.paused) {
    audioEl.pause();
    setStatus("Audio AI pause.");
    return;
  }

  if ("speechSynthesis" in window && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
    setStatus("Browser speech pause.");
    return;
  }

  setStatus("Tidak ada audio yang sedang jalan.");
}

function resumeSpeech() {
  if (audioEl.src && audioEl.paused) {
    audioEl.play();
    setStatus("Audio AI lanjut.");
    return;
  }

  if ("speechSynthesis" in window && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    setStatus("Browser speech lanjut.");
    return;
  }

  setStatus("Tidak ada audio yang bisa dilanjutkan.");
}

function stopSpeech() {
  if (audioEl.src) {
    audioEl.pause();
    audioEl.currentTime = 0;
  }

  stopBrowserSpeech();
  setStatus("Stopped.");
}

function clearAll() {
  textEl.value = "";
  updateCount();
  clearAudio();
  stopBrowserSpeech();
  setStatus("Cleared.");
}

textEl.addEventListener("input", updateCount);

speedEl.addEventListener("input", () => {
  speedTextEl.textContent = `${Number(speedEl.value).toFixed(1)}x`;
});

aiBtn.addEventListener("click", generateAI);
browserBtn.addEventListener("click", browserSpeech);
pauseBtn.addEventListener("click", pauseSpeech);
resumeBtn.addEventListener("click", resumeSpeech);
stopBtn.addEventListener("click", stopSpeech);
clearBtn.addEventListener("click", clearAll);

audioEl.addEventListener("ended", () => {
  setStatus("Audio AI selesai.");
});

updateCount();
speedTextEl.textContent = `${Number(speedEl.value).toFixed(1)}x`;
