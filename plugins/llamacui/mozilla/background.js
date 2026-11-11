// Llama.cui — Firefox MV2 background
// The chat panel talks to Ollama / Hive / Exa directly, so this script only
// handles browser-side features: context menus, the omnibox keyword, opening
// the sidebar, and putting model output back into the page selection.

console.log("[llamacui] background loaded");

// The local Ollama fork rejects requests whose Origin is a moz-extension
// (it allows localhost/127.0.0.1/file/no-origin). Origin is a forbidden
// header that page code cannot touch, so strip it from the extension's
// localhost requests here.
browser.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (details.type !== "xmlhttprequest") return {};
    const headers = details.requestHeaders || [];
    const filtered = headers.filter((h) => h.name.toLowerCase() !== "origin");
    return filtered.length !== headers.length ? { requestHeaders: filtered } : {};
  },
  { urls: ["http://localhost/*", "http://127.0.0.1/*"] },
  ["blocking", "requestHeaders"]
);

async function getSelection() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tab = tabs && tabs[0];
  if (!tab || !tab.id) return "";
  try {
    const results = await browser.tabs.executeScript(tab.id, { code: "window.getSelection().toString()" });
    return (results && results[0]) || "";
  } catch (e) {
    return "";
  }
}

async function getPageText(tabId) {
  try {
    const results = await browser.tabs.executeScript(tabId, { code: "document.body.innerText" });
    return (results && results[0]) || "";
  } catch (e) {
    return "";
  }
}

// Runs a snippet in the active tab's page context (MV2 code execution). With
// allFrames it runs in every frame and returns the first frame where the op
// succeeded — that's the frame holding the real selection (e.g. Outlook
// renders the email body in an iframe, while the top frame only has a
// collapsed caret). When `pick` is given, the frame with the highest
// pick(result) wins instead (used to find the largest editor for insert-top).
async function execInTab(tabId, code, allFrames = false, pick) {
  const results = await browser.tabs.executeScript(tabId, { code, allFrames });
  if (!results || results.length === 0) return undefined;
  if (!allFrames) return results[0] !== undefined ? results[0] : undefined;
  const ok = [];
  for (const v of results) {
    if (v && v.ok) ok.push(v);
  }
  if (ok.length === 0) return results[0];
  if (!pick) return ok[0];
  return ok.reduce((a, b) => (pick(b) > pick(a) ? b : a));
}

