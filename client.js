const readline = require('readline');
const io = require('socket.io-client');
const config = require('./config.js');

// Connect to the server via socket.io
function cui(){};
cui.init = function(){
  this.socket = io(`http://${config.IP}:${config.PORT}`);
  this.accumulatedResponse ='';
  this.socketid = "";
  this.rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  this.socket.on('output', (response) => {
    this.accumulatedResponse += response.replace(">", "") + ' ';
    console.clear(); // Clear the console
    console.log("bot:"+this.accumulatedResponse); // Print the accumulated response
    cui.startUserInput();
  });

  this.socket.on('disconnect', () => {
    console.log('Connection closed');
    process.exit(0);
  });

  this.socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
  });
  this.socket.on("connect", () => {
    this.socketid = this.socket.id; // Get socket.id after connection is established
    // console.log(socketid);
  });

  // Start reading user input
  cui.startUserInput();
};

// Function to start reading user input from the console
cui.startUserInput = function() {
  //this.accumulatedResponse ='';
  this.rl.question('User:', (input) => {
  this.socket.emit('message', { message: input, socketid: this.socketid, embedding:false}); // Send user input to the server via socket   
  });
}
cui.init();