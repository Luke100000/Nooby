const fs = require("fs")
const path = require("path")

class StatsService {
    constructor(statsDirectory) {
        this.statsDirectory = statsDirectory
        this.json = null

        if (!fs.existsSync(this.statsDirectory)) {
            fs.mkdirSync(this.statsDirectory)
        }

        setTimeout(() => this.halfHourSave(30 * 60 * 1000), 1000)
        setTimeout(() => this.daySave(), 1000)
    }

    getLogPath() {
        const date = (new Date()).toISOString().slice(0, 10).replace(/-/g, "")
        return path.join(this.statsDirectory, date + ".json")
    }

    reset() {
        this.json = {
            outgoingMessages: 0,
            incomingMessages: 0,
            outgoingBytes: 0,
            incomingBytes: 0,
            newConnections: 0,
        }
    }

    load() {
        const logPath = this.getLogPath()
        if (fs.existsSync(logPath)) {
            this.json = JSON.parse(fs.readFileSync(logPath))
        } else {
            this.reset()
        }
        console.log("[stats] JSON file (" + logPath + ") has been loaded.")
    }

    save() {
        const logPath = this.getLogPath()
        const content = JSON.stringify(this.json)
        fs.writeFileSync(logPath, content)
        console.log("[stats] JSON file (" + logPath + ") has been saved.")
    }

    add(type, number) {
        this.json[type] = this.json[type] + number
    }

    getJson() {
        return this.json
    }

    msToTime(ms) {
        const pad = (n, length) => ("0" + n).slice(-(length || 2))
        return pad(ms / 3.6e6 | 0) + ":" + pad((ms % 3.6e6) / 6e4 | 0) + ":" + pad((ms % 6e4) / 1000 | 0) + "." + pad(ms % 1000, 3)
    }

    daySave() {
        const midnight = new Date()
        midnight.setHours(24, 0, 0, 0)
        const now = new Date()
        let msToMidnight = midnight - now - 1000
        if (msToMidnight < 0) {
            msToMidnight = msToMidnight + 24 * 3600 * 1000
        }
        setTimeout(() => this.daySave(), msToMidnight)
        console.log("[stats] set DaySave Timeout to " + msToMidnight + " (" + this.msToTime(msToMidnight) + ")")

        if (msToMidnight <= 1000) {
            console.log("[stats] save at Midnight")
            this.save()
            this.reset()
        }
    }

    halfHourSave(ms) {
        const now = new Date()
        const nextRun = ms - now % ms
        setTimeout(() => this.halfHourSave(ms), nextRun)
        console.log("[stats] set save Timeout to " + nextRun + "(" + this.msToTime(nextRun) + ")")
        this.save()
    }
}

module.exports = StatsService
