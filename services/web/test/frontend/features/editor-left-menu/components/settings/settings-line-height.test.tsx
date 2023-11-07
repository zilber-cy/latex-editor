import { screen, within } from '@testing-library/dom'
import { expect } from 'chai'
import fetchMock from 'fetch-mock'
import SettingsLineHeight from '../../../../../../frontend/js/features/editor-left-menu/components/settings/settings-line-height'
import { renderWithEditorContext } from '../../../../helpers/render-with-context'

describe('<SettingsLineHeight />', function () {
  afterEach(function () {
    fetchMock.reset()
  })

  it('shows correct menu', async function () {
    renderWithEditorContext(<SettingsLineHeight />)

    const select = screen.getByLabelText('Line Height')

    const optionCompact = within(select).getByText('Compact')
    expect(optionCompact.getAttribute('value')).to.equal('compact')

    const optionNormal = within(select).getByText('Normal')
    expect(optionNormal.getAttribute('value')).to.equal('normal')

    const optionWide = within(select).getByText('Wide')
    expect(optionWide.getAttribute('value')).to.equal('wide')
  })
})
