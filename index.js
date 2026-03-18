/* Pastel — Local-first text cleaner + optional OpenAI processing
   Vanilla JS, no backend. */

const STORAGE = {
  theme: "pastel.theme", // light|dark|system
  mode: "pastel.mode", // standard|ai
  action: "pastel.action", // humanize|simplify|rewrite|shorten|fix_grammar
  apiKey: "pastel.openai.key",
  apiKeyState: "pastel.openai.keyState", // missing|valid|invalid
};

const DEFAULTS = {
  theme: "system",
  mode: "standard",
  action: "humanize",
  model: "gpt-4o-mini",
};

const PROMPTS = {
  humanize:
    "Rewrite the following text to sound natural, human, and conversational. Remove robotic phrasing, awkward structure, and overly formal tone. Keep it clear, simple, and easy to read.",
  simplify:
    "Simplify the following text so that it is easy to understand for a general audience. Break down complex sentences, remove jargon, and improve clarity.",
  rewrite:
    "Rewrite the following text to improve clarity, flow, and readability while preserving the original meaning.",
  shorten:
    "Make the following text more concise. Remove unnecessary words, redundancy, and fluff while keeping the key message intact.",
  fix_grammar:
    "Correct grammar, spelling, and punctuation in the following text while preserving its tone and meaning.",
};

const OUTPUT_RULES =
  "Output rules: Return ONLY the processed text. Do not add explanations. Do not prefix with any lead-in. Preserve formatting where possible. Avoid em dashes (—) and en dashes (–); use commas, semicolons, or periods instead.";

const el = {
  app: document.getElementById("app"),

  themeBtns: Array.from(document.querySelectorAll(".segmented__btn")),

  modePill: document.querySelector(".modePill"),
  modeStandard: document.getElementById("modeStandard"),
  modeAI: document.getElementById("modeAI"),
  aiPanel: document.getElementById("aiPanel"),

  actionBtns: Array.from(document.querySelectorAll(".pillRow .pill")),

  apiKeyInput: document.getElementById("apiKeyInput"),
  toggleKeyVisibility: document.getElementById("toggleKeyVisibility"),
  btnTestKey: document.getElementById("btnTestKey"),
  btnSaveKey: document.getElementById("btnSaveKey"),
  keyStatus: document.getElementById("keyStatus"),
  keyMsg: document.getElementById("keyMsg"),

  inputText: document.getElementById("inputText"),
  outputText: document.getElementById("outputText"),
  btnCopy: document.getElementById("btnCopy"),
  btnProcess: document.getElementById("btnProcess"),
  spinner: document.getElementById("spinner"),
  inlineError: document.getElementById("inlineError"),

  inCount: document.getElementById("inCount"),

};

let state = {
  theme: DEFAULTS.theme,
  mode: DEFAULTS.mode,
  action: DEFAULTS.action,
  apiKey: "",
  apiKeyState: "missing",
  processing: false,
};

