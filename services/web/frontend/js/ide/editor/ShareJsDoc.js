/* eslint-disable
    camelcase,
    max-len,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import EventEmitter from '../../utils/EventEmitter'
import ShareJs from '../../vendor/libs/sharejs'
import EditorWatchdogManager from '../connection/EditorWatchdogManager'

let ShareJsDoc
const SINGLE_USER_FLUSH_DELAY = 2000 // ms
const MULTI_USER_FLUSH_DELAY = 500 // ms

export default ShareJsDoc = (function () {
  ShareJsDoc = class ShareJsDoc extends EventEmitter {
    static initClass() {
      this.prototype.INFLIGHT_OP_TIMEOUT = 5000 // Retry sending ops after 5 seconds without an ack
      this.prototype.WAIT_FOR_CONNECTION_TIMEOUT = 500

      this.prototype.FATAL_OP_TIMEOUT = 30000
    }

    constructor(
      doc_id,
      docLines,
      version,
      socket,
      globalEditorWatchdogManager
    ) {
      super()
      // Dencode any binary bits of data
      // See http://ecmanaut.blogspot.co.uk/2006/07/encoding-decoding-utf8-in-javascript.html
      this.doc_id = doc_id
      this.socket = socket
      this.type = 'text'
      docLines = Array.from(docLines).map(line =>
        decodeURIComponent(escape(line))
      )
      const snapshot = docLines.join('\n')
      this.track_changes = false

      this.connection = {
        send: update => {
          this._startInflightOpTimeout(update)
          if (
            window.disconnectOnUpdate != null &&
            Math.random() < window.disconnectOnUpdate
          ) {
            sl_console.log('Disconnecting on update', update)
            window._ide.socket.socket.disconnect()
          }
          if (
            window.dropUpdates != null &&
            Math.random() < window.dropUpdates
          ) {
            sl_console.log('Simulating a lost update', update)
            return
          }
          if (this.track_changes) {
            if (update.meta == null) {
              update.meta = {}
            }
            update.meta.tc = this.track_changes_id_seeds.inflight
          }
          return this.socket.emit(
            'applyOtUpdate',
            this.doc_id,
            update,
            error => {
              if (error != null) {
                return this._handleError(error)
              }
            }
          )
        },
        state: 'ok',
        id: this.socket.publicId,
      }

      this._doc = new ShareJs.Doc(this.connection, this.doc_id, {
        type: this.type,
      })
      this._doc.setFlushDelay(SINGLE_USER_FLUSH_DELAY)
      this._doc.on('change', (...args) => {
        return this.trigger('change', ...Array.from(args))
      })
      this.EditorWatchdogManager = new EditorWatchdogManager({
        parent: globalEditorWatchdogManager,
      })
      this._doc.on('acknowledge', () => {
        this.lastAcked = new Date() // note time of last ack from server for an op we sent
        this.EditorWatchdogManager.onAck() // keep track of last ack globally
        return this.trigger('acknowledge')
      })
      this._doc.on('remoteop', (...args) => {
        // As soon as we're working with a collaborator, start sending
        // ops more frequently for low latency.
        this._doc.setFlushDelay(MULTI_USER_FLUSH_DELAY)
        return this.trigger('remoteop', ...Array.from(args))
      })
      this._doc.on('flipped_pending_to_inflight', () => {
        return this.trigger('flipped_pending_to_inflight')
      })
      this._doc.on('saved', () => {
        return this.trigger('saved')
      })
      this._doc.on('error', e => {
        return this._handleError(e)
      })

      this._bindToDocChanges(this._doc)

      this.processUpdateFromServer({
        open: true,
        v: version,
        snapshot,
      })
      this._removeCarriageReturnCharFromShareJsDoc()
    }

    _removeCarriageReturnCharFromShareJsDoc() {
      const doc = this._doc
      if (doc.snapshot.indexOf('\r') === -1) {
        return
      }
      window._ide.pushEvent('remove-carriage-return-char', {
        doc_id: this.doc_id,
      })
      let nextPos
      while ((nextPos = doc.snapshot.indexOf('\r')) !== -1) {
        sl_console.log('[ShareJsDoc] remove-carriage-return-char', nextPos)
        doc.del(nextPos, 1)
      }
    }

    submitOp(...args) {
      return this._doc.submitOp(...Array.from(args || []))
    }

    // The following code puts out of order messages into a queue
    // so that they can be processed in order.  This is a workaround
    // for messages being delayed by redis cluster.
    // FIXME: REMOVE THIS WHEN REDIS PUBSUB IS SENDING MESSAGES IN ORDER
    _isAheadOfExpectedVersion(message) {
      return this._doc.version > 0 && message.v > this._doc.version
    }

    _pushOntoQueue(message) {
      sl_console.log(`[processUpdate] push onto queue ${message.v}`)
      // set a timer so that we never leave messages in the queue indefinitely
      if (!this.queuedMessageTimer) {
        this.queuedMessageTimer = setTimeout(() => {
          sl_console.log(`[processUpdate] queue timeout fired for ${message.v}`)
          // force the message to be processed after the timeout,
          // it will cause an error if the missing update has not arrived
          this.processUpdateFromServer(message)
        }, this.INFLIGHT_OP_TIMEOUT)
      }
      this.queuedMessages.push(message)
      // keep the queue in order, lowest version first
      this.queuedMessages.sort(function (a, b) {
        return a.v - b.v
      })
    }

    _clearQueue() {
      this.queuedMessages = []
    }

    _processQueue() {
      if (this.queuedMessages.length > 0) {
        const nextAvailableVersion = this.queuedMessages[0].v
        if (nextAvailableVersion > this._doc.version) {
          // there are updates we still can't apply yet
        } else {
          // there's a version we can accept on the queue, apply it
          sl_console.log(
            `[processUpdate] taken from queue ${nextAvailableVersion}`
          )
          this.processUpdateFromServerInOrder(this.queuedMessages.shift())
          // clear the pending timer if the queue has now been cleared
          if (this.queuedMessages.length === 0 && this.queuedMessageTimer) {
            sl_console.log('[processUpdate] queue is empty, cleared timeout')
            clearTimeout(this.queuedMessageTimer)
            this.queuedMessageTimer = null
          }
        }
      }
    }

    // FIXME: This is the new method which reorders incoming updates if needed
    // called from Document.js
    processUpdateFromServerInOrder(message) {
      // Create an array to hold queued messages
      if (!this.queuedMessages) {
        this.queuedMessages = []
      }
      // Is this update ahead of the next expected update?
      // If so, put it on a queue to be handled later.
      if (this._isAheadOfExpectedVersion(message)) {
        this._pushOntoQueue(message)
        return // defer processing this update for now
      }
      const error = this.processUpdateFromServer(message)
      if (
        error instanceof Error &&
        error.message === 'Invalid version from server'
      ) {
        // if there was an error, abandon the queued updates ahead of this one
        this._clearQueue()
        return
      }
      // Do we have any messages queued up?
      // find the next message if available
      this._processQueue()
    }

    // FIXME: This is the original method. Switch back to this when redis
    // issues are resolved.
    processUpdateFromServer(message) {
      try {
        this._doc._onMessage(message)
      } catch (error) {
        // Version mismatches are thrown as errors
        console.log(error)
        this._handleError(error)
        return error // return the error for queue handling
      }

      if (
        __guard__(message != null ? message.meta : undefined, x => x.type) ===
        'external'
      ) {
        return this.trigger('externalUpdate', message)
      }
    }

    catchUp(updates) {
      return (() => {
        const result = []
        for (let i = 0; i < updates.length; i++) {
          const update = updates[i]
          update.v = this._doc.version
          update.doc = this.doc_id
          result.push(this.processUpdateFromServer(update))
        }
        return result
      })()
    }

    getSnapshot() {
      return this._doc.snapshot
    }

    getVersion() {
      return this._doc.version
    }

    getType() {
      return this.type
    }

    clearInflightAndPendingOps() {
      this._clearFatalTimeoutTimer()
      this._doc.inflightOp = null
      this._doc.inflightCallbacks = []
      this._doc.pendingOp = null
      return (this._doc.pendingCallbacks = [])
    }

    flushPendingOps() {
      // This will flush any ops that are pending.
      // If there is an inflight op it will do nothing.
      return this._doc.flush()
    }

    updateConnectionState(state) {
      sl_console.log(`[updateConnectionState] Setting state to ${state}`)
      this.connection.state = state
      this.connection.id = this.socket.publicId
      this._doc.autoOpen = false
      this._doc._connectionStateChanged(state)
      return (this.lastAcked = null) // reset the last ack time when connection changes
    }

    hasBufferedOps() {
      return this._doc.inflightOp != null || this._doc.pendingOp != null
    }

    getInflightOp() {
      return this._doc.inflightOp
    }

    getPendingOp() {
      return this._doc.pendingOp
    }

    getRecentAck() {
      // check if we have received an ack recently (within a factor of two of the single user flush delay)
      return (
        this.lastAcked != null &&
        new Date() - this.lastAcked < 2 * SINGLE_USER_FLUSH_DELAY
      )
    }

    getOpSize(op) {
      // compute size of an op from its components
      // (total number of characters inserted and deleted)
      let size = 0
      for (const component of Array.from(op || [])) {
        if ((component != null ? component.i : undefined) != null) {
          size += component.i.length
        }
        if ((component != null ? component.d : undefined) != null) {
          size += component.d.length
        }
      }
      return size
    }

    _attachEditorWatchdogManager(editorName, editor) {
      // end-to-end check for edits -> acks, for this very ShareJsdoc
      // This will catch a broken connection and missing UX-blocker for the
      //  user, allowing them to keep editing.
      this._detachEditorWatchdogManager =
        this.EditorWatchdogManager.attachToEditor(editorName, editor)
    }

    _attachToEditor(editorName, editor, attachToShareJs) {
      this._attachEditorWatchdogManager(editorName, editor)

      attachToShareJs()
    }

    _maybeDetachEditorWatchdogManager() {
      // a failed attach attempt may lead to a missing cleanup handler
      if (this._detachEditorWatchdogManager) {
        this._detachEditorWatchdogManager()
        delete this._detachEditorWatchdogManager
      }
    }

    attachToAce(ace) {
      this._attachToEditor('Ace', ace, () => {
        this._doc.attach_ace(ace, window.maxDocLength)
      })
    }

    detachFromAce() {
      this._maybeDetachEditorWatchdogManager()
      return typeof this._doc.detach_ace === 'function'
        ? this._doc.detach_ace()
        : undefined
    }

    attachToCM6(cm6) {
      this._attachToEditor('CM6', cm6, () => {
        cm6.attachShareJs(this._doc, window.maxDocLength)
      })
    }

    detachFromCM6() {
      this._maybeDetachEditorWatchdogManager()
      if (this._doc.detach_cm6) {
        this._doc.detach_cm6()
      }
    }

    _startInflightOpTimeout(update) {
      this._startFatalTimeoutTimer(update)
      const retryOp = () => {
        // Only send the update again if inflightOp is still populated
        // This can be cleared when hard reloading the document in which
        // case we don't want to keep trying to send it.
        sl_console.log('[inflightOpTimeout] Trying op again')
        if (this._doc.inflightOp != null) {
          // When there is a socket.io disconnect, @_doc.inflightSubmittedIds
          // is updated with the socket.io client id of the current op in flight
          // (meta.source of the op).
          // @connection.id is the client id of the current socket.io session.
          // So we need both depending on whether the op was submitted before
          // one or more disconnects, or if it was submitted during the current session.
          update.dupIfSource = [
            this.connection.id,
            ...Array.from(this._doc.inflightSubmittedIds),
          ]

          // We must be joined to a project for applyOtUpdate to work on the real-time
          // service, so don't send an op if we're not. Connection state is set to 'ok'
          // when we've joined the project
          if (this.connection.state !== 'ok') {
            let timer
            sl_console.log(
              '[inflightOpTimeout] Not connected, retrying in 0.5s'
            )
            return (timer = setTimeout(
              retryOp,
              this.WAIT_FOR_CONNECTION_TIMEOUT
            ))
          } else {
            sl_console.log('[inflightOpTimeout] Sending')
            return this.connection.send(update)
          }
        }
      }

      const timer = setTimeout(retryOp, this.INFLIGHT_OP_TIMEOUT)
      return this._doc.inflightCallbacks.push(() => {
        this._clearFatalTimeoutTimer()
        return clearTimeout(timer)
      }) // 30 seconds
    }

    _startFatalTimeoutTimer(update) {
      // If an op doesn't get acked within FATAL_OP_TIMEOUT, something has
      // gone unrecoverably wrong (the op will have been retried multiple times)
      if (this._timeoutTimer != null) {
        return
      }
      return (this._timeoutTimer = setTimeout(() => {
        this._clearFatalTimeoutTimer()
        return this.trigger('op:timeout', update)
      }, this.FATAL_OP_TIMEOUT))
    }

    _clearFatalTimeoutTimer() {
      if (this._timeoutTimer == null) {
        return
      }
      clearTimeout(this._timeoutTimer)
      return (this._timeoutTimer = null)
    }

    _handleError(error, meta) {
      if (meta == null) {
        meta = {}
      }
      return this.trigger('error', error, meta)
    }

    _bindToDocChanges(doc) {
      const { submitOp } = doc
      doc.submitOp = (...args) => {
        this.trigger('op:sent', ...Array.from(args))
        doc.pendingCallbacks.push(() => {
          return this.trigger('op:acknowledged', ...Array.from(args))
        })
        return submitOp.apply(doc, args)
      }

      const { flush } = doc
      return (doc.flush = (...args) => {
        this.trigger('flush', doc.inflightOp, doc.pendingOp, doc.version)
        return flush.apply(doc, args)
      })
    }
  }
  ShareJsDoc.initClass()
  return ShareJsDoc
})()

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined
}
