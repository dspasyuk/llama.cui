const fs = require('fs');
const path = require('path');
const reader = require('any-text');
const parse =  require("./parser.js");

function embd(){};

embd.init = async function(query){
  this.docFolder = "./docs"
  this.rawdocFolder = "./rawdoc"
  index = await embd.readDir(query);
}

embd.readDir = async function(query){
  var files = fs.readdirSync(embd.rawdocFolder);
  // Rank documents (simplified)
  for (let i = 0; i < files.length; i++) {
     let filename = path.join(__dirname, embd.rawdocFolder, files[i])
     let text = await reader.getText(filename);
     text = await parse.extractText(text);
    //  console.log(text);
     for (let j = 0; j < text.length; j++) {
      try {
      var textfrag = `Source File: ${filename} \n ${text[j]}`; 
      fs.writeFileSync(path.join(__dirname, this.docFolder, path.basename(filename)+j.toString()+".txt"), textfrag);
      } catch (err) {
        console.error(err);
      }
    }
  }
}
embd.init()
try {
  module.exports = exports = embd;
} catch (e) {}
