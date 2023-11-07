/* eslint-disable
    max-len,
    no-return-assign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import App from '../../../base'
import iconTypeFromName from '../../file-tree/util/iconTypeFromName'
import fileOperationI18nNames from '../../file-tree/util/fileOperationI18nNames'
const historyFileEntityController = function ($scope, $element, $attrs) {
  const ctrl = this
  ctrl.hasOperation = false
  ctrl.getRenameTooltip = i18nRenamedStr => {
    const [simplifiedOldPathname, simplifiedPathname] = _getSimplifiedPaths(
      ctrl.fileEntity.oldPathname,
      ctrl.fileEntity.pathname
    )
    return `${fileOperationI18nNames.renamed} <strong>${simplifiedOldPathname}</strong> &rarr; <strong>${simplifiedPathname}</strong>`
  }
  ctrl.getFileOperationName = () => {
    if (ctrl.fileEntity.operation === 'edited') {
      return fileOperationI18nNames.edited
    } else if (ctrl.fileEntity.operation === 'renamed') {
      return fileOperationI18nNames.renamed
    } else if (ctrl.fileEntity.operation === 'added') {
      return fileOperationI18nNames.created
    } else if (ctrl.fileEntity.operation === 'removed') {
      return fileOperationI18nNames.deleted
    } else {
      return ''
    }
  }

  const _getSimplifiedPaths = (path1, path2) => {
    const path1Parts = path1.split('/')
    const path2Parts = path2.split('/')
    const maxIterations = Math.min(path1Parts.length, path2Parts.length) - 1
    let commonPartIndex
    for (
      commonPartIndex = 0;
      commonPartIndex < maxIterations;
      commonPartIndex++
    ) {
      if (path1Parts[commonPartIndex] !== path2Parts[commonPartIndex]) {
        break
      }
    }
    path1Parts.splice(0, commonPartIndex)
    path2Parts.splice(0, commonPartIndex)
    return [path1Parts.join('/'), path2Parts.join('/')]
  }

  const _handleFolderClick = function () {
    ctrl.isOpen = !ctrl.isOpen
    ctrl.entityTypeIconClass = _getFolderIcon()
  }

  const _handleFileClick = () =>
    ctrl.historyFileTreeController.handleEntityClick(ctrl.fileEntity)
  function _getFolderIcon() {
    if (ctrl.isOpen) {
      return 'fa-folder-open'
    } else {
      return 'fa-folder'
    }
  }
  ctrl.$onInit = function () {
    if (ctrl.fileEntity.type === 'folder') {
      ctrl.isOpen = true
      ctrl.entityTypeIconClass = _getFolderIcon()
      ctrl.handleClick = _handleFolderClick
    } else {
      if (ctrl.fileEntity.operation) {
        ctrl.hasOperation = true
      }
      ctrl.entityTypeIconClass = `fa-${iconTypeFromName(ctrl.fileEntity.name)}`
      ctrl.entityOpTextClass = ctrl.fileEntity.operation
        ? `history-file-entity-name-${ctrl.fileEntity.operation}`
        : null
      ctrl.handleClick = _handleFileClick
      $scope.$watch(
        () => ctrl.historyFileTreeController.selectedPathname,
        selectedPathname =>
          (ctrl.isSelected = ctrl.fileEntity.pathname === selectedPathname)
      )
    }
  }
}

export default App.component('historyFileEntity', {
  require: {
    historyFileTreeController: '^historyFileTree',
  },
  bindings: {
    fileEntity: '<',
  },
  controller: historyFileEntityController,
  templateUrl: 'historyFileEntityTpl',
})
