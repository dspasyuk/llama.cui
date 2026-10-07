// Installation: git clone https://github.com/ggerganov/llama.cpp.git && cd llama.cpp && make clean && LLAMA_CUBLAS=1 make -j
// Copyright Denis Spasyuk
// License MIT

import express from "express";
import { spawn, exec } from "child_process";
import http from "http";
import { Server as socketIO } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import vdb from "./src/db.js";
import WebSearch from "./src/exa.js";
import fs from "fs";
import downloadModel from "./src/modeldownloader.js";
import session from "express-session";
import MemoryStoreModule from "memorystore";
import hash from "./src/hash.js";

const Hash = new hash();
import config from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MemoryStore = MemoryStoreModule(session);
const memStore = new MemoryStore();
const version = 0.390;

// Resolve the active LLM provider once (name + merged defaults).
const provider = config.active();
const isLlamaCpp = provider.name === "llamacpp";
const isOllama = provider.name === "ollama";

const ser = {};

// Persist small runtime state (e.g. the UI-selected ollama model) across restarts.
const statePath = path.join(__dirname, "state.json");
ser.loadState = function () {
  try {
    if (fs.existsSync(statePath)) return JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch (e) {
    console.error("Failed to load state:", e.message);
  }
  return {};
};
ser.saveState = function (patch) {
  const state = { ...ser.loadState(), ...patch };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  return state;
};

// A model chosen in the UI (state.json) overrides the one in config.js.
if (isOllama && ser.loadState().ollamaModel) {
  provider.model = ser.loadState().ollamaModel;
  console.log("Using saved Ollama model:", provider.model);
}

//###########################################MODEL INIT (llama.cpp only)###########################################
ser.modelinit = async function () {
  const { model } = provider;
  const modelPath = path.join(model.directory, model.file);
  if (fs.existsSync(modelPath)) {
    console.log("Model exists:", modelPath);
  } else {
    console.log("Downloading model:", modelPath, "from", model.repo);
    await downloadModel(model.repo, model.file, model.directory);
  }
};

//###########################################SERVER INIT###########################################
ser.init = function () {
  this.terminationtoken = "\n\n>";
  this.connectedClients = new Map();
  this.socketId = null;
  this.messageQueue = [];
  this.isProcessing = false;
  this.chatOllamaHistory = new Map();
  this.buffer = ""; // llama.cpp output buffer

  if (isLlamaCpp) this.runLLamaChild();

  this.piper_client_enabled = true;
  if (config.piper.enabled) {
    this.fullmessage = "";
    this.piperChild();
  }

  this.app = express();
  this.server = http.createServer(this.app);

  config.session.store = memStore;
  this.sessionStore = session(config.session);

  this.app.use(this.sessionStore);
  this.app.use(cors());

  this.io = new socketIO(this.server, {
    cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
  });
  this.io.engine.use(this.sessionStore);
  this.io.use(async (socket, next) => {
    const sessionID = socket.handshake.query.sessionID;
    const isValid = await ser.isValidSession(sessionID);
    if (isValid) return next();
    socket.emit("redirect-login");
    return next(new Error("Unauthorized"));
  });
  this.io.on("connection", (socket) => this.handleSocketConnection(socket));

  this.app.use(express.json());
  this.app.use(express.urlencoded({ extended: true }));
  this.app.set("views", path.join(__dirname, "views"));
  this.app.set("view engine", "ejs");
  this.app.use(express.static(path.join(__dirname, "public")));
  this.app.use(express.static(path.join(__dirname, "docs")));

  //###########################################ROUTES###########################################
  this.app.get("/", ser.loggedIn, (req, res) => {
    const sessionID = req.sessionID;
    res.render("index", {
      title: "Llama.cui",
      version,
      hostname: config.IP.client,
      port: config.PORT.client,
      testQs: config.testQuestions,
      sessionID,
      embedding: config.embedding,
      piper: { rate: config.piper.rate, enabled: config.piper.enabled },
      providerName: provider.name,
    });
  });

  this.app.post("/stopper", async (req, res) => {
    console.log("STOPPING");
    if (isLlamaCpp) {
      ser.llamachild.kill("SIGINT");
      this.messageQueue.splice(0, 1);
      this.isProcessing = false;
      this.processMessageQueue();
    }
    res.send({ message: "stopped" });
  });

  this.app.get("/login", (req, res) => {
    if (!config.login) return res.redirect("/");
    res.render("login", { title: "login" });
  });

  this.app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
  });

  this.app.post(
    "/login",
    async (req, res) => {
      const sessionID = req.sessionID;
      if (!config.login) return res.redirect("/");
      const username = req.body.username;
      const password = req.body.password;
      try {
        if (!username || !password) return res.render("login", { title: "login" });
        let users = await config.loginTrue(username);
        if (users.length === 0) return res.render("login", { title: "login" });
        if (await Hash.comparePassword(password, users.password)) {
          req.session.loggedin = true;
          req.session.user = { username };
          if (req.xhr) return res.json({ success: true, sessionID });
          res.redirect("/");
        } else {
          res.render("login", { title: "login" });
        }
      } catch (error) {
        console.error("Error during login:", error);
        res.status(500).send("Internal Server Error");
      }
    }
  );

  this.app.get("/api/models", ser.loggedIn, async (req, res) => {
    if (!isOllama) return res.json({ ok: false, models: [], current: null });
    try {
      const response = await fetch(`${provider.host}/api/tags`);
      if (!response.ok) throw new Error(`Ollama API error: ${response.status}`);
      const data = await response.json();
      const models = (data.models || []).map((m) => m.name).sort();
      res.json({ ok: true, models, current: provider.model });
    } catch (error) {
      console.error("Failed to list Ollama models:", error.message);
      res.json({ ok: false, models: [], current: provider.model, error: error.message });
    }
  });

  this.app.post("/api/setmodel", ser.loggedIn, (req, res) => {
    if (!isOllama) return res.json({ ok: false, error: "not ollama" });
    const model = req.body.model;
    if (!model || typeof model !== "string") {
      return res.status(400).json({ ok: false, error: "missing model" });
    }
    provider.model = model;
    ser.saveState({ ollamaModel: model });
    console.log("Ollama model switched to:", model);
    res.json({ ok: true, model });
  });

  this.start();
  ser.open();
};

