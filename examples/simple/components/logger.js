module.exports = function(options) {

    function start(dependencies, cb) {
        console.log('Logging at level', dependencies.config.level)
        cb(null, console)
    }

    return {
        start: start
    }
}