var async = require('async')
var debug = require('debug')('node-boot:index')
var format = require('util').format
var Toposort = require('toposort-class')
var get = require('lodash.get')
var set = require('lodash.set')
var has = require('lodash.has')
var map = require('lodash.map')
var find = require('lodash.find')
var toArray = require('lodash.toarray')
var defaults = require('lodash.defaults')
var intersection = require('lodash.intersection')

module.exports = function() {

    var definitions = {}
    var current
    var running = false

    function configure(component) {
        return add('config', component, { scoped: true })
    }

    function add(name, component, options) {
        debug('Adding %s', name)
        if (definitions.hasOwnProperty(name)) throw new Error(format('Duplicate component: %s', name))
        if (!component) throw new Error(format('Component %s is null or undefined', name))
        if (!component.start) throw new Error(format('Component %s is missing a start function', name))
        definitions[name] = Object.assign({}, options, { component: component, dependencies: [] })
        current = name
        return api
    }

    function dependsOn() {
        if (!current) throw new Error('You must add a component before calling dependsOn')
        definitions[current].dependencies = toArray(arguments).reduce(toDependencyDefinitions, definitions[current].dependencies)
        return api
    }

    function toDependencyDefinitions(accumulator, arg) {
        var record = typeof arg === 'string' ? { component: arg, destination: arg } : defaults({}, arg, { destination: arg.component })
        if (!record.component) throw new Error(format('Component %s has an invalid dependency %s', current, JSON.stringify(arg)))
        if (find(definitions[current].dependencies, { destination: record.destination })) throw new Error(format('Component %s has a duplicate dependency %s', current, record.destination))
        return accumulator.concat(record)
    }

    function start(cb) {
        debug('Starting system')
        async.seq(sortComponents, ensureComponents, function(components, cb) {
            debug('System started')
            running = components
            cb(null, components)
        })(cb)
        return api
    }

    function ensureComponents(components, cb) {
        if (running) return cb(null, running)
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
        definitions[name].component.start(dependencies, function(err, started) {
            if (err) return cb(err)
            set(system, name, started)
            debug('Component %s started', name)
            cb(null, system)
        })
    }

    function stop(cb) {
        debug('Stopping system')
        async.seq(sortComponents, stopComponents, function(cb) {
            debug('System stopped')
            running = false
            cb()
        })(cb || noop)
        return api
    }

    function stopComponents(components, cb) {
        async.each(components, stopComponent, cb)
    }

    function stopComponent(name, cb) {
        debug('Stopping component %s', name)
        var stop = definitions[name].component.stop || noop
        stop(function(err, started) {
            if (err) return cb(err)
            debug('Component %s stopped', name)
            cb(null)
        })
    }

    function sortComponents(cb) {
        var result = []
        try {
            var graph = new Toposort()
            Object.keys(definitions).forEach(function(name) {
                graph.add(name, map(definitions[name].dependencies, 'component'))
            })
            result = intersection(graph.sort(), Object.keys(definitions))
        } catch (err) {
            return cb(err)
        }
        return cb(null, result)
    }

    function getDependencies(name, system, cb) {
        async.reduce(definitions[name].dependencies, {}, function(accumulator, dependency, cb) {
            if (!has(system, dependency.component)) return cb(new Error(format('Component %s has an unsatisfied dependency on %s', name, dependency.component)))
            if (!dependency.hasOwnProperty('source') && definitions[dependency.component].scoped) dependency.source = name
            dependency.source ? debug('Injecting dependency %s.%s as %s into %s', dependency.component, dependency.source, dependency.destination, name)
                              : debug('Injecting dependency %s as %s into %s', dependency.component, dependency.destination, name)
            var component = get(system, dependency.component)
            set(accumulator, dependency.destination, dependency.source ? get(component, dependency.source) : component)
            cb(null, accumulator)
        }, cb)
    }

    function noop() {
        var args = toArray(arguments)
        var cb = args.pop()
        cb && cb.apply(null, [null].concat(args))
    }

    function restart(cb) {
        async.seq(api.stop, api.start)(cb)
        return api
    }

    var api = {
        configure: configure,
        add: add,
        dependsOn: dependsOn,
        start: start,
        stop: stop,
        restart: restart
    }

    return api
}