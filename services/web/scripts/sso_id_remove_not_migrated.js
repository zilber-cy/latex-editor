process.env.MONGO_SOCKET_TIMEOUT = '300000'
const { waitForDb } = require('../app/src/infrastructure/mongodb')
const SAMLUserIdMigrationHandler = require('../modules/overleaf-integration/app/src/SAML/SAMLUserIdMigrationHandler')

const institutionId = parseInt(process.argv[2])
if (isNaN(institutionId)) throw new Error('No institution id')
const emitUsers = process.argv.includes('--emit-users')

console.log(
  'Remove SSO linking for users not migrated at institution:',
  institutionId
)

waitForDb()
  .then(main)
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

async function main() {
  const result = await SAMLUserIdMigrationHandler.promises.removeNotMigrated(
    institutionId
  )

  if (emitUsers) {
    console.log(
      `\nRemoved: ${result.success}\nFailed to remove: ${result.failed}`
    )
  }

  console.log(
    `\nRemoved: ${result.success.length}\nFailed to remove: ${result.failed.length}`
  )

  process.exit()
}
