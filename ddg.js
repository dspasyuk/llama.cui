const axios = require("axios");
const { timeout } = require("./config");
// Utility functions
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class HTTPError extends Error {
  constructor(message) {
    super(message);
    this.name = "HTTPError";
  }
}

const unescapeHtml = (text) => text.replace(/&quot;/g, '"');
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

      const { results } = response.data || {};
      if (!results) break;

      for (const row of results) {
        if (count >= this.limit) return;
        const href = row.u;
        if (href && !cache.has(href) && !href.includes("google.com")) {
          cache.add(href);
          const body = this.normalizeHtml(row.a);
          if (body) {
            const fullContent = await this.fetchContent(href); // Fetch full content
            yield this.mapTextResult(row, body, fullContent);
            count++;
            if (count >= 3) break; // Limit to first 3 results
          }
        }
      }
    }
  }

 async fetchContent(url) {
    try {
      const response = await axios.get(url, {timeout:5000});
      const data = response.data;
      // Simplified extraction of the content/abstract from the page
      const abstract = this.extractAbstract(data);
      return abstract;
    } catch (error) {
      this.logger.warn(`Failed to fetch content from ${url}: ${error.message}`);
      return null;
    }
  }

 extractAbstract(htmlContent) {
    // Remove script, style, and comments
    const cleanedContent = htmlContent
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, ''); // Remove HTML comments

    // Match all text within common text-containing tags
    const matches = cleanedContent.match(/<p[^>]*>(.*?)<\/p>|<div[^>]*>(.*?)<\/div>|<span[^>]*>(.*?)<\/span>|<article[^>]*>(.*?)<\/article>|<section[^>]*>(.*?)<\/section>/g);

    if (!matches) return "No abstract available";

    // Accumulate text and track token count
    let accumulatedText = "";
    let tokenCount = 0;

    for (const match of matches) {
      const text = removeHtmlTags(match).trim(); // Trim to remove extra whitespace
      const sentenceEnd = /[.!?;]/g; // Regex to identify sentence endings

      if (text.length === 0) continue; // Skip empty texts

      const words = text.split(/\s+/); // Split text into words
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        tokenCount += Math.ceil(word.length / 4); // Approximate token count

        accumulatedText += word + " ";

        // Check if the token limit is exceeded
        // console.log("Token count:", tokenCount);
        if (tokenCount >= this.tokenCutoff) {
          // Look for the nearest sentence-ending punctuation
          const endOfSentence = text.slice(accumulatedText.length).search(sentenceEnd);
          if (endOfSentence !== -1) {
            accumulatedText = accumulatedText.trim() + text.slice(accumulatedText.length, accumulatedText.length + endOfSentence + 1);
          }
          return accumulatedText.trim(); // Return accumulated text at sentence boundary
        }
      }
    }

    // console.log("Final accumulated text:", accumulatedText);
    return accumulatedText.trim() || "No abstract available";
  }

 mapTextResult(row, body, fullContent) {
    return {
      title: this.normalizeHtml(row.t),
      href: this.normalizeUrl(row.u),
      body,
      content: fullContent, // Include the fetched content or abstract
    };
  }

  async *images(keywords, options = {}) {
    if (!keywords) throw new Error("Keywords are mandatory");

    const vqd = await this.getVqd(keywords);
    if (!vqd) throw new Error("Error in getting vqd");

    const payload = this.buildPayload(keywords, vqd, options, true);
    const cache = new Set();
    let count = 0; // Counter to limit the number of results

    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await this.getUrl("GET", "https://duckduckgo.com/i.js", payload);
      if (!response) break;

      const { results, next } = response.data || {};
      if (!results) break;

      for (const row of results) {
        if (count >= this.limit) return; // Exit when the limit is reached
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

  // Helper functions
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
        for (const [startTag, endTag] of [['vqd="', '"'], ["vqd=", "&"], ["vqd='", "'"]]) {
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

// Export the class for use in client-side code
module.exports = DDG;
