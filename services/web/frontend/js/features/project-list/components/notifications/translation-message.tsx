import { Trans, useTranslation } from 'react-i18next'
import Close from '../../../../shared/components/close'
import usePersistedState from '../../../../shared/hooks/use-persisted-state'
import getMeta from '../../../../utils/meta'
import { SuggestedLanguage } from '../../../../../../types/project/dashboard/system-message'

function TranslationMessage() {
  const { t } = useTranslation()
  const [hidden, setHidden] = usePersistedState('hide-i18n-notification', false)
  const config = getMeta('ol-suggestedLanguage') as SuggestedLanguage
  const currentUrl = getMeta('ol-currentUrl') as string

  if (hidden) {
    return null
  }

  return (
    <li className="system-message">
      <Close onDismiss={() => setHidden(true)} />
      <div className="text-center">
        <a href={config.url + currentUrl}>
          <Trans
            i18nKey="click_here_to_view_sl_in_lng"
            components={[<strong />]} // eslint-disable-line react/jsx-key
            values={{ lngName: config.lngName }}
          />
          <img
            className="ms-1"
            src={config.imgUrl}
            alt={t('country_flag', { country: config.lngName })}
            aria-hidden
          />
        </a>
      </div>
    </li>
  )
}

export default TranslationMessage
