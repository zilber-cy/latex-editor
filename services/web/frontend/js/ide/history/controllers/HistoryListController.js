import _ from 'lodash'
/* eslint-disable
    camelcase,
    max-len,
    no-return-assign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import App from '../../../base'
import displayNameForUser from '../util/displayNameForUser'
App.controller('HistoryListController', function ($scope, $modal, ide) {
  $scope.hoveringOverListSelectors = false

  $scope.projectUsers = []

  $scope.$watch('project.members', function (newVal) {
    if (newVal != null) {
      return ($scope.projectUsers = newVal.concat($scope.project.owner))
    }
  })

  // This method (and maybe the one below) will be removed soon. User details data will be
  // injected into the history API responses, so we won't need to fetch user data from other
  // local data structures.
  const _getUserById = id =>
    _.find($scope.projectUsers, function (user) {
      const curUserId =
        (user != null ? user._id : undefined) ||
        (user != null ? user.id : undefined)
      return curUserId === id
    })

  $scope.getDisplayNameById = id => displayNameForUser(_getUserById(id))

  $scope.deleteLabel = labelDetails =>
    $modal.open({
      templateUrl: 'historyV2DeleteLabelModalTemplate',
      controller: 'HistoryV2DeleteLabelModalController',
      resolve: {
        labelDetails() {
          return labelDetails
        },
      },
    })

  $scope.loadMore = () => {
    return ide.historyManager.fetchNextBatchOfUpdates()
  }

  $scope.recalculateSelectedUpdates = function () {
    let beforeSelection = true
    let afterSelection = false
    $scope.history.selection.updates = []
    return (() => {
      const result = []
      for (const update of Array.from($scope.history.updates)) {
        // replacing this declaration with `let` introduces a bug in history point selection:
        // https://github.com/overleaf/overleaf/issues/1035
        // eslint-disable-next-line no-var
        var inSelection

        if (update.selectedTo) {
          inSelection = true
          beforeSelection = false
        }

        update.beforeSelection = beforeSelection
        update.inSelection = inSelection
        update.afterSelection = afterSelection

        if (inSelection) {
          $scope.history.selection.updates.push(update)
        }

        if (update.selectedFrom) {
          inSelection = false
          result.push((afterSelection = true))
        } else {
          result.push(undefined)
        }
      }
      return result
    })()
  }

  $scope.recalculateHoveredUpdates = function () {
    let inHoverSelection
    let hoverSelectedFrom = false
    let hoverSelectedTo = false
    for (const update of Array.from($scope.history.updates)) {
      // Figure out whether the to or from selector is hovered over
      if (update.hoverSelectedFrom) {
        hoverSelectedFrom = true
      }
      if (update.hoverSelectedTo) {
        hoverSelectedTo = true
      }
    }

    if (hoverSelectedFrom) {
      // We want to 'hover select' everything between hoverSelectedFrom and selectedTo
      inHoverSelection = false
      for (const update of Array.from($scope.history.updates)) {
        if (update.selectedTo) {
          update.hoverSelectedTo = true
          inHoverSelection = true
        }
        update.inHoverSelection = inHoverSelection
        if (update.hoverSelectedFrom) {
          inHoverSelection = false
        }
      }
    }
    if (hoverSelectedTo) {
      // We want to 'hover select' everything between hoverSelectedTo and selectedFrom
      inHoverSelection = false
      return (() => {
        const result = []
        for (const update of Array.from($scope.history.updates)) {
          if (update.hoverSelectedTo) {
            inHoverSelection = true
          }
          update.inHoverSelection = inHoverSelection
          if (update.selectedFrom) {
            update.hoverSelectedFrom = true
            result.push((inHoverSelection = false))
          } else {
            result.push(undefined)
          }
        }
        return result
      })()
    }
  }

  $scope.resetHoverState = () =>
    (() => {
      const result = []
      for (const update of Array.from($scope.history.updates)) {
        delete update.hoverSelectedFrom
        delete update.hoverSelectedTo
        result.push(delete update.inHoverSelection)
      }
      return result
    })()

  return $scope.$watch('history.updates.length', () =>
    $scope.recalculateSelectedUpdates()
  )
})

export default App.controller(
  'HistoryListItemController',
  function ($scope, eventTracking) {
    $scope.$watch(
      'update.selectedFrom',
      function (selectedFrom, oldSelectedFrom) {
        if (selectedFrom) {
          for (const update of Array.from($scope.history.updates)) {
            if (update !== $scope.update) {
              update.selectedFrom = false
            }
          }
          return $scope.recalculateSelectedUpdates()
        }
      }
    )

    $scope.$watch('update.selectedTo', function (selectedTo, oldSelectedTo) {
      if (selectedTo) {
        for (const update of Array.from($scope.history.updates)) {
          if (update !== $scope.update) {
            update.selectedTo = false
          }
        }
        return $scope.recalculateSelectedUpdates()
      }
    })

    $scope.select = function () {
      eventTracking.sendMB('history-view-change')
      $scope.update.selectedTo = true
      return ($scope.update.selectedFrom = true)
    }

    $scope.mouseOverSelectedFrom = function () {
      $scope.history.hoveringOverListSelectors = true
      $scope.update.hoverSelectedFrom = true
      return $scope.recalculateHoveredUpdates()
    }

    $scope.mouseOutSelectedFrom = function () {
      $scope.history.hoveringOverListSelectors = false
      return $scope.resetHoverState()
    }

    $scope.mouseOverSelectedTo = function () {
      $scope.history.hoveringOverListSelectors = true
      $scope.update.hoverSelectedTo = true
      return $scope.recalculateHoveredUpdates()
    }

    $scope.mouseOutSelectedTo = function () {
      $scope.history.hoveringOverListSelectors = false
      return $scope.resetHoverState()
    }

    return ($scope.displayName = displayNameForUser)
  }
)
