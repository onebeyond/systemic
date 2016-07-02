var System = require('../..')
var config = require('./components/config')
var logger = require('./components/logger')
var mongo = require('./components/mongo')

var system = new System()
system.add('config', config())
      .add('logger', logger())
          .dependsOn({ 'config.logging': 'config' })
      .add('mongo.primary', mongo())
          .dependsOn({ 'config.mongo.primary': 'config' }, 'logger')
      .add('mongo.secondary', mongo())
          .dependsOn({ 'config.mongo.secondary': 'config' }, 'logger')
      .start(function(err, components) {
          if (err) throw err
          system.stop()
      })
