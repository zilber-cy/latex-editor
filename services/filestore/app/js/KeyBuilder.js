const settings = require('@overleaf/settings')

module.exports = {
  getConvertedFolderKey,
  addCachingToKey,
  userFileKeyMiddleware,
  userProjectKeyMiddleware,
  publicFileKeyMiddleware,
  publicProjectKeyMiddleware,
  bucketFileKeyMiddleware,
  templateFileKeyMiddleware,
}

function getConvertedFolderKey(key) {
  return `${key}-converted-cache/`
}

function addCachingToKey(key, opts) {
  key = this.getConvertedFolderKey(key)

  if (opts.format && !opts.style) {
    key = `${key}format-${opts.format}`
  }
  if (opts.style && !opts.format) {
    key = `${key}style-${opts.style}`
  }
  if (opts.style && opts.format) {
    key = `${key}format-${opts.format}-style-${opts.style}`
  }

  return key
}

function userFileKeyMiddleware(req, res, next) {
  const { project_id: projectId, file_id: fileId } = req.params
  req.key = `${projectId}/${fileId}`
  req.bucket = settings.filestore.stores.user_files
  next()
}

function userProjectKeyMiddleware(req, res, next) {
  const { project_id: projectId } = req.params
  req.key = `${projectId}/`
  req.bucket = settings.filestore.stores.user_files
  next()
}

function publicFileKeyMiddleware(req, res, next) {
  if (settings.filestore.stores.public_files == null) {
    return res.status(501).send('public files not available')
  }

  const { project_id: projectId, public_file_id: publicFileId } = req.params
  req.key = `${projectId}/${publicFileId}`
  req.bucket = settings.filestore.stores.public_files

  next()
}

function bucketFileKeyMiddleware(req, res, next) {
  req.bucket = req.params.bucket
  req.key = req.params[0]
  next()
}

function templateFileKeyMiddleware(req, res, next) {
  const {
    template_id: templateId,
    format,
    version,
    sub_type: subType,
  } = req.params

  req.key = `${templateId}/v/${version}/${format}`

  if (subType) {
    req.key = `${req.key}/${subType}`
  }

  req.bucket = settings.filestore.stores.template_files
  req.version = version

  next()
}

function publicProjectKeyMiddleware(req, res, next) {
  const { project_id: projectId } = req.params

  req.project_id = projectId
  req.bucket = settings.filestore.stores.user_files

  next()
}
