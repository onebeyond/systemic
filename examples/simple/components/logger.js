module.exports = function (options) {
  async function start({ config }) {
    console.log('Logging at level', config.level);
    return console;
  }

  return {
    start: start,
  };
};
