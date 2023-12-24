const axios = require('axios');

function Par() {}

Par.LinkPahtDetector = function (text) {
  var urlRegex = /(https?:\/\/[^\s]+)/g;
  // Regular expression to match file paths without ending quotation mark
  var filePathRegex = /(?:\b\w:|\/)[^\s'"]+(?=['"]?\b)/g;
  // Find URLs in the text
  var urls = text.match(urlRegex);
  // Find file paths in the text
  var filePaths = text.match(filePathRegex);
  return {
    links: urls || [],
    paths: filePaths || [],
  };
};

Par.getMatchesWithIndices = function (text, regex) {
  var matches = [];
  var match;
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      codeSnippet: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  return matches;
};

Par.CodeDetector = function (text) {
  // Regular expression to match C code
  var cCodeRegex = /\b(int|char|void|if|else|for|while|return)\b/g;
  // Regular expression to match Python code
  var pythonCodeRegex = /\b(def|if|else|for|while|return)\b/g;
  // Regular expression to match JavaScript code
  var jsCodeRegex = /\b(var|let|const|if|else|for|while|function|return)\b/g;
  // Find C code snippets in the text
  var cCodeMatches = Par.getMatchesWithIndices(text, cCodeRegex);
  // Find Python code snippets in the text
  var pythonCodeMatches = Par.getMatchesWithIndices(text, pythonCodeRegex);
  // Find JavaScript code snippets in the text
  var jsCodeMatches = Par.getMatchesWithIndices(text, jsCodeRegex);
  // Return the results
  return {
    cCode: cCodeMatches || [],
    pyCode: pythonCodeMatches || [],
    jsCode: jsCodeMatches || [],
  };
};

Par.extractText = async function(text, minWords = 2, targetWordsPerChunk = 200, wordsPerChunkVariation = 10) {
  // console.log(text);
  const extractedText = [];
  let currentBlock = '';
  let currentWords = 0;

  const processBlock = (block) => {
    const sentences = block.split(/[.!?]+/);
    let currentSentence = '';

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);

      if (words.length >= minWords && isNaN(words[0])) {
        currentSentence += sentence.trim() + ' ';
        currentWords += words.length;
      } else if (currentSentence.trim() !== '') {
        extractedText.push(currentSentence.trim() + ' ');
        currentSentence = '';
      }

      if (currentWords >= targetWordsPerChunk - wordsPerChunkVariation) {
        extractedText.push(currentSentence.trim());
        currentSentence = '';
        currentWords = 0;
      }
    }

    if (currentSentence.trim() !== '') {
      extractedText.push(currentSentence.trim());
      currentWords = 0;
    }
  };

  const paragraphs = text.split(/\n+/);

  for (const paragraph of paragraphs) {
    currentBlock += paragraph.trim() + ' ';

    if (currentBlock.split(/\s+/).length >= targetWordsPerChunk) {
      processBlock(currentBlock);
      currentBlock = '';
    }
  }

  if (currentBlock.trim() !== '') {
    processBlock(currentBlock);
  }

  // Combine small chunks to meet the target length
  const combinedChunks = [];
  let currentCombinedChunk = '';

  for (const chunk of extractedText) {
    if ((currentCombinedChunk + chunk).split(/\s+/).length <= targetWordsPerChunk + wordsPerChunkVariation) {
      currentCombinedChunk += chunk;
    } else {
      combinedChunks.push(currentCombinedChunk.trim());
      currentCombinedChunk = chunk;
    }
  }

  if (currentCombinedChunk.trim() !== '') {
    combinedChunks.push(currentCombinedChunk.trim());
  }

  return combinedChunks;
}


Par.extractTextFromWebpage = async function(url, minWords = 5) {
  const cheerio = require('cheerio');

  try {
    // Make an HTTP request to the webpage
    const response = await axios.get(url);
    // Load the HTML content into cheerio
    const $ = cheerio.load(response.data);
    // Extract text using a specific selector (modify as needed)
    const extractedText = [];
    let currentBlock = '';  // Variable to store consecutive lines as a block
    $('p').each((index, element) => {
      const text = $(element).text().trim();
      const words = text.split(/\s+/);
      // Only include text with more than minWords words
      if (words.length >= minWords) {
        currentBlock += text + ' ';  // Add the text to the current block
      } else if (currentBlock.trim() !== '') {
        extractedText.push(currentBlock.trim());  // Push the current block if not empty
        currentBlock = '';  // Reset the current block
      }
    });
    // Check if the last block is not empty
    if (currentBlock.trim() !== '') {
      extractedText.push(currentBlock.trim());
    }

    return extractedText.join('\n');
  } catch (error) {
    console.error('Error extracting text:', error.message);
    throw error;
  }
}



Par.test = async function(){
   let url = "https://www.danword.com/crossword/Another_name_for_annabergite_rbnd"
  console.log(await Par.extractTextFromWebpage(url));
  console.log(url);
}


try {
  module.exports = exports = Par;
} catch (e) {}
