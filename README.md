# Llama.cui is a small llama.cpp chat application for Node.js 
![logo](https://github.com/dspasyuk/llama.cui/blob/main/ico.svg?)

**Note: This project is a work in progress.**

This project provides a Node.js server for a chat user interface (UI) that interacts with the Llama.cpp library. It allows users to communicate with the Llama.cpp application via a web-based chat interface.

## Installation

1. Clone the repository:

   `git clone https://github.com/ggerganov/llama.cpp.git`

2. Build Lllama.cpp with GPU or CPU support

   `cd llama.cpp`

   `sed -i 's/-arch=native/-arch=all/g' Makefile` # could be skipped if native arch works

   `make clean && LLAMA_CUBLAS=1 make -j 4`   # for GPU version

   or
   
   `make` # for CPU version

4. Clone llama.cui
   
   `git clone https://github.com/dspasyuk/llama.cui`

5. Download LLM model from [hugging face](https://huggingface.co/) in GGUF format, for example:
   a. Dolphin-Mistral 7B:   https://huggingface.co/TheBloke/dolphin-2.1-mistral-7B-GGUF/blob/main/dolphin-2.1-mistral-7b.Q5_0.gguf  
   b. Einstein-v4-7B:        https://huggingface.co/LoneStriker/Einstein-v4-7B-GGUF (Default)  

8. Install the project and set your configuration parameters
  
   `cd llama.cui

   npm install`

   Open config.js and change the hostname, port, path to llama.cpp main file, and the model name/path
   

## Usage
To run just type:

`npm start`

## Install all at once
Starting from version 0.24 model will be downloaded automatically. 

`git clone https://github.com/ggerganov/llama.cpp.git; cd llama.cpp; sed -i 's/-arch=native/-arch=all/g' Makefile; make clean && LLAMA_CUBLAS=1 make -j 4; cd ..; git clone https://github.com/dspasyuk/llama.cui; cd llama.cui; npm install; node server.js`

## Login Information
Default login and password are specified in the config file but could be easily integrated with the user database.
The login is currently set to false. To enable login set login to true in the config file and change password.

## Piper integration https://github.com/rhasspy/piper
As of version 1.15 the llama.cui supports Piper for a text-to-voice generation.
Enable it in config.js, make sure to install Piper before running llama.cui 

   ### Getting Piper 
      git clone https://github.com/rhasspy/piper.git
      cd piper  
      make  
      That should build Piper and put in "piper/install/"
      
   ### Downloading voice models  
      Models can be found on Hugging Face:  
      https://huggingface.co/rhasspy/piper-voices  
      Default Llama.cui voice model is librits/en_US-libritts_r-medium.onnx"  
      https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/libritts/high
      
   ### Configure Piper  
   
   config.piper = {  
     enabled: true,  
     rate: 20500, // depends on your model  
     output_file: 'S16_LE', //Piper outputs 16-bit mono PCM buffers so keep this value as is  
     exec: "../../piper/install/piper", // set a path to your piper installation  
     model: "/home/denis/CODE/piper/models/librits/en_US-libritts_r-medium.onnx"  // set a path to your voice models  
   };  

## Embeddings
![Screenshot](https://github.com/dspasyuk/llama.cui/blob/main/embedding.png)

llama.cui supports embeddings from a text file (see the docs folder) and MongoDB (do npm install Mongo and make changes to config.js to configure the database).

To use embeddings, you will need to create your vector database using the embedding.js script. Simply place any docx, html, xlsx, etc. files in the rawdocs folder and run the embedding.js script using the command below:

`node embedding.js`

You will need to detele the existing DB folder before running llama.cui. The new database will be generated on the next request for embedding (select use database in the bottom left corner of the UI interface to generate the database)  

For data format convention, llama.cui uses the anytotext.js library. 

## Screenshots
 
![Screenshot](https://github.com/dspasyuk/llama.cui/blob/main/Screenshot.png)  
![Screenshot](https://github.com/dspasyuk/llama.cui/blob/main/Code_highlight.png)  
[![Piper Demo]()](https://github.com/dspasyuk/llama.cui/assets/34203011/1a7d530c-92a3-4d14-9c7d-79a25f73610f)



