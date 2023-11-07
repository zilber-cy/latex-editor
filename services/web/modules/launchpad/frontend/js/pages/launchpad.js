/* global io */
import '../../../../../frontend/js/marketing'
import {
  inflightHelper,
  toggleDisplay,
} from '../../../../../frontend/js/features/form-helpers/hydrate-form'
import getMeta from '../../../../../frontend/js/utils/meta'

function setUpStatusIndicator(el, fn) {
  inflightHelper(el)

  const displaySuccess = el.querySelectorAll('[data-ol-result="success"]')
  const displayError = el.querySelectorAll('[data-ol-result="error"]')

  // The checks are very lightweight and do not appear to do anything
  //  from looking at the UI. Add an artificial delay of 1s to show that
  //  we are actually doing something. :)
  const artificialProgressDelay = 1000

  function run() {
    setTimeout(() => {
      fn()
        .then(() => {
          toggleDisplay(displayError, displaySuccess)
        })
        .catch(error => {
          el.querySelector('[data-ol-error]').textContent = error.message
          toggleDisplay(displaySuccess, displayError)
        })
        .finally(() => {
          el.dispatchEvent(new Event('idle'))
        })
    }, artificialProgressDelay)
  }

  el.querySelectorAll('button').forEach(retryBtn => {
    retryBtn.addEventListener('click', function (e) {
      e.preventDefault()
      el.dispatchEvent(new Event('pending'))
      run()
    })
  })

  run()
}

function setUpStatusIndicators() {
  setUpStatusIndicator(
    document.querySelector('[data-ol-launchpad-check="websocket"]'),
    () => {
      const timeout = 10 * 1000
      const socket = io.connect(null, {
        reconnect: false,
        'connect timeout': timeout,
        'force new connection': true,
      })
      return new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('timed out')), timeout)
        socket.on('connectionAccepted', function () {
          resolve()
        })
        socket.on('connectionRejected', function (err) {
          reject(new Error(err && err.message))
        })
        socket.on('connect_failed', function (err) {
          reject(new Error(err && err.message))
        })
      }).finally(() => {
        socket.disconnect()
      })
    }
  )

  setUpStatusIndicator(
    document.querySelector('[data-ol-launchpad-check="ide"]'),
    () => {
      return fetch(getMeta('ol-ideJsPath')).then(res => {
        if (!res.ok) {
          throw new Error(`Http status: ${res.status}`)
        }
      })
    }
  )
}

if (getMeta('ol-adminUserExists')) {
  setUpStatusIndicators()
}
