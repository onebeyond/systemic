const async = require('async')
const debug = require('debug')('systemic:index')
const format = require('util').format
const Toposort = require('toposort-class')
const {
    randomName,
    isFunction,
    arraysIntersection,
    hasProp,
    getProp,
    setProp
} = require('./utils')
const requireAll = require('require-all')

module.exports = (_params) => {
    const params = Object.assign({}, {name: randomName()}, _params)
    let definitions = {}
    let currentDefinition
    let running = false
    let started
    let defaultComponent = {
        start: (dependencies, cb) => {
            cb(null, dependencies)
        }
    }

    const bootstrap = (path) => {
        requireAll({
            dirname: path,
            filter: /^(index.js)$/,
            resolve: (exported) => {
                const component = exported.default || exported
                api.include(isFunction(component) ? component() : component)
            }
        })
        return api
    }

    const configure = (component) => {
        return add('config', component, {scoped: true})
    }

    //FIXME: there is some issue with implicit 'this' usage
    function add(name, component, options) {
        debug('Adding component %s to system %s', name, params.name)
        if (definitions.hasOwnProperty(name)) throw new Error(format('Duplicate component: %s', name))
        if (arguments.length === 1) return add(name, defaultComponent)
        return _set(name, component, options)
    }

    const set = (name, component, options) => {
        debug('Setting component %s on system %s', name, params.name)
        return _set(name, component, options)
    }

    const remove = (name) => {
        debug('Removing component %s from system %s', name, params.name)
        delete definitions[name]
        return api
    }

    const _set = (name, component, options) => {
        if (!component) throw new Error(format('Component %s is null or undefined', name))
        definitions[name] = Object.assign({}, options, {
            name: name,
            component: component.start ? component : wrap(component),
            dependencies: []
        })
        currentDefinition = definitions[name]
        return api
    }

    const include = (subSystem) => {
        debug('Including definitions from sub system %s into system %s', subSystem.name, params.name)
        definitions = Object.assign({}, definitions, subSystem._definitions)
        return api
    }

    //FIXME: there is some issue with implicit 'this' usage
    function dependsOn() {
        if (!currentDefinition) throw new Error('You must add a component before calling dependsOn')
        currentDefinition.dependencies = [...arguments].reduce(toDependencyDefinitions, currentDefinition.dependencies)
        return api
    }

    const toDependencyDefinitions = (accumulator, arg) => {
        const record = typeof arg === 'string' ? {
            component: arg,
            destination: arg
        } : Object.assign({},{destination: arg.component}, arg);
        if (!record.component) throw new Error(format('Component %s has an invalid dependency %s', currentDefinition.name, JSON.stringify(arg)))
        if (currentDefinition.dependencies.find(dep => dep.destination === record.destination)) {
            throw new Error(format('Component %s has a duplicate dependency %s', currentDefinition.name, record.destination))
        }
        return accumulator.concat(record)

    }

    const start = (cb) => {
        debug('Starting system %s', params.name)
        started = []
        const p = new Promise(function (resolve, reject) {
            async.seq(sortComponents, ensureComponents, (components, cb) => {
                debug('System %s started', params.name)
                running = components
                cb(null, components)
            })(function (err, components) {
                if (err) return reject(err, {})
                resolve(components)
            })
        })
        return cb ? p.then(immediateCallback(cb)).catch(immediateError(cb, {})) : p
    }

    const ensureComponents = (components, cb) => {
        if (running) return cb(null, running)
        async.reduce(components.reverse(), {}, toSystem, cb)
    }

    const toSystem = (system, name, cb) => {
        debug('Inspecting compontent %s', name)
        getDependencies(name, system, (err, dependencies) => {
            if (err) return cb(err)
            startComponent(dependencies, name, system, cb)
        })
    }

    const startComponent = (dependencies, name, system, cb) => {
        debug('Starting component %s', name)
        started.push(name)
        const component = definitions[name].component
        const onStarted = (err, started) => {
            if (err) return cb(err)
            setProp(system, name, started)
            debug('Component %s started', name)
            setImmediate(() => {
                cb(null, system)
            })
        }
        const p = component.start(dependencies, onStarted)
        if (p && p.then) {
            p.then(immediateCallback(onStarted)).catch(immediateError(cb))
        }
    }

    const stop = (cb) => {
        debug('Stopping system %s', params.name)
        const p = new Promise(function (resolve, reject) {
            async.seq(sortComponents, removeUnstarted, stopComponents, function (cb) {
                debug('System %s stopped', params.name)
                running = false
                cb()
            })(function (err) {
                if (err) return reject(err)
                resolve();
            })
        })
        return cb ? p.then(immediateCallback(cb)).catch(immediateError(cb)) : p
    }

    const stopComponents = (components, cb) => {
        async.eachSeries(components, stopComponent, cb)
    }

    const stopComponent = (name, cb) => {
        debug('Stopping component %s', name)
        const stop = definitions[name].component.stop || noop
        const onStopped = (err) => {
            if (err) return cb(err)
            debug('Component %s stopped', name)
            setImmediate(cb)
        }
        const p = stop(onStopped)
        if (p && p.then) {
            p.then(immediateCallback(onStopped)).catch(immediateError(cb))
        }
    }

    const sortComponents = (cb) => {
        let result = []
        try {
            const graph = new Toposort()
            Object.keys(definitions).forEach(function (name) {
                graph.add(name, definitions[name].dependencies.map(dep => dep.component))
            })
            result = arraysIntersection(graph.sort(), Object.keys(definitions))
        } catch (err) {
            return cb(err)
        }
        return cb(null, result)
    }

    const removeUnstarted = (components, cb) => {
        cb(null, arraysIntersection(components, started))
    }

    const getDependencies = (name, system, cb) => {
        async.reduce(definitions[name].dependencies, {}, function (accumulator, dependency, cb) {
            if (!hasProp(definitions, dependency.component)) return cb(new Error(format('Component %s has an unsatisfied dependency on %s', name, dependency.component)))
            if (!dependency.hasOwnProperty('source') && definitions[dependency.component].scoped) dependency.source = name
            dependency.source ? debug('Injecting dependency %s.%s as %s into %s', dependency.component, dependency.source, dependency.destination, name)
                : debug('Injecting dependency %s as %s into %s', dependency.component, dependency.destination, name)
            const component = getProp(system, dependency.component)
            setProp(accumulator, dependency.destination, dependency.source ? getProp(component, dependency.source) : component)
            cb(null, accumulator)
        }, cb)
    }

    //FIXME: there is some issue with implicit 'this' usage
    function noop() {
        const args = [...arguments]
        const cb = args.pop()
        cb && cb.apply(null, [null].concat(args))
    }

    const wrap = (component) => {
        return {
            start: (dependencies, cb) => {
                return cb(null, component)
            }
        }
    }

    const restart = (cb) => {
        const p = api.stop().then(() => {
            return api.start()
        })

        return cb ? p.then(immediateCallback(cb)).catch(immediateError(cb)) : p
    }

    const immediateCallback = (cb) => {
        return (resolved) => {
            setImmediate(() => {
                cb(null, resolved);
            })
        }
    }

    const immediateError = (cb, resolved) => {
        return (err) => {
            setImmediate(() => {
                resolved ? cb(err, resolved) : cb(err);
            })
        }
    }

    const api = {
        name: params.name,
        bootstrap,
        configure,
        add,
        set,
        remove,
        merge: include,
        include,
        dependsOn,
        start,
        stop,
        restart,
        _definitions: definitions
    }

    return api
}
