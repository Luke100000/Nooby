function createLogger(config) {
    return {
        log: function () {
            if (config.logging) console.log.apply(console, arguments)
        },

        verbose: function () {
            if (config.verbose) console.info.apply(console, arguments)
        },
    }
}

module.exports = {
    createLogger,
}
