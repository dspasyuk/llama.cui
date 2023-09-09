//Installation
// git clone https://github.com/ggerganov/llama.cpp.git
// cd llama.cpp
// sed -i 's/export NVCCFLAGS="-arch=native"/export NVCCFLAGS="-arch=all"/' llama.cpp/Makefile
// make clean && LLAMA_CUBLAS=1 make  -j
//Copyright Denis Spasyuk
//License MIT

const express = require("express");
const { spawn } = require("child_process");
const http = require("http");
const socketIO = require("socket.io");
var cors = require("cors");
const path = require("path");
const vdb = require("./db.js");
const version = 0.08;
// const { parseOutput } = require('langchain/output_parser');
const config = require("./config.js");

function Ser() {}

Ser.init = function (error) {
  this.connectedClients = new Map();
  this.socketId = null;
  this.messageQueue = []; // Queue to store messages from clients
  this.isProcessing = false; // Flag to track if a message is being proce
  this.llamachild = spawn(config.llamacpp, config.params);
  console.log(config.llamacpp + " " + config.params.join(" "));
  this.buffer = "";

  this.llamachild.stdout.on("data", (msg) => this.handleLlama(msg));

  // Listen for the 'exit' event to handle process exit.
  this.llamachild.on("exit", (code, signal) => {
    if (code !== null) {
      console.log(`Child process exited with code ${code}`);
    } else if (signal !== null) {
      console.log(`Child process terminated by signal ${signal}`);
    }
  });
  this.serverIpAddress = config.IP;
  this.serverPort = config.PORT;

  this.app = express();
  this.server = http.createServer(this.app);

  this.app.use(cors());
  this.io = socketIO(this.server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  this.io.on("connection", (socket) => this.handleSocketConnection(socket));
  this.app.use(express.json());
  this.app.set("views", path.join(__dirname, "views"));
  this.app.set("view engine", "ejs");
  // Serve static files from the 'public' folder
  this.app.use(express.static(path.join(__dirname, "public")));
  // Define a route to render the EJS view
  this.app.get("/", (req, res) => {
    res.render("index", {
      title: "Chat UI",
      version: version,
      hostname: this.serverIpAddress,
      port: this.serverPort,
    });
  });

  this.app.post("/stopper", async (request, response) => {
    console.log("STOPPING");
    this.llamachild.kill("SIGINT");
    response.send({ message: "stopped" });
  });
  this.start();
};

Ser.handleLlamaError = function (error) {
  console.error("An error occurred in the llama child process:", error);
  // Handle the error appropriately, e.g., logging, cleanup, etc.
};

Ser.handleLlama = function (msg) {
  this.buffer += msg.toString("utf-8");
  //
  let lastSpaceIndex = this.buffer.lastIndexOf(" ");
  if (lastSpaceIndex !== -1) {
    let output = this.buffer.substring(0, lastSpaceIndex);
    this.buffer = this.buffer.substring(lastSpaceIndex + 1);
    // output = parseOutput(output);
    this.io.to(this.socketId).emit("output", output);
    if (output.includes("\n>")) {
      this.messageQueue.splice(0, 1);
      this.isProcessing = false;

      this.processMessageQueue();
    }
  }
};

Ser.processMessageQueue = async function () {
  if (this.messageQueue.length === 0) {
    this.isProcessing = false;
    return;
  }
  this.isProcessing = true;
  const message = this.messageQueue[0];

  const { socketId, input } = message;
  this.socketId = socketId;
  // Send the message to the child process
  this.llamachild.stdin.write(input + "\n");
};

Ser.handleSocketConnection = async function (socket) {
  socket.on("message", async (data) => {
    var input = data.message;
    if (data.embedding) {
      var embed = await vdb.init(input);
      if (embed){
        input = embed;
      }
    }
    input = input +'\\';
    var socketId = data.socketid;
    this.connectedClients.set(socketId, input);
    // Add the incoming message to the queue

    this.messageQueue.push({ socketId, input });
    // Process messages if the queue is not being processed currently
    if (!this.isProcessing) {
      this.processMessageQueue();
    }
  });

  socket.on("disconnect", () => {
    this.connectedClients.delete(socket.id);
  });
};

Ser.start = function () {
  this.server.listen(this.serverPort, this.serverIpAddress, () => {
    console.log(
      "Server Running on:",
      this.serverIpAddress + ":" + this.serverPort
    );
  });
};

Ser.init();
