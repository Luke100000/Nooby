var json;
const fs = require('fs');

if (!fs.existsSync(mainPath+"stats/")){
    fs.mkdirSync(mainPath+"stats/");
}

function path(){
    var date = new Date();
    var path = mainPath+"stats/";
    path = path + date.getFullYear()+("0" + (date.getMonth() + 1)).slice(-2)+("0" + date.getDate()).slice(-2);
    path = path + ".json";
    return path;
}

function startNew(){
    json = JSON.parse('{"msgOut":0, "msgIn":0, "dataOut":0, "dataIn":0, "channels":0, "users":0}');
}

function load(){
    var p = path();
    if (fs.existsSync(p)) {
        //file exists
        let rawdata = fs.readFileSync(p);
        json = JSON.parse(rawdata);
    }else{
        startNew();
    }
    console.log("[stats] JSON file("+p+") has been loaded.");
}

function save(){
    var p = path();
    var content = JSON.stringify(json);
    fs.writeFileSync(p, content);
    console.log("[stats] JSON file("+p+") has been saved.");
}

function add(typ, number){
    json[typ] = json[typ] + number;
}

module.exports = {
    load,
    save,
    startNew,
    add
}

function msToTime(duration) {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}

var stats_daySave = function(){        //save stats every day @23:59:59
    var midnight = new Date(); midnight.setHours(24,0,0,0); 
    let now = new Date();
    let msToMidnight = midnight - now - 1000;    //one second before midnight
    if(msToMidnight < 0)
        msToMidnight = msToMidnight + midnight
    setTimeout(stats_daySave, msToMidnight);    //reset timer
    console.log("[stats] set DaySave Timeout to "+msToMidnight+"("+msToTime(msToMidnight)+")");
    
    if(msToMidnight <= 1000){
        console.log("[stats] save at Midnight");
        save();
        startNew();
    }
}
var stats_halfHourSave = function(ms){
    var now = new Date();
    var nextRun = ms - now%ms;
    setTimeout(stats_halfHourSave, nextRun, ms);    //reset timer
    console.log("[stats] set save Timeout to "+nextRun+"("+msToTime(nextRun)+")");
    
    save();
}

setTimeout(stats_halfHourSave, 1000, 30*60*1000);    //start first run after 1 second
setTimeout(stats_daySave, 1000);                    //start first run after 1 second