/* eslint-disable
    camelcase,
    n/handle-callback-err,
    max-len,
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
import RangesTracker from '@overleaf/ranges-tracker'
import EventEmitter from '../../utils/EventEmitter'
import ShareJsDoc from './ShareJsDoc'
let Document

export default Document = (function () {
  Document = class Document extends EventEmitter {
    static initClass() {
      this.prototype.MAX_PENDING_OP_SIZE = 64
    }

    static getDocument(ide, doc_id) {
      if (!this.openDocs) {
        this.openDocs = {}
      }
      // Try to clean up existing docs before reopening them. If the doc has no
      // buffered ops then it will be deleted by _cleanup() and a new instance
      // of the document created below. This prevents us trying to follow the
      // joinDoc:existing code path on an existing doc that doesn't have any
      // local changes and getting an error if its version is too old.
      if (this.openDocs[doc_id]) {
        sl_console.log(
          `[getDocument] Cleaning up existing document instance for ${doc_id}`
        )
        this.openDocs[doc_id]._cleanUp()
      }
      if (this.openDocs[doc_id] == null) {
        sl_console.log(
          `[getDocument] Creating new document instance for ${doc_id}`
        )
        this.openDocs[doc_id] = new Document(ide, doc_id)
      } else {
        sl_console.log(
          `[getDocument] Returning existing document instance for ${doc_id}`
        )
      }
      return this.openDocs[doc_id]
    }

    static hasUnsavedChanges() {
      const object = this.openDocs || {}
      for (const doc_id in object) {
        const doc = object[doc_id]
        if (doc.hasBufferedOps()) {
          return true
        }
      }
      return false
    }

    static flushAll() {
      return (() => {
        const result = []
        for (const doc_id in this.openDocs) {
          const doc = this.openDocs[doc_id]
          result.push(doc.flush())
        }
        return result
      })()
    }

    constructor(ide, doc_id) {
      super()
      this.ide = ide
      this.doc_id = doc_id
      this.connected = this.ide.socket.socket.connected
      this.joined = false
      this.wantToBeJoined = false
      this._checkAceConsistency = () => this._checkConsistency(this.ace)
      this._checkCM6Consistency = () => this._checkConsistency(this.cm6)
      this._bindToEditorEvents()
      this._bindToSocketEvents()
    }

    editorType() {
      if (this.ace) {
        return 'ace'
      } else if (this.cm6) {
        return 'cm6'
      } else {
        return null
      }
    }

    attachToAce(ace) {
      this.ace = ace
      if (this.doc != null) {
        this.doc.attachToAce(this.ace)
      }
      const editorDoc = this.ace.getSession().getDocument()
      editorDoc.on('change', this._checkAceConsistency)
      return this.ide.$scope.$emit('document:opened', this.doc)
    }

    detachFromAce() {
      if (this.doc != null) {
        this.doc.detachFromAce()
      }
      const editorDoc =
        this.ace != null ? this.ace.getSession().getDocument() : undefined
      if (editorDoc != null) {
        editorDoc.off('change', this._checkAceConsistency)
      }
      delete this.ace
      this.clearChaosMonkey()
      return this.ide.$scope.$emit('document:closed', this.doc)
    }

    attachToCM6(cm6) {
      this.cm6 = cm6
      if (this.doc != null) {
        this.doc.attachToCM6(this.cm6)
      }
      if (this.cm6 != null) {
        this.cm6.on('change', this._checkCM6Consistency)
      }
      return this.ide.$scope.$emit('document:opened', this.doc)
    }

    detachFromCM6() {
      if (this.doc != null) {
        this.doc.detachFromCM6()
      }
      if (this.cm6 != null) {
        this.cm6.off('change', this._checkCM6Consistency)
      }
      delete this.cm6
      this.clearChaosMonkey()
      return this.ide.$scope.$emit('document:closed', this.doc)
    }

    submitOp(...args) {
      return this.doc != null
        ? this.doc.submitOp(...Array.from(args || []))
        : undefined
    }

    _checkConsistency(editor) {
      // We've been seeing a lot of errors when I think there shouldn't be
      // any, which may be related to this check happening before the change is
      // applied. If we use a timeout, hopefully we can reduce this.
      return setTimeout(() => {
        const editorValue = editor != null ? editor.getValue() : undefined
        const sharejsValue =
          this.doc != null ? this.doc.getSnapshot() : undefined
        if (editorValue !== sharejsValue) {
          return this._onError(
            new Error('Editor text does not match server text'),
            {},
            editorValue
          )
        }
      }, 0)
    }

    getSnapshot() {
      return this.doc != null ? this.doc.getSnapshot() : undefined
    }

    getType() {
      return this.doc != null ? this.doc.getType() : undefined
    }

    getInflightOp() {
      return this.doc != null ? this.doc.getInflightOp() : undefined
    }

    getPendingOp() {
      return this.doc != null ? this.doc.getPendingOp() : undefined
    }

    getRecentAck() {
      return this.doc != null ? this.doc.getRecentAck() : undefined
    }

    getOpSize(op) {
      return this.doc != null ? this.doc.getOpSize(op) : undefined
    }

    hasBufferedOps() {
      return this.doc != null ? this.doc.hasBufferedOps() : undefined
    }

    setTrackingChanges(track_changes) {
      return (this.doc.track_changes = track_changes)
    }

    getTrackingChanges() {
      return !!this.doc.track_changes
    }

    setTrackChangesIdSeeds(id_seeds) {
      return (this.doc.track_changes_id_seeds = id_seeds)
    }

    _bindToSocketEvents() {
      this._onUpdateAppliedHandler = update => this._onUpdateApplied(update)
      this.ide.socket.on('otUpdateApplied', this._onUpdateAppliedHandler)
      this._onErrorHandler = (error, message) => {
        // 'otUpdateError' are emitted per doc socket.io room, hence we can be
        //  sure that message.doc_id exists.
        if (message.doc_id !== this.doc_id) {
          // This error is for another doc. Do not action it. We could open
          //  a modal that has the wrong context on it.
          return
        }
        this._onError(error, message)
      }
      this.ide.socket.on('otUpdateError', this._onErrorHandler)
      this._onDisconnectHandler = error => this._onDisconnect(error)
      return this.ide.socket.on('disconnect', this._onDisconnectHandler)
    }

    _bindToEditorEvents() {
      const onReconnectHandler = update => {
        return this._onReconnect(update)
      }
      return (this._unsubscribeReconnectHandler = this.ide.$scope.$on(
        'project:joined',
        onReconnectHandler
      ))
    }

    _unBindFromEditorEvents() {
      return this._unsubscribeReconnectHandler()
    }

    _unBindFromSocketEvents() {
      this.ide.socket.removeListener(
        'otUpdateApplied',
        this._onUpdateAppliedHandler
      )
      this.ide.socket.removeListener('otUpdateError', this._onErrorHandler)
      return this.ide.socket.removeListener(
        'disconnect',
        this._onDisconnectHandler
      )
    }

    leaveAndCleanUp(cb) {
      return this.leave(error => {
        this._cleanUp()
        if (cb) cb(error)
      })
    }

    join(callback) {
      if (callback == null) {
        callback = function () {}
      }
      this.wantToBeJoined = true
      this._cancelLeave()
      if (this.connected) {
        return this._joinDoc(callback)
      } else {
        if (!this._joinCallbacks) {
          this._joinCallbacks = []
        }
        return this._joinCallbacks.push(callback)
      }
    }

    leave(callback) {
      if (callback == null) {
        callback = function () {}
      }
      this.flush() // force an immediate flush when leaving document
      this.wantToBeJoined = false
      this._cancelJoin()
      if (this.doc != null && this.doc.hasBufferedOps()) {
        sl_console.log(
          '[leave] Doc has buffered ops, pushing callback for later'
        )
        if (!this._leaveCallbacks) {
          this._leaveCallbacks = []
        }
        return this._leaveCallbacks.push(callback)
      } else if (!this.connected) {
        sl_console.log('[leave] Not connected, returning now')
        return callback()
      } else {
        sl_console.log('[leave] Leaving now')
        return this._leaveDoc(callback)
      }
    }

    flush() {
      return this.doc != null ? this.doc.flushPendingOps() : undefined
    }

    chaosMonkey(line, char) {
      if (line == null) {
        line = 0
      }
      if (char == null) {
        char = 'a'
      }
      const orig = char
      let copy = null
      let pos = 0
      const timer = () => {
        if (copy == null || !copy.length) {
          copy = orig.slice() + ' ' + new Date() + '\n'
          line += Math.random() > 0.1 ? 1 : -2
          if (line < 0) {
            line = 0
          }
          pos = 0
        }
        char = copy[0]
        copy = copy.slice(1)
        if (this.ace) {
          this.ace.session.insert({ row: line, column: pos }, char)
        } else if (this.cm6) {
          this.cm6.view.dispatch({
            changes: {
              from: Math.min(pos, this.cm6.view.state.doc.length),
              insert: char,
            },
          })
        }
        pos += 1
        return (this._cm = setTimeout(
          timer,
          100 + (Math.random() < 0.1 ? 1000 : 0)
        ))
      }
      return (this._cm = timer())
    }

    clearChaosMonkey() {
      const timer = this._cm
      if (timer) {
        delete this._cm
        return clearTimeout(timer)
      }
    }

    pollSavedStatus() {
      // returns false if doc has ops waiting to be acknowledged or
      // sent that haven't changed since the last time we checked.
      // Otherwise returns true.
      let saved
      const inflightOp = this.getInflightOp()
      const pendingOp = this.getPendingOp()
      const recentAck = this.getRecentAck()
      const pendingOpSize = pendingOp != null && this.getOpSize(pendingOp)
      if (inflightOp == null && pendingOp == null) {
        // there's nothing going on, this is ok.
        saved = true
        sl_console.log('[pollSavedStatus] no inflight or pending ops')
      } else if (inflightOp != null && inflightOp === this.oldInflightOp) {
        // The same inflight op has been sitting unacked since we
        // last checked, this is bad.
        saved = false
        sl_console.log('[pollSavedStatus] inflight op is same as before')
      } else if (
        pendingOp != null &&
        recentAck &&
        pendingOpSize < this.MAX_PENDING_OP_SIZE
      ) {
        // There is an op waiting to go to server but it is small and
        // within the flushDelay, this is ok for now.
        saved = true
        sl_console.log(
          '[pollSavedStatus] pending op (small with recent ack) assume ok',
          pendingOp,
          pendingOpSize
        )
      } else {
        // In any other situation, assume the document is unsaved.
        saved = false
        sl_console.log(
          `[pollSavedStatus] assuming not saved (inflightOp?: ${
            inflightOp != null
          }, pendingOp?: ${pendingOp != null})`
        )
      }

      this.oldInflightOp = inflightOp
      return saved
    }

    _cancelLeave() {
      if (this._leaveCallbacks != null) {
        return delete this._leaveCallbacks
      }
    }

    _cancelJoin() {
      if (this._joinCallbacks != null) {
        return delete this._joinCallbacks
      }
    }

    _onUpdateApplied(update) {
      this.ide.pushEvent('received-update', {
        doc_id: this.doc_id,
        remote_doc_id: update != null ? update.doc : undefined,
        wantToBeJoined: this.wantToBeJoined,
        update,
        hasDoc: this.doc != null,
      })

      if (
        window.disconnectOnAck != null &&
        Math.random() < window.disconnectOnAck
      ) {
        sl_console.log('Disconnecting on ack', update)
        window._ide.socket.socket.disconnect()
        // Pretend we never received the ack
        return
      }

      if (window.dropAcks != null && Math.random() < window.dropAcks) {
        if (update.op == null) {
          // Only drop our own acks, not collaborator updates
          sl_console.log('Simulating a lost ack', update)
          return
        }
      }

      if (
        (update != null ? update.doc : undefined) === this.doc_id &&
        this.doc != null
      ) {
        this.ide.pushEvent('received-update:processing', {
          update,
        })
        // FIXME: change this back to processUpdateFromServer when redis fixed
        this.doc.processUpdateFromServerInOrder(update)

        if (!this.wantToBeJoined) {
          return this.leave()
        }
      }
    }

    _onDisconnect() {
      sl_console.log('[onDisconnect] disconnecting')
      this.connected = false
      this.joined = false
      return this.doc != null
        ? this.doc.updateConnectionState('disconnected')
        : undefined
    }

    _onReconnect() {
      sl_console.log('[onReconnect] reconnected (joined project)')
      this.ide.pushEvent('reconnected:afterJoinProject')

      this.connected = true
      if (
        this.wantToBeJoined ||
        (this.doc != null ? this.doc.hasBufferedOps() : undefined)
      ) {
        sl_console.log(
          `[onReconnect] Rejoining (wantToBeJoined: ${
            this.wantToBeJoined
          } OR hasBufferedOps: ${
            this.doc != null ? this.doc.hasBufferedOps() : undefined
          })`
        )
        return this._joinDoc(error => {
          if (error != null) {
            return this._onError(error)
          }
          this.doc.updateConnectionState('ok')
          this.doc.flushPendingOps()
          return this._callJoinCallbacks()
        })
      }
    }

    _callJoinCallbacks() {
      for (const callback of Array.from(this._joinCallbacks || [])) {
        callback()
      }
      return delete this._joinCallbacks
    }

    _joinDoc(callback) {
      if (callback == null) {
        callback = function () {}
      }
      if (this.doc != null) {
        this.ide.pushEvent('joinDoc:existing', {
          doc_id: this.doc_id,
          version: this.doc.getVersion(),
        })
        return this.ide.socket.emit(
          'joinDoc',
          this.doc_id,
          this.doc.getVersion(),
          { encodeRanges: true },
          (error, docLines, version, updates, ranges) => {
            if (error != null) {
              return callback(error)
            }
            this.joined = true
            this.doc.catchUp(updates)
            this._decodeRanges(ranges)
            this._catchUpRanges(
              ranges != null ? ranges.changes : undefined,
              ranges != null ? ranges.comments : undefined
            )
            return callback()
          }
        )
      } else {
        this.ide.pushEvent('joinDoc:new', {
          doc_id: this.doc_id,
        })
        return this.ide.socket.emit(
          'joinDoc',
          this.doc_id,
          { encodeRanges: true },
          (error, docLines, version, updates, ranges) => {
            if (error != null) {
              return callback(error)
            }
            this.joined = true
            this.ide.pushEvent('joinDoc:inited', {
              doc_id: this.doc_id,
              version,
            })
            this.doc = new ShareJsDoc(
              this.doc_id,
              docLines,
              version,
              this.ide.socket,
              this.ide.globalEditorWatchdogManager
            )
            this._decodeRanges(ranges)
            this.ranges = new RangesTracker(
              ranges != null ? ranges.changes : undefined,
              ranges != null ? ranges.comments : undefined
            )
            this._bindToShareJsDocEvents()
            return callback()
          }
        )
      }
    }

    _decodeRanges(ranges) {
      const decodeFromWebsockets = text => decodeURIComponent(escape(text))
      try {
        for (const change of Array.from(ranges.changes || [])) {
          if (change.op.i != null) {
            change.op.i = decodeFromWebsockets(change.op.i)
          }
          if (change.op.d != null) {
            change.op.d = decodeFromWebsockets(change.op.d)
          }
        }
        return (() => {
          const result = []
          for (const comment of Array.from(ranges.comments || [])) {
            if (comment.op.c != null) {
              result.push((comment.op.c = decodeFromWebsockets(comment.op.c)))
            } else {
              result.push(undefined)
            }
          }
          return result
        })()
      } catch (err) {
        return console.log(err)
      }
    }

    _leaveDoc(callback) {
      if (callback == null) {
        callback = function () {}
      }
      this.ide.pushEvent('leaveDoc', {
        doc_id: this.doc_id,
      })
      sl_console.log('[_leaveDoc] Sending leaveDoc request')
      return this.ide.socket.emit('leaveDoc', this.doc_id, error => {
        if (error != null) {
          return callback(error)
        }
        this.joined = false
        for (callback of Array.from(this._leaveCallbacks || [])) {
          sl_console.log('[_leaveDoc] Calling buffered callback', callback)
          callback(error)
        }
        delete this._leaveCallbacks
        return callback(error)
      })
    }

    _cleanUp() {
      // if we arrive here from _onError the pending and inflight ops will have been cleared
      if (this.hasBufferedOps()) {
        sl_console.log(
          `[_cleanUp] Document (${this.doc_id}) has buffered ops, refusing to remove from openDocs`
        )
        return // return immediately, do not unbind from events
      } else if (Document.openDocs[this.doc_id] === this) {
        sl_console.log(
          `[_cleanUp] Removing self (${this.doc_id}) from in openDocs`
        )
        delete Document.openDocs[this.doc_id]
      } else {
        // It's possible that this instance has error, and the doc has been reloaded.
        // This creates a new instance in Document.openDoc with the same id. We shouldn't
        // clear it because it's not this instance.
        sl_console.log(
          `[_cleanUp] New instance of (${this.doc_id}) created. Not removing`
        )
      }
      this._unBindFromEditorEvents()
      return this._unBindFromSocketEvents()
    }

    _bindToShareJsDocEvents() {
      this.doc.on('error', (error, meta) => this._onError(error, meta))
      this.doc.on('externalUpdate', update => {
        this.ide.pushEvent('externalUpdate', { doc_id: this.doc_id })
        return this.trigger('externalUpdate', update)
      })
      this.doc.on('remoteop', (...args) => {
        this.ide.pushEvent('remoteop', { doc_id: this.doc_id })
        return this.trigger('remoteop', ...Array.from(args))
      })
      this.doc.on('op:sent', op => {
        this.ide.pushEvent('op:sent', {
          doc_id: this.doc_id,
          op,
        })
        return this.trigger('op:sent')
      })
      this.doc.on('op:acknowledged', op => {
        this.ide.pushEvent('op:acknowledged', {
          doc_id: this.doc_id,
          op,
        })
        this.ide.$scope.$emit('ide:opAcknowledged', {
          doc_id: this.doc_id,
          op,
        })
        return this.trigger('op:acknowledged')
      })
      this.doc.on('op:timeout', op => {
        this.ide.pushEvent('op:timeout', {
          doc_id: this.doc_id,
          op,
        })
        this.trigger('op:timeout')
        return this._onError(new Error('op timed out'))
      })
      this.doc.on('flush', (inflightOp, pendingOp, version) => {
        return this.ide.pushEvent('flush', {
          doc_id: this.doc_id,
          inflightOp,
          pendingOp,
          v: version,
        })
      })

      let docChangedTimeout
      this.doc.on('change', (ops, oldSnapshot, msg) => {
        this._applyOpsToRanges(ops, oldSnapshot, msg)
        if (docChangedTimeout) {
          window.clearTimeout(docChangedTimeout)
        }
        docChangedTimeout = window.setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('doc:changed', { detail: { id: this.doc_id } })
          )
          this.ide.$scope.$emit('doc:changed', { doc_id: this.doc_id })
        }, 50)
      })

      this.doc.on('flipped_pending_to_inflight', () => {
        return this.trigger('flipped_pending_to_inflight')
      })

      let docSavedTimeout
      this.doc.on('saved', () => {
        if (docSavedTimeout) {
          window.clearTimeout(docSavedTimeout)
        }
        docSavedTimeout = window.setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('doc:saved', { detail: { id: this.doc_id } })
          )
          this.ide.$scope.$emit('doc:saved', { doc_id: this.doc_id })
        }, 50)
      })
    }

    _onError(error, meta, editorContent) {
      if (meta == null) {
        meta = {}
      }
      meta.doc_id = this.doc_id
      sl_console.log('ShareJS error', error, meta)
      if (error.message === 'no project_id found on client') {
        sl_console.log('ignoring error, will wait to join project')
        return
      }
      if (this.doc != null) {
        this.doc.clearInflightAndPendingOps()
      }
      this.trigger('error', error, meta, editorContent)
      // The clean up should run after the error is triggered because the error triggers a
      // disconnect. If we run the clean up first, we remove our event handlers and miss
      // the disconnect event, which means we try to leaveDoc when the connection comes back.
      // This could intefere with the new connection of a new instance of this document.
      return this._cleanUp()
    }

    _applyOpsToRanges(ops, oldSnapshot, msg) {
      let old_id_seed
      if (ops == null) {
        ops = []
      }
      let track_changes_as = null
      const remote_op = msg != null
      if (__guard__(msg != null ? msg.meta : undefined, x => x.tc) != null) {
        old_id_seed = this.ranges.getIdSeed()
        this.ranges.setIdSeed(msg.meta.tc)
      }
      if (remote_op && (msg.meta != null ? msg.meta.tc : undefined)) {
        track_changes_as = msg.meta.user_id
      } else if (!remote_op && this.track_changes_as != null) {
        ;({ track_changes_as } = this)
      }
      this.ranges.track_changes = track_changes_as != null
      for (const op of this._filterOps(ops)) {
        this.ranges.applyOp(op, { user_id: track_changes_as })
      }
      if (old_id_seed != null) {
        this.ranges.setIdSeed(old_id_seed)
      }
      if (remote_op) {
        // With remote ops, Ace hasn't been updated when we receive this op,
        // so defer updating track changes until it has
        return setTimeout(() => this.emit('ranges:dirty'))
      } else {
        return this.emit('ranges:dirty')
      }
    }

    _catchUpRanges(changes, comments) {
      // We've just been given the current server's ranges, but need to apply any local ops we have.
      // Reset to the server state then apply our local ops again.
      if (changes == null) {
        changes = []
      }
      if (comments == null) {
        comments = []
      }
      this.emit('ranges:clear')
      this.ranges.changes = changes
      this.ranges.comments = comments
      this.ranges.track_changes = this.doc.track_changes
      for (const op of this._filterOps(this.doc.getInflightOp() || [])) {
        this.ranges.setIdSeed(this.doc.track_changes_id_seeds.inflight)
        this.ranges.applyOp(op, { user_id: this.track_changes_as })
      }
      for (const op of this._filterOps(this.doc.getPendingOp() || [])) {
        this.ranges.setIdSeed(this.doc.track_changes_id_seeds.pending)
        this.ranges.applyOp(op, { user_id: this.track_changes_as })
      }
      return this.emit('ranges:redraw')
    }

    _filterOps(ops) {
      // Read-only token users can't see/edit comment, so we filter out comment
      // ops to avoid highlighting comment ranges.
      if (window.isRestrictedTokenMember) {
        return ops.filter(op => op.c == null)
      } else {
        return ops
      }
    }
  }
  Document.initClass()
  return Document
})()

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined
}
