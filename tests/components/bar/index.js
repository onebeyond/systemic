var System = require('../../..')

module.exports = new System().add('bar').dependsOn('foo')
