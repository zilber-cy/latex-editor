import { memo, useCallback, useEffect } from 'react'
import { Button } from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import * as eventTracking from '../../../infrastructure/event-tracking'
import StartFreeTrialButton from '../../../shared/components/start-free-trial-button'
import { useDetachCompileContext } from '../../../shared/context/detach-compile-context'
import usePersistedState from '../../../shared/hooks/use-persisted-state'

const ONE_DAY = 24 * 60 * 60 * 24 * 1000

function CompileTimeWarning() {
  const { t } = useTranslation()

  const [displayStatus, setDisplayStatus] = usePersistedState(
    'compile-time-warning-display-status',
    { lastDisplayTime: 0, dismissed: false },
    true
  )

  const { showCompileTimeWarning, setShowCompileTimeWarning } =
    useDetachCompileContext()

  useEffect(() => {
    if (showCompileTimeWarning) {
      if (
        displayStatus &&
        Date.now() - displayStatus.lastDisplayTime < ONE_DAY
      ) {
        return
      }
      setDisplayStatus({ lastDisplayTime: Date.now(), dismissed: false })
      eventTracking.sendMB('compile-time-warning-displayed', { time: 30 })
    }
  }, [showCompileTimeWarning, displayStatus, setDisplayStatus])

  const getTimeSinceDisplayed = useCallback(() => {
    return (Date.now() - displayStatus.lastDisplayTime) / 1000
  }, [displayStatus])

  const closeWarning = useCallback(() => {
    eventTracking.sendMB('compile-time-warning-dismissed', {
      'time-since-displayed': getTimeSinceDisplayed(),
      time: 30,
    })
    setShowCompileTimeWarning(false)
    setDisplayStatus(displayStatus => ({ ...displayStatus, dismissed: true }))
  }, [getTimeSinceDisplayed, setShowCompileTimeWarning, setDisplayStatus])

  const handleUpgradeClick = useCallback(() => {
    eventTracking.sendMB('compile-time-warning-upgrade-click', {
      'time-since-displayed': getTimeSinceDisplayed(),
      time: 30,
    })
    setShowCompileTimeWarning(false)
    setDisplayStatus(displayStatus => ({ ...displayStatus, dismissed: true }))
  }, [getTimeSinceDisplayed, setShowCompileTimeWarning, setDisplayStatus])

  if (!showCompileTimeWarning || displayStatus.dismissed) {
    return null
  }

  return (
    <div className="alert alert-success compile-time-warning" role="alert">
      <Button
        className="close"
        data-dismiss="alert"
        aria-label="Close"
        onClick={closeWarning}
      >
        <span aria-hidden="true">&times;</span>
      </Button>
      <div className="warning-content">
        <div className="warning-text">
          <Trans
            i18nKey="approaching_compile_timeout_limit_upgrade_for_more_compile_time"
            // eslint-disable-next-line react/jsx-key
            components={[<strong style={{ display: 'inline-block' }} />]}
          />
        </div>
        <div className="upgrade-prompt">
          <StartFreeTrialButton
            buttonProps={{ bsStyle: 'primary', bsSize: 'sm' }}
            handleClick={handleUpgradeClick}
            source="compile-time-warning"
          >
            {t('upgrade')}
          </StartFreeTrialButton>
        </div>
      </div>
    </div>
  )
}

export default memo(CompileTimeWarning)
