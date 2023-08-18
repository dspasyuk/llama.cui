function cui() {}

cui.socketInit = function () {
  console.log(`${cui.iphostname}:${cui.port}`);
  this.socket = io(`${cui.iphostname}:${cui.port}`);
  const chatMessages = document.getElementById("chatMessages");

  cui.currentTile = null; // Reference to the current tile element
  this.socket.on("output", (response) => {
    if (response.includes(">")) {
      cui.currentTile.textContent +=
        " " + response.replace("\n", " ").replace(">", "");
    } else {
      if (!cui.currentTile || cui.currentTile.classList.contains("user-tile")) {
        cui.createBotTile(response.replace("\n", " "));
      } else {
        cui.currentTile.textContent += " " + response.replace("\n", " ");
      }
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  this.socket.on("connect", () => {
    socketid = this.socket.id; // Get socket.id after connection is established
    console.log(socketid);
  });

  this.socket.on("disconnect", () => {
    console.log("Connection closed");
    alert("Connection closed");
  });

  this.socket.on("connect_error", (error) => {
    console.error("Connection error:", error);
  });
};

cui.createBotTile = function (content) {
  this.createTile(content, "bot-tile"); //prettyprint
};

cui.createUserTile = function (content) {
  this.createTile(content, "user-tile");
};

cui.createTile = function (content, tileClass) {
  const tileElement = document.createElement("div");
  tileElement.className = tileClass;
  tileElement.textContent = content;
  chatMessages.appendChild(tileElement);
  cui.currentTile = tileElement;
};

cui.askQuestion = function (question) {
  this.createUserTile(question);
};

cui.sendMessage = function () {
  const input = messageInput.value.trim(); // Get the message content
  if (input !== "") {
    cui.socket.emit("message", { message: input + "\\", socketid: socketid });
    cui.askQuestion(input); // Create a new user tile for the question
    cui.createBotTile("");
    messageInput.value = "";
  }
};

cui.returnWatcher = function () {
  document.addEventListener("DOMContentLoaded", function () {
    const messageInput = document.getElementById("messageInput");
    messageInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault(); // Prevent the default Enter key behavior (newline)
        cui.sendMessage(); // Call the function to send the message
        // PR.prettyPrint();
      }
    });
  });
};

cui.init = function (iphostname, port) {
  cui.messageInput = document.getElementById("messageInput");
  cui.sendMessageButton = document.getElementById("sendMessage");
  cui.iphostname = iphostname;
  cui.port = port;
  cui.socketInit();
  cui.returnWatcher();
  cui.sendMessageButton.addEventListener("click", () => {
    cui.sendMessage();
  });
};
