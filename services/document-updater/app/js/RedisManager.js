let RedisManager
const Settings = require('@overleaf/settings')
const rclient = require('@overleaf/redis-wrapper').createClient(
  Settings.redis.documentupdater
)
const logger = require('@overleaf/logger')
const metrics = require('./Metrics')
const Errors = require('./Errors')
const crypto = require('crypto')
const async = require('async')
const ProjectHistoryRedisManager = require('./ProjectHistoryRedisManager')
const { docIsTooLarge } = require('./Limits')

// Sometimes Redis calls take an unexpectedly long time.  We have to be
// quick with Redis calls because we're holding a lock that expires
// after 30 seconds. We can't let any errors in the rest of the stack
// hold us up, and need to bail out quickly if there is a problem.
const MAX_REDIS_REQUEST_LENGTH = 5000 // 5 seconds

// Make times easy to read
const minutes = 60 // seconds for Redis expire

const logHashReadErrors = Settings.documentupdater?.logHashErrors?.read

const MEGABYTES = 1024 * 1024
const MAX_RANGES_SIZE = 3 * MEGABYTES

const keys = Settings.redis.documentupdater.key_schema

module.exports = RedisManager = {
  rclient,

  putDocInMemory(
    projectId,
    docId,
    docLines,
    version,
    ranges,
    pathname,
    projectHistoryId,
    _callback
  ) {
    const timer = new metrics.Timer('redis.put-doc')
    const callback = error => {
      timer.done()
      _callback(error)
    }
    const docLinesArray = docLines
    docLines = JSON.stringify(docLines)
    if (docLines.indexOf('\u0000') !== -1) {
      const error = new Error('null bytes found in doc lines')
      // this check was added to catch memory corruption in JSON.stringify.
      // It sometimes returned null bytes at the end of the string.
      logger.error({ err: error, docId, docLines }, error.message)
      return callback(error)
    }
    // Do an optimised size check on the docLines using the serialised
    // length as an upper bound
    const sizeBound = docLines.length
    if (docIsTooLarge(sizeBound, docLinesArray, Settings.max_doc_length)) {
      const docSize = docLines.length
      const err = new Error('blocking doc insert into redis: doc is too large')
      logger.error({ projectId, docId, err, docSize }, err.message)
      return callback(err)
    }
    const docHash = RedisManager._computeHash(docLines)
    // record bytes sent to redis
    metrics.summary('redis.docLines', docLines.length, { status: 'set' })
    logger.debug(
      { projectId, docId, version, docHash, pathname, projectHistoryId },
      'putting doc in redis'
    )
    RedisManager._serializeRanges(ranges, (error, ranges) => {
      if (error) {
        logger.error({ err: error, docId, projectId }, error.message)
        return callback(error)
      }
      // update docsInProject set before writing doc contents
      rclient.sadd(
        keys.docsInProject({ project_id: projectId }),
        docId,
        error => {
          if (error) return callback(error)

          if (!pathname) {
            metrics.inc('pathname', 1, {
              path: 'RedisManager.setDoc',
              status: pathname === '' ? 'zero-length' : 'undefined',
            })
          }

          rclient.mset(
            {
              [keys.docLines({ doc_id: docId })]: docLines,
              [keys.projectKey({ doc_id: docId })]: projectId,
              [keys.docVersion({ doc_id: docId })]: version,
              [keys.docHash({ doc_id: docId })]: docHash,
              [keys.ranges({ doc_id: docId })]: ranges,
              [keys.pathname({ doc_id: docId })]: pathname,
              [keys.projectHistoryId({ doc_id: docId })]: projectHistoryId,
            },
            callback
          )
        }
      )
    })
  },

  removeDocFromMemory(projectId, docId, _callback) {
    logger.debug({ projectId, docId }, 'removing doc from redis')
    const callback = err => {
      if (err) {
        logger.err({ projectId, docId, err }, 'error removing doc from redis')
        _callback(err)
      } else {
        logger.debug({ projectId, docId }, 'removed doc from redis')
        _callback()
      }
    }

    let multi = rclient.multi()
    multi.strlen(keys.docLines({ doc_id: docId }))
    multi.del(
      keys.docLines({ doc_id: docId }),
      keys.projectKey({ doc_id: docId }),
      keys.docVersion({ doc_id: docId }),
      keys.docHash({ doc_id: docId }),
      keys.ranges({ doc_id: docId }),
      keys.pathname({ doc_id: docId }),
      keys.projectHistoryId({ doc_id: docId }),
      keys.unflushedTime({ doc_id: docId }),
      keys.lastUpdatedAt({ doc_id: docId }),
      keys.lastUpdatedBy({ doc_id: docId })
    )
    multi.exec((error, response) => {
      if (error) {
        return callback(error)
      }
      const length = response?.[0]
      if (length > 0) {
        // record bytes freed in redis
        metrics.summary('redis.docLines', length, { status: 'del' })
      }
      multi = rclient.multi()
      multi.srem(keys.docsInProject({ project_id: projectId }), docId)
      multi.del(keys.projectState({ project_id: projectId }))
      multi.exec(callback)
    })
  },

  checkOrSetProjectState(projectId, newState, callback) {
    const multi = rclient.multi()
    multi.getset(keys.projectState({ project_id: projectId }), newState)
    multi.expire(keys.projectState({ project_id: projectId }), 30 * minutes)
    multi.exec((error, response) => {
      if (error) {
        return callback(error)
      }
      logger.debug(
        { projectId, newState, oldState: response[0] },
        'checking project state'
      )
      callback(null, response[0] !== newState)
    })
  },

  clearProjectState(projectId, callback) {
    rclient.del(keys.projectState({ project_id: projectId }), callback)
  },

  getDoc(projectId, docId, callback) {
    const timer = new metrics.Timer('redis.get-doc')
    const collectKeys = [
      keys.docLines({ doc_id: docId }),
      keys.docVersion({ doc_id: docId }),
      keys.docHash({ doc_id: docId }),
      keys.projectKey({ doc_id: docId }),
      keys.ranges({ doc_id: docId }),
      keys.pathname({ doc_id: docId }),
      keys.projectHistoryId({ doc_id: docId }),
      keys.unflushedTime({ doc_id: docId }),
      keys.lastUpdatedAt({ doc_id: docId }),
      keys.lastUpdatedBy({ doc_id: docId }),
    ]
    rclient.mget(...collectKeys, (error, result) => {
      if (error) {
        return callback(error)
      }
      let [
        docLines,
        version,
        storedHash,
        docProjectId,
        ranges,
        pathname,
        projectHistoryId,
        unflushedTime,
        lastUpdatedAt,
        lastUpdatedBy,
      ] = result
      const timeSpan = timer.done()
      // check if request took too long and bail out.  only do this for
      // get, because it is the first call in each update, so if this
      // passes we'll assume others have a reasonable chance to succeed.
      if (timeSpan > MAX_REDIS_REQUEST_LENGTH) {
        error = new Error('redis getDoc exceeded timeout')
        return callback(error)
      }
      // record bytes loaded from redis
      if (docLines != null) {
        metrics.summary('redis.docLines', docLines.length, { status: 'get' })
      }
      // check sha1 hash value if present
      if (docLines != null && storedHash != null) {
        const computedHash = RedisManager._computeHash(docLines)
        if (logHashReadErrors && computedHash !== storedHash) {
          logger.error(
            {
              projectId,
              docId,
              docProjectId,
              computedHash,
              storedHash,
              docLines,
            },
            'hash mismatch on retrieved document'
          )
        }
      }

      try {
        docLines = JSON.parse(docLines)
        ranges = RedisManager._deserializeRanges(ranges)
      } catch (e) {
        return callback(e)
      }

      version = parseInt(version || 0, 10)
      // check doc is in requested project
      if (docProjectId != null && docProjectId !== projectId) {
        logger.error({ projectId, docId, docProjectId }, 'doc not in project')
        return callback(new Errors.NotFoundError('document not found'))
      }

      if (docLines && version && !pathname) {
        metrics.inc('pathname', 1, {
          path: 'RedisManager.getDoc',
          status: pathname === '' ? 'zero-length' : 'undefined',
        })
      }

      callback(
        null,
        docLines,
        version,
        ranges,
        pathname,
        projectHistoryId,
        unflushedTime,
        lastUpdatedAt,
        lastUpdatedBy
      )
    })
  },

  getDocVersion(docId, callback) {
    rclient.mget(keys.docVersion({ doc_id: docId }), (error, result) => {
      if (error) {
        return callback(error)
      }
      let [version] = result || []
      version = parseInt(version, 10)
      callback(null, version)
    })
  },

  getDocLines(docId, callback) {
    rclient.get(keys.docLines({ doc_id: docId }), (error, docLines) => {
      if (error) {
        return callback(error)
      }
      callback(null, docLines)
    })
  },

  getPreviousDocOps(docId, start, end, callback) {
    const timer = new metrics.Timer('redis.get-prev-docops')
    rclient.llen(keys.docOps({ doc_id: docId }), (error, length) => {
      if (error) {
        return callback(error)
      }
      rclient.get(keys.docVersion({ doc_id: docId }), (error, version) => {
        if (error) {
          return callback(error)
        }
        version = parseInt(version, 10)
        const firstVersionInRedis = version - length

        if (start < firstVersionInRedis || end > version) {
          error = new Errors.OpRangeNotAvailableError(
            'doc ops range is not loaded in redis'
          )
          logger.debug(
            { err: error, docId, length, version, start, end },
            'doc ops range is not loaded in redis'
          )
          return callback(error)
        }

        start = start - firstVersionInRedis
        if (end > -1) {
          end = end - firstVersionInRedis
        }

        if (isNaN(start) || isNaN(end)) {
          error = new Error('inconsistent version or lengths')
          logger.error(
            { err: error, docId, length, version, start, end },
            'inconsistent version or length'
          )
          return callback(error)
        }

        rclient.lrange(
          keys.docOps({ doc_id: docId }),
          start,
          end,
          (error, jsonOps) => {
            let ops
            if (error) {
              return callback(error)
            }
            try {
              ops = jsonOps.map(jsonOp => JSON.parse(jsonOp))
            } catch (e) {
              return callback(e)
            }
            const timeSpan = timer.done()
            if (timeSpan > MAX_REDIS_REQUEST_LENGTH) {
              error = new Error('redis getPreviousDocOps exceeded timeout')
              return callback(error)
            }
            callback(null, ops)
          }
        )
      })
    })
  },

  DOC_OPS_TTL: 60 * minutes,
  DOC_OPS_MAX_LENGTH: 100,
  updateDocument(
    projectId,
    docId,
    docLines,
    newVersion,
    appliedOps,
    ranges,
    updateMeta,
    callback
  ) {
    if (appliedOps == null) {
      appliedOps = []
    }
    RedisManager.getDocVersion(docId, (error, currentVersion) => {
      if (error) {
        return callback(error)
      }
      if (currentVersion + appliedOps.length !== newVersion) {
        error = new Error(`Version mismatch. '${docId}' is corrupted.`)
        logger.error(
          {
            err: error,
            docId,
            currentVersion,
            newVersion,
            opsLength: appliedOps.length,
          },
          'version mismatch'
        )
        return callback(error)
      }

      const jsonOps = appliedOps.map(op => JSON.stringify(op))
      for (const op of jsonOps) {
        if (op.indexOf('\u0000') !== -1) {
          error = new Error('null bytes found in jsonOps')
          // this check was added to catch memory corruption in JSON.stringify
          logger.error({ err: error, docId, jsonOps }, error.message)
          return callback(error)
        }
      }

      const newDocLines = JSON.stringify(docLines)
      if (newDocLines.indexOf('\u0000') !== -1) {
        error = new Error('null bytes found in doc lines')
        // this check was added to catch memory corruption in JSON.stringify
        logger.error({ err: error, docId, newDocLines }, error.message)
        return callback(error)
      }
      // Do an optimised size check on the docLines using the serialised
      // length as an upper bound
      const sizeBound = newDocLines.length
      if (docIsTooLarge(sizeBound, docLines, Settings.max_doc_length)) {
        const err = new Error('blocking doc update: doc is too large')
        const docSize = newDocLines.length
        logger.error({ projectId, docId, err, docSize }, err.message)
        return callback(err)
      }
      const newHash = RedisManager._computeHash(newDocLines)

      const opVersions = appliedOps.map(op => op?.v)
      logger.debug(
        {
          docId,
          version: newVersion,
          hash: newHash,
          opVersions,
        },
        'updating doc in redis'
      )
      // record bytes sent to redis in update
      metrics.summary('redis.docLines', newDocLines.length, {
        status: 'update',
      })
      RedisManager._serializeRanges(ranges, (error, ranges) => {
        if (error) {
          logger.error({ err: error, docId }, error.message)
          return callback(error)
        }
        if (ranges && ranges.indexOf('\u0000') !== -1) {
          error = new Error('null bytes found in ranges')
          // this check was added to catch memory corruption in JSON.stringify
          logger.error({ err: error, docId, ranges }, error.message)
          return callback(error)
        }
        const multi = rclient.multi()
        multi.mset({
          [keys.docLines({ doc_id: docId })]: newDocLines,
          [keys.docVersion({ doc_id: docId })]: newVersion,
          [keys.docHash({ doc_id: docId })]: newHash,
          [keys.ranges({ doc_id: docId })]: ranges,
          [keys.lastUpdatedAt({ doc_id: docId })]: Date.now(),
          [keys.lastUpdatedBy({ doc_id: docId })]:
            updateMeta && updateMeta.user_id,
        })
        multi.ltrim(
          keys.docOps({ doc_id: docId }),
          -RedisManager.DOC_OPS_MAX_LENGTH,
          -1
        ) // index 3
        // push the ops last so we can get the lengths at fixed index position 7
        if (jsonOps.length > 0) {
          multi.rpush(keys.docOps({ doc_id: docId }), ...jsonOps) // index 5
          // expire must come after rpush since before it will be a no-op if the list is empty
          multi.expire(keys.docOps({ doc_id: docId }), RedisManager.DOC_OPS_TTL) // index 6
        }
        // Set the unflushed timestamp to the current time if not set ("NX" flag).
        multi.set(keys.unflushedTime({ doc_id: docId }), Date.now(), 'NX')
        multi.exec((error, result) => {
          if (error) {
            return callback(error)
          }

          if (jsonOps.length > 0) {
            metrics.inc('history-queue', 1, { status: 'project-history' })
            ProjectHistoryRedisManager.queueOps(
              projectId,
              ...jsonOps,
              (error, projectUpdateCount) => {
                if (error) {
                  // The full project history can re-sync a project in case
                  //  updates went missing.
                  // Just record the error here and acknowledge the write-op.
                  metrics.inc('history-queue-error')
                }
                callback(null, projectUpdateCount)
              }
            )
          } else {
            callback(null)
          }
        })
      })
    })
  },

  renameDoc(projectId, docId, userId, update, projectHistoryId, callback) {
    RedisManager.getDoc(projectId, docId, (error, lines, version) => {
      if (error) {
        return callback(error)
      }
      if (lines != null && version != null) {
        if (!update.newPathname) {
          logger.warn(
            { projectId, docId, update },
            'missing pathname in RedisManager.renameDoc'
          )
          metrics.inc('pathname', 1, {
            path: 'RedisManager.renameDoc',
            status: update.newPathname === '' ? 'zero-length' : 'undefined',
          })
        }
        rclient.set(
          keys.pathname({ doc_id: docId }),
          update.newPathname,
          callback
        )
      } else {
        callback()
      }
    })
  },

  clearUnflushedTime(docId, callback) {
    rclient.del(keys.unflushedTime({ doc_id: docId }), callback)
  },

  getDocIdsInProject(projectId, callback) {
    rclient.smembers(keys.docsInProject({ project_id: projectId }), callback)
  },

  /**
   * Get lastupdatedat timestamps for an array of docIds
   */
  getDocTimestamps(docIds, callback) {
    async.mapSeries(
      docIds,
      (docId, cb) => rclient.get(keys.lastUpdatedAt({ doc_id: docId }), cb),
      callback
    )
  },

  /**
   * Store the project id in a sorted set ordered by time with a random offset
   * to smooth out spikes
   */
  queueFlushAndDeleteProject(projectId, callback) {
    const SMOOTHING_OFFSET =
      Settings.smoothingOffset > 0
        ? Math.round(Settings.smoothingOffset * Math.random())
        : 0
    rclient.zadd(
      keys.flushAndDeleteQueue(),
      Date.now() + SMOOTHING_OFFSET,
      projectId,
      callback
    )
  },

  /**
   * Find the oldest queued flush that is before the cutoff time
   */
  getNextProjectToFlushAndDelete(cutoffTime, callback) {
    rclient.zrangebyscore(
      keys.flushAndDeleteQueue(),
      0,
      cutoffTime,
      'WITHSCORES',
      'LIMIT',
      0,
      1,
      (err, reply) => {
        if (err) {
          return callback(err)
        }
        // return if no projects ready to be processed
        if (!reply || reply.length === 0) {
          return callback()
        }
        // pop the oldest entry (get and remove in a multi)
        const multi = rclient.multi()
        // Poor man's version of ZPOPMIN, which is only available in Redis 5.
        multi.zrange(keys.flushAndDeleteQueue(), 0, 0, 'WITHSCORES')
        multi.zremrangebyrank(keys.flushAndDeleteQueue(), 0, 0)
        multi.zcard(keys.flushAndDeleteQueue()) // the total length of the queue (for metrics)
        multi.exec((err, reply) => {
          if (err) {
            return callback(err)
          }
          if (!reply || reply.length === 0) {
            return callback()
          }
          const [key, timestamp] = reply[0]
          const queueLength = reply[2]
          callback(null, key, timestamp, queueLength)
        })
      }
    )
  },

  _serializeRanges(ranges, callback) {
    let jsonRanges = JSON.stringify(ranges)
    if (jsonRanges && jsonRanges.length > MAX_RANGES_SIZE) {
      return callback(new Error('ranges are too large'))
    }
    if (jsonRanges === '{}') {
      // Most doc will have empty ranges so don't fill redis with lots of '{}' keys
      jsonRanges = null
    }
    callback(null, jsonRanges)
  },

  _deserializeRanges(ranges) {
    if (ranges == null || ranges === '') {
      return {}
    } else {
      return JSON.parse(ranges)
    }
  },

  _computeHash(docLines) {
    // use sha1 checksum of doclines to detect data corruption.
    //
    // note: must specify 'utf8' encoding explicitly, as the default is
    // binary in node < v5
    return crypto.createHash('sha1').update(docLines, 'utf8').digest('hex')
  },
}
