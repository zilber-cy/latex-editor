const _ = require('lodash')

function getCurrentVersion(splitTest) {
  if (splitTest?.versions?.length > 0) {
    return _.maxBy(splitTest.versions, 'versionNumber')
  } else {
    return undefined
  }
}

function getVersion(splitTest, versionNumber) {
  return _.find(splitTest.versions || [], {
    versionNumber,
  })
}

module.exports = {
  getCurrentVersion,
  getVersion,
}
