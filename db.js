const { LocalIndex } = require('vectra');
const path = require('path');
const config = require('./config.js');
const fs = require('fs')

function vdb(){};


vdb.init = async function(query="Tell me about bull riding shotgun"){
    this.pipeline;
    this.dbFile = "./db/index.json";
    this.TransOptions = {pooling: 'mean', normalize: false};
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
    //console.log(result);
    if (result){
       return `${config.embeddingPrefix} ${result} answer this request " ${query} " in details` 
    }else{
        return false;
    }
};

vdb.initVectorDB = async function(){
  this.index = new LocalIndex(path.join(__dirname, 'db'));
  if (!await this.index.isIndexCreated()) {
    await this.index.createIndex();
  }
  if (config.embedding.database){
    if(fs.existsSync(this.dbFile)){
      if(fs.statSync(this.dbFile).size){
       console.log("Database exist ./db/index.json")
      }
    else{
     await this.pullDatabase();
    }}
  }
  if (config.embedding.documents){
    if(fs.existsSync("./db/index.json")){
      if(fs.statSync(this.dbFile).size>200){
         console.log("Document database exist ./db/index.json")
      }
    else{
      await this.pullDocuments();
    }
  }
  }
}

vdb.readFile = function(filePath){
  return fs.readFileSync(filePath, 'utf8');
}

vdb.pullDocuments = async function(query){
  var files = fs.readdirSync(config.DataFolder);
  // Rank documents (simplified)
  var documents = []
  for (let i = 0; i < files.length; i++) {
     let filename = path.join(__dirname, config.DataFolder, files[i])
     let tokens =  this.readFile(filename);
     documents.push({
        filename: filename,
        tokens: tokens.slice(0, Math.min(tokens.length, 1000)),
      });
    }
    for (let i = 0; i < documents.length; i++) {
      await this.addItem(documents[i].tokens);
    }
}

vdb.pullDatabase = async function(){
    const mdb = require('./mgdb.js');
    var mjdb = new mdb("mongodb://localhost:27017", "fortknox");
    var documents = await mjdb.find("clientlist", {});
    for (let i = 0; i < documents.length; i++) {
        await this.addItem(vdb.sentanceCompose(documents[i]));
    }
}

vdb.transInit = async function(){
    return await this.pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );
}

vdb.sentanceCompose = function(data){
    let values = [];
    for (const [key, value] of Object.entries(data)) {
        if(!key.includes("id")){
        if (value !== "" && value !== null && value !== undefined) {
          values.push(`${key} : ${value}`); //Return key value pair as string
        }}
      }
    // console.log(values.join(", "));
    return values.join(" ");
}

vdb.addItem = async function(text) {
    var vector = await this.getVector(text, vdb.TransOptions);
    // console.log(Array.from(output1.data).length);
    await this.index.insertItem({
        vector: Array.from(vector.data),
        metadata:  { text }
    });
}

vdb.indexCreate = async function(){ 
    if (!await this.index.isIndexCreated()) {
        await this.index.createIndex();
        console.log("Created")
    }
}

vdb.findUniqueStrings = function(inputString) {
    // Split the large string into individual strings (e.g., by spaces or any other delimiter)
    const splitStrings = inputString.split(' ');
    // Use a Set to store unique strings
    const uniqueStringsSet = new Set(splitStrings);
    // Convert the Set back to an array if needed
    const uniqueStringsArray = Array.from(uniqueStringsSet);
    return uniqueStringsArray;
  }


vdb.combineDictionaries =  function(...dictionaries){
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
  


vdb.query = async function(text) {
    const vector = await this.getVector(text, vdb.TransOptions);
    // console.log("Q", Array.from(vector.data))
    var data = [];
    const results = await this.index.queryItems(Array.from(vector.data), 7);
    if (results.length > 0) {
        for (let result of results) {
            if(result.score>0.33){
               data.push(result.item.metadata.text)
            }
        }
        // let unique = vdb.findUniqueStrings(data.join(" ; "));
        // console.log(unique);
        return data.join(" ; "); // need to unique before joining 
    } else {
        console.log(`No results found.`);
    }
}

// vdb.init();
try {
    module.exports = exports = vdb;
  } catch (e) {}
  
  