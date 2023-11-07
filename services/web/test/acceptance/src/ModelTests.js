const { expect } = require('chai')

const { User } = require('../../../app/src/models/User')
const { Subscription } = require('../../../app/src/models/Subscription')

describe('mongoose', function () {
  describe('User', function () {
    const email = 'wombat@potato.net'

    it('allows the creation of a user', async function () {
      await expect(User.create({ email })).to.be.fulfilled
      await expect(User.findOne({ email }, { _id: 1 })).to.eventually.exist
    })

    it('does not allow the creation of multiple users with the same email', async function () {
      await expect(User.create({ email })).to.be.fulfilled
      await expect(User.create({ email })).to.be.rejected
      await expect(User.countDocuments({ email })).to.eventually.equal(1)
    })

    it('formats assignedAt as Date', async function () {
      await expect(
        User.create({
          email,
          splitTests: {
            'some-test': [
              {
                variantName: 'control',
                versionNumber: 1,
                phase: 'release',
                assignedAt: '2021-09-24T11:53:18.313Z',
              },
              {
                variantName: 'control',
                versionNumber: 2,
                phase: 'release',
                assignedAt: new Date(),
              },
            ],
          },
        })
      ).to.be.fulfilled

      const user = await User.findOne({ email }, { splitTests: 1 })
      expect(user.splitTests['some-test'][0].assignedAt).to.be.a('date')
      expect(user.splitTests['some-test'][1].assignedAt).to.be.a('date')
    })
  })

  describe('Subsription', function () {
    let user

    beforeEach(async function () {
      user = await User.create({ email: 'wombat@potato.net' })
    })

    it('allows the creation of a subscription', async function () {
      await expect(
        Subscription.create({ admin_id: user._id, manager_ids: [user._id] })
      ).to.be.fulfilled
      await expect(Subscription.findOne({ admin_id: user._id })).to.eventually
        .exist
    })

    it('does not allow the creation of a subscription without a manager', async function () {
      await expect(Subscription.create({ admin_id: user._id })).to.be.rejected
    })
  })
})
