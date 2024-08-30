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
cui.openTab = function(button, tabName) {
  const tabContainer = button.closest('.tab');
  const codeblock = tabContainer.nextElementSibling.nextElementSibling;
  const renderHTML = tabContainer.nextElementSibling;
  const tabButtons = tabContainer.querySelectorAll('.tablinks');
  for (let i = 0; i < tabButtons.length; i++) {
    tabButtons[i].classList.remove('active');
  }
  button.classList.add("active");

  if (tabName === 'codeblock') {
    codeblock.classList.remove('hide');
    renderHTML.classList.add('hide');
  } else if (tabName === 'previewblock') {
    cui.toggleEscapeHtml(renderHTML, codeblock);
    codeblock.classList.add('hide');
    renderHTML.classList.remove('hide');
    
  }
}

cui.mcopyplugin =function(md) {
  const defaultFence = md.renderer.rules.fence || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const originalResult = defaultFence(tokens, idx, options, env, self);

    // Inject the copy button into the existing container
    return `
    <br>
      <div class="tab">
        <button class="tablinks active" onclick="cui.openTab(this, 'codeblock')">code</button>
        <button class="tablinks" onclick="cui.openTab(this, 'previewblock')">preview</button>
      </div>
      <div class="code-block-wrapper renderHTML hide" style="position: relative;"></div>
      <div class="code-block-wrapper codeblock" style="position: relative;">
        ${originalResult}
        <button class="btn headerbutton" onclick="cui.copyCode(this)" title="Copy code" style="position: absolute; top: 5px; right: 5px; margin-right:2%"><i class="fas fa-copy"></i></button>
      </div>
    `;
  };
};

// Method to toggle HTML escaping
cui.toggleEscapeHtml = function(scrollableElement, codeBlock) {
  const code = codeBlock.textContent;
  scrollableElement.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.style.width = '100%';
  // iframe.style.height = codeBlock.offsetHeight!=0 ? codeBlock.offsetHeight+"px" : "100%";
  scrollableElement.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  iframeDoc.open();
  const isHTML = /<[^>]+>/.test(code);
  if (isHTML) {
    iframeDoc.write(code);
  } else {
    iframeDoc.write(`<script>${code}</script>`);
  }

  iframeDoc.close();
  iframe.onload = function() {
    iframe.style.height = iframe.contentWindow.document.documentElement.scrollHeight + 'px';
  };
  scrollableElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};





