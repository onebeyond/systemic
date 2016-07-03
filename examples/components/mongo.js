module.exports = function(options) {

    function start(dependencies, cb) {
        dependencies.logger.info('Connecting to', dependencies.config.url)
        cb(null, {})
    }

    return {
        start: start
    }
}