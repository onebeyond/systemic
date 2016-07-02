module.exports = function() {

    function start(cb) {
        cb(null, {})
    }

    function stop(cb) {
        cb()
    }

    return {
        start: start,
        stop: stop
    }
}