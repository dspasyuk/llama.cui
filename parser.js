const axios = require('axios');
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;

function Par() {}

Par.codeeval = async function(code, exe, opt) {
  const child = spawn(exe, [opt, code]);

  let output = '';
  let error = '';

  // Capture stdout
  child.stdout.on('data', (data) => {
    output += data.toString();
  });

  // Capture stderr
  child.stderr.on('data', (data) => {
    error += data.toString();
  });

  // Wait for process exit
  await new Promise((resolve, reject) => {
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(output); // Resolve with output if successful
      } else {
        reject(new Error(error)); // Reject with error message if failed
      }
    });
  });

  return output;
}


Par.LinkPahtDetector = function (text) {
  var urlRegex = /(https?:\/\/[^\s]+)/gm;
  // Regular expression to match file paths without ending quotation mark
  var filePathRegex = /(?:\b\w:|\/)[^\s'"]+(?=['"]?\b)/gm;
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
    // console.log(match);
    matches.push({
      codeSnippet: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  return matches;
};


Par.CodeDetector = function (text) {
 // Regular expression to match JavaScript code
 // Regex was borowed from highlight.js
//  var jsCodeRegex = /(\b(function|if|else|while|for|switch|case|return|new|var|let|const|class|import|export|async|await|yield|Infinity|true|false|this|\d+)\b)|([{}\[\]];,:)/gm;
 var jsCodeRegex =  /```javascrip([\s\S]*?)```/gm;
 var npmreg =  /```(?!(?:javascript|js)\b)([\s\S]*?)```/gm
  // Find JavaScript code snippets in the text
  var jsCodeMatches = Par.getMatchesWithIndices(text, jsCodeRegex);
  var npm = Par.getMatchesWithIndices(text, npmreg);
  // Return the results
  // console.log("JavaScript Code Matches:", jsCodeMatches);
  return {
    js: jsCodeMatches || [],
    bash: npm || [],
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


Par.installPackage = function(package){
    exec(`npm install ${package}`, async (error, stdout, stderr) => {
    if(error) {
      console.log('error is:' , error);
      throw error;
    }
      console.log(stdout);
});
}

Par.fixError = async function(message){
   let errMessage = "Cannot find module";
   if(message.includes(errMessage)){
    let index =  message.indexOf(errMessage); 
    let prefix =  message.slice(errMessage.length+index);
    let package = prefix.split("\n");
    package = package[0].replace(/'/g,"");
    console.log("Package:", package);
    await Par.installPackage(package);
  }else{
    return message;
  }
}

Par.runEval = async function(message){
  var els = Par.CodeDetector(message);
  // console.log(els);
  try{
    if(els.js.length>0){
      var code = (els.js[0].codeSnippet).replace("```", "").replace("javascript", "").replace("```", "");
      var result = await Par.codeeval(code, "node", "-e");
      return result;
    }else if(els.bash.length>0){
      var code = (els.bash[0].codeSnippet).replace("```", "").replace("  ", " ").replace("```", "");
      var result = await Par.codeeval(code, "", "");
    }
    else{
      return false;
    }
}  catch(err){
      return err;
}
}


try {
  module.exports = exports = Par;
} catch (e) {}
