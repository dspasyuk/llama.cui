import https from "https";
import zlib from "zlib";

class Scraper {
  constructor(url) {
    this.url = url;
    this.text = "";
    this.insideTag = false;
    this.skipContent = false;
    this.userAgentList = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:105.0) Gecko/20100101 Firefox/105.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.0.0",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36 OPR/75.0.3969.149",
      "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15",
      "Mozilla/5.0 (Linux; Ubuntu 22.04; x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Linux; Debian 11; x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Mobile/15E148 Safari/605.1.15",
      "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Mobile/15E148 Safari/605.1.15",
      "Mozilla/5.0 (Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:110.0) Gecko/20100101 Firefox/110.0",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36",
    ];
  }

  // List of User-Agents to rotate

  async scrape(retryCount = 0) {
    try {
      const html = await this.makeRequest();
      if (html.includes("just a moment")) {
        if (retryCount < this.maxRetries) {
          console.log(`Anti-bot measure detected. Retrying... (Attempt ${retryCount + 1}/${this.maxRetries})`);
          return this.scrape(retryCount + 1);
        } else {
          throw new Error("Max retries exceeded");
        }
      }
      return this.extractText(html);
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.log(`Error occurred. Retrying... (Attempt ${retryCount + 1}/${this.maxRetries})`);
        return this.scrape(retryCount + 1);
      } else {
        throw new Error(`Failed after ${this.maxRetries} retries: ${error.message}`);
      }
    }
  }

  makeRequest() {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          "User-Agent": this.getRandomUserAgent(),
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://www.example.com/",
          Connection: "keep-alive",
        },
      };

      const req = https
        .get(this.url, options, (res) => {
          let data = [];
          const encoding = res.headers["content-encoding"];
          let stream = res;

          if (encoding === "gzip") {
            stream = res.pipe(zlib.createGunzip());
          } else if (encoding === "deflate") {
            stream = res.pipe(zlib.createInflate());
          } else if (encoding === "br") {
            stream = res.pipe(zlib.createBrotliDecompress());
          }

          stream.on("data", (chunk) => {
            data.push(chunk);
          });

          stream.on("end", () => {
            const html = Buffer.concat(data).toString();
            resolve(html);
          });
        })
        .on("error", (err) => {
          reject(err);
        });

      req.on("socket", (socket) => {
        socket.setTimeout(5000);
        socket.on("timeout", () => {
          reject(new Error("Request timed out"));
        });
      });
    });
  }

  extractText(html) {
    let index = 0,
      text = "",
      insideTag = false,
      skipContent = false;
    const tagSkips = new Set(["script", "style", "noscript", "iframe"]);

    while (index < html.length) {
      if (html[index] === "<") {
        insideTag = true;
        let tagName = "";
        index++;

        while (html[index] !== ">" && index < html.length) {
          if (html[index] === " " || html[index] === "\n") break;
          tagName += html[index].toLowerCase();
          index++;
        }

        if (tagSkips.has(tagName)) skipContent = true;
        else if (tagName.startsWith("/")) skipContent = false;

        while (html[index] !== ">" && index < html.length) index++;
        insideTag = false;
      } else if (!insideTag && !skipContent) {
        text += html[index];
      }
      index++;
    }

    return this.cleanText(text);
  }

  getRandomUserAgent() {
    return this.userAgentList[Math.floor(Math.random() * this.userAgentList.length)];
  }

  cleanText(text) {
    const entityMap = { "&nbsp;": " ", "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"', "&#39;": "'" };
    return text
      .replace(/&[a-zA-Z0-9#]+;/g, (match) => entityMap[match] || match)
      .replace(/\s+/g, " ")
      .trim();
  }
}

// // Example usage
// (async () => {
//   const url = 'https://www.radiacode.com/';
//   const scraper = new Scraper(url);
//   try {
//     console.log(await scraper.scrape());
//   } catch (err) {
//     console.error('Error:', err.message);
//   }
// })();

export default Scraper;
