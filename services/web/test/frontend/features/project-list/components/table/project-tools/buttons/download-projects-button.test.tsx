import { fireEvent, screen } from '@testing-library/react'
import DownloadProjectsButton from '../../../../../../../../frontend/js/features/project-list/components/table/project-tools/buttons/download-projects-button'
import {
  resetProjectListContextFetch,
  renderWithProjectListContext,
} from '../../../../helpers/render-with-context'

describe('<DownloadProjectsButton />', function () {
  afterEach(function () {
    resetProjectListContextFetch()
  })

  it('renders tooltip for button', function () {
    renderWithProjectListContext(<DownloadProjectsButton />)
    const btn = screen.getByLabelText('Download')
    fireEvent.mouseOver(btn)
    screen.getByRole('tooltip', { name: 'Download' })
  })
})
