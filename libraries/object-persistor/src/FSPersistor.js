const crypto = require('crypto')
const fs = require('fs')
const fsPromises = require('fs/promises')
const globCallbacks = require('glob')
const Path = require('path')
const { pipeline } = require('stream/promises')
const { promisify } = require('util')

const AbstractPersistor = require('./AbstractPersistor')
const { ReadError, WriteError } = require('./Errors')
const PersistorHelper = require('./PersistorHelper')

const glob = promisify(globCallbacks)

module.exports = class FSPersistor extends AbstractPersistor {
  constructor(settings = {}) {
    super()
    this.useSubdirectories = Boolean(settings.useSubdirectories)
    this.metrics = settings.Metrics
  }

  async sendFile(location, target, source) {
    // actually copy the file (instead of moving it) to maintain consistent behaviour
    // between the different implementations
    try {
      const sourceStream = fs.createReadStream(source)
      await this.sendStream(location, target, sourceStream)
    } catch (err) {
      throw PersistorHelper.wrapError(
        err,
        'failed to copy the specified file',
        { location, target, source },
        WriteError
      )
    }
  }

  async sendStream(location, target, sourceStream, opts = {}) {
    const targetPath = this._getFsPath(location, target)

    try {
      await this._ensureDirectoryExists(targetPath)
      const tempFilePath = await this._writeStreamToTempFile(
        location,
        sourceStream,
        opts
      )

      try {
        await fsPromises.rename(tempFilePath, targetPath)
      } finally {
        await this._cleanupTempFile(tempFilePath)
      }
    } catch (err) {
      throw PersistorHelper.wrapError(
        err,
        'failed to write stream',
        { location, target },
        WriteError
      )
    }
  }

  // opts may be {start: Number, end: Number}
  async getObjectStream(location, name, opts = {}) {
    const fsPath = this._getFsPath(location, name)

    try {
      opts.fd = await fsPromises.open(fsPath, 'r')
    } catch (err) {
      throw PersistorHelper.wrapError(
        err,
        'failed to open file for streaming',
        { location, name, fsPath, opts },
        ReadError
      )
    }

    return fs.createReadStream(null, opts)
  }

  async getRedirectUrl() {
    // not implemented
    return null
  }

  async getObjectSize(location, filename) {
    const fsPath = this._getFsPath(location, filename)

    try {
      const stat = await fsPromises.stat(fsPath)
      return stat.size
    } catch (err) {
      throw PersistorHelper.wrapError(
        err,
        'failed to stat file',
        { location, filename },
        ReadError
      )
    }
  }

  async getObjectMd5Hash(location, filename) {
    const fsPath = this._getFsPath(location, filename)
    try {
      const stream = fs.createReadStream(fsPath)
      const hash = await PersistorHelper.calculateStreamMd5(stream)
      return hash
    } catch (err) {
      throw new ReadError(
        'unable to get md5 hash from file',
        { location, filename },
        err
      )
    }
  }

  async copyObject(location, source, target) {
    const sourceFsPath = this._getFsPath(location, source)
    const targetFsPath = this._getFsPath(location, target)

    try {
      await this._ensureDirectoryExists(targetFsPath)
      await fsPromises.copyFile(sourceFsPath, targetFsPath)
    } catch (err) {
      throw PersistorHelper.wrapError(
        err,
        'failed to copy file',
        { location, source, target, sourceFsPath, targetFsPath },
        WriteError
      )
    }
  }

  async deleteObject(location, name) {
    const fsPath = this._getFsPath(location, name)
    try {
      // S3 doesn't give us a 404 when a file wasn't there to be deleted, so we
      // should be consistent here as well
      await fsPromises.rm(fsPath, { force: true })
    } catch (err) {
      throw PersistorHelper.wrapError(
        err,
        'failed to delete file',
        { location, name, fsPath },
        WriteError
      )
    }
  }

  async deleteDirectory(location, name) {
    const fsPath = this._getFsPath(location, name)

    try {
      if (this.useSubdirectories) {
        await fsPromises.rm(fsPath, { recursive: true, force: true })
      } else {
        const files = await this._listDirectory(fsPath)
        for (const file of files) {
          await fsPromises.rm(file, { force: true })
        }
      }
    } catch (err) {
      throw PersistorHelper.wrapError(
        err,
        'failed to delete directory',
        { location, name, fsPath },
        WriteError
      )
    }
  }

  async checkIfObjectExists(location, name) {
    const fsPath = this._getFsPath(location, name)
    try {
      const stat = await fsPromises.stat(fsPath)
      return !!stat
    } catch (err) {
      if (err.code === 'ENOENT') {
        return false
      }
      throw PersistorHelper.wrapError(
        err,
        'failed to stat file',
        { location, name, fsPath },
        ReadError
      )
    }
  }

  // note, does not recurse into subdirectories, as we use a flattened directory structure
  async directorySize(location, name) {
    const fsPath = this._getFsPath(location, name)
    let size = 0

    try {
      const files = await this._listDirectory(fsPath)
      for (const file of files) {
        try {
          const stat = await fsPromises.stat(file)
          if (stat.isFile()) {
            size += stat.size
          }
        } catch (err) {
          // ignore files that may have just been deleted
          if (err.code !== 'ENOENT') {
            throw err
          }
        }
      }
    } catch (err) {
      throw PersistorHelper.wrapError(
        err,
        'failed to get directory size',
        { location, name },
        ReadError
      )
    }

    return size
  }

  async _writeStreamToTempFile(location, stream, opts = {}) {
    const tempDirPath = await fsPromises.mkdtemp(Path.join(location, 'tmp-'))
    const tempFilePath = Path.join(tempDirPath, 'uploaded-file')

    const transforms = []
    let md5Observer
    if (opts.sourceMd5) {
      md5Observer = createMd5Observer()
      transforms.push(md5Observer.transform)
    }

    let timer
    if (this.metrics) {
      timer = new this.metrics.Timer('writingFile')
    }

    try {
      const writeStream = fs.createWriteStream(tempFilePath)
      await pipeline(stream, ...transforms, writeStream)
      if (timer) {
        timer.done()
      }
    } catch (err) {
      await this._cleanupTempFile(tempFilePath)
      throw new WriteError(
        'problem writing temp file locally',
        { tempFilePath },
        err
      )
    }

    if (opts.sourceMd5) {
      const actualMd5 = md5Observer.hash.digest('hex')
      if (actualMd5 !== opts.sourceMd5) {
        await this._cleanupTempFile(tempFilePath)
        throw new WriteError('md5 hash mismatch', {
          expectedMd5: opts.sourceMd5,
          actualMd5,
        })
      }
    }

    return tempFilePath
  }

  async _cleanupTempFile(tempFilePath) {
    const dirPath = Path.dirname(tempFilePath)
    await fsPromises.rm(dirPath, { force: true, recursive: true })
  }

  _getFsPath(location, key) {
    key = key.replace(/\/$/, '')
    if (!this.useSubdirectories) {
      key = key.replace(/\//g, '_')
    }
    return Path.join(location, key)
  }

  async _listDirectory(path) {
    if (this.useSubdirectories) {
      return await glob(Path.join(path, '**'))
    } else {
      return await glob(`${path}_*`)
    }
  }

  async _ensureDirectoryExists(path) {
    await fsPromises.mkdir(Path.dirname(path), { recursive: true })
  }
}

function createMd5Observer() {
  const hash = crypto.createHash('md5')

  async function* transform(chunks) {
    for await (const chunk of chunks) {
      hash.update(chunk)
      yield chunk
    }
  }

  return { hash, transform }
}
