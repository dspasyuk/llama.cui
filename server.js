//Installation
// git clone https://github.com/ggerganov/llama.cpp.git
// cd llama.cpp
// sed -i 's/-arch=native/-arch=all/g' Makefile
// make clean && LLAMA_CUBLAS=1 make  -j
//Copyright Denis Spasyuk
//License MIT

import express from 'express';
import { spawn, exec } from 'child_process';
import http from 'http';
import { Server as socketIO } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import vdb from './src/db.js';
import GOOG from './src/goo.js';
import fs from 'fs';
import downloadModel from './src/modeldownloader.js';
import session from 'express-session';
import MemoryStoreModule from 'memorystore';
import hash from "./src/hash.js";
import axios from "axios";
const Hash = new hash();
import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MemoryStore = MemoryStoreModule(session);
const memStore = new MemoryStore();
const version = 0.350; //changed public and server and config

function ser() {}

ser.modelinit = async function () {
  if (fs.existsSync(config.llamaParams["--model"])) {
    console.log("Model exists");
  } else {
    console.log("Downloading the model", config.llamaParams["--model"]);
    console.log("Model repo: " + config.modelrepo, config.modelname,    config.modeldirectory);
    await downloadModel(
      config.modelrepo,
      config.modelname,
      config.modeldirectory
    );
  }
};

ser.init = function (error) {
  this.terminationtoken = "\n\n>";
  this.connectedClients = new Map();
  this.socketId = null;
  this.messageQueue = []; // Queue to store messages from clients
  this.isProcessing = false; // Flag to track if a message is being processed
  this.chatGroqHistory = new Map();
  if (config.AI.llamacpp) this.runLLamaChild();
  this.piper_client_enabled = true;
  if (config.piper.enabled) {
    this.fullmessage = "";
    this.piperChild();
  }
  // Listen for the 'exit' event to handle process exit.

  this.app = express();
  this.server = http.createServer(this.app);

  config.session.store = memStore;
  this.sessionStore = session(config.session);

  this.app.use(this.sessionStore);
  this.app.use(cors());

  this.io = new socketIO(this.server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });
  this.io.engine.use(this.sessionStore);
  this.io.use(async (socket, next) => {
    // Check authentication status here
    const sessionID = socket.handshake.query.sessionID;
    // Check authentication using the session ID
    const isValid = await ser.isValidSession(sessionID);
    // console.log("Session is valid", isValid);
    if (isValid) {
      return next();
    } else {
      socket.emit("redirect-login");
    }
    // Reject unauthorized connections
    return next(new Error("Unauthorized"));
  });
  this.io.on("connection", (socket) => this.handleSocketConnection(socket));
  this.app.use(express.json());
  this.app.use(express.urlencoded({ extended: true }));
  this.app.set("views", path.join(__dirname, "views"));
  this.app.set("view engine", "ejs");
  this.app.use(express.static(path.join(__dirname, "public")));
  this.app.use(express.static(path.join(__dirname, "docs")));

  // Define a route to render the EJS view
  this.app.get("/", ser.loggedIn, (req, res, next) => {
    const sessionID = req.sessionID;
    // console.log("Session ID", config.piper.rate);
    res.render("index", {
      title: "Llama.cui",
      version: version,
      hostname: config.IP.client,
      port: config.PORT.client,
      testQs: config.testQuestions,
      sessionID: sessionID,
      embedding: config.embedding,
      piper: {rate:config.piper.rate, enabled:config.piper.enabled},
    });
  });

  this.app.post("/stopper", async (request, response) => {
    console.log("STOPPING");
    if(config.AI.llamacpp){
      ser.llamachild.kill("SIGINT");
      this.messageQueue.splice(0, 1);
      this.isProcessing = false;
      this.processMessageQueue();
      response.send({ message: "stopped" });
    }else{
      response.send({ message: "stopped" });
    }
  });

  this.app.get("/login", (req, res) => {
    if (!config.login) {
      return res.redirect("/");
    } else {
      res.render("login", { title: "login" });
    }
  });

  this.app.get("/logout", async (req, res) => {
    req.session.destroy();
    // res.render("logout", { user: config.username });
    return res.redirect("/login");
  });

  this.app.post("/login", async (req, res) => {
    const sessionID = req.sessionID;
    if (!config.login) {
      return res.redirect("/");
    } else {
      const username = req.body.username;
      const password = req.body.password;
      try {
        if (!username || !password) {
          res.render("login", { title: "login" });
        } else {
          let users = await config.loginTrue(username); //replace this with database query
          if (users.length === 0) {
            res.render("login", { title: "login" });
          } else {
            // Compare the provided password with the stored password
            if (await Hash.comparePassword(password, users.password)) {
              // Authentication successful
              req.session.loggedin = true;
              req.session.user = { username };
              if (req.xhr) {
                // Send JSON response
                res.json({ success: true, sessionID });
              } else {
                // Redirect to the "/" page
                res.redirect("/");
              }
              // console.log("Login Successful");
            } else {
              res.render("login", { title: "login" });
            }
          }
        }
      } catch (error) {
        // Handle errors gracefully
        console.error("Error during login:", error);
        res.status(500).send("Internal Server Error");
      }
    }
  });

  this.start();
  ser.open();
};

