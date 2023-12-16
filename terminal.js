const axios = require("axios");
const io = require("socket.io-client");
const config = require("./config.js");
const readline = require("readline");
const path = require('path');
const util = require('util');
const hashUtils = require('./hash.js');
// const parser = require('./parser.js');
const chalk = require('chalk');


// Connect to the server via socket.io
function Cui() {}

Cui.init = function () {
  this.HASH_FILE_PATH = path.join(process.env.HOME || process.env.USERPROFILE, 'credentials.json');
  this.rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  this.loginInit();
};

Cui.authenticate = async function (username, password) {
  try {
    const response = await axios.post(
      `http://${config.IP.server}:${config.PORT.server}/login`,
      { username, password },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );

    const { success, sessionID } = response.data;

    if (success) {
      return sessionID;
    } else {
      throw new Error("Authentication failed. Please check your credentials.");
    }
  } catch (error) {
    console.error("Error during login:", error.message);
    throw error;
  }
};

Cui.connectAndInteract = function (sessionID) {
  this.socket = io(`http://${config.IP.server}:${config.PORT.server}`, {
    query: { sessionID },
  });

  this.accumulatedResponse = "";
  this.socketid = "";

  this.socket.on("output", (response) => {
    this.accumulatedResponse += response.replace(">", "") + " ";
    console.clear();
    console.log(chalk.blue("AI:") + chalk.green(this.accumulatedResponse));
    Cui.startUserInput();
  });


  this.socket.on("disconnect", () => {
    console.log("Connection closed");
    process.exit(0);
  });

  this.socket.on("connect_error", (error) => {
    console.error("Connection error:", error);
  });

  this.socket.on("connect", () => {
    Cui.socketid = this.socket.id;
  });

  Cui.startUserInput();
};

Cui.parseInput = function(input){
  const {links, paths} = parser.LinkPahtDetector(input); 
  console.log(links, paths);
  return input;
}

Cui.startUserInput = function () {
  this.rl.question(chalk.blue("U: "), async (input) => {
    // input = await Cui.parseInput(input);
    this.socket.emit("message", {
      message: input,
      socketid: Cui.socketid,            /// enable me 
      embedding: false,
    });
  });
};



Cui.loginInit = async function () {
    // Check if username and password are provided as command-line arguments
    const [,, username, password] = process.argv;
      // If not provided, check if saved credentials exist
      try {
        const savedCredentials = await hashUtils.readCredentialsFromFile();
        if (savedCredentials) {
          console.log('Using saved credentials...');
          const sessionID = await Cui.authenticate(savedCredentials.username, savedCredentials.password);
          Cui.connectAndInteract(sessionID);
        } else {
          // If saved credentials don't exist, prompt the user for input
          const questionAsync = util.promisify(this.rl.question).bind(this.rl);
  
          try {
            const inputUsername = username || (await questionAsync("Enter your username: "));
            const inputPassword = password || (await questionAsync("Enter your password: "));
            await hashUtils.saveCredentialsToFile(inputUsername, inputPassword);
            const sessionID = await Cui.authenticate(inputUsername, inputPassword);
            Cui.connectAndInteract(sessionID);
          } catch (error) {
            console.error("Authentication or Socket.IO connection failed:", error.message);
          }
        }
      } catch (error) {
        console.error("Error checking saved credentials:", error.message);
      }
   
    
  };

Cui.init();