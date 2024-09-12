import axios from "axios";


// Utility functions
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class HTTPError extends Error {
  constructor(message) {
    super(message);
    this.name = "HTTPError";
  }
}

const unescapeHtml = (text) =>
  text.replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
const removeHtmlTags = (text) => text.replace(/<[^>]*>/g, "");
const unquoteUrl = (url) => url.replace(" ", "+");

// Main ddg class
class DDG {
  constructor(options = {}) {
    this.limit = options.limit || 4;
    this.limitRead = options.read || 4;
    this.logger = console;
    this.tokenCutoff = options.tokenCutoff || 500;
  }

  async *text(keywords, options = {}) {
    if (!keywords) throw new Error("Keywords are mandatory");

    const vqd = await this.getVqd(keywords);
    if (!vqd) throw new Error("Error in getting vqd");

    const payload = this.buildPayload(keywords, vqd, options, false);
    const cache = new Set();
    const searchPositions = ["0", "20", "70", "120"];
    let count = 0;

    for (const pos of searchPositions) {
      if (count >= this.limit) return;

      payload.s = pos;
      const response = await this.getUrl("GET", "https://links.duckduckgo.com/d.js", payload);
      if (!response) break;

      let { results } = response.data || {};
      if (!results) break;

      const contentFetchPromises = [];

      for (const row of results) {
        if (count >= this.limit) return;

        const href = row.u;
        if (href && !cache.has(href) && !href.includes("google.com")) {
          cache.add(href);

          const body = this.normalizeHtml(row.a);
          if (body) {
            contentFetchPromises.push(this.fetchContent(href).then((fullContent) => {
              return this.mapTextResult(row, body, fullContent);
            }));

            count++;
            if (count >= this.limitRead) break;
          }
        }
      }

      results = await Promise.all(contentFetchPromises);
      for (const result of results) {
        yield result;
      }

      if (count >= this.limit) return;
    }
  }

  async fetchContent(url) {
    try {
      const response = await axios.get(url, { timeout: 4000 });
      const data = response.data;
      const abstract = this.extractAbstract(data);
      return abstract;
    } catch (error) {
      this.logger.warn(`Failed to fetch content from ${url}: ${error.message}`);
      return null;
    }
  }

  extractAbstract(htmlContent) {
    const cleanedContent = htmlContent
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "");

    const matches = cleanedContent.match(
      /<p[^>]*>(.*?)<\/p>|<div[^>]*>(.*?)<\/div>|<span[^>]*>(.*?)<\/span>|<article[^>]*>(.*?)<\/article>|<section[^>]*>(.*?)<\/section>/g
    );

    if (!matches) return "No abstract available";

    let accumulatedText = "";
    let tokenCount = 0;

    for (const match of matches) {
      const text = removeHtmlTags(match).trim();
      const sentenceEnd = /[.!?;]/g;

      if (text.length === 0) continue;

      const words = text.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        tokenCount += Math.ceil(word.length / 4);

        accumulatedText += word + " ";

        if (tokenCount >= this.tokenCutoff) {
          const endOfSentence = text.slice(accumulatedText.length).search(sentenceEnd);
          if (endOfSentence !== -1) {
            accumulatedText =
              accumulatedText.trim() +
              text.slice(accumulatedText.length, accumulatedText.length + endOfSentence + 1);
          }
          return accumulatedText.trim();
        }
      }
    }

    return accumulatedText.trim() || "No abstract available";
  }

  mapTextResult(row, body, fullContent) {
    return {
      title: this.normalizeHtml(row.t),
      href: this.normalizeUrl(row.u),
      body,
      content: fullContent,
    };
  }

  async *images(keywords, options = {}) {
    if (!keywords) throw new Error("Keywords are mandatory");

    const vqd = await this.getVqd(keywords);
    if (!vqd) throw new Error("Error in getting vqd");

    const payload = this.buildPayload(keywords, vqd, options, true);
    const cache = new Set();
    let count = 0;

    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await this.getUrl("GET", "https://duckduckgo.com/i.js", payload);
      if (!response) break;

      const { results, next } = response.data || {};
      if (!results) break;

      for (const row of results) {
        if (count >= this.limit) return;
        const imageUrl = row.image;
        if (imageUrl && !cache.has(imageUrl)) {
          cache.add(imageUrl);
          yield this.mapImageResult(row);
          count++;
        }
      }

      if (!next) break;

      payload.s = this.extractNextPosition(next);
    }
  }

  async getUrl(method, url, params) {
    for (let i = 0; i < 3; i++) {
      try {
        const response = await axios.request({
          method,
          url,
          [method === "GET" ? "params" : "data"]: params,
        });
        if (this.isServerError(response.config.url) || response.status === 202) {
          throw new HTTPError("Server Error");
        }
        if (response.status === 200) return response;
      } catch (error) {
        this.logger.warn(`_getUrl() ${url} ${error.name}: ${error.message}`);
        if (i >= 2 || error.message.includes("418")) throw error;
      }
      await sleep(3000);
    }
    return null;
  }

  async getVqd(keywords) {
    try {
      const response = await this.getUrl("GET", "https://duckduckgo.com", { q: keywords });
      if (response) {
        for (const [startTag, endTag] of [
          ['vqd="', '"'],
          ["vqd=", "&"],
          ["vqd='", "'"],
        ]) {
          const start = response.data.indexOf(startTag) + startTag.length;
          const end = response.data.indexOf(endTag, start);
          if (start !== -1 && end !== -1) return response.data.substring(start, end);
        }
      }
    } catch (error) {
      this.logger.error(`_getVqd() failed for keywords=${keywords}`, error);
    }
    return null;
  }

  buildPayload(keywords, vqd, options, isImageSearch) {
    const safesearchBase = { on: 1, moderate: 1, off: -1 };
    const {
      region = "wt-wt",
      safesearch = "moderate",
      timelimit = null,
      size = null,
      color = null,
      type_image = null,
      layout = null,
      license_image = null,
    } = options;

    return {
      l: region,
      o: "json",
      s: 0,
      q: keywords,
      vqd,
      f: [
        timelimit && `time:${timelimit}`,
        size && `size:${size}`,
        color && `color:${color}`,
        type_image && `type:${type_image}`,
        layout && `layout:${layout}`,
        license_image && `license:${license_image}`,
      ]
        .filter(Boolean)
        .join(","),
      p: safesearchBase[safesearch.toLowerCase()],
    };
  }

  mapImageResult(row) {
    return {
      title: row.title,
      image: this.normalizeUrl(row.image),
      thumbnail: this.normalizeUrl(row.thumbnail),
      url: this.normalizeUrl(row.url),
      height: row.height,
      width: row.width,
      source: row.source,
    };
  }

  normalizeHtml(rawHtml) {
    return rawHtml ? unescapeHtml(removeHtmlTags(rawHtml)) : "";
  }

  normalizeUrl(url) {
    return url ? unquoteUrl(url) : "";
  }

  extractNextPosition(nextUrl) {
    return nextUrl.split("s=")[1]?.split("&")[0];
  }

  isServerError(url) {
    return url.includes("500");
  }
}

export default DDG;