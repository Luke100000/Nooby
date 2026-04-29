const http = require("http")

function metricLine(name, help, type, value) {
    return [
        "# HELP " + name + " " + help,
        "# TYPE " + name + " " + type,
        name + " " + value,
    ].join("\n")
}

function statsMetrics(stats) {
    const json = stats.getJson()
    const lines = []

    lines.push(metricLine("nooby_stats_incoming_messages", "Incoming Nooby messages in the current stats period.", "gauge", json.incomingMessages))
    lines.push(metricLine("nooby_stats_outgoing_messages", "Outgoing Nooby messages in the current stats period.", "gauge", json.outgoingMessages))
    lines.push(metricLine("nooby_stats_incoming_bytes", "Incoming Nooby bytes in the current stats period.", "gauge", json.incomingBytes))
    lines.push(metricLine("nooby_stats_outgoing_bytes", "Outgoing Nooby bytes in the current stats period.", "gauge", json.outgoingBytes))
    lines.push(metricLine("nooby_stats_new_connections", "Accepted Nooby client connections in the current stats period.", "gauge", json.newConnections))

    return lines.join("\n")
}

function renderMetrics(context, startedAt) {
    return [
        metricLine("nooby_connected_clients", "Currently connected Nooby clients.", "gauge", context.clients.count()),
        metricLine("nooby_channels", "Currently active Nooby channels.", "gauge", context.channels.count()),
        metricLine("nooby_uptime_seconds", "Nooby server uptime in seconds.", "gauge", Math.floor((Date.now() - startedAt) / 1000)),
        statsMetrics(context.stats),
        "",
    ].join("\n")
}

function dashboardValue(label, value) {
    return "<div class=\"metric\"><span>" + label + "</span><strong>" + value + "</strong></div>"
}

function formatNumber(value) {
    return value.toLocaleString("en-US")
}

function formatBytes(value) {
    const units = ["B", "KB", "MB", "GB", "TB"]
    let size = value
    let unit = 0

    while (size >= 1024 && unit < units.length - 1) {
        size = size / 1024
        unit++
    }

    if (unit === 0) {
        return formatNumber(size) + " " + units[unit]
    }

    return size.toFixed(size >= 10 ? 1 : 2) + " " + units[unit]
}

function formatDuration(seconds) {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    const parts = []

    if (days) parts.push(days + "d")
    if (hours || parts.length) parts.push(hours + "h")
    if (minutes || parts.length) parts.push(minutes + "m")
    parts.push(remainingSeconds + "s")

    return parts.join(" ")
}

function renderDashboard(context, startedAt) {
    const stats = context.stats.getJson()
    const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000)

    return "<!doctype html>" +
        "<html><head><title>Nooby Metrics</title>" +
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
        "<style>" +
        "body{margin:0;font-family:Arial,sans-serif;background:#f5f5f5;color:#222}" +
        "main{max-width:920px;margin:0 auto;padding:32px 20px}" +
        "h1{font-size:28px;margin:0 0 24px}" +
        ".grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}" +
        ".metric{background:white;border:1px solid #ddd;border-radius:6px;padding:16px}" +
        ".metric span{display:block;color:#555;font-size:14px;margin-bottom:8px}" +
        ".metric strong{display:block;font-size:30px;line-height:1}" +
        "a{color:#005fcc}" +
        "</style></head><body><main>" +
        "<h1>Nooby Metrics</h1>" +
        "<div class=\"grid\">" +
        dashboardValue("Connected clients", formatNumber(context.clients.count())) +
        dashboardValue("Current channels", formatNumber(context.channels.count())) +
        dashboardValue("Uptime", formatDuration(uptimeSeconds)) +
        dashboardValue("Incoming messages", formatNumber(stats.incomingMessages)) +
        dashboardValue("Outgoing messages", formatNumber(stats.outgoingMessages)) +
        dashboardValue("Incoming bytes", formatBytes(stats.incomingBytes)) +
        dashboardValue("Outgoing bytes", formatBytes(stats.outgoingBytes)) +
        dashboardValue("New connections", formatNumber(stats.newConnections)) +
        "</div><p><a href=\"/metrics\">Prometheus metrics</a></p>" +
        "</main></body></html>"
}

class MonitoringService {
    constructor(context, port) {
        this.context = context
        this.port = port
        this.startedAt = Date.now()
        this.server = null
    }

    start() {
        if (!this.port) return

        this.server = http.createServer((request, response) => {
            if (request.url === "/metrics") {
                response.writeHead(200, {"Content-Type": "text/plain; version=0.0.4; charset=utf-8"})
                response.end(renderMetrics(this.context, this.startedAt))
                return
            }

            if (request.url === "/" || request.url === "/dashboard") {
                response.writeHead(200, {"Content-Type": "text/html; charset=utf-8"})
                response.end(renderDashboard(this.context, this.startedAt))
                return
            }

            response.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"})
            response.end("not found\n")
        })

        this.server.on("listening", () => {
            console.log("[Metrics] Nooby metrics running on " + this.server.address().address + ":" + this.server.address().port)
        })

        this.server.listen(this.port, "::")
    }

    shutdown() {
        if (this.server) {
            this.server.close()
        }
    }
}

module.exports = {
    MonitoringService,
    renderMetrics,
    renderDashboard,
    formatNumber,
    formatBytes,
    formatDuration,
}
