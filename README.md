# node-boot (working title)
A minimal dependency injection library

## tl;dr
```js
var System = require('node-boot')
var config = require('./components/config')
var logger = require('./components/logger')
var mongo = require('./components/mongo')
var mongo = require('./components/service')

new System()
    .configure(config())
    .add('logger', logger()).dependsOn('config')
    .add('mongo.primary', mongo()).dependsOn('config', 'logger')
    .add('mongo.secondary', mongo()).dependsOn('config', 'logger')
    .add('service', service).dependsOn('config', 'mongo', 'logger')
    .start(function(err, components) {
        if (err) throw err
        console.log('Started: ' Object.keys(components))
    })
```
