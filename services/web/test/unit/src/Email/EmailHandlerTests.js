const SandboxedModule = require('sandboxed-module')
const path = require('path')
const sinon = require('sinon')
const { expect } = require('chai')

const MODULE_PATH = path.join(
  __dirname,
  '../../../../app/src/Features/Email/EmailHandler'
)

describe('EmailHandler', function () {
  beforeEach(function () {
    this.html = '<html>hello</html>'
    this.Settings = { email: {} }
    this.EmailBuilder = {
      buildEmail: sinon.stub().returns({ html: this.html }),
    }
    this.EmailSender = {
      promises: {
        sendEmail: sinon.stub().resolves(),
      },
    }
    this.Queues = {
      createScheduledJob: sinon.stub(),
    }
    this.EmailHandler = SandboxedModule.require(MODULE_PATH, {
      requires: {
        './EmailBuilder': this.EmailBuilder,
        './EmailSender': this.EmailSender,
        '@overleaf/settings': this.Settings,
        '../../infrastructure/Queues': this.Queues,
      },
    })
  })

  describe('send email', function () {
    it('should use the correct options', async function () {
      const opts = { to: 'bob@bob.com' }
      await this.EmailHandler.promises.sendEmail('welcome', opts)
      expect(this.EmailSender.promises.sendEmail).to.have.been.calledWithMatch({
        html: this.html,
      })
    })

    it('should return the error', async function () {
      this.EmailSender.promises.sendEmail.rejects(new Error('boom'))
      const opts = {
        to: 'bob@bob.com',
        subject: 'hello bob',
      }
      await expect(this.EmailHandler.promises.sendEmail('welcome', opts)).to.be
        .rejected
    })

    it('should not send an email if lifecycle is not enabled', async function () {
      this.Settings.email.lifecycle = false
      this.EmailBuilder.buildEmail.returns({ type: 'lifecycle' })
      await this.EmailHandler.promises.sendEmail('welcome', {})
      expect(this.EmailSender.promises.sendEmail).not.to.have.been.called
    })

    it('should send an email if lifecycle is not enabled but the type is notification', async function () {
      this.Settings.email.lifecycle = false
      this.EmailBuilder.buildEmail.returns({ type: 'notification' })
      const opts = { to: 'bob@bob.com' }
      await this.EmailHandler.promises.sendEmail('welcome', opts)
      expect(this.EmailSender.promises.sendEmail).to.have.been.called
    })

    it('should send lifecycle email if it is enabled', async function () {
      this.Settings.email.lifecycle = true
      this.EmailBuilder.buildEmail.returns({ type: 'lifecycle' })
      const opts = { to: 'bob@bob.com' }
      await this.EmailHandler.promises.sendEmail('welcome', opts)
      expect(this.EmailSender.promises.sendEmail).to.have.been.called
    })

    describe('with plain-text email content', function () {
      beforeEach(function () {
        this.text = 'hello there'
      })

      it('should pass along the text field', async function () {
        this.EmailBuilder.buildEmail.returns({
          html: this.html,
          text: this.text,
        })
        const opts = { to: 'bob@bob.com' }
        await this.EmailHandler.promises.sendEmail('welcome', opts)
        expect(
          this.EmailSender.promises.sendEmail
        ).to.have.been.calledWithMatch({
          html: this.html,
          text: this.text,
        })
      })
    })
  })

  describe('send deferred email', function () {
    beforeEach(function () {
      this.opts = {
        to: 'bob@bob.com',
        first_name: 'hello bob',
      }
      this.emailType = 'canceledSubscription'
      this.ONE_HOUR_IN_MS = 1000 * 60 * 60
      this.EmailHandler.sendDeferredEmail(
        this.emailType,
        this.opts,
        this.ONE_HOUR_IN_MS
      )
    })
    it('should add a email job to the queue', function () {
      expect(this.Queues.createScheduledJob).to.have.been.calledWith(
        'deferred-emails',
        { data: { emailType: this.emailType, opts: this.opts } },
        this.ONE_HOUR_IN_MS
      )
    })
  })
})
