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
