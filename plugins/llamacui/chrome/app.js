// Llama.cui side panel — standalone chat client
// Talks directly to Ollama (HTTP streaming), the Hive document server
// (optional) and Exa web search. No llama.cui server, no login required.
// All settings live in browser.storage.local and are edited in the panel.

const $ = (id) => document.getElementById(id);

// Persona default — same text the llama.cui server ships in Alice.txt.
const DEFAULT_SYSTEM_PROMPT =
  "Role and Purpose: You are Alice, a large language model. Your purpose is to assist users by providing information, answering questions, and engaging in meaningful conversations based on the data you were trained on.\n" +
  "Behavior and Tone: Be informative, engaging, and respectful. Maintain a neutral and unbiased tone. Ensure that responses are clear and concise.\n" +
  "Capabilities: Use your training data to provide accurate and relevant information. Explain complex concepts in an easy-to-understand manner. Provide sources when referencing specific information or data.\n" +
  "Output Formatting: Use /n/n```language /n``` formatting for programming code.";

const DEFAULTS = {
  ollamaUrl: "http://localhost:11434",
  model: "",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  temperature: 0.7,
  topP: 0.9,
  keepAlive: "1h", // Ollama keep_alive: seconds or "30m"/"1h"/"24h"
  numDraft: 3,
  speculativeType: "draft-mtp",
  thinking: "low", // "" = off
  showThinking: true,
  historyLimit: 30,
  historyMaxChars: 32000,
  hiveUrl: "http://localhost:3030", // blank = document search disabled
  hiveUser: "",
  hivePass: "",
  hiveDb: "*", // "*" = all accessible databases
  exaKey: "", // optional; keyless endpoint by default
  webResults: 5,
  voiceLoop: true, // keep listening after each spoken reply (continuous mode)
  ttsSource: "model", // "model" = lfm3-audio /v1/audio/speech, "browser" = speechSynthesis
  ttsModelVoice: "female", // female | male | <gender>-<language>
  ttsVoice: "", // browser mode: speechSynthesis voiceURI; "" = default
  ttsRate: 1.0, // browser mode: speaking rate
};

const state = {
  cfg: { ...DEFAULTS },
  currentChat: "",
  messageId: "",
  bufferText: "",
  currentTile: {},
  lastBotTile: null,
  userScrolled: false,
  generating: false,
  pendingReplace: null, // { replace, mode, label } — what to do with the reply: "replace" the selection, or "insert-top" into the reply box
  abort: null, // AbortController for the in-flight Ollama request
  genStart: 0,
  genTokens: 0,
  lastEval: 0,
  doneInfo: null, // final Ollama chunk (eval_count / eval_duration)
};

// True while the user is dragging to select text: the per-chunk innerHTML
// re-render and auto-scroll would destroy the selection, so streaming DOM
// updates are frozen until the mouse is released.
let selecting = false;
let frozenRender = false; // a re-render was skipped because of `selecting`

const EXAM_PROMPT =
  "Answer these quickly:\n" +
  "1) Which is larger, 9.11 or 9.9?\n" +
  "2) Solve 3y = 6y + 11 for y.\n" +
  "3) Name the products of salicylic acid + acetic anhydride.";

// ─────────────── markdown setup ───────────────
function makeMarkdown() {
  const md = window.markdownit({
    breaks: true,
    linkify: true,
    typographer: false,
    highlight: (str, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(str, { language: lang }).value;
        } catch (e) {}
      }
      return hljs.highlightAuto(str).value;
    },
  });

  // Collapsible thinking blocks (Qwen3 reasoning models).
  md.block.ruler.before("fence", "think_block", (state, startLine, endLine, silent) => {
    const startPos = state.bMarks[startLine] + state.tShift[startLine];
    const maxPos = state.eMarks[startLine];
    if (state.src.slice(startPos, maxPos).trim() !== "<think>") return false;
    let next = startLine + 1;
    let found = false;
    const content = [];
    while (next < endLine) {
      const s = state.bMarks[next] + state.tShift[next];
      const e = state.eMarks[next];
      const line = state.src.slice(s, e).trim();
      if (line.endsWith("</think>")) {
        const rest = line.slice(0, -"</think>".length).trim();
        if (rest) content.push(rest);
        found = true; break;
      }
      content.push(state.src.slice(s, e));
      next++;
    }
    if (!found) next = endLine;
    if (silent) return true;
    state.line = found ? next + 1 : next;
    const token = state.push("think_block", "div", 0);
    token.content = content.join("\n");
    token.inProgress = !found;
    token.block = true;
    return true;
  });
  md.renderer.rules.think_block = (tokens, idx) => {
    const t = tokens[idx];
    const body = md.render(t.content);
    const label = t.inProgress ? "Thinking…" : "Thinking";
    const cls = t.inProgress ? "think-block thinking" : "think-block";
    return (
       `<details class="${cls}" open>` +
       `<summary class="think-header"><i class="fas fa-brain think-icon"></i>` +
       `<span>${label}</span></summary>` +
       `<div class="think-body">${body}</div></details>\n`
    );
  };

  // Copy button on code fences.
  const defaultFence = md.renderer.rules.fence || function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const lang = tokens[idx].info ? tokens[idx].info.trim().split(/\s+/)[0] : "";
    const code = tokens[idx].content;
    let html;
    if (lang && hljs.getLanguage(lang)) {
      try { html = hljs.highlight(code, { language: lang }).value; } catch (e) { html = md.utils.escapeHtml(code); }
    } else {
      html = md.utils.escapeHtml(code);
    }
    return (
      `<div class="code-block-wrapper"><button class="copycode" ` +
      `data-code="${encodeURIComponent(code)}"><i class="fas fa-copy"></i> copy</button>` +
      `<pre class="hljs"><code>${html}</code></pre></div>`
    );
  };

  return md;
}
const md = makeMarkdown();

function renderMarkdown(text) {
  return md.render(text || "");
}

// Strip thinking blocks so stored/replayed text is clean prose.
function stripThinking(text) {
  return (text || "").replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trim();
}

// ─────────────── settings (browser.storage.local) ───────────────
async function loadConfig() {
  try {
    const stored = await browser.storage.local.get("llcuiConfig");
    state.cfg = { ...DEFAULTS, ...(stored.llcuiConfig || {}) };
  } catch (e) {
    state.cfg = { ...DEFAULTS };
  }
}
function saveConfig() {
  return browser.storage.local.set({ llcuiConfig: state.cfg });
}

// ─────────────── Ollama client ───────────────
const base = (url) => (url || "").replace(/\/+$/, "");

// Returns full model entries ({ name, capabilities, ... }) — capabilities
// is what the voice feature checks ("audio") to find a usable model.
async function ollamaTags() {
  const res = await fetch(base(state.cfg.ollamaUrl) + "/api/tags");
  if (!res.ok) throw new Error(`Ollama API error: ${res.status}`);
  const data = await res.json();
  return data.models || [];
}

async function refreshModels() {
  const select = $("modelselect");
  const icon = $("modelicon");
  try {
    const models = (await ollamaTags()).map((m) => m.name);
    setConn(true);
    if (models.length === 0) { select.style.display = "none"; icon.style.display = "none"; return; }
    // No model chosen yet, or the configured one no longer exists — default
    // to the first available so the first message works out of the box.
    if (!models.includes(state.cfg.model)) {
      state.cfg.model = models[0];
      saveConfig();
    }
    const current = state.cfg.model;
    select.style.display = "";
    icon.style.display = "";
    select.innerHTML = models
      .map((m) => `<option value="${m}"${m === current ? " selected" : ""}>${m}</option>`)
      .join("");
  } catch (e) {
    setConn(false);
  }
}

