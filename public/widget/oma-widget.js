(function () {
  const script =
    document.currentScript ||
    document.querySelector("script[data-oma-widget]") ||
    document.querySelector("script[src*='widget.js']");

  const apiBase = (script && script.dataset.apiBase) || window.location.origin;
  const agentName = (script && script.dataset.agentName) || "Oma";
  const brandName = (script && script.dataset.brandName) || "Ochiga";
  const title = (script && script.dataset.title) || `Chat with ${agentName}`;
  const subtitle =
    (script && script.dataset.subtitle) ||
    `${brandName} AI support for estates, buildings, and connected communities`;
  const primaryColor = (script && script.dataset.primaryColor) || "#0d5c46";
  const accentColor = (script && script.dataset.accentColor) || "#f2c66d";
  const greeting =
    (script && script.dataset.greeting) ||
    `Hi, I'm ${agentName}. Type, attach a plan, or speak with me about your property or project.`;
  const source = (script && script.dataset.source) || "website_widget";
  const storageKey = "oma_widget_lead_id";

  let isOpen = false;
  let isSending = false;
  let voiceConversationActive = false;
  let leadId = window.localStorage.getItem(storageKey) || "";
  let pendingFiles = [];
  let recognition = null;
  let activityTimer = null;
  let activeCaptureMode = "";
  let recordedTranscript = "";
  let isRecording = false;
  let audioContext = null;
  let audioAnalyser = null;
  let audioMeterFrame = null;
  let audioMeterData = null;
  let audioMeterStream = null;

  const root = document.createElement("div");
  root.setAttribute("data-oma-widget-root", "true");
  document.body.appendChild(root);

  const shadow = root.attachShadow({ mode: "open" });

  shadow.innerHTML = `
    <style>
      :host {
        all: initial;
      }
      .oma-shell {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 2147483647;
        font-family: "Avenir Next", "Segoe UI", sans-serif;
      }
      .oma-button {
        width: 68px;
        height: 68px;
        border-radius: 999px;
        border: 0;
        background:
          radial-gradient(circle at top, ${accentColor}, transparent 45%),
          linear-gradient(145deg, ${primaryColor}, #07352a);
        color: #fff;
        cursor: pointer;
        box-shadow: 0 18px 45px rgba(6, 27, 22, 0.28);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 0.04em;
      }
      .oma-panel {
        width: min(380px, calc(100vw - 24px));
        height: min(620px, calc(100vh - 120px));
        background: linear-gradient(180deg, #f6f0e5 0%, #fffdf9 100%);
        border-radius: 28px;
        box-shadow: 0 30px 80px rgba(10, 33, 25, 0.25);
        overflow: hidden;
        display: none;
        border: 1px solid rgba(13, 92, 70, 0.12);
      }
      .oma-panel.open {
        display: flex;
        flex-direction: column;
        margin-bottom: 14px;
      }
      .oma-panel.voice-chat {
        box-shadow:
          0 0 0 1px rgba(13, 92, 70, 0.18),
          0 0 55px rgba(13, 92, 70, 0.26),
          0 30px 80px rgba(10, 33, 25, 0.25);
      }
      .oma-panel.voice-chat .oma-composer {
        background:
          radial-gradient(circle at 82% 24%, rgba(13, 92, 70, 0.26), transparent 26%),
          radial-gradient(circle at 18% 42%, rgba(242, 198, 109, 0.2), transparent 30%),
          rgba(255, 253, 249, 0.98);
      }
      .oma-header {
        background:
          radial-gradient(circle at top right, rgba(242, 198, 109, 0.9), transparent 35%),
          linear-gradient(160deg, ${primaryColor}, #08392d 70%);
        color: #fff;
        padding: 18px 18px 20px;
      }
      .oma-header-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .oma-name {
        margin: 0;
        font-size: 19px;
        font-weight: 700;
      }
      .oma-subtitle {
        margin: 6px 0 0;
        font-size: 12px;
        line-height: 1.5;
        opacity: 0.88;
        max-width: 280px;
      }
      .oma-close {
        border: 0;
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
        width: 34px;
        height: 34px;
        border-radius: 999px;
        cursor: pointer;
        font-size: 20px;
      }
      .oma-messages {
        flex: 1;
        overflow-y: auto;
        padding: 18px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.7)),
          repeating-linear-gradient(
            135deg,
            rgba(13, 92, 70, 0.025) 0,
            rgba(13, 92, 70, 0.025) 12px,
            rgba(255, 255, 255, 0.6) 12px,
            rgba(255, 255, 255, 0.6) 24px
          );
      }
      .oma-message {
        max-width: 85%;
        margin-bottom: 12px;
        padding: 12px 14px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.5;
        white-space: pre-wrap;
      }
      .oma-message.bot {
        background: #ffffff;
        color: #173127;
        border-top-left-radius: 8px;
        box-shadow: 0 6px 18px rgba(11, 38, 30, 0.08);
      }
      .oma-message.user {
        margin-left: auto;
        background: linear-gradient(145deg, ${primaryColor}, #0b3f31);
        color: #fff;
        border-top-right-radius: 8px;
        box-shadow: 0 8px 20px rgba(8, 57, 45, 0.2);
      }
      .oma-activity {
        display: none;
        align-items: center;
        gap: 9px;
        margin-bottom: 10px;
        padding: 9px 12px;
        border-radius: 999px;
        color: #45665b;
        font-size: 12px;
        background: rgba(13, 92, 70, 0.055);
        border: 1px solid rgba(13, 92, 70, 0.07);
      }
      .oma-activity.visible {
        display: inline-flex;
      }
      .oma-activity.voice {
        background: rgba(5, 7, 6, 0.06);
        color: #17231e;
      }
      .oma-wave {
        width: 40px;
        height: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
      }
      .oma-wave i {
        width: 3px;
        height: var(--oma-wave-height, 5px);
        min-height: 4px;
        border-radius: 999px;
        background: ${primaryColor};
        animation: oma-wave 900ms ease-in-out infinite;
        opacity: 0.86;
        transition: height 70ms ease, opacity 70ms ease;
      }
      .oma-wave i:nth-child(2) {
        animation-delay: 80ms;
      }
      .oma-wave i:nth-child(3) {
        animation-delay: 160ms;
      }
      .oma-wave i:nth-child(4) {
        animation-delay: 240ms;
      }
      .oma-wave i:nth-child(5) {
        animation-delay: 320ms;
      }
      .oma-activity:not(.voice) .oma-wave i {
        animation-duration: 1300ms;
        opacity: 0.52;
      }
      .oma-activity.recording .oma-wave i {
        animation-duration: 520ms;
      }
      .oma-activity.metering .oma-wave i {
        animation: none;
        opacity: var(--oma-wave-opacity, 0.56);
      }
      @keyframes oma-wave {
        0%, 100% {
          height: 5px;
        }
        35% {
          height: 18px;
        }
        65% {
          height: 9px;
        }
      }
      .oma-composer {
        padding: 12px;
        border-top: 1px solid rgba(13, 92, 70, 0.08);
        background:
          radial-gradient(circle at top left, rgba(242, 198, 109, 0.14), transparent 28%),
          rgba(255, 253, 249, 0.96);
      }
      .oma-form {
        display: grid;
        gap: 10px;
      }
      .oma-command-bar {
        min-height: 70px;
        padding: 8px;
        border-radius: 28px;
        background: rgba(237, 244, 240, 0.92);
        border: 1px solid rgba(13, 92, 70, 0.08);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.86),
          0 18px 40px rgba(10, 33, 25, 0.12);
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        gap: 8px;
        align-items: end;
      }
      .oma-tool-btn,
      .oma-mic,
      .oma-voice {
        border: 0;
        cursor: pointer;
        display: grid;
        place-items: center;
        color: #111f19;
        transition: transform 160ms ease, background 160ms ease, color 160ms ease;
      }
      .oma-tool-btn,
      .oma-mic {
        width: 46px;
        height: 46px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.72);
      }
      .oma-tool-btn:hover,
      .oma-mic:hover,
      .oma-voice:hover {
        transform: translateY(-1px);
      }
      .oma-field {
        min-width: 0;
        display: grid;
        gap: 5px;
      }
      .oma-input {
        width: 100%;
        min-height: 44px;
        max-height: 140px;
        resize: none;
        border: 0;
        padding: 11px 8px 8px;
        font: inherit;
        font-size: 16px;
        line-height: 1.35;
        background: transparent;
        color: #173127;
        box-sizing: border-box;
      }
      .oma-input::placeholder {
        color: rgba(18, 31, 26, 0.45);
      }
      .oma-input:focus {
        outline: none;
      }
      .oma-attachments {
        display: none;
        gap: 6px;
        flex-wrap: wrap;
        padding: 0 4px 4px;
      }
      .oma-attachments.visible {
        display: flex;
      }
      .oma-file-pill {
        max-width: 150px;
        padding: 5px 8px;
        border-radius: 999px;
        background: rgba(13, 92, 70, 0.08);
        color: #315348;
        font-size: 11px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .oma-voice {
        height: 46px;
        min-width: 88px;
        padding: 0 16px;
        border-radius: 999px;
        background: #050706;
        color: #fff;
        font-weight: 800;
        font-size: 14px;
        grid-auto-flow: column;
        gap: 8px;
      }
      .oma-voice.listening {
        background: linear-gradient(145deg, ${primaryColor}, #051f18);
      }
      .oma-voice.active {
        background: linear-gradient(145deg, ${primaryColor}, #050706);
      }
      .oma-voice.ready-send {
        background: #050706;
      }
      .oma-form.recording .oma-voice {
        display: grid;
      }
      .oma-mic.recording {
        background: #050706;
        color: #fff;
      }
      .oma-send {
        border: 0;
        background: #050706;
        color: #fff;
        width: 50px;
        height: 50px;
        border-radius: 999px;
        font-weight: 800;
        cursor: pointer;
        display: none;
        place-items: center;
      }
      .oma-form.has-text .oma-send {
        display: grid;
      }
      .oma-form.has-text .oma-voice {
        display: none;
      }
      .oma-form.recording.has-text .oma-voice,
      .oma-form.recording .oma-voice {
        display: grid;
      }
      .oma-send[disabled] {
        opacity: 0.6;
        cursor: default;
      }
      .oma-file-input {
        display: none;
      }
      .oma-footer {
        margin-top: 8px;
        font-size: 11px;
        color: #678377;
      }
      @media (max-width: 640px) {
        .oma-shell {
          right: 12px;
          bottom: 12px;
        }
        .oma-panel.open {
          width: calc(100vw - 24px);
          height: min(74vh, 640px);
          margin-bottom: 10px;
        }
        .oma-command-bar {
          grid-template-columns: auto 1fr auto;
        }
      }
    </style>
    <div class="oma-shell">
      <div class="oma-panel" id="oma-panel">
        <div class="oma-header">
          <div class="oma-header-top">
            <div>
              <h2 class="oma-name">${title}</h2>
              <p class="oma-subtitle">${subtitle}</p>
            </div>
            <button class="oma-close" type="button" aria-label="Close chat">×</button>
          </div>
        </div>
        <div class="oma-messages" id="oma-messages"></div>
        <div class="oma-composer">
          <div class="oma-activity" id="oma-activity">
            <span class="oma-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
            <span id="oma-activity-text">${agentName} is ready.</span>
          </div>
          <form class="oma-form" id="oma-form">
            <div class="oma-command-bar">
              <button class="oma-tool-btn" id="oma-attach" type="button" aria-label="Attach image or document">
                <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
              </button>
              <div class="oma-field">
                <textarea
                  class="oma-input"
                  id="oma-input"
                  placeholder="Ask anything"
                  rows="1"
                ></textarea>
                <div class="oma-attachments" id="oma-attachments"></div>
              </div>
              <button class="oma-mic" id="oma-mic" type="button" aria-label="Dictate message">
                <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg>
              </button>
              <button class="oma-voice" id="oma-voice" type="button" aria-label="Speak to Oma">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="9" width="3" height="6" rx="1.5"/><rect x="9" y="5" width="3" height="14" rx="1.5"/><rect x="14" y="8" width="3" height="8" rx="1.5"/><rect x="19" y="11" width="3" height="2" rx="1"/></svg>
                Speak
              </button>
              <button class="oma-send" id="oma-send" type="submit" aria-label="Send message">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 14-7-7 14-2-5-5-2Z"/></svg>
              </button>
            </div>
            <input class="oma-file-input" id="oma-file" type="file" accept="image/*,.pdf,.doc,.docx,.dwg,.dxf,.ifc,.glb,.gltf,.obj,.stl,.zip" multiple />
          </form>
          <div class="oma-footer">Type, attach a file or plan, dictate, or start live speak mode.</div>
        </div>
      </div>
      <button class="oma-button" id="oma-toggle" type="button" aria-label="Open chat">OMA</button>
    </div>
  `;

  const panel = shadow.getElementById("oma-panel");
  const toggle = shadow.getElementById("oma-toggle");
  const close = shadow.querySelector(".oma-close");
  const messages = shadow.getElementById("oma-messages");
  const activity = shadow.getElementById("oma-activity");
  const activityText = shadow.getElementById("oma-activity-text");
  const waveBars = Array.from(shadow.querySelectorAll(".oma-wave i"));
  const form = shadow.getElementById("oma-form");
  const input = shadow.getElementById("oma-input");
  const send = shadow.getElementById("oma-send");
  const attach = shadow.getElementById("oma-attach");
  const fileInput = shadow.getElementById("oma-file");
  const attachments = shadow.getElementById("oma-attachments");
  const mic = shadow.getElementById("oma-mic");
  const voice = shadow.getElementById("oma-voice");

  const micIcon =
    '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg>';
  const stopIcon =
    '<svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>';
  const speakIcon =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="9" width="3" height="6" rx="1.5"/><rect x="9" y="5" width="3" height="14" rx="1.5"/><rect x="14" y="8" width="3" height="8" rx="1.5"/><rect x="19" y="11" width="3" height="2" rx="1"/></svg>';
  const sendIcon =
    '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 14-7-7 14-2-5-5-2Z"/></svg>';

  function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  function addMessage(role, text) {
    const bubble = document.createElement("div");
    bubble.className = `oma-message ${role}`;
    bubble.textContent = text;
    messages.appendChild(bubble);
    scrollToBottom();
  }

  function setActivity(text, options) {
    const config = options || {};
    activityText.textContent = text || `${agentName} is ready.`;
    activity.classList.toggle("visible", Boolean(text));
    activity.classList.toggle("voice", Boolean(config.voice));
    activity.classList.toggle("recording", Boolean(config.recording));
  }

  function setWaveLevel(level) {
    const normalized = Math.max(0, Math.min(1, level || 0));
    const spread = [0.42, 0.72, 1, 0.82, 0.5];
    waveBars.forEach(function (bar, index) {
      const height = 5 + normalized * 19 * spread[index];
      bar.style.setProperty("--oma-wave-height", `${height.toFixed(1)}px`);
      bar.style.setProperty("--oma-wave-opacity", String(0.48 + normalized * 0.5));
    });
  }

  function stopAudioMeter() {
    if (audioMeterFrame) {
      window.cancelAnimationFrame(audioMeterFrame);
      audioMeterFrame = null;
    }
    if (audioMeterStream) {
      audioMeterStream.getTracks().forEach(function (track) {
        track.stop();
      });
      audioMeterStream = null;
    }
    if (audioContext) {
      audioContext.close().catch(function () {});
      audioContext = null;
    }
    audioAnalyser = null;
    audioMeterData = null;
    activity.classList.remove("metering");
    setWaveLevel(0);
  }

  async function startAudioMeter() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return;
    }
    stopAudioMeter();
    try {
      audioMeterStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(audioMeterStream);
      audioAnalyser = audioContext.createAnalyser();
      audioAnalyser.fftSize = 512;
      audioMeterData = new Uint8Array(audioAnalyser.fftSize);
      source.connect(audioAnalyser);
      activity.classList.add("metering");

      const tick = function () {
        if (!audioAnalyser || !audioMeterData) return;
        audioAnalyser.getByteTimeDomainData(audioMeterData);
        let sum = 0;
        for (let i = 0; i < audioMeterData.length; i += 1) {
          const centered = (audioMeterData[i] - 128) / 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / audioMeterData.length);
        setWaveLevel(Math.min(1, rms * 7));
        audioMeterFrame = window.requestAnimationFrame(tick);
      };
      tick();
    } catch (_) {
      activity.classList.remove("metering");
    }
  }

  function setVoiceButton(mode) {
    if (mode === "send") {
      voice.classList.add("ready-send");
      voice.setAttribute("aria-label", "Send recording");
      voice.innerHTML = `${sendIcon} Send`;
      return;
    }
    if (mode === "stop") {
      voice.classList.add("ready-send");
      voice.setAttribute("aria-label", "Stop voice chat");
      voice.innerHTML = `${stopIcon} Stop`;
      return;
    }
    voice.classList.remove("ready-send");
    voice.setAttribute("aria-label", `Speak to ${agentName}`);
    voice.innerHTML = `${speakIcon} Speak`;
  }

  function setRecordingUi(mode) {
    isRecording = true;
    activeCaptureMode = mode;
    mic.classList.add("recording");
    mic.setAttribute("aria-label", "Stop recording");
    mic.innerHTML = stopIcon;
    form.classList.toggle("recording", mode === "dictate");
    if (mode === "dictate") {
      setVoiceButton("send");
    }
    if (mode === "conversation") {
      setVoiceButton("stop");
      panel.classList.add("voice-chat");
    }
  }

  function resetRecordingUi() {
    isRecording = false;
    activeCaptureMode = "";
    recordedTranscript = "";
    stopAudioMeter();
    mic.classList.remove("recording");
    mic.setAttribute("aria-label", "Dictate message");
    mic.innerHTML = micIcon;
    form.classList.remove("recording");
    if (!voiceConversationActive) {
      voice.classList.remove("active", "listening");
      setVoiceButton("speak");
      panel.classList.remove("voice-chat");
    }
  }

  function stopCurrentRecording() {
    if (!recognition || !isRecording) return;
    setActivity("Transcribing your recording...", { recording: true });
    stopAudioMeter();
    try {
      recognition.stop();
    } catch (_) {
      resetRecordingUi();
    }
  }

  function stopActivityCycle() {
    if (activityTimer) {
      window.clearInterval(activityTimer);
      activityTimer = null;
    }
  }

  function startActivityCycle(items, options) {
    stopActivityCycle();
    const messages = items && items.length ? items : [`${agentName} is thinking...`];
    let index = 0;
    setActivity(messages[index], options);
    activityTimer = window.setInterval(function () {
      index = (index + 1) % messages.length;
      setActivity(messages[index], options);
    }, 1500);
  }

  function setOpen(next) {
    isOpen = next;
    panel.classList.toggle("open", next);
    toggle.textContent = next ? "×" : "OMA";
    if (!next) {
      voiceConversationActive = false;
      stopActivityCycle();
      setActivity("", {});
      voice.classList.remove("active", "listening");
      panel.classList.remove("voice-chat");
      resetRecordingUi();
      if (recognition) {
        try {
          recognition.stop();
        } catch (_) {}
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
    if (next) {
      window.setTimeout(() => input.focus(), 60);
    }
  }

  function autoSize(keepVoiceMode) {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 140) + "px";
    form.classList.toggle("has-text", Boolean(input.value.trim()));
    if (input.value.trim() && !keepVoiceMode) {
      voiceConversationActive = false;
      voice.classList.remove("active", "listening");
    }
  }

  function renderAttachments() {
    attachments.innerHTML = "";
    pendingFiles.slice(0, 4).forEach(function (file) {
      const pill = document.createElement("span");
      pill.className = "oma-file-pill";
      pill.textContent = file.name;
      attachments.appendChild(pill);
    });
    attachments.classList.toggle("visible", pendingFiles.length > 0);
    form.classList.toggle("has-text", Boolean(input.value.trim() || pendingFiles.length));
    if (pendingFiles.length) {
      setActivity("File ready. Plans and images will be sent as context for analysis.", {});
    }
  }

  function fileContextLine() {
    if (!pendingFiles.length) return "";
    return `\n\nAttached files for context: ${pendingFiles
      .map(function (file) {
        return `${file.name} (${Math.round(file.size / 1024)}KB)`;
      })
      .join(", ")}`;
  }

  function speakText(text, continueListening) {
    if (!("speechSynthesis" in window)) {
      setActivity("", {});
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.onstart = function () {
      setActivity(`${agentName} is speaking...`, { voice: true });
    };
    utterance.onend = function () {
      if (continueListening && voiceConversationActive) {
        setActivity("Listening for your reply...", { voice: true });
        window.setTimeout(function () {
          startVoiceCapture("conversation");
        }, 350);
        return;
      }
      setActivity("", {});
    };
    window.speechSynthesis.speak(utterance);
  }

  function ensureRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    if (recognition) return recognition;
    recognition = new SpeechRecognition();
    recognition.lang = "en-NG";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = function (event) {
      const transcript = Array.from(event.results || [])
        .map(function (result) {
          return result[0] ? result[0].transcript : "";
        })
        .join(" ")
        .trim();
      if (transcript) {
        input.value = input.value ? `${input.value.trim()} ${transcript}` : transcript;
        autoSize(false);
      }
    };
    recognition.onend = function () {
      voice.classList.remove("listening");
      resetRecordingUi();
    };
    return recognition;
  }

  function startVoiceCapture(mode) {
    const speech = ensureRecognition();
    if (!speech) {
      addMessage("bot", "Voice input is not available in this browser yet. You can still type your message here.");
      return;
    }
    const isConversation = mode === "conversation";
    recordedTranscript = "";
    speech.continuous = !isConversation;
    speech.interimResults = true;
    voiceConversationActive = isConversation;
    voice.classList.toggle("active", isConversation);
    voice.classList.add("listening");
    setRecordingUi(mode);
    startAudioMeter();
    setActivity(isConversation ? "Launching voice chat..." : "Recording. Tap stop when done...", {
      voice: isConversation,
      recording: true,
    });
    speech.onstart = function () {
      setActivity(isConversation ? "Voice chat ready. Speak now..." : "Recording. Tap stop when done...", {
        voice: isConversation,
        recording: true,
      });
    };
    speech.onresult = function (event) {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex || 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result && result[0] ? result[0].transcript : "";
        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }
      const transcript = (finalTranscript || interimTranscript).trim();
      if (transcript) {
        if (finalTranscript.trim()) {
          recordedTranscript = recordedTranscript
            ? `${recordedTranscript.trim()} ${finalTranscript.trim()}`
            : finalTranscript.trim();
        }
        const displayTranscript = recordedTranscript || transcript;
        input.value = displayTranscript;
        autoSize(isConversation);
        if (isConversation && finalTranscript.trim()) {
          setActivity(`${agentName} is analyzing what you said...`, { voice: true, recording: true });
          const transcriptText = input.value.trim();
          sendMessage(`${transcriptText}${fileContextLine()}`.trim(), {
            displayText: transcriptText,
            voiceReply: true,
            continueVoice: true,
            submittedBy: "speak",
          });
        } else if (!isConversation) {
          setActivity("Transcribing your recording...", { recording: true });
        }
      }
    };
    speech.onend = function () {
      const endedMode = activeCaptureMode;
      const transcriptText = (recordedTranscript || input.value).trim();
      if (transcriptText) {
        input.value = transcriptText;
      }
      voice.classList.remove("listening");
      resetRecordingUi();
      if (endedMode === "dictate") {
        if (!transcriptText) {
          setActivity("I did not catch that. Try recording again.", {});
          return;
        }
        autoSize(false);
        setActivity("Recording transcribed. Review it, then send.", {});
      }
    };
    speech.onerror = function () {
      setActivity("Voice capture paused. Try again or type your message.", {});
      voice.classList.remove("listening");
      resetRecordingUi();
    };
    try {
      speech.start();
    } catch (_) {
      setActivity("Voice capture is already active.", { voice: isConversation });
    }
  }

  async function postMessage(text, leadIdOverride, options) {
    const config = options || {};
    const response = await fetch(`${apiBase}/api/lead-agents/public/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        lead_id: leadIdOverride || undefined,
        source,
        message: text,
        profile: {
          interaction_mode: config.submittedBy || "type",
          attached_files: pendingFiles.map(function (file) {
            return {
              name: file.name,
              size: file.size,
              type: file.type || "file",
            };
          }),
        },
      }),
    });

    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }

    if (!response.ok) {
      const err = new Error(data.error || "Unable to reach Oma right now.");
      err.status = response.status;
      err.payload = data;
      throw err;
    }

    return data;
  }

  async function sendMessage(text, options) {
    const config = options || {};
    if (!text || isSending) {
      return;
    }

    isSending = true;
    send.disabled = true;
    startActivityCycle(
      config.submittedBy === "speak"
        ? [
            `${agentName} is analyzing what you said...`,
            "Checking the conversation context...",
            "Preparing a spoken response...",
          ]
        : [
            `${agentName} is thinking...`,
            pendingFiles.length ? "Reading attached plan context..." : "Reviewing your message...",
            "Preparing the next answer...",
          ],
      { voice: config.submittedBy === "speak" }
    );
    addMessage("user", config.displayText || text);

    try {
      let data;
      try {
        data = await postMessage(text, leadId, config);
      } catch (error) {
        const message = String(
          (error.payload && error.payload.error) || error.message || ""
        ).toLowerCase();
        const isInvalidLead =
          error.status === 404 ||
          message.includes("lead not found") ||
          message.includes("not found");

        if (!leadId || !isInvalidLead) {
          throw error;
        }

        window.localStorage.removeItem(storageKey);
        leadId = "";
        data = await postMessage(text, "", config);
      }

      if (data.lead && data.lead.id) {
        leadId = data.lead.id;
        window.localStorage.setItem(storageKey, leadId);
      }

      const assistantText = data.assistant_message || "Thanks. Oma will follow up shortly.";
      addMessage("bot", assistantText);
      stopActivityCycle();
      if (config.voiceReply) {
        speakText(assistantText, config.continueVoice);
      }
    } catch (error) {
      stopActivityCycle();
      setActivity("", {});
      addMessage(
        "bot",
        "I couldn't complete that request right now. Please try again in a moment."
      );
      console.error("[Oma widget]", {
        message: error.message,
        status: error.status,
        payload: error.payload,
      });
    } finally {
      if (!config.voiceReply) {
        stopActivityCycle();
        setActivity("", {});
      }
      send.disabled = false;
      isSending = false;
      input.value = "";
      pendingFiles = [];
      renderAttachments();
      autoSize(Boolean(config.continueVoice));
      input.focus();
    }
  }

  toggle.addEventListener("click", function () {
    setOpen(!isOpen);
  });

  close.addEventListener("click", function () {
    setOpen(false);
  });

  input.addEventListener("input", function () {
    autoSize(false);
    setActivity("", {});
  });

  attach.addEventListener("click", function () {
    fileInput.click();
  });

  fileInput.addEventListener("change", function (event) {
    pendingFiles = Array.from(event.target.files || []);
    renderAttachments();
  });

  mic.addEventListener("click", function () {
    if (isRecording && activeCaptureMode === "dictate") {
      stopCurrentRecording();
      return;
    }
    startVoiceCapture("dictate");
  });

  voice.addEventListener("click", function () {
    if (isRecording && activeCaptureMode === "dictate") {
      stopCurrentRecording();
      return;
    }
    if (voiceConversationActive) {
      voiceConversationActive = false;
      voice.classList.remove("active", "listening");
      setVoiceButton("speak");
      panel.classList.remove("voice-chat");
      stopActivityCycle();
      setActivity("Live speak mode paused.", {});
      if (recognition) {
        try {
          recognition.stop();
        } catch (_) {}
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      resetRecordingUi();
      return;
    }
    voiceConversationActive = true;
    startVoiceCapture("conversation");
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    voiceConversationActive = false;
    const typedText = input.value.trim();
    const text = `${typedText}${fileContextLine()}`.trim();
    if (!text) {
      return;
    }
    sendMessage(text, {
      displayText: typedText || "Uploaded file for analysis",
      submittedBy: pendingFiles.length ? "file" : "type",
    });
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      voiceConversationActive = false;
      const typedText = input.value.trim();
      const text = `${typedText}${fileContextLine()}`.trim();
      if (!text) {
        return;
      }
      sendMessage(text, {
        displayText: typedText || "Uploaded file for analysis",
        submittedBy: pendingFiles.length ? "file" : "type",
      });
    }
  });

  addMessage("bot", greeting);
})();
