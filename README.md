# Llama.cui is a small llama.cpp-based chat application for Node.js 
![logo](https://github.com/dspasyuk/llama.cui/blob/main/ico.svg?)


This project provides a Node.js server for a chat user interface (UI) that interacts with the Llama.cpp library. It allows users to communicate with the [llama.cpp](https://github.com/ggerganov/llama.cpp.git) application via a web-based chat interface.

<details><summary> <H1> Install all at once </H1></summary>


Starting from version 0.24 model will be downloaded automatically. 

## Groq Install (no llama.cpp needed):
`git clone https://github.com/dspasyuk/llama.cui; cd llama.cui; npm install; node server.js`

You will need to obtain Groq API ( https://console.groq.com/keys ) key and add it to config.js file or set it as environment variable 

`export GROQ_API_KEY="Your API key"`

## Ollama support (no llama.cpp needed):
`git clone https://github.com/dspasyuk/llama.cui; cd llama.cui; npm install; node server.js`

You will need to have Ollama installed and defult inference engine set to Ollama:true in config.js file for this option to work.  
  `curl -fsSL https://ollama.com/install.sh | sh`  
  `ollama run gemma3:4b` # or see the list of models available https://ollama.com/search  
   then you can start the Lllama.cui server by running: node server.js 

## Linux Nvidia GPU

`git clone https://github.com/ggerganov/llama.cpp.git; cd llama.cpp; cmake -B build -DGGML_CUDA=ON; cmake --build build --config Release; cd ..; git clone https://github.com/dspasyuk/llama.cui; cd llama.cui; npm install; node server.js` 

you might want to set a specific cuda archetecture if the native does not work 

`cmake -DCMAKE_CUDA_ARCHITECTURES="52;60;61;62;70;72;75;80;86" -B build -DGGML_CUDA=ON` 

## Linux CPU

`git clone https://github.com/ggerganov/llama.cpp.git; cd llama.cpp; cmake -B build; cmake --build build --config Release; cd ..; git clone https://github.com/dspasyuk/llama.cui; cd llama.cui; npm install; node server.js`

## OSX

`git clone https://github.com/ggerganov/llama.cpp.git; cd llama.cpp; cmake -B build; cmake --build build --config Release; cd ..; cd ..; git clone https://github.com/dspasyuk/llama.cui; cd llama.cui; npm install; node server.js`

#### Change  "--n-gpu-layers" in config.js file depending on the type of architecture used and available VRAM. For the default model (Llama3-instruct) this should be equal to 35, for compatibility it is currently set to 25, you will need at least 6Gb of VRAM to run the model, so Nvidia GTX1060 and above is a must.  
</details>

<details><summary> <H1> Using Groq API (no llama.cpp required) </H1></summary>

In order to use Groq API with Llama.cui you will need to obtain Groq API ( https://console.groq.com/keys ) key and add it to config.js file or set it as environment variable

`config.groqParameters = {APIkey: process.env.GROQ_API_KEY || "YOUR_KEY_HERE " 
}`

or just run in terminal before running server: export GROQ_API_KEY="Your API key"; 
</details>

<details><summary><H1> Using Ollama  (no llama.cpp needed) </H1></summary>  
    
You will need to have Ollama installed and defult inference engine set to Ollama:true in config.js file for this option to work.  
  `curl -fsSL https://ollama.com/install.sh | sh`  
  `ollama run gemma3:4b` # or see the list of models available https://ollama.com/search  
   then you can start the Lllama.cui server by running: node server.js 


<details><summary> <H1> Using Google Search API (Web Search) </H1></summary>

In order to use Google Search API with Llama.cui you will need:
Step 1: Create a Project in Google Cloud Console https://console.cloud.google.com/

    Go to the Google Cloud Console and sign in with your Google account.
    Click on the "Select a project" dropdown menu and click on "New Project".
    Enter a project name and click on "Create".

Step 2: Get an API Key

    In the sidebar, click on "APIs & Services" and then click on "Dashboard".
    Click on "Enable APIs and Services" and search for "Custom Search API".
    Click on "Custom Search API" and click on the "Enable" button.
    Click on "Create credentials" and then click on "API key".
    Choose "Web API key" and enter a name for the API key.
    Click on "Create" and copy the API key.

Step 3: Add Custom Search API to the Project

    Go to the Google Cloud Console and select the project you created earlier.
    Click on "APIs & Services" and then click on "Dashboard".
    Click on "Enable APIs and Services" and search for "Custom Search API".
    Click on "Custom Search API" and click on the "Enable" button.

Step 4: Create a Programmable Search Engine https://programmablesearchengine.google.com

    Go to the Programmable Search Engine website 
    Sign in with your Google account.
    Click on "New search engine" and enter a name for the search engine.
    Enter a site to search (e.g. a website or a domain) and click on "Create".
    Copy the Search engine ID.

Step 5: Use the Custom Search API

You can now use the Custom Search API to search the web using your custom search engine. You will need to set Api key and Progammable Search Engine ID in config.js file or set GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID in your environment:

config.google = {
  APIkey: process.env.GOOGLE_API_KEY || "",
  SearchEngineID:  process.env.GOOGLE_SEARCH_ENGINE_ID || "",
}

or in terminal:  

`export GOOGLE_API_KEY="YOUR_API_KEY_HERE"`

`export GOOGLE_SEARCH_ENGINE_ID="YOUR_SEARCH_ENGINE_ID_HERE"`

</details>


<details><summary> <H1> Manual Installation </H1></summary>

1. Clone the repository:

   `git clone https://github.com/ggerganov/llama.cpp.git`

2. Build Lllama.cpp with GPU or CPU support

   `cd llama.cpp`

   `sed -i 's/-arch=native/-arch=all/g' Makefile` # could be skipped if native arch works

   `make clean && LLAMA_CUDA=1 make -j 4`   # for GPU CUDA version
   `make clean && LLAMA_CUBLAS=1 make -j 4` # for GPU cuBLAS version

   or
   
   `make` # for CPU version

4. Clone llama.cui
   
   `git clone https://github.com/dspasyuk/llama.cui`

5. Download LLM model from [hugging face](https://huggingface.co/) in GGUF format, for example:
   
   a. Meta-Llama-3-8B-Instruct: https://huggingface.co/QuantFactory/Meta-Llama-3-8B-Instruct-GGUF   
     or https://huggingface.co/dspasyuk/Meta-Llama-3-8B-Instruct-Q5_K_S-GGUF/blob/main/Meta-Llama-3-8B-Instruct-Q5_K_S.gguf
   
   b. Dolphin-Mistral 7B:       https://huggingface.co/TheBloke/dolphin-2.1-mistral-7B-GGUF/blob/main/dolphin-2.1-mistral-7b.Q5_0.gguf
   
   c. Einstein-v4-7B:           https://huggingface.co/LoneStriker/Einstein-v4-7B-GGUF

   d. Qwen2-7B-Instruct Models: https://huggingface.co/Qwen/Qwen2-7B-Instruct-GGUF/tree/main (will need flash attentioon enabled in config.js e.g. -fa) (Default) 

7. Install the project and set your configuration parameters
  
   `cd llama.cui

   npm install`

   Open config.js and change the hostname, port, path to llama.cpp main file, and the model name/path
   
</details>
   
<details><summary> <H1> Usage </H1></summary>

To run just type:

`npm start`

## Login Information
Default login and password are specified in the config file but could be easily integrated with the user database.
The login is currently set to false. To enable login set login to true in the config file and change password.
</details>

<details><summary> <H1> Piper integration </H1></summary>

As of version 1.15 the llama.cui supports Piper for a text-to-voice generation.
Enable it in config.js, make sure to install Piper before running llama.cui 

## Linux
   ### Getting Piper 
      git clone https://github.com/rhasspy/piper.git
      cd piper  
      make  
      That should build Piper and put it in "piper/install/"
      
   ### Downloading voice models  
      Models can be found on Hugging Face:  
      https://huggingface.co/rhasspy/piper-voices  
      Default Llama.cui voice model is librits/en_US-libritts_r-medium.onnx"  
      https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/libritts/high
      
   ### Configure Piper  
      // The config below is already a default in config.js. You will only need to set "enabled" to true in piper config
      config.piper = {  
        enabled: true,  
        rate: 20500, // depends on your model  
        output_file: 'S16_LE', //Piper outputs 16-bit mono PCM buffers so keep this value as is  
        exec: "../../piper/install/piper", // set a path to your piper installation  
        model: "/home/denis/CODE/piper/models/librits/en_US-libritts_r-medium.onnx"  // set a path to your voice models  
      };  
      
## MacOS 

In addition to the regular Linux instructions on Mac other configurations must be performed to install Piper.  

### Try piper_install_mac.sh installation script first:

     `bash piper_install_mac.sh`
     
### Example of usage

   `echo 'Welcome to the world of speech synthesis!' | "$PIPER_ROOT_FOLDER/piper/install/piper" \
    --model "$PIPER_ROOT_FOLDER/models/librits/en_US-libritts-high.onnx" \
    --output-file welcome.wav`
 
     If it fails at any stage try the guide below: 

## Manual piper installation.

First lets install brew if you do not have it yet:  
`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

### Install espeak-ng:  

  `/opt/homebrew/bin/brew install espeak-ng`   
  You now should have /opt/homebrew/Cellar/espeak-ng/1.51/lib/libespeak-ng.1.dylib  //your version might be different   
  `cd to your piper root folder`  
  
### Install piper-phonemize  

  `git clone https://github.com/rhasspy/piper-phonemize.git`  
  `cd piper-phonemize`  
  `make`  
   Once the compilation process is done you should have libpiper_phonemize.1.dylib in ./piper-phonemize/install/lib
   
### Setting up environmental variables  

   Now lets create the necessary links to the libraries so that piper can find them:   
   Add this lines to your ~/.zprofile file before 'export PATH':   
   
   `PATH="/opt/homebrew/bin:${PATH}"  
   
export DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/espeak/1.48.04_1/lib/:$DYLD_LIBRARY_PATH  
export DYLD_LIBRARY_PAT=/PIPER_ROOT_DEER/piper-phonemize/lib:$DYLD_LIBRARY_PATH`
   
  make sure you provide the correct path to PIPER_ROOT_DEER   

  Do not forget to source your env file:  
  
  source ~/.zprofile   
  
  You should now be able to run piper as following, make sure the path to your piper install is correct:
  echo 'Welcome to the world of speech synthesis!' | \ ./piper/install/piper --model ./piper/models/librits/en_US-libritts-high.onnx --output-file welcome.wav


[![Piper Demo]()](https://github.com/dspasyuk/llama.cui/assets/34203011/1a7d530c-92a3-4d14-9c7d-79a25f73610f)
</details>
<details><summary> <H1> Embeddings: Local Documents and Web</H1></summary>

llama.cui supports embeddings from a text file (see the docs folder), MongoDB, and Web (duckduckgo). 

You will need to delete the existing DB folder before running llama.cui. The new database will be generated on the next request for embedding (select use database in the bottom left corner of the UI interface to generate the database)  

For data format convention, llama.cui uses the anytotext.js library. You can place any doc, xlsx, docx, txt, or other text files into "docs" directory to create your vector database. All embeddings are treated localy using all-MiniLM-L6-v2 model. 

</details>

<details open><summary> <H1> Screenshots </H1></summary>
   
![Screenshot](https://github.com/user-attachments/assets/f89c0320-c7bc-4c18-9866-62aba28b1145)

HTML/CSS/JS code preview 
![Code_highlight](https://github.com/user-attachments/assets/69bdb5ca-3f7a-48b0-be19-f0dc3682d3d8)

![Using Web for Embedding](https://github.com/user-attachments/assets/36434a86-39dd-4f8a-8913-bfe43d0cc792)
![MathJax support](https://github.com/user-attachments/assets/c2a41b15-d476-436f-99f1-03667532453e)






</details>



