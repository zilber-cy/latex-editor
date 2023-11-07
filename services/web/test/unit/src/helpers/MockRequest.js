// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
class MockRequest {
  static initClass() {
    this.prototype.session = { destroy() {} }

    this.prototype.ip = '42.42.42.42'
    this.prototype.headers = {}
    this.prototype.params = {}
    this.prototype.query = {}
    this.prototype.body = {}
    this.prototype._parsedUrl = {}
    this.prototype.i18n = {
      translate(str) {
        return str
      },
    }
    this.prototype.route = { path: '' }
    this.prototype.accepts = () => {}
    this.prototype.setHeader = () => {}
  }

  param(param) {
    return this.params[param]
  }
}
MockRequest.initClass()

module.exports = MockRequest
