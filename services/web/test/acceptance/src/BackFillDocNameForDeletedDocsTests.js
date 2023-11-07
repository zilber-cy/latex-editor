const { exec } = require('child_process')
const { promisify } = require('util')
const { expect } = require('chai')
const logger = require('@overleaf/logger')
const { db, ObjectId } = require('../../../app/src/infrastructure/mongodb')
const User = require('./helpers/User').promises

async function getDeletedDocs(projectId) {
  return (await db.projects.findOne({ _id: projectId })).deletedDocs
}

async function setDeletedDocs(projectId, deletedDocs) {
  await db.projects.updateOne({ _id: projectId }, { $set: { deletedDocs } })
}

describe('BackFillDocNameForDeletedDocs', function () {
  let user, projectId1, projectId2, docId1, docId2, docId3
  beforeEach('create projects', async function () {
    user = new User()
    await user.login()

    projectId1 = ObjectId(await user.createProject('project1'))
    projectId2 = ObjectId(await user.createProject('project2'))
  })
  beforeEach('create docs', async function () {
    docId1 = ObjectId(
      await user.createDocInProject(projectId1, null, 'doc1.tex')
    )
    docId2 = ObjectId(
      await user.createDocInProject(projectId1, null, 'doc2.tex')
    )
    docId3 = ObjectId(
      await user.createDocInProject(projectId2, null, 'doc3.tex')
    )
  })
  beforeEach('deleted docs', async function () {
    await user.deleteItemInProject(projectId1, 'doc', docId1)
    await user.deleteItemInProject(projectId1, 'doc', docId2)
    await user.deleteItemInProject(projectId2, 'doc', docId3)
  })
  beforeEach('insert doc stubs into docs collection', async function () {
    await db.docs.insertMany([
      { _id: docId1, deleted: true },
      { _id: docId2, deleted: true },
      { _id: docId3, deleted: true },
    ])
  })
  let deletedDocs1, deletedDocs2
  let deletedAt1, deletedAt2, deletedAt3
  beforeEach('set deletedDocs details', async function () {
    deletedAt1 = new Date()
    deletedAt2 = new Date()
    deletedAt3 = new Date()
    deletedDocs1 = [
      { _id: docId1, name: 'doc1.tex', deletedAt: deletedAt1 },
      { _id: docId2, name: 'doc2.tex', deletedAt: deletedAt2 },
    ]
    deletedDocs2 = [{ _id: docId3, name: 'doc3.tex', deletedAt: deletedAt3 }]
    await setDeletedDocs(projectId1, deletedDocs1)
    await setDeletedDocs(projectId2, deletedDocs2)
  })

  async function runScript(args = []) {
    let result
    try {
      result = await promisify(exec)(
        ['LET_USER_DOUBLE_CHECK_INPUTS_FOR=1']
          .concat(['node', 'scripts/back_fill_doc_name_for_deleted_docs'])
          .concat(args)
          .join(' ')
      )
    } catch (error) {
      // dump details like exit code, stdErr and stdOut
      logger.error({ error }, 'script failed')
      throw error
    }
    const { stderr: stdErr } = result

    expect(stdErr).to.include(`Completed batch ending ${projectId2}`)
  }

  function checkDocsBackFilled() {
    it('should back fill names and deletedAt dates into docs', async function () {
      const docs = await db.docs.find({}).toArray()
      expect(docs).to.deep.equal([
        { _id: docId1, deleted: true, name: 'doc1.tex', deletedAt: deletedAt1 },
        { _id: docId2, deleted: true, name: 'doc2.tex', deletedAt: deletedAt2 },
        { _id: docId3, deleted: true, name: 'doc3.tex', deletedAt: deletedAt3 },
      ])
    })
  }

  describe('back fill only', function () {
    beforeEach('run script', runScript)

    checkDocsBackFilled()

    it('should leave the deletedDocs as is', async function () {
      expect(await getDeletedDocs(projectId1)).to.deep.equal(deletedDocs1)
      expect(await getDeletedDocs(projectId2)).to.deep.equal(deletedDocs2)
    })
  })

  describe('back fill and cleanup', function () {
    beforeEach('run script with cleanup flag', async function () {
      await runScript(['--perform-cleanup'])
    })

    checkDocsBackFilled()

    it('should cleanup the deletedDocs', async function () {
      expect(await getDeletedDocs(projectId1)).to.deep.equal([])
      expect(await getDeletedDocs(projectId2)).to.deep.equal([])
    })
  })
})
