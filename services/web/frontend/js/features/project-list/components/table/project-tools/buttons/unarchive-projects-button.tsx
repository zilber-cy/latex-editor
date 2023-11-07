import { memo } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useProjectListContext } from '../../../../context/project-list-context'
import { unarchiveProject } from '../../../../util/api'

function UnarchiveProjectsButton() {
  const { selectedProjects, updateProjectViewData } = useProjectListContext()
  const { t } = useTranslation()

  const handleUnarchiveProjects = async () => {
    for (const project of selectedProjects) {
      await unarchiveProject(project.id)
      updateProjectViewData({ ...project, archived: false, selected: false })
    }
  }

  return (
    <Button
      bsStyle={null}
      className="btn-secondary"
      onClick={handleUnarchiveProjects}
    >
      {t('unarchive')}
    </Button>
  )
}

export default memo(UnarchiveProjectsButton)
