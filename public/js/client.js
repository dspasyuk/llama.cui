function cui() {};

cui.init = function (iphostname, port) {
  cui.md = window.markdownit({
    breaks: true,   
    highlight: (str, lang) => {
      console.log(lang, hljs.getLanguage(lang));
      if (lang && hljs.getLanguage(lang)) {
        
        try {
          return `<pre class="hljs"><code>${hljs.highlight(lang, str, true).value}</code></pre>`;
        } catch (__) {}
      }
      return `<pre class="hljs"><code>${cui.md.utils.escapeHtml(str)}</code></pre>`;
    }
  });

  cui.messageInput = document.getElementById("messageInput");
  this.synth = window.speechSynthesis;
  cui.sendMessageButton = document.getElementById("sendMessage");
  cui.iphostname = iphostname;
  cui.port = port;
  cui.messageId = "";
  cui.isClicked=false;
  cui.socketInit();
  cui.listGenerate();
  cui.currentChat = cui.getcurrentChat();
  cui.returnWatcher();
  cui.sendMessageButton.addEventListener("click", () => {cui.sendMessage()});
};

cui.listGenerate = function(){
  let allData = cui.getAlldata();
  if (Object.keys(allData).length !== 0){
    var chatList = Object.keys(allData).map((chat) => {
      let theid = Object.keys(allData[chat])[0];
      return { id: chat, text: allData[chat][theid]["user"].toString().substring(0, 25).replace('"', ''), href: "" };
    });
    let list = "";
    for (let i = 0; i < chatList.length; i++) {
      const item = chatList[i];
      list += `<li class="dark"  > <div style="width:100%" class="list-group-item-container"><div id=${item.id} style="width:75%" onclick="cui.loadMessage(this.id)" class="list-group-item">${item.text}</div><button id="${item.id}_del" onclick="cui.deleteButtons(this.id)" class="noborder">  <img class="trashicon" src="img/trash.svg#trash" alt="*"></button></div></li>`;
    }
    document.getElementById("savedChats").innerHTML = list; 
  }
}

cui.deleteButtons = function(theid){
    if (cui.isClicked) {
      clearTimeout(timer);
      cui.isClicked = false;
      document.getElementById(theid.replace("_del", "")).remove();
      document.getElementById(theid).remove();
      cui.removeMessageTree(theid.replace("_del", ""));
    } else {
      cui.isClicked = true;
      document.getElementById(theid).classList.add("remove");
      timer = setTimeout(() => {
        cui.isClicked = false;
        document.getElementById(theid).classList.remove("remove");
      }, 2000);
    }
}


cui.loadMessage = function(chat){
  let messages = Object.values(cui.getMessageTree(chat));
  console.log("adsdas", chat);
  cui.currentChat= chat;
  const chatMessages = document.getElementById("chatMessages");
  chatMessages.innerHTML ="";
  for(let m=0; m<messages.length; m++){
    cui.createUserTile(messages[m].user);
    cui.createBotTile(messages[m].bot);
  }
  
}

cui.onNewChart = function(){
  cui.currentTile = null;
  cui.messageId = "";
  cui.currentChat = cui.getcurrentChat();
  const chatMessages = document.getElementById("chatMessages");
  chatMessages.innerHTML ="";
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
      console.log(message, cui.messageId);
      message.bot = cui.md.render(text.replace("\n\n", "\n"));
      cui.setMessage(message);
      // cui.speakIt(text.replace("\n>", ""));
      text = "";
      cui.hideStop();

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

cui.speakIt =  function(text){
  let utterThis = new SpeechSynthesisUtterance();
  utterThis.text = text;
  this.synth.speak(utterThis);
}

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
    cui.createUserTile(input); // Create a new user tile for the question
    cui.messageId = cui.get_random_id();
    cui.setMessage({id: cui.messageId, user:input, bot:""})
    cui.createBotTile("");
    cui.listGenerate();
    cui.showStop();
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

cui.showStop = function (){
  const stop = document.getElementById("stop");
  stop.style.display = "block";
}

cui.hideStop = function (){
  const stop = document.getElementById("stop");
  stop.style.display = "none";
}

cui.stopGenerating = function (){
  fetch('/stopper', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: 'stop' })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Server response:', data);
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

cui.getcurrentChat = function(){
  var tN = Object.keys(cui.getAlldata()).length;
  return `C${tN}` || [];
}

cui.getAlldata = function() {
  return JSON.parse(localStorage.getItem("llcui")) || {};
}

// Function to set a new message
cui.setMessage = function(message) {
  const messages = cui.getAlldata();
  if (messages[cui.currentChat]!==undefined){
    messages[cui.currentChat][cui.messageId] = message;
  }else{
    messages[cui.currentChat] ={};
    messages[cui.currentChat][cui.messageId] = message;
  }
  localStorage.setItem("llcui", JSON.stringify(messages));
}

// Function to delete a message by its ID
cui.deleteChats = function(chat) {
  localStorage.setItem("llcui", JSON.stringify({}))
}

cui.getMessageTree = function(id) {
  let messages = cui.getAlldata();
  return messages[id] || {};
}

cui.removeMessageTree = function(id) {
  let messages = cui.getAlldata();
  delete messages[id];
  localStorage.setItem("llcui", JSON.stringify(messages));
}


cui.getMessageById = function(id) {
  const chats = cui.getAlldata();
  console.log(chats);
  const message = chats[cui.currentChat][id];
  return message || {};
}