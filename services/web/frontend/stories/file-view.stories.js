import FileView from '../js/features/file-view/components/file-view'
import useFetchMock from './hooks/use-fetch-mock'
import { ScopeDecorator } from './decorators/scope'

const bodies = {
  latex: `\\documentclass{article}
\\begin{document}
First document. This is a simple example, with no
extra parameters or packages included.
\\end{document}`,
  bibtex: `@book{latexcompanion,
    author    = "Michel Goossens and Frank Mittelbach and Alexander Samarin",
    title     = "The \\LaTeX\\ Companion",
    year      = "1993",
    publisher = "Addison-Wesley",
    address   = "Reading, Massachusetts"
}`,
  text: `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
}

const setupFetchMock = fetchMock => {
  return fetchMock
    .head('express:/project/:project_id/file/:file_id', {
      status: 201,
      headers: { 'Content-Length': 10000 },
    })
    .post('express:/project/:project_id/linked_file/:file_id/refresh', {
      status: 204,
    })
    .post('express:/project/:project_id/references/indexAll', {
      status: 204,
    })
}

const fileData = {
  id: 'file-id',
  name: 'file.tex',
  created: new Date().toISOString(),
}

export const FileFromUrl = args => {
  useFetchMock(fetchMock =>
    setupFetchMock(fetchMock).get(
      'express:/project/:project_id/file/:file_id',
      { body: bodies.latex }
    )
  )

  return <FileView {...args} />
}
FileFromUrl.args = {
  file: {
    ...fileData,
    linkedFileData: {
      url: 'https://example.com/source-file.tex',
      provider: 'url',
    },
  },
}

export const FileFromProjectWithLinkableProjectId = args => {
  useFetchMock(fetchMock =>
    setupFetchMock(fetchMock).get(
      'express:/project/:project_id/file/:file_id',
      { body: bodies.latex }
    )
  )

  return <FileView {...args} />
}
FileFromProjectWithLinkableProjectId.args = {
  file: {
    ...fileData,
    linkedFileData: {
      source_project_id: 'source-project-id',
      source_entity_path: '/source-file.tex',
      provider: 'project_file',
    },
  },
}

export const FileFromProjectWithoutLinkableProjectId = args => {
  useFetchMock(fetchMock =>
    setupFetchMock(fetchMock).get(
      'express:/project/:project_id/file/:file_id',
      { body: bodies.latex }
    )
  )

  return <FileView {...args} />
}
FileFromProjectWithoutLinkableProjectId.args = {
  file: {
    ...fileData,
    linkedFileData: {
      v1_source_doc_id: 'v1-source-id',
      source_entity_path: '/source-file.tex',
      provider: 'project_file',
    },
  },
}

export const FileFromProjectOutputWithLinkableProject = args => {
  useFetchMock(fetchMock =>
    setupFetchMock(fetchMock).get(
      'express:/project/:project_id/file/:file_id',
      { body: bodies.latex }
    )
  )

  return <FileView {...args} />
}
FileFromProjectOutputWithLinkableProject.args = {
  file: {
    ...fileData,
    linkedFileData: {
      source_project_id: 'source_project_id',
      source_output_file_path: '/source-file.tex',
      provider: 'project_output_file',
    },
  },
}

export const FileFromProjectOutputWithoutLinkableProjectId = args => {
  useFetchMock(fetchMock =>
    setupFetchMock(fetchMock).get(
      'express:/project/:project_id/file/:file_id',
      { body: bodies.latex }
    )
  )

  return <FileView {...args} />
}
FileFromProjectOutputWithoutLinkableProjectId.args = {
  file: {
    ...fileData,
    linkedFileData: {
      v1_source_doc_id: 'v1-source-id',
      source_output_file_path: '/source-file.tex',
      provider: 'project_output_file',
    },
  },
}

export const ImageFile = args => {
  useFetchMock(setupFetchMock) // NOTE: can't mock img src request

  return <FileView {...args} />
}
ImageFile.storyName = 'Image File (Error)'
ImageFile.args = {
  file: {
    ...fileData,
    id: '60097ca20454610027c442a8',
    name: 'file.jpg',
    linkedFileData: {
      source_project_id: 'source_project_id',
      source_entity_path: '/source-file.jpg',
      provider: 'project_file',
    },
  },
}

export const ThirdPartyReferenceFile = args => {
  useFetchMock(fetchMock =>
    setupFetchMock(fetchMock).get(
      'express:/project/:project_id/file/:file_id',
      { body: bodies.bibtex }
    )
  )

  return <FileView {...args} />
}

ThirdPartyReferenceFile.args = {
  file: {
    ...fileData,
    name: 'references.bib',
    linkedFileData: {
      provider: 'zotero',
    },
  },
}

export const ThirdPartyReferenceFileWithError = args => {
  useFetchMock(fetchMock =>
    setupFetchMock(fetchMock).head(
      'express:/project/:project_id/file/:file_id',
      { status: 500 },
      { overwriteRoutes: true }
    )
  )
  return <FileView {...args} />
}
ThirdPartyReferenceFileWithError.storyName =
  'Third Party Reference File (Error)'
ThirdPartyReferenceFileWithError.args = {
  file: {
    ...fileData,
    id: '500500500500500500500500',
    name: 'references.bib',
    linkedFileData: {
      provider: 'zotero',
    },
  },
}

export const TextFile = args => {
  useFetchMock(fetchMock =>
    setupFetchMock(fetchMock).get(
      'express:/project/:project_id/file/:file_id',
      { body: bodies.text },
      { overwriteRoutes: true }
    )
  )
  return <FileView {...args} />
}
TextFile.args = {
  file: {
    ...fileData,
    linkedFileData: {
      source_project_id: 'source-project-id',
      source_entity_path: '/source-file.txt',
      provider: 'project_file',
    },
    name: 'file.txt',
  },
}

export const UploadedFile = args => {
  useFetchMock(fetchMock =>
    setupFetchMock(fetchMock).head(
      'express:/project/:project_id/file/:file_id',
      { status: 500 },
      { overwriteRoutes: true }
    )
  )
  return <FileView {...args} />
}
UploadedFile.storyName = 'Uploaded File (Error)'
UploadedFile.args = {
  file: {
    ...fileData,
    linkedFileData: null,
    name: 'file.jpg',
  },
}

export default {
  title: 'Editor / FileView',
  component: FileView,
  argTypes: {
    storeReferencesKeys: { action: 'store references keys' },
  },
  decorators: [ScopeDecorator],
}
