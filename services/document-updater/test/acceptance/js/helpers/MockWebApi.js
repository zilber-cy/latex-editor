/* eslint-disable
    no-return-assign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let MockWebApi
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const MAX_REQUEST_SIZE = 2 * (2 * 1024 * 1024 + 64 * 1024)

module.exports = MockWebApi = {
  docs: {},

  clearDocs() {
    return (this.docs = {})
  },

  insertDoc(projectId, docId, doc) {
    if (doc.version == null) {
      doc.version = 0
    }
    if (doc.lines == null) {
      doc.lines = []
    }
    doc.pathname = '/a/b/c.tex'
    return (this.docs[`${projectId}:${docId}`] = doc)
  },

  setDocument(
    projectId,
    docId,
    lines,
    version,
    ranges,
    lastUpdatedAt,
    lastUpdatedBy,
    callback
  ) {
    if (callback == null) {
      callback = function () {}
    }
    const doc =
      this.docs[`${projectId}:${docId}`] ||
      (this.docs[`${projectId}:${docId}`] = {})
    doc.lines = lines
    doc.version = version
    doc.ranges = ranges
    doc.pathname = '/a/b/c.tex'
    doc.lastUpdatedAt = lastUpdatedAt
    doc.lastUpdatedBy = lastUpdatedBy
    return callback(null)
  },

  getDocument(projectId, docId, callback) {
    if (callback == null) {
      callback = function () {}
    }
    return callback(null, this.docs[`${projectId}:${docId}`])
  },

  run() {
    app.get('/project/:project_id/doc/:doc_id', (req, res, next) => {
      return this.getDocument(
        req.params.project_id,
        req.params.doc_id,
        (error, doc) => {
          if (error != null) {
            return res.sendStatus(500)
          } else if (doc != null) {
            return res.send(JSON.stringify(doc))
          } else {
            return res.sendStatus(404)
          }
        }
      )
    })

    app.post(
      '/project/:project_id/doc/:doc_id',
      bodyParser.json({ limit: MAX_REQUEST_SIZE }),
      (req, res, next) => {
        return MockWebApi.setDocument(
          req.params.project_id,
          req.params.doc_id,
          req.body.lines,
          req.body.version,
          req.body.ranges,
          req.body.lastUpdatedAt,
          req.body.lastUpdatedBy,
          error => {
            if (error != null) {
              return res.sendStatus(500)
            } else {
              return res.json({ rev: '123' })
            }
          }
        )
      }
    )

    return app
      .listen(3000, error => {
        if (error != null) {
          throw error
        }
      })
      .on('error', error => {
        console.error('error starting MockWebApi:', error.message)
        return process.exit(1)
      })
  },
}

MockWebApi.run()
