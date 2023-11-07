import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import LeaveProjectModal from '../../../modals/leave-project-modal'
import useIsMounted from '../../../../../../shared/hooks/use-is-mounted'
import { useProjectListContext } from '../../../../context/project-list-context'
import { leaveProject } from '../../../../util/api'
import { Project } from '../../../../../../../../types/project/dashboard/api'

function LeaveProjectsButton() {
  const { t } = useTranslation()
  const {
    selectedProjects,
    removeProjectFromView,
    hasLeavableProjectsSelected,
    hasDeletableProjectsSelected,
  } = useProjectListContext()
  const [showModal, setShowModal] = useState(false)
  const isMounted = useIsMounted()

  const handleOpenModal = () => {
    setShowModal(true)
  }

  const handleCloseModal = () => {
    if (isMounted.current) {
      setShowModal(false)
    }
  }

  const handleLeaveProject = async (project: Project) => {
    await leaveProject(project.id)

    removeProjectFromView(project)
  }

  return (
    <>
      {!hasDeletableProjectsSelected && hasLeavableProjectsSelected && (
        <Button bsStyle={null} className="btn-danger" onClick={handleOpenModal}>
          {t('leave')}
        </Button>
      )}
      <LeaveProjectModal
        projects={selectedProjects}
        actionHandler={handleLeaveProject}
        showModal={showModal}
        handleCloseModal={handleCloseModal}
      />
    </>
  )
}

export default LeaveProjectsButton
