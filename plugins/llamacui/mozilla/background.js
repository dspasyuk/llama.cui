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

// Runs a snippet in the active tab's page context (MV2 code execution).
async function execInTab(tabId, code) {
  const results = await browser.tabs.executeScript(tabId, { code });
  return results && results[0] !== undefined ? results[0] : undefined;
}

// Page-side helper. "save" stashes the current selection's Range on window so
// it can be reused after the page loses focus; "replace" swaps the saved range
// for the given text (used to put the model's output back into the page).
function selectionOp(mode, text) {
  if (mode === "save") {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return { ok: false };
    window.__llcuiRange = sel.getRangeAt(0).cloneRange();
    return { ok: true };
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

// Context-menu actions. `replace: true` puts the model's output back over the
// selected text; otherwise the answer is shown in the chat panel.
const ACTIONS = {
  "llcui-edit-grammar":  { id: "llcui-edit-grammar",  label: "Fix grammar",        group: "edit", replace: true,  coprompt: "Fix the grammar and spelling of the following text. Return ONLY the corrected text — no explanations, no quotes, no commentary.\n\n" },
  "llcui-edit-improve":  { id: "llcui-edit-improve",  label: "Grammar & improve",  group: "edit", replace: true,  coprompt: "Fix the grammar and spelling of the following text and improve its clarity and flow. Return ONLY the final text — no explanations or commentary.\n\n" },
  "llcui-edit-rewrite":  { id: "llcui-edit-rewrite",  label: "Rewrite",            group: "edit", replace: true,  coprompt: "Rewrite the following text to make it clearer and more engaging while preserving its meaning. Return ONLY the rewritten text.\n\n" },
  "llcui-edit-simplify": { id: "llcui-edit-simplify", label: "Simplify",           group: "edit", replace: true,  coprompt: "Simplify the following text so it is easy to understand, without losing the key meaning. Return ONLY the simplified text.\n\n" },
  "llcui-edit-shorten":  { id: "llcui-edit-shorten",  label: "Shorten",            group: "edit", replace: true,  coprompt: "Make the following text more concise while keeping the essential meaning. Return ONLY the shortened text.\n\n" },
  "llcui-edit-continue": { id: "llcui-edit-continue", label: "Continue writing",   group: "edit", replace: false, coprompt: "Continue the following text, matching its style and tone. Return ONLY the continuation, starting where the text left off.\n\n" },
  "llcui-und-explain":   { id: "llcui-und-explain",   label: "Explain",            group: "und",  replace: false, coprompt: "Explain the following text clearly, in simple language, with examples where helpful.\n\n" },
  "llcui-und-points":    { id: "llcui-und-points",    label: "Key points",         group: "und",  replace: false, coprompt: "List the key points of the following text as a concise bulleted list.\n\n" },
  "llcui-und-summarize": { id: "llcui-und-summarize", label: "Summarize",          group: "und",  replace: false, coprompt: "Summarize the following text in 2-3 sentences.\n\n" },
};
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case "GET_SELECTION":
          return { success: true, text: await getSelection() };
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
          const text = JSON.stringify(message.text);
          const code = "(function(mode, text){ " + selectionOp.toString() + "; return selectionOp(mode, text); })('replace', " + text + ")";
          const result = await execInTab(tab.id, code);
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
      const group = a.group === "edit" ? "Edit" : "Understand";
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

// Build the menu on load FIRST — the primary path. It must run even if the
// onInstall/onStartup listener registration throws; an uncaught throw there
// would halt the rest of this top-level script (including the onClicked and
// omnibox handlers below) and no menu items would ever be created.
buildMenus().catch((e) => console.error("[llamacui] buildMenus error:", e));

// Rebuild on install/startup too, when those events exist.
if (browser.runtime.onInstall) browser.runtime.onInstall.addListener(buildMenus);
if (browser.runtime.onStartup) browser.runtime.onStartup.addListener(buildMenus);

browser.contextMenus.onClicked.addListener((info, tab) => {
  (async () => {
    const id = info.menuItemId;
    const action = ACTIONS[id];

    if (action) {
      const text = info.selectionText;
      if (!text || !text.trim()) return;
      if (action.replace) {
        // Save the selection's Range now so the reply can replace it later.
        const code = "(function(){ " + selectionOp.toString() + "; return selectionOp('save'); })()";
        await execInTab(tab.id, code);
      }
      await openPanel({ prompt: action.coprompt + text, replace: !!action.replace, label: action.label });
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
