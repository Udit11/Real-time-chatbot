// chat-widget/main.js
// Minimal chat widget client — vanilla JS
// Uses server-side TTS only (no browser Web Speech API)

const API_BASE = window.API_BASE || "";
const GENERATE_URL = `${API_BASE}/api/chat/generate`;

// ===== DECODE CONFIG IMMEDIATELY =====
let AVATAR_CONFIG = null;

function decodeConfigFromURL() {
  try {
    const params = new URLSearchParams(window.location.search);
    const configParam = params.get('config');
    if (!configParam) {
      console.log('[decodeConfigFromURL] No config param in URL');
      return null;
    }

    console.log('[decodeConfigFromURL] Found config param, decoding...');
    const decoded = atob(decodeURIComponent(configParam));
    const json = decodeURIComponent(escape(decoded));
    const parsed = JSON.parse(json);
    
    console.log('[decodeConfigFromURL] SUCCESS! Decoded config:', parsed);
    console.log('[decodeConfigFromURL] Gender:', parsed.voice_characteristics?.gender);
    
    // Set both global and window for compatibility
    AVATAR_CONFIG = parsed;
    window.avatarConfig = parsed;
    
    return parsed;
  } catch (err) {
    console.error('[decodeConfigFromURL] FAILED to decode:', err);
    return null;
  }
}

// Decode IMMEDIATELY on page load
AVATAR_CONFIG = decodeConfigFromURL();

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
    // Get gender - try multiple fallback paths
    let gender = null;
    
    if (AVATAR_CONFIG?.voice_characteristics?.gender) {
      gender = AVATAR_CONFIG.voice_characteristics.gender;
      console.log('[sendMessage] Got gender from AVATAR_CONFIG.voice_characteristics.gender:', gender);
    } else if (AVATAR_CONFIG?.gender) {
      gender = AVATAR_CONFIG.gender;
      console.log('[sendMessage] Got gender from AVATAR_CONFIG.gender:', gender);
    }
    
    console.log('[sendMessage] Final gender value:', gender);
    console.log('[sendMessage] Full AVATAR_CONFIG:', JSON.stringify(AVATAR_CONFIG, null, 2));

    const requestPayload = {
      avatar_id: avatarId,
      messages: [{ role: "user", content: messageText }],
      voice_gender: gender  // Send the gender!
    };

    console.log('[sendMessage] Sending payload:', JSON.stringify(requestPayload));

    const resp = await fetch(GENERATE_URL, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(requestPayload)
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

    // Server MUST provide audio_base64 with correct gender-based voice
    if (data.audio_base64) {
      try {
        const audio = new Audio('data:audio/mp3;base64,' + data.audio_base64);
        audio.onended = () => {
          console.log('[audio] Playback ended');
        };
        audio.onerror = (err) => {
          console.error('[audio] Playback error:', err);
          showStatus("Audio playback failed");
        };
        await audio.play();
      } catch (e) {
        console.error("Audio playback failed:", e);
        showStatus("Audio playback error: " + e.message);
      }
    } else {
      console.warn("Server did not provide audio_base64");
      showStatus("No audio provided by server");
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
  let previewAvatarId = null;

  console.log('[DOMContentLoaded] AVATAR_CONFIG at DOM ready:', AVATAR_CONFIG);

  // Use AVATAR_CONFIG that was decoded at page load
  if (AVATAR_CONFIG) {
    previewAvatarId = AVATAR_CONFIG.id;
    console.log('[DOMContentLoaded] Avatar ID:', previewAvatarId);
    console.log('[DOMContentLoaded] Avatar gender:', AVATAR_CONFIG.voice_characteristics?.gender);
  } else {
    console.log('[DOMContentLoaded] No AVATAR_CONFIG found');
  }

  // initial header
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
