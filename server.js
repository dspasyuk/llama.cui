//Installation
// git clone https://github.com/ggerganov/llama.cpp.git
// cd llama.cpp
// sed -i 's/export NVCCFLAGS="-arch=native"/export NVCCFLAGS="-arch=all"/' llama.cpp/Makefile
// make clean && LLAMA_CUBLAS=1 make  -j
//Copyright Denis Spasyuk
//License MIT

const express = require('express');
const { spawn } = require('child_process');
const http = require('http');
const socketIO = require('socket.io');
var cors = require('cors');
const path = require('path');
const version = 0.01; 
// const { parseOutput } = require('langchain/output_parser');
const config = require('./config.js');

class ChatServer {
  constructor() {
    this.connectedClients = new Map();
    this.socketId = null;
    
    this.messageQueue = []; // Queue to store messages from clients
    this.isProcessing = false; // Flag to track if a message is being proce
    this.llamachild = spawn(consfig.llamacpp, config.params);
    console.log(config.params.join(" "));
    this.buffer = '';
  
    this.llamachild.stdout.on('data', (msg) => this.handleLlama(msg));
    this.serverIpAddress = config.IP;
    this.serverPort = config.PORT;

    this.app = express();
    this.server = http.createServer(this.app);
    
    this.app.use(cors());
    this.io = socketIO(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
    });


    this.io.on('connection', (socket) => this.handleSocketConnection(socket));
    this.app.use(express.json());
    this.app.set('views', path.join(__dirname, 'views'));
    this.app.set('view engine', 'ejs');
    // Serve static files from the 'public' folder
    this.app.use(express.static(path.join(__dirname, 'public')));
    // Define a route to render the EJS view
    this.app.get('/', (req, res) => {
      res.render('index', {
        title: 'Chat UI',
        version: version,
        hostname:this.serverIpAddress,
        port:this.serverPort
      })
    });
  }

  handleLlama(msg) {
    
    this.buffer += msg.toString('utf-8');
    // 
    let lastSpaceIndex = this.buffer.lastIndexOf(' ');
    if (lastSpaceIndex !== -1) {
      let output = this.buffer.substring(0, lastSpaceIndex);
      this.buffer = this.buffer.substring(lastSpaceIndex + 1);
      // output = parseOutput(output); 
      this.io.to(this.socketId).emit('output', output);
      if(output.includes(">")){
        this.messageQueue.splice(0,1);
        this.isProcessing = false;
        
        this.processMessageQueue();
     }
    }
  }

 async  processMessageQueue() {
    
    if (this.messageQueue.length === 0) {
      this.isProcessing = false;
      return;
    }
    this.isProcessing = true;
    const message = this.messageQueue[0];
  
    const { socketId, input } = message;
    this.socketId = socketId;
    // Send the message to the child process
    this.llamachild.stdin.write(input+"\n");
  }


  handleSocketConnection(socket) {
    socket.on('message', (data) => {
      var input = data.message;
      var socketId = data.socketid;
      this.connectedClients.set(socketId, input);
      // Add the incoming message to the queue
      this.messageQueue.push({ socketId, input });

      // Process messages if the queue is not being processed currently
      if (!this.isProcessing) {
        this.processMessageQueue();
      }
    });

    socket.on('disconnect', () => {
      
      this.connectedClients.delete(socket.id);
    });
  }

  start() {
    this.server.listen(this.serverPort, this.serverIpAddress, () => {
    console.log("Server Running on:", this.serverIpAddress+this.serverPort)
    });
  }
}

const chatServer = new ChatServer();
chatServer.start();


