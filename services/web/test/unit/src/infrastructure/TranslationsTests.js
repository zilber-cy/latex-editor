const { expect } = require('chai')
const SandboxedModule = require('sandboxed-module')

const MODULE_PATH = '../../../../app/src/infrastructure/Translations.js'

describe('Translations', function () {
  let req, res, translations
  function runMiddlewares(cb) {
    translations.i18nMiddleware(req, res, () => {
      translations.setLangBasedOnDomainMiddleware(req, res, cb)
    })
  }

  beforeEach(function () {
    translations = SandboxedModule.require(MODULE_PATH, {
      requires: {
        '@overleaf/settings': {
          i18n: {
            escapeHTMLInVars: false,
            subdomainLang: {
              www: { lngCode: 'en', url: 'https://www.sharelatex.com' },
              fr: { lngCode: 'fr', url: 'https://fr.sharelatex.com' },
              da: { lngCode: 'da', url: 'https://da.sharelatex.com' },
            },
          },
        },
      },
    })

    req = {
      url: '/',
      headers: {
        'accept-language': '',
      },
    }
    res = {
      locals: {},
      getHeader: () => {},
      setHeader: () => {},
    }
  })

  describe('translate', function () {
    beforeEach(function (done) {
      runMiddlewares(done)
    })

    it('works', function () {
      expect(req.i18n.t('give_feedback')).to.equal('Give feedback')
    })

    it('has translate alias', function () {
      expect(req.i18n.translate('give_feedback')).to.equal('Give feedback')
    })
  })

  describe('interpolation', function () {
    beforeEach(function (done) {
      runMiddlewares(done)
    })

    it('works', function () {
      expect(
        req.i18n.t('please_confirm_email', {
          emailAddress: 'foo@example.com',
        })
      ).to.equal(
        'Please confirm your email foo@example.com by clicking on the link in the confirmation email '
      )
    })

    it('handles dashes after interpolation', function () {
      // This translation string has a problematic interpolation followed by a
      // dash: `__len__-day`
      expect(
        req.i18n.t('faq_how_does_free_trial_works_answer', {
          appName: 'Overleaf',
          len: '5',
        })
      ).to.equal(
        'You get full access to your chosen Overleaf plan during your 5-day free trial. There is no obligation to continue beyond the trial. Your card will be charged at the end of your 5 day trial unless you cancel before then. You can cancel via your subscription settings.'
      )
    })

    it('disables escaping', function () {
      expect(
        req.i18n.t('admin_user_created_message', {
          link: 'http://google.com',
        })
      ).to.equal(
        'Created admin user, <a href="http://google.com">Log in here</a> to continue'
      )
    })
  })

  describe('setLangBasedOnDomainMiddleware', function () {
    it('should set the lang to french if the domain is fr', function (done) {
      req.headers.host = 'fr.sharelatex.com'
      runMiddlewares(() => {
        expect(req.lng).to.equal('fr')
        done()
      })
    })

    describe('suggestedLanguageSubdomainConfig', function () {
      it('should set suggestedLanguageSubdomainConfig if the detected lang is different to subdomain lang', function (done) {
        req.headers['accept-language'] = 'da, en-gb;q=0.8, en;q=0.7'
        req.headers.host = 'fr.sharelatex.com'
        runMiddlewares(() => {
          expect(res.locals.suggestedLanguageSubdomainConfig).to.exist
          expect(res.locals.suggestedLanguageSubdomainConfig.lngCode).to.equal(
            'da'
          )
          done()
        })
      })

      it('should not set suggestedLanguageSubdomainConfig if the detected lang is the same as subdomain lang', function (done) {
        req.headers['accept-language'] = 'da, en-gb;q=0.8, en;q=0.7'
        req.headers.host = 'da.sharelatex.com'
        runMiddlewares(() => {
          expect(res.locals.suggestedLanguageSubdomainConfig).to.not.exist
          done()
        })
      })
    })
  })
})
