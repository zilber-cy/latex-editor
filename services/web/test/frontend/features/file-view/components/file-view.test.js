import {
  screen,
  waitForElementToBeRemoved,
  fireEvent,
} from '@testing-library/react'
import fetchMock from 'fetch-mock'

import { renderWithEditorContext } from '../../../helpers/render-with-context'
import FileView from '../../../../../frontend/js/features/file-view/components/file-view.js'

describe('<FileView/>', function () {
  const textFile = {
    id: 'text-file',
    name: 'example.tex',
    linkedFileData: {
      v1_source_doc_id: 'v1-source-id',
      source_project_id: 'source-project-id',
      source_entity_path: '/source-entity-path.ext',
      provider: 'project_file',
    },
    created: new Date(2021, 1, 17, 3, 24).toISOString(),
  }

  const imageFile = {
    id: '60097ca20454610027c442a8',
    name: 'file.jpg',
    linkedFileData: {
      source_entity_path: '/source-entity-path',
      provider: 'project_file',
    },
  }

  beforeEach(function () {
    fetchMock.reset()
  })

  describe('for a text file', function () {
    it('shows a loading indicator while the file is loading', async function () {
      fetchMock.head('express:/project/:project_id/file/:file_id', {
        status: 201,
        headers: { 'Content-Length': 10000 },
      })
      fetchMock.get(
        'express:/project/:project_id/file/:file_id',
        'Text file content'
      )

      renderWithEditorContext(
        <FileView file={textFile} storeReferencesKeys={() => {}} />
      )

      await waitForElementToBeRemoved(() =>
        screen.getByText('Loading', { exact: false })
      )
    })

    it('shows messaging if the text view could not be loaded', async function () {
      const unpreviewableTextFile = {
        ...textFile,
        name: 'example.not-tex',
      }

      renderWithEditorContext(
        <FileView file={unpreviewableTextFile} storeReferencesKeys={() => {}} />
      )

      await screen.findByText('Sorry, no preview is available', {
        exact: false,
      })
    })
  })

  describe('for an image file', function () {
    it('shows a loading indicator while the file is loading', async function () {
      renderWithEditorContext(
        <FileView file={imageFile} storeReferencesKeys={() => {}} />
      )

      screen.getByText('Loading', { exact: false })
    })

    it('shows messaging if the image could not be loaded', async function () {
      renderWithEditorContext(
        <FileView file={imageFile} storeReferencesKeys={() => {}} />
      )

      // Fake the image request failing as the request is handled by the browser
      fireEvent.error(screen.getByRole('img'))

      await screen.findByText('Sorry, no preview is available', {
        exact: false,
      })
    })
  })
})
