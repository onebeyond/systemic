var System = require('..')
var config = require('./components/config')
var logger = require('./components/logger')
var mongo = require('./components/mongo')

var system = new System()
system.configure(config())
      .add('logger', logger())
          .dependsOn('config')
      .add('mongo.primary', mongo())
          .dependsOn('config', 'logger')
      .add('mongo.secondary', mongo())
          .dependsOn('config', 'logger')
      .start(function(err, components) {
          if (err) throw err
          system.stop()
      })
