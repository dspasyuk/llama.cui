// Exa web search — the same search OpenCode uses (Exa via MCP-over-HTTP).
// Returns clean, pre-extracted page text; no HTML scraping required.
// Works keyless against the hosted endpoint, or with EXA_API_KEY for higher
// limits. Falls back to Parallel if EXA is unavailable and PARALLEL_API_KEY
// is set.
// License MIT

const EXA_URL = () =>
  process.env.EXA_API_KEY
    ? `https://mcp.exa.ai/mcp?exaApiKey=${encodeURIComponent(process.env.EXA_API_KEY)}`
    : "https://mcp.exa.ai/mcp";

const PARALLEL_URL = "https://search.parallel.ai/mcp";

class WebSearch {
  constructor(options = {}) {
    this.numResults = options.numResults || 5;
    this.type = options.type || "auto"; // auto | fast | deep
    this.contextMaxCharacters = options.contextMaxCharacters || 2000;
    this.timeout = options.timeout || 25000;
  }

  // POST a JSON-RPC tools/call to an MCP endpoint and return the text result.
  async _callMcp(url, body, headers = {}) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...headers,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    });
    if (!res.ok) {
      throw new Error(`MCP ${res.status} ${res.statusText}`);
    }
    const raw = await res.text();
    return this._extractText(raw);
  }

  // Response is either direct JSON or an SSE stream of `data: {...}` lines.
  _extractText(raw) {
    const tryParse = (s) => {
      const data = JSON.parse(s);
      const item = (data.result?.content || []).find((c) => c.text);
      return item ? item.text : null;
    };
    // Direct JSON body
    try {
      const t = tryParse(raw);
      if (t) return t;
    } catch (_) {}
    // SSE stream
    for (const line of raw.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      try {
        const t = tryParse(line.slice(6));
        if (t) return t;
      } catch (_) {}
    }
    return null;
  }

  // Exa: returns structured results parsed from the text blob.
  async searchExa(query) {
    const text = await this._callMcp(
      EXA_URL(),
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "web_search_exa",
          arguments: {
            query,
            type: this.type,
            numResults: this.numResults,
            livecrawl: "fallback",
            contextMaxCharacters: this.contextMaxCharacters,
          },
        },
      }
    );
    if (!text || !text.trim()) return [];
    return this._parseResults(text);
  }

  // Parallel: alternative provider (requires PARALLEL_API_KEY).
  async searchParallel(query) {
    const headers = {};
    if (process.env.PARALLEL_API_KEY) {
      headers.Authorization = `Bearer ${process.env.PARALLEL_API_KEY}`;
    }
    const text = await this._callMcp(
      PARALLEL_URL,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "web_search",
          arguments: {
            objective: query,
            search_queries: [query],
          },
        },
      },
      headers
    );
    if (!text || !text.trim()) return [];
    return this._parseResults(text);
  }

  // Parse the "Title:/URL:...\n---\nTitle:..." blob into structured results.
  _parseResults(text) {
    const results = [];
    for (const block of text.split(/\n-{3,}\n/)) {
      const r = {};
      let highlights = [];
      let inHighlights = false;
      for (const line of block.split("\n")) {
        if (line.startsWith("Title:")) {
          r.title = line.slice(6).trim();
        } else if (line.startsWith("URL:")) {
          r.href = line.slice(4).trim();
        } else if (line.startsWith("Published:")) {
          r.published = line.slice(10).trim();
        } else if (line.startsWith("Author:")) {
          r.author = line.slice(7).trim();
        } else if (line.startsWith("Highlights:")) {
          inHighlights = true;
        } else if (inHighlights) {
          if (line.trim()) highlights.push(line.trim());
        }
      }
      r.content = highlights.join(" ");
      if (r.href) results.push(r);
    }
    return results;
  }

  // Try Exa first, fall back to Parallel if a key is configured.
  async search(query) {
    try {
      const results = await this.searchExa(query);
      if (results.length) return results;
    } catch (err) {
      console.error("Exa search failed:", err.message);
    }
    if (process.env.PARALLEL_API_KEY) {
      try {
        return await this.searchParallel(query);
      } catch (err) {
        console.error("Parallel search failed:", err.message);
      }
    }
    return [];
  }
}

export default WebSearch;
