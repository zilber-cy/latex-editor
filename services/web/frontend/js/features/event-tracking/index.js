import _ from 'lodash'
import * as eventTracking from '../../infrastructure/event-tracking'

function isInViewport(element) {
  const elTop = $(element).offset().top
  const elBtm = elTop + $(element).outerHeight()

  const viewportTop = $(window).scrollTop()
  const viewportBtm = viewportTop + $(window).height()

  return elBtm > viewportTop && elTop < viewportBtm
}

function setupEventTracking(el) {
  const key = el.getAttribute('event-tracking')
  const action = el.getAttribute('event-tracking-action') || key
  const label = el.getAttribute('event-tracking-label') || ''
  const gaCategory = el.getAttribute('event-tracking-ga')
  const sendMB = el.getAttribute('event-tracking-mb')
  const trigger = el.getAttribute('event-tracking-trigger')
  const sendOnce = el.getAttribute('event-tracking-send-once')
  const element = el.getAttribute('event-tracking-element')
  const segmentation = JSON.parse(el.getAttribute('event-segmentation') || '{}')
  segmentation.page = window.location.pathname

  function submit() {
    if (element === 'checkbox') {
      segmentation.checkbox = el.checked ? 'checked' : 'unchecked'
    } else if (element === 'select') {
      segmentation.selectValue = el.value
    }

    if (sendMB) {
      if (sendOnce) {
        eventTracking.sendMBOnce(key, segmentation)
      } else {
        eventTracking.sendMB(key, segmentation)
      }
    }
    if (gaCategory) {
      if (sendOnce) {
        eventTracking.sendOnce(gaCategory, action, label)
      } else {
        eventTracking.send(gaCategory, action, label)
      }
    }
  }

  let handler
  let timer
  let timeoutAmt = 500
  switch (trigger) {
    case 'load':
      submit()
      break
    case 'click':
      el.addEventListener('click', () => submit())
      break
    case 'hover':
      if (el.getAttribute('event-hover-amt')) {
        timeoutAmt = parseInt(el.getAttribute('event-hover-amt'), 10)
      }
      el.addEventListener('mouseenter', () => {
        timer = setTimeout(() => submit(), timeoutAmt)
      })
      el.addEventListener('mouseleave', () => clearTimeout(timer))
      break
    case 'scroll':
      handler = _.throttle(() => {
        if (isInViewport(el)) {
          submit()
          window.removeEventListener('scroll', handler)
          window.removeEventListener('resize', handler)
        }
      }, 500)
      window.addEventListener('scroll', handler)
      window.addEventListener('resize', handler)
      break
  }
}

document.querySelectorAll('[event-tracking]').forEach(setupEventTracking)
