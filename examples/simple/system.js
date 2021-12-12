const Systemic = require('../..');
const Config = require('./components/config');
const Logger = require('./components/logger');
const Mongo = require('./components/mongo');

module.exports = () => Systemic().add('config', Config(), { scoped: true }).add('logger', Logger()).dependsOn('config').add('mongo.primary', Mongo()).dependsOn('config', 'logger').add('mongo.secondary', Mongo()).dependsOn('config', 'logger');
