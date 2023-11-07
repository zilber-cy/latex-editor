const AbstractMockApi = require('./AbstractMockApi')
const {
  plainTextResponse,
} = require('../../../../app/src/infrastructure/Response')

class MockFilestoreApi extends AbstractMockApi {
  reset() {
    this.files = {}
  }

  applyRoutes() {
    this.app.post('/project/:projectId/file/:fileId', (req, res) => {
      const chunks = []
      req.on('data', chunk => chunks.push(chunk))

      req.on('end', () => {
        const content = Buffer.concat(chunks).toString()
        const { projectId, fileId } = req.params
        if (!this.files[projectId]) {
          this.files[projectId] = {}
        }
        this.files[projectId][fileId] = { content }
        res.sendStatus(200)
      })
    })

    this.app.get('/project/:projectId/file/:fileId', (req, res) => {
      const { projectId, fileId } = req.params
      const { content } = this.files[projectId][fileId]
      plainTextResponse(res, content)
    })

    // handle file copying
    this.app.put('/project/:projectId/file/:fileId', (req, res) => {
      const { projectId, fileId } = req.params
      const { source } = req.body
      const { content } =
        this.files[source.project_id] &&
        this.files[source.project_id][source.file_id]
      if (!content) {
        res.sendStatus(500)
      } else {
        if (!this.files[projectId]) {
          this.files[projectId] = {}
        }
        this.files[projectId][fileId] = { content }
        res.sendStatus(200)
      }
    })

    this.app.delete('/project/:projectId', (req, res) => {
      const { projectId } = req.params
      delete this.files[projectId]
      res.sendStatus(204)
    })
  }

  getFile(projectId, fileId) {
    return (
      this.files[projectId] &&
      this.files[projectId][fileId] &&
      this.files[projectId][fileId].content
    )
  }
}

module.exports = MockFilestoreApi

// type hint for the inherited `instance` method
/**
 * @function instance
 * @memberOf MockFilestoreApi
 * @static
 * @returns {MockFilestoreApi}
 */
