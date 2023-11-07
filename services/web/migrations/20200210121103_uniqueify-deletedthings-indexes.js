/* eslint-disable no-unused-vars */

const Helpers = require('./lib/helpers')

exports.tags = ['server-ce', 'server-pro', 'saas']

exports.migrate = async client => {
  const { db } = client
  // deletedUsers did not have an index before
  await Helpers.dropIndexesFromCollection(db.deletedProjects, [
    {
      key: {
        'deleterData.deletedProjectId': 1,
      },
      name: 'deleterData.deletedProjectId_1',
    },
  ])
  // deletedUsers did not have an index before

  await Helpers.addIndexesToCollection(db.deletedProjects, [
    {
      key: {
        'deleterData.deletedProjectId': 1,
      },
      unique: true,
      name: 'deleterData.deletedProjectId_1',
    },
  ])
  await Helpers.addIndexesToCollection(db.deletedUsers, [
    {
      key: {
        'deleterData.deletedUserId': 1,
      },
      unique: true,
      name: 'deleterData.deleteUserId_1',
    },
  ])
}

exports.rollback = async client => {
  const { db } = client
  await Helpers.dropIndexesFromCollection(db.deletedProjects, [
    {
      key: {
        'deleterData.deletedProjectId': 1,
      },
      unique: true,
      name: 'deleterData.deletedProjectId_1',
    },
  ])
  await Helpers.dropIndexesFromCollection(db.deletedUsers, [
    {
      key: {
        'deleterData.deletedUserId': 1,
      },
      unique: true,
      name: 'deleterData.deleteUserId_1',
    },
  ])

  await Helpers.addIndexesToCollection(db.deletedProjects, [
    {
      key: {
        'deleterData.deletedProjectId': 1,
      },
      name: 'deleterData.deletedProjectId_1',
    },
  ])
  // deletedUsers did not have an index before
}
