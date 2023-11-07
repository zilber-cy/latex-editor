let ProjectZipStreamManager
const archiver = require('archiver')
const async = require('async')
const logger = require('@overleaf/logger')
const ProjectEntityHandler = require('../Project/ProjectEntityHandler')
const ProjectGetter = require('../Project/ProjectGetter')
const FileStoreHandler = require('../FileStore/FileStoreHandler')

module.exports = ProjectZipStreamManager = {
  createZipStreamForMultipleProjects(projectIds, callback) {
    // We'll build up a zip file that contains multiple zip files
    const archive = archiver('zip')
    archive.on('error', err =>
      logger.err(
        { err, projectIds },
        'something went wrong building archive of project'
      )
    )
    callback(null, archive)

    const jobs = projectIds.map(projectId => cb => {
      ProjectGetter.getProject(projectId, { name: true }, (error, project) => {
        if (error) {
          return cb(error)
        }
        if (!project) {
          logger.debug(
            { projectId },
            'cannot append project to zip stream: project not found'
          )
          return cb()
        }
        logger.debug(
          { projectId, name: project.name },
          'appending project to zip stream'
        )
        ProjectZipStreamManager.createZipStreamForProject(
          projectId,
          (error, stream) => {
            if (error) {
              return cb(error)
            }
            archive.append(stream, { name: `${project.name}.zip` })
            stream.on('end', () => {
              logger.debug(
                { projectId, name: project.name },
                'zip stream ended'
              )
              cb()
            })
          }
        )
      })
    })

    async.series(jobs, () => {
      logger.debug(
        { projectIds },
        'finished creating zip stream of multiple projects'
      )
      archive.finalize()
    })
  },

  createZipStreamForProject(projectId, callback) {
    const archive = archiver('zip')
    // return stream immediately before we start adding things to it
    archive.on('error', err =>
      logger.err(
        { err, projectId },
        'something went wrong building archive of project'
      )
    )
    callback(null, archive)
    this.addAllDocsToArchive(projectId, archive, error => {
      if (error) {
        logger.error(
          { err: error, projectId },
          'error adding docs to zip stream'
        )
      }
      this.addAllFilesToArchive(projectId, archive, error => {
        if (error) {
          logger.error(
            { err: error, projectId },
            'error adding files to zip stream'
          )
        }
        archive.finalize()
      })
    })
  },

  addAllDocsToArchive(projectId, archive, callback) {
    ProjectEntityHandler.getAllDocs(projectId, (error, docs) => {
      if (error) {
        return callback(error)
      }
      const jobs = Object.entries(docs).map(([path, doc]) => cb => {
        if (path[0] === '/') {
          path = path.slice(1)
        }
        logger.debug({ projectId }, 'Adding doc')
        archive.append(doc.lines.join('\n'), { name: path })
        setImmediate(cb)
      })
      async.series(jobs, callback)
    })
  },

  addAllFilesToArchive(projectId, archive, callback) {
    ProjectEntityHandler.getAllFiles(projectId, (error, files) => {
      if (error) {
        return callback(error)
      }
      const jobs = Object.entries(files).map(([path, file]) => cb => {
        FileStoreHandler.getFileStream(
          projectId,
          file._id,
          {},
          (error, stream) => {
            if (error) {
              logger.warn(
                { err: error, projectId, fileId: file._id },
                'something went wrong adding file to zip archive'
              )
              return cb(error)
            }
            if (path[0] === '/') {
              path = path.slice(1)
            }
            archive.append(stream, { name: path })
            stream.on('end', () => cb())
          }
        )
      })
      async.parallelLimit(jobs, 5, callback)
    })
  },
}
