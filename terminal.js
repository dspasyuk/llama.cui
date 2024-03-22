//Copyright Denis Spasyuk
//License MIT
const axios = require("axios");
const io = require("socket.io-client");
const config = require("./config.js");
const readline = require("readline");
const path = require('path');
const util = require('util');
const hashUtils = require('./hash.js');
const parser = require('./parser.js');
const {rgbit} = require('./rgbit.js');
// const { spawn } = require('child_process');

// Connect to the server via socket.io
function Cui() {}

Cui.init = function () {
  this.HASH_FILE_PATH = path.join(process.env.HOME || process.env.USERPROFILE, 'credentials.json');
  this.response ="";
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

Cui.sendMessage = async function (message) {
  this.socket.emit("message", {
    message: message,
    socketid: Cui.socketid,            /// enable me 
    embedding: false,
  })
} 

Cui.parseMessage = async function(message){
  try {
   var result = await parser.runEval(message);
   if (result) {
    console.log("result 63", result)
    result =  "Result of the code you gave me is this: " + result + "Describe it.";
    Cui.sendMessage(result);
  }
  } catch (error) {
    console.error("Error parsing message:", error.message);
  }
}

Cui.processMessage = function (response){
  if (response.includes("\n>")) {
      this.response += " "+response.replace("\n>", "");
      console.log(rgbit("AI:", "red") + rgbit(this.response, "green"));
      // Cui.parseMessage(this.response); AGI test
      //this.response = "";
      Cui.startUserInput();
  } else {
      this.response += " " + response;
      console.log(rgbit("AI:", "red") + rgbit(this.response, "green"));
  }
}

Cui.connectAndInteract = function (sessionID) {
  this.socket = io(`http://${config.IP.server}:${config.PORT.server}`, {
    query: { sessionID },
  });

  this.socketid = "";

  this.socket.on("output", (response) => {
    // this.accumulatedResponse += response.replace(">", "") + " ";
    console.clear();
    if(response){
       Cui.processMessage(response);
    }
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
  console.log("paths", links, paths);
  return input;
}

Cui.startUserInput = function () {
  this.rl.question(rgbit("U: ", "blue"), async (input) => {
    input = await Cui.parseInput(input) + "<|im_start|>system \n If asked for code create code only in nodejs. Wrap the code in ```javascript  ``` So write all code in one block do not use eval function <|im_end|>";
    this.response =+ input;
    Cui.sendMessage(input);
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


  // async function exampleUsage() {
  //   try {
  //     const result = await parser.codeeval("function getCurrentDateTime(format) {const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`} console.log(`The current date and time is ${getCurrentDateTime('YYYY-MM-DD HH:mm:ss')}.`);");
  //     console.log("result", result); // Output: Hello, World!
  //   } catch (error) {
  //     console.error(error);
  //   }
  // }
  
  // exampleUsage()

  Cui.init();