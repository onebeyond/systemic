const System = require('..')
const config = require('./components/config')
const logger = require('./components/logger')
const mongo = require('./components/mongo')
const system = System()

system.configure(config())
      .add('logger', logger()).dependsOn('config')
      .add('mongo.primary', mongo()).dependsOn('config', 'logger')
      .add('mongo.secondary', mongo()).dependsOn('config', 'logger')
      .start((err, components) => {
          if (err) throw err
          system.stop()
      })
