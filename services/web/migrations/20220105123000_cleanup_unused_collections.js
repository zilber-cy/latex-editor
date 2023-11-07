const Helpers = require('./lib/helpers')

exports.tags = ['saas']

const unusedCollections = [
  'collaberatorcount',
  'db.subscriptions',
  'projectsDeletedByMigration',
  'readonlycount',
  'samllog',
  'sharelatex-production.docOps.2013-12-17T02-26-49.0',
  'sharelatex-production.projects.2013-12-17T02-26-49.1',
  'sharelatex-production.users.2013-12-17T02-26-49.2',
  'sharelatex_production.users',
  'totalwords',
  'user',
  'usersDeletedByMigration',
  'usersEmailDomains',
]

exports.migrate = async () => {
  for (const name of unusedCollections) {
    await Helpers.dropCollection(name)
  }
}

exports.rollback = async () => {
  // We lost the indexes. There is no way back.
}
