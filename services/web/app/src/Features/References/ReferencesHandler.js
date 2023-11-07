/* eslint-disable
    n/handle-callback-err,
    max-len,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let ReferencesHandler
const OError = require('@overleaf/o-error')
const logger = require('@overleaf/logger')
const request = require('request')
const settings = require('@overleaf/settings')
const Features = require('../../infrastructure/Features')
const ProjectGetter = require('../Project/ProjectGetter')
const UserGetter = require('../User/UserGetter')
const DocumentUpdaterHandler = require('../DocumentUpdater/DocumentUpdaterHandler')
const _ = require('underscore')
const Async = require('async')
const Errors = require('../Errors/Errors')

const oneMinInMs = 60 * 1000
const fiveMinsInMs = oneMinInMs * 5

if (!Features.hasFeature('references')) {
  logger.debug('references search not enabled')
}

module.exports = ReferencesHandler = {
  _buildDocUrl(projectId, docId) {
    return `${settings.apis.docstore.url}/project/${projectId}/doc/${docId}/raw`
  },

  _buildFileUrl(projectId, fileId) {
    return `${settings.apis.filestore.url}/project/${projectId}/file/${fileId}`
  },

  _findBibFileIds(project) {
    const ids = []
    function _process(folder) {
      _.each(folder.fileRefs || [], function (file) {
        if (
          __guard__(file != null ? file.name : undefined, x1 =>
            x1.match(/^.*\.bib$/)
          )
        ) {
          return ids.push(file._id)
        }
      })
      return _.each(folder.folders || [], folder => _process(folder))
    }
    _.each(project.rootFolder || [], rootFolder => _process(rootFolder))
    return ids
  },

  _findBibDocIds(project) {
    const ids = []
    function _process(folder) {
      _.each(folder.docs || [], function (doc) {
        if (
          __guard__(doc != null ? doc.name : undefined, x1 =>
            x1.match(/^.*\.bib$/)
          )
        ) {
          return ids.push(doc._id)
        }
      })
      return _.each(folder.folders || [], folder => _process(folder))
    }
    _.each(project.rootFolder || [], rootFolder => _process(rootFolder))
    return ids
  },

  _isFullIndex(project, callback) {
    if (callback == null) {
      callback = function () {}
    }
    return UserGetter.getUser(
      project.owner_ref,
      { features: true },
      function (err, owner) {
        if (err != null) {
          return callback(err)
        }
        const features = owner != null ? owner.features : undefined
        return callback(
          null,
          (features != null ? features.references : undefined) === true ||
            (features != null ? features.referencesSearch : undefined) === true
        )
      }
    )
  },

  indexAll(projectId, callback) {
    if (callback == null) {
      callback = function () {}
    }
    return ProjectGetter.getProject(
      projectId,
      { rootFolder: true, owner_ref: 1 },
      function (err, project) {
        if (err) {
          OError.tag(err, 'error finding project', {
            projectId,
          })
          return callback(err)
        }
        if (!project) {
          return callback(
            new Errors.NotFoundError(`project does not exist: ${projectId}`)
          )
        }
        logger.debug({ projectId }, 'indexing all bib files in project')
        const docIds = ReferencesHandler._findBibDocIds(project)
        const fileIds = ReferencesHandler._findBibFileIds(project)
        return ReferencesHandler._doIndexOperation(
          projectId,
          project,
          docIds,
          fileIds,
          callback
        )
      }
    )
  },

  index(projectId, docIds, callback) {
    if (callback == null) {
      callback = function () {}
    }
    return ProjectGetter.getProject(
      projectId,
      { rootFolder: true, owner_ref: 1 },
      function (err, project) {
        if (err) {
          OError.tag(err, 'error finding project', {
            projectId,
          })
          return callback(err)
        }
        if (!project) {
          return callback(
            new Errors.NotFoundError(`project does not exist: ${projectId}`)
          )
        }
        return ReferencesHandler._doIndexOperation(
          projectId,
          project,
          docIds,
          [],
          callback
        )
      }
    )
  },

  _doIndexOperation(projectId, project, docIds, fileIds, callback) {
    if (!Features.hasFeature('references')) {
      return callback()
    }
    return ReferencesHandler._isFullIndex(project, function (err, isFullIndex) {
      if (err) {
        OError.tag(err, 'error checking whether to do full index', {
          projectId,
        })
        return callback(err)
      }
      logger.debug(
        { projectId, docIds },
        'flushing docs to mongo before calling references service'
      )
      return Async.series(
        docIds.map(
          docId => cb =>
            DocumentUpdaterHandler.flushDocToMongo(projectId, docId, cb)
        ),
        function (err) {
          // continue
          if (err) {
            OError.tag(err, 'error flushing docs to mongo', {
              projectId,
              docIds,
            })
            return callback(err)
          }
          const bibDocUrls = docIds.map(docId =>
            ReferencesHandler._buildDocUrl(projectId, docId)
          )
          const bibFileUrls = fileIds.map(fileId =>
            ReferencesHandler._buildFileUrl(projectId, fileId)
          )
          const allUrls = bibDocUrls.concat(bibFileUrls)
          return request.post(
            {
              url: `${settings.apis.references.url}/project/${projectId}/index`,
              json: {
                docUrls: allUrls,
                fullIndex: isFullIndex,
              },
            },
            function (err, res, data) {
              if (err) {
                OError.tag(err, 'error communicating with references api', {
                  projectId,
                })
                return callback(err)
              }
              if (res.statusCode >= 200 && res.statusCode < 300) {
                logger.debug({ projectId }, 'got keys from references api')
                return callback(null, data)
              } else {
                err = new Error(
                  `references api responded with non-success code: ${res.statusCode}`
                )
                return callback(err)
              }
            }
          )
        }
      )
    })
  },
}

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined
}
