const { callbackify } = require('util')
const Path = require('path')
const OError = require('@overleaf/o-error')
const { promiseMapWithLimit } = require('../../util/promises')
const { Doc } = require('../../models/Doc')
const { File } = require('../../models/File')
const DocstoreManager = require('../Docstore/DocstoreManager')
const DocumentUpdaterHandler = require('../DocumentUpdater/DocumentUpdaterHandler')
const FileStoreHandler = require('../FileStore/FileStoreHandler')
const ProjectCreationHandler = require('./ProjectCreationHandler')
const ProjectDeleter = require('./ProjectDeleter')
const ProjectEntityMongoUpdateHandler = require('./ProjectEntityMongoUpdateHandler')
const ProjectEntityUpdateHandler = require('./ProjectEntityUpdateHandler')
const ProjectGetter = require('./ProjectGetter')
const ProjectLocator = require('./ProjectLocator')
const ProjectOptionsHandler = require('./ProjectOptionsHandler')
const SafePath = require('./SafePath')
const TpdsProjectFlusher = require('../ThirdPartyDataStore/TpdsProjectFlusher')
const _ = require('lodash')

module.exports = {
  duplicate: callbackify(duplicate),
  promises: {
    duplicate,
  },
}

async function duplicate(owner, originalProjectId, newProjectName) {
  await DocumentUpdaterHandler.promises.flushProjectToMongo(originalProjectId)
  const originalProject = await ProjectGetter.promises.getProject(
    originalProjectId,
    {
      compiler: true,
      rootFolder: true,
      rootDoc_id: true,
      fromV1TemplateId: true,
      fromV1TemplateVersionId: true,
    }
  )
  const { path: rootDocPath } = await ProjectLocator.promises.findRootDoc({
    project_id: originalProjectId,
  })

  const originalEntries = _getFolderEntries(originalProject.rootFolder[0])

  // Pass template ID as analytics segmentation if duplicating project from a template
  const segmentation = _.pick(originalProject, [
    'fromV1TemplateId',
    'fromV1TemplateVersionId',
  ])
  segmentation.duplicatedFromProject = originalProjectId

  // remove any leading or trailing spaces
  newProjectName = newProjectName.trim()

  // Now create the new project, cleaning it up on failure if necessary
  const newProject = await ProjectCreationHandler.promises.createBlankProject(
    owner._id,
    newProjectName,
    { segmentation }
  )

  try {
    await ProjectOptionsHandler.promises.setCompiler(
      newProject._id,
      originalProject.compiler
    )
    const [docEntries, fileEntries] = await Promise.all([
      _copyDocs(originalEntries.docEntries, originalProject, newProject),
      _copyFiles(originalEntries.fileEntries, originalProject, newProject),
    ])
    const projectVersion =
      await ProjectEntityMongoUpdateHandler.promises.createNewFolderStructure(
        newProject._id,
        docEntries,
        fileEntries
      )
    // Silently ignore the rootDoc in case it's not valid per the new limits.
    if (
      rootDocPath &&
      ProjectEntityUpdateHandler.isPathValidForRootDoc(rootDocPath.fileSystem)
    ) {
      await _setRootDoc(newProject._id, rootDocPath.fileSystem)
    }
    await _notifyDocumentUpdater(newProject, owner._id, {
      newFiles: fileEntries,
      newDocs: docEntries,
      newProject: { version: projectVersion },
    })
    await TpdsProjectFlusher.promises.flushProjectToTpds(newProject._id)
  } catch (err) {
    // Clean up broken clone on error.
    // Make sure we delete the new failed project, not the original one!
    await ProjectDeleter.promises.deleteProject(newProject._id)
    throw OError.tag(err, 'error cloning project, broken clone deleted', {
      originalProjectId,
      newProjectName,
      newProjectId: newProject._id,
    })
  }
  return newProject
}

function _getFolderEntries(folder, folderPath = '/') {
  const docEntries = []
  const fileEntries = []
  const docs = folder.docs || []
  const files = folder.fileRefs || []
  const subfolders = folder.folders || []

  for (const doc of docs) {
    if (doc == null || doc._id == null) {
      continue
    }
    const path = Path.join(folderPath, doc.name)
    docEntries.push({ doc, path })
  }

  for (const file of files) {
    if (file == null || file._id == null) {
      continue
    }
    const path = Path.join(folderPath, file.name)
    fileEntries.push({ file, path })
  }

  for (const subfolder of subfolders) {
    if (subfolder == null || subfolder._id == null) {
      continue
    }
    const subfolderPath = Path.join(folderPath, subfolder.name)
    const subfolderEntries = _getFolderEntries(subfolder, subfolderPath)
    for (const docEntry of subfolderEntries.docEntries) {
      docEntries.push(docEntry)
    }
    for (const fileEntry of subfolderEntries.fileEntries) {
      fileEntries.push(fileEntry)
    }
  }
  return { docEntries, fileEntries }
}

async function _copyDocs(sourceEntries, sourceProject, targetProject) {
  const docLinesById = await _getDocLinesForProject(sourceProject._id)
  const targetEntries = []
  for (const sourceEntry of sourceEntries) {
    const sourceDoc = sourceEntry.doc
    const path = sourceEntry.path
    const doc = new Doc({ name: sourceDoc.name })
    const docLines = docLinesById.get(sourceDoc._id.toString())
    await DocstoreManager.promises.updateDoc(
      targetProject._id.toString(),
      doc._id.toString(),
      docLines,
      0,
      {}
    )
    targetEntries.push({ doc, path, docLines: docLines.join('\n') })
  }
  return targetEntries
}

async function _getDocLinesForProject(projectId) {
  const docs = await DocstoreManager.promises.getAllDocs(projectId)
  const docLinesById = new Map(docs.map(doc => [doc._id, doc.lines]))
  return docLinesById
}

async function _copyFiles(sourceEntries, sourceProject, targetProject) {
  const targetEntries = await promiseMapWithLimit(
    5,
    sourceEntries,
    async sourceEntry => {
      const sourceFile = sourceEntry.file
      const path = sourceEntry.path
      const file = new File({ name: SafePath.clean(sourceFile.name) })
      if (sourceFile.linkedFileData != null) {
        file.linkedFileData = sourceFile.linkedFileData
      }
      if (sourceFile.hash != null) {
        file.hash = sourceFile.hash
      }
      const url = await FileStoreHandler.promises.copyFile(
        sourceProject._id,
        sourceFile._id,
        targetProject._id,
        file._id
      )
      return { file, path, url }
    }
  )
  return targetEntries
}

async function _setRootDoc(projectId, path) {
  const { element: rootDoc } = await ProjectLocator.promises.findElementByPath({
    project_id: projectId,
    path,
    exactCaseMatch: true,
  })
  await ProjectEntityUpdateHandler.promises.setRootDoc(projectId, rootDoc._id)
}

async function _notifyDocumentUpdater(project, userId, changes) {
  const projectHistoryId =
    project.overleaf && project.overleaf.history && project.overleaf.history.id
  await DocumentUpdaterHandler.promises.updateProjectStructure(
    project._id,
    projectHistoryId,
    userId,
    changes,
    null
  )
}
