import { merge, cloneDeep } from 'lodash'
import { FetchMockStatic } from 'fetch-mock'
import { UserEmailData } from '../../../../types/user-email'
import {
  Institution,
  Notification,
} from '../../../../types/project/dashboard/notification'
import { DeepPartial, DeepReadonly } from '../../../../types/utils'
import { Project } from '../../../../types/project/dashboard/api'

const MOCK_DELAY = 1000

const fakeInstitutionData = {
  email: 'example@zilber.cn',
  institutionEmail: 'institution@example.com',
  institutionId: 123,
  institutionName: 'Abc Institution',
  requestedEmail: 'requested@example.com',
} as DeepReadonly<Institution>

export const fakeReconfirmationUsersData = {
  affiliation: {
    institution: {
      ssoEnabled: false,
      ssoBeta: false,
      name: 'Abc Institution',
    },
  },
  samlProviderId: 'Saml Provider',
  email: 'reconfirmation-email@overleaf.com',
  default: false,
} as DeepReadonly<UserEmailData>

const fakeNotificationData = {
  messageOpts: {
    projectId: '123',
    projectName: 'Abc Project',
    ssoEnabled: false,
    institutionId: '456',
    userName: 'fakeUser',
    university_name: 'Abc University',
    token: 'abcdef',
  },
} as DeepReadonly<Notification>

export function defaultSetupMocks(fetchMock: FetchMockStatic) {
  // at least one project is required to show some notifications
  const projects = [{}] as Project[]
  fetchMock.post(/\/api\/project/, {
    status: 200,
    body: {
      projects,
      totalSize: projects.length,
    },
  })
}

export function setDefaultMeta() {
  window.metaAttributesCache = new Map()
  window.metaAttributesCache.set('ol-ExposedSettings', {
    ...window.metaAttributesCache.get('ol-ExposedSettings'),
    emailConfirmationDisabled: false,
    samlInitPath: '/fakeSaml',
    appName: 'Overleaf',
  })
  window.metaAttributesCache.set('ol-notificationsInstitution', [])
  window.metaAttributesCache.set('ol-userEmails', [])
}

export function errorsMocks(fetchMock: FetchMockStatic) {
  defaultSetupMocks(fetchMock)
  fetchMock.post(/\/user\/emails\/*/, 500, { delay: MOCK_DELAY })
  fetchMock.post(
    /\/project\/[A-Za-z0-9]+\/invite\/token\/[A-Za-z0-9]+\/accept/,
    500,
    { delay: MOCK_DELAY }
  )
  fetchMock.post(/\/user\/emails\/send-reconfirmation/, 500, {
    delay: MOCK_DELAY,
  })
}

export function setInstitutionMeta(institutionData: Partial<Institution>) {
  setDefaultMeta()
  window.metaAttributesCache.set('ol-notificationsInstitution', [
    merge(cloneDeep(fakeInstitutionData), institutionData),
  ])
}

export function institutionSetupMocks(fetchMock: FetchMockStatic) {
  defaultSetupMocks(fetchMock)
  fetchMock.delete(/\/notifications\/*/, 200, { delay: MOCK_DELAY })
}

export function setCommonMeta(notificationData: DeepPartial<Notification>) {
  setDefaultMeta()
  window.metaAttributesCache.set('ol-notifications', [
    merge(cloneDeep(fakeNotificationData), notificationData),
  ])
}

export function commonSetupMocks(fetchMock: FetchMockStatic) {
  defaultSetupMocks(fetchMock)
  fetchMock.post(
    /\/project\/[A-Za-z0-9]+\/invite\/token\/[A-Za-z0-9]+\/accept/,
    200,
    { delay: MOCK_DELAY }
  )
}

export function setReconfirmationMeta() {
  setDefaultMeta()
  window.metaAttributesCache.set('ol-userEmails', [fakeReconfirmationUsersData])
}

export function reconfirmationSetupMocks(fetchMock: FetchMockStatic) {
  defaultSetupMocks(fetchMock)
  fetchMock.post(/\/user\/emails\/resend_confirmation/, 200, {
    delay: MOCK_DELAY,
  })
}

export function setReconfirmAffiliationMeta() {
  setDefaultMeta()
  window.metaAttributesCache.set(
    'ol-reconfirmedViaSAML',
    fakeReconfirmationUsersData.samlProviderId
  )
}

export function reconfirmAffiliationSetupMocks(fetchMock: FetchMockStatic) {
  defaultSetupMocks(fetchMock)
  fetchMock.post(
    /\/api\/project/,
    {
      status: 200,
      body: {
        projects: [{}],
        totalSize: 0,
      },
    },
    { overwriteRoutes: true }
  )
  fetchMock.post(/\/user\/emails\/send-reconfirmation/, 200, {
    delay: MOCK_DELAY,
  })
}
