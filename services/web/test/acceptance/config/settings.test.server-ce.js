const { merge } = require('@overleaf/settings/merge')
const ServerCEDefaults = require('../../../config/settings.defaults')
const base = require('./settings.test.defaults')

module.exports = base.mergeWith({
  defaultFeatures: ServerCEDefaults.defaultFeatures,
})

module.exports.mergeWith = function (overrides) {
  return merge(overrides, module.exports)
}
