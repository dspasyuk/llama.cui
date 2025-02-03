import axios from 'axios';
import Scraper from './webscraper.js';

class GOOG {
  constructor() {
    this.baseUrl = 'https://www.googleapis.com/customsearch/v1';
  }

  async searchGoogle(keywords, apiKey, SearchEngineID, num = 4) {
    const params = {
      key: apiKey,
      cx: SearchEngineID,
      q: keywords,
      num: num,
    };
    try {
      const response = await axios.get(this.baseUrl, { params });
      const data = response.data;

      if (data.items) {
        const searchResults = data.items.map((item) => ({
          title: item.title,
          href: item.link,
          url: item.link,
          content: item.snippet,
        }));
        return searchResults;
      } else {
        console.log('No search results found');
        return [];
      }
    } catch (error) {
      console.error('Error searching Google:', error);
      return [];
    }
  }

  async searchAndScrape(keywords, apiKey, SearchEngineID, num = 4) {
    const searchResults = await this.searchGoogle(keywords, apiKey, SearchEngineID, num);
    
    for (let result of searchResults) {
      try {
        const scraper = new Scraper(result.url);
        const extractedText = await scraper.scrape();
        result.extractedContent = extractedText;
      } catch (err) {
        console.error(`Failed to scrape ${result.url}:`, err.message);
        result.extractedContent = 'Scraping failed.';
      }
    }

    return searchResults;
  }
}

export default GOOG;