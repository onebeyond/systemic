const Systemic = require('../../../..');
const Logger = require('./logger');

module.exports = () => Systemic({ name: 'logger' }).add('logger', Logger()).dependsOn('config');
