# Llama.cui is a small llama.cpp chat application for Node.js 
![logo](https://github.com/dspasyuk/llama.cui/blob/main/ico.svg?)


This project provides a Node.js server for a chat user interface (UI) that interacts with the Llama.cpp library. It allows users to communicate with the [llama.cpp](https://github.com/ggerganov/llama.cpp.git) application via a web-based chat interface. Please use Llama.cpp included in this project. 

## Installation

## Install all at once
Starting from version 0.24 model will be downloaded automatically. 

### Linux Nvidia GPU
`git clone https://github.com/dspasyuk/llama.cui; unzip llama.cpp.chat.zip; cd llama.cpp.chat; sed -i 's/-arch=native/-arch=all/g' Makefile; make clean && LLAMA_CUDA=1 make -j 4; cd ..; cd llama.cui; npm install; node server.js`

### Linux CPU

`git clone https://github.com/dspasyuk/llama.cui; unzip llama.cpp.chat.zip; cd llama.cpp.chat; sed -i 's/-arch=native/-arch=all/g' Makefile; make clean && make -j 4; cd ..; cd llama.cui; npm install; node server.js`

### OSX

`git clone https://github.com/dspasyuk/llama.cui; unzip llama.cpp.chat.zip; cd llama.cpp.chat; sed -i 's/-arch=native/-arch=all/g' Makefile; make clean && make -j 4; cd ..; cd llama.cui; npm install; node server.js`

## Usage
To run just type:

`npm start`

### Manual installation 

1. Clone the repository:

   `git clone https://github.com/ggerganov/llama.cpp.git` or use Llama.cpp included in this project

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
   a. Dolphin-Mistral 7B:   https://huggingface.co/TheBloke/dolphin-2.1-mistral-7B-GGUF/blob/main/dolphin-2.1-mistral-7b.Q5_0.gguf  
   b. Einstein-v4-7B:        https://huggingface.co/LoneStriker/Einstein-v4-7B-GGUF (Default)  

8. Install the project and set your configuration parameters
  
   `cd llama.cui

   npm install`

   Open config.js and change the hostname, port, path to llama.cpp main file, and the model name/path
   


## Login Information
Default login and password are specified in the config file but could be easily integrated with the user database.
The login is currently set to false. To enable login set login to true in the config file and change password.

## Piper integration https://github.com/rhasspy/piper
As of version 1.15 the llama.cui supports Piper for a text-to-voice generation.
Enable it in config.js, make sure to install Piper before running llama.cui 
### Linux
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
### MacOS 
In addition to the regular Linux instructions on Mac other configuration must be performed to install piper.  
#### Try piper_install_mac.sh installation script first:
     `bash piper_install_mac.sh`
     
##### Example of usage
   `echo 'Welcome to the world of speech synthesis!' | "$PIPER_ROOT_FOLDER/piper/install/piper" \
    --model "$PIPER_ROOT_FOLDER/models/librits/en_US-libritts-high.onnx" \
    --output-file welcome.wav`
 
     If it fails at any stage try the guide below: 

#### Manual piper installation.
First lets install brew if you do not have it yet:  
`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

#### Install espeak-ng:  
  `/opt/homebrew/bin/brew install espeak-ng`   
  You now should have /opt/homebrew/Cellar/espeak-ng/1.51/lib/libespeak-ng.1.dylib  //your version might be different   
  `cd to your piper root folder`  
#### Install piper-phonemize  
  `git clone https://github.com/rhasspy/piper-phonemize.git`  
  `cd piper-phonemize-master`  
  `make`  
   Once the compilation process is done you should have libpiper_phonemize.1.dylib in ./piper-phonemize-master/install/lib
#### Setting up environmental variables  
   Now lets create the necessary links to the libraries so that piper can find them:   
   Add this lines to your ~/.zprofile file before 'export PATH':   
   
   `PATH="/opt/homebrew/bin:${PATH}"  
   
export DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/espeak/1.48.04_1/lib/:$DYLD_LIBRARY_PATH  
export DYLD_LIBRARY_PAT=/PIPER_ROOT_DEER/piper-phonemize-master/lib:$DYLD_LIBRARY_PATH`
   
  make sure you provide the correct path to PIPER_ROOT_DEER   

  Do not forget to source your env file:  
  
  source ~/.zprofile   
  
  You should now be able to run piper as following, make sure the path to your piper install is correct:
  echo 'Welcome to the world of speech synthesis!' | \ ./piper/install/piper --model ./piper/models/librits/en_US-libritts-high.onnx --output-file welcome.wav


[![Piper Demo]()](https://github.com/dspasyuk/llama.cui/assets/34203011/1a7d530c-92a3-4d14-9c7d-79a25f73610f)
## Embeddings
![embedding](https://github.com/dspasyuk/llama.cui/assets/34203011/c66a9cd7-f9d9-4b69-9b4a-53e11a14a5bf)


llama.cui supports embeddings from a text file (see the docs folder) and MongoDB (do npm install Mongo and make changes to config.js to configure the database).

To use embeddings, you will need to create your vector database using the embedding.js script. Simply place any docx, html, xlsx, etc. files in the rawdocs folder and run the embedding.js script using the command below:

`node embedding.js`

You will need to detele the existing DB folder before running llama.cui. The new database will be generated on the next request for embedding (select use database in the bottom left corner of the UI interface to generate the database)  

For data format convention, llama.cui uses the anytotext.js library. 

## Screenshots
 ![Screenshot](https://github.com/dspasyuk/llama.cui/assets/34203011/820fb710-2fd0-4ed4-9945-01440155d1fe)

![Code_highlight](https://github.com/dspasyuk/llama.cui/assets/34203011/eb740616-8b5c-40f2-a85d-b42fd8775aba)







