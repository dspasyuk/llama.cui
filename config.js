// Copyright Denis Spasyuk
// License MIT

import path from "path";
import prmt from "./src/prompt.js";
import fs from "fs";
import hash from "./src/hash.js";
const Hash = new hash();
const config = {};
config.AI = {llamacpp:false, groq:false, ollama:true}

config.modelrepo = "Qwen/Qwen2.5-Coder-14B-Instruct-GGUF";
config.modeldirectory = path.resolve('../models');
config.modelname = "qwen2.5-coder-14b-instruct-q5_k_m.gguf"; 
config.systemPrompt = fs.readFileSync('./Alice.txt', 'utf8');


//###########################################GROQ###########################################
config.groqParameters = {
  data:{
    messages: [{
      "role": "system",
      "content": `'${config.systemPrompt}'`
    },{
        "role": "user",
        "content": "", 
    }],
    model: "qwen-qwq-32b",
    temperature: 0.2,
    max_tokens: 1024*16,
    top_p: 0.1,
    stream: false,
    stop: null
} ,
  historyLimit: 30,
  APIkey: process.env.GROQ_API_KEY || ""
}

//###########################################OLLAMA###########################################
config.ollamaParameters = {
  data:{
    messages: [{
      "role": "system",
      "content": `'${config.systemPrompt}'`
    },{
        "role": "user",
        "content": "", 
    }],
    model: "qwen3:14b",
    temperature: 0.1,
    max_tokens: 1024*10,
    top_p: 0.1,
    stream: true,
    stop: null
} ,
  historyLimit: 30,
}

// create project get api key add Custom Search API to the project https://console.cloud.google.com/
// create programable search engine, get ID https://programmablesearchengine.google.com
config.google = {
  APIkey: process.env.GOOGLE_API_KEY || "",
  SearchEngineID:  process.env.GOOGLE_SEARCH_ENGINE_ID || "",
}

//###########################################LLAMA.CPP###########################################
config.llamaParams = {
  "--model": path.join(config.modeldirectory, config.modelname),
  "--n-gpu-layers": 50, // remove if using CPU
  "-cnv": "",
  "--simple-io": "",
  "-b": 512*4,
  "--ctx_size": 1024*8,
  "--temp": 0.3,
  "-fa": "",
  "-t": "6",
  "--top_k": 10,
  "--multiline-input": "",
  "--chat-template": "chatml",
  //"--log-disable": "",          
  "-p": `'${config.systemPrompt}'`
};

config.llamacpp = "../llama.cpp/build/bin/llama-cli";

//###########################################GENERAL###############################################
// Llama.cui settings
config.PORT = { client: "7000", server: "7000" };
config.IP = { client: "localhost", server: "localhost" };
config.login = false;
config.timeout = 50000;
config.session = {
  secret: "2C44-4D44-WppQ38S", // change before deployment
  resave: true,
  saveUninitialized: true,
  store: "",
  cookie: {
    secure: false, // will change to true when deploying to production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 10000000, // 2400 hours
    sameSite: true,
  },
};

config.loginTrue = async function (user) {
  const userdb = [{ username: "admin", password: await Hash.cryptPassword("12345") }];
  const theuser = userdb.find(({ username }) => username === user);
  return theuser;
};

config.embedding = {MongoDB:false, Documents: true, WebSearch: true };
config.maxTokens = 8000;

config.filter = function (output) {
  return output.replace(/<\|.*?\|>/g, '').replace(/<think>.*?<\/think>/gs, '').trim();
};

// Adjust model prompt
config.prompt = function (userID, prompt, context, firstchat) {
  return prmt.promptFormatNONE(config.systemPrompt, prompt, context, firstchat); 
};

// Filter any unwanted model outputs or change formatting here
config.outputFilter = function (output) {
  return config.filter(output);
};

// Piper setting
config.piper = {
  enabled: false,
  rate: 21500,
  //rate: 16000,
  output_file: 'S16_LE',
  exec: "../piper/install/piper",
  model: "../piper/models/librits/en_US-libritts-r-medium.onnx", 
};

config.testQuestions = `
Answer the following questions:
1. The day before two days after the day before tomorrow is Saturday. What day is it today?
2. Which number is larger 9.11 or 9.9?
3. Solve the equation 3y = 6y + 11 and find y.
4. There are two ducks in front of a duck, two ducks behind a duck, and a duck in the middle. How many ducks are there?
5. Billy's mom had 4 children. The 1st one was April, the 2nd was May, and the 3rd was June. What was the 4th child named?
6. What are the products of the chemical reaction between salicylic acid and acetic anhydride?
7. If five cats can catch five mice in five minutes, how long will it take one cat to catch one mouse?
8. Create a bouncing ball animation as all in one HTML/JS/CSS page.
`;

export default config;
