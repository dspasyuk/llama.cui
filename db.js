const { LocalIndex } = require("vectra");
const path = require("path");
const config = require("./config.js");
const fs = require("fs");

function vdb() {}

vdb.init = async function (
  query = "Tell me about bull riding shotgun",
  dbfile = "./db/Documents/index.json"
) {
  this.pipeline;
  this.dbFile = dbfile;
  this.index = {};
  this.dataChannel = new Map();
  this.dataChannel.set("Documents", {
    datastream: "Documents", 
    datafolder: "./docs",
    slice: 2000,
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
    this.pipeline = transformersModule.pipeline;
  } catch (e) {
    console.error("Error importing @xenova/transformers:", e);
  }
  this.getVector = await vdb.transInit();
  await vdb.initVectorDB();
  var result = await this.query(query);
  if (result.replace(/\s/g, "").trim().length > 5) {
    console.log("result", result.length, "result");
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

vdb.readFile = function (filePath) {
  return fs.readFileSync(filePath, "utf8");
};

vdb.tokenize = function (text) {
  // Split the text into words using whitespace as the separator
  const words = text.split(/\s+/);
  const cleanWords = words
    .filter((word) => word.length > 0 && !word.match(/[^a-zA-Z0-9]/))
    .join(" ");
  console.log(cleanWords);
  return cleanWords;
};

vdb.pullDocuments = async function (DataFolder) {
  var files = fs.readdirSync(DataFolder);
  // Rank documents (simplified)
  var documents = [];
  for (let i = 0; i < files.length; i++) {
    let filename = path.join(__dirname, DataFolder, files[i]);
    let tokens = this.readFile(filename);
    tokens = tokens.replace(/\n\n/g, " ");
    // tokens = vdb.tokenize(tokens);
    documents.push({
      filename: filename,
      tokens: tokens.slice(
        0,
        Math.min(tokens.length, this.dataChannel.get("Documents").slice)
      ),
    });
  }
  for (let i = 0; i < documents.length; i++) {
    await this.addItem(documents[i].tokens);
  }
};

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
  var vector = await this.getVector(text, vdb.TransOptions);
  // console.log(text);
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
  const vector = await this.getVector(text, vdb.TransOptions);
  // console.log("Q", Array.from(vector.data))
  var data = [];
  const results = await this.index.queryItems(Array.from(vector.data), 7);
  // console.log(text, JSON.stringify(results));
  if (results.length > 0) {
    for (let result of results) {
      if (result.score > 0.33) {
        data.push(result.item.metadata.text);
      }
    }
    let unique = vdb.findUniqueStrings(data.join(" "));
    return unique.join(" "); // need to unique before joining
  } else {
    console.log(`No results found.`);
  }
};

// vdb.init();
// vdb.pullDocuments(vdb.dataChannel.get("Documents").datafolder);

try {
  module.exports = exports = vdb;
} catch (e) {}
