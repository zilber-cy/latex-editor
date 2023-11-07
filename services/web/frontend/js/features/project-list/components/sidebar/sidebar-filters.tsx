import { useTranslation } from 'react-i18next'
import { Button } from 'react-bootstrap'
import {
  Filter,
  useProjectListContext,
} from '../../context/project-list-context'
import TagsList from './tags-list'
import ProjectsFilterMenu from '../projects-filter-menu'

type SidebarFilterProps = {
  filter: Filter
  text: React.ReactNode
}

export function SidebarFilter({ filter, text }: SidebarFilterProps) {
  const { selectFilter } = useProjectListContext()

  return (
    <ProjectsFilterMenu filter={filter}>
      {isActive => (
        <li className={isActive ? 'active' : ''}>
          <Button onClick={() => selectFilter(filter)} bsStyle={null}>
            {text}
          </Button>
        </li>
      )}
    </ProjectsFilterMenu>
  )
}

export default function SidebarFilters() {
  const { t } = useTranslation()

  return (
    <ul className="list-unstyled project-list-filters">
      <SidebarFilter filter="all" text={t('all_projects')} />
      <SidebarFilter filter="owned" text={t('your_projects')} />
      <SidebarFilter filter="shared" text={t('shared_with_you')} />
      <SidebarFilter filter="archived" text={t('archived_projects')} />
      <SidebarFilter filter="trashed" text={t('trashed_projects')} />
      <TagsList />
    </ul>
  )
}
