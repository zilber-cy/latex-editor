const logger = require('@overleaf/logger')
const OError = require('@overleaf/o-error')
const metrics = require('@overleaf/metrics')
const Settings = require('@overleaf/settings')
const { ObjectId } = require('mongodb')
const Features = require('../../infrastructure/Features')
const { Project } = require('../../models/Project')
const { Folder } = require('../../models/Folder')
const ProjectEntityUpdateHandler = require('./ProjectEntityUpdateHandler')
const ProjectDetailsHandler = require('./ProjectDetailsHandler')
const HistoryManager = require('../History/HistoryManager')
const { User } = require('../../models/User')
const fs = require('fs')
const path = require('path')
const { callbackify } = require('util')
const _ = require('underscore')
const AnalyticsManager = require('../Analytics/AnalyticsManager')
const TpdsUpdateSender = require('../ThirdPartyDataStore/TpdsUpdateSender')

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const templateProjectDir = Features.hasFeature('saas')
  ? 'example-project'
  : 'example-project-sp'

async function createBlankProject(
  ownerId,
  projectName,
  attributes = {},
  options
) {
  const isImport = attributes && attributes.overleaf
  const project = await _createBlankProject(
    ownerId,
    projectName,
    attributes,
    options
  )
  const segmentation = _.pick(attributes, [
    'fromV1TemplateId',
    'fromV1TemplateVersionId',
  ])
  Object.assign(segmentation, attributes.segmentation)
  segmentation.projectId = project._id
  if (isImport) {
    AnalyticsManager.recordEventForUser(
      ownerId,
      'project-imported',
      segmentation
    )
  } else {
    AnalyticsManager.recordEventForUser(
      ownerId,
      'project-created',
      segmentation
    )
  }
  return project
}

async function createProjectFromSnippet(ownerId, projectName, docLines) {
  const project = await _createBlankProject(ownerId, projectName)
  AnalyticsManager.recordEventForUser(ownerId, 'project-created', {
    projectId: project._id,
  })
  await _createRootDoc(project, ownerId, docLines)
  return project
}

async function createBasicProject(ownerId, projectName) {
  const project = await _createBlankProject(ownerId, projectName)

  const docLines = await _buildTemplate('mainbasic.tex', ownerId, projectName)
  await _createRootDoc(project, ownerId, docLines)

  AnalyticsManager.recordEventForUser(ownerId, 'project-created', {
    projectId: project._id,
  })

  return project
}

async function createExampleProject(ownerId, projectName) {
  const project = await _createBlankProject(ownerId, projectName)

  await _addExampleProjectFiles(ownerId, projectName, project)

  AnalyticsManager.recordEventForUser(ownerId, 'project-created', {
    projectId: project._id,
  })

  return project
}

async function _addExampleProjectFiles(ownerId, projectName, project) {
  const mainDocLines = await _buildTemplate(
    `${templateProjectDir}/main.tex`,
    ownerId,
    projectName
  )
  await _createRootDoc(project, ownerId, mainDocLines)
  //添加bib文件
  const bibDocLines = await _buildTemplate(
    `${templateProjectDir}/ref.bib`,
    ownerId,
    projectName
  )
  await ProjectEntityUpdateHandler.promises.addDoc(
    project._id,
    project.rootFolder[0]._id,
    'ref.bib',
    bibDocLines,
    ownerId,
    null
  )
  //添加cover文件
  const coverDocLines = await _buildTemplate(
    `${templateProjectDir}/cover.tex`,
    ownerId,
    projectName
  )
  await ProjectEntityUpdateHandler.promises.addDoc(
    project._id,
    project.rootFolder[0]._id,
    'cover.tex',
    coverDocLines,
    ownerId,
    null
  )
  //添加coverHead文件
  const coverHeadDocLines = await _buildTemplate(
    `${templateProjectDir}/CoverHead.tex`,
    ownerId,
    projectName
  )
  await ProjectEntityUpdateHandler.promises.addDoc(
    project._id,
    project.rootFolder[0]._id,
    'CoverHead.tex',
    coverHeadDocLines,
    ownerId,
    null
  )
  //添加reviewTable文件
  const reviewTableDocLines = await _buildTemplate(
    `${templateProjectDir}/ReviewTable.tex`,
    ownerId,
    projectName
  )
  await ProjectEntityUpdateHandler.promises.addDoc(
    project._id,
    project.rootFolder[0]._id,
    'ReviewTable.tex',
    reviewTableDocLines,
    ownerId,
    null
  )
  //添加reviewTableHead文件
  const reviewTableHeadDocLines = await _buildTemplate(
    `${templateProjectDir}/ReviewTableHead.tex`,
    ownerId,
    projectName
  )
  await ProjectEntityUpdateHandler.promises.addDoc(
    project._id,
    project.rootFolder[0]._id,
    'ReviewTableHead.tex',
    reviewTableHeadDocLines,
    ownerId,
    null
  )

  const badgePath = path.join(
    __dirname,
    `/../../../templates/project_files/${templateProjectDir}/badge.png`
  )
  await ProjectEntityUpdateHandler.promises.addFile(
    project._id,
    project.rootFolder[0]._id,
    'badge.png',
    badgePath,
    null,
    ownerId,
    null
  )
  const pkuPath = path.join(
    __dirname,
    `/../../../templates/project_files/${templateProjectDir}/pku.png`
  )
  await ProjectEntityUpdateHandler.promises.addFile(
    project._id,
    project.rootFolder[0]._id,
    'pku.png',
    pkuPath,
    null,
    ownerId,
    null
  )
  const samplePath = path.join(
    __dirname,
    `/../../../templates/project_files/${templateProjectDir}/Sample.jpg`
  )
  await ProjectEntityUpdateHandler.promises.addFile(
    project._id,
    project.rootFolder[0]._id,
    'Sample.jpg',
    samplePath,
    null,
    ownerId,
    null
  )
}

