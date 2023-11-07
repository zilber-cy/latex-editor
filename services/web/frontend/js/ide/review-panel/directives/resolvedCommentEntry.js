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

export default App.directive('resolvedCommentEntry', () => ({
  restrict: 'E',
  templateUrl: 'resolvedCommentEntryTemplate',
  scope: {
    thread: '=',
    permissions: '=',
    onUnresolve: '&',
    onDelete: '&',
  },
  link(scope, element, attrs) {
    scope.contentLimit = 40
    scope.needsCollapsing = false
    scope.isCollapsed = true

    scope.toggleCollapse = () => (scope.isCollapsed = !scope.isCollapsed)

    return scope.$watch(
      'thread.content.length',
      contentLength =>
        (scope.needsCollapsing = contentLength > scope.contentLimit)
    )
  },
}))
