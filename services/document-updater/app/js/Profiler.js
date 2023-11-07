/* eslint-disable
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Profiler
const Settings = require('@overleaf/settings')
const logger = require('@overleaf/logger')

const deltaMs = function (ta, tb) {
  const nanoSeconds = (ta[0] - tb[0]) * 1e9 + (ta[1] - tb[1])
  const milliSeconds = Math.floor(nanoSeconds * 1e-6)
  return milliSeconds
}

module.exports = Profiler = (function () {
  Profiler = class Profiler {
    static initClass() {
      this.prototype.LOG_CUTOFF_TIME = 15 * 1000
      this.prototype.LOG_SYNC_CUTOFF_TIME = 1000
    }

    constructor(name, args) {
      this.name = name
      this.args = args
      this.t0 = this.t = process.hrtime()
      this.start = new Date()
      this.updateTimes = []
      this.totalSyncTime = 0
    }

    log(label, options = {}) {
      const t1 = process.hrtime()
      const dtMilliSec = deltaMs(t1, this.t)
      this.t = t1
      this.totalSyncTime += options.sync ? dtMilliSec : 0
      this.updateTimes.push([label, dtMilliSec]) // timings in ms
      return this // make it chainable
    }

    end(message) {
      const totalTime = deltaMs(this.t, this.t0)
      const exceedsCutoff = totalTime > this.LOG_CUTOFF_TIME
      const exceedsSyncCutoff = this.totalSyncTime > this.LOG_SYNC_CUTOFF_TIME
      if (exceedsCutoff || exceedsSyncCutoff) {
        // log anything greater than cutoffs
        const args = {}
        for (const k in this.args) {
          const v = this.args[k]
          args[k] = v
        }
        args.updateTimes = this.updateTimes
        args.start = this.start
        args.end = new Date()
        args.status = { exceedsCutoff, exceedsSyncCutoff }
        logger.warn(args, this.name)
      }
      return totalTime
    }
  }
  Profiler.initClass()
  return Profiler
})()
