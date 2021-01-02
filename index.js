const async = require('async');
const debug = require('debug')('systemic:index');
const format = require('util').format;
const Toposort = require('toposort-class');
const requireAll = require('require-all');
const {
  randomName,
  isFunction,
  arraysIntersection,
  hasProp,
  getProp,
  setProp
} = require('./utils');

module.exports = function(_params) {

  const api = {};
  const params = Object.assign({}, {name: randomName()}, _params);
  let definitions = {};
  let currentDefinition;
  let running = false;
  let started;
  const defaultComponent = {
    start(dependencies, cb) {
      cb(null, dependencies);
    }
  };

  function bootstrap(path) {
    requireAll({
      dirname: path,
      filter: /^(index.js)$/,
      resolve(exported) {
        const component = exported.default || exported;
        api.include(isFunction(component) ? component() : component);
      }
    });
    return api;
  }

  function configure(component) {
    return add('config', component, { scoped: true });
  }

  function add(...args) {
    const [name, component, options] = args;
    debug('Adding component %s to system %s', name, params.name);
    if (definitions.hasOwnProperty(name)) throw new Error(format('Duplicate component: %s', name));
    if (args.length === 1) return add(name, defaultComponent);
    return _set(name, component, options);
  }

  function set(name, component, options) {
    debug('Setting component %s on system %s', name, params.name);
    return _set(name, component, options);
  }

  function remove(name) {
    debug('Removing component %s from system %s', name, params.name);
    delete definitions[name];
    return api;
  }

  function _set(name, component, options) {
    if (!component) throw new Error(format('Component %s is null or undefined', name));
    definitions[name] = Object.assign({}, options, {
      name,
      component: component.start ? component : wrap(component),
      dependencies: []
    });
    currentDefinition = definitions[name];
    return api;
  }

  function include(subSystem) {
    debug('Including definitions from sub system %s into system %s', subSystem.name, params.name);
    definitions = Object.assign({}, definitions, subSystem._definitions);
    return api;
  }

  function dependsOn(...args) {
    if (!currentDefinition) throw new Error('You must add a component before calling dependsOn');
    currentDefinition.dependencies = args.reduce(toDependencyDefinitions, currentDefinition.dependencies);
    return api;
  }

  function toDependencyDefinitions(accumulator, arg) {
    const record = typeof arg === 'string' ? {
      component: arg,
      destination: arg
    } : Object.assign({}, {destination: arg.component}, arg);
    if (!record.component) throw new Error(format('Component %s has an invalid dependency %s', currentDefinition.name, JSON.stringify(arg)));
    if (currentDefinition.dependencies.find((dep) => dep.destination === record.destination)) {
      throw new Error(format('Component %s has a duplicate dependency %s', currentDefinition.name, record.destination));
    }
    return accumulator.concat(record);
  }

  function start(cb) {
    debug('Starting system %s', params.name);
    started = [];
    const p = new Promise((resolve, reject) => {
      async.seq(sortComponents, ensureComponents, (components, cb) => {
        debug('System %s started', params.name);
        running = components;
        cb(null, components);
      })((err, components) => {
        if (err) return reject(err, {});
        resolve(components);
      });
    });
    return cb ? p.then(immediateCallback(cb)).catch(immediateError(cb, {})) : p;
  }

  function ensureComponents(components, cb) {
    if (running) return cb(null, running);
    async.reduce(components.reverse(), {}, toSystem, cb);
  }

  function toSystem(system, name, cb) {
    debug('Inspecting compontent %s', name);
    getDependencies(name, system, (err, dependencies) => {
      if (err) return cb(err);
      startComponent(dependencies, name, system, cb);
    });
  }

  function startComponent(dependencies, name, system, cb) {
    debug('Starting component %s', name);
    started.push(name);
    const component = definitions[name].component;
    const onStarted = function(err, started) {
      if (err) return cb(err);
      setProp(system, name, started);
      debug('Component %s started', name);
      setImmediate(() => {
        cb(null, system);
      });
    };
    const p = component.start(dependencies, onStarted);
    if (p && p.then) {
      p.then(immediateCallback(onStarted)).catch(immediateError(cb));
    }
  }

  function stop(cb) {
    debug('Stopping system %s', params.name);
    const p = new Promise((resolve, reject) => {
      async.seq(sortComponents, removeUnstarted, stopComponents, (cb) => {
        debug('System %s stopped', params.name);
        running = false;
        cb();
      })((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    return cb ? p.then(immediateCallback(cb)).catch(immediateError(cb)) : p;
  }

  function stopComponents(components, cb) {
    async.eachSeries(components, stopComponent, cb);
  }

  function stopComponent(name, cb) {
    debug('Stopping component %s', name);
    const stop = definitions[name].component.stop || noop;
    const onStopped = function(err) {
      if (err) return cb(err);
      debug('Component %s stopped', name);
      setImmediate(cb);
    };
    const p = stop(onStopped);
    if (p && p.then) {
      p.then(immediateCallback(onStopped)).catch(immediateError(cb));
    }
  }

  function sortComponents(cb) {
    let result = [];
    try {
      const graph = new Toposort();
      Object.keys(definitions).forEach((name) => {
        graph.add(name, definitions[name].dependencies.map((dep) => dep.component));
      });
      result = arraysIntersection(graph.sort(), Object.keys(definitions));
    } catch (err) {
      return cb(err);
    }
    return cb(null, result);
  }

  function removeUnstarted(components, cb) {
    cb(null, arraysIntersection(components, started));
  }

  function getDependencies(name, system, cb) {
    async.reduce(definitions[name].dependencies, {}, (accumulator, dependency, cb) => {
      if (!hasProp(definitions, dependency.component)) return cb(new Error(format('Component %s has an unsatisfied dependency on %s', name, dependency.component)));
      if (!dependency.hasOwnProperty('source') && definitions[dependency.component].scoped) dependency.source = name;
      dependency.source ? debug('Injecting dependency %s.%s as %s into %s', dependency.component, dependency.source, dependency.destination, name)
        : debug('Injecting dependency %s as %s into %s', dependency.component, dependency.destination, name);
      const component = getProp(system, dependency.component);
      setProp(accumulator, dependency.destination, dependency.source ? getProp(component, dependency.source) : component);
      cb(null, accumulator);
    }, cb);
  }

  function noop(...args) {
    const cb = args.pop();
    cb && cb(...[null].concat(args));
  }

  function wrap(component) {
    return {
      start(dependencies, cb) {
        return cb(null, component);
      }
    };
  }

  function restart(cb) {
    const p = api.stop().then(() => api.start());

    return cb ? p.then(immediateCallback(cb)).catch(immediateError(cb)) : p;
  }

  function immediateCallback(cb) {
    return function (resolved) {
      setImmediate(() => {
        cb(null, resolved);
      });
    };
  }

  function immediateError(cb, resolved) {
    return function (err) {
      setImmediate(() => {
        resolved ? cb(err, resolved) : cb(err);
      });
    };
  }

  Object.assign(api, {
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
  });

  return api;
};
