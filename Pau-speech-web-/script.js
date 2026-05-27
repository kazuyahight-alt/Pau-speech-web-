const textInput = document.getElementById("textInput");
const voiceSelect = document.getElementById("voiceSelect");
const speedRange = document.getElementById("speedRange");
const speedValue = document.getElementById("speedValue");
const styleInput = document.getElementById("styleInput");

const aiBtn = document.getElementById("aiBtn");
const browserBtn = document.getElementById("browserBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const stopBtn = document.getElementById("stopBtn");
const clearBtn = document.getElementById("clearBtn");

const audioPlayer = document.getElementById("audioPlayer");
const downloadLink = document.getElementById("downloadLink");
const statusText = document.getElementById("status");
const charCount = document.getElementById("charCount");

let currentAudioUrl = null;
let currentUtterance = null;
let isGenerating = false;

function getText() {
  return textInput.value.trim();
}

function setStatus(message) {
  statusText.textContent = message;
}

function updateCharCount() {
  charCount.textContent = `${textInput.value.length} / 4096`;
}

function setLoading(loading) {
  isGenerating = loading;
  aiBtn.disabled = loading;
  browserBtn.disabled = loading;
  clearBtn.disabled = loading;

  aiBtn.textContent = loading ? "Generating..." : "Generate AI MP3";
}

function clearAudioUrl() {
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }

  audioPlayer.removeAttribute("src");
  audioPlayer.load();

  downloadLink.removeAttribute("href");
  downloadLink.classList.add("hidden");
}

function stopBrowserSpeech() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  currentUtterance = null;
}

async function generateAiSpeech() {
  const text = getText();

  if (!text) {
    setStatus("Teks masih kosong.");
    return;
  }

  if (text.length > 4096) {
    setStatus("Teks terlalu panjang. Maksimal 4096 karakter.");
    return;
  }

  if (isGenerating) return;

  stopBrowserSpeech();
  clearAudioUrl();
  setLoading(true);
  setStatus("Generating AI voice...");

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        voice: voiceSelect.value,
        speed: Number(speedRange.value),
        style: styleInput.value.trim() || "Speak clearly and naturally."
      })
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      let message = "Gagal generate speech.";

      if (contentType.includes("application/json")) {
        const data = await response.json();
        message = data.error || message;
      } else {
        message = await response.text();
      }

      throw new Error(message);
    }

    const audioBlob = await response.blob();

    if (!audioBlob || audioBlob.size === 0) {
      throw new Error("Audio kosong dari server.");
    }

    currentAudioUrl = URL.createObjectURL(audioBlob);

    audioPlayer.src = currentAudioUrl;
    downloadLink.href = currentAudioUrl;
    downloadLink.classList.remove("hidden");

    await audioPlayer.play().catch(() => {
      setStatus("Audio sudah dibuat. Klik play untuk memutar.");
    });

    if (!audioPlayer.paused) {
      setStatus("Playing AI audio.");
    }
  } catch (error) {
    clearAudioUrl();
    setStatus(error.message || "Terjadi error.");
  } finally {
    setLoading(false);
  }
}

function speakBrowser() {
  const text = getText();

  if (!text) {
    setStatus("Teks masih kosong.");
    return;
  }

  if (!("speechSynthesis" in window)) {
    setStatus("Browser ini tidak support Speech Synthesis.");
    return;
  }

  clearAudioUrl();
  stopBrowserSpeech();

  currentUtterance = new SpeechSynthesisUtterance(text);
  currentUtterance.lang = "id-ID";
  currentUtterance.rate = Number(speedRange.value);
  currentUtterance.pitch = 1;
  currentUtterance.volume = 1;

  currentUtterance.onstart = () => {
    setStatus("Playing browser speech.");
  };

  currentUtterance.onend = () => {
    setStatus("Browser speech selesai.");
    currentUtterance = null;
  };

  currentUtterance.onerror = () => {
    setStatus("Browser speech error.");
    currentUtterance = null;
  };

  window.speechSynthesis.speak(currentUtterance);
}

function pauseSpeech() {
  if (!audioPlayer.paused && audioPlayer.src) {
    audioPlayer.pause();
    setStatus("AI audio paused.");
    return;
  }

  if ("speechSynthesis" in window && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
    setStatus("Browser speech paused.");
    return;
  }

  setStatus("Tidak ada audio yang sedang diputar.");
}

function resumeSpeech() {
  if (audioPlayer.src && audioPlayer.paused) {
    audioPlayer.play();
    setStatus("AI audio resumed.");
    return;
  }

  if ("speechSynthesis" in window && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    setStatus("Browser speech resumed.");
    return;
  }

  setStatus("Tidak ada audio yang bisa dilanjutkan.");
}

function stopSpeech() {
  if (audioPlayer.src) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
  }

  stopBrowserSpeech();
  setStatus("Stopped.");
}

function clearAll() {
  textInput.value = "";
  updateCharCount();
  clearAudioUrl();
  stopBrowserSpeech();
  setStatus("Cleared.");
}

textInput.addEventListener("input", updateCharCount);

speedRange.addEventListener("input", () => {
  speedValue.textContent = `${Number(speedRange.value).toFixed(1)}x`;
});

aiBtn.addEventListener("click", generateAiSpeech);
browserBtn.addEventListener("click", speakBrowser);
pauseBtn.addEventListener("click", pauseSpeech);
resumeBtn.addEventListener("click", resumeSpeech);
stopBtn.addEventListener("click", stopSpeech);
clearBtn.addEventListener("click", clearAll);

audioPlayer.addEventListener("ended", () => {
  setStatus("AI audio selesai.");
});

updateCharCount();
speedValue.textContent = `${Number(speedRange.value).toFixed(1)}x`;
setStatus("Ready.");
