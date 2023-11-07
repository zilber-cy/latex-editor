const AbstractPersistor = require('./AbstractPersistor')
const Logger = require('@overleaf/logger')
const Stream = require('stream')
const { pipeline } = require('stream/promises')
const { NotFoundError, WriteError } = require('./Errors')

// Persistor that wraps two other persistors. Talks to the 'primary' by default,
// but will fall back to an older persistor in the case of a not-found error.
// If `Settings.fallback.copyOnMiss` is set, this will copy files from the fallback
// to the primary, in the event that they are missing.
//
// It is unlikely that the bucket/location name will be the same on the fallback
// as the primary. The bucket names should be overridden in `Settings.fallback.buckets`
// e.g.
// Settings.fallback.buckets = {
//   myBucketOnS3: 'myBucketOnGCS'
// }

module.exports = class MigrationPersistor extends AbstractPersistor {
  constructor(primaryPersistor, fallbackPersistor, settings) {
    super()

    this.primaryPersistor = primaryPersistor
    this.fallbackPersistor = fallbackPersistor
    this.settings = settings
  }

  async sendFile(...args) {
    return this.primaryPersistor.sendFile(...args)
  }

  async sendStream(...args) {
    return this.primaryPersistor.sendStream(...args)
  }

  async getRedirectUrl(...args) {
    return this.primaryPersistor.getRedirectUrl(...args)
  }

  async getObjectMd5Hash(...args) {
    return this._runWithFallback('getObjectMd5Hash', ...args)
  }

  async checkIfObjectExists(...args) {
    return this._runWithFallback('checkIfObjectExists', ...args)
  }

  async getObjectSize(...args) {
    return this._runWithFallback('getObjectSize', ...args)
  }

  async directorySize(...args) {
    return this._runWithFallback('directorySize', ...args)
  }

  async deleteObject(...args) {
    return this._runOnBoth('deleteObject', ...args)
  }

  async deleteDirectory(...args) {
    return this._runOnBoth('deleteDirectory', ...args)
  }

  async getObjectStream(bucket, key, opts = {}) {
    const shouldCopy = this.settings.copyOnMiss && !opts.start && !opts.end

    try {
      // 'return await' so we catch NotFoundError before returning
      return await this.primaryPersistor.getObjectStream(bucket, key, opts)
    } catch (err) {
      if (err instanceof NotFoundError) {
        const fallbackBucket = this._getFallbackBucket(bucket)
        const fallbackStream = await this.fallbackPersistor.getObjectStream(
          fallbackBucket,
          key,
          opts
        )
        // tee the stream to the client, and as a copy to the primary (if necessary)
        // start listening on both straight away so that we don't consume bytes
        // in one place before the other
        const returnStream = new Stream.PassThrough()
        pipeline(fallbackStream, returnStream).catch(error => {
          Logger.warn({ error }, 'failed to copy object from fallback')
        })

        if (shouldCopy) {
          const copyStream = new Stream.PassThrough()
          pipeline(fallbackStream, copyStream).catch(error => {
            Logger.warn({ error }, 'failed to copy object from fallback')
          })

          this._copyStreamFromFallbackAndVerify(
            copyStream,
            fallbackBucket,
            bucket,
            key,
            key
          ).catch(error => {
            Logger.warn({ error }, 'failed to copy file from fallback')
          })
        }
        return returnStream
      }
      throw err
    }
  }

  async copyObject(bucket, sourceKey, destKey) {
    try {
      return await this.primaryPersistor.copyObject(bucket, sourceKey, destKey)
    } catch (err) {
      if (err instanceof NotFoundError) {
        const fallbackBucket = this._getFallbackBucket(bucket)
        const fallbackStream = await this.fallbackPersistor.getObjectStream(
          fallbackBucket,
          sourceKey,
          {}
        )

        const copyStream = new Stream.PassThrough()
        pipeline(fallbackStream, copyStream).catch(error => {
          Logger.warn({ error }, 'failed to copy object from fallback')
        })

        if (this.settings.copyOnMiss) {
          const missStream = new Stream.PassThrough()
          pipeline(fallbackStream, missStream).catch(error => {
            Logger.warn({ error }, 'failed to copy object from fallback')
          })

          // copy from sourceKey -> sourceKey
          this._copyStreamFromFallbackAndVerify(
            missStream,
            fallbackBucket,
            bucket,
            sourceKey,
            sourceKey
          ).catch(() => {
            // swallow errors, as this runs in the background and will log a warning
          })
        }
        // copy from sourceKey -> destKey
        return this._copyStreamFromFallbackAndVerify(
          copyStream,
          fallbackBucket,
          bucket,
          sourceKey,
          destKey
        )
      }
      throw err
    }
  }

  async _copyStreamFromFallbackAndVerify(
    stream,
    sourceBucket,
    destBucket,
    sourceKey,
    destKey
  ) {
    try {
      let sourceMd5
      try {
        sourceMd5 = await this.fallbackPersistor.getObjectMd5Hash(
          sourceBucket,
          sourceKey
        )
      } catch (err) {
        Logger.warn(err, 'error getting md5 hash from fallback persistor')
      }

      await this.primaryPersistor.sendStream(destBucket, destKey, stream, {
        sourceMd5,
      })
    } catch (err) {
      const error = new WriteError(
        'unable to copy file to destination persistor',
        {
          sourceBucket,
          destBucket,
          sourceKey,
          destKey,
        },
        err
      )
      if (this.settings.Metrics) {
        this.settings.Metrics.inc('fallback.copy.failure')
      }

      try {
        await this.primaryPersistor.deleteObject(destBucket, destKey)
      } catch (err) {
        error.info.cleanupError = new WriteError(
          'unable to clean up destination copy artifact',
          {
            destBucket,
            destKey,
          },
          err
        )
      }
      throw error
    }
  }

  _getFallbackBucket(bucket) {
    return (this.settings.buckets && this.settings.buckets[bucket]) || bucket
  }

  async _runOnBoth(methodName, bucket, ...moreArgs) {
    const fallbackBucket = this._getFallbackBucket(bucket)

    await Promise.all([
      this.primaryPersistor[methodName](bucket, ...moreArgs),
      this.fallbackPersistor[methodName](fallbackBucket, ...moreArgs),
    ])
  }

  async _runWithFallback(methodName, bucket, key, ...moreArgs) {
    try {
      // 'return await' so we catch NotFoundError before returning
      return await this.primaryPersistor[methodName](bucket, key, ...moreArgs)
    } catch (err) {
      if (err instanceof NotFoundError) {
        const fallbackBucket = this._getFallbackBucket(bucket)
        if (this.settings.copyOnMiss) {
          const fallbackStream = await this.fallbackPersistor.getObjectStream(
            fallbackBucket,
            key,
            {}
          )
          // run in background
          this._copyStreamFromFallbackAndVerify(
            fallbackStream,
            fallbackBucket,
            bucket,
            key,
            key
          ).catch(err => {
            Logger.warn({ err }, 'failed to copy file from fallback')
          })
        }
        return this.fallbackPersistor[methodName](
          fallbackBucket,
          key,
          ...moreArgs
        )
      }
      throw err
    }
  }
}
