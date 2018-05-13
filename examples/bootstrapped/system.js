const Systemic = require('../..')
const path = require('path')
const components = path.join(__dirname, 'components')
module.exports = () => Systemic({ name: 'main' }).bootstrap(components)
