var async = require('async')
var debug = require('debug')('node-boot:index')
var format = require('util').format
var get = require('lodash.get')
var set = require('lodash.set')
var has = require('lodash.has')

module.exports = function() {

    var context = {}
    var current


    function add(name, component) {
        debug('Adding %s', name)
        if (context.hasOwnProperty(name)) throw new Error(format('Duplicate component: %s', name))
        if (!component) throw new Error(format('Component %s is null or undefined', name))
        if (!component.start) throw new Error(format('Component %s is missing a start function', name))
        current = context[name] = { component: component, dependencies: [] }
        return api
    }

    function dependsOn(name) {
        if (!current) throw new Error('You must add a component before calling dependsOn')
        current.dependencies.push(name)
        return api
    }

    function start(cb) {
        debug('Starting system')
        async.reduce(Object.keys(context), {}, function(system, name, cb) {
            debug('Starting component %s', name)
            getDependencies(name, system, function(err, dependencies) {
                if (err) return cb(err)
                context[name].component.start(dependencies, function(err, started) {
                    if (err) {
                        debug('Component %s failed to start: %s', name, err.message)
                        return cb(err)
                    }
                    debug('Component %s started successfully', name)
                    system[name] = started
                    cb(null, system)
                })
            })

        }, cb)
        return api
    }

    function stop(cb) {
        debug('Stopping system')
        async.each(Object.keys(context), function(name, cb) {
            debug('Stopping component %s', name)
            var stop = context[name].stop || noop
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

    function getDependencies(componentName, system, cb) {
        async.reduce(context[componentName].dependencies, {}, function(dependencies, dependencyName, cb) {
            if (!has(system, dependencyName)) return cb(new Error(format('Component %s has an unsatisfied dependency on %s', componentName, dependencyName)))
            set(dependencies, dependencyName, get(system, dependencyName))
            cb(null, dependencies)
        }, cb)
    }

    function noop(cb) {
        cb()
    }

    var api = {
        add: add,
        dependsOn: dependsOn,
        start: start,
        stop: stop,
    }

    return api
}