function safeGet(key, fallback = "") {
  try {
    const v = localStorage.getItem(key);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function setInlineError(msg = "") {
  el.inlineError.textContent = msg;
}

function setKeyMessage(msg = "", kind = "") {
  el.keyMsg.textContent = msg;
  el.keyMsg.style.color =
    kind === "good"
      ? "var(--good)"
      : kind === "bad"
        ? "var(--bad)"
        : "var(--muted)";
}

function setOutput(text) {
  el.outputText.innerHTML = "";
  if (!text || !String(text).trim()) {
    const ph = document.createElement("div");
    ph.className = "output__placeholder";
    ph.textContent = "Cleaned text will appear here.";
    el.outputText.appendChild(ph);
    return;
  }

  el.outputText.textContent = text;
}

function setLoading(isLoading) {
  state.processing = isLoading;
  el.btnProcess.disabled = isLoading;
  el.btnCopy.disabled = isLoading;
  el.btnTestKey.disabled = isLoading;
  el.btnSaveKey.disabled = isLoading;

  for (const b of el.actionBtns) b.disabled = isLoading;
  el.modeStandard.disabled = isLoading;
  el.modeAI.disabled = isLoading;

  el.btnProcess.classList.toggle("is-loading", isLoading);
  if (isLoading) {
    setInlineError("");
  }
}

// ---------------------- Theme ----------------------

function initTheme() {
  const saved = safeGet(STORAGE.theme, DEFAULTS.theme);
  state.theme = ["light", "dark", "system"].includes(saved) ? saved : DEFAULTS.theme;

  applyTheme(state.theme, { announce: false });
  syncThemeUI();

  // React to OS theme changes only when in system mode.
  const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
  mq?.addEventListener?.("change", () => {
    if (state.theme === "system") applyTheme("system");
  });
}

function applyTheme(theme, { announce = true } = {}) {
  document.documentElement.classList.add("themeTransition");
  window.setTimeout(() => document.documentElement.classList.remove("themeTransition"), 220);

  const resolved =
    theme === "system" ? (prefersDark() ? "dark" : "light") : theme;

  document.documentElement.setAttribute("data-theme", resolved);
  state.theme = theme;
  safeSet(STORAGE.theme, theme);

  if (announce) {
    // small, quiet acknowledgement in status bar
    setInlineError("");
  }

  syncThemeUI();
}

function prefersDark() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function toggleTheme(theme) {
  applyTheme(theme);
}

function syncThemeUI() {
  for (const btn of el.themeBtns) {
    const t = btn.getAttribute("data-theme");
    btn.setAttribute("aria-checked", String(t === state.theme));
  }
}

// ---------------------- Mode + action ----------------------

function initMode() {
  const savedMode = safeGet(STORAGE.mode, DEFAULTS.mode);
  state.mode = savedMode === "ai" ? "ai" : "standard";

  const savedAction = safeGet(STORAGE.action, DEFAULTS.action);
  state.action = PROMPTS[savedAction] ? savedAction : DEFAULTS.action;

  applyMode(state.mode);
  applyAction(state.action);
}

function handleModeSwitch(mode) {
  if (mode !== "standard" && mode !== "ai") return;
  applyMode(mode);
  safeSet(STORAGE.mode, mode);
}

function applyMode(mode) {
  state.mode = mode;

  el.modePill?.setAttribute("data-mode", mode);

  el.modeStandard.classList.toggle("is-active", mode === "standard");
  el.modeAI.classList.toggle("is-active", mode === "ai");
  el.modeStandard.setAttribute("aria-selected", String(mode === "standard"));
  el.modeAI.setAttribute("aria-selected", String(mode === "ai"));

  el.aiPanel.hidden = mode !== "ai";

  // In AI mode: if key missing/invalid, show empty state in output.
  if (mode === "ai" && !hasValidKey()) {
    showEmptyState();
  } else {
    // restore placeholder only if output is empty
    if (!getOutputText().trim()) setOutput("");
  }
}

function handleActionSelect(action) {
  if (!PROMPTS[action]) return;
  applyAction(action);
  safeSet(STORAGE.action, action);
}

function applyAction(action) {
  state.action = action;
  for (const b of el.actionBtns) {
    const active = b.dataset.action === action;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", String(active));
  }
}

// ---------------------- API key ----------------------

function initAPIKey() {
  const savedKey = safeGet(STORAGE.apiKey, "");
  const savedState = safeGet(STORAGE.apiKeyState, "missing");

  state.apiKey = savedKey;
  state.apiKeyState = ["missing", "valid", "invalid"].includes(savedState)
    ? savedState
    : "missing";

  if (state.apiKey) {
    el.apiKeyInput.value = state.apiKey;
  }

  // If there's a stored key but no stored verdict, mark as "Not added" until tested.
  // If a key exists but hasn't been tested, keep state as "missing" (Not added) until Test Key.

  syncKeyStatus();
}

function handleAPIKeySave() {
  const k = (el.apiKeyInput.value || "").trim();
  state.apiKey = k;

  if (!k) {
    safeSet(STORAGE.apiKey, "");
    safeSet(STORAGE.apiKeyState, "missing");
    state.apiKeyState = "missing";
    syncKeyStatus();
    setKeyMessage("Key cleared.");
    if (state.mode === "ai") showEmptyState();
    return;
  }

  safeSet(STORAGE.apiKey, k);
  // Don't claim validity before testing.
  state.apiKeyState = "missing";
  safeSet(STORAGE.apiKeyState, state.apiKeyState);
  syncKeyStatus();
  setKeyMessage("Saved. Click ‘Test Key’ to verify.");
  if (state.mode === "ai") showEmptyState();
}

function syncKeyStatus() {
  const dot = el.keyStatus.querySelector(".statusDot");
  const text = el.keyStatus.querySelector(".statusText");

  const hasKey = Boolean((state.apiKey || "").trim());
  if (!hasKey) {
    state.apiKeyState = "missing";
  }

  const s = state.apiKeyState;
  dot.dataset.state = s;

  if (s === "valid") text.textContent = "Valid";
  else if (s === "invalid") text.textContent = hasKey ? "Invalid" : "Not added";
  else text.textContent = "Not added";
}

function hasValidKey() {
  const hasKey = Boolean((state.apiKey || "").trim());
  return hasKey && state.apiKeyState === "valid";
}

async function testAPIKey() {
  const k = (el.apiKeyInput.value || "").trim();
  if (!k) {
    setKeyMessage("Add a key first.", "bad");
    state.apiKeyState = "missing";
    safeSet(STORAGE.apiKeyState, "missing");
    syncKeyStatus();
    if (state.mode === "ai") showEmptyState();
    return;
  }

  setLoading(true);
  setKeyMessage("Testing…");

  try {
    const out = await callOpenAI({
      apiKey: k,
      system:
        "You are a minimal connectivity check. Reply with exactly: ok (lowercase).",
      user: "ok",
      maxOutputTokens: 16,
      temperature: 0,
    });

    const ok = (out || "").trim().toLowerCase() === "ok";
    if (!ok) {
      throw new Error("Unexpected response from API.");
    }

    state.apiKey = k;
    safeSet(STORAGE.apiKey, k);

    state.apiKeyState = "valid";
    safeSet(STORAGE.apiKeyState, "valid");
    syncKeyStatus();
    setKeyMessage("API key working.", "good");

    if (state.mode === "ai") setOutput("");
  } catch (err) {
    state.apiKeyState = "invalid";
    safeSet(STORAGE.apiKeyState, "invalid");
    syncKeyStatus();

    setKeyMessage(humanError(err), "bad");
    if (state.mode === "ai") showEmptyState();
  } finally {
    setLoading(false);
  }
}

function showEmptyState() {
  setOutput("Please add and test your API key to use AI features.");
}

function getOutputText() {
  return el.outputText.textContent || "";
}

// ---------------------- Processing ----------------------

function normalizeDashes(text) {
  // Converts em/en dashes and double-hyphens into comma separators.
  // Intentionally leaves normal hyphens alone.
  return String(text).replace(/\s*(?:--|—|–)\s*/g, ", ");
}

function localClean(text) {
  if (!text) return "";
  let t = String(text);

  // Normalize line endings
  t = t.replace(/\r\n?/g, "\n");

  // Standard mode intentionally avoids stylistic dashes.
  t = normalizeDashes(t);

  // Trim each line + collapse excessive inner whitespace
  t = t
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n");

  // Collapse 3+ blank lines to max 2
  t = t.replace(/\n{3,}/g, "\n\n");

  // Normalize spaces around punctuation
  t = t
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])(?!\s|\n|$)/g, "$1 ");

  // Clean up any accidental duplicate commas from dash replacement
  t = t.replace(/,\s*(,\s*)+/g, ", ");

  // Fix duplicated punctuation like "!!" or "??" (do not rewrite dashes/ellipses)
  t = t
    .replace(/!{2,}/g, "!")
    .replace(/\?{2,}/g, "?");

  // Final trim
  t = t.trim();

  return t;
}

