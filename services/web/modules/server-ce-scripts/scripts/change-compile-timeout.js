const minimist = require('minimist')
const {
  db,
  ObjectId,
  waitForDb,
} = require('../../../app/src/infrastructure/mongodb')

async function main() {
  await waitForDb()

  const argv = minimist(process.argv.slice(2), {
    string: ['user-id', 'compile-timeout'],
  })

  const { 'user-id': userId, 'compile-timeout': rawCompileTimeout } = argv
  const compileTimeout = parseInt(rawCompileTimeout, 10)
  if (
    !userId ||
    !ObjectId.isValid(userId) ||
    !rawCompileTimeout ||
    Number.isNaN(compileTimeout)
  ) {
    console.error(
      `Usage: node ${__filename} --user-id=5a9414f259776c7900b300e6 --timeout=90`
    )
    process.exit(101)
  }

  if (compileTimeout < 1 || compileTimeout > 600) {
    console.error(
      `The compile timeout must be positive number of seconds, below 10 minutes (600).`
    )
    process.exit(101)
  }

  await db.users.updateOne(
    { _id: ObjectId(userId) },
    { $set: { 'features.compileTimeout': compileTimeout } }
  )
}

main()
  .then(() => {
    console.error('Done.')
    process.exit(0)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