async function _createBlankProject(
  ownerId,
  projectName,
  attributes = {},
  { skipCreatingInTPDS = false } = {}
) {
  metrics.inc('project-creation')
  const timer = new metrics.Timer('project-creation')
  await ProjectDetailsHandler.promises.validateProjectName(projectName)

  const rootFolder = new Folder({ name: 'rootFolder' })

  attributes.lastUpdatedBy = attributes.owner_ref = new ObjectId(ownerId)
  attributes.name = projectName
  const project = new Project(attributes)

  // Initialise the history unless the caller has overridden it in the attributes
  // (to allow scripted creation of projects without full project history)
  if (project.overleaf.history.id == null && !attributes.overleaf) {
    const historyId = await HistoryManager.promises.initializeProject(
      project._id
    )
    if (historyId != null) {
      project.overleaf.history.id = historyId
    }
  }

  // All the projects are initialised with Full Project History. This property
  // is still set for backwards compatibility: Server Pro requires all projects
  // have it set to `true` since SP 4.0
  project.overleaf.history.display = true

  if (Settings.currentImageName) {
    // avoid clobbering any imageName already set in attributes (e.g. importedImageName)
    if (!project.imageName) {
      project.imageName = Settings.currentImageName
    }
  }
  project.rootFolder[0] = rootFolder
  const user = await User.findById(ownerId, 'ace.spellCheckLanguage')
  project.spellCheckLanguage = user.ace.spellCheckLanguage
  await project.save()
  if (!skipCreatingInTPDS) {
    await TpdsUpdateSender.promises.createProject({
      projectId: project._id,
      projectName,
      ownerId,
      userId: ownerId,
    })
  }
  timer.done()
  return project
}

async function _createRootDoc(project, ownerId, docLines) {
  try {
    const { doc } = await ProjectEntityUpdateHandler.promises.addDoc(
      project._id,
      project.rootFolder[0]._id,
      'main.tex',
      docLines,
      ownerId,
      null
    )
    await ProjectEntityUpdateHandler.promises.setRootDoc(project._id, doc._id)
  } catch (error) {
    throw OError.tag(error, 'error adding root doc when creating project')
  }
}

async function _buildTemplate(templateName, userId, projectName) {
  const user = await User.findById(userId, 'first_name last_name')

  const templatePath = path.join(
    __dirname,
    `/../../../templates/project_files/${templateName}`
  )
  const template = fs.readFileSync(templatePath)
  const data = {
    project_name: projectName,
    user,
    year: new Date().getUTCFullYear(),
    month: MONTH_NAMES[new Date().getUTCMonth()],
  }
  const output = _.template(template.toString())(data)
  return output.split('\n')
}

module.exports = {
  createBlankProject: callbackify(createBlankProject),
  createProjectFromSnippet: callbackify(createProjectFromSnippet),
  createBasicProject: callbackify(createBasicProject),
  createExampleProject: callbackify(createExampleProject),
  promises: {
    createBlankProject,
    createProjectFromSnippet,
    createBasicProject,
    createExampleProject,
  },
}

metrics.timeAsyncMethod(
  module.exports,
  'createBlankProject',
  'mongo.ProjectCreationHandler',
  logger
)
