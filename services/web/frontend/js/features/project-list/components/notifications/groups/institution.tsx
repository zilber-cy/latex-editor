import { Fragment } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Button } from 'react-bootstrap'
import Notification from '../notification'
import Icon from '../../../../../shared/components/icon'
import getMeta from '../../../../../utils/meta'
import useAsyncDismiss from '../hooks/useAsyncDismiss'
import { ExposedSettings } from '../../../../../../../types/exposed-settings'
import { Institution as InstitutionType } from '../../../../../../../types/project/dashboard/notification'

function Institution() {
  const { t } = useTranslation()
  const { samlInitPath, appName } = getMeta(
    'ol-ExposedSettings'
  ) as ExposedSettings
  const notificationsInstitution = getMeta(
    'ol-notificationsInstitution',
    []
  ) as InstitutionType[]
  const { handleDismiss } = useAsyncDismiss()

  if (!notificationsInstitution.length) {
    return null
  }

  return (
    <>
      {notificationsInstitution.map(
        (
          {
            _id: id,
            email,
            institutionEmail,
            institutionId,
            institutionName,
            templateKey,
            requestedEmail,
            error,
          },
          index
        ) => (
          <Fragment key={index}>
            {templateKey === 'notification_institution_sso_available' && (
              <Notification bsStyle="info">
                <Notification.Body>
                  <p>
                    <Trans
                      i18nKey="can_link_institution_email_acct_to_institution_acct"
                      components={{ b: <b /> }}
                      values={{ appName, email, institutionName }}
                    />
                  </p>
                  <div>
                    <Trans
                      i18nKey="doing_this_allow_log_in_through_institution"
                      components={{ b: <b /> }}
                      values={{ appName }}
                    />{' '}
                    <a href="/learn/how-to/Institutional_Login">
                      {t('learn_more')}
                    </a>
                  </div>
                </Notification.Body>
                <Notification.Action>
                  <Button
                    bsStyle="info"
                    bsSize="sm"
                    href={`${samlInitPath}?university_id=${institutionId}&auto=/project&email=${email}`}
                  >
                    {t('link_account')}
                  </Button>
                </Notification.Action>
              </Notification>
            )}
            {templateKey === 'notification_institution_sso_linked' && (
              <Notification
                bsStyle="info"
                onDismiss={() => id && handleDismiss(id)}
              >
                <Notification.Body>
                  <Trans
                    i18nKey="account_has_been_link_to_institution_account"
                    components={{ b: <b /> }}
                    values={{ appName, email, institutionName }}
                  />
                </Notification.Body>
              </Notification>
            )}
            {templateKey === 'notification_institution_sso_non_canonical' && (
              <Notification
                bsStyle="warning"
                onDismiss={() => id && handleDismiss(id)}
              >
                <Notification.Body>
                  <Icon type="exclamation-triangle" fw />
                  <Trans
                    i18nKey="tried_to_log_in_with_email"
                    components={{ b: <b /> }}
                    values={{ appName, email: requestedEmail }}
                  />{' '}
                  <Trans
                    i18nKey="in_order_to_match_institutional_metadata_associated"
                    components={{ b: <b /> }}
                    values={{ email: institutionEmail }}
                  />
                </Notification.Body>
              </Notification>
            )}
            {templateKey ===
              'notification_institution_sso_already_registered' && (
              <Notification
                bsStyle="info"
                onDismiss={() => id && handleDismiss(id)}
              >
                <Notification.Body>
                  <Trans
                    i18nKey="tried_to_register_with_email"
                    components={{ b: <b /> }}
                    values={{ appName, email }}
                  />{' '}
                  {t('we_logged_you_in')}
                </Notification.Body>
                <Notification.Action>
                  <Button
                    bsStyle="info"
                    bsSize="sm"
                    href="/learn/how-to/Institutional_Login"
                  >
                    {t('find_out_more')}
                  </Button>
                </Notification.Action>
              </Notification>
            )}
            {templateKey === 'notification_institution_sso_error' && (
              <Notification
                bsStyle="danger"
                onDismiss={() => id && handleDismiss(id)}
              >
                <Notification.Body>
                  <Icon type="exclamation-triangle" fw />{' '}
                  {t('generic_something_went_wrong')}.
                  <div>
                    {error?.translatedMessage
                      ? error?.translatedMessage
                      : error?.message}
                  </div>
                  {error?.tryAgain ? `${t('try_again')}.` : null}
                </Notification.Body>
              </Notification>
            )}
          </Fragment>
        )
      )}
    </>
  )
}

export default Institution
