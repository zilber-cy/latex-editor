import { Trans, useTranslation } from 'react-i18next'
import { Publisher } from './managed-publishers'
import { RowLink } from './row-link'

type ManagedPublisherProps = {
  publisher: Publisher
}

export default function ManagedPublisher({ publisher }: ManagedPublisherProps) {
  const { t } = useTranslation()

  return (
    <div>
      <p>
        <Trans
          i18nKey="you_are_a_manager_of_publisher_x"
          components={[<strong />]} // eslint-disable-line react/jsx-key
          values={{
            publisherName: publisher.name || '',
          }}
        />
      </p>
      <RowLink
        href={`/publishers/${publisher.slug}/hub`}
        heading={t('view_hub')}
        subtext={t('view_hub_subtext')}
        icon="account_circle"
      />
      <RowLink
        href={`/manage/publishers/${publisher.slug}/managers`}
        heading={t('manage_publisher_managers')}
        subtext={t('manage_managers_subtext')}
        icon="manage_accounts"
      />
      <hr />
    </div>
  )
}
