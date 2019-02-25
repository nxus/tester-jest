const nxusConfig = require('./nxusConfig')

module.exports = function(moduleName, conf) {
  if (conf === undefined) {
    conf = nxusConfig
  }
  
  return Object.keys(conf.storage.adapters).filter(k => conf.storage.adapters[k] == moduleName)
}
