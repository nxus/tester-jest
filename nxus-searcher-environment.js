const NxusEnvironment = require('./nxus-environment')
const tester = require('nxus-tester')

class NxusSearcherEnvironment extends NxusEnvironment {
  constructor(config) {
    if (!config.testEnvironmentOptions) {
      config.testEnvironmentOptions = {}
    }
    if (!config.testEnvironmentOptions.serverEnv) {
      config.testEnvironmentOptions.serverEnv = {}
    }
    if (!config.testEnvironmentOptions.serverEnv.nxus_storage__connections__searcher__index) {
      config.testEnvironmentOptions.serverEnv.nxus_storage__connections__searcher__index = 'searcher-jest-test'
    }
    if (!config.testEnvironmentOptions.serverEnv.nxus_storage__connections__searcher__host) {
      config.testEnvironmentOptions.serverEnv.nxus_storage__connections__searcher__host = 'localhost:9200'
    }
    super(config)

    this.searcherHost = config.testEnvironmentOptions.serverEnv.nxus_storage__connections__searcher__host
    this.searcherIndexName = config.testEnvironmentOptions.serverEnv.nxus_storage__connections__searcher__index
    this.searcherIndex = this.searcherHost+'/'+this.searcherIndexName
  }

  async setup() {
    console.log("Setting up searcher index at", this.searcherIndex)
    try {
      await tester.request.put({url:'http://'+this.searcherIndex, baseUrl: null})
    } catch (e) {
      console.log("ES error", e)
    }
    return super.setup()
  }
  async teardown() {
    console.log("Tearing down searcher index", this.searcherIndex)
    try {
      await tester.request.delete({url:'http://'+this.searcherIndex, baseUrl: null})
    } catch (e) {
      console.log("ES error", e)
    }
    return super.teardown()
  }
}

module.exports = NxusSearcherEnvironment