// Stream a chat completion. Calls paintTile() per chunk; resolves with the
// final Ollama chunk (done: true) stored in state.doneInfo.
async function streamOllama(messages) {
  const cfg = state.cfg;
  const controller = new AbortController();
  state.abort = controller;

  const res = await fetch(base(cfg.ollamaUrl) + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      stream: true,
      temperature: cfg.temperature,
      top_p: cfg.topP,
      keep_alive: cfg.keepAlive,
      options: {
        ...(cfg.numDraft ? { num_draft: cfg.numDraft } : {}),
        ...(cfg.speculativeType ? { speculative_type: cfg.speculativeType } : {}),
        ...(cfg.thinking ? { thinking: cfg.thinking } : {}),
      },
    }),
    signal: controller.signal,
  });
  if (!res.ok) {
    // Include the body: it reveals WHO is refusing — Ollama answers with
    // JSON, a proxy or content blocker usually answers with an HTML page.
    let detail = "";
    try { detail = (await res.text() || "").slice(0, 300).trim(); } catch (e) {}
    throw new Error(
      `Ollama API error: ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const showThinking = cfg.showThinking;
  let buffer = "";
  let thinkingStarted = false;
  let thinkingClosed = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep partial line
    for (const line of lines) {
      if (!line.trim()) continue;
      let parsed;
      try { parsed = JSON.parse(line); } catch (e) { continue; }
      if (parsed.error) throw new Error(parsed.error);
      const msg = parsed.message;
      if (!msg) continue;
      if (msg.thinking || msg.content) {
        const ec = typeof parsed.eval_count === "number" ? parsed.eval_count : 0;
        const delta = ec - state.lastEval;
        state.lastEval = ec;
        state.genTokens += delta > 0 ? delta : 1;
        if (showThinking && msg.thinking) {
          if (!thinkingStarted) { state.bufferText += "<think>\n"; thinkingStarted = true; }
          state.bufferText += msg.thinking;
        }
        if (msg.content) {
          if (showThinking && thinkingStarted && !thinkingClosed) {
            state.bufferText += "\n</think>\n\n";
            thinkingClosed = true;
          }
          state.bufferText += msg.content;
        }
        paintTile();
        emitStats(true);
      }
      if (parsed.done) state.doneInfo = parsed;
    }
  }
}

// ─────────────── Hive document search client ───────────────
let hiveLoggedIn = false;

// Session login. The Hive server answers XHR logins with JSON { success }
// and sets an httpOnly session cookie, which fetch sends automatically
// (credentials: "include" on every call below).
async function hiveLogin(url, username, password) {
  const res = await fetch(base(url) + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify({ username: username || "", password: password || "" }),
    credentials: "include",
  });
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  if (!isJson) throw new Error("invalid credentials");
  const data = await res.json().catch(() => ({}));
  if (data.success !== true) throw new Error("invalid credentials");
  hiveLoggedIn = true;
}

async function hiveFetch(path, options = {}) {
  const url = base(state.cfg.hiveUrl);
  const doFetch = () => fetch(url + path, { ...options, credentials: "include" });
  let res = await doFetch();
  if (res.status === 401 || res.status === 403 || res.status === 302) {
    // Session expired (or cookie not retained) — log in once and retry.
    await hiveLogin(state.cfg.hiveUrl, state.cfg.hiveUser, state.cfg.hivePass);
    res = await doFetch();
  }
  return res;
}

async function searchHive(query) {
  const cfg = state.cfg;
  await hiveLogin(cfg.hiveUrl, cfg.hiveUser, cfg.hivePass);
  const res = await hiveFetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, dbName: cfg.hiveDb || "*", searchType: "text" }),
  });
  if (!res.ok) throw new Error(`Hive search error: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .map((r) => {
      const m = (r.document && r.document.meta) || {};
      return {
        source: "hive",
        title: m.title || (m.href ? m.href.split("/").pop() : "document"),
        href: m.href || "",
        content: m.content || "",
      };
    })
    .filter((r) => r.content || r.href);
}

// ─────────────── Exa web search client ───────────────
// Same MCP-over-HTTP call the llama.cui server makes (src/exa.js): a JSON-RPC
// tools/call to the hosted Exa endpoint. Works keyless; a key raises limits.
async function searchWeb(query) {
  const cfg = state.cfg;
  const url = cfg.exaKey
    ? `https://mcp.exa.ai/mcp?exaApiKey=${encodeURIComponent(cfg.exaKey)}`
    : "https://mcp.exa.ai/mcp";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "web_search_exa",
        arguments: {
          query,
          type: "auto",
          numResults: cfg.webResults || 5,
          livecrawl: "fallback",
          contextMaxCharacters: 2000,
        },
      },
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`Exa error: ${res.status}`);
  const text = extractMcpText(await res.text());
  if (!text || !text.trim()) return [];
  return parseExaResults(text).map((r) => ({ ...r, source: "web" }));
}

// Response is either direct JSON or an SSE stream of `data: {...}` lines.
function extractMcpText(raw) {
  const tryParse = (s) => {
    const data = JSON.parse(s);
    const item = (data.result?.content || []).find((c) => c.text);
    return item ? item.text : null;
  };
  try { const t = tryParse(raw); if (t) return t; } catch (_) {}
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try { const t = tryParse(line.slice(6)); if (t) return t; } catch (_) {}
  }
  return null;
}

// Parse the "Title:/URL:...\n---\nTitle:..." blob into structured results.
function parseExaResults(text) {
  const results = [];
  for (const block of text.split(/\n-{3,}\n/)) {
    const r = {};
    let highlights = [];
    let inHighlights = false;
    for (const line of block.split("\n")) {
      if (line.startsWith("Title:")) r.title = line.slice(6).trim();
      else if (line.startsWith("URL:")) r.href = line.slice(4).trim();
      else if (line.startsWith("Published:")) r.published = line.slice(10).trim();
      else if (line.startsWith("Author:")) r.author = line.slice(7).trim();
      else if (line.startsWith("Highlights:")) inHighlights = true;
      else if (inHighlights && line.trim()) highlights.push(line.trim());
    }
    r.content = highlights.join(" ");
    if (r.href) results.push(r);
  }
  return results;
}

// ─────────────── context (RAG) ───────────────
// Run the enabled searches in parallel; failures are non-fatal.
async function gatherContext(query) {
  const jobs = [];
  if ($("webembedcheck").checked) jobs.push(searchWeb(query));
  if ($("embedcheck").checked && state.cfg.hiveUrl) jobs.push(searchHive(query));
  if (!jobs.length) return [];
  const settled = await Promise.allSettled(jobs);
  return settled.flatMap((r) => (r.status === "fulfilled" ? r.value : [])).slice(0, 5);
}

// Format results into the context block appended to the user prompt
// (same "Context: '...'" convention the llama.cui server used).
function buildContextText(results) {
  const MAX = 16000;
  let out = "";
  for (const r of results) {
    const head = r.title ? (r.href ? `${r.title} (${r.href})` : r.title) : r.href;
    const block = `${head ? `[${head}]
` : ""}${(r.content || "").slice(0, 2000)}`;
    if (out && out.length + block.length > MAX) break;
    out = out ? out + "\n\n" + block : block;
  }
  return out.trim();
}

// ─────────────── connection status ───────────────
function setConn(on) {
  state.connOnline = on;
  const el = $("conn");
  const label = $("conn-label");
  el.classList.remove("on", "off");
  el.classList.add(on ? "on" : "off");
  label.textContent = on ? "online" : "offline";
}

// ─────────────── tiles ───────────────
function hideEmpty() {
  const e = $("emptyChat");
  if (e) e.style.display = "none";
}

