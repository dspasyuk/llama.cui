function cui() {}
cui.copyCode = async function (button) {
  const codeBlock = button.previousElementSibling.querySelector('code');
  const code = codeBlock.textContent;
  await navigator.clipboard.writeText(code);
};


cui.disableHeaderPlugin = function(md) {
  md.renderer.rules.heading_open = function (tokens, idx, options, env, self) {
    return '';
  };
  
}


cui.mcopyplugin =function(md) {
const defaultFence = md.renderer.rules.fence || function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const originalResult = defaultFence(tokens, idx, options, env, self);

  // Inject the copy button into the existing container
  return `
    <div class="code-block-wrapper" style="position: relative;">
      ${originalResult}
      <button class="btn headerbutton" onclick="cui.copyCode(this)" style="
        position: absolute;
        top: 5px;
        right: 5px; margin-right:2%"><i class="fas fa-copy"></i></button>
    </div>
  `;
};
};

cui.init = function (iphostname, port, piper, testQs) {
  cui.md = window.markdownit({
    breaks: true,
    linkify: true,
    highlight: (str, lang) => {
      // console.log(lang, hljs.getLanguage(lang));
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre class="hljs"><code>${
            hljs.highlightAuto(str).value
          }</code></pre>`;
        } catch (__) {}
      }
      return `<pre class="hljs"><code>${cui.md.utils.escapeHtml(
        str
      )}</code></pre>`;
    },
  });
  cui.md.use(cui.mcopyplugin);
  cui.md.use(cui.disableHeaderPlugin);
  this.player = cui.PCMplayer()
  cui.isPlaying = cui.player.isPlaying; 
  cui.notStopped =true;
  cui.PlayWatcher(); 
  cui.audioContext = new AudioContext();
  cui.messageInput = document.getElementById("messageInput");
  cui.sendMessageButton = document.getElementById("sendMessage");
  cui.iphostname = iphostname;
  cui.port = port;
  cui.piperate = piper.rate;
  cui.piperenabled = piper.enabled;
  if (cui.piperenabled) {
     document.getElementById("piper-container").style.display = "block";
  }
  cui.testQs = testQs;
  cui.messageId = "";
  cui.isClicked = false;
  cui.collapsible();
  cui.socketid = "";
  cui.socketInit();
  // cui.whisperRun ();
  cui.listGenerate();
  cui.currentChat = cui.getcurrentChat();
  cui.returnWatcher();
  cui.sendMessageButton.addEventListener("click", () => {
    cui.sendMessage();
  });
};

cui.PCMplayer = function(){
  
  const option = {
    encoding: '16bitInt',
    channels: 1,
    sampleRate: piper.rate,
    flushingTime: 500
}
  return player = new PCMPlayer(option);
}

cui.PlayWatcher = function () {
  let previousValue = cui.player.isPlaying;
  setInterval(function () {
    if (cui.player.isPlaying !== previousValue) {
      cui.piperStopToggle();
      previousValue = cui.player.isPlaying;
    }
  }, 500);
}

cui.piperStopToggle = function(){
  console.log("piper stop toggled");
  let buttons = document.getElementsByName("piperToggle");
  for(let i = 0; i < buttons.length; i++){
   if (buttons[i].innerHTML.includes('fa-stop')) {
      buttons[i].innerHTML = '<i class="fas fa-music"></i>'
   }else{
      buttons[i].innerHTML = '<i class="fas fa-stop"></i>'
  }
}

}

cui.checkPiperEnabled = function () {
  const piperworks = document.getElementById("piper");
if (piperworks.checked && cui.piperenabled) {
    return true;
  } else {
    
    return false;
  }
};

cui.collapsible = function () {
  var coll = document.getElementsByClassName("collapsible");
  for (var i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function () {
      this.classList.toggle("active");
      var content = this.nextElementSibling;
      if (content.style.display === "block") {
        content.style.display = "none";
      } else {
        content.style.display = "block";
      }
    });
  }
};
cui.showDeleteButton = function (buttonId) {
  var deleteButton = document.getElementById(buttonId);
  deleteButton.classList.remove("hidden");
};

cui.hideDeleteButton = function (buttonId) {
  var deleteButton = document.getElementById(buttonId);
  deleteButton.classList.add("hidden");
};

cui.listGenerate = function () {
  let allData = cui.getAlldata();
  if (Object.keys(allData).length !== 0) {
    var chatList = Object.keys(allData).map((chat) => {
      let theid = Object.keys(allData[chat])[0];
      return {
        id: chat,
        text: allData[chat][theid]["user"]
          .toString()
          .substring(0, 30)
          .replace('"', ""),
        href: "",
      };
    });
    let list = "";
    for (let i = 0; i < chatList.length; i++) {
      const item = chatList[i];
      item.text = item.text.replace("<br>", "");
      list += `<li class="dark"> <div style="width:100%" onmouseover="cui.showDeleteButton('${item.id}_del')" onmouseout="cui.hideDeleteButton('${item.id}_del')" class="list-group-item-container">
      <div id=${item.id} onclick="cui.loadMessage(this.id)"  class="list-group-item">${item.text}</div>
      <button title="Delete Chat" id="${item.id}_del" onclick="cui.deleteButtons(this.id)"   
      class="btn theme delete-button hidden"> <i class="fas fa-trash"></i></button></div></li>`;
    }
    document.getElementById("savedChats").innerHTML = list;
  }
};

cui.deleteButtons = function (theid) {
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
};

cui.loadMessage = function (chat) {
  let messages = Object.values(cui.getMessageTree(chat));
  // console.log("adsdas", chat);
  cui.currentChat = chat;
  const chatMessages = document.getElementById("chatMessages");
  chatMessages.innerHTML = "";
  for (let m = 0; m < messages.length; m++) {
    cui.createUserTile(cui.md.render(messages[m].user));
    cui.createBotTile(messages[m].bot);
  }
};
//new message
cui.onNewChart = function () {
  cui.currentTile = null;
  cui.messageId = "";
  cui.currentChat = cui.getcurrentChat();
  const chatMessages = document.getElementById("chatMessages");
  chatMessages.innerHTML = "";
};

cui.isstopButtonVisible = function() {
  const button = document.getElementById('stopgenerator');
  if (button) {
    const style = window.getComputedStyle(button);
    return style.display !== 'none' && style.visibility !== 'hidden' && button.offsetParent !== null;
  }
  return false;
}

cui.socketInit = function () {
  console.log(`${cui.iphostname}:${cui.port}`);
  this.socket = io(`${cui.iphostname}:${cui.port}`, {
    query: { sessionID },
  });
  // userScrolledManually = false;
  // const chatMessages = document.getElementById("chatMessages");
  // chatMessages.addEventListener("scroll", (event) => {
  //   const isUserScrolledManually = event.target.scrollTop !== event.target.scrollHeight - event.target.clientHeight;
  //   userScrolledManually = isUserScrolledManually;
  // });

  var text = "";
  cui.currentTile = null; // Reference to the current tile element
  this.socket.on("output", (response) => {
    if (response.includes("\n>")) {
      cui.currentTile.textContent += " " + response.replace("\n>", "");
      text += " " + response;
      cui.currentTile.innerHTML = cui.md.render(text);
      message = cui.getMessageById(cui.messageId);
      message.bot = cui.md.render(text);
      cui.setMessage(message);
      text = "";
      cui.createSVG(cui.currentTile);
      cui.hideStop();
      console.log("RESET");
      cui.currentTile = null;
    } else {
      if (!cui.currentTile || cui.currentTile.classList.contains("user-tile")) {
        cui.createBotTile(response);
      } else {
        cui.currentTile.textContent += " " + response;
        text += " " + response;
        cui.currentTile.innerHTML = cui.md.render(text);
        
      }
      console.log(cui.isstopButtonVisible());
      if (!cui.isstopButtonVisible()) {
        cui.showStop();
      }
    }
    // console.log(userScrolledManually);
    // if (!userScrolledManually) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
      // console.log("scroll");
    // }
   
  });


  this.socket.on("buffer", (hexData) => {
          if(hexData && cui.notStopped){
          cui.player.feed(new Int16Array(hexData));
          cui.isPlaying = cui.player.isPlaying;
          }else{
            cui.isPlaying=false;
          }
       
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
    window.location.href = "/login";
    cui.hideStop();
  });
};


cui.sendTextToSpeech = function (textFromTileBody) {
  if (!cui.player.isPlaying) {
    console.log("play");
    var message = {
      message: textFromTileBody,
      socketid: cui.socketid,
      embedding: false,
      mode: "start",
      piper: cui.checkPiperEnabled()
    };
    cui.notStopped =true;
    this.socket.emit("tosound", message);
  } else {
    var message = {
      message: "",
      socketid: cui.socketid,
      embedding: false,
      mode: "stop",
      piper: cui.checkPiperEnabled()
    };
    this.socket.emit("tosound", message);

    console.log("stop");
    cui.notStopped = false;
    cui.player.stop();
  }
};

cui.createBotTile = function (content) {
  this.createTile(content, "bot-tile"); //prettyprint
};

cui.createUserTile = function (content) {
  this.createTile(content, "user-tile");
};

cui.piperToggle = function(){
   console.log("piper toggled");
   let buttons = document.getElementsByName("piperToggle");

      for(let i = 0; i < buttons.length; i++){
        if (buttons[i].style.display === "none") {
          buttons[i].style.display = "block";
      }else{
        buttons[i].style.display = "none";
      }
    } 
}

cui.createSVG = function (ell) {
  var extractedSvg = svgme.extractSvgFromText(ell.innerText);
  // console.log(contentElement.innerText);
  if (extractedSvg) {
    var htmlSvg = svgme.convertSvgToHtml(ell,extractedSvg);
  }
};

cui.createHTML = function (ell) {
  var html = svgme.extractHTMLFromText(ell.innerText);
  var body = svgme.extractBodyFromText(html);
  const can = document.createElement("canvas");
  can.width = 100;
  can.height = 100;
  can.id = "myCanvas";
  ell.appendChild(can);
  if (body) {
    svgme.embedHTML(ell, body);
  }
};




cui.createTile = function (content, tileClass) {
  document.getElementsByClassName("chat-container")[0].style.backgroundImage =
    "none";
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
  if (tileClass === "user-tile") {
    const reload = document.createElement("button");
    reload.onclick = function () {
      cui.resubmit(this);
    };
    reload.innerHTML = '<i class="fas fa-sync"></i>';
    reload.className = "btn headerbutton";
    tileheader.appendChild(reload);
  }
  const copyButton = document.createElement("button");
  copyButton.onclick = async function () {
    const tilebody = copyButton.parentElement.nextElementSibling;
    // Access the text content of the tilebody
    const textFromTileBody = tilebody.textContent.trim();
    await navigator.clipboard.writeText(textFromTileBody);
  };
  

    const vocalize = document.createElement("button");
    vocalize.name = "piperToggle";
    vocalize.onclick =function () {
      const tilebody = vocalize.parentElement.nextElementSibling;
      const textFromTileBody = tilebody.textContent.trim();
      // vocalize.innerHTML = '<i class="fas fa-stop"></i>';  
      cui.sendTextToSpeech(textFromTileBody);
      // let interval = setInterval(function () {if (!cui.isPlaying) {cui.piperStopToggle(); clearInterval(interval)}}, 500);
    };
    vocalize.innerHTML = '<i class="fas fa-music"></i>';
    vocalize.className = "btn headerbutton";
    tileheader.appendChild(vocalize);
    if(cui.checkPiperEnabled()){
       vocalize.style.display = "block";
    }else{
        vocalize.style.display = "none";
    }

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
  //SVG INSERT
  // cui.createSVG(tileElement);
  if (tileClass === "bot-tile") {
    cui.createSVG(tileElement);
    // cui.createHTML(tileElement);
  }

};

cui.get_random_id = function () {
  return (
    "id" +
    [...Array(5)].map(() => (~~(Math.random() * 36)).toString(36)).join("")
  );
};

cui.deleteMessages = function () {
  if (window.confirm("Do you really want to delete the chats?")) {
    localStorage.clear();
    document.getElementById("savedChats").innerHTML = "";
  }
};

cui.sendMessage = function () {
  const input = cui.messageInput.value.trim(); // Get the message content
  const embedcheck = document.getElementById("embed");
  var first = cui.currentTile ? false : true;
  console.log(first, cui.currentTile);
  if (input !== "") {
    cui.socket.emit("message", {
      message: input,
      socketid: cui.socketid,
      embedding: embedcheck.checked,
      piper: cui.checkPiperEnabled(),
      firstchat:first
    });
    cui.createUserTile(cui.md.render(input));// Create a new user tile for the question
    cui.messageId = cui.get_random_id();
    cui.setMessage({ id: cui.messageId, user: input, bot: "" });
    cui.createBotTile("");
    cui.listGenerate();
    cui.showStop();
    cui.messageInput.value = "";
    chatMessages.scrollTop = chatMessages.scrollHeight;
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

cui.resubmit = function (button) {
  const tilebody = button.parentElement.nextElementSibling;
  // Access the text content of the tilebody
  const textFromTileBody = tilebody.textContent.trim();
  const messageInput = document.getElementById("messageInput");
  messageInput.value = textFromTileBody;
};

cui.defaultTest = function () {
  const messageInput = document.getElementById("messageInput");
  messageInput.value = cui.testQs;
  cui.sendMessage();
};

cui.showStop = function () {
  const stop = document.getElementById("stopgenerator");
  stop.style.display = "block";
};

cui.hideStop = function () {
  const stop = document.getElementById("stopgenerator");
  stop.style.display = "none";
};

cui.stopGenerating = function () {
  console.log("STOPPING");
  fetch("/stopper", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: "stop" }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Server response:", data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
};

cui.getcurrentChat = function () {
  // var tN = Object.keys(cui.getAlldata()).length;
  var tN = cui.get_random_id();
  return `C${tN}` || [];
};

cui.getAlldata = function () {
  return JSON.parse(localStorage.getItem("llcui")) || {};
};

// Function to set a new message
cui.setMessage = function (message) {
  const messages = cui.getAlldata();
  if (messages[cui.currentChat] !== undefined) {
    messages[cui.currentChat][cui.messageId] = message;
  } else {
    messages[cui.currentChat] = {};
    messages[cui.currentChat][cui.messageId] = message;
  }
  localStorage.setItem("llcui", JSON.stringify(messages));
};

// Function to delete a message by its ID
cui.deleteChats = function (chat) {
  localStorage.setItem("llcui", JSON.stringify({}));
};

cui.getMessageTree = function (id) {
  let messages = cui.getAlldata();
  return messages[id] || {};
};

cui.removeMessageTree = function (id) {
  let messages = cui.getAlldata();
  delete messages[id];
  localStorage.setItem("llcui", JSON.stringify(messages));
};

cui.getMessageById = function (id) {
  const chats = cui.getAlldata();
  const message = chats[cui.currentChat][id];
  return message || {};
};
