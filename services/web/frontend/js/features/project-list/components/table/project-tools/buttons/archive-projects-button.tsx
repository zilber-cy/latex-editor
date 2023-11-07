import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from '../../../../../../shared/components/icon'
import Tooltip from '../../../../../../shared/components/tooltip'
import ArchiveProjectModal from '../../../modals/archive-project-modal'
import useIsMounted from '../../../../../../shared/hooks/use-is-mounted'
import { useProjectListContext } from '../../../../context/project-list-context'
import { archiveProject } from '../../../../util/api'
import { Project } from '../../../../../../../../types/project/dashboard/api'

function ArchiveProjectsButton() {
  const { selectedProjects, updateProjectViewData } = useProjectListContext()
  const { t } = useTranslation()
  const text = t('archive')

  const [showModal, setShowModal] = useState(false)
  const isMounted = useIsMounted()

  const handleOpenModal = useCallback(() => {
    setShowModal(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    if (isMounted.current) {
      setShowModal(false)
    }
  }, [isMounted])

  const handleArchiveProject = async (project: Project) => {
    await archiveProject(project.id)

    updateProjectViewData({
      ...project,
      archived: true,
      selected: false,
      trashed: false,
    })
  }

  return (
    <>
      <Tooltip
        id="tooltip-archive-projects"
        description={text}
        overlayProps={{ placement: 'bottom', trigger: ['hover', 'focus'] }}
      >
        <button
          className="btn btn-secondary"
          aria-label={text}
          onClick={handleOpenModal}
        >
          <Icon type="inbox" />
        </button>
      </Tooltip>
      <ArchiveProjectModal
        projects={selectedProjects}
        actionHandler={handleArchiveProject}
        showModal={showModal}
        handleCloseModal={handleCloseModal}
      />
    </>
  )
}

export default memo(ArchiveProjectsButton)