function createTile(content, tileClass, embed = []) {
  hideEmpty();
  const tile = document.createElement("div");
  tile.className = tileClass;
  const header = document.createElement("div");
  header.className = "tileheader";

  const who = document.createElement("span");
  who.className = "who";
  who.innerHTML = tileClass === "user-tile"
    ? '<i class="fas fa-user userstyle"></i>'
    : '<i class="fas fa-robot robotstyle"></i>';
  header.appendChild(who);

  if (tileClass === "user-tile") {
    const reload = document.createElement("button");
    reload.className = "headerbutton";
    reload.title = "Resend";
    reload.innerHTML = '<i class="fas fa-sync"></i>';
    reload.onclick = () => { $("messageInput").value = tile.querySelector(".tilebody").textContent.trim(); };
    header.appendChild(reload);
  }

  const copy = document.createElement("button");
  copy.className = "headerbutton copy-tile";
  copy.title = "Copy";
  copy.innerHTML = '<i class="fas fa-copy"></i>';
  header.appendChild(copy);

  tile.appendChild(header);

  if (tileClass === "bot-tile" && embed.length > 0) {
    const embedEl = document.createElement("div");
    embedEl.className = "embedding";
    embedEl.title = "Double click to expand";
    embedEl.ondblclick = () => {
      embedEl.style.maxHeight = embedEl.style.maxHeight === "40px" ? "none" : "40px";
      embedEl.style.overflow = embedEl.style.maxHeight === "none" ? "visible" : "hidden";
    };
    embed.slice(0, 5).forEach((r) => embedEl.appendChild(embedCard(r)));
    tile.appendChild(embedEl);
  }

  const body = document.createElement("div");
  body.className = "tilebody";
  body.innerHTML = content;
  tile.appendChild(body);

  $("chatMessages").appendChild(tile);
  state.currentTile = body;
}

function createBotTile(content, embed) { createTile(content, "bot-tile", embed); }
function createUserTile(content) { createTile(content, "user-tile"); }

function embedCard(result) {
  const card = document.createElement("div");
  card.className = "websearch";
  if (result.source === "hive") {
    // Local file path — show the file name, no link.
    const name = result.href ? result.href.split("/").pop() : "document";
    card.textContent = name;
    if (result.href) card.title = result.href;
    return card;
  }
  let host = result.href;
  try { host = new URL(result.href).hostname.replace("www.", ""); } catch (e) {}
  const a = document.createElement("a");
  a.href = result.href;
  a.target = "_blank";
  a.textContent = host;
  a.title = result.href;
  card.appendChild(a);
  return card;
}

// ─────────────── clipboard ───────────────
// Clipboard API first, with a temporary-textarea execCommand fallback for
// contexts where navigator.clipboard is missing or rejects (unfocused
// document, some extension pages). Returns true on success.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch (e) {
    return false;
  }
}

// Brief "copied" check on the clicked button.
function flashCopied(btn) {
  if (!btn || !btn.isConnected) return;
  const prev = btn.innerHTML;
  btn.innerHTML = btn.classList.contains("copycode")
    ? '<i class="fas fa-check"></i> copied'
    : '<i class="fas fa-check"></i>';
  btn.classList.add("copied");
  setTimeout(() => {
    if (!btn.isConnected) return; // tile was re-rendered away
    btn.innerHTML = prev;
    btn.classList.remove("copied");
  }, 1200);
}

// ─────────────── streaming paint + stats ───────────────
function paintTile() {
  if (selecting) { frozenRender = true; return; }
  if (state.currentTile instanceof Element) {
    state.currentTile.innerHTML = renderMarkdown(state.bufferText);
  }
  if (!state.userScrolled) {
    const el = $("chatMessages");
    el.scrollTop = el.scrollHeight;
  }
}

function emitStats(live) {
  const tile =
    (state.currentTile instanceof Element && state.currentTile.closest(".bot-tile")) ||
    state.lastBotTile;
  const header = tile ? tile.querySelector(".tileheader") : null;
  if (!header) return;
  let badge = header.querySelector(".tps-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "tps-badge";
    header.appendChild(badge);
  }
  const elapsed = (performance.now() - state.genStart) / 1000;
  let tokens = state.genTokens;
  let tps;
  if (!live && state.doneInfo && state.doneInfo.eval_duration) {
    tokens = state.doneInfo.eval_count || tokens;
    tps = (tokens / (state.doneInfo.eval_duration / 1e9)).toFixed(1);
  } else {
    tps = elapsed > 0.05 ? (tokens / elapsed).toFixed(1) : "0.0";
  }
  if (live) {
    badge.classList.add("live");
    badge.innerHTML = `<i class="fas fa-tachometer-alt"></i> ${tps} tok/s`;
  } else {
    badge.classList.remove("live");
    badge.innerHTML = `<i class="fas fa-tachometer-alt"></i> ${tps} tok/s ` +
      `<span class="tps-detail">· ${tokens} tok · ${elapsed.toFixed(1)}s</span>`;
    const message = getMessageById(state.messageId);
    if (message && message.id) {
      message.stats = { live: false, tps, tokens, seconds: elapsed.toFixed(1) };
      saveCurrentMessage();
    }
  }
}

// ─────────────── chat list (localStorage) ───────────────
function getChats() { return JSON.parse(localStorage.getItem("llcuiChats") || "{}"); }
function setChats(c) { localStorage.setItem("llcuiChats", JSON.stringify(c)); }

// Ollama message history per chat (kept so follow-ups have context, the same
// way the llama.cui server kept chatOllamaHistory).
function getHistories() { return JSON.parse(localStorage.getItem("llcuiHistories") || "{}"); }
function setHistories(h) { localStorage.setItem("llcuiHistories", JSON.stringify(h)); }

function historyFor(chatId) {
  const h = getHistories();
  if (h[chatId]) return h[chatId];
  // Legacy chat without saved history — rebuild from the stored messages,
  // stripping thinking blocks from the bot replies.
  const msgs = getChats()[chatId] || {};
  const rebuilt = [];
  for (const m of Object.values(msgs)) {
    if (m.user) rebuilt.push({ role: "user", content: m.user });
    const bot = m.bot ? stripThinking(m.bot) : "";
    if (bot) rebuilt.push({ role: "assistant", content: bot });
  }
  h[chatId] = rebuilt;
  setHistories(h);
  return rebuilt;
}

function pushHistory(role, content) {
  const h = getHistories();
  // Seed legacy chats (saved before histories existed) from their messages.
  if (!h[state.currentChat]) h[state.currentChat] = historyFor(state.currentChat);
  h[state.currentChat].push({ role, content });
  const chars = (arr) => arr.reduce((n, m) => n + m.content.length, 0);
  while (chars(h[state.currentChat]) > state.cfg.historyMaxChars) h[state.currentChat].shift();
  while (h[state.currentChat].length > state.cfg.historyLimit) h[state.currentChat].shift();
  setHistories(h);
}

function randomId() {
  return "id" + [...Array(5)].map(() => (~~(Math.random() * 36)).toString(36)).join("");
}

function newChat() {
  if (voiceState.active) stopVoiceSession(); // turns would land in the old chat
  state.currentTile = {};
  state.messageId = "";
  state.currentChat = "C" + randomId();
  const h = getHistories();
  delete h[state.currentChat];
  setHistories(h);
  $("chatMessages").innerHTML = "";
  showEmpty();
  listGenerate();
}

function showEmpty() {
  const e = document.createElement("div");
  e.className = "empty-chat";
  e.id = "emptyChat";
  e.innerHTML = '<i class="fas fa-comment-dots"></i>Ask a question to start a chat.';
  $("chatMessages").appendChild(e);
}

function getMessageById(id) {
  const chats = getChats();
  return (chats[state.currentChat] && chats[state.currentChat][id]) || {};
}

