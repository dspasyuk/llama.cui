import Hive from "./hive.js";
import path from "path";
import config from "./config.js";
import { exec } from "child_process";


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
    await Hive.init(type, this.dbFile, this.dataChannel.get(type).datafolder);
};

vdb.query = async function (query, database = "Documents") {
  const vector = await Hive.getVector(query, Hive.TransOptions);
  let results = await Hive.find(vector.data, 5);
  results = results.reduce((acc, r) => {
    if (r.similarity > 0.2) {
      r.document.meta.href = path.relative(this.dataChannel.get(database).datafolder, r.document.meta.href);
      acc.push(r.document.meta); // Add the filtered item to the accumulator
    }
    return acc; // Always return the accumulator
  }, []);
  return results;
};

vdb.pullDatabase = async function () {
  const { default: mdb } = await import("./mgdb.js"); // Dynamic import for ESM
  const cfg = this.dataChannel.get("MongoDB");
  const mjdb = new mdb(cfg.url, cfg.database);
  const documents = await mjdb.find(cfg.collection, {});
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
        values.push(`${key} : ${value}`); // Return key-value pair as string
      }
    }
  }
  return values.join(" ");
};

vdb.getLlamaEmbedding = function (text) {
  return new Promise((resolve, reject) => {
    const llamaembed = config.llamacpp.replace("llama-cli", "llama-embedding"); 
    const embedmodel = config.llamacpp.replace("llama-cli", "snowflake-q8_0.gguf");
    exec(`${llamaembed} -m ${embedmodel} -e -p "${text}" --embd-output-format array  -ngl 99`, (error, stdout, stderr) => {
      if (error) {
        reject(`error: ${error.message}`);
      }
      try {
        if (stdout.includes("nan")) return;
        const vector = JSON.parse(stdout);
        resolve({ data: vector });
      } catch (e) {
        console.log(e);
        reject(`error: ${e.message}`);
      }
    });
  });
};

export default vdb;