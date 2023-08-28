# llcui small llama.ccp wrapper for Node.js

**Note: This project is a work in progress.**

This project provides a Node.js server for a chat user interface (UI) that interacts with the Llama.cpp library. It allows users to communicate with the Llama.cpp application via a web-based chat interface.

## Installation

1. Clone the repository:

git clone https://github.com/ggerganov/llama.cpp.git 

2. Build Lllama.cpp with GPU support

cd llama.cpp

sed -i 's/-arch=native/-arch=all/g' Makefile

make clean && LLAMA_CUBLAS=1 make -j

3. Clone llcui
   
git clone https://github.com/deonis1/llcui

4. Install the project and set your configuration parameters
  
cd llcui

npm install

Open config.js and change hostname, port, path to llama.cpp main file, and the model name/path

## Usage
To run just type:

npm start
![Image description][https://github.com/deonis1/llcui/Screenshot from 2023-08-27 18-15-50.png](https://github.com/deonis1/llcui/blob/main/Screenshot%20from%202023-08-27%2018-15-50.png)https://github.com/deonis1/llcui/blob/main/Screenshot%20from%202023-08-27%2018-15-50.png
