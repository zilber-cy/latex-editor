const Queues = require('../../infrastructure/Queues')
const EmailHandler = require('../Email/EmailHandler')
const UserUpdater = require('./UserUpdater')
const UserGetter = require('./UserGetter')

const ONE_DAY_MS = 24 * 60 * 60 * 1000

async function scheduleOnboardingEmail(user) {
  await Queues.createScheduledJob(
    'emails-onboarding',
    { data: { userId: user._id } },
    ONE_DAY_MS
  )
}

async function sendOnboardingEmail(userId) {
  const user = await UserGetter.promises.getUser({ _id: userId }, { email: 1 })
  if (user) {
    await EmailHandler.promises.sendEmail('userOnboardingEmail', {
      to: user.email,
    })
    await UserUpdater.promises.updateUser(user._id, {
      $set: { onboardingEmailSentAt: new Date() },
    })
  }
}

module.exports = { scheduleOnboardingEmail, sendOnboardingEmail }
