var async = require('async')
var debug = require('debug')('node-boot:index')
var format = require('util').format
var Toposort = require('toposort-class')
var get = require('lodash.get')
var set = require('lodash.set')
var has = require('lodash.has')
var intersection = require('lodash.intersection')
var map = require('lodash.map')
var toArray = require('lodash.toarray')

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
        dependencies[current] = toArray(arguments).reduce(toDependencyDefinitions, dependencies[current])
        return api
    }

    function toDependencyDefinitions(accumulator, arg) {
        var source = typeof arg === 'string' ? arg : Object.keys(arg)[0]
        var destination = typeof arg === 'string' ? arg : arg[source]
        return accumulator.concat({ source: source, destination: destination })
    }

    function start(cb) {
        debug('Starting system')
        async.seq(sortComponents, startComponents)(cb)
        return api
    }

    function startComponents(components, cb) {
        async.reduce(components.reverse(), {}, toSystem, cb)
    }

    function toSystem(system, name, cb) {
        getDependencies(name, system, function(err, dependencies) {
            if (err) return cb(err)
            startComponent(dependencies, name, system, cb)
        })
    }

    function startComponent(dependencies, name, system, cb) {
        debug('Starting component %s', name)
        components[name].start(dependencies, function(err, started) {
            if (err) return cb(err)
            set(system, name, started)
            cb(null, system)
        })
    }

    function stop(cb) {
        debug('Stopping system')
        async.seq(sortComponents, stopComponents)(cb)
        return api
    }

    function stopComponents(components, cb) {
        async.each(components, stopComponent, cb)
    }

    function stopComponent(name, cb) {
        debug('Stopping component %s', name)
        var stop = components[name].stop || noop
        stop(function(err, started) {
            if (err) return cb(err)
            debug('Component %s stopped successfully', name)
            cb(null)
        })
    }

    function sortComponents(cb) {
        try {
            var graph = new Toposort()
            Object.keys(components).forEach(function(name) {
                graph.add(name, map(dependencies[name], 'source'))
            })
            return cb(null, intersection(graph.sort(), Object.keys(components)))
        } catch (err) {
            return cb(err)
        }
    }

    function getDependencies(name, system, cb) {
        async.reduce(dependencies[name], {}, function(accumulator, dependency, cb) {
            if (!has(system, dependency.source)) return cb(new Error(format('Component %s has an unsatisfied dependency on %s', name, dependency.source)))
            debug('Injecting dependency %s as %s', dependency.source, dependency.destination)
            set(accumulator, dependency.destination, get(system, dependency.source))
            cb(null, accumulator)
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