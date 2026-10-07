import axios from 'axios';
import fs from 'fs';
import path from 'path';
import ProgressBar from 'progress';

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

async function downloadModel(repo, modelName, outputDirectory) {
  try {
    // Make a request to the Hugging Face API to get the model files
    const response = await axios.get(
      `https://huggingface.co/api/models/${repo}`,
      { responseType: "json" }
    );

    // Find the file object with rfilename ending with "Q5_K_S"
    const targetFile = response.data.siblings.find((file) =>
      {console.log(file.rfilename, modelName.slice(-10));
      return file.rfilename.endsWith(modelName.slice(-10))
      });
    
    if (!targetFile) {
      console.error(`File ${targetFile} not found.`);
      return;
    }

    // Construct the URL for the specific file
    const fileUrl = `https://huggingface.co/${repo}/resolve/main/${targetFile.rfilename}?download=true`;
    console.log(fileUrl);

    // Download the file to the specified outputDirectory
    const outputFilePath = path.join(
      outputDirectory,
      modelName
    );
    await createDirectories(outputFilePath); // Wait for directories to be created
    if (!fs.existsSync(outputFilePath)) {
      const fileResponse = await axios.get(fileUrl, { responseType: "stream" });
      // Create a progress bar with the total file size
      const totalSize = parseInt(fileResponse.headers["content-length"], 10);
      const progressBar = new ProgressBar("Downloading [:bar] :percent :etas", {
        complete: "=",
        incomplete: " ",
        width: 50,
        total: totalSize,
      });
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
      // Use fs.createWriteStream to create an empty file
    } else {
      console.log(outputFilePath, "Model file exist!");
    }
  } catch (error) {
    console.error("Error downloading the model:", error.message);
  }
}

export default downloadModel;
