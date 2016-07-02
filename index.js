var async = require('async')
var debug = require('debug')('node-boot:index')

module.exports = function() {

    var components = {}

    function start(cb) {
        debug('Starting system')
        async.reduce(Object.keys(components), {}, function(system, name, cb) {
            debug('Starting component %s', name)
            components[name].start({}, function(err, started) {
                if (err) {
                    debug('Component %s failed to start: %s', name, err.message)
                    return cb(err)
                }
                debug('Component %s started successfully', name)
                system[name] = started
                cb(null, system)
            })
        }, cb)
        return api
    }

    function stop(cb) {
        debug('Stopping system')
        async.each(Object.keys(components), function(name, cb) {
            debug('Stopping component %s', name)
            var stop = components[name].stop || noop
            stop(function(err, started) {
                if (err) {
                    debug('Component %s failed to stop: %s', name, err.message)
                    return cb(err)
                }
                debug('Component %s stopped successfully', name)
                cb(null)
            })
        }, cb)
        return api
    }

    function noop(cb) {
        cb()
    }

    function add(name, component) {
        debug('Adding %s', name)
        if (components.hasOwnProperty(name)) throw new Error('Duplicate component: ' + name)
        components[name] = component
        return api
    }

    var api = {
        add: add,
        start: start,
        stop: stop
    }

    return api
}