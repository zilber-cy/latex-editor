const { exec } = require('child_process')
const { promisify } = require('util')
const { expect } = require('chai')
const logger = require('@overleaf/logger')
const { filterOutput } = require('./helpers/settings')
const { db, ObjectId } = require('../../../app/src/infrastructure/mongodb')

const DUMMY_NAME = 'unknown.tex'
const DUMMY_TIME = new Date('2021-04-12T00:00:00.000Z')
const ONE_DAY_IN_S = 60 * 60 * 24
const BATCH_SIZE = 3

function getObjectIdFromDate(date) {
  const seconds = new Date(date).getTime() / 1000
  return ObjectId.createFromTime(seconds)
}

describe('BackFillDummyDocMeta', function () {
  let docIds
  let projectIds
  let stopAtSeconds
  beforeEach('create docs', async function () {
    docIds = []
    docIds[0] = getObjectIdFromDate('2021-04-01T00:00:00.000Z')
    docIds[1] = getObjectIdFromDate('2021-04-02T00:00:00.000Z')
    docIds[2] = getObjectIdFromDate('2021-04-11T00:00:00.000Z')
    docIds[3] = getObjectIdFromDate('2021-04-12T00:00:00.000Z')
    docIds[4] = getObjectIdFromDate('2021-04-13T00:00:00.000Z')
    docIds[5] = getObjectIdFromDate('2021-04-14T00:00:00.000Z')
    docIds[6] = getObjectIdFromDate('2021-04-15T00:00:00.000Z')
    docIds[7] = getObjectIdFromDate('2021-04-16T00:01:00.000Z')
    docIds[8] = getObjectIdFromDate('2021-04-16T00:02:00.000Z')
    docIds[9] = getObjectIdFromDate('2021-04-16T00:03:00.000Z')
    docIds[10] = getObjectIdFromDate('2021-04-16T00:04:00.000Z')
    docIds[11] = getObjectIdFromDate('2021-04-16T00:05:00.000Z')

    projectIds = []
    projectIds[0] = getObjectIdFromDate('2021-04-01T00:00:00.000Z')
    projectIds[1] = getObjectIdFromDate('2021-04-02T00:00:00.000Z')
    projectIds[2] = getObjectIdFromDate('2021-04-11T00:00:00.000Z')
    projectIds[3] = getObjectIdFromDate('2021-04-12T00:00:00.000Z')
    projectIds[4] = getObjectIdFromDate('2021-04-13T00:00:00.000Z')
    projectIds[5] = getObjectIdFromDate('2021-04-14T00:00:00.000Z')
    projectIds[6] = getObjectIdFromDate('2021-04-15T00:00:00.000Z')
    projectIds[7] = getObjectIdFromDate('2021-04-16T00:01:00.000Z')
    projectIds[8] = getObjectIdFromDate('2021-04-16T00:02:00.000Z')
    projectIds[9] = getObjectIdFromDate('2021-04-16T00:03:00.000Z')
    // two docs in the same project
    projectIds[10] = projectIds[9]
    projectIds[11] = projectIds[4]

    stopAtSeconds = new Date('2021-04-17T00:00:00.000Z').getTime() / 1000
  })
  const now = new Date()
  beforeEach('insert doc stubs into docs collection', async function () {
    await db.docs.insertMany([
      // incomplete, without deletedDocs context
      { _id: docIds[0], project_id: projectIds[0], deleted: true },
      { _id: docIds[1], project_id: projectIds[1], deleted: true },
      { _id: docIds[2], project_id: projectIds[2], deleted: true },
      { _id: docIds[3], project_id: projectIds[3], deleted: true },
      // incomplete, with deletedDocs context
      { _id: docIds[4], project_id: projectIds[4], deleted: true },
      // complete
      {
        _id: docIds[5],
        project_id: projectIds[5],
        deleted: true,
        name: 'foo.tex',
        deletedAt: now,
      },
      // not deleted
      { _id: docIds[6], project_id: projectIds[6] },
      // multiple in a single batch
      { _id: docIds[7], project_id: projectIds[7], deleted: true },
      { _id: docIds[8], project_id: projectIds[8], deleted: true },
      { _id: docIds[9], project_id: projectIds[9], deleted: true },
      // two docs in one project
      { _id: docIds[10], project_id: projectIds[10], deleted: true },
      { _id: docIds[11], project_id: projectIds[11], deleted: true },
    ])
  })
  beforeEach('insert deleted project context', async function () {
    await db.deletedProjects.insertMany([
      // projectIds[0] and projectIds[1] have no entry

      // hard-deleted
      { deleterData: { deletedProjectId: projectIds[2] } },
      // soft-deleted, no entry for doc
      {
        deleterData: { deletedProjectId: projectIds[3] },
        project: { deletedDocs: [] },
      },
      // soft-deleted, has entry for doc
      {
        deleterData: { deletedProjectId: projectIds[4] },
        project: {
          deletedDocs: [
            { _id: docIds[4], name: 'main.tex', deletedAt: now },
            { _id: docIds[11], name: 'main.tex', deletedAt: now },
          ],
        },
      },
    ])
  })

  let options
  async function runScript(dryRun) {
    options = {
      BATCH_SIZE,
      CACHE_SIZE: 100,
      DRY_RUN: dryRun,
      FIRST_PROJECT_ID: projectIds[0].toString(),
      INCREMENT_BY_S: ONE_DAY_IN_S,
      STOP_AT_S: stopAtSeconds,
      // start right away
      LET_USER_DOUBLE_CHECK_INPUTS_FOR: 1,
    }
    let result
    try {
      result = await promisify(exec)(
        Object.entries(options)
          .map(([key, value]) => `${key}=${value}`)
          .concat(['node', 'scripts/back_fill_dummy_doc_meta.js'])
          .join(' ')
      )
    } catch (error) {
      // dump details like exit code, stdErr and stdOut
      logger.error({ error }, 'script failed')
      throw error
    }
    let { stderr: stdErr, stdout: stdOut } = result
    stdErr = stdErr.split('\n')
    stdOut = stdOut.split('\n').filter(filterOutput)

    expect(stdOut.filter(filterOutput)).to.include.members([
      `Orphaned deleted doc ${docIds[0]} (no deletedProjects entry)`,
      `Orphaned deleted doc ${docIds[1]} (no deletedProjects entry)`,
      `Orphaned deleted doc ${docIds[2]} (failed hard deletion)`,
      `Missing deletedDoc for ${docIds[3]}`,
      `Found deletedDoc for ${docIds[4]}`,
      `Found deletedDoc for ${docIds[11]}`,
      `Orphaned deleted doc ${docIds[7]} (no deletedProjects entry)`,
      `Orphaned deleted doc ${docIds[8]} (no deletedProjects entry)`,
      `Orphaned deleted doc ${docIds[9]} (no deletedProjects entry)`,
      `Orphaned deleted doc ${docIds[10]} (no deletedProjects entry)`,
    ])
    expect(stdErr.filter(filterOutput)).to.include.members([
      `Processed 9 until ${projectIds[9]}`,
      'Done.',
    ])
  }

  describe('DRY_RUN=true', function () {
    beforeEach('run script', async function () {
      await runScript(true)
    })

    it('should leave docs as is', async function () {
      const docs = await db.docs.find({}).toArray()
      expect(docs).to.deep.equal([
        { _id: docIds[0], project_id: projectIds[0], deleted: true },
        { _id: docIds[1], project_id: projectIds[1], deleted: true },
        { _id: docIds[2], project_id: projectIds[2], deleted: true },
        { _id: docIds[3], project_id: projectIds[3], deleted: true },
        { _id: docIds[4], project_id: projectIds[4], deleted: true },
        {
          _id: docIds[5],
          project_id: projectIds[5],
          deleted: true,
          name: 'foo.tex',
          deletedAt: now,
        },
        { _id: docIds[6], project_id: projectIds[6] },
        { _id: docIds[7], project_id: projectIds[7], deleted: true },
        { _id: docIds[8], project_id: projectIds[8], deleted: true },
        { _id: docIds[9], project_id: projectIds[9], deleted: true },
        { _id: docIds[10], project_id: projectIds[10], deleted: true },
        { _id: docIds[11], project_id: projectIds[11], deleted: true },
      ])
    })
  })

  describe('DRY_RUN=false', function () {
    beforeEach('run script', async function () {
      await runScript(false)
    })

    it('should back fill name and deletedAt dates into broken docs', async function () {
      const docs = await db.docs.find({}).toArray()
      expect(docs).to.deep.equal([
        {
          _id: docIds[0],
          project_id: projectIds[0],
          deleted: true,
          name: DUMMY_NAME,
          deletedAt: DUMMY_TIME,
        },
        {
          _id: docIds[1],
          project_id: projectIds[1],
          deleted: true,
          name: DUMMY_NAME,
          deletedAt: DUMMY_TIME,
        },
        {
          _id: docIds[2],
          project_id: projectIds[2],
          deleted: true,
          name: DUMMY_NAME,
          deletedAt: DUMMY_TIME,
        },
        {
          _id: docIds[3],
          project_id: projectIds[3],
          deleted: true,
          name: DUMMY_NAME,
          deletedAt: DUMMY_TIME,
        },
        {
          _id: docIds[4],
          project_id: projectIds[4],
          deleted: true,
          name: 'main.tex',
          deletedAt: now,
        },
        {
          _id: docIds[5],
          project_id: projectIds[5],
          deleted: true,
          name: 'foo.tex',
          deletedAt: now,
        },
        { _id: docIds[6], project_id: projectIds[6] },
        {
          _id: docIds[7],
          project_id: projectIds[7],
          deleted: true,
          name: DUMMY_NAME,
          deletedAt: DUMMY_TIME,
        },
        {
          _id: docIds[8],
          project_id: projectIds[8],
          deleted: true,
          name: DUMMY_NAME,
          deletedAt: DUMMY_TIME,
        },
        {
          _id: docIds[9],
          project_id: projectIds[9],
          deleted: true,
          name: DUMMY_NAME,
          deletedAt: DUMMY_TIME,
        },
        {
          _id: docIds[10],
          project_id: projectIds[10],
          deleted: true,
          name: DUMMY_NAME,
          deletedAt: DUMMY_TIME,
        },
        {
          _id: docIds[11],
          project_id: projectIds[11],
          deleted: true,
          name: 'main.tex',
          deletedAt: now,
        },
      ])
    })
  })
})
