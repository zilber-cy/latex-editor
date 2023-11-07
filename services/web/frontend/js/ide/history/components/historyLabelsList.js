import _ from 'lodash'
/* eslint-disable
    max-len,
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
import ColorManager from '../../colors/ColorManager'
import displayNameForUser from '../util/displayNameForUser'
const historyLabelsListController = function ($scope, $element, $attrs) {
  const ctrl = this
  ctrl.isDragging = false
  ctrl.versionsWithLabels = []
  $scope.$watchCollection('$ctrl.labels', function (labels) {
    if (labels) {
      const groupedLabelsHash = _.groupBy(labels, 'version')
      ctrl.versionsWithLabels = _.map(groupedLabelsHash, (labels, version) => {
        return {
          version: parseInt(version, 10),
          labels,
        }
      })
    }
  })
  ctrl.initHoveredRange = () => {
    ctrl.hoveredHistoryRange = {
      toV: ctrl.selectedHistoryRange.toV,
      fromV: ctrl.selectedHistoryRange.fromV,
    }
  }
  ctrl.resetHoveredRange = () => {
    ctrl.hoveredHistoryRange = { toV: null, fromV: null }
  }
  ctrl.setHoveredRangeToV = toV => {
    if (toV >= ctrl.hoveredHistoryRange.fromV) {
      ctrl.hoveredHistoryRange.toV = toV
    }
  }
  ctrl.setHoveredRangeFromV = fromV => {
    if (fromV <= ctrl.hoveredHistoryRange.toV) {
      ctrl.hoveredHistoryRange.fromV = fromV
    }
  }

  ctrl.isVersionSelected = function (version) {
    if (ctrl.rangeSelectionEnabled) {
      return (
        version <= ctrl.selectedHistoryRange.toV &&
        version >= ctrl.selectedHistoryRange.fromV
      )
    } else {
      return version === ctrl.selectedHistoryVersion
    }
  }
  ctrl.isVersionHoverSelected = function (version) {
    return (
      ctrl.rangeSelectionEnabled &&
      version <= ctrl.hoveredHistoryRange.toV &&
      version >= ctrl.hoveredHistoryRange.fromV
    )
  }
  ctrl.onDraggingStart = () => {
    $scope.$applyAsync(() => {
      ctrl.isDragging = true
      ctrl.initHoveredRange()
    })
  }
  ctrl.onDraggingStop = (isValidDrop, boundary) => {
    $scope.$applyAsync(() => {
      if (!isValidDrop) {
        if (boundary === 'toV') {
          ctrl.setRangeToV(ctrl.hoveredHistoryRange.toV)
        } else if (boundary === 'fromV') {
          ctrl.setRangeFromV(ctrl.hoveredHistoryRange.fromV)
        }
      }
      ctrl.isDragging = false
      ctrl.resetHoveredRange()
    })
  }
  ctrl.onDrop = (boundary, versionWithLabel) => {
    if (boundary === 'toV') {
      $scope.$applyAsync(() => ctrl.setRangeToV(versionWithLabel.version))
    } else if (boundary === 'fromV') {
      $scope.$applyAsync(() => ctrl.setRangeFromV(versionWithLabel.version))
    }
  }
  ctrl.onOver = (boundary, versionWithLabel) => {
    if (boundary === 'toV') {
      $scope.$applyAsync(() =>
        ctrl.setHoveredRangeToV(versionWithLabel.version)
      )
    } else if (boundary === 'fromV') {
      $scope.$applyAsync(() =>
        ctrl.setHoveredRangeFromV(versionWithLabel.version)
      )
    }
  }
  ctrl.handleVersionSelect = versionWithLabel => {
    if (ctrl.rangeSelectionEnabled) {
      // TODO
      ctrl.onRangeSelect({
        selectedToV: versionWithLabel.version,
        selectedFromV: versionWithLabel.version,
      })
    } else {
      ctrl.onVersionSelect({ version: versionWithLabel.version })
    }
  }
  ctrl.setRangeToV = version => {
    if (version >= ctrl.selectedHistoryRange.fromV) {
      ctrl.onRangeSelect({
        selectedToV: version,
        selectedFromV: ctrl.selectedHistoryRange.fromV,
      })
    }
  }
  ctrl.setRangeFromV = version => {
    if (version <= ctrl.selectedHistoryRange.toV) {
      ctrl.onRangeSelect({
        selectedToV: ctrl.selectedHistoryRange.toV,
        selectedFromV: version,
      })
    }
  }
  ctrl.buildUserView = label => {
    const user = {
      _id: label.user_id,
      displayName: label.user_display_name,
    }
    return user
  }
  ctrl.displayName = displayNameForUser
  ctrl.getUserCSSStyle = function (user, versionWithLabel) {
    const curUserId =
      (user != null ? user._id : undefined) ||
      (user != null ? user.id : undefined)
    const hue = ColorManager.getHueForUserId(curUserId) || 100
    if (
      ctrl.isVersionSelected(versionWithLabel.version) ||
      ctrl.isVersionHoverSelected(versionWithLabel.version)
    ) {
      return { color: '#FFF' }
    } else {
      return { color: `hsl(${hue}, 70%, 50%)` }
    }
  }

  ctrl.$onInit = () => {
    ctrl.resetHoveredRange()
  }
}

export default App.component('historyLabelsList', {
  bindings: {
    labels: '<',
    rangeSelectionEnabled: '<',
    users: '<',
    currentUser: '<',
    isLoading: '<',
    selectedHistoryVersion: '<?',
    selectedHistoryRange: '<?',
    onVersionSelect: '&',
    onRangeSelect: '&',
    onLabelDelete: '&',
  },
  controller: historyLabelsListController,
  templateUrl: 'historyLabelsListTpl',
})
