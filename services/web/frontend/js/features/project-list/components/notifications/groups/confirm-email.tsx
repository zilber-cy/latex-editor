import { Trans, useTranslation } from 'react-i18next'
import { Button } from 'react-bootstrap'
import Notification from '../notification'
import Icon from '../../../../../shared/components/icon'
import getMeta from '../../../../../utils/meta'
import useAsync from '../../../../../shared/hooks/use-async'
import { useProjectListContext } from '../../../context/project-list-context'
import {
  postJSON,
  getUserFacingMessage,
} from '../../../../../infrastructure/fetch-json'
import { ExposedSettings } from '../../../../../../../types/exposed-settings'
import { UserEmailData } from '../../../../../../../types/user-email'

const ssoAvailable = ({ samlProviderId, affiliation }: UserEmailData) => {
  const { hasSamlFeature, hasSamlBeta } = getMeta(
    'ol-ExposedSettings'
  ) as ExposedSettings

  if (!hasSamlFeature) {
    return false
  }
  if (samlProviderId) {
    return true
  }
  if (!affiliation?.institution) {
    return false
  }
  if (affiliation.institution.ssoEnabled) {
    return true
  }
  if (hasSamlBeta && affiliation.institution.ssoBeta) {
    return true
  }
  return false
}

function emailHasLicenceAfterConfirming(emailData: UserEmailData) {
  if (emailData.confirmedAt) {
    return false
  }
  if (!emailData.affiliation) {
    return false
  }
  const affiliation = emailData.affiliation
  const institution = affiliation.institution
  if (!institution) {
    return false
  }
  if (!institution.confirmed) {
    return false
  }
  if (affiliation.pastReconfirmDate) {
    return false
  }

  return affiliation.institution.commonsAccount
}

const showConfirmEmail = (userEmail: UserEmailData) => {
  const { emailConfirmationDisabled } = getMeta(
    'ol-ExposedSettings'
  ) as ExposedSettings

  return (
    !emailConfirmationDisabled &&
    !userEmail.confirmedAt &&
    !ssoAvailable(userEmail)
  )
}

function ConfirmEmailNotification({ userEmail }: { userEmail: UserEmailData }) {
  const { t } = useTranslation()
  const { isLoading, isSuccess, isError, error, runAsync } = useAsync()

  const handleResendConfirmationEmail = ({ email }: UserEmailData) => {
    runAsync(
      postJSON('/user/emails/resend_confirmation', {
        body: { email },
      })
    ).catch(console.error)
  }

  if (isSuccess) {
    return null
  }

  if (emailHasLicenceAfterConfirming(userEmail)) {
    return (
      <Notification bsStyle="info">
        <Notification.Body data-testid="notification-body">
          {isLoading ? (
            <>
              <Icon type="spinner" spin /> {t('resending_confirmation_email')}
              &hellip;
            </>
          ) : isError ? (
            <div aria-live="polite">{getUserFacingMessage(error)}</div>
          ) : (
            <>
              <Trans
                i18nKey="one_step_away_from_professional_features"
                components={[<strong />]} // eslint-disable-line react/jsx-key
              />
              <button
                className="pull-right btn btn-info btn-sm"
                onClick={() => handleResendConfirmationEmail(userEmail)}
              >
                {t('resend_email')}
              </button>
              <br />
              <Trans
                i18nKey="institution_has_overleaf_subscription"
                values={{
                  institutionName: userEmail.affiliation?.institution.name,
                  emailAddress: userEmail.email,
                }}
                components={[<strong />]} // eslint-disable-line react/jsx-key
              />
            </>
          )}
        </Notification.Body>
      </Notification>
    )
  }

  return (
    <Notification bsStyle="warning">
      <Notification.Body data-testid="pro-notification-body">
        {isLoading ? (
          <>
            <Icon type="spinner" spin /> {t('resending_confirmation_email')}
            &hellip;
          </>
        ) : isError ? (
          <div aria-live="polite">{getUserFacingMessage(error)}</div>
        ) : (
          <>
            {t('please_confirm_email', {
              emailAddress: userEmail.email,
            })}{' '}
            <Button
              bsStyle="link"
              className="btn-inline-link"
              onClick={() => handleResendConfirmationEmail(userEmail)}
            >
              ({t('resend_confirmation_email')})
            </Button>
          </>
        )}
      </Notification.Body>
    </Notification>
  )
}

function ConfirmEmail() {
  const { totalProjectsCount } = useProjectListContext()
  const userEmails = getMeta('ol-userEmails', []) as UserEmailData[]

  if (!totalProjectsCount || !userEmails.length) {
    return null
  }

  return (
    <>
      {userEmails.map(userEmail => {
        return showConfirmEmail(userEmail) ? (
          <ConfirmEmailNotification
            key={`confirm-email-${userEmail.email}`}
            userEmail={userEmail}
          />
        ) : null
      })}
    </>
  )
}

export default ConfirmEmail