function saveCurrentMessage(message) {
  const chats = getChats();
  if (!chats[state.currentChat]) chats[state.currentChat] = {};
  if (message) chats[state.currentChat][state.messageId] = message;
  setChats(chats);
}

function persistBotReply() {
  const message = getMessageById(state.messageId);
  if (message && message.id) {
    message.bot = state.bufferText;
    saveCurrentMessage(message);
  }
}

function listGenerate() {
  const chats = getChats();
  const list = $("savedChats");
  const ids = Object.keys(chats);
  if (ids.length === 0) {
    list.innerHTML = '<div class="chatlist-empty">No chats yet</div>';
    return;
  }
  list.innerHTML = "";
  for (let i = ids.length - 1; i >= 0; i--) {
    const id = ids[i];
    const msgs = Object.values(chats[id]);
    const firstUser = (msgs.find((m) => m.user) || {}).user || "New chat";
    const li = document.createElement("li");
    li.className = "list-group-item-container";
    const item = document.createElement("div");
    item.className = "list-group-item";
    item.textContent = firstUser.substring(0, 40);
    item.onclick = () => loadChat(id);
    const del = document.createElement("button");
    del.className = "delete-button";
    del.title = "Delete chat";
    del.innerHTML = '<i class="fas fa-trash"></i>';
    del.onclick = (e) => { e.stopPropagation(); deleteChat(id, del); };
    li.onmouseenter = () => del.classList.add("show");
    li.onmouseleave = () => del.classList.remove("show");
    li.appendChild(item);
    li.appendChild(del);
    list.appendChild(li);
  }
}

let deleteArmed = null;
function deleteChat(id, btn) {
  if (deleteArmed === id) {
    const chats = getChats();
    delete chats[id];
    setChats(chats);
    const h = getHistories();
    delete h[id];
    setHistories(h);
    if (state.currentChat === id) newChat();
    listGenerate();
    deleteArmed = null;
    return;
  }
  deleteArmed = id;
  btn.classList.add("remove");
  setTimeout(() => { if (deleteArmed === id) { deleteArmed = null; btn.classList.remove("remove"); } }, 2000);
}

function loadChat(id) {
  if (voiceState.active) stopVoiceSession();
  state.currentChat = id;
  state.lastBotTile = null;
  const msgs = getChats()[id] || {};
  const sorted = Object.values(msgs);
  $("chatMessages").innerHTML = "";
  for (const m of sorted) {
    if (m.user) createUserTile(renderMarkdown(m.user));
    if (m.bot) {
      createBotTile(m.bot, m.embedding || []);
      if (m.stats) onSavedStats(m.stats);
    }
  }
  $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
  $("chatlist").classList.remove("open");
}

// Re-show a persisted stats badge on a loaded tile (emitStats would overwrite
// it with the live-generation counters, so write the badge directly).
function onSavedStats(stats) {
  const tile =
    (state.currentTile instanceof Element && state.currentTile.closest(".bot-tile")) ||
    state.lastBotTile;
  const header = tile ? tile.querySelector(".tileheader") : null;
  if (!header) return;
  const badge = document.createElement("span");
  badge.className = "tps-badge";
  badge.innerHTML = `<i class="fas fa-tachometer-alt"></i> ${stats.tps} tok/s ` +
    `<span class="tps-detail">· ${stats.tokens} tok · ${stats.seconds}s</span>`;
  header.appendChild(badge);
}

// ─────────────── send / stop ───────────────
function sendMessage() {
  const input = $("messageInput");
  const text = input.value.trim();
  if (!text || state.generating) return;
  if (voiceState.active) { flashStatus("Voice is on — tap the mic to stop"); return; }

  state.currentTile = {};
  createUserTile(renderMarkdown(text));
  state.messageId = randomId();
  saveCurrentMessage({ id: state.messageId, user: text, bot: "" });
  state.bufferText = "";
  input.value = "";
  autoResize();
  state.generating = true;
  showStop();
  $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
  runGeneration(text);
}

// Full generation pipeline: gather RAG context, create the bot tile, then
// stream the answer from Ollama.
async function runGeneration(text) {
  state.genStart = performance.now();
  state.genTokens = 0;
  state.lastEval = 0;
  state.doneInfo = null;

  let results = [];
  try {
    results = await gatherContext(text);
  } catch (e) { /* context is optional — proceed without it */ }

  createBotTile("", results);

  const context = results.length ? buildContextText(results) : "";
  const userContent = text + (context ? `  \n Context: '${context}'` : "");
  pushHistory("user", userContent);
  const messages = [
    { role: "system", content: state.cfg.systemPrompt },
    ...historyFor(state.currentChat),
  ];

  try {
    await streamOllama(messages);
  } catch (e) {
    if (e.name !== "AbortError") {
      console.error("Ollama error:", e.message);
      state.bufferText += `

**Error:** ${e.message}
`;
    }
  }
  finishGeneration();
}

function finishGeneration() {
  state.abort = null;
  paintTile();
  persistBotReply();
  const reply = stripThinking(state.bufferText);
  if (reply) pushHistory("assistant", reply);
  state.lastBotTile =
    (state.currentTile instanceof Element && state.currentTile.closest(".bot-tile")) ||
    state.lastBotTile;
  state.currentTile = {};
  state.userScrolled = false;
  state.generating = false;
  hideStop();
  if (!selecting) $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
  emitStats(false);
  maybeReplaceSelection();
}

function stopGenerating() {
  if (state.abort) { try { state.abort.abort(); } catch (e) {} }
}

function showStop() { $("stopgenerator").style.display = "block"; }
function hideStop() { $("stopgenerator").style.display = "none"; }

// ─────────────── voice conversation ───────────────
// Gemini-style real-time voice chat. The mic is captured in the panel,
// downsampled to 16 kHz mono PCM, and an energy VAD auto-sends the
// utterance when the user stops talking. Audio goes out through Ollama's
// OpenAI endpoint (/v1/chat/completions, `input_audio` part) — the only
// path the fork actually ingests; the native /api/chat silently drops
// audio. The fork returns no audio output, so replies are streamed into
// the tile AND read aloud by the browser's speechSynthesis, sentence by
// sentence. Half-duplex: we only listen while not speaking, so the TTS
// never reaches the VAD.
const VOICE_PROMPT_SUFFIX =
  " You are in a real-time voice conversation with the user. Keep replies short (one to three sentences) and conversational. " +
  "Output plain text only: no markdown, no lists, no code blocks, no emojis — your words will be spoken aloud.";

const VOICE = {
  sampleRate: 16000,
  vadThreshold: 0.01, // RMS (float -1..1) considered speech
  minSpeechMs: 600,   // speech duration before silence may end the turn
  endSilenceMs: 900,  // trailing silence that ends a turn
  maxTurnMs: 30000,   // hard cap on one captured turn
  minSendMs: 300,     // manual send: shorter than this = discarded
  preBlocks: 6,       // ~0.5 s of pre-speech context kept
};

const voiceState = {
  active: false,      // session on (mic open)
  listening: false,   // VAD running
  awaitingTts: false, // stream done, TTS still talking
  turnFinished: true, // guards finishVoiceTurn()
  audioCtx: null,
  mediaStream: null,
  processor: null,
  pcm: new Int16Array(0), // current utterance, 16 kHz mono
  pre: [],                // ring of pre-speech blocks
  speechStarted: false,
  speechMs: 0,
  silenceMs: 0,
};

const tts = {
  queue: [],
  buffer: "",
  speaking: false,
  busy: false,    // model mode: /v1/audio/speech request in flight
  streamDone: true,
  gen: 0,        // bumped on stopTTS() so stale callbacks die
  keepAlive: null, // browser mode: speechSynthesis stall nudge
  audio: null,     // model mode: current BufferSource
  playCtx: null,   // model mode: fallback AudioContext when no session ctx
};

