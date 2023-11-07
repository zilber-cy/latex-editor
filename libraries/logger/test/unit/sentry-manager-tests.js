const Path = require('path')
const SandboxedModule = require('sandboxed-module')
const { expect } = require('chai')
const sinon = require('sinon')

const MODULE_PATH = Path.join(__dirname, '../../sentry-manager.js')

describe('SentryManager', function () {
  beforeEach(function () {
    this.clock = sinon.useFakeTimers(Date.now())
    this.Sentry = {
      init: sinon.stub(),
      captureException: sinon.stub(),
    }
    this.SentryManager = SandboxedModule.require(MODULE_PATH, {
      requires: {
        '@sentry/node': this.Sentry,
      },
    })
    this.sentryManager = new this.SentryManager('test_dsn')
  })

  afterEach(function () {
    this.clock.restore()
  })

  describe('captureExceptionRateLimited', function () {
    it('should report a single error to sentry', function () {
      this.sentryManager.captureExceptionRateLimited({ foo: 'bar' }, 'message')
      expect(this.Sentry.captureException).to.have.been.calledOnce
    })

    it('should report the same error to sentry only once', function () {
      const error1 = new Error('this is the error')
      this.sentryManager.captureExceptionRateLimited(
        { foo: error1 },
        'first message'
      )
      this.sentryManager.captureExceptionRateLimited(
        { bar: error1 },
        'second message'
      )
      expect(this.Sentry.captureException).to.have.been.calledOnce
    })

    it('should report two different errors to sentry individually', function () {
      const error1 = new Error('this is the error')
      const error2 = new Error('this is the error')
      this.sentryManager.captureExceptionRateLimited(
        { foo: error1 },
        'first message'
      )
      this.sentryManager.captureExceptionRateLimited(
        { bar: error2 },
        'second message'
      )
      expect(this.Sentry.captureException).to.have.been.calledTwice
    })

    it('for multiple errors should only report a maximum of 5 errors to sentry', function () {
      for (let i = 0; i < 10; i++) {
        this.sentryManager.captureExceptionRateLimited(
          { foo: 'bar' },
          'message'
        )
      }
      expect(this.Sentry.captureException).to.have.callCount(5)
    })

    it('for multiple errors with a minute delay should report 10 errors to sentry', function () {
      for (let i = 0; i < 10; i++) {
        this.sentryManager.captureExceptionRateLimited(
          { foo: 'bar' },
          'message'
        )
      }
      expect(this.Sentry.captureException).to.have.callCount(5)

      // allow a minute to pass
      this.clock.tick(61 * 1000)

      for (let i = 0; i < 10; i++) {
        this.sentryManager.captureExceptionRateLimited(
          { foo: 'bar' },
          'message'
        )
      }
      expect(this.Sentry.captureException).to.have.callCount(10)
    })
  })

  describe('captureException', function () {
    it('should remove the path from fs errors', function () {
      const fsError = new Error(
        "Error: ENOENT: no such file or directory, stat '/tmp/3279b8d0-da10-11e8-8255-efd98985942b'"
      )
      fsError.path = '/tmp/3279b8d0-da10-11e8-8255-efd98985942b'
      this.sentryManager.captureException({ err: fsError }, 'message', 'error')
      expect(this.Sentry.captureException).to.have.been.calledWith(
        sinon.match.has(
          'message',
          'Error: ENOENT: no such file or directory, stat'
        )
      )
    })

    describe('reportedToSentry', function () {
      it('should mark the error as reported to sentry', function () {
        const err = new Error()
        this.sentryManager.captureException({ err }, 'message')
        expect(this.Sentry.captureException).to.have.been.called
        expect(err.reportedToSentry).to.equal(true)
      })

      it('should mark two errors as reported to sentry', function () {
        const err1 = new Error()
        const err2 = new Error()
        this.sentryManager.captureException({ err: err1, err2 }, 'message')
        expect(this.Sentry.captureException).to.have.been.called
        expect(err1.reportedToSentry).to.equal(true)
        expect(err2.reportedToSentry).to.equal(true)
      })

      it('should not mark arbitrary objects as reported to sentry', function () {
        const err = new Error()
        const ctx = { foo: 'bar' }
        this.sentryManager.captureException({ err, ctx }, 'message')
        expect(this.Sentry.captureException).to.have.been.called
        expect(ctx.reportedToSentry).not.to.exist
      })
    })
  })
})
