import path from 'path';
import JSZip from 'jszip';
import fs from 'fs/promises';
import { parseStringPromise } from 'xml2js';
import WordExtractor from 'word-extractor';
import { readPdfText } from 'pdf-text-reader';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Set the workerSrc property to the correct worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.mjs';

const doc2txt = {};

// Read text from a .txt file
doc2txt.readTextFromTxt = async function (filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err) {
    console.error("Error reading .txt file:", err.message);
    return "";
  }
};

// Read text from a .doc file
doc2txt.readTextFromDoc = async function (filePath) {
  try {
    const extractor = new WordExtractor();
    return (await extractor.extract(filePath)).getBody();
  } catch (err) {
    console.error("Error reading .doc file:", err.message);
    return "";
  }
};

// Read text from a .docx file
doc2txt.readTextFromDocx = async function (filePath) {
  try {
    const zip = await JSZip.loadAsync(await fs.readFile(filePath));
    const xmlFile = await zip.file('word/document.xml').async('string');

    const result = await parseStringPromise(xmlFile);
    const body = result?.['w:document']?.['w:body'];
    if (!body || !Array.isArray(body)) {
      console.warn("Invalid DOCX structure: 'w:body' element is missing or malformed.");
      return "";
    }

    // Extract text by handling multiple nested levels in the XML structure
    let text = body[0]['w:p']?.map(paragraph => {
      return paragraph['w:r']?.map(run => {
        // Extract text if present and ensure it’s a string
        const content = run['w:t'];
        if (Array.isArray(content)) {
          return content.map(textRun => textRun._).join(''); // Join multiple text runs
        } else if (content && content._) {
          return content._; // Single text run
        } else {
          return ''; // No text content
        }
      }).filter(Boolean).join(' '); // Remove empty strings and join text in run
    }).filter(Boolean).join('\n') || ''; // Remove empty strings in paragraph and join text
    return text.trim();
  } catch (err) {
    console.error("Error reading DOCX file:", err.message);
    return "";
  }
};

// Read text from a .pdf file
doc2txt.readTextFromPdf = async function (filePath) {
  try {
    return await readPdfText({ url: filePath, verbosity: 0 });
  } catch (err) {
    console.error("Error reading PDF file:", err.message);
    return "";
  }
};

// Extract text from a file based on its extension
doc2txt.extractTextFromFile = async function (filePath) {
  const extension = path.extname(filePath).toLowerCase();  // Convert extension to lowercase
  try {
    switch (extension) {
      case '.txt':
      case '.py':
      case '.js':
      case '.sh':
      case '.md':
      case '.csv':
      case '.json':
        return await this.readTextFromTxt(filePath);
      case '.doc':
        return await this.readTextFromDoc(filePath);
      case '.docx':
        return await this.readTextFromDocx(filePath);
      case '.pdf':
        return await this.readTextFromPdf(filePath);
      default:
        console.warn(`Unsupported file format: ${extension}`);
        return "";  // Return an empty string for unsupported formats
    }
  } catch (err) {
    console.error("Error extracting text from file:", err.message);
    return "";
  }
};


export default doc2txt;
