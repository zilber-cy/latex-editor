import EmailsSection from '../../js/features/settings/components/emails-section'
import { SSOAlert } from '../../js/features/settings/components/emails/sso-alert'

export const Info = () => {
  window.metaAttributesCache = new Map()
  window.metaAttributesCache.set('ol-institutionLinked', {
    universityName: 'Overleaf University',
  })
  return <SSOAlert />
}

export const InfoWithEntitlement = () => {
  window.metaAttributesCache = new Map()
  window.metaAttributesCache.set('ol-institutionLinked', {
    universityName: 'Overleaf University',
    hasEntitlement: true,
  })
  return <SSOAlert />
}

export const NonCanonicalEmail = () => {
  window.metaAttributesCache = new Map()
  window.metaAttributesCache.set('ol-institutionLinked', {
    universityName: 'Overleaf University',
  })
  window.metaAttributesCache.set(
    'ol-institutionEmailNonCanonical',
    'user@example.com'
  )
  return <SSOAlert />
}

export const Error = () => {
  window.metaAttributesCache = new Map()
  window.metaAttributesCache.set('ol-samlError', {
    translatedMessage: 'There was an Error',
  })
  return <SSOAlert />
}

export const ErrorTranslated = () => {
  window.metaAttributesCache = new Map()
  window.metaAttributesCache.set('ol-samlError', {
    translatedMessage: 'Translated Error Message',
    message: 'There was an Error',
  })
  return <SSOAlert />
}

export const ErrorWithTryAgain = () => {
  window.metaAttributesCache = new Map()
  window.metaAttributesCache.set('ol-samlError', {
    message: 'There was an Error',
    tryAgain: true,
  })
  return <SSOAlert />
}

export default {
  title: 'Account Settings / SSO Alerts',
  component: EmailsSection,
}