// Voices the fork's /v1/audio/speech accepts: female | male, optionally
// suffixed with a language (female-british-english, male-french, ...).
const TTS_LANGUAGES = [
  "", "american-english", "arabic", "british-english", "chinese", "danish",
  "dutch", "english", "finnish", "french", "german", "greek", "hebrew",
  "italian", "japanese", "korean", "polish", "portuguese", "spanish",
  "swedish", "turkish",
];

function setVoiceUI(mode) {
  const btn = $("voice-btn");
  if (!btn) return;
  btn.classList.remove("listening", "thinking", "speaking");
  let icon, title;
  if (mode === "listening") {
    btn.classList.add("listening");
    icon = "fa-microphone";
    title = "Listening — tap to send, tap again to stop";
  } else if (mode === "thinking") {
    btn.classList.add("thinking");
    icon = "fa-circle-notch fa-spin";
    title = "Thinking — tap to stop";
  } else if (mode === "speaking") {
    btn.classList.add("speaking");
    icon = "fa-volume-up";
    title = "Speaking — tap to stop";
  } else {
    icon = "fa-microphone";
    title = "Start voice conversation";
  }
  btn.querySelector("i").className = "fas " + icon;
  btn.title = title;
}

// Mic tap: idle → start; listening → send now (or stop if nothing said);
// thinking/speaking → stop the whole session.
function onVoiceButton() {
  if (!voiceState.active) { startVoice(); return; }
  if (voiceState.listening) {
    if (voiceState.speechMs >= VOICE.minSendMs) onUtteranceEnd();
    else stopVoiceSession();
    return;
  }
  voiceState.active = false;
  if (state.abort) { try { state.abort.abort(); } catch (e) {} }
  stopTTS();
  finishVoiceTurn();
}

async function startVoice() {
  if (state.generating) { flashStatus("Wait for the current reply"); return; }
  let models;
  try {
    models = await ollamaTags();
  } catch (e) {
    flashStatus("Ollama unreachable");
    return;
  }
  const audioModels = models.filter((m) => (m.capabilities || []).includes("audio"));
  if (!audioModels.length) { flashStatus("No audio-capable model found"); return; }
  // Voice needs an audio model — auto-switch to the first one that has it.
  const cur = models.find((m) => m.name === state.cfg.model);
  if (!cur || !(cur.capabilities || []).includes("audio")) {
    state.cfg.model = audioModels[0].name;
    saveConfig();
    refreshModels();
    flashStatus("Voice: using " + state.cfg.model);
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (e) {
    flashStatus("Mic: " + e.message);
    return;
  }
  voiceState.active = true;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    voiceState.audioCtx = new Ctx(); // created inside the click gesture
    await voiceState.audioCtx.resume();
    const src = voiceState.audioCtx.createMediaStreamSource(stream);
    const proc = voiceState.audioCtx.createScriptProcessor(4096, 1, 1);
    const mute = voiceState.audioCtx.createGain();
    mute.gain.value = 0; // the processor must reach the destination to run, but stay silent
    src.connect(proc);
    proc.connect(mute);
    mute.connect(voiceState.audioCtx.destination);
    proc.onaudioprocess = handleVoiceBlock;
    voiceState.mediaStream = stream;
    voiceState.processor = proc;
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop());
    voiceState.active = false;
    flashStatus("Audio: " + e.message);
    return;
  }
  startListening();
  flashStatus("Listening — speak now");
}

function concatInt16(arrays) {
  let n = 0;
  for (const a of arrays) n += a.length;
  const out = new Int16Array(n);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

// Decimate device-rate float32 to 16 kHz Int16 (moving average; the same
// conversion the model was verified to hear correctly).
function downsampleTo16k(float32, fromRate) {
  const ratio = fromRate / VOICE.sampleRate;
  const len = Math.floor(float32.length / ratio);
  const out = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), float32.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += float32[j];
    const s = sum / (end - start || 1);
    out[i] = Math.max(-32768, Math.min(32767, Math.round(s * 32767)));
  }
  return out;
}

// One ~85 ms capture block: VAD bookkeeping + utterance accumulation.
function handleVoiceBlock(e) {
  if (!voiceState.active || !voiceState.listening) return;
  const input = e.inputBuffer.getChannelData(0);
  let sum = 0;
  for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
  const rms = Math.sqrt(sum / input.length);
  const pcm = downsampleTo16k(input, voiceState.audioCtx.sampleRate);
  const dur = (input.length / voiceState.audioCtx.sampleRate) * 1000;

  if (!voiceState.speechStarted) {
    voiceState.pre.push(pcm);
    if (voiceState.pre.length > VOICE.preBlocks) voiceState.pre.shift();
    if (rms > VOICE.vadThreshold) {
      voiceState.speechStarted = true;
      voiceState.pcm = concatInt16(voiceState.pre); // keep a bit of lead-in
      voiceState.pre = [];
      voiceState.speechMs = dur;
      voiceState.silenceMs = 0;
    }
    return;
  }

  voiceState.pcm = concatInt16([voiceState.pcm, pcm]);
  if (rms > VOICE.vadThreshold) {
    voiceState.speechMs += dur;
    voiceState.silenceMs = 0;
  } else {
    voiceState.silenceMs += dur;
  }
  if (voiceState.speechMs >= VOICE.minSpeechMs && voiceState.silenceMs >= VOICE.endSilenceMs) {
    onUtteranceEnd();
  } else if (voiceState.speechMs + voiceState.silenceMs >= VOICE.maxTurnMs) {
    onUtteranceEnd();
  }
}

function resetUtterance() {
  voiceState.pcm = new Int16Array(0);
  voiceState.pre = [];
  voiceState.speechStarted = false;
  voiceState.speechMs = 0;
  voiceState.silenceMs = 0;
}

function startListening() {
  if (!voiceState.active) return;
  voiceState.listening = true;
  resetUtterance();
  setVoiceUI("listening");
}

function onUtteranceEnd() {
  if (!voiceState.listening) return;
  voiceState.listening = false;
  const pcm = voiceState.pcm;
  resetUtterance();
  if (pcm.length < VOICE.sampleRate * (VOICE.minSendMs / 1000)) {
    // Too short to be speech — keep listening for the real thing.
    if (voiceState.active) startListening();
    return;
  }
  runVoiceTurn(pcm);
}

