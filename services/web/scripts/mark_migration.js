const Adapter = require('../migrations/lib/adapter')
const fs = require('fs').promises
const path = require('path')

async function main(args) {
  if (
    !args ||
    args.length === 0 ||
    args.includes('help') ||
    args.includes('--help') ||
    args.includes('-h')
  ) {
    console.log('')
    console.log('usage: node ./scripts/mark_migration.js migration state')
    console.log('')
    console.log('    migration:   name of migration file')
    console.log('    state:       executed | unexecuted')
    console.log('')
    return
  }

  const migration = args[0]
  if (!migration) {
    throw new Error('Error: migration must be supplied')
  }
  const state = args[1]
  if (!state) {
    throw new Error('Error: migration state must be supplied')
  }

  try {
    await fs.access(path.join(__dirname, '../migrations', `${migration}.js`))
  } catch (err) {
    throw new Error(
      `Error: migration ${migration} does not exist on disk: ${err}`
    )
  }

  console.log(`Marking ${migration} as ${state}`)

  process.env.SKIP_TAG_CHECK = 'true'
  const adapter = new Adapter()
  await adapter.connect()
  switch (state) {
    case 'executed':
      await adapter.markExecuted(migration)
      break
    case 'unexecuted':
      await adapter.unmarkExecuted(migration)
      break
    default:
      throw new Error(`invalid state "${state}"`)
  }
  console.log('Done')
}

if (require.main === module) {
  const args = process.argv.slice(2)
  main(args)
    .then(() => {
      process.exit(0)
    })
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
}
