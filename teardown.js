const os = require('os');
const rimraf = require('rimraf');
const path = require('path');

const DIR = path.join(os.tmpdir(), 'jest_global_setup');

module.exports = async function() {
  // stop the memory mongo server
  await global.__MONGOD__.stop();

  // close the browser instance
  await global.__BROWSER_GLOBAL__.close();

  // clean-up the config files
  rimraf.sync(DIR);
};

