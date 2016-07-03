var System = require('../..')
var config = require('./components/config')
var logger = require('./components/logger')
var mongo = require('./components/mongo')

var system = new System()
system.add('config', config())
      .add('logger', logger())
          .dependsOn({ component: 'config', source: 'logging', destination: 'config' })
      .add('mongo.primary', mongo())
          .dependsOn({ component: 'config', source: 'mongo.primary', destination: 'config' }, 'logger')
      .add('mongo.secondary', mongo())
          .dependsOn({ component:'config', source: 'mongo.secondary', destination: 'config' }, 'logger')
      .start(function(err, components) {
          if (err) throw err
          system.stop()
      })
