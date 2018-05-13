const Systemic = require('../../../..')
const Mongo = require('./mongo')

module.exports = () => Systemic({ name: 'mongo' })
    .add('mongo.primary', Mongo()).dependsOn('config', 'logger')
    .add('mongo.secondary', Mongo()).dependsOn('config', 'logger')

