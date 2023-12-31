function cui() {};

cui.init = function (iphostname, port, dataChannel, testQs) {
  cui.md = window.markdownit({
    breaks: true,   
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
  this.synth = window.speechSynthesis;
  cui.sendMessageButton = document.getElementById("sendMessage");
  cui.iphostname = iphostname;
  cui.port = port;
  cui.testQs = testQs;
  cui.messageId = "";
  cui.isClicked=false;
  cui.collapsible();
  cui.socketInit();
  // cui.whisperRun ();
  cui.listGenerate();
  cui.currentChat = cui.getcurrentChat();
  cui.returnWatcher();
 
  cui.sendMessageButton.addEventListener("click", () => {cui.sendMessage()});
};

// cui.whisperRun = async function(){
// const transformersModule = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers');
// let transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
// let url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav';
// // let transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
// //     revision: 'output_attentions',
// // });
// let output = await transcriber(url, { return_timestamps: 'word' });
// console.log(output);

// }

cui.collapsible = function(){
  var coll = document.getElementsByClassName("collapsible");
  for (var i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function() {
      this.classList.toggle("active");
      var content = this.nextElementSibling;
      if (content.style.display === "block") {
        content.style.display = "none";
      } else {
        content.style.display = "block";
      }
    });
  }
}
 cui.showDeleteButton = function(buttonId) {
  var deleteButton = document.getElementById(buttonId);
  deleteButton.classList.remove('hidden');
}

 cui.hideDeleteButton = function(buttonId) {
  var deleteButton = document.getElementById(buttonId);
  deleteButton.classList.add('hidden');
}

cui.listGenerate = function(){
  let allData = cui.getAlldata();
  if (Object.keys(allData).length !== 0){
    var chatList = Object.keys(allData).map((chat) => {
      let theid = Object.keys(allData[chat])[0];
      return { id: chat, text: allData[chat][theid]["user"].toString().substring(0, 30).replace('"', ''), href: "" };
    });
    let list = "";
    for (let i = 0; i < chatList.length; i++) {
      const item = chatList[i];
      list += `<li class="dark"> <div style="width:100%" onmouseover="cui.showDeleteButton('${item.id}_del')" onmouseout="cui.hideDeleteButton('${item.id}_del')" class="list-group-item-container">
      <div id=${item.id} onclick="cui.loadMessage(this.id)"  class="list-group-item">${item.text}</div>
      <button title="Delete Chat" id="${item.id}_del" onclick="cui.deleteButtons(this.id)"   
      class="btn theme delete-button hidden"> <i class="fas fa-trash"></i></button></div></li>`;
    }
    document.getElementById("savedChats").innerHTML = list; 
  }
}

cui.deleteButtons = function(theid){
    if (cui.isClicked) {
      clearTimeout(timer);
      cui.isClicked = false;
      var container = document.getElementById(theid).parentNode;
      container.parentNode.removeChild(container);
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
  this.socket = io(`${cui.iphostname}:${cui.port}`, {
    query: { sessionID },
  });

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
      cui.speakIt(text.replace("\n>", ""));
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
    const chatMessages = document.getElementById("chatMessages");
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  this.socket.on("connect", () => {
    cui.socketid = this.socket.id; // Get socket.id after connection is established
    console.log(cui.socketid);
  });

  this.socket.on("disconnect", () => {
    cui.hideStop();
    console.error("Connection closed");
  });

  this.socket.on("connect_error", (error) => {
    console.error("Connection error:", error);
    window.location.href = '/login';
    cui.hideStop();
    
  });
};

cui.speakIt =  function(text){
  let utterThis = new SpeechSynthesisUtterance();
  utterThis.text = text;
  // this.synth.speak(utterThis);
}

cui.createBotTile = function (content) {
  this.createTile(content, "bot-tile"); //prettyprint
};

cui.createUserTile = function (content) {
  this.createTile(content, "user-tile");
};

cui.createTile = function (content, tileClass) {
  document.getElementsByClassName('chat-container')[0].style.backgroundImage = 'none';
  const tileElement = document.createElement("div");
  const tileheader = document.createElement("div");
  const headerText = document.createElement("p");
  tileheader.className = "tileheader";
  tileElement.className = tileClass;
  // Set the header text based on the tileClass
  headerText.textContent = tileClass === "user-tile" ? "User" : "AI";
  headerText.style.margin = "0 auto 0 0"; // Center the text
  // Append the header text and button to the tileheader
  tileheader.appendChild(headerText);
 // Button is appended after the text
 if (tileClass === "user-tile"){
  const reload = document.createElement("button");
  reload.onclick = function() {
    cui.resubmit(this);
  };
  reload.innerHTML = '<i class="fas fa-sync"></i>';
  reload.className = "btn headerbutton";
  tileheader.appendChild(reload); 
} 
  const copyButton = document.createElement("button");
  copyButton.addEventListener('click', function() {
    const tilebody = copyButton.parentElement.nextElementSibling;
    // Access the text content of the tilebody
    const textFromTileBody = tilebody.textContent.trim();
    navigator.clipboard.writeText(textFromTileBody);
});

copyButton.innerHTML = '<i class="fas fa-copy"></i>';
copyButton.className = "btn headerbutton";
  tileheader.appendChild(copyButton); 
  // Append the tileheader to the tileElement
  tileElement.appendChild(tileheader);
  // Create a content element and append it to tileElement
  const contentElement = document.createElement("div");
  contentElement.className = "tilebody";
  contentElement.innerHTML = content;
  tileElement.appendChild(contentElement);
  // Append the tileElement to chatMessages
  chatMessages.appendChild(tileElement);
  cui.currentTile = contentElement;
};


cui.get_random_id = function () {
     return (
      "id" +
      [...Array(5)].map(() => (~~(Math.random() * 36)).toString(36)).join("")
    );
  };

cui.deleteMessages = function(){
  if (window.confirm("Do you really want to delete the chats?")) {
    localStorage.clear();
    document.getElementById("savedChats").innerHTML="";
  }
}


cui.sendMessage = function () {
  const input = cui.messageInput.value.trim(); // Get the message content
  const embedcheck = document.getElementById("embed");
  if (input !== "") {
    cui.socket.emit("message", { message: input, socketid: cui.socketid, embedding:embedcheck.checked });
    cui.createUserTile(input); // Create a new user tile for the question
    cui.messageId = cui.get_random_id();
    cui.setMessage({id: cui.messageId, user:input, bot:""});
    console.log({id: cui.messageId, user:input, bot:""});
    cui.createBotTile("");
    cui.listGenerate();
    cui.showStop();
    cui.messageInput.value = "";
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

cui.resubmit = function(button){
  const tilebody = button.parentElement.nextElementSibling;
  // Access the text content of the tilebody
  const textFromTileBody = tilebody.textContent.trim();
  const messageInput = document.getElementById("messageInput");
  messageInput.value = textFromTileBody;
}

cui.defaultTest = function(){
  const messageInput = document.getElementById("messageInput");
  messageInput.value = cui.testQs;
  cui.sendMessage();
}

cui.showStop = function (){
  const stop = document.getElementById("stopgenerator");
  stop.style.display = "block";
}

cui.hideStop = function (){
  const stop = document.getElementById("stopgenerator");
  stop.style.display = "none";
}

cui.stopGenerating = function (){
  console.log("STOPPING");
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
  // var tN = Object.keys(cui.getAlldata()).length;
  var tN = cui.get_random_id();
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