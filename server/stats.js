const fs = require('fs');

let json;

if (!fs.existsSync("./stats/")) {
    fs.mkdirSync("./stats/");
}

function getLogPath() {
    const date = (new Date()).toISOString().slice(0, 10).replace(/-/g, "");
    return "./stats/" + date + ".json";
}

function reset() {
    json = JSON.parse('{"msgOut":0, "msgIn":0, "dataOut":0, "dataIn":0, "users":0}');
}

function load() {
    const path = getLogPath();
    if (fs.existsSync(path)) {
        //file exists
        // noinspection JSCheckFunctionSignatures
        json = JSON.parse(fs.readFileSync(path));
    } else {
        reset();
    }
    console.log("[stats] JSON file (" + path + ") has been loaded.");
}

function save() {
    const path = getLogPath();
    const content = JSON.stringify(json);
    fs.writeFileSync(path, content);
    console.log("[stats] JSON file (" + path + ") has been saved.");
}

function add(typ, number) {
    json[typ] = json[typ] + number;
}

function getJson() {
    return json
}

module.exports = {
    load,
    save,
    reset,
    add,
    getJson
}

function msToTime(ms) {
    const pad = (n) => ('0' + n).slice(-2);
    return pad(ms / 3.6e6 | 0) + ':' + pad((ms % 3.6e6) / 6e4 | 0) + ':' + pad((ms % 6e4) / 1000 | 0) + '.' + pad(ms % 1000, 3);
}

const stats_daySave = function () {                           //save stats every day @23:59:59
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    let now = new Date();
    let msToMidnight = midnight - now - 1000;               //one second before midnight
    if (msToMidnight < 0)
        msToMidnight = msToMidnight + 24 * 3600 * 1000;
    setTimeout(stats_daySave, msToMidnight);                //reset timer
    console.log("[stats] set DaySave Timeout to " + msToMidnight + " (" + msToTime(msToMidnight) + ")");

    if (msToMidnight <= 1000) {
        console.log("[stats] save at Midnight");
        save();
        reset();
    }
};

const stats_halfHourSave = function (ms) {
    const now = new Date();
    const nextRun = ms - now % ms;
    setTimeout(stats_halfHourSave, nextRun, ms);
    console.log("[stats] set save Timeout to " + nextRun + "(" + msToTime(nextRun) + ")");
    save();
};

// start timers after a second
setTimeout(stats_halfHourSave, 1000, 30 * 60 * 1000);
setTimeout(stats_daySave, 1000);