const path = require('path');
const fs = require('fs');
const MongodbMemoryServer = require('mongodb-memory-server');

const puppeteer = require('puppeteer');
const mkdirp = require('mkdirp');
const os = require('os');

const DIR = path.join(os.tmpdir(), 'jest_global_setup');


const mongod = new MongodbMemoryServer.default({
  instance: {
    dbName: 'jest'
  }//,
//  binary: {
//    version: '3.4.10'
//  }
});

async function setupMongo() {
  const mongoConfig = {
    mongoDBName: 'jest',
    mongoUri: await mongod.getConnectionString()
  };

  // Write global config to disk because all tests run in different contexts.
  fs.writeFileSync(path.join(DIR, 'globalConfig'), JSON.stringify(mongoConfig));

  // Set reference to mongod in order to close the server during teardown.
  global.__MONGOD__ = mongod;
  process.env.MONGO_URL = mongoConfig.mongoUri;
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
  await setupMongo()
  await setupPuppeteer()
}
