const Systemic = require('../../..')

module.exports = () => Systemic().add('bar').dependsOn('foo')
