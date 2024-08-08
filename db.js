const { LocalIndex } = require("vectra");
const path = require("path");
const config = require("./config.js");
const fs = require("fs");
const reader = require('any-text');
const { exec } = require("child_process");
function vdb() {}

vdb.init = async function (
  query = "Tell me about bull riding shotgun",
  dbfile = "./db/Documents/index.json"
) {
  vdb.pipeline;
  this.dbFile = dbfile;
  this.index = {};
  this.useLlamaEmbedding = false;
  this.dataChannel = new Map();
  this.dataChannel.set("Documents", {
    datastream: "Documents", 
    datafolder: "./docs",
    slice: 500,
    vectordb: "Documents.js"
  });
  
  this.dataChannel.set("MongoDB", {
    datastream: "MongoDB",
    database: "fortknox",
    collection: "clientlist",
    url: "MongoDB://localhost:27017/",
    vectordb: "Mongodb.js",
    slice: 2000,
  });
  
  this.dataChannel.set("WebSearch", { datastream: "WebSearch", slice: 2000 });
  this.TransOptions = { pooling: "mean", normalize: false };
  try {
    const transformersModule = await import("@xenova/transformers");
    vdb.pipeline = transformersModule.pipeline;
    vdb.getVector = await this.pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  } catch (e) {
    console.error("Error importing @xenova/transformers:", e);
  }
  // console.log("vdb.init", vdb.getVector);
  await vdb.initVectorDB();
  var result = await vdb.query(query);
  if (result) {
    return result;
  } else {
    return false;
  }
};


vdb.initIndex = async function(type){
  const indexPath = path.join(__dirname, "db", this.dataChannel.get(type).datastream);
  this.index = new LocalIndex(indexPath);

  if (!(await this.index.isIndexCreated())) {
    await this.index.createIndex();
  }
  const indexFile = path.join(indexPath, "index.json");
  if (fs.existsSync(indexFile)) {
    const fileSize = fs.statSync(indexFile).size;
    if (fileSize > 200) {
      console.log(`Database exists ${this.dataChannel.get(type).datastream}`);
    } else {
      await (type === "MongoDB" ? this.pullDatabase() : this.pullDocuments(this.dataChannel.get("Documents").datafolder));
    }
  }
};

vdb.initVectorDB = async function () {
  if (config.embedding.MongoDB) {
    await vdb.initIndex("MongoDB");
  }
  if (config.embedding.Documents) {
    await vdb.initIndex("Documents");
  }
};

vdb.readFile = async function (filePath) {
  var slice;
  let tokens = await reader.getText(filePath);
  tokens = tokens.replace(/\n\n/g, " ");
  // console.log(tokens);
  const sliceSize = this.dataChannel.get("Documents").slice;
  for (let i = 0; i < tokens.length; i += sliceSize) {
        slice = `${filePath};\n\n` + tokens.slice(i, i + sliceSize);
        await this.addItem(slice);
    }
};

vdb.tokenize = function (text) {
  // Split the text into words using whitespace as the separator
  const words = text.split(/\s+/);
  const cleanWords = words
    .filter((word) => word.length > 0 && !word.match(/[^a-zA-Z0-9]/))
    .join(" ");
  // console.log(cleanWords);
  return cleanWords;
};

vdb.pullDocuments = function(dir) {
  fs.readdir(dir, { withFileTypes: true }, async (err, files) => {
      if (err) {
          console.error(`Error reading directory ${dir}:`, err);
          return;
      }
      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fullPath = path.join(dir, file.name);
          if (file.isDirectory()) {
              // Recursively traverse subdirectories
              console.log(fullPath);
              vdb.pullDocuments(fullPath);
          } else if (file.isFile() && path.extname(file.name) === '.txt' || path.extname(file.name) === '.doc' || path.extname(file.name) === '.docx') {
              // Read text files and handle their content
              await vdb.readFile(fullPath);
              console.log(fullPath);
          }
      }
  });
}

