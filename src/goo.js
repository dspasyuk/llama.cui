import axios from 'axios';

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
      numCharacters: 200
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
        console.log(JSON.stringify(searchResults))
        return searchResults;
      } else {
        console.log('No search results found');
        return [];
      }
    } catch (error) {
      console.error('Error searching Google:', error);
      if (error.response) {
        console.log('Error response:', error.response.data);
        console.log('Error status:', error.response.status);
        console.log('Error headers:', error.response.headers);
      } else {
        console.log('Error:', error.message);
      }
      return [];
    }
  }
}

export default GOOG; 
