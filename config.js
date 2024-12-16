// Copyright Denis Spasyuk
// License MIT

import path from "path";
import prmt from "./src/prompt.js";
import fs from "fs";
import hash from "./src/hash.js";
const Hash = new hash();


const config = {};

config.modelrepo = "bartowski/Qwen2.5-7B-Instruct-GGUF";
config.modeldirectory = path.resolve('./models');
config.modelname = "Qwen2.5-7B-Instruct-Q4_0.gguf"; 

// Model Setting //Llama.cpp settings
config.systemPrompt = fs.readFileSync('./Alice.txt', 'utf8');
// config.systemPrompt= fs.readFileSync('Science.txt', 'utf8');

config.params = {
  "--model": path.join(config.modeldirectory, config.modelname),
  "--n-gpu-layers": 33, // remove if using CPU
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

config.llamacpp = "../llama.cpp/llama-cli";

// Llama.cui settings
config.PORT = { client: "7777", server: "7777" };
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
  return output.replace(/<\|.*?\|>/g, '');
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