// Page-side helper. "save" stashes the current selection's Range on window so
// it can be reused after the page loses focus; "replace" swaps the saved range
// for the given text (used to put the model's output back into the page).
function selectionOp(mode, text) {
  if (mode === "save") {
    const sel = window.getSelection();
    // Only a real (non-collapsed) selection wins — with allFrames a bare caret
    // in the top frame would otherwise beat the selection in an iframe. Frames
    // without a selection get their stale range cleared so a later replace
    // can't hit a selection from an older request.
    if (!sel || sel.rangeCount === 0 || sel.toString().trim() === "") {
      window.__llcuiRange = null;
      return { ok: false };
    }
    window.__llcuiRange = sel.getRangeAt(0).cloneRange();
    return { ok: true };
  }
  if (mode === "insert-top") {
    // "Draft a reply": put the text at the very top of this frame's largest
    // contenteditable — Outlook's reply box, above the signature and the
    // quoted thread. `area` lets the background pick the biggest editor
    // across frames.
    const editors = Array.from(document.querySelectorAll('[contenteditable="true"]'));
    let best = null, bestArea = 0;
    for (const ed of editors) {
      const r = ed.getBoundingClientRect();
      const area = r.width * r.height;
      if (area > bestArea) { bestArea = area; best = ed; }
    }
    if (!best) return { ok: false, error: "no-editor" };
    try {
      const range = document.createRange();
      range.selectNodeContents(best);
      range.collapse(true); // very start of the editor
      const frag = document.createDocumentFragment();
      let last = null;
      for (const line of text.split("\n")) {
        const d = document.createElement("div");
        d.textContent = line || " ";
        frag.appendChild(d);
        last = d;
      }
      const sep = document.createElement("div");
      sep.textContent = " ";
      frag.appendChild(sep);
      range.insertNode(frag);
      // Leave the caret just after the inserted block.
      const sel = window.getSelection();
      sel.removeAllRanges();
      const cr = document.createRange();
      cr.setStartAfter(last);
      cr.collapse(true);
      sel.addRange(cr);
      return { ok: true, area: bestArea };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
  const range = window.__llcuiRange;
  if (!range) return { ok: false, error: "no-saved-selection" };
  try {
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    const sel = window.getSelection();
    sel.removeAllRanges();
    const r = document.createRange();
    r.setStartAfter(node);
    r.collapse(true);
    sel.addRange(r);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// MV2 executeScript takes a code string, so wrap the page-side helper.
function selectionOpCode(mode, text) {
  if (mode === "save") {
    return "(function(){ " + selectionOp.toString() + "; return selectionOp('save'); })()";
  }
  return "(function(mode, text){ " + selectionOp.toString() + "; return selectionOp(mode, text); })(" + JSON.stringify(mode) + ", " + JSON.stringify(text) + ")";
}

// Context-menu actions. `replace: true` puts the model's output back over the
// selected text; otherwise the answer is shown in the chat panel.
const ACTIONS = {
  "llcui-edit-grammar":  { id: "llcui-edit-grammar",  label: "Fix grammar",        group: "edit", replace: true,  coprompt: "Fix the grammar and spelling of the following text. Return ONLY the corrected text — no explanations, no quotes, no commentary.\n\n" },
  "llcui-edit-improve":  { id: "llcui-edit-improve",  label: "Grammar & improve",  group: "edit", replace: true,  coprompt: "Fix the grammar and spelling of the following text and improve its clarity and flow. Return ONLY the final text — no explanations or commentary.\n\n" },
  "llcui-edit-shorten":  { id: "llcui-edit-shorten",  label: "Shorten",            group: "edit", replace: true,  coprompt: "Make the following text more concise while keeping the essential meaning. Return ONLY the shortened text.\n\n" },
  "llcui-und-explain":   { id: "llcui-und-explain",   label: "Explain",            group: "und",  replace: false, coprompt: "Explain the following text clearly, in simple language, with examples where helpful.\n\n" },
  "llcui-und-summarize": { id: "llcui-und-summarize", label: "Summarize",          group: "und",  replace: false, coprompt: "Summarize the following text in 2-3 sentences.\n\n" },
  "llcui-mail-reply":    { id: "llcui-mail-reply",    label: "Draft a reply",      group: "mail", replace: false, insert: "top", coprompt: "TASK: Draft a REPLY to the email at the end of this message. You are the person who RECEIVED that email, writing back to its sender.\n\nThis is NOT an editing task. Do NOT correct, rewrite, shorten, or improve the email, and do NOT summarize or explain it. Your only job is to write the reply.\n\nThe reply should be short (2-5 sentences), professional, a direct response to what the email says or asks, and in the same language and tone as the email.\n\nOutput ONLY the reply text — no labels, no quotes of the original, no subject line, no meta-commentary.\n\nEMAIL:\n" },
};
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case "GET_SELECTION":
          return { success: true, text: await getSelection() };
        case "GET_ACTIONS":
          // The in-page menu (for pages that suppress the native context
          // menu, e.g. Outlook) fetches the action list from here so the
          // labels/prompts stay a single source of truth.
          return { success: true, actions: Object.values(ACTIONS) };
        case "OPEN_PANEL":
          // In-page menu click: same pipeline as a native menu click.
          openPanel(message.payload);
          return { success: true };
        case "PENDING_PROMPT":
          // store a prompt (from context menu / omnibox) for the panel to send
          await browser.storage.local.set({ llcuiPendingPrompt: message.prompt });
          return { success: true };
        case "PENDING_REQUEST":
          // store a full { prompt, replace } request for the panel to act on
          await browser.storage.local.set({ llcuiPendingRequest: message.request });
          return { success: true };
        case "REPLACE_SELECTION": {
          const tabs = await browser.tabs.query({ active: true, currentWindow: true });
          const tab = tabs && tabs[0];
          if (!tab || !tab.id) return { success: false, error: "no-tab" };
          // allFrames: the saved range (or the reply box) may live in an
          // iframe. insert-top picks the frame with the largest editor.
          const mode = message.mode || "replace";
          const pick = mode === "insert-top" ? (r) => (r && r.area) || 0 : undefined;
          const result = await execInTab(tab.id, selectionOpCode(mode, message.text), true, pick);
          return { success: !!(result && result.ok), error: result && result.error };
        }
        default:
          return { success: false, error: "unknown message " + message.type };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  })().then(sendResponse);
  return true; // async
});

