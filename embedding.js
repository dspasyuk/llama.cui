const fs = require('fs');
const path = require('path');
const reader = require('any-text');

function embd(){};

embd.init = async function(query){
  this.docFolder = "../docs"
  index = await embd.readDir(query);
}

embd.readDir = async function(query){
  var files = fs.readdirSync(embd.docFolder);
  // Rank documents (simplified)
  for (let i = 0; i < files.length; i++) {
     let filename = path.join(__dirname, embd.docFolder, files[i])
     const text = await reader.getText(filename);
    //  console.log(filename, text);
    try {
     fs.writeFileSync(path.join(__dirname, "docs", path.basename(filename)+".txt"), text);
    } catch (err) {
      console.error(err);
    }
    
  }
}
embd.init()
try {
  module.exports = exports = embd;
} catch (e) {}
