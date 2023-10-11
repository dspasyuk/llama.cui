const { LocalIndex } = require('vectra');
const path = require('path');
const config = require('./config.js');
const fs = require('fs')

function vdb() { };


vdb.init = async function (query = "Tell me about bull riding shotgun", dbfile = './db/index.json') {
  this.pipeline;
  this.dbFile = dbfile;
  this.index = {};
  this.TransOptions = { pooling: 'mean', normalize: false };
  try {
    const transformersModule = await import('@xenova/transformers');
    this.pipeline = transformersModule.pipeline;
  } catch (e) {
    console.error('Error importing @xenova/transformers:', e);
  }
  this.getVector = await vdb.transInit();
  await vdb.initVectorDB();
  // await this.pullDatabase();
  var result = await this.query(query);
  if (result) {
    return `${config.embeddingPrefix} ${result} answer this request " ${query} " in details`;
  } else {
    return false;
  }
};

vdb.initVectorDB = async function () {

  if (config.embedding.MongoDB) {
    this.index = new LocalIndex(path.join(__dirname, 'db', config.dataChannel.get("MongoDB").datastream));
    if (!await this.index.isIndexCreated()) {
      await this.index.createIndex();
    }
    const mongodb = path.join(__dirname, 'db', config.dataChannel.get("MongoDB").datastream, "index.json");
    if (fs.existsSync(mongodb)) {
      if (fs.statSync(mongodb).size > 200) {
        console.log(mongodb, fs.statSync(mongodb).size, `Database exist ${config.dataChannel.get("MongoDB").datastream}`);
      }
      else {
        await this.pullDatabase();
      }
    }
  }
  if (config.embedding.Documents) {
    this.index = new LocalIndex(path.join(__dirname, 'db', config.dataChannel.get("Documents").datastream));
    if (!await this.index.isIndexCreated()) {
      await this.index.createIndex();
    }
    const docdb = path.join(__dirname, 'db', config.dataChannel.get("Documents").datastream, "index.json");
    if (fs.existsSync(docdb)) {
      if (fs.statSync(docdb).size > 200) {
        console.log(`Database exist ${config.dataChannel.get("Documents").datastream}`);
      }
      else {
        await this.pullDocuments(config.dataChannel.get("Documents").datafolder);
      }
    }
  }
}

vdb.readFile = function (filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

vdb.pullDocuments = async function (DataFolder) {
  var files = fs.readdirSync(DataFolder);
  // Rank documents (simplified)
  var documents = []
  for (let i = 0; i < files.length; i++) {
    let filename = path.join(__dirname, DataFolder, files[i])
    let tokens = this.readFile(filename);
    documents.push({
      filename: filename,
      tokens: tokens.slice(0, Math.min(tokens.length, config.dataChannel.get("Documents").slice))
    });
  }
  for (let i = 0; i < documents.length; i++) {
    await this.addItem(documents[i].tokens);
  }
}

vdb.pullDatabase = async function () {
  const mdb = require('./mgdb.js');
  var cfg = config.dataChannel.get("MongoDB");
  var mjdb = new mdb(cfg.url, cfg.database);
  var documents = await mjdb.find(cfg.collection, {});
  for (let i = 0; i < documents.length; i++) {
    await this.addItem(vdb.sentanceCompose(documents[i]));
  }
}

vdb.transInit = async function () {
  return await this.pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2'
  );
}

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
}

vdb.addItem = async function (text) {
  var vector = await this.getVector(text, vdb.TransOptions);
  // console.log(text);
  await this.index.insertItem({
    vector: Array.from(vector.data),
    metadata: { text }
  });
}

vdb.indexCreate = async function () {
  if (!await this.index.isIndexCreated()) {
    await this.index.createIndex();
    console.log("Created")
  }
}

vdb.findUniqueStrings = function (inputString) {
  // Split the large string into individual strings (e.g., by spaces or any other delimiter)
  const splitStrings = inputString.split(/\s+/);
  // Use a Set to store unique strings
  const uniqueWords = new Set();
  // Step 3: Iterate through the tokenized words/entries and add them to the data structure
  for (const word of splitStrings) {
    uniqueWords.add(word.toLowerCase()); // You may want to convert to lowercase for case-insensitive matching
  }
  return Array.from(uniqueWords).slice(0, 512);
}


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
}



vdb.query = async function (text) {
  const vector = await this.getVector(text, vdb.TransOptions);
  // console.log("Q", Array.from(vector.data))
  var data = [];
  const results = await this.index.queryItems(Array.from(vector.data), 7);
  // console.log(text, JSON.stringify(results));
  if (results.length > 0) {
    for (let result of results) {

      if (result.score > 0.33) {
        data.push(result.item.metadata.text)
      }
    }
    let unique = vdb.findUniqueStrings(data.join(" "));
    return unique.join(" "); // need to unique before joining 
  } else {
    console.log(`No results found.`);
  }
}

// vdb.init();
try {
  module.exports = exports = vdb;
} catch (e) { }

