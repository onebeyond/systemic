var async = require('async')
var debug = require('debug')('systemic:index')
var format = require('util').format
var Toposort = require('toposort-class')
var getProp = require('lodash.get')
var setProp = require('lodash.set')
var hasProp = require('lodash.has')
var map = require('lodash.map')
var find = require('lodash.find')
var toArray = require('lodash.toarray')
var defaults = require('lodash.defaults')
var assign = require('lodash.assign')
var intersection = require('lodash.intersection')

module.exports = function() {

    var definitions = {}
    var currentDefinition
    var running = false
    var started

    function configure(component) {
        return add('config', component, { scoped: true })
    }

    function add(name, component, options) {
        debug('Adding %s', name)
        if (definitions.hasOwnProperty(name)) throw new Error(format('Duplicate component: %s', name))
        return _set(name, component, options)
    }

    function set(name, component, options) {
        debug('Setting %s', name)
        return _set(name, component, options)
    }

    function remove(name) {
        debug('Removing %s', name)
        delete definitions[name]
        return api
    }

    function _set(name, component, options) {
        if (!component) throw new Error(format('Component %s is null or undefined', name))
        definitions[name] = assign({}, options, { name: name, component: component.start ? component : wrap(component), dependencies: [] })
        currentDefinition = definitions[name]
        return api
    }

    function merge(subSystem) {
        debug('Merging sub system definitions')
        definitions = assign({}, definitions, subSystem._definitions)
        return api
    }

    function dependsOn() {
        if (!currentDefinition) throw new Error('You must add a component before calling dependsOn')
        if (currentDefinition.component.start.length === 1) throw new Error(format('Component %s has no dependencies', currentDefinition.name))
        currentDefinition.dependencies = toArray(arguments).reduce(toDependencyDefinitions, currentDefinition.dependencies)
        return api
    }

    function toDependencyDefinitions(accumulator, arg) {
        var record = typeof arg === 'string' ? { component: arg, destination: arg } : defaults({}, arg, { destination: arg.component })
        if (!record.component) throw new Error(format('Component %s has an invalid dependency %s', currentDefinition.name, JSON.stringify(arg)))
        if (find(currentDefinition.dependencies, { destination: record.destination })) throw new Error(format('Component %s has a duplicate dependency %s', currentDefinition.name, record.destination))
        return accumulator.concat(record)
    }

    function start(cb) {
        debug('Starting system')
        started = []
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
        started.push(name)
        var component = definitions[name].component
        var onStarted = function(err, started) {
            if (err) return cb(err)
            setProp(system, name, started)
            debug('Component %s started', name)
            setImmediate(function() {
                cb(null, system)
            })
        }
        var args = component.start.length === 1 ? [onStarted] : [dependencies, onStarted]
        component.start.apply(component, args)
    }

    function stop(cb) {
        debug('Stopping system')
        async.seq(sortComponents, removeUnstarted, stopComponents, function(cb) {
            debug('System stopped')
            running = false
            cb()
        })(cb || noop)
        return api
    }

    function stopComponents(components, cb) {
        async.eachSeries(components, stopComponent, cb)
    }

    function stopComponent(name, cb) {
        debug('Stopping component %s', name)
        var stop = definitions[name].component.stop || noop
        stop(function(err, started) {
            if (err) return cb(err)
            debug('Component %s stopped', name)
            setImmediate(cb)
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

    function removeUnstarted(components, cb) {
        cb(null, intersection(components, started))
    }

    function getDependencies(name, system, cb) {
        async.reduce(definitions[name].dependencies, {}, function(accumulator, dependency, cb) {
            if (!hasProp(system, dependency.component)) return cb(new Error(format('Component %s has an unsatisfied dependency on %s', name, dependency.component)))
            if (!dependency.hasOwnProperty('source') && definitions[dependency.component].scoped) dependency.source = name
            dependency.source ? debug('Injecting dependency %s.%s as %s into %s', dependency.component, dependency.source, dependency.destination, name)
                              : debug('Injecting dependency %s as %s into %s', dependency.component, dependency.destination, name)
            var component = getProp(system, dependency.component)
            setProp(accumulator, dependency.destination, dependency.source ? getProp(component, dependency.source) : component)
            cb(null, accumulator)
        }, cb)
    }

    function noop() {
        var args = toArray(arguments)
        var cb = args.pop()
        cb && cb.apply(null, [null].concat(args))
    }

    function wrap(component) {
        return {
            start: function(cb) {
                return cb(null, component)
            }
        }
    }

    function restart(cb) {
        async.seq(api.stop, api.start)(cb)
        return api
    }

    var api = {
        configure: configure,
        add: add,
        set: set,
        remove: remove,
        merge: merge,
        dependsOn: dependsOn,
        start: start,
        stop: stop,
        restart: restart,
        _definitions: definitions
    }

    return api
}