// 16 kHz mono 16-bit PCM → WAV → base64 (the format the model hears).
function pcmToWavB64(int16) {
  const n = int16.length;
  const w = new ArrayBuffer(44 + n * 2);
  const v = new DataView(w);
  const str = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  str(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);   // PCM
  v.setUint16(22, 1, true);   // mono
  v.setUint32(24, 16000, true);
  v.setUint32(28, 32000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, n * 2, true);
  new Int16Array(w, 44).set(int16);
  const bytes = new Uint8Array(w);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

async function runVoiceTurn(pcm) {
  voiceState.turnFinished = false;
  setVoiceUI("thinking");

  createUserTile(renderMarkdown("*(voice message)*"));
  state.messageId = randomId();
  saveCurrentMessage({ id: state.messageId, user: "(voice message)", bot: "" });
  state.bufferText = "";
  state.genStart = performance.now();
  state.genTokens = 0;
  state.lastEval = 0;
  state.doneInfo = null;
  state.generating = true;
  createBotTile("");

  // Voice user turns persist as a placeholder — never the audio bytes.
  pushHistory("user", "(voice message)");
  const history = historyFor(state.currentChat);
  const messages = [
    { role: "system", content: state.cfg.systemPrompt + VOICE_PROMPT_SUFFIX },
    ...history,
  ];
  // The last user turn carries the actual audio (audio-only content works;
  // verified against the fork).
  messages[messages.length - 1] = {
    role: "user",
    content: [{ type: "input_audio", input_audio: { data: pcmToWavB64(pcm), format: "wav" } }],
  };

  resetTTS();
  const controller = new AbortController();
  state.abort = controller;
  try {
    await streamVoiceOllama(messages, controller);
  } catch (e) {
    voiceState.active = false; // any failure ends the session
    if (e.name === "AbortError") {
      stopTTS();
      finishVoiceTurn(); // keep the partial reply, stop talking
    } else {
      console.error("Voice error:", e.message);
      state.bufferText += `\n\n**Error:** ${e.message}\n`;
      paintTile(); // TTS may finish speaking the partial text
    }
  }

  tts.streamDone = true;
  feedTTS(""); // flush any trailing partial sentence
  if (ttsPending()) {
    voiceState.awaitingTts = true; // the TTS onend chain calls finishVoiceTurn()
  } else {
    finishVoiceTurn();
  }
}

// SSE stream from the OpenAI-compatible endpoint (the native /api/chat
// drops audio; this is the path Ollama's own tests use).
async function streamVoiceOllama(messages, controller) {
  const cfg = state.cfg;
  const res = await fetch(base(cfg.ollamaUrl) + "/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      stream: true,
      temperature: cfg.temperature,
      top_p: cfg.topP,
      max_tokens: 512, // voice replies are short; guard against rambles
      keep_alive: cfg.keepAlive,
    }),
    signal: controller.signal,
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.text() || "").slice(0, 300).trim(); } catch (e) {}
    throw new Error(
      `Ollama API error: ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`
    );
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep partial line
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const p = t.slice(5).trim();
      if (p === "[DONE]") continue;
      let c;
      try { c = JSON.parse(p); } catch (e) { continue; }
      if (c.error) throw new Error(c.error.message || c.error);
      const d = c.choices && c.choices[0] && c.choices[0].delta && c.choices[0].delta.content;
      if (d) {
        state.bufferText += d;
        state.genTokens += 1; // /v1 exposes no eval_count — approximate
        paintTile();
        emitStats(true);
        feedTTS(d);
      }
    }
  }
}

// ── TTS (browser speechSynthesis), sentence by sentence ──
function resetTTS() {
  stopTTS();
  tts.buffer = "";
  tts.streamDone = false;
}

function feedTTS(text) {
  if (voiceState.turnFinished) return;
  tts.buffer += text;
  let cut;
  while ((cut = sentenceEnd(tts.buffer)) > 0) {
    const s = tts.buffer.slice(0, cut).trim();
    tts.buffer = tts.buffer.slice(cut);
    if (s && /[a-z0-9]/i.test(s)) tts.queue.push(s); // skip punctuation-only slivers
  }
  if (tts.streamDone && tts.buffer.trim() && /[a-z0-9]/i.test(tts.buffer)) {
    tts.queue.push(tts.buffer.trim());
    tts.buffer = "";
  }
  pumpTTS();
}

// Index just past the first complete sentence in s, or 0 if none yet.
// Anchored at 0 (the match must start at the beginning). A dot between two
// digits is a decimal, not a sentence end ("version 2.0 shipped.").
function sentenceEnd(s) {
  const m = s.match(/^(?:[^.!?]|\.(?=\d))*[.!?]+["')\]]*(?:\s+|$)/);
  return m ? m[0].length : 0;
}

function ttsPending() {
  return tts.speaking || tts.busy || tts.queue.length > 0 || tts.buffer.trim().length > 0;
}

function pumpTTS() {
  if (voiceState.turnFinished) return;
  if (tts.speaking || tts.busy || tts.queue.length === 0) { checkTtsAllDone(); return; }
  const text = tts.queue.shift();
  if (state.cfg.ttsSource === "browser") speakBrowser(text);
  else speakModel(text);
}

// Model voice: fetch a WAV from the fork's TTS endpoint and play it through
// WebAudio. Playback goes through the mic's AudioContext — it was created
// inside the mic-tap gesture and is already running, so it is exempt from
// the autoplay policy that would silently block a plain <audio> element.
// Generation speed is server-side; the first call may pay a model load.
async function speakModel(text) {
  tts.busy = true;
  const gen = tts.gen;
  try {
    const res = await fetch(base(state.cfg.ollamaUrl) + "/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: state.cfg.model,
        input: text,
        voice: state.cfg.ttsModelVoice || "female",
      }),
    });
    if (!res.ok) throw new Error("TTS HTTP " + res.status);
    const arrayBuf = await res.arrayBuffer();
    if (gen !== tts.gen) return; // stopped mid-generation
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = voiceState.audioCtx || (tts.playCtx = tts.playCtx || new Ctx());
    if (ctx.state !== "running") await ctx.resume();
    if (gen !== tts.gen) return;
    const audioBuf = await ctx.decodeAudioData(arrayBuf);
    if (gen !== tts.gen) return;
    tts.busy = false;
    tts.speaking = true;
    if (voiceState.active) setVoiceUI("speaking");
    const src = ctx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(ctx.destination);
    tts.audio = src;
    const done = () => {
      if (gen !== tts.gen) return; // stopTTS() happened — stale callback
      tts.speaking = false;
      tts.audio = null;
      pumpTTS();
    };
    src.onended = done;
    src.start();
  } catch (e) {
    if (gen !== tts.gen) return;
    tts.busy = false;
    console.error("Model TTS error:", e.message);
    flashStatus("TTS: " + e.message); // don't fail silently — show it
    pumpTTS(); // skip the failed sentence, keep going
  }
}

// Browser voice: built-in speechSynthesis — instant but robotic on Linux.
function speakBrowser(text) {
  if (!("speechSynthesis" in window)) { pumpTTS(); return; }
  const u = new SpeechSynthesisUtterance(text);
  u.rate = Math.min(2, Math.max(0.5, state.cfg.ttsRate || 1));
  if (state.cfg.ttsVoice) {
    const v = speechSynthesis.getVoices().find((x) => x.voiceURI === state.cfg.ttsVoice);
    if (v) u.voice = v;
  }
  const gen = tts.gen;
  tts.speaking = true;
  if (voiceState.active) setVoiceUI("speaking");
  const done = () => {
    if (gen !== tts.gen) return; // stopTTS() happened — stale callback
    tts.speaking = false;
    pumpTTS();
  };
  u.onend = done;
  u.onerror = done;
  speechSynthesis.speak(u);
  if (!tts.keepAlive) {
    // Chrome's speechSynthesis can stall on long queues; nudge it.
    tts.keepAlive = setInterval(() => {
      if (tts.speaking) { try { speechSynthesis.resume(); } catch (e) {} }
    }, 5000);
  }
}

function stopTTS() {
  tts.gen++;
  tts.speaking = false;
  tts.busy = false;
  tts.queue = [];
  if (tts.keepAlive) { clearInterval(tts.keepAlive); tts.keepAlive = null; }
  if (tts.audio) { try { tts.audio.stop(); } catch (e) {} tts.audio = null; } // BufferSource
  try { speechSynthesis.cancel(); } catch (e) {}
}

// Stream finished and nothing left to say → close out the turn.
function checkTtsAllDone() {
  if (tts.streamDone && !ttsPending() && voiceState.awaitingTts) {
    voiceState.awaitingTts = false;
    finishVoiceTurn();
  }
}

