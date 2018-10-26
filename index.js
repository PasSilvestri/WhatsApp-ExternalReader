var path = require("path");
var fs = require("fs");
var loadDataFromJsonFile = require("./FileHandler").loadDataFromJsonFile;
var saveDataToJsonFile = require("./FileHandler").saveDataToJsonFile;
var Parser = require("./Parser");
const {app, BrowserWindow} = require('electron');

var data = {};
var fileInfo = null;
var parsingDone = false;
var renderingDone = true;
var parser = null;
var messageList = null;
var renderedIndex = 0;
var renderingTimeoutID = null;

var personalUsername = null;

var list;
var personalUsernameInput;
var parseBtn;
var pathInput;
var saveBtn;
var loadBtn;
var mergeBtn;

function onLoad() {
    data = loadDataFromJsonFile(path.join(__dirname,"data.json")) || {lastChat: "Nessuna"};
    personalUsername = data.personalUsername;
    let lastChat = document.getElementById("lastChat");
    lastChat.innerHTML = "Ultima chat letta: " + (data.lastChat ? data.lastChat : "Nessuna");
    list = document.getElementById("messageList");

    pathInput = document.getElementById("chatFilePath");
    pathInput.onchange = function(){
        if(pathInput.files.length > 0){
            let file = pathInput.files[0];
            let tempFileInfo = path.parse(file.path);
            if(tempFileInfo.ext == ".txt"){
                parseBtn.click();
            }
            else if(tempFileInfo.ext == ".json"){
                loadBtn.click();
            }
            
        }
    }

    personalUsernameInput = document.getElementById("personalUsername");
    personalUsernameInput.value = personalUsername ? personalUsername : "";
    personalUsernameInput.onchange = function(){
        personalUsername = this.value;
        data.personalUsername = personalUsername;
        setTimeout(function(){saveDataToJsonFile(data,path.join(__dirname,"data.json"))},0);
    }.bind(personalUsernameInput);

    parseBtn = document.getElementById("parseBtn");
    parseBtn.addEventListener("click",function(){
        if(pathInput.files.length == 0){
            alert("Seleziona un file prima di analizzare");
            return;
        }
        let file = pathInput.files[0];
        let tempFileInfo = path.parse(file.path);
        fileInfo = {
            path: file.path,
            folder: tempFileInfo.dir,
            name: tempFileInfo.name,
            type: file.type
        }
        //If is not a valid chat file
        if(fileInfo.type != "text/plain"){
            alert("Seleziona un file valido");
            return;
        }
        data.lastChat = fileInfo.name;
        saveDataToJsonFile(data,path.join(__dirname,"data.json"));
        lastChat.innerHTML = "Ultima chat letta: " + (data.lastChat ? data.lastChat : "Nessuna"); 

        renderedIndex = 0;
        messageList = parse(fileInfo.path);
    });

    loadBtn = document.getElementById("loadBtn");
    loadBtn.addEventListener("click",function(){
        if(pathInput.files.length == 0){
            alert("Seleziona un file da caricare");
            return;
        }
        let file = pathInput.files[0];
        let tempFileInfo = path.parse(file.path);
        fileInfo = {
            path: file.path,
            folder: tempFileInfo.dir,
            name: tempFileInfo.name,
            type: tempFileInfo.ext
        }
        //If is not a valid chat file
        if(tempFileInfo.ext != ".json"){
            alert("Seleziona un file valido");
            return;
        }
        data.lastChat = fileInfo.name;
        saveDataToJsonFile(data,path.join(__dirname,"data.json"));
        lastChat.innerHTML = "Ultima chat letta: " + (data.lastChat ? data.lastChat : "Nessuna"); 

        messageList = JSON.parse(fs.readFileSync(fileInfo.path));
        //Clear the list
        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }
        renderedIndex = 200;
        clearTimeout(renderingTimeoutID);
        //Start of loading
        window.start = window.performance.now();
        renderingTimeoutID =  setTimeout(buildChat, 0, 0, renderedIndex, fileInfo.folder, messageList, list, preRenderingCheck);
    });

    saveBtn = document.getElementById("saveBtn");
    saveBtn.addEventListener("click", function () {
        if (messageList && messageList.length > 0 && fileInfo) {
            let text = JSON.stringify(messageList);
            let file = new File([text], fileInfo.name + ".json", { type: fileInfo.type })

            let a = document.createElement("a");
            let url = URL.createObjectURL(file);
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
        else{
            alert("Nessuna chat da salvare");
        }
    });

    mergeBtn = document.getElementById("mergeBtn");
    mergeBtn.addEventListener("click",function(){
        if(messageList.length == 0){
            alert("Carica dei messaggi prima di unire un'altra chat");
            return;
        }
        let fileInput = document.createElement("input");
        fileInput.setAttribute("type","file");
        fileInput.addEventListener("change",function(){
            let file = fileInput.files[0];
            let newMessageList = [];
            if(file.name.endsWith(".json")){
                newMessageList = JSON.parse(fs.readFileSync(file.path));
            }
            else if(file.name.endsWith(".txt")){
                let p = new Parser(file.path);
                newMessageList = p.messageList;
            }
            else{
                alert(`Formato file non riconosciuto.\nDeve essere o un json generato da questo programma o un txt generato da whatsapp`);
            }
            fileInfo.type = ".json";

            //Checking for duplicates and merging the 2 files
            let messageListHashSet = {};
            for(let i=0; i<messageList.length; i++){
                let message = messageList[i];
                if(!(message.date instanceof Date)){
                    message.date = new Date(message.date);
                }
                let hash = message.date.getTime() + (message.message.codePointAt(0) || 1) + (message.message.codePointAt(1) || 2) + (message.message.codePointAt(2) || 3);
                if(!messageListHashSet[hash]) messageListHashSet[hash] = [message];
                else messageListHashSet[hash].push(message);
            }

            //Cleaning newMessageList from all the duplicates
            for(let i=0; i<newMessageList.length; i++){
                let message = newMessageList[i];
                if(!(message.date instanceof Date)){
                    message.date = new Date(message.date);
                }
                let hash = message.date.getTime() + (message.message.codePointAt(0) || 1) + (message.message.codePointAt(1) || 2) + (message.message.codePointAt(2) || 3);
                if(messageListHashSet[hash]){
                    for(let c in messageListHashSet[hash]){
                        let m2 = messageListHashSet[hash][c];
                        if(message.sender == m2.sender && message.message == m2.message && message.date.getTime() == m2.date.getTime()){
                            newMessageList.splice(i,1);
                            break;
                        }
                    }
                }
            }

            //Sorting the new array with all the messages
            var comparingFunction = function(e1,e2){
                if(e1.date.getTime() <= e2.date.getTime()){
                    return true;
                }
                return false;
            }
            messageList = MergeSort(messageList.concat(newMessageList),comparingFunction);

            //Saving list to file
            saveBtn.click();
            
            //Rendering the new messageList
            //Clear the list
            while (list.firstChild) {
                list.removeChild(list.firstChild);
            }
            renderedIndex = 200;
            clearTimeout(renderingTimeoutID);
            //Start of loading
            window.start = window.performance.now();
            renderingTimeoutID =  setTimeout(buildChat, 0, 0, renderedIndex, fileInfo.folder, messageList, list, preRenderingCheck);
        });
        fileInput.click();
    });

    window.onscroll = preRenderingCheck;

}

