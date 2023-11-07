const OError = require('@overleaf/o-error')
const { UserAuditLogEntry } = require('../../models/UserAuditLogEntry')
const { callbackify } = require('util')

function _canHaveNoInitiatorId(operation, info) {
  if (operation === 'reset-password') return true
  if (operation === 'unlink-sso' && info.providerId === 'collabratec')
    return true
  if (operation === 'unlink-institution-sso-not-migrated') return true
  if (operation === 'remove-email' && info.script) return true
}

/**
 * Add an audit log entry
 *
 * The entry should include at least the following fields:
 *
 * - userId: the user on behalf of whom the operation was performed
 * - operation: a string identifying the type of operation
 * - initiatorId: who performed the operation
 * - ipAddress: the IP address of the initiator
 * - info: an object detailing what happened
 */
async function addEntry(userId, operation, initiatorId, ipAddress, info = {}) {
  if (!operation || !ipAddress)
    throw new OError('missing required audit log data', {
      operation,
      initiatorId,
      ipAddress,
    })

  if (!initiatorId && !_canHaveNoInitiatorId(operation, info)) {
    throw new OError('missing initiatorId for audit log', {
      operation,
      ipAddress,
    })
  }

  const entry = {
    userId,
    operation,
    initiatorId,
    info,
    ipAddress,
  }

  await UserAuditLogEntry.create(entry)
}

const UserAuditLogHandler = {
  addEntry: callbackify(addEntry),
  promises: {
    addEntry,
  },
}

module.exports = UserAuditLogHandler
