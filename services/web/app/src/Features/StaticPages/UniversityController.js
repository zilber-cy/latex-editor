/* eslint-disable
    max-len,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let UniversityController
const settings = require('@overleaf/settings')
const logger = require('@overleaf/logger')
const Settings = require('@overleaf/settings')

module.exports = UniversityController = {
  getPage(req, res, next) {
    const url =
      req.url != null ? req.url.toLowerCase().replace('.html', '') : undefined
    return res.redirect(`/i${url}`)
  },

  getIndexPage(req, res) {
    return res.redirect('/i/university')
  },
}
