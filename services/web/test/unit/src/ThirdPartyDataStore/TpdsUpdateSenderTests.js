const { ObjectId } = require('mongodb')
const SandboxedModule = require('sandboxed-module')
const path = require('path')
const sinon = require('sinon')
const { expect } = require('chai')

const modulePath = path.join(
  __dirname,
  '../../../../app/src/Features/ThirdPartyDataStore/TpdsUpdateSender.js'
)

const projectId = 'project_id_here'
const userId = ObjectId()
const readOnlyRef = ObjectId()
const collaberatorRef = ObjectId()
const projectName = 'project_name_here'

const thirdPartyDataStoreApiUrl = 'http://third-party-json-store.herokuapp.com'
const siteUrl = 'http://www.localhost:3000'
const filestoreUrl = 'filestore.sharelatex.com'
const projectArchiverUrl = 'project-archiver.overleaf.com'

describe('TpdsUpdateSender', function () {
  beforeEach(function () {
    this.fakeUser = {
      _id: '12390i',
    }
    this.memberIds = [userId, collaberatorRef, readOnlyRef]
    this.enqueueUrl = new URL(
      'http://tpdsworker/enqueue/web_to_tpds_http_requests'
    )

    this.CollaboratorsGetter = {
      promises: {
        getInvitedMemberIds: sinon.stub().resolves(this.memberIds),
      },
    }
    this.docstoreUrl = 'docstore.sharelatex.env'
    this.response = {
      ok: true,
      json: sinon.stub(),
    }
    this.FetchUtils = {
      fetchNothing: sinon.stub().resolves(),
    }
    this.settings = {
      siteUrl,
      apis: {
        thirdPartyDataStore: { url: thirdPartyDataStoreApiUrl },
        filestore: {
          url: filestoreUrl,
        },
        docstore: {
          pubUrl: this.docstoreUrl,
        },
      },
    }
    const getUsers = sinon.stub()
    getUsers
      .withArgs({
        _id: {
          $in: this.memberIds,
        },
        'dropbox.access_token.uid': { $ne: null },
      })
      .resolves(
        this.memberIds.map(userId => {
          return { _id: userId }
        })
      )
    this.UserGetter = {
      promises: { getUsers },
    }
    this.TpdsUpdateSender = SandboxedModule.require(modulePath, {
      requires: {
        mongodb: { ObjectId },
        '@overleaf/settings': this.settings,
        '@overleaf/fetch-utils': this.FetchUtils,
        '../Collaborators/CollaboratorsGetter': this.CollaboratorsGetter,
        '../User/UserGetter.js': this.UserGetter,
        '@overleaf/metrics': {
          inc() {},
        },
      },
    })
  })

  describe('enqueue', function () {
    it('should not call request if there is no tpdsworker url', async function () {
      await this.TpdsUpdateSender.promises.enqueue(null, null, null)
      this.FetchUtils.fetchNothing.should.not.have.been.called
    })

    it('should post the message to the tpdsworker', async function () {
      this.settings.apis.tpdsworker = { url: 'http://tpdsworker' }
      const group0 = 'myproject'
      const method0 = 'somemethod0'
      const job0 = 'do something'
      await this.TpdsUpdateSender.promises.enqueue(group0, method0, job0)
      this.FetchUtils.fetchNothing.should.have.been.calledWithMatch(
        this.enqueueUrl,
        {
          method: 'POST',
          json: { group: group0, job: job0, method: method0 },
        }
      )
    })
  })

  describe('sending updates', function () {
    beforeEach(function () {
      this.settings.apis.tpdsworker = { url: 'http://tpdsworker' }
    })

    it('queues a post the file with user and file id', async function () {
      const fileId = '4545345'
      const path = '/some/path/here.jpg'

      await this.TpdsUpdateSender.promises.addFile({
        projectId,
        fileId,
        path,
        projectName,
      })

      expect(this.FetchUtils.fetchNothing).to.have.been.calledWithMatch(
        this.enqueueUrl,
        {
          json: {
            group: userId,
            method: 'pipeStreamFrom',
            job: {
              method: 'post',
              streamOrigin: `${filestoreUrl}/project/${projectId}/file/${fileId}`,
              uri: `${thirdPartyDataStoreApiUrl}/user/${userId}/entity/${encodeURIComponent(
                projectName
              )}${encodeURIComponent(path)}`,
              headers: {
                sl_all_user_ids: JSON.stringify([userId]),
                sl_project_owner_user_id: userId,
              },
            },
          },
        }
      )

      expect(this.FetchUtils.fetchNothing).to.have.been.calledWithMatch(
        this.enqueueUrl,
        {
          json: {
            group: collaberatorRef,
            job: {
              headers: {
                sl_all_user_ids: JSON.stringify([collaberatorRef]),
                sl_project_owner_user_id: userId,
              },
            },
          },
        }
      )

      expect(this.FetchUtils.fetchNothing).to.have.been.calledWithMatch(
        this.enqueueUrl,
        {
          json: {
            group: readOnlyRef,
            job: {
              headers: {
                sl_all_user_ids: JSON.stringify([readOnlyRef]),
                sl_project_owner_user_id: userId,
              },
            },
          },
        }
      )
    })

    it('post doc with stream origin of docstore', async function () {
      const docId = '4545345'
      const path = '/some/path/here.tex'
      const lines = ['line1', 'line2', 'line3']

      await this.TpdsUpdateSender.promises.addDoc({
        projectId,
        docId,
        path,
        docLines: lines,
        projectName,
      })

      expect(this.FetchUtils.fetchNothing).to.have.been.calledWithMatch(
        this.enqueueUrl,
        {
          json: {
            group: userId,
            method: 'pipeStreamFrom',
            job: {
              method: 'post',
              uri: `${thirdPartyDataStoreApiUrl}/user/${userId}/entity/${encodeURIComponent(
                projectName
              )}${encodeURIComponent(path)}`,
              streamOrigin: `${this.docstoreUrl}/project/${projectId}/doc/${docId}/raw`,
              headers: {
                sl_all_user_ids: JSON.stringify([userId]),
              },
            },
          },
        }
      )

      expect(this.FetchUtils.fetchNothing).to.have.been.calledWithMatch(
        this.enqueueUrl,
        {
          json: {
            group: collaberatorRef,
            job: {
              headers: {
                sl_all_user_ids: JSON.stringify([collaberatorRef]),
              },
            },
          },
        }
      )

      expect(this.FetchUtils.fetchNothing).to.have.been.calledWithMatch(
        this.enqueueUrl,
        {
          json: {
            group: readOnlyRef,
            job: {
              headers: {
                sl_all_user_ids: JSON.stringify([readOnlyRef]),
              },
            },
          },
        }
      )
    })

    it('deleting entity', async function () {
      const path = '/path/here/t.tex'
      const subtreeEntityIds = ['id1', 'id2']

      await this.TpdsUpdateSender.promises.deleteEntity({
        projectId,
        path,
        projectName,
        subtreeEntityIds,
      })

      expect(this.FetchUtils.fetchNothing).to.have.been.calledWithMatch(
        this.enqueueUrl,
        {
          json: {
            group: userId,
            method: 'standardHttpRequest',
            job: {
              method: 'delete',
              uri: `${thirdPartyDataStoreApiUrl}/user/${userId}/entity/${encodeURIComponent(
                projectName
              )}${encodeURIComponent(path)}`,
              headers: {
                sl_all_user_ids: JSON.stringify([userId]),
              },
              json: { subtreeEntityIds },
            },
          },
        }
      )

      expect(this.FetchUtils.fetchNothing).to.have.been.calledWithMatch(
        this.enqueueUrl,
        {
          json: {
            group: collaberatorRef,
            job: {
              headers: {
                sl_all_user_ids: JSON.stringify([collaberatorRef]),
              },
            },
          },
        }
      )

      expect(this.FetchUtils.fetchNothing).to.have.been.calledWithMatch(
        this.enqueueUrl,
        {
          json: {
            group: readOnlyRef,
            job: {
              headers: {
                sl_all_user_ids: JSON.stringify([readOnlyRef]),
              },
            },
          },
        }
      )
    })

    it('moving entity', async function () {
      const startPath = 'staring/here/file.tex'
      const endPath = 'ending/here/file.tex'

      await this.TpdsUpdateSender.promises.moveEntity({
        projectId,
        startPath,
        endPath,
        projectName,
      })

      expect(this.FetchUtils.fetchNothing).to.have.been.calledWithMatch(
        this.enqueueUrl,
        {
          json: {
            group: userId,
            method: 'standardHttpRequest',
            job: {
              method: 'put',
              uri: `${thirdPartyDataStoreApiUrl}/user/${userId}/entity`,
              json: {
                startPath: `/${projectName}/${startPath}`,
                endPath: `/${projectName}/${endPath}`,
              },
              headers: {
                sl_all_user_ids: JSON.stringify([userId]),
              },
            },
          },
        }
      )

      expect(this.FetchUtils.fetchNothing).to.have.been.calledWithMatch(
        this.enqueueUrl,
        {
          json: {
            group: collaberatorRef,
            job: {
              headers: {
                sl_all_user_ids: JSON.stringify([collaberatorRef]),
              },
            },
          },
        }
      )

      expect(this.FetchUtils.fetchNothing).to.have.been.calledWithMatch(
        this.enqueueUrl,
        {
          json: {
            group: readOnlyRef,
            job: {
              headers: {
                sl_all_user_ids: JSON.stringify([readOnlyRef]),
              },
            },
          },
        }
      )
    })

    it('should be able to rename a project using the move entity func', async function () {
      const oldProjectName = '/oldProjectName/'
      const newProjectName = '/newProjectName/'

      await this.TpdsUpdateSender.promises.moveEntity({
        projectId,
        projectName: oldProjectName,
        newProjectName,
      })

      expect(this.FetchUtils.fetchNothing).to.have.been.calledWithMatch(
        this.enqueueUrl,
        {
          json: {
            group: userId,
            method: 'standardHttpRequest',
            job: {
              method: 'put',
              uri: `${thirdPartyDataStoreApiUrl}/user/${userId}/entity`,
              json: {
                startPath: oldProjectName,
                endPath: newProjectName,
              },
              headers: {
                sl_all_user_ids: JSON.stringify([userId]),
              },
            },
          },
        }
      )

      expect(this.FetchUtils.fetchNothing).to.have.been.calledWithMatch(
        this.enqueueUrl,
        {
          json: {
            group: collaberatorRef,
            job: {
              headers: {
                sl_all_user_ids: JSON.stringify([collaberatorRef]),
              },
            },
          },
        }
      )

      expect(this.FetchUtils.fetchNothing).to.have.been.calledWithMatch(
        this.enqueueUrl,
        {
          json: {
            group: readOnlyRef,
            job: {
              headers: {
                sl_all_user_ids: JSON.stringify([readOnlyRef]),
              },
            },
          },
        }
      )
    })

    it('pollDropboxForUser', async function () {
      await this.TpdsUpdateSender.promises.pollDropboxForUser(userId)

      expect(this.FetchUtils.fetchNothing).to.have.been.calledWithMatch(
        this.enqueueUrl,
        {
          json: {
            group: userId,
            method: 'standardHttpRequest',
            job: {
              method: 'post',
              uri: `${thirdPartyDataStoreApiUrl}/user/poll`,
              json: {
                user_ids: [userId],
              },
            },
          },
        }
      )
    })
  })

  describe('deleteProject', function () {
    it('should not call request if there is no project archiver url', async function () {
      await this.TpdsUpdateSender.promises.deleteProject({ projectId })
      this.FetchUtils.fetchNothing.should.not.have.been.called
    })
    it('should make a delete request to project archiver', async function () {
      this.settings.apis.project_archiver = { url: projectArchiverUrl }
      await this.TpdsUpdateSender.promises.deleteProject({ projectId })
      this.FetchUtils.fetchNothing.should.have.been.calledWith(
        `${projectArchiverUrl}/project/${projectId}`,
        { method: 'DELETE' }
      )
    })
  })

  describe('user not linked to dropbox', function () {
    beforeEach(function () {
      this.UserGetter.promises.getUsers
        .withArgs({
          _id: {
            $in: this.memberIds,
          },
          'dropbox.access_token.uid': { $ne: null },
        })
        .resolves([])
    })
  })

  it('does not make request to tpds', async function () {
    const fileId = '4545345'
    const path = '/some/path/here.jpg'

    await this.TpdsUpdateSender.promises.addFile({
      projectId,
      fileId,
      path,
      projectName,
    })
    this.FetchUtils.fetchNothing.should.not.have.been.called
  })
})
