const chai = require('chai')
const { expect } = chai

function clearSettingsCache() {
  const monorepoPath = require
    .resolve('../../../../config/settings.defaults.js')
    .replace(/\/services\/web\/config\/settings\.defaults\.js$/, '')
  const settingsDeps = Object.keys(require.cache).filter(
    x =>
      x.includes('/@overleaf/settings') ||
      x.includes(`${monorepoPath}/libraries/settings`) ||
      x.includes(`${monorepoPath}/services/web/config`)
  )
  settingsDeps.forEach(dep => delete require.cache[dep])
}

describe('settings.defaults', function () {
  it('additional text extensions can be added via config', function () {
    clearSettingsCache()
    process.env.ADDITIONAL_TEXT_EXTENSIONS = 'abc, xyz'
    const settings = require('@overleaf/settings')
    expect(settings.textExtensions).to.include('tex') // from the default list
    expect(settings.textExtensions).to.include('abc')
    expect(settings.textExtensions).to.include('xyz')
  })
})
