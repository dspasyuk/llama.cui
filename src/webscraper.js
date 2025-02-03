import https from 'https';
import zlib from 'zlib';

class Scraper {
  constructor(url) {
    this.url = url;
    this.text = '';
    this.insideTag = false;
    this.skipContent = false;
  }

  async scrape() {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      };

      https.get(this.url, options, (res) => {
        let data = [];
        const encoding = res.headers['content-encoding'];
        let stream = res;
        if (encoding === 'gzip') stream = res.pipe(zlib.createGunzip());
        else if (encoding === 'deflate') stream = res.pipe(zlib.createInflate());
        else if (encoding === 'br') stream = res.pipe(zlib.createBrotliDecompress());
        stream.on('data', (chunk) => data.push(chunk));
        stream.on('end', () => {
          const html = Buffer.concat(data).toString();
          resolve(this.extractText(html));
        });
      }).on('error', reject);
    });
  }

  extractText(html) {
    let index = 0, text = '', insideTag = false, skipContent = false;
    const tagSkips = new Set(['script', 'style', 'noscript', 'iframe']);

    while (index < html.length) {
      if (html[index] === '<') {
        insideTag = true;
        let tagName = '';
        index++;

        while (html[index] !== '>' && index < html.length) {
          if (html[index] === ' ' || html[index] === '\n') break;
          tagName += html[index].toLowerCase();
          index++;
        }

        if (tagSkips.has(tagName)) skipContent = true;
        else if (tagName.startsWith('/')) skipContent = false;

        while (html[index] !== '>' && index < html.length) index++;
        insideTag = false;
      } else if (!insideTag && !skipContent) {
        text += html[index];
      }
      index++;
    }

    return this.cleanText(text);
  }

  cleanText(text) {
    const entityMap = { '&nbsp;': ' ', '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'" };
    return text.replace(/&[a-zA-Z0-9#]+;/g, (match) => entityMap[match] || match).replace(/\s+/g, ' ').trim();
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