function finishVoiceTurn() {
  if (voiceState.turnFinished) return;
  voiceState.turnFinished = true;
  voiceState.awaitingTts = false;
  state.abort = null;
  paintTile();
  persistBotReply();
  const reply = stripThinking(state.bufferText);
  if (reply) pushHistory("assistant", reply);
  state.lastBotTile =
    (state.currentTile instanceof Element && state.currentTile.closest(".bot-tile")) ||
    state.lastBotTile;
  state.currentTile = {};
  state.userScrolled = false;
  state.generating = false;
  hideStop();
  emitStats(false);
  if (voiceState.active) {
    if (state.cfg.voiceLoop) startListening(); // continuous mode
    else stopVoiceSession();
  } else {
    stopCapture();
    setVoiceUI("idle");
  }
}

function stopVoiceSession() {
  voiceState.active = false;
  voiceState.listening = false;
  voiceState.awaitingTts = false;
  stopTTS();
  stopCapture();
  setVoiceUI("idle");
}

function stopCapture() {
  if (voiceState.processor) {
    try { voiceState.processor.onaudioprocess = null; voiceState.processor.disconnect(); } catch (e) {}
    voiceState.processor = null;
  }
  if (voiceState.mediaStream) {
    voiceState.mediaStream.getTracks().forEach((t) => t.stop());
    voiceState.mediaStream = null;
  }
  if (voiceState.audioCtx) {
    const ctx = voiceState.audioCtx;
    voiceState.audioCtx = null;
    try { ctx.close(); } catch (e) {}
  }
  resetUtterance();
}

// ─────────────── settings ───────────────
function openSettings() {
  const c = state.cfg;
  $("cfg-ollama-url").value = c.ollamaUrl;
  $("cfg-models").innerHTML = ""; // populated by refreshCfgModels()
  $("cfg-system").value = c.systemPrompt;
  $("cfg-temp").value = c.temperature;
  $("cfg-topp").value = c.topP;
  $("cfg-keepalive").value = c.keepAlive;
  $("cfg-numdraft").value = c.numDraft;
  $("cfg-spec").value = c.speculativeType;
  $("cfg-thinking").value = c.thinking;
  $("cfg-showthinking").checked = !!c.showThinking;
  $("cfg-hive-url").value = c.hiveUrl;
  $("cfg-hive-user").value = c.hiveUser;
  $("cfg-hive-pass").value = c.hivePass;
  $("cfg-hive-db").value = c.hiveDb;
  $("cfg-exa-key").value = c.exaKey;
  $("cfg-voiceloop").checked = !!c.voiceLoop;
  $("cfg-ttssource").value = c.ttsSource;
  populateTtsModelVoices();
  $("cfg-ttsrate").value = c.ttsRate;
  populateTtsVoices();
  $("cfg-status").className = "status";
  $("settings").classList.add("show");
  refreshCfgModels();
}

// The fork's /v1/audio/speech voice picker: female/male, optionally with
// a language suffix (female-british-english, male-french, ...).
function populateTtsModelVoices() {
  const sel = $("cfg-ttsmodelvoice");
  const opt = (v, label) =>
    `<option value="${v}"${v === state.cfg.ttsModelVoice ? " selected" : ""}>${label}</option>`;
  let html = opt("female", "Female") + opt("male", "Male");
  for (const lang of TTS_LANGUAGES) {
    if (!lang) continue;
    const name = lang.replace(/-/g, " ");
    html += opt("female-" + lang, "Female · " + name);
    html += opt("male-" + lang, "Male · " + name);
  }
  sel.innerHTML = html;
}

// Fill the browser TTS voice picker from speechSynthesis. Voices may still
// be loading when the form opens; onvoiceschanged (set in init) repopulates.
function populateTtsVoices() {
  const sel = $("cfg-ttsvoice");
  if (!("speechSynthesis" in window)) {
    sel.innerHTML = '<option value="">(not supported in this browser)</option>';
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  const voices = speechSynthesis.getVoices() || [];
  sel.innerHTML =
    '<option value="">(default voice)</option>' +
    voices
      .map((v) =>
        `<option value="${v.voiceURI}"${v.voiceURI === state.cfg.ttsVoice ? " selected" : ""}>${v.name} (${v.lang})</option>`
      )
      .join("");
}

async function refreshCfgModels() {
  const select = $("cfg-models");
  const url = $("cfg-ollama-url").value.trim() || DEFAULTS.ollamaUrl;
  try {
    const res = await fetch(base(url) + "/api/tags");
    const data = await res.json();
    const models = (data.models || []).map((m) => m.name);
    select.innerHTML = models
      .map((m) => `<option value="${m}"${m === state.cfg.model ? " selected" : ""}>${m}</option>`)
      .join("");
  } catch (e) {
    select.innerHTML = '<option value="">(Ollama unreachable)</option>';
  }
}

function closeSettings() { $("settings").classList.remove("show"); }

async function saveSettings() {
  const c = state.cfg;
  c.ollamaUrl = $("cfg-ollama-url").value.trim() || DEFAULTS.ollamaUrl;
  c.model = $("cfg-models").value;
  c.systemPrompt = $("cfg-system").value;
  c.temperature = parseFloat($("cfg-temp").value);
  c.topP = parseFloat($("cfg-topp").value);
  c.keepAlive = $("cfg-keepalive").value.trim() || "1h";
  c.numDraft = parseInt($("cfg-numdraft").value, 10) || 0;
  c.speculativeType = $("cfg-spec").value.trim();
  c.thinking = $("cfg-thinking").value;
  c.showThinking = $("cfg-showthinking").checked;
  c.hiveUrl = $("cfg-hive-url").value.trim();
  c.hiveUser = $("cfg-hive-user").value.trim();
  c.hivePass = $("cfg-hive-pass").value;
  c.hiveDb = $("cfg-hive-db").value.trim() || "*";
  c.exaKey = $("cfg-exa-key").value.trim();
  c.voiceLoop = $("cfg-voiceloop").checked;
  c.ttsSource = $("cfg-ttssource").value;
  c.ttsModelVoice = $("cfg-ttsmodelvoice").value;
  c.ttsRate = parseFloat($("cfg-ttsrate").value);
  if (isNaN(c.ttsRate) || c.ttsRate < 0.5) c.ttsRate = 0.5;
  if (c.ttsRate > 2) c.ttsRate = 2;
  c.ttsVoice = $("cfg-ttsvoice").value;
  if (isNaN(c.temperature)) c.temperature = DEFAULTS.temperature;
  if (isNaN(c.topP)) c.topP = DEFAULTS.topP;
  await saveConfig();
  hiveLoggedIn = false; // credentials may have changed
  const el = $("cfg-status");
  el.className = "status success";
  el.textContent = "Saved";
  setTimeout(closeSettings, 500);
  refreshModels();
}

async function testConnection() {
  const el = $("cfg-status");
  el.className = "status loading";
  el.textContent = "Testing…";
  try {
    const url = $("cfg-ollama-url").value.trim() || DEFAULTS.ollamaUrl;
    const res = await fetch(base(url) + "/api/tags");
    if (!res.ok) throw new Error(`Ollama API error: ${res.status}`);
    const data = await res.json();
    let msg = `Ollama OK — ${(data.models || []).length} model(s)`;
    const hiveUrl = $("cfg-hive-url").value.trim();
    if (hiveUrl) {
      try {
        await hiveLogin(hiveUrl, $("cfg-hive-user").value.trim(), $("cfg-hive-pass").value);
        // Verify the session cookie round-trips (an authenticated call).
        const res = await fetch(base(hiveUrl) + "/api/search/databases", { credentials: "include" });
        if (!res.ok) throw new Error(`session not retained (HTTP ${res.status})`);
        msg += " · Hive OK";
      } catch (e) {
        msg += ` · Hive: ${e.message}`;
      }
    }
    el.className = "status success";
    el.textContent = msg;
  } catch (e) {
    el.className = "status error";
    el.textContent = "Ollama: " + e.message;
  }
}

// ─────────────── pending prompt (context menu / omnibox) ───────────────
let pendingBusy = false;
async function checkPendingPrompt() {
  if (pendingBusy) return;
  pendingBusy = true;
  try {
    const stored = await browser.storage.local.get(["llcuiPendingRequest", "llcuiPendingPrompt"]);
    const req = stored.llcuiPendingRequest;
    const prompt = stored.llcuiPendingPrompt;
    if (!req && !prompt) return;

    if (req && req.prompt) {
      if (req.ask) {
        // "Ask about this…" — drop the text in the box and let the user finish.
        await browser.storage.local.remove(["llcuiPendingRequest", "llcuiPendingPrompt"]);
        $("messageInput").value = req.prompt;
        autoResize();
        $("messageInput").focus();
        return;
      }
      await browser.storage.local.remove(["llcuiPendingRequest", "llcuiPendingPrompt"]);
      if (req.replace || req.insert) state.pendingReplace = { replace: true, mode: req.insert || "replace", label: req.label || "Replace" };
      $("messageInput").value = req.prompt;
      sendMessage();
      return;
    }

    if (prompt) {
      await browser.storage.local.remove("llcuiPendingPrompt");
      $("messageInput").value = prompt;
      sendMessage();
    }
  } finally {
    pendingBusy = false;
  }
}

// Handle a context-menu / omnibox request when the panel is already open.
function watchPendingRequests() {
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const req = changes.llcuiPendingRequest && changes.llcuiPendingRequest.newValue;
    const prompt = changes.llcuiPendingPrompt && changes.llcuiPendingPrompt.newValue;
    if (req || prompt) checkPendingPrompt();
  });
}

