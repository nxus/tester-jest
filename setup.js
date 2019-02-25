const path = require('path');
const fs = require('fs');
const MongodbMemoryServer = require('mongodb-memory-server').default;

const puppeteer = require('puppeteer');
const mkdirp = require('mkdirp');
const os = require('os');

const DIR = path.join(os.tmpdir(), 'jest_global_setup');

const adaptersByModule = require('./adaptersByModule')

async function setupMongo() {
  const mongoConfig = {}
  const mongods = []

  const adapters = adaptersByModule('sails-mongo');

  for (var name of adapters) {
    var mongod = new MongodbMemoryServer({
      instance: {
        dbName: name
      }//,
    });
    mongoConfig[name] = {uri: await mongod.getConnectionString()};
    mongods.push(mongod);
  }
  
  // Write global config to disk because all tests run in different contexts.
  fs.writeFileSync(path.join(DIR, 'mongoConfig'), JSON.stringify(mongoConfig));

  // Set reference to mongod in order to close the server during teardown.
  global.__MONGODS__ = mongods;
  process.env.MONGO_URIS = mongoConfig;
};


async function setupPuppeteer() {
  const browser = await puppeteer.launch({args: ["--no-sandbox", "--disable-setuid-sandbox"]});
  // store the browser instance so we can teardown it later
  // this global is only available in the teardown but not in TestEnvironments
  global.__BROWSER_GLOBAL__ = browser;

  // use the file system to expose the wsEndpoint for TestEnvironments
  fs.writeFileSync(path.join(DIR, 'wsEndpoint'), browser.wsEndpoint());
};


module.exports = async function() {
  mkdirp.sync(DIR);
  console.log("Setup: created", DIR)
  await setupMongo()
  console.log("Setup: mongo server")
//  await setupPuppeteer()
//  console.log("Setup: puppeteer started")
}
