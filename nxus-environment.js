const NodeEnvironment = require('jest-environment-node');
const path = require('path');
const fs = require('fs');

const RedisServer = require('redis-server')
const puppeteer = require('puppeteer');
const os = require('os');
const difference = require('lodash/difference')

const DIR = path.join(os.tmpdir(), 'jest_global_setup');

const tester = require('nxus-tester')
const application = require('nxus-core').application
const storage = require('nxus-storage').storage


const nxusConfig = require('./nxusConfig')
const adaptersByModule = require('./adaptersByModule')


function keysOf(obj) {
  let ret = {}
  for (let k in obj) {
    ret[k] = Object.keys(obj[k])
  }
  return ret
}

function newKeys(first, last) {
  let ret = {}
  for (let k in first) {
    let diff = difference(last[k], first[k])
    if (diff.length > 0) {
      ret[k] = diff
    }
  }
  return ret
}


class Plugin {
  constructor(g, c, t) {
    this.global = g
    this.config = c
    this.tester = t
  }

  /*
  async setup() {}
  async methods() {}
  async teardown() {}
  */
}


class Mongo extends Plugin {
  async setup() {
    const mongoConfig = JSON.parse(fs.readFileSync(path.join(DIR, 'mongoConfig'), 'utf-8'));

    this.global.__MONGO_URIS__ = mongoConfig;
    for (let k in mongoConfig) {
      for (let c in nxusConfig.storage.connections) {
        if (nxusConfig.storage.connections[c].adapter == k) {
          this.config["nxus_storage__connections__"+c+"__url"] = mongoConfig[k].uri
        }
      }
    }
  }
}

class Puppeteer extends Plugin {
  async methods() {
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
}

class Searcher extends Plugin {
  async setup() { 
    this.config.nxus_storage__connections__searcher__index = process.env.nxus_storage__connections__searcher__index || 'searcher-jest-test',
    this.config.nxus_storage__connections__searcher__host = process.env.nxus_storage__connections__searcher__host || 'http://localhost:9200'

    this.searcherHost = this.config.nxus_storage__connections__searcher__host
    this.searcherIndexName = this.config.nxus_storage__connections__searcher__index
    this.searcherIndex = this.searcherHost+'/'+this.searcherIndexName
    this.deleteIndex(this.searcherIndex)
  }

  async methods() {
    this.tester.searcherRefresh = async () => {
      await tester.request.post({url:this.searcherIndex+"/_refresh", baseUrl: null})
    }
  }
  
  async teardown() {
    return this.deleteIndex(this.searcherIndex)
  }

  async deleteIndex(indexUrl) {
    try {
      await tester.request.delete({url:indexUrl, baseUrl: null, json: true})
    } catch (e) {
      // If the index wasn't used at all, not existing isn't an error
      if (! (e.response && e.response.body && e.response.body.error.type == 'index_not_found_exception')) {
        console.log("Delete ES index error", e.message)
      }
    }
    
  }
}

class WorkerQueue extends Plugin {
  async setup() {
    this.redisServer
    if (! this.config.redis_port) {
      this.config.redis_port = 6300
    }
    // for CI
    if (process.env.REDIS_URL) {
      this.config.nxus_worker_queue__redis_url = process.env.REDIS_URL
    } else {
      this.config.nxus_worker_queue__redis_url = "redis://localhost:" + this.config.redis_port
      this.redisServer = new RedisServer(this.config.redis_port)
      await this.redisServer.open()
    }
  }
  async teardown() {
    if (this.redisServer) {
      await this.redisServer.close()
    }
  }
}

class NxusServer extends Plugin {
  async setup() {
    let opts = Object.assign({
      watch: false,
      DEBUG: process.env.DEBUG || "",
    }, this.config, this.config.serverEnv || {})

    await tester.startTestServer(this.config.server, opts)

    this.global.tester = tester
    this.global.application = application
    this.global.storage = storage
  }

  async methods() {
    this.tester.getApplicationModule = function (name) {
      return application.get(name)
    }
    this.tester.createUser = async function (email, password = 'test', admin=false) {
      let User = await application.get('storage').getModel('users-user')
      return User.findOrCreate({email}, {email, password, admin, enabled: true})
    }
  }
  
}

class NxusEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config);
    this.config = Object.assign({server: 'index.js'}, config.testEnvironmentOptions)

    this.plugins = []

    this.newPlugin(Puppeteer)

    if (adaptersByModule('sails-mongo').length > 0) {
      this.newPlugin(Mongo)
    }
    if (adaptersByModule('waterline-elasticsearch').length > 0) {
      this.newPlugin(Searcher)
    }
    if (nxusConfig.worker_queue) {
      this.newPlugin(WorkerQueue)
    }

    this.newPlugin(NxusServer)
  }

  newPlugin(plugin) {
    this.plugins.push(new plugin(this.global, this.config, tester))
  }
  
  async pluginCall(methodName) {
    let global = this.global, config = this.config
    for (let plugin of this.plugins) {
      let method = plugin[methodName.toLowerCase()]
      console.log(methodName, plugin.constructor.name, method ? "" : "(no-op)")
      if (method) {
        let keys = keysOf({global: this.global, config: this.config, tester})
        await method.call(plugin, global, config)
        let additions = newKeys(keys, keysOf({global: this.global, config: this.config, tester}))
        for (let o in additions) {
          console.log(` ${o} added: ${additions[o].join(', ')}`)
        }
      }
    }
  }

  async setup() {
    await super.setup();

    await this.pluginCall('Setup')

    await this.pluginCall('Methods')

  }

  async teardown() {
    await this.pluginCall('Teardown')
    
    await super.teardown();
  }
  
}

module.exports = NxusEnvironment
