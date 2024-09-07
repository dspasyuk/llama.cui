const Hive = require("./hive.js");
const path = require("path");
const config = require("./config.js");
const fs = require("fs");
const { exec } = require("child_process");
function vdb() {}


vdb.init = async function (
  query = "Human Factors Workscope",
) {
  vdb.pipeline;
  this.dbFile = "./db/Documents/db.json";
  this.index = {};
  this.useLlamaEmbedding = false;
  this.dataChannel = new Map();
  this.dataChannel.set("Documents", {
    datastream: "Documents", 
    datafolder: "./docs",
    slice: 1024,
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
  await vdb.initVectorDB();
  return await vdb.query(query);
};


vdb.initVectorDB = async function (type = "Documents") {
  const indexPath = path.join(__dirname, "db", this.dataChannel.get(type).datastream);
  await Hive.init(indexPath, this.dbFile, this.dataChannel.get(type).datafolder);
};

vdb.query = async function (query, database = "Documents") {
  const vector = await Hive.getVector(query, Hive.TransOptions);
  results = await Hive.find(vector.data, 5);
  results = results.map((r) => {r.document.meta.href = path.relative(this.dataChannel.get(database).datafolder, r.document.meta.href); return r.document.meta;});
  return results;
};

vdb.pullDatabase = async function () {
  const mdb = require("./mgdb.js");
  var cfg = this.dataChannel.get("MongoDB");
  var mjdb = new mdb(cfg.url, cfg.database);
  var documents = await mjdb.find(cfg.collection, {});
  // vdb.getSum = await vdb.sumInit();
  for (let i = 0; i < documents.length; i++) {
    await Hive.addItem(vdb.sentanceCompose(documents[i]));
  }
};

vdb.sumInit = async function () {
  return await this.pipeline('summarization', 'Xenova/distilbart-cnn-6-6');
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
         resolve({ data: vector });
      }catch(e){
          console.log(e);
          reject(`error: ${e.message}`);
        }
    });
  });
};

try {
  module.exports = exports = vdb;
} catch (e) {}
