import { fireEvent, screen } from '@testing-library/react'
import ArchiveProjectsButton from '../../../../../../../../frontend/js/features/project-list/components/table/project-tools/buttons/archive-projects-button'
import {
  resetProjectListContextFetch,
  renderWithProjectListContext,
} from '../../../../helpers/render-with-context'

describe('<ArchiveProjectsButton />', function () {
  afterEach(function () {
    resetProjectListContextFetch()
  })

  it('renders tooltip for button', function () {
    renderWithProjectListContext(<ArchiveProjectsButton />)
    const btn = screen.getByLabelText('Archive')
    fireEvent.mouseOver(btn)
    screen.getByRole('tooltip', { name: 'Archive' })
  })

  it('opens the modal when clicked', function () {
    renderWithProjectListContext(<ArchiveProjectsButton />)
    const btn = screen.getByLabelText('Archive')
    fireEvent.click(btn)
    screen.getByText('Archive Projects')
  })
})
