/* eslint-disable
    n/handle-callback-err,
    max-len,
    no-return-assign,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { expect } = require('chai')
const SandboxedModule = require('sandboxed-module')
const assert = require('assert')
const path = require('path')
const sinon = require('sinon')
const modulePath = path.join(
  __dirname,
  '../../../../app/src/Features/BrandVariations/BrandVariationsHandler'
)

describe('BrandVariationsHandler', function () {
  beforeEach(function () {
    this.settings = {
      apis: {
        v1: {
          publicUrl: 'http://overleaf.example.com',
        },
      },
      modules: {
        sanitize: {
          options: {
            allowedTags: ['br', 'strong'],
            allowedAttributes: {
              strong: ['style'],
            },
          },
        },
      },
    }
    this.V1Api = { request: sinon.stub() }
    this.BrandVariationsHandler = SandboxedModule.require(modulePath, {
      requires: {
        '@overleaf/settings': this.settings,
        '../V1/V1Api': this.V1Api,
      },
    })
    return (this.mockedBrandVariationDetails = {
      id: '12',
      active: true,
      brand_name: 'The journal',
      logo_url: 'http://my.cdn.tld/journal-logo.png',
      journal_cover_url: 'http://my.cdn.tld/journal-cover.jpg',
      home_url: 'http://www.thejournal.com/',
      publish_menu_link_html: 'Submit your paper to the <em>The Journal</em>',
    })
  })

  describe('getBrandVariationById', function () {
    it('should call the callback with an error when the branding variation id is not provided', function (done) {
      return this.BrandVariationsHandler.getBrandVariationById(
        null,
        (err, brandVariationDetails) => {
          expect(err).to.be.instanceof(Error)
          return done()
        }
      )
    })

    it('should call the callback with an error when the request errors', function (done) {
      this.V1Api.request.callsArgWith(1, new Error())
      return this.BrandVariationsHandler.getBrandVariationById(
        '12',
        (err, brandVariationDetails) => {
          expect(err).to.be.instanceof(Error)
          return done()
        }
      )
    })

    it('should call the callback with branding details when request succeeds', function (done) {
      this.V1Api.request.callsArgWith(
        1,
        null,
        { statusCode: 200 },
        this.mockedBrandVariationDetails
      )
      return this.BrandVariationsHandler.getBrandVariationById(
        '12',
        (err, brandVariationDetails) => {
          expect(err).to.not.exist
          expect(brandVariationDetails).to.deep.equal(
            this.mockedBrandVariationDetails
          )
          return done()
        }
      )
    })

    it('should transform relative URLs in v1 absolute ones', function (done) {
      this.mockedBrandVariationDetails.logo_url = '/journal-logo.png'
      this.V1Api.request.callsArgWith(
        1,
        null,
        { statusCode: 200 },
        this.mockedBrandVariationDetails
      )
      return this.BrandVariationsHandler.getBrandVariationById(
        '12',
        (err, brandVariationDetails) => {
          expect(
            brandVariationDetails.logo_url.startsWith(
              this.settings.apis.v1.publicUrl
            )
          ).to.be.true
          return done()
        }
      )
    })

    it("should sanitize 'submit_button_html'", function (done) {
      this.mockedBrandVariationDetails.submit_button_html =
        '<br class="break"/><strong style="color:#B39500">AGU Journal</strong><iframe>hello</iframe>'
      this.V1Api.request.callsArgWith(
        1,
        null,
        { statusCode: 200 },
        this.mockedBrandVariationDetails
      )
      return this.BrandVariationsHandler.getBrandVariationById(
        '12',
        (err, brandVariationDetails) => {
          expect(brandVariationDetails.submit_button_html).to.equal(
            '<br /><strong style="color:#B39500">AGU Journal</strong>hello'
          )
          return done()
        }
      )
    })
  })
})
