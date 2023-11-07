const Settings = require('@overleaf/settings')
const { execSync } = require('child_process')
const { expect } = require('chai')
const { db } = require('../../../../../app/src/infrastructure/mongodb')
const User = require('../../../../../test/acceptance/src/helpers/User').promises

/**
 * @param {string} cmd
 * @return {string}
 */
function run(cmd) {
  // https://nodejs.org/docs/latest-v12.x/api/child_process.html#child_process_child_process_execsync_command_options
  // > stderr by default will be output to the parent process' stderr
  // > unless stdio is specified.
  // https://nodejs.org/docs/latest-v12.x/api/child_process.html#child_process_options_stdio
  // Pipe stdin from /dev/null, store stdout, pipe stderr to /dev/null.
  return execSync(cmd, {
    stdio: ['ignore', 'pipe', 'pipe'],
  }).toString()
}

async function getUser(email) {
  return db.users.findOne({ email }, { projection: { _id: 0, isAdmin: 1 } })
}

describe('ServerCEScripts', function () {
  describe('check-mongodb', function () {
    it('should exit with code 0 on success', function () {
      run('node modules/server-ce-scripts/scripts/check-mongodb')
    })

    it('should exit with code 1 on error', function () {
      try {
        run(
          'MONGO_SERVER_SELECTION_TIMEOUT=1' +
            'MONGO_CONNECTION_STRING=mongodb://localhost:4242 ' +
            'node modules/server-ce-scripts/scripts/check-mongodb'
        )
      } catch (e) {
        expect(e.status).to.equal(1)
        return
      }
      expect.fail('command should have failed')
    })
  })

  describe('check-redis', function () {
    it('should exit with code 0 on success', function () {
      run('node modules/server-ce-scripts/scripts/check-redis')
    })

    it('should exit with code 1 on error', function () {
      try {
        run('REDIS_PORT=42 node modules/server-ce-scripts/scripts/check-redis')
      } catch (e) {
        expect(e.status).to.equal(1)
        return
      }
      expect.fail('command should have failed')
    })
  })

  describe('create-user', function () {
    it('should exit with code 0 on success', function () {
      const out = run(
        'node modules/server-ce-scripts/scripts/create-user --email=foo@bar.com'
      )
      expect(out).to.include('/user/activate?token=')
    })

    it('should create a regular user by default', async function () {
      run(
        'node modules/server-ce-scripts/scripts/create-user --email=foo@bar.com'
      )
      expect(await getUser('foo@bar.com')).to.deep.equal({ isAdmin: false })
    })

    it('should create an admin user with --admin flag', async function () {
      run(
        'node modules/server-ce-scripts/scripts/create-user --admin --email=foo@bar.com'
      )
      expect(await getUser('foo@bar.com')).to.deep.equal({ isAdmin: true })
    })

    it('should exit with code 1 on missing email', function () {
      try {
        run('node modules/server-ce-scripts/scripts/create-user')
      } catch (e) {
        expect(e.status).to.equal(1)
        return
      }
      expect.fail('command should have failed')
    })
  })

  describe('delete-user', function () {
    let user
    beforeEach(async function () {
      user = new User()
      await user.login()
    })

    it('should log missing user', function () {
      const email = 'does-not-exist@example.com'
      const out = run(
        'node modules/server-ce-scripts/scripts/delete-user --email=' + email
      )
      expect(out).to.include('not in database, potentially already deleted')
    })

    it('should exit with code 0 on success', function () {
      const email = user.email
      run('node modules/server-ce-scripts/scripts/delete-user --email=' + email)
    })

    it('should have deleted the user on success', async function () {
      const email = user.email
      run('node modules/server-ce-scripts/scripts/delete-user --email=' + email)
      const dbEntry = await user.get()
      expect(dbEntry).to.not.exist
    })

    it('should exit with code 1 on missing email', function () {
      try {
        run('node modules/server-ce-scripts/scripts/delete-user')
      } catch (e) {
        expect(e.status).to.equal(1)
        return
      }
      expect.fail('command should have failed')
    })
  })

  describe('rename-tag', function () {
    let user
    beforeEach(async function () {
      user = new User()
      await user.login()
    })

    async function createTag(name) {
      await user.doRequest('POST', { url: '/tag', json: { name } })
    }

    async function getTagNames() {
      const { body } = await user.doRequest('GET', { url: '/tag', json: true })
      return body.map(tag => tag.name)
    }

    it('should rename a tag', async function () {
      const oldName = 'before'
      const newName = 'after'
      await createTag(oldName)

      expect(await getTagNames()).to.deep.equal([oldName])

      run(
        `node modules/server-ce-scripts/scripts/rename-tag --user-id=${user.id} --old-name=${oldName} --new-name=${newName}`
      )

      expect(await getTagNames()).to.deep.equal([newName])
    })
  })

  describe('change-compile-timeout', function () {
    let userA, userB
    beforeEach('login', async function () {
      userA = new User()
      await userA.login()

      userB = new User()
      await userB.login()
    })

    async function getCompileTimeout(user) {
      const { compileTimeout } = await user.getFeatures()
      return compileTimeout
    }

    let userATimeout, userBTimeout
    beforeEach('fetch current state', async function () {
      userATimeout = await getCompileTimeout(userA)
      userBTimeout = await getCompileTimeout(userB)
    })

    describe('happy path', function () {
      let newUserATimeout
      beforeEach('run script on user a', function () {
        newUserATimeout = userATimeout - 1
        run(
          `node modules/server-ce-scripts/scripts/change-compile-timeout --user-id=${userA.id} --compile-timeout=${newUserATimeout}`
        )
      })

      it('should change the timeout for user a', async function () {
        const actual = await getCompileTimeout(userA)
        expect(actual).to.not.equal(userATimeout)
        expect(actual).to.equal(newUserATimeout)
      })

      it('should leave the timeout for user b as is', async function () {
        expect(await getCompileTimeout(userB)).to.equal(userBTimeout)
      })
    })

    describe('bad options', function () {
      it('should reject zero timeout', async function () {
        try {
          run(
            `node modules/server-ce-scripts/scripts/change-compile-timeout --user-id=${userA.id} --compile-timeout=0`
          )
          expect.fail('should error out')
        } catch (err) {
          expect(err.stderr.toString()).to.include('positive number of seconds')
        }
        expect(await getCompileTimeout(userA)).to.equal(userATimeout)
        expect(await getCompileTimeout(userB)).to.equal(userBTimeout)
      })

      it('should reject a 20min timeout', async function () {
        try {
          run(
            `node modules/server-ce-scripts/scripts/change-compile-timeout --user-id=${userA.id} --compile-timeout=1200`
          )
          expect.fail('should error out')
        } catch (err) {
          expect(err.stderr.toString()).to.include('below 10 minutes')
        }
        expect(await getCompileTimeout(userA)).to.equal(userATimeout)
        expect(await getCompileTimeout(userB)).to.equal(userBTimeout)
      })
    })
  })

  describe('upgrade-user-features', function () {
    let userLatest, userSP1, userCustomTimeoutLower, userCustomTimeoutHigher
    beforeEach('create users', async function () {
      userLatest = new User()
      userSP1 = new User()
      userCustomTimeoutLower = new User()
      userCustomTimeoutHigher = new User()

      await Promise.all([
        userLatest.ensureUserExists(),
        userSP1.ensureUserExists(),
        userCustomTimeoutLower.ensureUserExists(),
        userCustomTimeoutHigher.ensureUserExists(),
      ])
    })

    const serverPro1Features = {
      collaborators: -1,
      dropbox: true,
      versioning: true,
      compileTimeout: 180,
      compileGroup: 'standard',
      references: true,
      templates: true,
      trackChanges: true,
    }

    beforeEach('downgrade userSP1', async function () {
      await userSP1.mongoUpdate({ $set: { features: serverPro1Features } })
    })

    beforeEach('downgrade userCustomTimeoutLower', async function () {
      run(
        `node modules/server-ce-scripts/scripts/change-compile-timeout --user-id=${userCustomTimeoutLower.id} --compile-timeout=42`
      )
    })

    beforeEach('upgrade userCustomTimeoutHigher', async function () {
      run(
        `node modules/server-ce-scripts/scripts/change-compile-timeout --user-id=${userCustomTimeoutHigher.id} --compile-timeout=360`
      )
    })

    async function getFeatures() {
      return [
        await userLatest.getFeatures(),
        await userSP1.getFeatures(),
        await userCustomTimeoutLower.getFeatures(),
        await userCustomTimeoutHigher.getFeatures(),
      ]
    }

    let initialFeatures
    beforeEach('collect initial features', async function () {
      initialFeatures = await getFeatures()
    })

    it('should have prepared the right features', async function () {
      expect(initialFeatures).to.deep.equal([
        Settings.defaultFeatures,
        serverPro1Features,
        Object.assign({}, Settings.defaultFeatures, {
          compileTimeout: 42,
        }),
        Object.assign({}, Settings.defaultFeatures, {
          compileTimeout: 360,
        }),
      ])
    })

    describe('dry-run', function () {
      let output
      beforeEach('run script', function () {
        output = run(
          `node modules/server-ce-scripts/scripts/upgrade-user-features`
        )
      })

      it('should update SP1 features', function () {
        expect(output).to.include(userSP1.id)
      })

      it('should update lowerTimeout features', function () {
        expect(output).to.include(userCustomTimeoutLower.id)
      })

      it('should not update latest features', function () {
        expect(output).to.not.include(userLatest.id)
      })

      it('should not update higherTimeout features', function () {
        expect(output).to.not.include(userCustomTimeoutHigher.id)
      })

      it('should not change any features in the db', async function () {
        expect(await getFeatures()).to.deep.equal(initialFeatures)
      })
    })

    describe('live run', function () {
      let output
      beforeEach('run script', function () {
        output = run(
          `node modules/server-ce-scripts/scripts/upgrade-user-features --dry-run=false`
        )
      })

      it('should update SP1 features', function () {
        expect(output).to.include(userSP1.id)
      })

      it('should update lowerTimeout features', function () {
        expect(output).to.include(userCustomTimeoutLower.id)
      })

      it('should not update latest features', function () {
        expect(output).to.not.include(userLatest.id)
      })

      it('should not update higherTimeout features', function () {
        expect(output).to.not.include(userCustomTimeoutHigher.id)
      })

      it('should update features in the db', async function () {
        expect(await getFeatures()).to.deep.equal([
          Settings.defaultFeatures,
          Settings.defaultFeatures,
          Settings.defaultFeatures,
          Object.assign({}, Settings.defaultFeatures, {
            compileTimeout: 360,
          }),
        ])
      })
    })
  })
})
