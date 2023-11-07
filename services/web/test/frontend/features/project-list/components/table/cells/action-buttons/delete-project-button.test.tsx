import { expect } from 'chai'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { DeleteProjectButtonTooltip } from '../../../../../../../../frontend/js/features/project-list/components/table/cells/action-buttons/delete-project-button'
import {
  archiveableProject,
  trashedAndNotOwnedProject,
  trashedProject,
} from '../../../../fixtures/projects-data'
import fetchMock from 'fetch-mock'
import {
  renderWithProjectListContext,
  resetProjectListContextFetch,
} from '../../../../helpers/render-with-context'

describe('<DeleteProjectButton />', function () {
  afterEach(function () {
    resetProjectListContextFetch()
  })

  it('renders tooltip for button', function () {
    window.user_id = trashedProject?.owner?.id
    renderWithProjectListContext(
      <DeleteProjectButtonTooltip project={trashedProject} />
    )
    const btn = screen.getByLabelText('Delete')
    fireEvent.mouseOver(btn)
    screen.getByRole('tooltip', { name: 'Delete' })
  })

  it('does not render button when trashed and not owner', function () {
    window.user_id = '123abc'
    renderWithProjectListContext(
      <DeleteProjectButtonTooltip project={trashedAndNotOwnedProject} />
    )
    const btn = screen.queryByLabelText('Delete')
    expect(btn).to.be.null
  })

  it('does not render the button when project is current', function () {
    renderWithProjectListContext(
      <DeleteProjectButtonTooltip project={archiveableProject} />
    )
    expect(screen.queryByLabelText('Delete')).to.be.null
  })

  it('opens the modal and deletes the project', async function () {
    window.user_id = trashedProject?.owner?.id
    const project = Object.assign({}, trashedProject)
    const deleteProjectMock = fetchMock.delete(
      `express:/project/:projectId`,
      {
        status: 200,
      },
      { delay: 0 }
    )
    renderWithProjectListContext(
      <DeleteProjectButtonTooltip project={project} />
    )
    const btn = screen.getByLabelText('Delete')
    fireEvent.click(btn)
    screen.getByText('Delete Projects')
    screen.getByText('You are about to delete the following projects:')
    screen.getByText('This action cannot be undone.')
    const confirmBtn = screen.getByText('Confirm') as HTMLButtonElement
    fireEvent.click(confirmBtn)
    expect(confirmBtn.disabled).to.be.true

    await waitFor(
      () =>
        expect(deleteProjectMock.called(`/project/${project.id}`)).to.be.true
    )
  })
})