async function processText() {
  const input = (el.inputText.value || "").trim();
  if (!input) {
    setInlineError("Paste some text to process.");
    return;
  }

  setInlineError("");

  if (state.mode === "standard") {
    setLoading(true);
    try {
      // tiny delay for perceived responsiveness
      await sleep(90);
      const cleaned = localClean(input);
      setOutput(cleaned);
    } finally {
      setLoading(false);
    }
    return;
  }

  // AI mode
  if (!hasValidKey()) {
    showEmptyState();
    setInlineError("Please add and test your API key to use AI features.");
    return;
  }

  const action = state.action;
  const base = PROMPTS[action];
  if (!base) {
    setInlineError("Pick an action.");
    return;
  }

  setLoading(true);

  try {
    const system =
      "You transform AI-generated text into clean, natural, human-like writing. " +
      "Follow instructions exactly.";

    const user =
      `${base}\n\n${OUTPUT_RULES}\n\nText to process:\n` + input;

    const out = await callOpenAI({
      apiKey: state.apiKey,
      system,
      user,
      maxOutputTokens: 900,
      temperature: 0.4,
    });

    let cleaned = (out || "").trim();
    if (!cleaned) throw new Error("Empty output received.");

    // Apply the same dash normalization in AI mode for consistent output.
    cleaned = normalizeDashes(cleaned);

    setOutput(cleaned);
  } catch (err) {
    const msg = humanError(err);
    setInlineError(msg);
  } finally {
    setLoading(false);
  }
}

// ---------------------- OpenAI (Responses API) ----------------------

