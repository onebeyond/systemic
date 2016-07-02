var async = require('async')
var debug = require('debug')('node-boot:index')
var format = require('util').format
var Toposort = require('toposort-class')
var get = require('lodash.get')
var set = require('lodash.set')
var has = require('lodash.has')
var intersection = require('lodash.intersection')

module.exports = function() {

    var components = {}
    var dependencies = {}
    var current


    function add(name, component) {
        debug('Adding %s', name)
        if (components.hasOwnProperty(name)) throw new Error(format('Duplicate component: %s', name))
        if (!component) throw new Error(format('Component %s is null or undefined', name))
        if (!component.start) throw new Error(format('Component %s is missing a start function', name))
        components[name] = component
        dependencies[name] = []
        current = name
        return api
    }

    function dependsOn() {
        if (!current) throw new Error('You must add a component before calling dependsOn')
        var names = Array.prototype.slice.call(arguments)
        dependencies[current] = dependencies[current].concat(names)
        return api
    }

    function start(cb) {
        debug('Starting system')
        async.reduce(sortComponents(), {}, function(system, name, cb) {
            debug('Starting component %s', name)
            getDependencies(name, system, function(err, dependencies) {
                if (err) return cb(err)
                components[name].start(dependencies, function(err, started) {
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

    function sortComponents() {
        var graph = new Toposort()
        Object.keys(components).forEach(function(name) {
            graph.add(name, dependencies[name])
        })
        return intersection(graph.sort().reverse(), Object.keys(components))
    }

    function getDependencies(name, system, cb) {
        async.reduce(dependencies[name], {}, function(dependencies, dependencyName, cb) {
            if (!has(system, dependencyName)) return cb(new Error(format('Component %s has an unsatisfied dependency on %s', name, dependencyName)))
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
        stop: stop
    }

    return api
}