ser.isValidSession = function (sessionID) {
  return new Promise((resolve, reject) => {
    memStore.get(sessionID, (err, session) => {
      if (err) {
        console.error("Error validating session:", err);
        reject(err);
      } else {
        // Assuming a session is valid if it exists
        resolve(!!session);
      }
    });
  });
};

ser.runLLamaChild = function () {
  console.log(
    config.llamacpp + " " + Object.entries(config.llamaParams).flat().join(" ")
  );
  var configParams = Object.entries(config.llamaParams).flat();
  this.llamachild = spawn(
    config.llamacpp,
    configParams.filter((item) => item !== ""),
    {
      stdio: ["pipe", "pipe", process.stderr],
    }
  );
  this.llamachild.stdin.setEncoding("utf-8");
  this.llamachild.stdout.setEncoding("utf-8");
  this.llamachild.stdout.on("data", (msg) => this.handleLlama(msg));
  this.llamachild.on("exit", (code, signal) => {
    if (code !== null) {
      console.log(`Child process exited with code ${code}`);
      this.runLLamaChild();
    } else if (signal !== null) {
      console.log(`Child process terminated by signal ${signal}`);
      this.runLLamaChild();
    }
  });
};

ser.lengthLimit = function (history) {
   let total = "";
   for (let i = 0; i < history.length; i++) {
     total += history[i].content;
   }
   return ser.tokenCount(total);
};

