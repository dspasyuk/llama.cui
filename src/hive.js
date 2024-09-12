import { pipeline } from "@xenova/transformers";
import fs from "fs";
import path from "path";
import reader from "any-text";


/**
 * The Hive class is a database management system that provides a simple and efficient way to store and retrieve data.
 * It uses a file-based storage system and supports various operations such as creating collections, inserting data, and querying the database.
 * The class also includes functionality for loading and saving the database to disk, as well as integrating with natural language processing models for feature extraction.
 */


function Hive() {}

Hive.init = async function (dbName = "Documents", filePath, pathToDocs = false) {
  Hive.dbName = dbName;
  Hive.filePath = filePath || `./${Hive.dbName}/${Hive.dbName}.json`; // Default file path for saving/loading
  Hive.collections = new Map();
  Hive.createCollection(Hive.dbName);
  Hive.TransOptions = { pooling: "mean", normalize: false };
  Hive.loadToMemory(); // Load to memory automatically
  await Hive.initTransformers();
  if (pathToDocs && fs.existsSync(pathToDocs) && Hive.databaseExists() === false) {
    await Hive.pullDocuments(pathToDocs);
  }
};
Hive.databaseExists = function () {
  if (fs.existsSync(Hive.filePath) && fs.statSync(Hive.filePath).size > 200) {
    return true;
  } else {
    console.log(`Database does not exist ${Hive.filePath}`);
    return false;
  }
};

// Initialize transformers
Hive.initTransformers = async function () {
  if (!Hive.pipeline) {
    Hive.getVector = await Hive.transInit();
  } else {
    console.log(`Transformers already initialized`);
  }
};

Hive.transInit = async function () {
  return await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
};

// Create a collection
Hive.createCollection = function () {
  if (!Hive.collections.has(Hive.dbName)) {
    Hive.collections.set(Hive.dbName, []);
    // console.log(`Collection ${Hive.dbName} created in memory.`);
  } else {
    console.log(`Collection ${Hive.dbName} already exists.`);
  }
};

