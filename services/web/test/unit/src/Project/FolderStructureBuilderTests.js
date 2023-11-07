const { expect } = require('chai')
const sinon = require('sinon')
const SandboxedModule = require('sandboxed-module')

const MODULE_PATH =
  '../../../../app/src/Features/Project/FolderStructureBuilder'
const MOCK_OBJECT_ID = 'MOCK_OBJECT_ID'

describe('FolderStructureBuilder', function () {
  beforeEach(function () {
    this.ObjectId = sinon.stub().returns(MOCK_OBJECT_ID)
    this.FolderStructureBuilder = SandboxedModule.require(MODULE_PATH, {
      requires: {
        mongodb: { ObjectId: this.ObjectId },
      },
    })
  })

  describe('buildFolderStructure', function () {
    describe('when given no documents at all', function () {
      beforeEach(function () {
        this.result = this.FolderStructureBuilder.buildFolderStructure([], [])
      })

      it('returns an empty root folder', function () {
        expect(this.result).to.deep.equal({
          _id: MOCK_OBJECT_ID,
          name: 'rootFolder',
          folders: [],
          docs: [],
          fileRefs: [],
        })
      })
    })

    describe('when given documents and files', function () {
      beforeEach(function () {
        const docUploads = [
          { path: '/main.tex', doc: { _id: 'doc-1', name: 'main.tex' } },
          { path: '/foo/other.tex', doc: { _id: 'doc-2', name: 'other.tex' } },
          { path: '/foo/other.bib', doc: { _id: 'doc-3', name: 'other.bib' } },
          {
            path: '/foo/foo1/foo2/another.tex',
            doc: { _id: 'doc-4', name: 'another.tex' },
          },
        ]
        const fileUploads = [
          { path: '/aaa.jpg', file: { _id: 'file-1', name: 'aaa.jpg' } },
          { path: '/foo/bbb.jpg', file: { _id: 'file-2', name: 'bbb.jpg' } },
          { path: '/bar/ccc.jpg', file: { _id: 'file-3', name: 'ccc.jpg' } },
        ]
        this.result = this.FolderStructureBuilder.buildFolderStructure(
          docUploads,
          fileUploads
        )
      })

      it('returns a full folder structure', function () {
        expect(this.result).to.deep.equal({
          _id: MOCK_OBJECT_ID,
          name: 'rootFolder',
          docs: [{ _id: 'doc-1', name: 'main.tex' }],
          fileRefs: [{ _id: 'file-1', name: 'aaa.jpg' }],
          folders: [
            {
              _id: MOCK_OBJECT_ID,
              name: 'foo',
              docs: [
                { _id: 'doc-2', name: 'other.tex' },
                { _id: 'doc-3', name: 'other.bib' },
              ],
              fileRefs: [{ _id: 'file-2', name: 'bbb.jpg' }],
              folders: [
                {
                  _id: MOCK_OBJECT_ID,
                  name: 'foo1',
                  docs: [],
                  fileRefs: [],
                  folders: [
                    {
                      _id: MOCK_OBJECT_ID,
                      name: 'foo2',
                      docs: [{ _id: 'doc-4', name: 'another.tex' }],
                      fileRefs: [],
                      folders: [],
                    },
                  ],
                },
              ],
            },
            {
              _id: MOCK_OBJECT_ID,
              name: 'bar',
              docs: [],
              fileRefs: [{ _id: 'file-3', name: 'ccc.jpg' }],
              folders: [],
            },
          ],
        })
      })
    })

    describe('when given duplicate files', function () {
      it('throws an error', function () {
        const docUploads = [
          { path: '/foo/doc.tex', doc: { _id: 'doc-1', name: 'doc.tex' } },
          { path: '/foo/doc.tex', doc: { _id: 'doc-2', name: 'doc.tex' } },
        ]
        expect(() =>
          this.FolderStructureBuilder.buildFolderStructure(docUploads, [])
        ).to.throw()
      })
    })
  })
})