ser.runGroq = function (input, socketId) {
  if (input.length === 0) return;
  if (!this.chatGroqHistory.has(socketId)) {
    // Clone the initial config messages
    this.chatGroqHistory.set(socketId, config.groqParameters.data.messages);
  }
  const history = this.chatGroqHistory.get(socketId);
  // Add user message
  history.push({ role: "user", content: input });
  // Keep history manageable 
  console.log(ser.lengthLimit(history)[1]);
  if (history.length > config.groqParameters.historyLimit || config.groqParameters.data.max_tokens > ser.lengthLimit(history)[1]) {
    history.shift(); // Remove oldest message
  }
  // Prepare request payload without modifying original config
  const requestData = {  ...config.groqParameters.data, messages: history, user: socketId };
  // console.log(JSON.stringify(requestData));
  axios.post('https://api.groq.com/openai/v1/chat/completions', 
    JSON.stringify(requestData),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.groqParameters.APIkey}`,
      }
    }).then(response => {
      const botResponse = response.data.choices[0].message.content + this.terminationtoken;
      history.push({ role: "assistant", content: botResponse });
      // Emit response to client
      this.handleGroq(botResponse);
    }).catch(error => {
      console.error(JSON.stringify(error));
    });
};


ser.handleGroq = function (msg) {
  const output = config.outputFilter(msg);
  this.io.to(this.socketId).emit("output", output);
  this.runPiper(output);
  if (output) {
    clearTimeout(this.streamTimeout);
  }
  this.messageQueue.splice(0, 1);
  this.isProcessing = false;
  this.processMessageQueue();
};


ser.handleLlama = function (msg) {
this.buffer += msg.toString("utf-8");
let lastSpaceIndex = this.buffer.lastIndexOf(" ");
if (lastSpaceIndex !== -1) {
  let output = this.buffer.substring(0, lastSpaceIndex);
  this.buffer = this.buffer.substring(lastSpaceIndex + 1);
  output = config.outputFilter(output);
  if (output) {
    clearTimeout(this.streamTimeout);
  }
  this.io.to(this.socketId).emit("output", output);
  this.runPiper(output);
  if (output.includes(this.terminationtoken)) {
    this.messageQueue.splice(0, 1);
    this.isProcessing = false;
    this.processMessageQueue();
  }
}
};

ser.loggedIn = function (req, res, next) {
  if (!config.login) {
    req.session.loggedin = true;
  }
  if (req.session.loggedin) {
    next();
  } else {
    res.redirect("/login");
  }
};

ser.aplayChild = function () {
  this.aplay = spawn("aplay", [
    "-r",
    config.piper.rate,
    "-f",
    config.piper.output_file,
    "-t",
    "raw",
    "-",
  ]);
 
};

ser.piperChild = function () {
  // console.log(`${config.piper.exec} --model ${config.piper.model} --output-raw`);
  this.piper = spawn(config.piper.exec, [
    "--model",
    config.piper.model,
    "--output-raw",
  ], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  this.piper.stdout.on('data', (data) => { 
    //16-bit mono PCM samples buffers
    ser.io.to(this.socketId).emit("buffer", data);
});
  this.piper.stderr.on("error", (error) => {
    console.error("An error occurred in the piper child process:", error);
  });
};

ser.open = function () {
  var url = "http://"+config.IP.client + ":" + config.PORT.client;
  var start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
  exec(start + ' ' + url);
};

ser.webseach = async function(query){
  const goog = new GOOG();
  const results = await goog.searchGoogle(query, config.google.APIkey, config.google.SearchEngineID, 4)
  return results;
}

ser.runPiper = function (output) {
  if (config.piper.enabled) {
    
    this.fullmessage += " " + output;
    if (
      this.fullmessage.includes(".") ||
      this.fullmessage.includes(":") ||
      this.fullmessage.includes(";") ||
      this.fullmessage.includes("!") ||
      this.fullmessage.includes("?") ||
      this.fullmessage.includes("\n")
    ) {
      if(this.piper_client_enabled){
         var submit = this.fullmessage;
         this.piper.stdin.write(submit.replace(/\*/g, '').replace(/\#/g, ''));
      } 
      // console.log("fullmesd", this.fullmessage);
      this.fullmessage = "";
    }
  }
};



ser.processMessageQueue = function () {
  if (this.messageQueue.length === 0) {
    this.isProcessing = false;
    return;
  }
  this.isProcessing = true;
  const message = this.messageQueue[0];
  const { socketId, input, embed, piper } = message;
  this.socketId = socketId;
  this.piper_client_enabled = piper;
  // Send the message to the child process
  if (config.AI.llamacpp){ ;
    this.llamachild.stdin.cork();
    this.llamachild.stdin.write(`${input}`);
    this.llamachild.stdin.write("\n");
    this.llamachild.stdin.uncork();
  } else if(config.AI.groq) {
    if (config.groqParameters.APIkey.length > 0) {
      this.runGroq(input);
    } else {
      this.io.to(this.socketId).emit("output", 'Groq API key is missing or incorrect. Go to https://console.groq.com/keys to get your API key. Set your API key in the config.js file or using environment variables. On Unix/Linux/MacOS: export GROQ_API_KEY="your_api_key" On Windows: set GROQ_API_KEY="your_api_key"');
    }
    this.runGroq(input);
  }
};

ser.handleTimeout = function () {
  console.log("Timeout");
  ser.isProcessing = false;
  if(config.AI.llamacpp){
    ser.llamachild.kill("SIGINT");
  }else if(config.AI.groq) {
    console.log("No response from Groq");
  }
};

ser.tokenCount = function (text) {
  const tokens = text.match(/\b\w+\b/g) || [];
  const tokensarr =  tokens.filter(token => /\S/.test(token))
  return [tokensarr, tokensarr.length]; 
};

ser.TokenLimit = function(objects, maxTokens, tokenCounter) {
  let embed = "";
  let totalTokens = 0;
  let cutobj = []; 
  for (let obj of objects) {
    let objStr = JSON.stringify(obj);
    let [tokens, tokenLen] = tokenCounter(objStr); // Use tokenCounter to count tokens

    if (totalTokens + tokenLen > maxTokens) {
      // Truncate the object string to fit the remaining tokens
      let remainingTokens = maxTokens - totalTokens;
      objStr = tokens.slice(0, remainingTokens).join(" ");
      totalTokens += remainingTokens;
      embed += objStr;
      break; // Stop once we've reached the limit
    }
    totalTokens += tokenLen;
    embed += objStr;
    cutobj.push(obj);
  }

  return [embed, cutobj]; // Return the concatenated string within token limit
}

ser.handleSocketConnection = async function (socket) {
  if (socket.request.session) {
    socket.on("message", async (data) => {
      var input = data.message;
      var socketId = data.socketid;
      var embed = "";
      var embedobj = [];
      if (data.embedding.db) {
          embedobj = embedobj.concat(await vdb.init(input));
      }
      if(config.embedding.WebSearch && data.embedding.web && input.length < 100){
          const searchRes = await ser.webseach(input);
          embedobj = embedobj.concat(searchRes);
      }
      if(embed!=null || embed!=undefined || embed!= ""){
        [embed, embedobj] = ser.TokenLimit(embedobj, config.maxTokens, ser.tokenCount);
        this.io.to(socketId).emit("output", embedobj);
      }
      input = config.prompt(socketId, input, embed, data.firstchat || false);
      input = input + "\\";
      let piper = data.piper;
      this.connectedClients.set(socketId, input);
      // Add the incoming message to the queue
      this.messageQueue.push({ socketId, input, embed, piper});
      this.streamTimeout = setTimeout(this.handleTimeout, config.timeout);
      // Process messages if the queue is not being processed currently
      if (!this.isProcessing) {
        this.processMessageQueue();
      }
    });
    
    socket.on("tosound", async (data) => {
      if(data.mode==="start"){
        this.socketId = data.socketid;
        this.piper_client_enabled = data.piper;
        // console.log("start", data.socketid);
        this.runPiper(data.message+"\n");
      }
      if(data.mode==="stop"){
        // console.log("stop", data.socketid);
        this.socketId = data.socketid;
        this.piper.kill("SIGINT");
        ser.piperChild();

      }
    })

    socket.on("error", function () {
      console.log("Error", error);
    });
    socket.on("disconnect", () => {
      this.connectedClients.delete(socket.id);
    });
  } else {
    console.log("Not Logged In!");
    socket.disconnect(true);
  }
};

ser.start = function () {
  this.server.listen(config.PORT.server, config.IP.server, () => {
    console.log(
      "Server Running on:",
      config.IP.server + ":" + config.PORT.server
    );
  });
};


async function run() {
  if(config.AI.llamacpp){
    await ser.modelinit();
  }
 
  ser.init();
}
run();

process.on('SIGINT', () => {
  console.log('Received SIGINT. Terminating processes...');
  if (ser.llamachild) ser.llamachild.kill('SIGINT');
  if (ser.piper) ser.piper.kill('SIGINT');
  process.exit(0); // Exit the main process
});


export default ser;
