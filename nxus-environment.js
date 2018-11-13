const NodeEnvironment = require('jest-environment-node');
const path = require('path');
const fs = require('fs');

const puppeteer = require('puppeteer');
const os = require('os');

const DIR = path.join(os.tmpdir(), 'jest_global_setup');

const tester = require('nxus-tester')
const application = require('nxus-core').application
const storage = require('nxus-storage').storage


class MongoEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config);
  }

  async setup() {
    console.log('Setup MongoDB Test Environment');

    const globalConfig = JSON.parse(fs.readFileSync(path.join(DIR, 'globalConfig'), 'utf-8'));

    this.global.__MONGO_URI__ = globalConfig.mongoUri;
    this.global.__MONGO_DB_NAME__ = globalConfig.mongoDBName;

    await super.setup();
  }

  async teardown() {
    console.log('Teardown MongoDB Test Environment');

    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }
};

class PuppeteerEnvironment extends MongoEnvironment {
  constructor(config) {
    super(config);
  }

  async setup() {
    console.log('Setup Puppeteer Test Environment');
    await super.setup();
    // get the wsEndpoint
    const wsEndpoint = fs.readFileSync(path.join(DIR, 'wsEndpoint'), 'utf8');
    if (!wsEndpoint) {
      throw new Error('wsEndpoint not found');
    }

    // connect to puppeteer
    this.global.browser = await puppeteer.connect({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      browserWSEndpoint: wsEndpoint
    });
    this.global.page = await this.global.browser.newPage();
    
  }

  async teardown() {
    console.log('Teardown Puppeteer Test Environment');
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }
}


class NxusEnvironment extends PuppeteerEnvironment {
  constructor(config) {
    super(config);
    this.config = Object.assign({server: 'index.js'}, config.testEnvironmentOptions)
  }

  async setup() {
    console.log('Setup Nxus Test Environment');
    await super.setup();
    
    let opts = Object.assign({
      watch: false,
      DEBUG: "",
      nxus_storage__connections__default__url: this.global.__MONGO_URI__
    }, this.config.serverEnv || {})
    await tester.startTestServer(this.config.server, opts)

    this.global.tester = tester
    this.global.application = application
    this.global.storage = storage
  }

  async teardown() {
    console.log('Teardown Nxus Test Environment');
    await super.teardown();
  }
  
}

module.exports = NxusEnvironment
