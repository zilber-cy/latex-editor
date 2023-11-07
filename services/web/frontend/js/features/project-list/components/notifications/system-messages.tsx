import { useEffect } from 'react'
import SystemMessage from './system-message'
import TranslationMessage from './translation-message'
import useAsync from '../../../../shared/hooks/use-async'
import { getJSON } from '../../../../infrastructure/fetch-json'
import getMeta from '../../../../utils/meta'
import {
  SystemMessage as TSystemMessage,
  SuggestedLanguage,
} from '../../../../../../types/project/dashboard/system-message'

const MESSAGE_POLL_INTERVAL = 15 * 60 * 1000

function SystemMessages() {
  const { data: messages, runAsync } = useAsync<TSystemMessage[]>()
  const suggestedLanguage = getMeta('ol-suggestedLanguage', undefined) as
    | SuggestedLanguage
    | undefined

  useEffect(() => {
    const pollMessages = () => {
      // Ignore polling if tab is hidden or browser is offline
      if (document.hidden || !navigator.onLine) {
        return
      }

      runAsync(getJSON('/system/messages')).catch(console.error)
    }
    pollMessages()

    const interval = setInterval(pollMessages, MESSAGE_POLL_INTERVAL)

    return () => {
      clearInterval(interval)
    }
  }, [runAsync])

  if (!messages?.length && !suggestedLanguage) {
    return null
  }

  return (
    <ul className="system-messages">
      {messages?.map((message, idx) => (
        <SystemMessage key={idx} id={message._id}>
          {message.content}
        </SystemMessage>
      ))}
      {suggestedLanguage ? <TranslationMessage /> : null}
    </ul>
  )
}

export default SystemMessages