ser.isValidSession = function (sessionID) {
  return new Promise((resolve, reject) => {
    memStore.get(sessionID, (err, session) => {
      if (err) {
        console.error("Error validating session:", err);
        return reject(err);
      }
      resolve(!!session);
    });
  });
};

//###########################################LLAMA.CPP CHILD PROCESS###########################################
ser.buildLlamaArgs = function () {
  const modelPath = path.join(provider.model.directory, provider.model.file);
  const args = [
    "--model", modelPath,
    "--n-gpu-layers", String(provider.gpuLayers),
    "-cnv",
    "--simple-io",
    "-b", String(provider.batchSize),
    "--ctx_size", String(provider.ctxSize),
    "--temp", String(provider.temperature),
    "-t", String(provider.threads),
    "--top_k", String(provider.topK),
    "--multiline-input",
    "-p", `'${config.systemPrompt}'`,
  ];
  if (provider.flashAttention) args.push("-fa");
  if (provider.jinja) args.push("--jinja");
  return args;
};

ser.runLLamaChild = function () {
  const args = this.buildLlamaArgs();
  console.log(`${provider.binary} ${args.join(" ")}`);

  this.llamachild = spawn(provider.binary, args, {
    stdio: ["pipe", "pipe", process.stderr],
  });
  this.llamachild.stdin.setEncoding("utf-8");
  this.llamachild.stdout.setEncoding("utf-8");
  this.llamachild.stdout.on("data", (msg) => this.handleLlama(msg));
  this.llamachild.on("exit", () => {
    console.log("llama.cpp child exited, restarting...");
    this.runLLamaChild();
  });
};

//###########################################LLAMA.CPP OUTPUT HANDLER###########################################
ser.handleLlama = function (msg) {
  this.buffer += msg.toString("utf-8");

  // Termination token has no trailing space — detect it explicitly.
  if (this.buffer.includes(this.terminationtoken)) {
    const idx = this.buffer.indexOf(this.terminationtoken) + this.terminationtoken.length;
    const output = config.outputFilterNoTrim(this.buffer.substring(0, idx));
    this.buffer = this.buffer.substring(idx);
    if (output) {
      clearTimeout(this.streamTimeout);
      this.io.to(this.socketId).emit("output", output);
      this.runPiper(output);
    }
    this.messageQueue.splice(0, 1);
    this.isProcessing = false;
    this.processMessageQueue();
    return;
  }

  // Emit complete words WITH their trailing space (the client concatenates as-is).
  const lastSpaceIndex = this.buffer.lastIndexOf(" ");
  if (lastSpaceIndex !== -1) {
    const output = config.outputFilterNoTrim(this.buffer.substring(0, lastSpaceIndex + 1));
    this.buffer = this.buffer.substring(lastSpaceIndex + 1);
    if (output) {
      clearTimeout(this.streamTimeout);
      this.io.to(this.socketId).emit("output", output);
      this.runPiper(output);
    }
  }
};