// When a context-menu "replace" reply finishes, put the model's output back
// over the selection in the page (falling back to the clipboard).
async function maybeReplaceSelection() {
  if (!state.pendingReplace || !state.pendingReplace.replace) return;
  const reply = cleanReply(state.bufferText);
  const pr = state.pendingReplace;
  state.pendingReplace = null;
  if (!reply) return;

  const r = await bg("REPLACE_SELECTION", { text: reply, mode: pr.mode || "replace" }).catch(() => ({ success: false }));
  if (r && r.success) {
    flashStatus(pr.mode === "insert-top" ? pr.label + " — inserted at top of reply" : pr.label + " applied");
  } else {
    try {
      await navigator.clipboard.writeText(reply);
      flashStatus(pr.mode === "insert-top" ? "No reply box found — copied to clipboard" : pr.label + " — copied to clipboard");
    } catch (e) {
      flashStatus(pr.label + " — see panel");
    }
  }
}

function bg(type, msg = {}) {
  return browser.runtime.sendMessage({ type, ...msg });
}

// Strip markdown artifacts so the text placed into the page is clean prose.
function cleanReply(text) {
  let t = stripThinking(text);
  // Drop fenced code blocks (unlikely in a rewrite, but be safe).
  if (/^```[\s\S]*```$/.test(t)) t = t.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
  // Unwrap a single surrounding pair of quotes the model sometimes adds.
  t = t.replace(/^["“”]+|["“”]+$/g, "").trim();
  return t;
}

// Brief status flash in the header connection pill area.
function flashStatus(text) {
  const el = $("conn-label");
  if (!el) return;
  const pill = $("conn");
  el.textContent = text;
  pill.classList.add("flash");
  setTimeout(() => {
    el.textContent = state.connOnline ? "online" : "offline";
    pill.classList.remove("flash");
    setConn(state.connOnline);
  }, 2200);
}

// ─────────────── textarea autosize ───────────────
function autoResize() {
  const ta = $("messageInput");
  const max = parseInt(ta.parentNode.getAttribute("data-max-height")) || 240;
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, max) + "px";
}

// ─────────────── wiring ───────────────
function wire() {
  const chatMessages = $("chatMessages");

  // Copy buttons (code fences + tile header): delegated on the container so
  // they survive the per-chunk innerHTML re-renders, which would orphan
  // per-button handlers.
  chatMessages.addEventListener("click", (e) => {
    const codeBtn = e.target.closest(".copycode");
    if (codeBtn) {
      copyText(decodeURIComponent(codeBtn.dataset.code || ""))
        .then((ok) => { if (ok) flashCopied(codeBtn); });
      return;
    }
    const tileBtn = e.target.closest(".copy-tile");
    if (tileBtn) {
      const body = tileBtn.closest(".tileheader").parentElement.querySelector(".tilebody");
      if (body) copyText(body.textContent.trim())
        .then((ok) => { if (ok) flashCopied(tileBtn); });
    }
  });

  // Mouse selection: while the user is dragging, freeze the streaming
  // re-render and auto-scroll (both would destroy the selection), then paint
  // the skipped frame once on release.
  chatMessages.addEventListener("mousedown", () => {
    selecting = true;
    state.userScrolled = true; // stop auto-scroll for the duration of the drag
  });
  window.addEventListener("mouseup", () => {
    if (!selecting) return;
    selecting = false;
    state.userScrolled =
      chatMessages.scrollTop !== chatMessages.scrollHeight - chatMessages.clientHeight;
    if (!frozenRender) return;
    frozenRender = false;
    if (state.currentTile instanceof Element) {
      state.currentTile.innerHTML = renderMarkdown(state.bufferText);
    } else if (state.lastBotTile) {
      // Generation finished during the drag; make sure the final text is shown.
      const body = state.lastBotTile.querySelector(".tilebody");
      if (body) body.innerHTML = renderMarkdown(state.bufferText);
    }
  });

  chatMessages.addEventListener("scroll", (e) => {
    const el = e.target;
    state.userScrolled = el.scrollTop !== el.scrollHeight - el.clientHeight;
  });

  $("sendMessage").addEventListener("click", sendMessage);
  $("stopgenerator").addEventListener("click", stopGenerating);
  $("sidebar-toggle").addEventListener("click", () => $("chatlist").classList.toggle("open"));
  $("new-chat").addEventListener("click", newChat);
  $("delete-all").addEventListener("click", () => {
    if (confirm("Delete all chats?")) {
      localStorage.removeItem("llcuiChats");
      localStorage.removeItem("llcuiHistories");
      newChat();
      listGenerate();
    }
  });
  $("settings-btn").addEventListener("click", openSettings);
  $("cfg-save").addEventListener("click", saveSettings);
  $("cfg-test").addEventListener("click", testConnection);
  $("cfg-close").addEventListener("click", closeSettings);
  $("cfg-models-refresh").addEventListener("click", refreshCfgModels);
  $("exam-btn").addEventListener("click", () => { $("messageInput").value = EXAM_PROMPT; sendMessage(); });
  $("voice-btn").addEventListener("click", onVoiceButton);

  const select = $("modelselect");
  select.onchange = () => {
    state.cfg.model = select.value;
    saveConfig();
  };

  const ta = $("messageInput");
  ta.addEventListener("input", autoResize);
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
}

async function init() {
  wire();
  watchPendingRequests();
  // Wake the background script (Chrome's service worker sleeps between
  // events) and wait until its network rules are in place, so the first
  // local request goes out with the headers it expects. No-op in Firefox.
  try { await browser.runtime.sendMessage({ type: "READY" }); } catch (e) { /* no background */ }
  if ("speechSynthesis" in window) {
    // Voices load asynchronously; repopulate the picker if the settings
    // form happens to be open when they arrive.
    speechSynthesis.onvoiceschanged = () => {
      if ($("settings").classList.contains("show")) populateTtsVoices();
    };
  }
  await loadConfig();
  newChat();
  listGenerate();
  refreshModels();
  checkPendingPrompt();
}

document.addEventListener("DOMContentLoaded", init);
