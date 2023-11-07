import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import * as eventTracking from '../../../infrastructure/event-tracking'
import { useProjectContext } from '../../../shared/context/project-context'
import HotkeysModal from '../../hotkeys-modal/components/hotkeys-modal'
import useScopeValue from '../../../shared/hooks/use-scope-value'
import LeftMenuButton from './left-menu-button'

export default function HelpShowHotkeys() {
  const [showModal, setShowModal] = useState(false)
  const [newSourceEditor] = useScopeValue('editor.newSourceEditor')
  const { t } = useTranslation()
  const { features } = useProjectContext()
  const isMac = /Mac/.test(window.navigator?.platform)

  const showModalWithAnalytics = useCallback(() => {
    eventTracking.sendMB('left-menu-hotkeys')
    setShowModal(true)
  }, [])

  return (
    <>
      <LeftMenuButton
        onClick={showModalWithAnalytics}
        icon={{
          type: 'keyboard-o',
          fw: true,
        }}
      >
        {t('show_hotkeys')}
      </LeftMenuButton>
      <HotkeysModal
        show={showModal}
        handleHide={() => setShowModal(false)}
        isMac={isMac}
        trackChangesVisible={features?.trackChangesVisible}
        newSourceEditor={newSourceEditor}
      />
    </>
  )
}