//###########################################LENGTH LIMITER###########################################
ser.lengthLimit = function (history) {
  let totalTokens = 0;
  for (let message of history) {
    totalTokens += message.content.length;
  }
  return [totalTokens, history.length];
};

//###########################################OLLAMA###########################################
ser.runOllama = async function (input, socketId) {
  if (!input || input.length === 0) return;

  if (!this.chatOllamaHistory.has(socketId)) {
    this.chatOllamaHistory.set(
      socketId,
      [{ role: "system", content: config.systemPrompt }]
    );
  }

  const history = this.chatOllamaHistory.get(socketId);
  history.push({ role: "user", content: input });

  // Trim history by char count and message limit
  let [charCount] = ser.lengthLimit(history);
  while (charCount > provider.historyMaxChars && history.length > 1) {
    history.shift();
    charCount = ser.lengthLimit(history)[0];
  }
  while (history.length > provider.historyLimit) {
    history.shift();
  }

  const requestData = {
    model: provider.model,
    messages: history,
    stream: true,
    temperature: provider.temperature,
    top_p: provider.topP,
    // Keep the model loaded between questions so follow-ups don't pay the
    // reload cost. Ollama accepts seconds or strings like "30m", "1h", "24h".
    keep_alive: provider.keepAlive,
  };

  try {
    const response = await fetch(
      `${provider.host}/api/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      }
    );

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    const showThinking = provider.showThinking;
    let buffer = "";
    let fullResponse = "";
    let idleStart = Date.now();
    let thinkingStarted = false;
    let thinkingClosed = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep partial line

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const msg = parsed.message;
          if (!msg) continue;

          const thinking = msg.thinking;
          const content = msg.content;

          // Any chunk with data resets the idle timer (thinking counts too)
          if (thinking || content) {
            idleStart = Date.now();
            clearTimeout(this.streamTimeout);
          }

          // Stream reasoning (thinking models like Qwen3) if enabled
          if (showThinking && thinking) {
            if (!thinkingStarted) {
              this.io.to(socketId).emit("output", "<think>\n");
              thinkingStarted = true;
            }
            this.io.to(socketId).emit("output", thinking);
          }

          // Stream the actual answer (raw chunks keep the model's spacing intact)
          if (content) {
            if (showThinking && thinkingStarted && !thinkingClosed) {
              this.io.to(socketId).emit("output", "\n</think>\n\n");
              thinkingClosed = true;
            }
            fullResponse += content;
            this.io.to(socketId).emit("output", content);
          }
        } catch (err) {
          // Silently skip invalid JSON lines (empty objects, partial writes, etc.)
        }
      }

      // Timeout: if nothing received for 30 seconds, abort
      if (Date.now() - idleStart > 30000) {
        await reader.cancel();
        break;
      }
    }

    fullResponse = fullResponse.trim();

    // Finalize
    history.push({ role: "assistant", content: fullResponse });
    this.cleanupAfterOllama(fullResponse);
  } catch (error) {
    console.error("Ollama error:", error.message);
    this.io.to(socketId).emit(
      "output",
      `Error connecting to Ollama (${provider.host}): ${error.message}. Make sure Ollama is running with the model pulled: ollama pull ${provider.model}`
    );
    this.cleanupAfterOllama("");
  }
};

ser.cleanupAfterOllama = function (msg) {
  clearTimeout(this.streamTimeout);
  this.runPiper(msg);
  this.io.to(this.socketId).emit("output", this.terminationtoken);
  this.messageQueue.splice(0, 1);
  this.isProcessing = false;
  this.processMessageQueue();
};

//###########################################PIPER (TTS)###########################################
ser.runPiper = function (output) {
  if (!config.piper.enabled) return;

  this.fullmessage += " " + output;
  const sentenceEnd = /[.!:;?\n]/.test(output);
  if (sentenceEnd && this.fullmessage.trim()) {
    if (this.piper_client_enabled) {
      this.piper.stdin.write(
        this.fullmessage.replace(/\*/g, "").replace(/\#/g, "")
      );
    }
    this.fullmessage = "";
  }
};

ser.piperChild = function () {
  this.piper = spawn(config.piper.exec, [
    "--model",
    config.piper.model,
    "--output-raw",
  ]);
  this.piper.stdout.on("data", (data) => {
    ser.io.to(this.socketId).emit("buffer", data);
  });
  this.piper.stderr.on("error", (err) => {
    console.error("Piper stderr:", err);
  });
};

//###########################################WEB SEARCH###########################################
ser.websearch = async function (query) {
  const search = new WebSearch(config.websearch);
  return await search.search(query);
};

//###########################################MESSAGE QUEUE###########################################
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

  if (isLlamaCpp) {
    // Send to llama.cpp child process
    this.llamachild.stdin.cork();
    this.llamachild.stdin.write(`${input}\n`);
    this.llamachild.stdin.uncork();
  } else if (isOllama) {
    // Send to Ollama
    this.runOllama(input, socketId);
  } else {
    this.io.to(socketId).emit("output", `No backend selected. Set config.provider to one of: ${Object.keys(config.providers).join(", ")}`);
    this.messageQueue.splice(0, 1);
    this.isProcessing = false;
  }
};

ser.handleTimeout = function () {
  console.log("Response timeout");
  this.isProcessing = false;
  if (isLlamaCpp) {
    ser.llamachild.kill("SIGINT");
  }
};

//###########################################TOKEN UTILS###########################################
ser.tokenCount = function (text) {
  const tokens = text.match(/\b\w+\b/) || [];
  const filtered = tokens.filter((token) => /\S/.test(token));
  return [filtered, filtered.length];
};

ser.TokenLimit = function (objects, maxTokens, tokenCounter) {
  let embed = "";
  let totalTokens = 0;
  let cutobj = [];

  for (let obj of objects) {
    let objStr = JSON.stringify(obj);
    let [tokens, tokenLen] = tokenCounter(objStr);

    if (totalTokens + tokenLen > maxTokens) {
      const remaining = maxTokens - totalTokens;
      objStr = tokens.slice(0, remaining).join(" ");
      totalTokens += remaining;
      embed += objStr;
      break;
    }
    totalTokens += tokenLen;
    embed += objStr;
    cutobj.push(obj);
  }

  return [embed, cutobj];
};

//###########################################SOCKET CONNECTIONS###########################################
ser.handleSocketConnection = async function (socket) {
  if (!socket.request.session) {
    console.log("Not Logged In!");
    socket.disconnect(true);
    return;
  }

  socket.on("message", async (data) => {
    const input = data.message;
    const socketId = data.socketid;
    const embedobj = [];

    // Embeddings from document DB
    if (data.embedding?.db) {
      embedobj.push(...(await vdb.init(input)));
    }

    // Web search
    if (config.embedding.WebSearch && data.embedding?.web && input.length < 500) {
      try {
        const searchRes = await ser.websearch(input);
        embedobj.push(...searchRes);
      } catch (e) {
        console.error("Web search failed:", e.message);
      }
    }

    // Build prompt with embeddings
    let embedText = "";
    if (embedobj.length > 0) {
      [embedText] = ser.TokenLimit(embedobj, config.maxTokens, ser.tokenCount);
      this.io.to(socketId).emit("output", embedobj);
    }

    const processedInput = config.prompt(
      socketId,
      input,
      embedText,
      data.firstchat || false
    );

    this.connectedClients.set(socketId, processedInput);
    this.messageQueue.push({ socketId, input: processedInput, embed: embedobj, piper: data.piper });
    this.streamTimeout = setTimeout(() => this.handleTimeout(), config.timeout);

    if (!this.isProcessing) {
      this.processMessageQueue();
    }
  });

  socket.on(
    "tosound",
    async (data) => {
      if (data.mode === "start") {
        this.socketId = data.socketid;
        this.piper_client_enabled = data.piper;
        this.runPiper(data.message + "\n");
      }
      if (data.mode === "stop") {
        this.socketId = data.socketid;
        if (this.piper) {
          this.piper.kill("SIGINT");
          this.piperChild();
        }
      }
    }
  );

  socket.on("error", (err) => {
    console.error("Socket error:", err);
  });

  socket.on("disconnect", () => {
    this.connectedClients.delete(socket.id);
  });
};

//###########################################START & HELPERS###########################################
ser.start = function () {
  this.server.listen(config.PORT.server, config.IP.server, () => {
    console.log(
      `Server running on http://${config.IP.server}:${config.PORT.server}`
    );
  });
};

ser.open = function () {
  const url = `http://${config.IP.client}:${config.PORT.client}`;
  const startCmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  exec(`${startCmd} ${url}`);
};

ser.loggedIn = function (req, res, next) {
  if (!config.login) {
    req.session.loggedin = true;
  }
  if (req.session.loggedin) return next();
  res.redirect("/login");
};

//###########################################ENTRY POINT###########################################
async function run() {
  if (isLlamaCpp) {
    await ser.modelinit();
  }
  ser.init();
}

run();

process.on("SIGINT", () => {
  console.log("Received SIGINT. Cleaning up...");
  if (ser.llamachild) ser.llamachild.kill("SIGINT");
  if (ser.piper) ser.piper.kill("SIGINT");
  process.exit(0);
});

export default ser;
