import { expect } from 'chai'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { LeaveProjectButtonTooltip } from '../../../../../../../../frontend/js/features/project-list/components/table/cells/action-buttons/leave-project-button'
import {
  trashedProject,
  trashedAndNotOwnedProject,
  archivedProject,
  archiveableProject,
} from '../../../../fixtures/projects-data'
import fetchMock from 'fetch-mock'
import {
  renderWithProjectListContext,
  resetProjectListContextFetch,
} from '../../../../helpers/render-with-context'

describe('<LeaveProjectButtton />', function () {
  afterEach(function () {
    resetProjectListContextFetch()
  })

  it('renders tooltip for button', function () {
    renderWithProjectListContext(
      <LeaveProjectButtonTooltip project={trashedAndNotOwnedProject} />
    )
    const btn = screen.getByLabelText('Leave')
    fireEvent.mouseOver(btn)
    screen.getByRole('tooltip', { name: 'Leave' })
  })

  it('does not render button when owner', function () {
    window.user_id = trashedProject?.owner?.id
    renderWithProjectListContext(
      <LeaveProjectButtonTooltip project={trashedProject} />
    )
    const btn = screen.queryByLabelText('Leave')
    expect(btn).to.be.null
  })

  it('does not render the button when project is archived', function () {
    renderWithProjectListContext(
      <LeaveProjectButtonTooltip project={archivedProject} />
    )
    expect(screen.queryByLabelText('Leave')).to.be.null
  })

  it('does not render the button when project is current', function () {
    renderWithProjectListContext(
      <LeaveProjectButtonTooltip project={archiveableProject} />
    )
    expect(screen.queryByLabelText('Leave')).to.be.null
  })

  it('opens the modal and leaves the project', async function () {
    const project = Object.assign({}, trashedAndNotOwnedProject)
    const leaveProjectMock = fetchMock.post(
      `express:/project/${project.id}/leave`,
      {
        status: 200,
      },
      { delay: 0 }
    )
    renderWithProjectListContext(
      <LeaveProjectButtonTooltip project={project} />
    )
    const btn = screen.getByLabelText('Leave')
    fireEvent.click(btn)
    screen.getByText('Leave Projects')
    screen.getByText('You are about to leave the following projects:')
    screen.getByText('This action cannot be undone.')
    const confirmBtn = screen.getByText('Confirm') as HTMLButtonElement
    fireEvent.click(confirmBtn)
    expect(confirmBtn.disabled).to.be.true

    await waitFor(
      () =>
        expect(leaveProjectMock.called(`/project/${project.id}/leave`)).to.be
          .true
    )
  })
})