function openPanel(payload) {
  // payload: a plain string prompt, or a { prompt, replace } request object.
  if (payload) {
    if (typeof payload === "string") {
      browser.storage.local.set({ llcuiPendingPrompt: payload });
    } else {
      browser.storage.local.set({ llcuiPendingRequest: payload });
    }
  }
  browser.sidebarAction.open();
}

browser.browserAction.onClicked.addListener(() => openPanel());

// Build the right-click menu: a flat list of actions (no nested submenus).
// Each action is a top-level item; the browser auto-collapses several
// top-level items into a single "Llama.cui" parent, and the group (Edit /
// Understand) is shown as a title prefix.
//
// - `building` dedupes concurrent invocations (onInstall/onStartup/load can all
//   fire); without it, two builders would call removeAll() and wipe each other.
// - Each item is created in a try/catch so one bad option can't abort the menu.
let building = null;
async function buildMenus() {
  if (building) return building;
  building = (async () => {
    console.log("[llamacui] building context menus");
    const create = (opts) => browser.contextMenus.create(opts);
    try {
      await browser.contextMenus.removeAll();
    } catch (e) { /* first run: nothing to remove */ }

    let ok = 0;
    const safe = async (opts) => {
      try { await create(opts); ok++; }
      catch (e) { console.error("[llamacui] menu item failed:", opts.id, e); }
    };

    for (const a of Object.values(ACTIONS)) {
      const group = a.group === "edit" ? "Edit" : a.group === "mail" ? "Email" : "Understand";
      await safe({ id: a.id, title: `${group} — ${a.label}`, contexts: ["selection"] });
    }
    await safe({ id: "llcui-ask-selection", title: "Ask about this…", contexts: ["selection"] });
    await safe({ id: "llcui-ask-page", title: "Summarize this page", contexts: ["page"] });

    console.log("[llamacui] built " + ok + " context menu items");
  })();
  try {
    return await building;
  } finally {
    building = null;
  }
}

// Build the menu on load — the only path we need. Firefox reloads this
// non-persistent background script on install and on every browser startup,
// so a top-level buildMenus() covers all of them. (We deliberately do NOT
// register runtime.onInstall/onStartup listeners: Firefox doesn't implement
// runtime.onInstall, and even a guarded reference trips AMO's static
// validator.)
buildMenus().catch((e) => console.error("[llamacui] buildMenus error:", e));

browser.contextMenus.onClicked.addListener((info, tab) => {
  (async () => {
    const id = info.menuItemId;
    const action = ACTIONS[id];

    if (action) {
      const text = info.selectionText;
      if (!text || !text.trim()) return;
      if (action.replace) {
        // Save the selection's Range now so the reply can replace it later.
        // allFrames: the selection may live in an iframe (Outlook's email body).
        await execInTab(tab.id, selectionOpCode("save"), true);
      }
      const payload = { prompt: action.coprompt + text, replace: !!action.replace, label: action.label };
      if (action.insert) payload.insert = action.insert;
      await openPanel(payload);
      return;
    }

    if (id === "llcui-ask-selection") {
      const text = info.selectionText;
      if (!text || !text.trim()) return;
      // Put the selection in the input box so the user can ask anything.
      await openPanel({ prompt: "About this text:\n\n" + text, replace: false, ask: true, label: "Ask" });
      return;
    }

    if (id === "llcui-ask-page") {
      const text = await getPageText(tab.id);
      const snippet = text.length > 4000 ? text.slice(0, 4000) + "…" : text;
      await openPanel({ prompt: "Summarize this page content:\n\n" + snippet, replace: false, label: "Summarize page" });
    }
  })();
});

// Omnibox: type "c <question>" to chat.
browser.omnibox.setDefaultSuggestion({ description: "Ask Llama.cui…" });
browser.omnibox.onInputEntered.addListener((text) => {
  openPanel(text.trim());
});
