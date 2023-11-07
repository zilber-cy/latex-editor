import SystemMessages from '../../js/features/project-list/components/notifications/system-messages'
import useFetchMock from '../hooks/use-fetch-mock'
import { FetchMockStatic } from 'fetch-mock'

export const SystemMessage = (args: any) => {
  useFetchMock((fetchMock: FetchMockStatic) => {
    fetchMock.get(/\/system\/messages/, [
      {
        _id: 1,
        content: `
          Closing this message will mark it as hidden.
          Remove it from the local storage to make it appear again.
        `,
      },
      {
        _id: 'protected',
        content: 'A protected message content - cannot be closed',
      },
    ])
  })
  window.metaAttributesCache = new Map()

  return <SystemMessages {...args} />
}

export const TranslationMessage = (args: any) => {
  useFetchMock((fetchMock: FetchMockStatic) => {
    fetchMock.get(/\/system\/messages/, [])
  })

  window.metaAttributesCache = new Map()
  window.metaAttributesCache.set('ol-suggestedLanguage', {
    url: '/dev/null',
    lngName: 'German',
    imgUrl: 'https://flagcdn.com/w40/de.png',
  })

  return <SystemMessages {...args} />
}

export default {
  title: 'Project List / System Messages',
  component: SystemMessages,
}
