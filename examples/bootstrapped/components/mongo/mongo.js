module.exports = function (options) {
  async function start({ logger, config }) {
    logger.info('Connecting to', config.url);
    return {};
  }

  return {
    start: start,
  };
};
