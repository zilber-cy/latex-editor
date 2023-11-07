const { expect } = require('chai')
const SandboxedModule = require('sandboxed-module')
const modulePath = require('path').join(
  __dirname,
  '../../../../app/src/Features/Helpers/UrlHelper.js'
)

describe('UrlHelper', function () {
  beforeEach(function () {
    this.settings = {
      apis: { linkedUrlProxy: { url: undefined } },
      siteUrl: 'http://localhost:3000',
    }
    this.UrlHelper = SandboxedModule.require(modulePath, {
      requires: { '@overleaf/settings': this.settings },
    })
  })
  describe('getSafeRedirectPath', function () {
    it('sanitize redirect path to prevent open redirects', function () {
      expect(this.UrlHelper.getSafeRedirectPath('https://evil.com')).to.be
        .undefined

      expect(this.UrlHelper.getSafeRedirectPath('//evil.com')).to.be.undefined

      expect(this.UrlHelper.getSafeRedirectPath('//ol.com/evil')).to.equal(
        '/evil'
      )

      expect(this.UrlHelper.getSafeRedirectPath('////evil.com')).to.be.undefined

      expect(this.UrlHelper.getSafeRedirectPath('%2F%2Fevil.com')).to.equal(
        '/%2F%2Fevil.com'
      )

      expect(
        this.UrlHelper.getSafeRedirectPath('http://foo.com//evil.com/bad')
      ).to.equal('/evil.com/bad')

      return expect(this.UrlHelper.getSafeRedirectPath('.evil.com')).to.equal(
        '/.evil.com'
      )
    })
  })
})
