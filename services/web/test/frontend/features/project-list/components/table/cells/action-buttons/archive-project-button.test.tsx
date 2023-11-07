import { expect } from 'chai'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { ArchiveProjectButtonTooltip } from '../../../../../../../../frontend/js/features/project-list/components/table/cells/action-buttons/archive-project-button'
import {
  archiveableProject,
  archivedProject,
} from '../../../../fixtures/projects-data'
import fetchMock from 'fetch-mock'
import {
  resetProjectListContextFetch,
  renderWithProjectListContext,
} from '../../../../helpers/render-with-context'

describe('<ArchiveProjectButton />', function () {
  afterEach(function () {
    resetProjectListContextFetch()
  })

  it('renders tooltip for button', function () {
    renderWithProjectListContext(
      <ArchiveProjectButtonTooltip project={archiveableProject} />
    )
    const btn = screen.getByLabelText('Archive')
    fireEvent.mouseOver(btn)
    screen.getByRole('tooltip', { name: 'Archive' })
  })

  it('opens the modal when clicked', function () {
    renderWithProjectListContext(
      <ArchiveProjectButtonTooltip project={archiveableProject} />
    )
    const btn = screen.getByLabelText('Archive')
    fireEvent.click(btn)
    screen.getByText('Archive Projects')
    screen.getByText(archiveableProject.name)
  })

  it('does not render the button when already archived', function () {
    renderWithProjectListContext(
      <ArchiveProjectButtonTooltip project={archivedProject} />
    )
    expect(screen.queryByLabelText('Archive')).to.be.null
  })

  it('should archive the projects', async function () {
    const project = Object.assign({}, archiveableProject)
    const archiveProjectMock = fetchMock.post(
      `express:/project/:projectId/archive`,
      {
        status: 200,
      },
      { delay: 0 }
    )
    renderWithProjectListContext(
      <ArchiveProjectButtonTooltip project={project} />
    )
    const btn = screen.getByLabelText('Archive')
    fireEvent.click(btn)
    screen.getByText('Archive Projects')
    screen.getByText('You are about to archive the following projects:')
    screen.getByText('Archiving projects won’t affect your collaborators.')
    const confirmBtn = screen.getByText('Confirm') as HTMLButtonElement
    fireEvent.click(confirmBtn)
    expect(confirmBtn.disabled).to.be.true

    await waitFor(
      () =>
        expect(archiveProjectMock.called(`/project/${project.id}/archive`)).to
          .be.true
    )
  })
})
