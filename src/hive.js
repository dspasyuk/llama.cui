import { pipeline } from "@xenova/transformers";
import fs from "fs";
import path from "path";
import doc2txt from "./doc2txt.js";
import { fileURLToPath } from "url";

/**Copyright Denis Spasyuk
 * The Hive class is a database management system that provides a simple and efficient way to store and retrieve data.
 * It uses a file-based storage system and supports various operations such as creating collections, inserting data, and querying the database.
 * The class also includes functionality for loading and saving the database to disk, as well as integrating with natural language processing models for feature extraction.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // remove

function Hive() {}

// Initialize Hive DB with support for both text and image embeddings
Hive.init = async function (options = {}) {
  // Default parameters
  Hive.saveTimeout;
  Hive.dbName = options.dbName || "Documents";
  Hive.pathToDB = options.pathToDB || path.join(__dirname, "db", "Documents", "Documents.json");
  Hive.pathToDocs = options.pathToDocs !== undefined ? options.pathToDocs : false;
  Hive.type = options.type || "text";
  Hive.watch = options.watch || false;
  Hive.documents = options.documents || {
    text: [".txt", ".doc", ".docx", ".pdf"],
    image: [".png", ".jpg", ".jpeg"],
  };
  Hive.SliceSize = options.SliceSize || 512;
  Hive.minSliceSize = options.minSliceSize || 100;
  Hive.saveInterval = 5000;
  Hive.watch = false;
  Hive.models = {
    text: "Xenova/all-MiniLM-L6-v2",
    image: "Xenova/clip-vit-base-patch16",
  };
  Hive.TransOptions = { pooling: "mean", normalize: false };
  Hive.escapeRules = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "\\": "\\\\",
    "/": "\\/",
  };
  Hive.collections = new Map();

  Hive.createCollection(Hive.dbName);
  Hive.loadToMemory();
  await Hive.initTransformers(Hive.type); // Handle document loading if path is provided
  if (Hive.pathToDocs) {
    if (fs.existsSync(Hive.pathToDocs)) {
      if (!Hive.databaseExists()) {
        await Hive.pullDocuments(Hive.pathToDocs, Hive.type);
      } else {
        Hive.loadToMemory();
        if (Hive.watch) {
          Hive.watchDocuments(Hive.pathToDocs);
        }
      }
    } else {
      console.log(`Document folder "${Hive.pathToDocs}" does not exist`);
    }
  } else {
    console.log(`Document folder not defined`);
  }
};

Hive.databaseExists = function () {
  console.log(Hive.pathToDB, fs.existsSync(Hive.pathToDB));
  if (fs.existsSync(Hive.pathToDB) && fs.statSync(Hive.pathToDB).size > 200) {
    return true;
  } else {
    console.log(`Database does not exist ${Hive.pathToDB}`);
    return false;
  }
};

// Initialize transformers pipeline based on input type
Hive.initTransformers = async function (type) {
  if (!Hive.pipeline) {
    if (type === "text") {
      Hive.getVector = await Hive.textEmbeddingInit(); // Text embedding
    } else if (type === "image") {
      Hive.getVector = await Hive.imageEmbeddingInit(); // Image embedding
    } else {
      throw new Error("Unsupported type for embedding");
    }
  } else {
    console.log(`Transformers already initialized`);
  }
};

Hive.textEmbeddingInit = async function () {
  return await pipeline("feature-extraction", Hive.models.text);
};

Hive.imageEmbeddingInit = async function () {
  return await pipeline("image-feature-extraction", Hive.models.image);
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
      id: Hive.randomId(),
    });
  }
};

Hive.updateOne = function (query, entry) {
  if (Hive.collections.has(Hive.dbName)) {
    Hive.findMeta(query, entry);
    Hive.saveToDisk();
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
        id: Hive.randomId(),
      });
    }
    Hive.saveToDisk(); // Auto-save after bulk insertion
  } else {
    console.log(`Collection ${Hive.dbName} does not exist.`);
  }
};

Hive.ensureDirectoryExists = function (pathToDB) {
  const dir = path.dirname(pathToDB);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Save the database to disk
Hive.saveToDisk = function () {
  // Clear the previous timeout if it exists
  if (Hive.saveTimeout) {
    clearTimeout(Hive.saveTimeout);
  }
  Hive.saveTimeout = setTimeout(() => {
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
          id: entry.id,
        });
      }
    }

    Hive.ensureDirectoryExists(Hive.pathToDB);
    fs.writeFileSync(Hive.pathToDB, JSON.stringify(data), "utf8");
    console.log(`Database saved to ${Hive.pathToDB}`);
  }, Hive.saveInterval); // Wait for 5 seconds (10000 ms)
};

// Load the database into memory from disk
Hive.loadToMemory = async function () {
  if (fs.existsSync(Hive.pathToDB) && Hive.collections.size != 0) {
    const rawData = fs.readFileSync(Hive.pathToDB, "utf8");
    const data = JSON.parse(rawData);
    Hive.collections.clear(); // Clear existing collections
    for (const [dbName, entries] of Object.entries(data)) {
      Hive.createCollection(dbName); // Recreate collections
      const collection = Hive.collections.get(dbName);
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        collection.push({
          vector: new Float32Array(entry.vector),
          meta: entry.meta,
          magnitude: entry.magnitude,
          id: entry.id,
        });
      }
    }
    console.log(`Database loaded into memory from ${Hive.pathToDB}`);
  } else {
    console.log(`File ${Hive.pathToDB} does not exist.`);
  }
};

// Find vectors similar to the query vector
Hive.findMeta = async function (query, entry) {
  const collection = Hive.collections.get(Hive.dbName);
  for (let i = 0; i < collection.length; i++) {
    const item = collection[i];
    if (item.meta.filePath === query.filePath) {
      collection[i] = entry;
      break;
    }
  }
};

Hive.find = async function (queryVector, topK = 10) {
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

Hive.addItem = async function (input, filePath = "", type = "text") {

  try {
    let vector;
    if (type === "text") {
      vector = await Hive.getVector(filePath+" "+input, Hive.TransOptions);
    } else if (type === "image") {
      // Dynamically import sharp only when processing an image
      vector = await Hive.getVector(filePath, Hive.TransOptions);
    }
    Hive.insertOne({
      vector: Array.from(vector.data),
      meta: {
        content: type === "text" ? filePath+" "+Hive.escapeChars(input) : `Image: ${path.basename(filePath)}`,
        href: filePath,
        title: type === "text" ? Hive.escapeChars(input.slice(0, 20)) : `Image: ${path.basename(filePath)}`,
      },
    });
  } catch (error) {
    console.error("Error adding item:", error);
  }
};

// Pull documents recursively from a directory and process them
Hive.pullDocuments = async function (dir) {
  const files = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    let fullPath = path.join(dir, file.name);
    const ext = path.extname(file.name).toLowerCase();
    if (file.isSymbolicLink()) {
      fullPath = await fs.promises.readlink(fullPath); // Follow the link
    }

    try {
      const stats = await fs.promises.stat(fullPath);
      if (stats.isDirectory()) {
        await Hive.pullDocuments(fullPath); // Recursively process subdirectories
      } else if (Hive.documents.text.includes(ext)) {
        // Only process text files
        await Hive.readFile(fullPath, "text");
      } else if (Hive.documents.image.includes(ext)) {
        // Only process image files
        await Hive.readFile(fullPath, "image");
      } else {
        // Skip files that do not match the allowed types
        console.log(`Skipping unsupported file: ${fullPath}`);
      }
    } catch (error) {
      console.error(`Error processing file ${fullPath}: ${error}`);
    }
  }
  Hive.saveToDisk(); // Save database after processing all documents
};

// Update file in the collection
Hive.updateFile = async function (filePath, type) {
  let text = "";
  if (type === "text") {
    text = await doc2txt.extractTextFromFile(filePath);
  }
  // Generate embedding and update only if file content has changed
  const newEntry = { vector: await Hive.getVector(text, Hive.TransOptions).data, meta: { filePath, type } };
  Hive.updateOne({ filePath }, newEntry); // Only update matching entry by filePath
};

Hive.removeFile = function (filePath) {
  const collection = Hive.collections.get(Hive.dbName);
  Hive.collections.set(
    Hive.dbName,
    collection.filter((item) => item.meta.filePath !== filePath)
  );
};

Hive.watchDocuments = async function (dir) {
  const chokidar = await import("chokidar");
  const watcher = chokidar.watch(dir, {
    ignored: (file, _stats) => _stats?.isFile() && !file.endsWith(".txt") && !file.endsWith(".doc") && !file.endsWith(".docx") && !file.endsWith(".pdf"),
    persistent: true,
  });

  watcher
    .on("add", async (filePath) => {
      console.log(`Checking File: ${filePath}`);
      if (!(await Hive.fileExistsInDatabase(filePath))) {
        const ext = path.extname(filePath).toLowerCase();
        if (Hive.documents.text.includes(ext)) {
          await Hive.updateFile(filePath, "text");
        } else if (Hive.documents.image.includes(ext)) {
          await Hive.updateFile(filePath, "image");
        }
      }
    })
    .on("change", async (filePath) => {
      console.log(`File changed: ${filePath}`);
      const ext = path.extname(filePath).toLowerCase();
      if (Hive.documents.text.includes(ext)) {
        await Hive.updateFile(filePath, "text");
      } else if (Hive.documents.image.includes(ext)) {
        await Hive.updateFile(filePath, "image");
      }
    })
    .on("unlink", async (filePath) => {
      console.log(`File removed: ${filePath}`);
      Hive.removeFile(filePath);
      Hive.saveToDisk();
    });
};
// Check if a file exists in the database
Hive.fileExistsInDatabase = function (filePath) {
  const collection = Hive.collections.get(Hive.dbName);
  // Look for an entry with the same file path in the collection
  return collection.some((item) => item.meta.filePath === filePath);
};

// Read file content (text or image) and extract embeddings
Hive.readFile = async function (filePath, type) {
  if (type === "text") {
    let text = await doc2txt.extractTextFromFile(filePath);
    const [tokens, len] = Hive.tokenCount(text);
    let startIndex = 0;
    // console.log(`Processing file ${filePath}`, text);
    while (startIndex < len) {
      let endIndex = startIndex + this.SliceSize;
      endIndex = Math.min(endIndex, len); // Ensure proper slicing
     
      if (len > Hive.minSliceSize) {
        const slice = tokens.slice(startIndex, endIndex).join(" ");
        console.log(`Slice: ${slice}`, len ,Hive.minSliceSize, startIndex, endIndex);
        await Hive.addItem(slice, filePath, type);
      }
      startIndex = endIndex + 1;
    }
  } else if (type === "image") {
    // const imageBuffer = fs.readFileSync(filePath); // Read image as buffer
    await Hive.addItem("", filePath, type);
  }
};

Hive.escapeChars = function (text) {
  // Function to escape special characters and remove unwanted phrases
  return (
    text
      // Escape special characters
      .replace(/[&<>"'\\\/]/g, (match) => {
        return Hive.escapeRules[match];
      })
      // Remove meaningless words and sequences
      .replace(/\b(?:TEY|FY|AFRL\s+\d+|[0-9]{2,})\b/g, "") // Matches TEY, FY, AFRL with a number, or any two or more digit sequences
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

export default Hive;
