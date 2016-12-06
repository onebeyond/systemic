[![Build Status](https://img.shields.io/travis/guidesmiths/systemic/master.svg)](https://travis-ci.org/guidesmiths/systemic)
[![Code Style](https://img.shields.io/badge/code%20style-imperative-brightgreen.svg)](https://github.com/guidesmiths/eslint-config-imperative)

# Systemic
A minimal dependency injection library

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

See [svc-example](https://github.com/guidesmiths/svc-example) for an full node application that uses systemic.

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

#### Overriding Components
Attempting to add the same component twice will result in an error, but sometimes you need to do this to introduce a test double. Under such circumstances use ```set``` instead of ```add```

```js
const master = require('../lib/master-system')
const store = require('./stubs/store')

before((done) => {
    master.set('store', store).start(done)
})
```

#### Removing Components
You can also remove components, which can be useful when testing.

```js
const system = require('../lib/system')

before((done) => {
    system.remove('production-only-component')
    system.start(done)
})
```

#### Including components from another system
In addition to overriding individual components you can include all components from another system.
This can be used to divide the system definition into logical chunks or when writing tests e.g.

```js
const master = require('../lib/master-system')
const stubs = require('./stubs')

before((done) => {
    master.include(stubs).start(done)
})
```

#### Grouping components
Sometimes you need to depend on a set of components as a single unit. You *could* achieve this by writing a custom component that depends on the individual components and exposes them in a map - but there's no need. Systemic will do this for you if you omit the component. See '''routes.all''' in the following example...

```js
const app = require('systemic-express').app
const server = require('systemic-express').server

new System()
    .add('app', app())
    .add('routes.admin', adminRoutes()).dependsOn('app')
    .add('routes.api', apiRoutes()).dependsOn('app')
    .add('routes.all').dependsOn('routes.admin', 'routes.api')
    .add('server').dependsOn('app', 'routes.all')
```
The above example will create a component '''routes.all''' which will yield
```js
   {
      routes: {
          admin: adminRoutes,
          api: apiRoutes
      }
   }
```
postponing the server start until all routes have been initialised.

#### Bootstraping components from the file system
The dependency graph for a medium size project can grow to tens of components leading large system definitions and questions of how best to organise your components. You can avoid this by bootstraping components from a specified directory, where each folder in the directory defines an index.js which defines a sub system. e.g.

```
lib/
  |- system.js
  |- components/
      |- config/
         |- index.js
      |- logging/
         |- index.js
      |- express/
         |- index.js
      |- routes/
         |- admin-routes.js
         |- api-routes.js
         |- index.js
```

```js
// system.js
const System = require('system')
const path = require('path')
module.exports = new System().bootstrap(path.join(__dirname, 'components'))
```

```js
// components/routes/index.js
const System = require('systemic')
const adminRoutes = require('./admin-routes')
const apiRoutes = require('./api-routes')

module.exports = new System()
    .add('routes.admin', adminRoutes()).dependsOn('app')
    .add('routes.api', apiRoutes()).dependsOn('app', 'mongodb')
    .add('routes').dependsOn('routes.admin', 'routes.api')
