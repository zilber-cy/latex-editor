import { screen, within } from '@testing-library/dom'
import { expect } from 'chai'
import fetchMock from 'fetch-mock'
import SettingsFontFamily from '../../../../../../frontend/js/features/editor-left-menu/components/settings/settings-font-family'
import { renderWithEditorContext } from '../../../../helpers/render-with-context'

describe('<SettingsFontFamily />', function () {
  afterEach(function () {
    fetchMock.reset()
  })

  it('shows correct menu', async function () {
    renderWithEditorContext(<SettingsFontFamily />)

    const select = screen.getByLabelText('Font Family')

    const optionMonaco = within(select).getByText('Monaco / Menlo / Consolas')
    expect(optionMonaco.getAttribute('value')).to.equal('monaco')

    const optionLucida = within(select).getByText('Lucida / Source Code Pro')
    expect(optionLucida.getAttribute('value')).to.equal('lucida')
  })
})
