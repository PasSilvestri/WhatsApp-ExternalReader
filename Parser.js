const ReadLine = require('readline');
const fs = require('fs');

class Parser{

    constructor(filePath,endCallback){
        this.filePath = filePath;
        this.messageList = [];
        this.userList = [];
        var buffer = fs.readFileSync(filePath);
        var text = buffer.toString().split(`\n`);
        text.forEach(function(line){
            let day = Number(line[0]+line[1]);
            let month = Number(line[3]+line[4]);
            let year = Number(line[6]+line[7]);
            let hour = Number(line[10]+line[11]);
            let minutes = Number(line[13]+line[14]);
            let date = new Date(2000+year,month-1,day,hour,minutes);
            //If the date is not valid, it means that this line is the following line of the previous message
            if(date.toString() == "Invalid Date"){
                this.messageList[this.messageList.length-1].message += `\n${line}`;
                this.messageList[this.messageList.length-1].message = this.messageList[this.messageList.length-1].message.trim();
                return;
            }
            let lineLeft = line.substring(18);
            let sender = lineLeft.substring(0,lineLeft.indexOf(":"));
            //Add all the encountered users to a list
            if(this.userList.indexOf(sender) == -1){
                this.userList.push(sender);
            }
            let message = lineLeft.substring(lineLeft.indexOf(":")+2);
            message = message.trim();
            
            this.messageList.push(new Message(sender,message,date));
        }.bind(this));
          
        if(typeof endCallback == "function") endCallback(this);
    }
}

class Message{

    constructor(sender, message, date){
        this.sender = sender;
        this.message = message;
        if(message.startsWith("IMG") && message.endsWith("(file allegato)")){
            this.media = 1;
            this.mediaName = message.substring(0,message.indexOf(" "));
            this.message = "";
        }
        else if(message.startsWith("PTT") && message.endsWith("(file allegato)")){
            this.media = 2;
            this.mediaName = message.substring(0,message.indexOf(" "));
            this.message = "";
        }
        else{
            this.media = false;
        }
        this.date = date;
    }
}

module.exports = Parser;