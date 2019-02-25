const ConfigurationManager = require('nxus-core/lib/ConfigurationManager');

const conf = new ConfigurationManager({namespace: 'nxus'})

module.exports = conf.getConfig()
