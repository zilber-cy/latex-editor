const SandboxedModule = require('sandboxed-module')
const sinon = require('sinon')
const modulePath =
  '../../../../app/src/Features/Subscription/SubscriptionLocator'

describe('Subscription Locator Tests', function () {
  beforeEach(function () {
    this.user = { _id: '5208dd34438842e2db333333' }
    this.subscription = { hello: 'world' }
    this.Subscription = {
      findOne: sinon.stub(),
      find: sinon.stub(),
    }
    this.DeletedSubscription = {
      findOne: sinon.stub().yields(),
      find: sinon.stub().yields(),
    }
    this.SubscriptionLocator = SandboxedModule.require(modulePath, {
      requires: {
        './GroupPlansData': {},
        '../../models/Subscription': {
          Subscription: this.Subscription,
        },
        '../../models/DeletedSubscription': {
          DeletedSubscription: this.DeletedSubscription,
        },
      },
    })
  })

  describe('finding users subscription', function () {
    it('should send the users features', function (done) {
      this.Subscription.findOne.callsArgWith(1, null, this.subscription)
      this.SubscriptionLocator.getUsersSubscription(
        this.user,
        (err, subscription) => {
          if (err) return done(err)
          this.Subscription.findOne
            .calledWith({ admin_id: this.user._id })
            .should.equal(true)
          subscription.should.equal(this.subscription)
          done()
        }
      )
    })

    it('should error if not found', function (done) {
      this.Subscription.findOne.callsArgWith(1, 'not found')
      this.SubscriptionLocator.getUsersSubscription(
        this.user,
        (err, subscription) => {
          err.should.exist
          done()
        }
      )
    })

    it('should take a user id rather than the user object', function (done) {
      this.Subscription.findOne.callsArgWith(1, null, this.subscription)
      this.SubscriptionLocator.getUsersSubscription(
        this.user._id,
        (err, subscription) => {
          if (err) return done(err)
          this.Subscription.findOne
            .calledWith({ admin_id: this.user._id })
            .should.equal(true)
          subscription.should.equal(this.subscription)
          done()
        }
      )
    })
  })
})
