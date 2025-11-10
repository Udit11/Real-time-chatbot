// chat-widget/main.js
// Minimal chat widget client — vanilla JS
// Place this file at chat-widget/main.js and point index.html to it.

const API_BASE = window.API_BASE || ""; // allow overriding via inline script (if needed)
const GENERATE_URL = `${API_BASE}/api/chat/generate`;

// Utility
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "onclick") node.onclick = v;
    else node.setAttribute(k, v);
  });
  children.forEach(c => {
    if (typeof c === "string") node.appendChild(document.createTextNode(c));
    else if (c) node.appendChild(c);
  });
  return node;
}

function createMessageBubble(text, who = "user") {
  const cls = who === "user" ? "msg user" : "msg bot";
  const bubble = el("div", { class: cls }, text);
  return bubble;
}

async function sendMessage(avatarId, messageText) {
  appendLocalMessage(messageText, "user");
  setInputDisabled(true);
  showStatus("Waiting for reply…");

  try {
    const resp = await fetch(GENERATE_URL, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ avatar_id: avatarId, message: messageText })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      showStatus("Server error: " + resp.status + " " + txt);
      setInputDisabled(false);
      return;
    }

    const data = await resp.json();
    const reply = data.reply || "(no reply)";
    appendLocalMessage(reply, "bot");
    showStatus("");

    // Play audio_url if provided
    if (data.audio_url) {
      const audio = new Audio(data.audio_url);
      audio.play().catch(e => {
        console.warn("Audio play failed:", e);
        // fallback to TTS in browser
        fallbackSpeak(reply);
      });
    } else {
      fallbackSpeak(reply);
    }

    // Optionally update avatar display if server returned avatar object
    if (data.avatar && data.avatar.name) {
      setAvatarHeader(data.avatar);
    }

  } catch (err) {
    console.error("Chat request failed", err);
    showStatus("Network error: " + err.message);
  } finally {
    setInputDisabled(false);
    focusInput();
  }
}

function appendLocalMessage(text, who) {
  const container = document.getElementById("messages");
  const bubble = createMessageBubble(text, who);
  container.appendChild(bubble);
  // scroll
  container.scrollTop = container.scrollHeight;
}

function showStatus(txt) {
  const s = document.getElementById("status");
  s.textContent = txt || "";
}

function setInputDisabled(disabled) {
  const input = document.getElementById("messageInput");
  const btn = document.getElementById("sendBtn");
  input.disabled = disabled;
  btn.disabled = disabled;
}

function focusInput() {
  const input = document.getElementById("messageInput");
  input.focus();
}

function fallbackSpeak(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    // you can set voice/lang here if desired
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn("SpeechSynthesis failed:", e);
  }
}

function setAvatarHeader(avatar) {
  const nameEl = document.getElementById("avatarName");
  const metaEl = document.getElementById("avatarMeta");
  nameEl.textContent = avatar.name || "Avatar";
  const vc = avatar.voice_characteristics || {};
  const pc = avatar.personality_traits || {};
  metaEl.textContent = `Voice: ${vc.gender || '?'} • ${vc.tone || '?'} • speed ${vc.speed || 1}  ·  Style: ${pc.formality || '?'}`;
}

/* --- initialize widget DOM & handlers --- */
document.addEventListener("DOMContentLoaded", () => {
  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("messageInput");
  const form = document.getElementById("chatForm");
  const previewAvatarId = document.body.dataset.avatarId || null;

  // initial header (will be overridden when server returns avatar)
  setAvatarHeader({ name: "Preview Avatar", voice_characteristics: { gender: "female", tone: "warm_friendly", speed: 1 }, personality_traits: { formality: "professional" }});

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    sendMessage(previewAvatarId, text);
    input.value = "";
  });

  sendBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    sendMessage(previewAvatarId, text);
    input.value = "";
  });

  focusInput();
});
