const Systemic = require('../../../..');
const Config = require('./config');

module.exports = () => Systemic({ name: 'config' }).add('config', Config(), { scoped: true });
