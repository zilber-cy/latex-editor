import { screen, fireEvent } from '@testing-library/react'
import { expect } from 'chai'
import fetchMock from 'fetch-mock'
import DictionaryModal from '../../../../../frontend/js/features/dictionary/components/dictionary-modal'
import { renderWithEditorContext } from '../../../helpers/render-with-context'

function setLearnedWords(words) {
  window.metaAttributesCache.set('ol-learnedWords', words)
  window.dispatchEvent(new CustomEvent('learnedWords:doreset'))
}
describe('<DictionaryModalContent />', function () {
  beforeEach(function () {
    window.metaAttributesCache = window.metaAttributesCache || new Map()
  })

  afterEach(function () {
    window.metaAttributesCache = new Map()
    fetchMock.reset()
  })

  it('list words', async function () {
    setLearnedWords(['foo', 'bar'])
    renderWithEditorContext(<DictionaryModal show handleHide={() => {}} />)
    screen.getByText('foo')
    screen.getByText('bar')
  })

  it('shows message when empty', async function () {
    setLearnedWords([])
    renderWithEditorContext(<DictionaryModal show handleHide={() => {}} />)
    screen.getByText('Your custom dictionary is empty.')
  })

  it('removes words', async function () {
    fetchMock.post('/spelling/unlearn', 200)
    setLearnedWords(['Foo', 'bar'])
    renderWithEditorContext(<DictionaryModal show handleHide={() => {}} />)
    screen.getByText('bar')
    const [firstButton] = screen.getAllByRole('button', {
      name: 'Remove from dictionary',
    })
    fireEvent.click(firstButton)
    expect(screen.queryByText('bar')).to.not.exist
    screen.getByText('Foo')
  })

  it('handles errors', async function () {
    fetchMock.post('/spelling/unlearn', 500)
    setLearnedWords(['foo'])
    renderWithEditorContext(<DictionaryModal show handleHide={() => {}} />)
    const [firstButton] = screen.getAllByRole('button', {
      name: 'Remove from dictionary',
    })
    fireEvent.click(firstButton)
    await fetchMock.flush()
    screen.getByText('Sorry, something went wrong')
    screen.getByText('Your custom dictionary is empty.')
  })
})
