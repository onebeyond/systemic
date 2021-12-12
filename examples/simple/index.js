const System = require('./system');

const events = { SIGTERM: 0, SIGINT: 0, unhandledRejection: 1, error: 1 };

async function start() {
  const system = System();
  const { config, mongo, logger } = await system.start();

  console.log('System has started. Press CTRL+C to stop');

  Object.keys(events).forEach((name) => {
    process.on(name, async () => {
      await system.stop();
      console.log('System has stopped');
      process.exit(events[name]);
    });
  });
}

start();

setInterval(() => Number.MAX_INT_VALUE);
