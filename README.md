# Systemic
A minimal dependency injection library

[![Build Status](https://travis-ci.org/guidesmiths/systemic.png)](https://travis-ci.org/guidesmiths/systemic)

## tl;dr
```js
const System = require('systemic')
const config = require('./components/config')
const logger = require('./components/logger')
const mongo = require('./components/mongo')

new System()
    .configure(config())
    .add('logger', logger()).dependsOn('config')
    .add('mongo', mongo()).dependsOn('config', 'logger')
    .start((err, { config, logger, mongo }) => {
        if (err) throw err
        logger.info('Started')
        mongo.find(config.filter)
    })
```

### Why Use Dependency Injection With Node.js?
Node.js applications tend to be small and "flatter" than applications developed in other languages such as Java. This reduces the benefit of dependency injection, which encouraged [the Single Responsibility Principle](https://en.wikipedia.org/wiki/Single_responsibility_principle), discoraged [God Objects](https://en.wikipedia.org/wiki/God_object) and facilitated unit testing through [test doubles](https://en.wikipedia.org/wiki/Test_double). Alternative (but not necessarily better) approaches suchs as [Rewire](https://www.npmjs.com/package/rewire) exist too.

However we've found that when writing microservices the life cycle of an application and its dependencies is a nuisance to manage over and over again. We wanted a way to consistently express that our service should establish database connections before listening for http requests, and shutdown those connections only after it had stopped listening. We found that before doing anything we need to load config from remote sources, and configure loggers. This is why we use DI.

Our first attempt at a dependency injection framework was [Electrician](https://www.npmjs.com/package/electrician). It served it's purpose well, but the API had a couple of limitations that we wanted to fix. This would have required a backwards incompatible change, so instead we decided to write a new DI library. This is it.

### Concepts
Systemic has 3 main concepts

1. Systems
2. Components
3. Dependencies

#### Systems
You add components to a system (which is in itself a component).
```js
const System = require('systemic')
const mongo = require('./components/mongo')

new System()
    .add('mongo', mongo())
    .start((err, { mongo }) => {
        if (err) throw err
        // Do something useful with mongo
    })
```
When you start the system, systemic iterates through all the components, starting them in the order derived from the dependency graph. When you stop the system, systemic iterates through all the components stopping them in the reverse order.

#### Components
A component is an object with optional asynchronous start and stop functions, e.g.
```js
module.exports = function() {

    var db

    function start(cb) {
        MongoClient.connect('mongo://localhost/example', {}, (err, _db) => {
            db = _db
            cb(null, db)
        })
    }

    function stop(cb) {
        db.close(cb)
    }

    return {
        start: start,
        stop: stop
    }
}
```
#### Dependencies
If the component has dependencies they must be registered with the system
```js
const System = require('systemic')
const config = require('./components/config')
const mongo = require('./components/mongo')

new System()
    .add('config', config())
    .add('mongo', mongo()).dependsOn('config')
    .start((err, { mongo }) => {
        if (err) throw err
        // Do something useful with mongo
    })
```
and the components start method (now mandatory), must specifiy an argument for the dependencies
```js
    function start({ config }, cb) {
        MongoClient.connect(config.url, config.options, (err, _db) => {
            db = _db
            cb(null, db)
        })
    }
```

#### Mapping dependencies
You can customise the depencency attribute passed to your component by creating a mapping object instead of a simple string
```js
new System()
    .add('logger', logger())
    .add('mongo', mongo())
        .dependsOn({ component: 'logger', destination: 'log' })
    .start((err, { mongo }) => {
        if (err) throw err
        mongo.find({ name: 'fred' })
    })
```
and if you only want to inject a nested property of the dependency instead of the entire thing you can also express this with a dependency mapping
```js
new System()
    .add('config', config())
    .add('mongo', mongo())
        .dependsOn({ component: 'config', source: 'mongo' })
    .start((err, { mongo }) => {
        if (err) throw err
        mongo.find({ name: 'fred' })
    })
```
Now ```config.mongo``` will be injected as ```config``` instead of the entire configuration object

#### Configuration Shorthand
Configuration *can* work just like any other component, but because it is so common to want to inject nested sub-documents, e.g. ```config.logger``` or ```config.mongo``` into your components, there's a shorthand for doing this...
```js
new System()
    .configure(config())
    .add('mongo', mongo()).dependsOn('config')
    .start((err, { mongo }) => {
        if (err) throw err
        mongo.find({ name: 'fred' })
    })
```
The ```configure``` method creates a *scoped* dependency which will default the ```source``` attribute when a component depends on it.
