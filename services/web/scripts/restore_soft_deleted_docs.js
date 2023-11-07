const { waitForDb } = require('../app/src/infrastructure/mongodb')
const ProjectEntityRestoreHandler = require('../app/src/Features/Project/ProjectEntityRestoreHandler')
const DocstoreManager = require('../app/src/Features/Docstore/DocstoreManager')

const ARGV = process.argv.slice(2)
const DEVELOPER_USER_ID = ARGV.shift()
const PROJECT_ID = ARGV.shift()
const FILE_NAMES_TO_RESTORE = ARGV

async function main() {
  const deletedDocs = await DocstoreManager.promises.getAllDeletedDocs(
    PROJECT_ID
  )
  const docsToRestore = deletedDocs.filter(doc =>
    FILE_NAMES_TO_RESTORE.includes(doc.name)
  )
  for (const deletedDoc of docsToRestore) {
    const newDoc = await ProjectEntityRestoreHandler.promises.restoreDeletedDoc(
      PROJECT_ID,
      deletedDoc._id,
      deletedDoc.name,
      DEVELOPER_USER_ID
    )
    console.log(newDoc)
  }
}

waitForDb()
  .then(main)
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
