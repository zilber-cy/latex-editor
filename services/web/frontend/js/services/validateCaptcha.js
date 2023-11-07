/* global grecaptcha */

/* eslint-disable
    no-return-assign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 */
import App from '../base'

export default App.factory('validateCaptcha', function () {
  let _recaptchaCallbacks = []
  const onRecaptchaSubmit = function (token) {
    for (const cb of _recaptchaCallbacks) {
      cb(token)
    }
    _recaptchaCallbacks = []
  }

  let recaptchaId = null
  const validateCaptcha = (callback, captchaDisabled) => {
    if (callback == null) {
      callback = function () {}
    }
    if (
      typeof grecaptcha === 'undefined' ||
      grecaptcha === null ||
      captchaDisabled
    ) {
      return callback()
    }
    const reset = () => grecaptcha.reset()
    _recaptchaCallbacks.push(callback)
    _recaptchaCallbacks.push(reset)
    if (recaptchaId == null) {
      const el = $('#recaptcha')[0]
      recaptchaId = grecaptcha.render(el, { callback: onRecaptchaSubmit })
    }
    return grecaptcha.execute(recaptchaId)
  }

  return validateCaptcha
})
