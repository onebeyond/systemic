module.exports = function(options) {

    function start({ config }, cb) {
        console.log('Logging at level', config.level)
        cb(null, console)
    }

    return {
        start: start
    }
}
