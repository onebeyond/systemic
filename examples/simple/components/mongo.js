module.exports = function(options) {

    function start({ logger, config }, cb) {
        logger.info('Connecting to', config.url)
        cb(null, {})
    }

    return {
        start: start
    }
}
