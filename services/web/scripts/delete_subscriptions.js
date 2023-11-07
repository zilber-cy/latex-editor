const { Subscription } = require('../app/src/models/Subscription')
const SubscriptionUpdater = require('../app/src/Features/Subscription/SubscriptionUpdater')
const minimist = require('minimist')

const { waitForDb } = require('../app/src/infrastructure/mongodb')
const { ObjectId } = require('mongodb')

const run = async () => {
  for (const id of ids) {
    console.log('id', id)
    const subscription = await Subscription.findOne({ _id: ObjectId(id) })
    await SubscriptionUpdater.promises.deleteSubscription(
      subscription,
      deleterData
    )
    console.log('Deleted subscription', id)
  }
}

let ids, deleterData
const setup = () => {
  const argv = minimist(process.argv.slice(2))
  ids = argv.ids
  if (!ids) {
    console.error('No ids given')
    process.exit(1)
  }
  ids = ids.split(',')

  const deleterId = argv.deleterId
  if (!deleterId) {
    console.error('No deleterId given')
    process.exit(1)
  }

  deleterData = { id: ObjectId(deleterId) }
}

setup()

waitForDb()
  .then(run)
  .then(() => {
    process.exit(0)
  })
  .catch(err => {
    console.log('Aiee, something went wrong!', err)
    process.exit(1)
  })
