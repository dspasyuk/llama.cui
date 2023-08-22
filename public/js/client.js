function cui() {};

cui.init = function (iphostname, port) {
  cui.md = window.markdownit({
    highlight: (str, lang) => {
      // console.log(lang, hljs.getLanguage(lang));
      if (lang && hljs.getLanguage(lang)) {
        
        try {
          return `<pre class="hljs"><code>${hljs.highlight(lang, str, true).value}</code></pre>`;
        } catch (__) {}
      }
      return `<pre class="hljs"><code>${cui.md.utils.escapeHtml(str)}</code></pre>`;
    }
  });

  cui.messageInput = document.getElementById("messageInput");
  cui.sendMessageButton = document.getElementById("sendMessage");
  cui.iphostname = iphostname;
  cui.port = port;
  cui.messageId = "";
  cui.socketInit();
  cui.listGenerate();
  cui.currentChat = cui.getcurrentChat();
  cui.returnWatcher();
  cui.sendMessageButton.addEventListener("click", () => {cui.sendMessage()});
};

cui.listGenerate = function(){
  let allData = cui.getAlldata();
  if (allData.length>0){
    var chatList = Object.keys(allData).map((cid) => {
      return { id: cid, text: JSON.parse(allData[cid])[0].user.toString().substring(1, 25).replace('"', ''), href: "" };
    });
    let list = "";
    for (let i = 0; i < chatList.length; i++) {
      const item = chatList[i];
      list += `<li class="dark" onclick="cui.loadMessage(this.id)" id=${item.id}><div class="list-group-item">${item.text}</div></li>`;
    }
    document.getElementById("savedChats").innerHTML = list; 
  }


}

cui.loadMessage = function(theid){
  let messages = cui.getMessageTree(theid);
  console.log(theid, messages);
  cui.currentTile = theid;
  const chatMessages = document.getElementById("chatMessages");
  chatMessages.innerHTML ="";
  for(let m=0; m<messages.length; m++){
    cui.createUserTile(messages[m].user);
    cui.createBotTile(cui.md.render(messages[m].bot));
  }
  
}

cui.socketInit = function () {
  console.log(`${cui.iphostname}:${cui.port}`);
  this.socket = io(`${cui.iphostname}:${cui.port}`);
  
  var text = "";
  cui.currentTile = null; // Reference to the current tile element
  this.socket.on("output", (response) => {
    if (response.includes("\n>")) {
      cui.currentTile.textContent +=" "+response.replace("\n>", "");
      text += " "+response
      cui.currentTile.innerHTML =  cui.md.render(text);
      message = cui.getMessageById(cui.messageId);
      message.bot = JSON.stringify(text);
      cui.setMessage(message, cui.messageId);
      text = "";

    } else {
      if (!cui.currentTile || cui.currentTile.classList.contains("user-tile")) {
        cui.createBotTile(response);
      } else {
        cui.currentTile.textContent += " " + response;
        text += " "+response;
        cui.currentTile.innerHTML =  cui.md.render(text);
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
  tileElement.innerHTML = content;
  chatMessages.appendChild(tileElement);
  cui.currentTile = tileElement;
};

cui.askQuestion = function (question) {
  this.createUserTile(question);
};

cui.get_random_id = function () {
     return (
      "id" +
      [...Array(15)].map(() => (~~(Math.random() * 36)).toString(36)).join("")
    );
  };

cui.deleteMessages = function(){
  localStorage.clear();
  document.getElementById("savedChats").innerHTML="";
}

cui.sendMessage = function () {
  const input = messageInput.value.trim(); // Get the message content
  if (input !== "") {
    cui.socket.emit("message", { message: input + "\\", socketid: socketid });
    cui.askQuestion(input); // Create a new user tile for the question
    cui.messageId = cui.get_random_id();
    cui.setMessage({id: cui.messageId, user:JSON.stringify(input), bot:""})
    cui.createBotTile("");
    messageInput.value = "";
  }
};

// Function to watch for enter press
cui.returnWatcher = function () {
  document.addEventListener("DOMContentLoaded", function () {
    const messageInput = document.getElementById("messageInput");
    messageInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault(); // Prevent the default Enter key behavior (newline)
        cui.sendMessage(); // Call the function to send the message
      }
    });
  });
};

cui.getcurrentChat = function(){
  var tN = Object.keys(cui.getAlldata()).length;
  return `C${tN}` || [];
}

cui.getAlldata = function() {
  return { ...localStorage } || {};
}

cui.getMessages = function() {
  return JSON.parse(localStorage.getItem('messages')) || [];
}

// Function to set a new message
cui.setMessage = function(message, id) {
  const messages = JSON.parse(localStorage.getItem(cui.currentChat)) || [];
  messages.push(message);
  localStorage.setItem(cui.currentChat, JSON.stringify(messages));
}

// Function to delete a message by its ID
cui.deleteChats = function(chat) {
  let chats = cui.getAlldata;
  delete chats[chat]
}

cui.getMessageTree = function(id) {
  const messages = JSON.parse(localStorage.getItem(id)) || [];
  return messages || {};
}

cui.getMessageById = function(id) {
  const messages = JSON.parse(localStorage.getItem(cui.currentChat)) || [];
  const message = messages.find(message => message.id === id);
  return message || {};
}
