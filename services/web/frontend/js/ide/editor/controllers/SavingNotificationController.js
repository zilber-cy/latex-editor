/* eslint-disable
    camelcase,
    max-len,
    no-return-assign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import App from '../../../base'
import Document from '../Document'

export default App.controller(
  'SavingNotificationController',
  function ($scope, $interval, ide) {
    let warnAboutUnsavedChanges
    setInterval(() => pollSavedStatus(), 1000)

    $(window).bind('beforeunload', () => {
      return warnAboutUnsavedChanges()
    })

    let lockEditorModal = null // modal showing "connection lost"
    let originalPermissionsLevel
    const MAX_UNSAVED_SECONDS = 15 // lock the editor after this time if unsaved

    $scope.docSavingStatus = {}
    function pollSavedStatus() {
      let t
      const oldStatus = $scope.docSavingStatus
      const oldUnsavedCount = $scope.docSavingStatusCount
      const newStatus = {}
      let newUnsavedCount = 0
      let maxUnsavedSeconds = 0

      for (const doc_id in Document.openDocs) {
        const doc = Document.openDocs[doc_id]
        const saving = doc.pollSavedStatus()
        if (!saving) {
          newUnsavedCount++
          if (oldStatus[doc_id] != null) {
            newStatus[doc_id] = oldStatus[doc_id]
            t = newStatus[doc_id].unsavedSeconds += 1
            if (t > maxUnsavedSeconds) {
              maxUnsavedSeconds = t
            }
          } else {
            newStatus[doc_id] = {
              unsavedSeconds: 0,
              doc: ide.fileTreeManager.findEntityById(doc_id),
            }
          }
        }
      }

      if (newUnsavedCount > 0 && t > MAX_UNSAVED_SECONDS && !lockEditorModal) {
        lockEditorModal = ide.showLockEditorMessageModal(
          'Connection lost',
          'Sorry, the connection to the server is down.'
        )

        // put editor in readOnly mode
        originalPermissionsLevel = ide.$scope.permissionsLevel
        ide.$scope.permissionsLevel = 'readOnly'

        lockEditorModal.result.finally(() => {
          lockEditorModal = null // unset the modal if connection comes back
          // restore original permissions
          ide.$scope.permissionsLevel = originalPermissionsLevel
        })
      }

      if (lockEditorModal && newUnsavedCount === 0) {
        lockEditorModal.dismiss('connection back up')
        // restore original permissions if they were changed
        if (originalPermissionsLevel) {
          ide.$scope.permissionsLevel = originalPermissionsLevel
        }
      }

      // for performance, only update the display if the old or new
      // counts of unsaved files are nonzeror.  If both old and new
      // unsaved counts are zero then we know we are in a good state
      // and don't need to do anything to the UI.
      if (newUnsavedCount || oldUnsavedCount) {
        $scope.docSavingStatus = newStatus
        $scope.docSavingStatusCount = newUnsavedCount
        return $scope.$apply()
      }
    }

    return (warnAboutUnsavedChanges = function () {
      if (Document.hasUnsavedChanges()) {
        return 'You have unsaved changes. If you leave now they will not be saved.'
      }
    })
  }
)
