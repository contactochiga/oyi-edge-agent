(function () {
  const script =
    document.currentScript ||
    document.querySelector("script[data-oma-widget]") ||
    document.querySelector("script[src*='widget.js']");

  const apiBase = (script && script.dataset.apiBase) || window.location.origin;
  const title = (script && script.dataset.title) || "Chat with Oma";
  const subtitle =
    (script && script.dataset.subtitle) ||
    "Ochiga Marketing Agent for estates, buildings, and connected communities";
  const primaryColor = (script && script.dataset.primaryColor) || "#0d5c46";
  const accentColor = (script && script.dataset.accentColor) || "#f2c66d";
  const greeting =
    (script && script.dataset.greeting) ||
    "Hi, I'm Oma. Tell me a bit about your property or project, and I'll point you in the right direction.";
  const source = (script && script.dataset.source) || "website_widget";
  const storageKey = "oma_widget_lead_id";

  let isOpen = false;
  let isSending = false;
  let leadId = window.localStorage.getItem(storageKey) || "";

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
      .oma-typing {
        display: none;
        margin-bottom: 12px;
        color: #45665b;
        font-size: 12px;
      }
      .oma-typing.visible {
        display: block;
      }
      .oma-composer {
        padding: 14px;
        border-top: 1px solid rgba(13, 92, 70, 0.08);
        background: rgba(255, 253, 249, 0.96);
      }
      .oma-form {
        display: flex;
        gap: 10px;
        align-items: flex-end;
      }
      .oma-input {
        flex: 1;
        min-height: 52px;
        max-height: 140px;
        resize: none;
        border-radius: 18px;
        border: 1px solid rgba(13, 92, 70, 0.15);
        padding: 14px 16px;
        font: inherit;
        background: #fff;
        color: #173127;
        box-sizing: border-box;
      }
      .oma-input:focus {
        outline: none;
        border-color: ${primaryColor};
        box-shadow: 0 0 0 3px rgba(13, 92, 70, 0.12);
      }
      .oma-send {
        border: 0;
        background: ${accentColor};
        color: #163127;
        min-width: 54px;
        height: 52px;
        border-radius: 16px;
        font-weight: 700;
        cursor: pointer;
      }
      .oma-send[disabled] {
        opacity: 0.6;
        cursor: default;
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
          <div class="oma-typing" id="oma-typing">Oma is thinking...</div>
          <form class="oma-form" id="oma-form">
            <textarea
              class="oma-input"
              id="oma-input"
              placeholder="Tell Oma about your property, estate, or project..."
              rows="1"
            ></textarea>
            <button class="oma-send" id="oma-send" type="submit">Send</button>
          </form>
          <div class="oma-footer">Oma qualifies inbound leads and routes serious projects to Sales.</div>
        </div>
      </div>
      <button class="oma-button" id="oma-toggle" type="button" aria-label="Open chat">OMA</button>
    </div>
  `;

  const panel = shadow.getElementById("oma-panel");
  const toggle = shadow.getElementById("oma-toggle");
  const close = shadow.querySelector(".oma-close");
  const messages = shadow.getElementById("oma-messages");
  const typing = shadow.getElementById("oma-typing");
  const form = shadow.getElementById("oma-form");
  const input = shadow.getElementById("oma-input");
  const send = shadow.getElementById("oma-send");

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

  function setOpen(next) {
    isOpen = next;
    panel.classList.toggle("open", next);
    toggle.textContent = next ? "×" : "OMA";
    if (next) {
      window.setTimeout(() => input.focus(), 60);
    }
  }

  function autoSize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 140) + "px";
  }

  async function postMessage(text, leadIdOverride) {
    const response = await fetch(`${apiBase}/api/lead-agents/public/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        lead_id: leadIdOverride || undefined,
        source,
        message: text,
        profile: {},
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

  async function sendMessage(text) {
    if (!text || isSending) {
      return;
    }

    isSending = true;
    send.disabled = true;
    typing.classList.add("visible");
    addMessage("user", text);

    try {
      let data;
      try {
        data = await postMessage(text, leadId);
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
        data = await postMessage(text, "");
      }

      if (data.lead && data.lead.id) {
        leadId = data.lead.id;
        window.localStorage.setItem(storageKey, leadId);
      }

      addMessage("bot", data.assistant_message || "Thanks. Oma will follow up shortly.");
    } catch (error) {
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
      typing.classList.remove("visible");
      send.disabled = false;
      isSending = false;
      input.value = "";
      autoSize();
      input.focus();
    }
  }

  toggle.addEventListener("click", function () {
    setOpen(!isOpen);
  });

  close.addEventListener("click", function () {
    setOpen(false);
  });

  input.addEventListener("input", autoSize);

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      return;
    }
    sendMessage(text);
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) {
        return;
      }
      sendMessage(text);
    }
  });

  addMessage("bot", greeting);
})();
