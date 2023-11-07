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
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const sinon = require('sinon')
const path = require('path')
const modulePath = path.join(
  __dirname,
  '../../../../../app/src/infrastructure/LockManager.js'
)
const SandboxedModule = require('sandboxed-module')

describe('LockManager - getting the lock', function () {
  beforeEach(function () {
    this.LockManager = SandboxedModule.require(modulePath, {
      requires: {
        './RedisWrapper': {
          client() {
            return { auth() {} }
          },
        },
        '@overleaf/settings': {
          redis: {},
          lockManager: {
            lockTestInterval: 50,
            maxTestInterval: 1000,
            maxLockWaitTime: 10000,
            redisLockExpiry: 30,
            slowExecutionThreshold: 5000,
          },
        },
        '@overleaf/metrics': {
          inc() {},
          gauge() {},
        },
      },
    })

    this.callback = sinon.stub()
    this.key = 'lock:web:lockName:project-id}'
    return (this.namespace = 'lockName')
  })

  describe('when the lock is not set', function () {
    beforeEach(function (done) {
      this.LockManager._tryLock = sinon.stub().yields(null, true)
      return this.LockManager._getLock(this.key, this.namespace, (...args) => {
        this.callback(...Array.from(args || []))
        return done()
      })
    })

    it('should try to get the lock', function () {
      return this.LockManager._tryLock
        .calledWith(this.key, this.namespace)
        .should.equal(true)
    })

    it('should only need to try once', function () {
      return this.LockManager._tryLock.callCount.should.equal(1)
    })

    it('should return the callback', function () {
      return this.callback.calledWith(null).should.equal(true)
    })

    it('should clear the lock queue', function () {
      this.LockManager._lockQueuesSize().should.equal(0)
    })
  })

  describe('when the lock is initially set', function () {
    beforeEach(function (done) {
      const startTime = Date.now()
      let tries = 0
      this.LockManager.LOCK_TEST_INTERVAL = 5
      this.LockManager._tryLock = function (key, namespace, callback) {
        if (callback == null) {
          callback = function () {}
        }
        if (Date.now() - startTime < 20 || tries < 2) {
          tries = tries + 1
          return callback(null, false)
        } else {
          return callback(null, true)
        }
      }
      sinon.spy(this.LockManager, '_tryLock')

      return this.LockManager._getLock(this.key, this.namespace, (...args) => {
        this.callback(...Array.from(args || []))
        return done()
      })
    })

    it('should call tryLock multiple times until free', function () {
      return (this.LockManager._tryLock.callCount > 1).should.equal(true)
    })

    it('should return the callback', function () {
      return this.callback.calledWith(null).should.equal(true)
    })

    it('should clear the lock queue', function () {
      this.LockManager._lockQueuesSize().should.equal(0)
    })
  })

  describe('when the lock times out', function () {
    beforeEach(function (done) {
      const time = Date.now()
      this.LockManager.LOCK_TEST_INTERVAL = 1
      this.LockManager.MAX_LOCK_WAIT_TIME = 5
      this.LockManager._tryLock = sinon.stub().yields(null, false)
      return this.LockManager._getLock(this.key, this.namespace, (...args) => {
        this.callback(...Array.from(args || []))
        return done()
      })
    })

    it('should return the callback with an error', function () {
      this.callback.should.have.been.calledWith(
        sinon.match.instanceOf(Error).and(sinon.match.has('message', 'Timeout'))
      )
    })
  })

  describe('when there are multiple requests for the same lock', function () {
    beforeEach(function (done) {
      let locked = false
      this.results = []
      this.LockManager.LOCK_TEST_INTERVAL = 1
      this.LockManager._tryLock = function (key, namespace, callback) {
        if (callback == null) {
          callback = function () {}
        }
        if (locked) {
          return callback(null, false)
        } else {
          locked = true // simulate getting the lock
          return callback(null, true)
        }
      }
      // Start ten lock requests in order at 1ms 2ms 3ms...
      // with them randomly holding the lock for 0-10ms.
      // Use predefined values for the random delay to make the test
      // deterministic.
      const randomDelays = [5, 4, 1, 8, 6, 8, 3, 4, 2, 4]
      let startTime = 0
      return Array.from(randomDelays).map((randomDelay, i) =>
        ((randomDelay, i) => {
          startTime += 1
          return setTimeout(() => {
            // changing the next line to the old method of LockManager._getLockByPolling
            // should give results in a random order and cause the test to fail.
            return this.LockManager._getLock(
              this.key,
              this.namespace,
              (...args) => {
                setTimeout(
                  () => (locked = false), // release the lock after a random amount of time
                  randomDelay
                )
                this.results.push(i)
                if (this.results.length === 10) {
                  return done()
                }
              }
            )
          }, startTime)
        })(randomDelay, i)
      )
    })

    it('should process the requests in order', function () {
      return this.results.should.deep.equal([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    })

    it('should clear the lock queue', function () {
      this.LockManager._lockQueuesSize().should.equal(0)
    })
  })
})
