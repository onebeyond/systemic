module.exports = function(options) {

    async function start({ logger, config }) {
        return logger.info('Connecting to', config.url)
    }

    return {
        start: start
    }
}