vdb.pullDatabase = async function () {
  const mdb = require("./mgdb.js");
  var cfg = this.dataChannel.get("MongoDB");
  var mjdb = new mdb(cfg.url, cfg.database);
  var documents = await mjdb.find(cfg.collection, {});
  for (let i = 0; i < documents.length; i++) {
    await this.addItem(vdb.sentanceCompose(documents[i]));
  }
};

vdb.transInit = async function () {
  return await this.pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
};

vdb.sentanceCompose = function (data) {
  let values = [];
  for (const [key, value] of Object.entries(data)) {
    if (!key.includes("id")) {
      if (value !== "" && value !== null && value !== undefined) {
        values.push(`${key} : ${value}`); //Return key value pair as string
      }
    }
  }
  // console.log(values.join(", "));
  return values.join(" ");
};

vdb.addItem = async function (text) {
  var vector;
  if (this.useLlamaEmbedding) {
    vector = await this.getLlamaEmbedding(text);
  } else {
    vector = await vdb.getVector(text, vdb.TransOptions);
  }
  await this.index.insertItem({
    vector: Array.from(vector.data),
    metadata: { text },
  });
};

vdb.indexCreate = async function () {
  if (!(await this.index.isIndexCreated())) {
    await this.index.createIndex();
    console.log("Created");
  }
};

vdb.findUniqueStrings = function (inputString) {
  // Split the large string into individual strings (e.g., by spaces or any other delimiter)
  const splitStrings = inputString.split(/\s+/);
  // // Use a Set to store unique strings
  // const uniqueWords = new Set();
  // // Step 3: Iterate through the tokenized words/entries and add them to the data structure
  // for (const word of splitStrings) {
  //   uniqueWords.add(word.toLowerCase()); // You may want to convert to lowercase for case-insensitive matching
  // }
  return Array.from(splitStrings).slice(0, 512);
};

vdb.combineDictionaries = function (...dictionaries) {
  var result = {};
  for (const dict of dictionaries) {
    for (const key in dict) {
      if (dict.hasOwnProperty(key)) {
        // If the key already exists in the result dictionary, add the values
        if (result.hasOwnProperty(key)) {
          result[key] += dict[key];
        } else {
          // Otherwise, initialize the key in the result dictionary
          result[key] = dict[key];
        }
      }
    }
  }
  return result;
};

vdb.query = async function (text) {
  var vector,
  data = [];
  if (this.useLlamaEmbedding) {
    vector = await this.getLlamaEmbedding(text);
  } else {
    vector = await vdb.getVector(text, vdb.TransOptions);
  }
  
  const results = await this.index.queryItems(Array.from(vector.data), 7);
  // console.log(text, vector.data);
  // console.log(text, JSON.stringify(results));
  if (results.length > 0) {
    for (let result of results) {
      if (result.score > 0.4) {
        data.push(result.item.metadata.text);
      }
    }
    let unique = vdb.findUniqueStrings(data.join(" "));
    return "\n\n"+unique.join(" ")+"\n\n"; // need to unique before joining
  } else {
    console.log(`No results found.`);
    return false;
  }
};

vdb.getLlamaEmbedding = function (text) {
  // console.log("text", text);
  return new Promise((resolve, reject) => {
    const llamaembed = config.llamacpp.replace("llama-cli", "llama-embedding"); 
    const embedmodel = config.llamacpp.replace("llama-cli", "snowflake-q8_0.gguf");
    exec(`${llamaembed} -m ${embedmodel} -e -p "${text}" --embd-output-format array  -ngl 99`, (error, stdout, stderr) => {
      if (error) {
        reject(`error: ${error.message}`);
      }
      try{
         if (stdout.includes("nan")) return;
         const vector = JSON.parse(stdout);
        //  console.log("vector", vector);
         resolve({ data: vector[0] });
      }catch(e){
          console.log(e);
          reject(`error: ${e.message}`);
        }
    });
  });
};

async function run(){
 await vdb.init();
 await vdb.pullDocuments(vdb.dataChannel.get("Documents").datafolder);
//vdb.getLlamaEmbedding ("Hello World");
}

//run();
try {
  module.exports = exports = vdb;
} catch (e) {}
