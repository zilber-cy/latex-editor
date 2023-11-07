const SandboxedModule = require('sandboxed-module')
const path = require('path')
const sinon = require('sinon')
const MockRequest = require('../helpers/MockRequest')
const MockResponse = require('../helpers/MockResponse')
const { assert } = require('chai')

const MODULE_PATH = path.join(
  __dirname,
  '../../../../app/src/Features/Analytics/AnalyticsUTMTrackingMiddleware'
)

describe('AnalyticsUTMTrackingMiddleware', function () {
  beforeEach(function () {
    this.analyticsId = 'ecdb935a-52f3-4f91-aebc-7a70d2ffbb55'
    this.userId = '61795fcb013504bb7b663092'

    this.req = new MockRequest()
    this.res = new MockResponse()
    this.next = sinon.stub().returns()
    this.req.session = {
      user: {
        _id: this.userId,
        analyticsId: this.analyticsId,
      },
    }

    this.AnalyticsUTMTrackingMiddleware = SandboxedModule.require(MODULE_PATH, {
      requires: {
        './AnalyticsManager': (this.AnalyticsManager = {
          recordEventForSession: sinon.stub().resolves(),
          setUserPropertyForSession: sinon.stub().resolves(),
        }),
        '@overleaf/settings': {
          siteUrl: 'https://www.overleaf.com',
        },
      },
    })

    this.middleware = this.AnalyticsUTMTrackingMiddleware.recordUTMTags()
  })

  describe('without UTM tags in query', function () {
    beforeEach(function () {
      this.req.url = '/project'
      this.middleware(this.req, this.res, this.next)
    })

    it('user is not redirected', function () {
      assert.isFalse(this.res.redirected)
    })

    it('next middleware is executed', function () {
      sinon.assert.calledOnce(this.next)
    })

    it('no event or user property is recorded', function () {
      sinon.assert.notCalled(this.AnalyticsManager.recordEventForSession)
      sinon.assert.notCalled(this.AnalyticsManager.setUserPropertyForSession)
    })
  })

  describe('with all UTM tags in query', function () {
    beforeEach(function () {
      this.req.url =
        '/project?utm_source=Organic&utm_medium=Facebook&utm_campaign=Some%20Campaign&utm_content=foo-bar&utm_term=overridden'
      this.req.query = {
        utm_source: 'Organic',
        utm_medium: 'Facebook',
        utm_campaign: 'Some Campaign',
        utm_content: 'foo-bar',
        utm_term: 'overridden',
      }
      this.middleware(this.req, this.res, this.next)
    })

    it('user is redirected', function () {
      assert.isTrue(this.res.redirected)
      assert.equal('/project', this.res.redirectedTo)
    })

    it('next middleware is not executed', function () {
      sinon.assert.notCalled(this.next)
    })

    it('page-view event is recorded for session', function () {
      sinon.assert.calledWith(
        this.AnalyticsManager.recordEventForSession,
        this.req.session,
        'page-view',
        {
          path: '/project',
          utm_source: 'Organic',
          utm_medium: 'Facebook',
          utm_campaign: 'Some Campaign',
          utm_content: 'foo-bar',
          utm_term: 'overridden',
        }
      )
    })

    it('utm-tags user property is set for session', function () {
      sinon.assert.calledWith(
        this.AnalyticsManager.setUserPropertyForSession,
        this.req.session,
        'utm-tags',
        'Organic;Facebook;Some Campaign;foo-bar'
      )
    })
  })

  describe('with some UTM tags in query', function () {
    beforeEach(function () {
      this.req.url =
        '/project?utm_medium=Facebook&utm_campaign=Some%20Campaign&utm_term=foo'
      this.req.query = {
        utm_medium: 'Facebook',
        utm_campaign: 'Some Campaign',
        utm_term: 'foo',
      }
      this.middleware(this.req, this.res, this.next)
    })

    it('user is redirected', function () {
      assert.isTrue(this.res.redirected)
      assert.equal('/project', this.res.redirectedTo)
    })

    it('next middleware is not executed', function () {
      sinon.assert.notCalled(this.next)
    })

    it('page-view event is recorded for session', function () {
      sinon.assert.calledWith(
        this.AnalyticsManager.recordEventForSession,
        this.req.session,
        'page-view',
        {
          path: '/project',
          utm_medium: 'Facebook',
          utm_campaign: 'Some Campaign',
          utm_term: 'foo',
        }
      )
    })

    it('utm-tags user property is set for session', function () {
      sinon.assert.calledWith(
        this.AnalyticsManager.setUserPropertyForSession,
        this.req.session,
        'utm-tags',
        'N/A;Facebook;Some Campaign;foo'
      )
    })
  })

  describe('with some UTM tags and additional parameters in query', function () {
    beforeEach(function () {
      this.req.url =
        '/project?utm_medium=Facebook&utm_campaign=Some%20Campaign&other_param=some-value'
      this.req.query = {
        utm_medium: 'Facebook',
        utm_campaign: 'Some Campaign',
        other_param: 'some-value',
      }
      this.middleware(this.req, this.res, this.next)
    })

    it('user is redirected', function () {
      assert.isTrue(this.res.redirected)
      assert.equal('/project?other_param=some-value', this.res.redirectedTo)
    })

    it('next middleware is not executed', function () {
      sinon.assert.notCalled(this.next)
    })

    it('page-view event is recorded for session', function () {
      sinon.assert.calledWith(
        this.AnalyticsManager.recordEventForSession,
        this.req.session,
        'page-view',
        {
          path: '/project',
          utm_medium: 'Facebook',
          utm_campaign: 'Some Campaign',
        }
      )
    })

    it('utm-tags user property is set for session', function () {
      sinon.assert.calledWith(
        this.AnalyticsManager.setUserPropertyForSession,
        this.req.session,
        'utm-tags',
        'N/A;Facebook;Some Campaign;N/A'
      )
    })
  })
})