Hive.randomId = function () {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Insert one object into a specific collection
Hive.insertOne = function (entry) {
  if (Hive.collections.has(Hive.dbName)) {
    const { vector, meta } = entry;
    const magnitude = Hive.normalize(vector);
    Hive.collections.get(Hive.dbName).push({
      vector,
      magnitude, // Precompute and store the magnitude
      meta,
      id:Hive.randomId()
    });
  }
};

// Insert many entries into a collection
Hive.insertMany = function (entries) {
  if (Hive.collections.has(Hive.dbName)) {
    const collection = Hive.collections.get(Hive.dbName);
    for (let i = 0; i < entries.length; i++) {
      const { vector, meta } = entries[i];
      collection.push({
        vector: vector,
        meta,
        magnitude: Hive.normalize(vector),
        id:Hive.randomId()
      });
    }
    Hive.saveToDisk(); // Auto-save after bulk insertion
  } else {
    console.log(`Collection ${Hive.dbName} does not exist.`);
  }
};

Hive.ensureDirectoryExists = function (filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Save the database to disk
Hive.saveToDisk = function () {
  const data = {};
  const collectionsKeys = Array.from(Hive.collections.keys());
  for (let i = 0; i < collectionsKeys.length; i++) {
    const key = collectionsKeys[i];
    const value = Hive.collections.get(key);
    data[key] = [];
    for (let j = 0; j < value.length; j++) {
      const entry = value[j];
      data[key].push({
        vector: Array.from(entry.vector), // Convert Float32Array back to Array for JSON
        meta: entry.meta,
        magnitude: entry.magnitude,
        id:entry.id
      });
    }
  }

  Hive.ensureDirectoryExists(Hive.filePath);
  fs.writeFileSync(Hive.filePath, JSON.stringify(data), "utf8");
  console.log(`Database saved to ${Hive.filePath}`);
};

// Load the database into memory from disk
Hive.loadToMemory = async function () {
  if (fs.existsSync(Hive.filePath)) {
    const rawData = fs.readFileSync(Hive.filePath, "utf8");
    const data = JSON.parse(rawData);
    Hive.collections.clear(); // Clear existing collections
    
    for (const [dbName, entries] of Object.entries(data)) {
      Hive.createCollection(dbName); // Recreate collections
      const collection = Hive.collections.get(dbName);
     
      console.log("Number of Entries", entries.length);
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        collection.push({
          vector: new Float32Array(entry.vector),
          meta: entry.meta,
          magnitude: entry.magnitude,
          id:entry.id
        });
      }
    }
    
    console.log(`Database loaded into memory from ${Hive.filePath}`);
  } else {
    console.log(`File ${Hive.filePath} does not exist.`);
  }
};

// Find vectors similar to the query vector
Hive.find = async function (queryVector, topK = 5) {
  const queryVectorMag = Hive.normalize(queryVector);
  const collection = Hive.collections.get(Hive.dbName) || [];

  const results = [];
  
  for (let i = 0; i < collection.length; i++) {
    const item = collection[i];
    const similarity = Hive.cosineSimilarity(queryVector, item.vector, queryVectorMag, item.magnitude);
    results.push({ document: item, similarity });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
};

Hive.cosineSimilarity = function (queryVector, itemVector, queryVectorMag, itemVectorMag) {
  let dotProduct = 0;
  for (let i = 0; i < queryVector.length; i++) {
      dotProduct += queryVector[i] * itemVector[i];
  }
  return dotProduct / (queryVectorMag * itemVectorMag);
};

Hive.normalize = function (vector) {
  let sum = 0;
  for (let i = 0; i < vector.length; i++) {
    sum += vector[i] * vector[i];
  }
  return Math.sqrt(sum);
};

Hive.tokenCount = function (text) {
  const tokens = text.match(/\b\w+\b/g) || [];
  const tokensarr = [];
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (/\S/.test(token)) {
      tokensarr.push(token);
    }
  }
  return [tokensarr, tokensarr.length];
};

Hive.addItem = async function (text, filePath = "") {
  try {
    const vector = await Hive.getVector(text, Hive.TransOptions);
    // Insert the item into the "Documents" collection
    Hive.insertOne({
      vector: Array.from(vector.data),
      meta: {
        content: Hive.escapeChars(text),
        href: filePath,
        title: Hive.escapeChars(text.slice(0, 20)),
      },
    });
  } catch (error) {
    console.error("Error adding item:", error);
  }
};

// Read file and tokenize its content, splitting into slices for insertion
Hive.readFile = async function (filePath, dir) {
  let text = await reader.getText(filePath); // Simulate reading file content
  const [tokens, len] = Hive.tokenCount(text);

  const sliceSize = 512;
  let startIndex = 0;

  while (startIndex < len) {
    let endIndex = startIndex + sliceSize;
    // Ensure we don't split a word
    if (endIndex < len) {
      while (endIndex > startIndex && tokens[endIndex] !== " ") {
        endIndex--;
      }
    }
    if (endIndex === startIndex) {
      endIndex = Math.min(startIndex + sliceSize, len);
    }
    const slice = tokens.slice(startIndex, endIndex);
    await Hive.addItem(slice.join(" "), filePath);
    startIndex = endIndex + 1;
  }
};

// Tokenize the text, cleaning it of non-alphanumeric characters
Hive.tokenize = function (text) {
  const words = text.split(/\s+/);
  let result = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word.length > 0 && !word.match(/[^a-zA-Z0-9]/)) {
      if (result.length > 0) {
        result += " ";
      }
      result += word;
    }
  }

  return result;
};
// Pull documents recursively from a directory and process them
Hive.pullDocuments = async function (dir) {
  const files = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      await Hive.pullDocuments(fullPath);
    } else if (file.isFile() && [".txt", ".doc", ".docx", ".pdf"].includes(path.extname(file.name))) {
      await Hive.readFile(fullPath, dir);
      console.log(`Processed file: ${fullPath}`);
    }
  }
  Hive.saveToDisk();
};

Hive.escapeChars = function (text) {
  // Function to escape special characters and remove repeated single-letter characters
  return (
    text
      // Escape special characters
      .replace(/[&<>"'\\\/]/g, (match) => {
        const escapeChars = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
          "\\": "\\\\",
          "/": "\\/",
        };
        return escapeChars[match];
      })
      // Remove non-alphanumeric characters except spaces, letters, and digits
      .replace(/[^A-Za-z0-9\s]/g, "")
      // Collapse multiple spaces into one
      .replace(/\s+/g, " ")
      // Remove repeated single-letter words (e.g., R, A)
      .replace(/\b([A-Za-z])\b(\s+\1)+/g, "")
      // Remove any isolated single letters
      .replace(/\b[A-Za-z]\b/g, "")
      // Trim spaces at the beginning and end of the text
      .trim()
  );
};

// Hive.init();
export default Hive;
