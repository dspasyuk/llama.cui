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
const version = 0.370; //changed public and server and config

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
  this.chatOllamaHistory = new Map();
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
  let totalTokens = 0;
  let totalMessages = 0;
  for (let message of history) {
      totalMessages++;
      totalTokens += message.content.length;
  }
  return [totalTokens, totalMessages];
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

  // Check token limit and history length
  const [tokenCount, messageCount] = ser.lengthLimit(history);
  // Remove old messages if token limit is exceeded
  while (tokenCount > config.groqParameters.data.max_tokens && history.length > 1) {
      history.shift();
      const newTokenCount = ser.lengthLimit(history)[0];
      if (newTokenCount <= config.groqParameters.data.max_tokens) {
          break;
      }
  }
  // Ensure history doesn't exceed the maximum number of messages
  while (history.length > config.groqParameters.historyLimit) {
      history.shift();
  }
  console.log("history", ser.lengthLimit(history));
  // Prepare request payload without modifying original config
  const requestData = {  ...config.groqParameters.data, messages: history, user: socketId };
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
          this.handleGroqError(error);
          console.error(JSON.stringify(error));
      });
};

ser.runOllama = async function (input, socketId) {
    if (input.length === 0) return;
    
    if (!this.chatOllamaHistory.has(socketId)) {
        this.chatOllamaHistory.set(socketId, [...config.ollamaParameters.data.messages]);
    }
    
    const history = this.chatOllamaHistory.get(socketId);
    history.push({ role: "user", content: input });
    
    let [tokenCount, messageCount] = ser.lengthLimit(history);
    while (tokenCount > config.ollamaParameters.data.max_tokens && history.length > 1) {
        history.shift();
        tokenCount = ser.lengthLimit(history)[0];
    }
    
    while (history.length > config.ollamaParameters.historyLimit) {
        history.shift();
    }
    
    const requestData = {
        ...config.ollamaParameters.data,
        messages: history,
        stream: true,
    };
    
    const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullResponse = '';
    
    // Smart buffering system
    let outputBuffer = '';
    let lastEmitTime = Date.now();
    let inCodeBlock = false;
    let inHtmlTag = false;
    let htmlTagBuffer = '';
    
    // Function to detect content type and determine buffering strategy
    const analyzeContent = (content) => {
        // Check for code block markers
        if (content.includes('```')) {
            inCodeBlock = !inCodeBlock;
        }
        
        // Check for HTML tag start
        if (content.includes('<') && !inCodeBlock) {
            inHtmlTag = true;
            htmlTagBuffer = '';
        }
        
        // Check for HTML tag end
        if (inHtmlTag && content.includes('>')) {
            inHtmlTag = false;
            htmlTagBuffer = '';
        }
        
        if (inHtmlTag) {
            htmlTagBuffer += content;
        }
    };
    
    // Smart emit logic
    const shouldEmitBuffer = (buffer) => {
        const now = Date.now();
        const timeSinceLastEmit = now - lastEmitTime;
        
        // Never emit if we're in the middle of an HTML tag
        if (inHtmlTag) return false;
        
        // In code blocks, emit at line breaks or after reasonable chunks
        if (inCodeBlock) {
            return buffer.includes('\n') || buffer.length > 50;
        }
        
        // For regular text, emit at sentence boundaries or word boundaries
        if (buffer.length > 80) return true; // Prevent huge buffers
        
        // Emit at sentence endings
        if (/[.!?]\s/.test(buffer) || buffer.endsWith('\n')) return true;
        
        // Emit after complete words if enough time has passed
        if (timeSinceLastEmit > 100 && buffer.length > 15 && /\s\w+\s/.test(buffer)) {
            return true;
        }
        
        // Emit after reasonable time with minimum content
        if (timeSinceLastEmit > 200 && buffer.length > 5) return true;
        
        return false;
    };
    
    // Emit buffer with smart chunking
    const emitBuffer = () => {
        if (outputBuffer.length > 0) {
            let toEmit = outputBuffer;
            
            // If we're not in a code block or HTML tag, try to emit at word boundaries
            if (!inCodeBlock && !inHtmlTag) {
                // Find the last complete word
                const lastSpaceIndex = toEmit.lastIndexOf(' ');
                if (lastSpaceIndex > toEmit.length * 0.7) { // Only if the space is in the latter part
                    const completeWords = toEmit.substring(0, lastSpaceIndex + 1);
                    const remainder = toEmit.substring(lastSpaceIndex + 1);
                    
                    if (completeWords.trim().length > 0) {
                        this.io.to(socketId).emit("output", completeWords);
                        outputBuffer = remainder;
                        lastEmitTime = Date.now();
                        return;
                    }
                }
            }
            
            // Emit the whole buffer
            this.io.to(socketId).emit("output", toEmit);
            outputBuffer = '';
            lastEmitTime = Date.now();
        }
    };
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split('\n');
        buffer = lines.pop(); // save any partial line
        
        for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
                const parsed = JSON.parse(line);
                const content = parsed?.message?.content;
                
                if (content !== undefined) {
                    fullResponse += content;
                    outputBuffer += content;
                    
                    // Analyze the content to update our state
                    analyzeContent(content);
                    
                    // Check if we should emit the buffer
                    if (shouldEmitBuffer(outputBuffer)) {
                        emitBuffer();
                    }
                    
                    if (content.trim()) {
                        clearTimeout(this.streamTimeout);
                    }
                }
            } catch (err) {
                console.error("JSON parse error:", err, "Line:", line);
            }
        }
    }
    
    // Emit any remaining buffer content
    emitBuffer();
    
    history.push({ role: "assistant", content: fullResponse});
    
    // Call cleanup without re-emitting
    this.cleanupAfterOllama(fullResponse);
}
// Cleanup function for streaming responses (no emission)
ser.cleanupAfterOllama = function (msg) {
    this.runPiper(msg);
    this.io.to(this.socketId).emit("output", this.terminationtoken);
    this.messageQueue.splice(0, 1);
    this.isProcessing = false;
    this.processMessageQueue();
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

ser.handleOllamaError = function (error) {
   console.log(error);
}
ser.handleGroqError = function (error) {
switch (error.response.status) {
  case 400:
     this.handleGroq("Bad Request: Invalid request syntax. Review the request format and ensure it is correct.");
     this.isProcessing = false;
      break;
  case 401:
     this.handleGroq("Unauthorized: Invalid API key or authentication credentials. Ensure the request includes the necessary authentication credentials and the API key is valid.");
     this.isProcessing = false; 
     break;
  case 404:
     this.handleGroq("Not Found: The requested resource could not be found. Check the request URL and the existence of the resource.");
     this.isProcessing = false; 
     break;
  case 422:
     this.handleGroq("Unprocessable Entity: The request was well-formed but could not be followed due to semantic errors. Verify the data provided for correctness and completeness.");
     this.isProcessing = false; 
     break;
  case 429:
     this.handleGroq("Too many requests were sent in a given timeframe.");
      // Implement retry logic with exponential backoff
      this.isProcessing = false;
      break;
  case 498:
     this.handleGroq("The flex tier is at capacity and the request won't be processed. Try again later.");
      // Implement retry logic with exponential backoff
      this.isProcessing = false;
      break;
  case 499:
     this.handleGroq("Request Cancelled: The request was cancelled by the caller.");
     this.isProcessing = false; 
     break;
  default:
     this.handleGroq("Groq API error:", error);
     this.isProcessing = false;
    }
  }

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
  const results = await goog.searchAndScrape(query, config.google.APIkey, config.google.SearchEngineID, 4, 4000);
  console.log(results);
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
  }else if(config.AI.ollama) {
    this.runOllama(input, socketId);
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
      if(config.embedding.WebSearch && data.embedding.web && input.length < 500){
          
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
