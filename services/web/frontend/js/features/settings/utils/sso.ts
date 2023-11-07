import getMeta from '../../../utils/meta'
import { DomainInfo } from '../components/emails/add-email/input'
import { ExposedSettings } from '../../../../../types/exposed-settings'
import { Institution } from '../../../../../types/institution'

export const ssoAvailableForDomain = (
  domain: DomainInfo | null
): domain is DomainInfo => {
  const { hasSamlBeta, hasSamlFeature } = getMeta(
    'ol-ExposedSettings'
  ) as ExposedSettings
  if (!hasSamlFeature || !domain || !domain.confirmed || !domain.university) {
    return false
  }
  if (domain.university.ssoEnabled) {
    return true
  }
  return Boolean(hasSamlBeta && domain.university.ssoBeta)
}

export const ssoAvailableForInstitution = (institution: Institution | null) => {
  const { hasSamlBeta, hasSamlFeature } = getMeta(
    'ol-ExposedSettings'
  ) as ExposedSettings
  if (
    !hasSamlFeature ||
    !institution ||
    !institution.confirmed ||
    !institution.isUniversity
  ) {
    return false
  }
  if (institution.ssoEnabled) {
    return true
  }
  return hasSamlBeta && institution.ssoBeta
}
