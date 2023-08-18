# llcui small llama.ccp wrapper for Node.js

This project provides a Node.js server for a chat user interface (UI) that interacts with the Llama.cpp library. It allows users to communicate with the Llama.cpp application via a web-based chat interface.

## Installation

  1. Clone the repository:
git clone https://github.com/ggerganov/llama.cpp.git
  2.Build Lllama.cpp with GPU support
cd llama.cpp
sed -i 's/export NVCCFLAGS="-arch=native"/export NVCCFLAGS="-arch=all"/' llama.cpp/Makefile
make clean && LLAMA_CUBLAS=1 make -j
  3. Clone llcui
git clone https://github.com/deonis1/llcui
  4. Set your configuration parameters
cd llcui
Open config.js and change hostname, port, path to llama.cpp main file, and the model name/path
