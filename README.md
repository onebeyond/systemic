# node-boot (working title)
A minimal dependency injection library

## tl;dr
```js
const System = require('node-boot')
const config = require('./components/config')
const logger = require('./components/logger')
const mongo = require('./components/mongo')

new System()
    .configure(config())
    .add('logger', logger()).dependsOn('config')
    .add('mongo.primary', mongo()).dependsOn('config', 'logger')
    .add('mongo.secondary', mongo()).dependsOn('config', 'logger')
    .start((err, { config, logger, mongo }) => {
        if (err) throw err
        logger.info('Started')
        mongo.find(config.filter)
    })
```

### Components
A component is an object with an asynchronous start function and optional stop function, e.g.
```js
module.exports = function() {

    var db

    function start(dependencies, cb) {
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
You add components to the system (which is also a component)
```js
const System = require('node-boot')
const mongo = require('./components/mongo')

new System()
    .add('mongo', mongo())
    .start((err, { mongo }) => {
        if (err) throw err
        mongo.find({ name: 'fred' })
    })
```

It's likely that components will have dependencies on other components. You can express this as follows
```js
new System()
    .add('logger', logger())
    .add('mongo', mongo()).dependsOn('logger')
    .start((err, { mongo }) => {
        if (err) throw err
        mongo.find({ name: 'fred' })
    })
```
The system will work out the correct order to start the dependencies, and provide the logger as one of the mongo components dependencies
```js
    function start(dependencies, cb) {
        dependencies.logger.info('Connecting to mongo')
        MongoClient.connect('mongo://localhost/example', {}, (err, _db) => {
            db = _db
            cb(null, db)
        })
    }
```
Or using ES6
```
    function start({ logger }, cb) {
        logger.info('Connecting to mongo')
        MongoClient.connect('mongo://localhost/example', {}, (err, _db) => {
            db = _db
            cb(null, db)
        })
    }
```
### Mapping dependencies
If you don't want to keep the same dependency name as the component you can express a dependency mapping
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
If you don't want the entire dependency, but just a sub-document you can also express this with a dependency mapping
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

### Configuration Shorthand
Configuration **can** work just like any other component, but because it is so common to want to inject configuration sub-documents, e.g. ```config.logger```, ```config.mongo``` into your components, there's a shorthand for doing this...
```
new System()
    .configure(config())
    .add('mongo', mongo()).dependsOn('config')
    .start((err, { mongo }) => {
        if (err) throw err
        mongo.find({ name: 'fred' })
    })
```
The ```configure``` method creates a *scoped* dependency which will default the ```source``` attribute when a component depends on it.
