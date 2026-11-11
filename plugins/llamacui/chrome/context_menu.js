// Llama.cui — in-page context menu for hosts that suppress the native menu.
//
// Outlook on the web intercepts `contextmenu` and draws its own menu, which
// suppresses the browser's native menu — and with it this extension's
// context-menu items (they only ever appear in the native menu). This script
// draws a compact Llama.cui menu next to the cursor whenever there is a live
// text selection in this frame. (It is only injected on Outlook hosts, so
// showing it even when the native menu also appears is acceptable.)
//
// The selection is captured in the CAPTURE phase, before the page's own
// handlers run — some editors clear it when their menu opens.
//
// Shared file: byte-identical in chrome/ and mozilla/. `browser` comes from
// browser-polyfill.js (Chrome) or natively (Firefox, where the polyfill is
// a no-op).

(() => {
  if (window.__llcuiMenuInstalled) return;
  window.__llcuiMenuInstalled = true;

  let actions = null; // fetched once from the background (single source of truth)
  let menuEl = null;

  console.log("[llamacui] in-page menu ready in " + location.href);

  async function loadActions() {
    if (!actions) {
      try {
        const res = await browser.runtime.sendMessage({ type: "GET_ACTIONS" });
        actions = (res && res.success && res.actions) || [];
      } catch (e) {
        actions = []; // extension reloaded while the page was open
      }
    }
    return actions;
  }

  function hideMenu() {
    if (menuEl) { menuEl.remove(); menuEl = null; }
    document.removeEventListener("mousedown", onOutsideDown, true);
    document.removeEventListener("keydown", onEscape, true);
    window.removeEventListener("blur", hideMenu);
  }

  function onOutsideDown(e) {
    if (menuEl && !menuEl.contains(e.target)) hideMenu();
  }

  function onEscape(e) {
    if (e.key === "Escape") hideMenu();
  }

  function styled(tag, styles) {
    const n = document.createElement(tag);
    for (const k of Object.keys(styles)) n.style[k] = styles[k];
    return n;
  }

  // Same pipeline as a native context-menu click: the background stores the
  // payload and opens the panel; the panel sends it (or, for `ask`, puts it
  // in the input box) and later asks the background to REPLACE_SELECTION.
  function sendOpen(payload) {
    try {
      const p = browser.runtime.sendMessage({ type: "OPEN_PANEL", payload });
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* extension context invalidated */ }
  }

  function runAction(a, text, savedRange) {
    hideMenu();
    if (a.replace && savedRange) {
      // Stash the range in THIS frame. Content scripts and the background's
      // executeScript share the same isolated world, so the allFrames
      // replace pass finds it.
      window.__llcuiRange = savedRange.cloneRange();
    }
    const payload = { prompt: a.coprompt + text, replace: !!a.replace, label: a.label };
    if (a.insert) payload.insert = a.insert;
    sendOpen(payload);
  }

  function buildMenu(items, x, y) {
    hideMenu();
    const menu = styled("div", {
      position: "fixed",
      zIndex: "2147483647",
      minWidth: "216px",
      padding: "5px",
      background: "#20242e",
      color: "#e8eaed",
      border: "1px solid rgba(255,255,255,0.14)",
      borderRadius: "8px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
      fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
      fontSize: "13px",
      boxSizing: "border-box",
    });

    const header = styled("div", {
      padding: "5px 10px 6px",
      fontWeight: "600",
      color: "#8ab4f8",
      borderBottom: "1px solid rgba(255,255,255,0.1)",
      marginBottom: "4px",
    });
    header.textContent = "Llama.cui";
    menu.appendChild(header);

    for (const it of items) {
      const item = styled("div", {
        padding: "6px 10px",
        borderRadius: "5px",
        cursor: "default",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      });
      item.textContent = it.label;
      item.addEventListener("mouseenter", () => { item.style.background = "rgba(138,180,248,0.18)"; });
      item.addEventListener("mouseleave", () => { item.style.background = "transparent"; });
      item.addEventListener("mousedown", (e) => {
        e.preventDefault(); // keep the page selection alive
        e.stopPropagation();
        it.run();
      });
      menu.appendChild(item);
    }

    (document.body || document.documentElement).appendChild(menu);
    menuEl = menu;

    // Sit to the LEFT of the page's menu (which opens at/above the cursor
    // and grows rightward); flip to the right side when there's no room.
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;
    let left = x - w - 12;
    if (left < 8) left = Math.min(window.innerWidth - w - 8, x + 240);
    const top = Math.min(y, Math.max(8, window.innerHeight - h - 8));
    menu.style.left = left + "px";
    menu.style.top = top + "px";

    document.addEventListener("mousedown", onOutsideDown, true);
    document.addEventListener("keydown", onEscape, true);
    window.addEventListener("blur", hideMenu);
  }

  function showMenu(x, y, text, savedRange) {
    loadActions().then((list) => {
      const groupLabel = (g) => (g === "edit" ? "Edit" : g === "mail" ? "Email" : "Understand");
      const items = list.map((a) => ({
        label: groupLabel(a.group) + " — " + a.label,
        run: () => runAction(a, text, savedRange),
      }));
      items.push({
        label: "Ask about this…",
        run: () => {
          hideMenu();
          sendOpen({ prompt: "About this text:\n\n" + text, replace: false, ask: true, label: "Ask" });
        },
      });
      items.push({
        label: "Summarize this page",
        run: () => {
          const t = document.body ? (document.body.innerText || "") : "";
          const snippet = t.length > 4000 ? t.slice(0, 4000) + "…" : t;
          hideMenu();
          sendOpen({ prompt: "Summarize this page content:\n\n" + snippet, replace: false, label: "Summarize page" });
        },
      });
      buildMenu(items, x, y);
    });
  }

  document.addEventListener("contextmenu", (e) => {
    // Capture phase: grab the selection BEFORE the page's handlers run —
    // some editors clear it when their own menu opens.
    let text = "";
    let savedRange = null;
    try {
      const sel = window.getSelection();
      text = sel ? sel.toString().trim() : "";
      savedRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
    } catch (err) { /* ignore */ }
    if (!text) return;

    const ev = e;
    setTimeout(() => {
      if (menuEl) return; // already open
      console.log(
        "[llamacui] in-page menu: " + text.length + " chars (native menu " +
        (ev.defaultPrevented ? "suppressed by page" : "also showing") + ")"
      );
      showMenu(ev.clientX, ev.clientY, text, savedRange);
    }, 0);
  }, true);
})();