async function callOpenAI({
  apiKey,
  system,
  user,
  maxOutputTokens = 800,
  temperature = 0.4,
}) {
  // Uses the OpenAI Responses API.
  // Docs: https://platform.openai.com/docs/api-reference/responses

  const url = "https://api.openai.com/v1/responses";

  const body = {
    model: DEFAULTS.model,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: system }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: user }],
      },
    ],
    max_output_tokens: maxOutputTokens,
    temperature,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  let json;
  try {
    json = await res.json();
  } catch {
    // If non-JSON, surface status
    if (!res.ok) {
      throw new Error(`Request failed (${res.status}).`);
    }
    throw new Error("Unexpected API response.");
  }

  if (!res.ok) {
    const message =
      json?.error?.message ||
      json?.message ||
      `Request failed (${res.status}).`;
    const code = json?.error?.code ? ` (${json.error.code})` : "";
    throw new Error(`${message}${code}`);
  }

  const text = extractResponseText(json);
  return text;
}

function extractResponseText(json) {
  // Prefer output_text if present.
  if (typeof json?.output_text === "string") return json.output_text;

  // Otherwise, walk output[] and concatenate any text chunks.
  const out = json?.output;
  if (!Array.isArray(out)) return "";

  const parts = [];
  for (const item of out) {
    const content = item?.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (c?.type === "output_text" && typeof c?.text === "string") {
        parts.push(c.text);
      }
      if (c?.type === "text" && typeof c?.text === "string") {
        parts.push(c.text);
      }
    }
  }
  return parts.join("").trim();
}

function humanError(err) {
  const msg = (err && err.message) ? String(err.message) : "Something went wrong.";

  // Slightly nicer guidance for common cases.
  if (/401|unauthorized|invalid api key/i.test(msg)) {
    return "Invalid API key. Please verify and test again.";
  }
  if (/cors/i.test(msg)) {
    return "This browser blocked the request (CORS). Try a different browser or run from a local server.";
  }
  if (/network/i.test(msg) || /failed to fetch/i.test(msg)) {
    return "Network error. Check your connection and try again.";
  }
  return msg;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------- Copy / misc ----------------------

async function copyOutput() {
  const text = getOutputText().trim();
  if (!text || text === "Cleaned text will appear here." || text.includes("Please add and test")) {
    setInlineError("Nothing to copy yet.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setInlineError("Copied.");
    window.setTimeout(() => setInlineError(""), 900);
  } catch {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    setInlineError("Copied.");
    window.setTimeout(() => setInlineError(""), 900);
  }
}

function updateCounts() {
  el.inCount.textContent = String((el.inputText.value || "").length);
}


// ---------------------- Init + events ----------------------

function wireEvents() {
  // Theme
  for (const btn of el.themeBtns) {
    btn.addEventListener("click", () => toggleTheme(btn.dataset.theme));
  }

  // Mode
  el.modeStandard.addEventListener("click", () => handleModeSwitch("standard"));
  el.modeAI.addEventListener("click", () => handleModeSwitch("ai"));

  // Actions
  for (const b of el.actionBtns) {
    b.addEventListener("click", () => handleActionSelect(b.dataset.action));
  }

  // API key
  el.btnSaveKey.addEventListener("click", handleAPIKeySave);
  el.btnTestKey.addEventListener("click", testAPIKey);

  el.toggleKeyVisibility.addEventListener("click", () => {
    const isPassword = el.apiKeyInput.type === "password";
    el.apiKeyInput.type = isPassword ? "text" : "password";
    el.toggleKeyVisibility.textContent = isPassword ? "Hide" : "Show";
  });

  // Workspace
  el.btnProcess.addEventListener("click", processText);
  el.btnCopy.addEventListener("click", copyOutput);

  el.inputText.addEventListener("input", () => {
    updateCounts();
    // Keep empty state visible if AI and key missing
    if (state.mode === "ai" && !hasValidKey()) showEmptyState();
  });

  // Keyboard: cmd/ctrl+enter to process
  el.inputText.addEventListener("keydown", (e) => {
    const cmdEnter = (e.ctrlKey || e.metaKey) && e.key === "Enter";
    if (cmdEnter) {
      e.preventDefault();
      processText();
    }
  });

}

function boot() {
  initTheme();
  initMode();
  initAPIKey();
  updateCounts();

  // If AI mode but no valid key, show empty state.
  if (state.mode === "ai" && !hasValidKey()) showEmptyState();

  wireEvents();
  setOutput("");
}

boot();