function preRenderingCheck(){
    if(messageList && renderedIndex < messageList.length){
        let toBottom = document.body.offsetHeight - (document.body.scrollTop + document.body.clientHeight);
        let messageBubbleHeight = document.querySelector("#messageList *:first-child").getBoundingClientRect().height;
        let safetyHeight = messageBubbleHeight*30;

        if(toBottom < safetyHeight && renderingDone == true){
            //Start of loading
            window.start = window.performance.now();
            buildChat(renderedIndex, renderedIndex+200, fileInfo.folder, messageList, list, preRenderingCheck);
            renderedIndex += 200;
            console.log("Rendering to Index: " + renderedIndex);
        }
    }
}

function parse(filePath){
    parsingDone = false;
    let folderPath = path.dirname(filePath);
    parser = new Parser(filePath,function(p){
        parsingDone = true;
        //Clear the list
        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }       
        renderedIndex = 200;
        clearTimeout(renderingTimeoutID);
        //Start of loading
        window.start = window.performance.now();
        renderingTimeoutID =  setTimeout(buildChat, 0, 0, renderedIndex, folderPath, p.messageList, list, preRenderingCheck);
    });
    return parser.messageList;
}

function buildChat(i,maxIndex,folderPath,messageList,listElement,callback){
    renderingDone = false;
    let message = messageList[i];
    if(message){
        if(!(message.date instanceof Date)){
            message.date = new Date(message.date);
        }

        let div = document.createElement("div");
        div.classList.add("messageBuble");
        (message.sender == personalUsername) ? div.classList.add("personal") : undefined;

        let senderH4 = document.createElement("h4");
        let r = Math.floor(((message.sender.codePointAt(0) || 2) * 10) % 255);
        let g = Math.floor(((message.sender.codePointAt(1) || 5) * 10) % 255);
        let b = Math.floor(((message.sender.codePointAt(2) || 8) * 10) % 255);
        senderH4.style.color = `rgb(${r},${g},${b})`;
        senderH4.innerText = message.sender;

        let messageP = document.createElement("p");
        messageP.innerText = message.message;

        let timeP = document.createElement("p");
        timeP.classList.add("time");
        timeP.innerText = message.date.toLocaleString();

        if(!message.media){
            div.appendChild(senderH4);
            div.appendChild(messageP);
            div.appendChild(timeP);
            listElement.appendChild(div);
        }
        else if(message.media == 1){
            div.appendChild(senderH4);

            let img = document.createElement("img");
            img.src = `file:///${path.join(folderPath,message.mediaName)}`;
            img.height = 100;
            img.onclick = showPic;

            div.appendChild(img);

            div.appendChild(messageP);
            div.appendChild(timeP);
            listElement.appendChild(div);
        }
        else if(message.media == 2){
            div.appendChild(senderH4);

            let audio = document.createElement("audio");
            audio.setAttribute("controls","controls");
            audio.setAttribute("type","audio/ogg");
            audio.src = `file:///${path.join(folderPath,message.mediaName)}`;

            div.appendChild(audio);


            div.appendChild(messageP);
            div.appendChild(timeP);
            listElement.appendChild(div);
        }
    }

    i++;
    if(i<messageList.length && (i<maxIndex || maxIndex == -1)){
        clearTimeout(renderingTimeoutID);
        renderingTimeoutID = setTimeout(buildChat,0, i,maxIndex,folderPath,messageList,listElement,callback);
    }
    else{
        console.log("Rendered up until index: " + i);
        renderingDone = true;
        console.log("Time to load: " + (window.performance.now()-window.start));
        if(typeof callback == "function") callback();
    }
}

function showPic(event){
    window.open(event.target.src);
}

function reverseMessageList() {
    messageList = messageList.reverse();

    //Clear the list
    while (list.firstChild) {
        list.removeChild(list.firstChild);
    }
    renderedIndex = 200;
    clearTimeout(renderingTimeoutID);
    //Start of loading
    window.start = window.performance.now();
    renderingTimeoutID = setTimeout(buildChat, 0, 0, renderedIndex, fileInfo.folder, messageList, list, preRenderingCheck);
}