cui.init = function (iphostname, port, piper, testQs) {
  // Default to escaping HTML
  cui.escapeHtml = true;

  cui.md = window.markdownit({
    breaks: true,
    linkify: true,
    typographer: false,
    highlight: (str, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre class="hljs"><code>${
            hljs.highlightAuto(str).value
          }</code></pre>`;
        } catch (__) {}
      }
      // Use the escapeHtml property to decide whether to escape HTML or not
      return `<pre class="hljs"><code>${
        cui.md.utils.escapeHtml(str)}</code></pre>`;
    },
  });


  cui.md.use(cui.mcopyplugin);
  cui.md.use(cui.disableHeaderPlugin);
  cui.bufferText = "";
  this.player = cui.PCMplayer();
  cui.terminationTocken = "\n\n>";
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
     document.getElementById("piper-container").style.display = "flex";
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
  this.userMessages = [];
  cui.rollMessages ();
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
          .replace('"', "")+"...",
        href: "",
      };
    });
    let list = "";
    for (let i = chatList.length - 1; i >= 0; i--) {
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
    if(messages[m].embedding!=undefined){
      cui.createBotTile(messages[m].bot, messages[m].embedding);
    }else{
      cui.createBotTile(messages[m].bot);
    }
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

cui.socketInit = function () {
  // console.log(`${cui.iphostname}:${cui.port}`);
  this.socket = io(`${cui.iphostname}:${cui.port}`, {
    query: { sessionID },
  });
  var userScrolledManually = false;
  const chatMessages = document.getElementById("chatMessages");
  chatMessages.addEventListener("scroll", (event) => {
    const isUserScrolledManually = event.target.scrollTop !== event.target.scrollHeight - event.target.clientHeight;
    //console.log(isUserScrolledManually, event.target.scrollTop, event.target.scrollHeight-event.target.clientHeight);
    userScrolledManually = isUserScrolledManually;
  });

  
  cui.currentTile = null; // Reference to the current tile element
  this.socket.on("output", (response) => {

    if(typeof response === 'object' && response !== null) {
       embedding = response;
       cui.createBotTile("", embedding);
       message = cui.getMessageById(cui.messageId);
       message.embedding = embedding;
       cui.setMessage(message);
       chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    else{
    if (response.includes(cui.terminationTocken)) {
      cui.currentTile.textContent += " " + response.replace(cui.terminationTocken, "");
      cui.bufferText += " " + response;
      cui.currentTile.innerHTML = cui.md.render(cui.bufferText);
      message = cui.getMessageById(cui.messageId);
      message.bot = cui.md.render(cui.bufferText);
      // console.log("message", message);
      cui.setMessage(message);
      cui.createSVG(cui.currentTile);
      cui.currentTile = null;
      userScrolledManually = false;
      cui.hideStop();
    } else {
      if (!cui.currentTile || cui.currentTile.classList.contains("user-tile")) {
        cui.bufferText = response;
        // console.log("lalalallal ");
        cui.createBotTile(cui.bufferText);
       
      } else {
        cui.currentTile.textContent += " " + response;
        cui.bufferText += " " + response;
        cui.currentTile.innerHTML = cui.md.render(cui.bufferText);
        
      }
    }
    if (!userScrolledManually) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
     }
    }
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
    // console.log(cui.socketid);
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

cui.createBotTile = function (content, embed) {
  this.createTile(content, "bot-tile", embed); //prettyprint
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
  if (extractedSvg) {
    svgme.convertSvgToHtml(ell,extractedSvg);
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


cui.SearchResultCard = function(result) {
    // Create the card div
    const card = document.createElement("div");
    card.className = "card websearch mb-3";
  
    // Create the card header with title and href
    const cardHeader = document.createElement("div");
    cardHeader.className = "card-header";
  
    const cardTitle = document.createElement("h8");
    cardTitle.className = "card-title d-inline";
    cardTitle.innerText = result.title.slice(0, 80)+'...';
  
    const cardLink = document.createElement("a");
    cardLink.className = "fas fa-globe float-right";
    cardLink.href = result.href;
    cardLink.target = "_blank";
    cardLink.style.color = "#ccc";
    cardLink.title = `Go to ${result.href}`;
 
  
    cardHeader.appendChild(cardTitle);
    cardHeader.appendChild(cardLink);
  
    card.appendChild(cardHeader);
    return card;
}


cui.toggleExpansion = function(cards) {
    if (cards.style.height === '45px') {
      cards.style.height = 'auto';
      cards.style.overflow = 'visible';
    } else {
      cards.style.height = '45px';
      cards.style.overflow = 'hidden';
    }
    }

cui.createTile = function (content, tileClass, embed=[]) {
  document.getElementsByClassName("chat-container")[0].style.backgroundImage =
    "none";
  const tileElement = document.createElement("div");
  const tileheader = document.createElement("div");
  const headerText = document.createElement("p");
  tileheader.className = "tileheader";
  tileElement.className = tileClass;
  // Set the header text based on the tileClass
  headerText.innerHTML = tileClass === "user-tile" ? `<i class="fas fa-user userstyle"></i>` : `<i class="fa fa-robot robotstyle"></i>`;
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
      const parent = vocalize.parentElement.parentElement;
      const tilebody = parent.querySelector(".tilebody");
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

  if (tileClass === "bot-tile" && embed.length > 0) {
    // console.log("embed", embed);
    const embedEl = document.createElement("div");
    embedEl.className ="embedding";
    embedEl.style.height ="45px";
    embedEl.ondblclick = function () {
      cui.toggleExpansion(this);
    };
   for (let i = 0; i < embed.length; i++) {
      if(embed[i]!=undefined && embed[i]!=null && embed[i]!={} && embed[i].title!=undefined) {
        const embedCard = cui.SearchResultCard(embed[i]);
        embedEl.appendChild(embedCard);
      }
    }
    tileElement.appendChild(embedEl);
    console.log("embedd");
  } 

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


cui.checkisFirst = function () {
  const bottiles = document.getElementsByClassName("bot-tile");
  if (bottiles.length === 0) {
    return true;
  } else {
    return false;
  }
};

cui.sendMessage = function () {
  const input = cui.messageInput.value.trim(); // Get the message content
  const embedcheck = document.getElementById("embed");
  cui.currentTile = null;
  if (input !== "") {
    this.userMessages.push(input);
    cui.socket.emit("message", {
      message: input,
      socketid: cui.socketid,
      embedding: embedcheck.checked,
      piper: cui.checkPiperEnabled(),
      firstchat:cui.checkisFirst()
    });
    cui.createUserTile(cui.md.render(input));// Create a new user tile for the question
    cui.messageId = cui.get_random_id();
    cui.setMessage({ id: cui.messageId, user: input, bot: "" });
    // console.log("empty");
    // cui.createBotTile("");
    cui.bufferText ="";
    cui.listGenerate();
    cui.showStop();
    cui.messageInput.value = "";
    chatMessages.scrollTop = chatMessages.scrollHeight;
    autoResize(document.getElementById("messageInput"));
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
      if(data.message=="stopped"){
        cui.hideStop();
      }else{
        console.log("not stopped");
      }
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


cui.updateMessageField = function (index, userMessages) {
  const messageField = document.getElementById("messageInput");
  
  if (index >= 0 && index < userMessages.length) {
    messageField.value = userMessages[index];
  } else if (index === userMessages.length) {
    messageField.value = ''; // Clear the field if beyond the last message
  }
};

cui.handleKeydown = function (event) {
  const messageField = document.getElementById("messageInput");
  let currentIndex = parseInt(messageField.getAttribute('data-current-index')) || this.userMessages.length;

  if (event.key === "ArrowDown") {
    // Show the previous message
    if (currentIndex > 0) {
      currentIndex--;
      cui.updateMessageField(currentIndex, this.userMessages);
      autoResize(messageField);
    }
    event.preventDefault(); // Prevent cursor from moving in text field
  } else if (event.key === "ArrowUp") {
    // Show the next message
    if (currentIndex < this.userMessages.length) {
      currentIndex++;
      cui.updateMessageField(currentIndex, this.userMessages);
      autoResize(messageField);
    }
    event.preventDefault(); // Prevent cursor from moving in text field
  }

  // Store the updated index
  messageField.setAttribute('data-current-index', currentIndex);
};

cui.rollMessages = function () {
  const messageField = document.getElementById("messageInput");
  let allData = cui.getAlldata();
  this.userMessages = Array.from(new Set((Object.values(allData).map((o)=>Object.values(o).map((o2)=>o2.user))).flat()));
  messageField.addEventListener("keydown", function (event) {
    cui.handleKeydown(event);
  });
};

