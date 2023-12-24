const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ProgressBar = require("progress");

async function createDirectories(filePath) {
const directoryPath = path.dirname(filePath);

try {
    // Check if the directory exists
    await fs.promises.access(directoryPath);
  } catch (error) {
    // If the directory doesn't exist, create it
    await fs.promises.mkdir(directoryPath, { recursive: true });
  }
}

async function downloadModel(modelName, outputDirectory, qs) {
  try {
    // Make a request to the Hugging Face API to get the model files
    const response = await axios.get(
      `https://huggingface.co/api/models/${modelName}`,
      { responseType: "json" }
    );

    // Find the file object with rfilename ending with "Q5_K_S"
    const targetFile = response.data.siblings.find((file) =>
      file.rfilename.endsWith(qs+".gguf")
    );

    if (!targetFile) {
      console.error(`File ${targetFile} not found.`);
      return;
    }

    // Construct the URL for the specific file
    const fileUrl = `https://huggingface.co/${modelName}/resolve/main/${targetFile.rfilename}`;

    // Download the file to the specified outputDirectory
    const outputFilePath = path.join(outputDirectory, targetFile.rfilename);
    await createDirectories(outputFilePath); // Wait for directories to be created
    const fileResponse = await axios.get(fileUrl, { responseType: "stream" });

    // Create a progress bar with the total file size
    const totalSize = parseInt(fileResponse.headers["content-length"], 10);
    const progressBar = new ProgressBar("Downloading [:bar] :percent :etas", {
      complete: "=",
      incomplete: " ",
      width: 50,
      total: totalSize,
    });

    // Use fs.createWriteStream to create an empty file
    const fileWriteStream = fs.createWriteStream(outputFilePath);

    // Pipe the data stream to the file and update the progress bar
    fileResponse.data.on("data", (chunk) => {
      progressBar.tick(chunk.length);
      fileWriteStream.write(chunk);
    });

    // Wait for the file to finish writing
    await new Promise((resolve, reject) => {
      fileResponse.data.on("end", () => {
        fileWriteStream.end();
        resolve();
      });
      fileResponse.data.on("error", (error) => {
        fileWriteStream.end();
        reject(error);
      });
    });

    console.log(`Downloaded ${targetFile.rfilename} to ${outputFilePath}`);
  } catch (error) {
    console.error("Error downloading the model:", error.message);
  }
}

module.exports =  downloadModel;

