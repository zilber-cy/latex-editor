/* eslint-disable
    max-len,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let MetadataManager

export default MetadataManager = class MetadataManager {
  constructor(ide, $scope, metadata) {
    this.ide = ide
    this.$scope = $scope
    this.metadata = metadata
    this.ide.socket.on('broadcastDocMeta', data => {
      return this.metadata.onBroadcastDocMeta(data)
    })
    this.$scope.$on('entity:deleted', this.metadata.onEntityDeleted)
  }

  loadProjectMetaFromServer() {
    return this.metadata.loadProjectMetaFromServer()
  }
}
