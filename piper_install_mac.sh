#!/bin/bash

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install Homebrew if not installed
if ! command_exists brew; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Create piper root folder if it doesn't exist
PIPER_ROOT_FOLDER=~/Documents/piper
mkdir -p "$PIPER_ROOT_FOLDER"

# Install espeak-ng using Homebrew
/opt/homebrew/bin/brew install espeak-ng

# Change directory to Piper root folder
cd "$PIPER_ROOT_FOLDER" || exit

# Clone Piper repository
git clone https://github.com/rhasspy/piper.git

# Change directory to piper
cd piper || exit

# Compile Piper
make

# Change directory back to Piper root folder
cd "$PIPER_ROOT_FOLDER" || exit

# Clone piper-phonemize repository
git clone https://github.com/rhasspy/piper-phonemize.git

# Change directory to piper-phonemize
cd piper-phonemize || exit

# Compile piper-phonemize
make

# Change directory back to Piper root folder
cd "$PIPER_ROOT_FOLDER" || exit

mkdir -p "$PIPER_ROOT_FOLDER"/models
mkdir -p "$PIPER_ROOT_FOLDER"/models/librits

curl -L -o "$PIPER_ROOT_FOLDER"/models/librits/en_US-libritts-high.onnx https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts/high/en_US-libritts-high.onnx
curl -L -o "$PIPER_ROOT_FOLDER"/models/librits/en_US-libritts-high.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts/high/en_US-libritts-high.onnx.json

# Check if export statements already exist in .zprofile
if ! grep -qxF 'export PATH="/opt/homebrew/bin:${PATH}"' ~/.zprofile; then
    echo 'export PATH="/opt/homebrew/bin:${PATH}"' >> ~/.zprofile
fi

if ! grep -qxF 'export DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/espeak-ng/1.51/lib/:$DYLD_LIBRARY_PATH' ~/.zprofile; then
    echo 'export DYLD_LIBRARY_PATH=/opt/homebrew/Cellar/espeak-ng/1.51/lib/:$DYLD_LIBRARY_PATH' >> ~/.zprofile
fi

if ! grep -qxF "export DYLD_LIBRARY_PATH=$PIPER_ROOT_FOLDER/piper-phonemize-master/install/lib:\$DYLD_LIBRARY_PATH" ~/.zprofile; then
    echo "export DYLD_LIBRARY_PATH=$PIPER_ROOT_FOLDER/piper-phonemize-master/install/lib:\$DYLD_LIBRARY_PATH" >> ~/.zprofile
fi


# Confirm installation and setup
echo "Piper installation and setup completed successfully!"

# Source the updated .zprofile
source ~/.zprofile || exit

# Example usage
echo 'Welcome to the world of speech synthesis!' | "$PIPER_ROOT_FOLDER/piper/install/piper" \
    --model "$PIPER_ROOT_FOLDER/models/librits/en_US-libritts-high.onnx" \
    --output-file welcome.wav
