const sinon = require('sinon')
const { expect } = require('chai')
const SandboxedModule = require('sandboxed-module')
const { ObjectId } = require('mongodb')
const Errors = require('../../../../app/src/Features/Errors/Errors')
const MockRequest = require('../helpers/MockRequest')
const MockResponse = require('../helpers/MockResponse')

const MODULE_PATH =
  '../../../../app/src/Features/Collaborators/CollaboratorsController.js'

describe('CollaboratorsController', function () {
  beforeEach(function () {
    this.res = new MockResponse()
    this.req = new MockRequest()

    this.user = { _id: ObjectId() }
    this.projectId = ObjectId()
    this.callback = sinon.stub()

    this.CollaboratorsHandler = {
      promises: {
        removeUserFromProject: sinon.stub().resolves(),
        setCollaboratorPrivilegeLevel: sinon.stub().resolves(),
      },
    }
    this.CollaboratorsGetter = {
      promises: {
        getAllInvitedMembers: sinon.stub(),
      },
    }
    this.EditorRealTimeController = {
      emitToRoom: sinon.stub(),
    }
    this.HttpErrorHandler = {
      forbidden: sinon.stub(),
      notFound: sinon.stub(),
    }
    this.TagsHandler = {
      promises: {
        removeProjectFromAllTags: sinon.stub().resolves(),
      },
    }
    this.SessionManager = {
      getSessionUser: sinon.stub().returns(this.user),
      getLoggedInUserId: sinon.stub().returns(this.user._id),
    }
    this.OwnershipTransferHandler = {
      promises: {
        transferOwnership: sinon.stub().resolves(),
      },
    }
    this.TokenAccessHandler = {
      getRequestToken: sinon.stub().returns('access-token'),
    }

    this.CollaboratorsController = SandboxedModule.require(MODULE_PATH, {
      requires: {
        mongodb: { ObjectId },
        './CollaboratorsHandler': this.CollaboratorsHandler,
        './CollaboratorsGetter': this.CollaboratorsGetter,
        './OwnershipTransferHandler': this.OwnershipTransferHandler,
        '../Editor/EditorRealTimeController': this.EditorRealTimeController,
        '../../Features/Errors/HttpErrorHandler': this.HttpErrorHandler,
        '../Tags/TagsHandler': this.TagsHandler,
        '../Authentication/SessionManager': this.SessionManager,
        '../TokenAccess/TokenAccessHandler': this.TokenAccessHandler,
      },
    })
  })

  describe('removeUserFromProject', function () {
    beforeEach(function (done) {
      this.req.params = {
        Project_id: this.projectId,
        user_id: this.user._id,
      }
      this.res.sendStatus = sinon.spy(() => {
        done()
      })
      this.CollaboratorsController.removeUserFromProject(this.req, this.res)
    })

    it('should from the user from the project', function () {
      expect(
        this.CollaboratorsHandler.promises.removeUserFromProject
      ).to.have.been.calledWith(this.projectId, this.user._id)
    })

    it('should emit a userRemovedFromProject event to the proejct', function () {
      expect(this.EditorRealTimeController.emitToRoom).to.have.been.calledWith(
        this.projectId,
        'userRemovedFromProject',
        this.user._id
      )
    })

    it('should send the back a success response', function () {
      this.res.sendStatus.calledWith(204).should.equal(true)
    })

    it('should have called emitToRoom', function () {
      expect(this.EditorRealTimeController.emitToRoom).to.have.been.calledWith(
        this.projectId,
        'project:membership:changed'
      )
    })
  })

  describe('removeSelfFromProject', function () {
    beforeEach(function (done) {
      this.req.params = { Project_id: this.projectId }
      this.res.sendStatus = sinon.spy(() => {
        done()
      })
      this.CollaboratorsController.removeSelfFromProject(this.req, this.res)
    })

    it('should remove the logged in user from the project', function () {
      expect(
        this.CollaboratorsHandler.promises.removeUserFromProject
      ).to.have.been.calledWith(this.projectId, this.user._id)
    })

    it('should emit a userRemovedFromProject event to the proejct', function () {
      expect(this.EditorRealTimeController.emitToRoom).to.have.been.calledWith(
        this.projectId,
        'userRemovedFromProject',
        this.user._id
      )
    })

    it('should remove the project from all tags', function () {
      expect(
        this.TagsHandler.promises.removeProjectFromAllTags
      ).to.have.been.calledWith(this.user._id, this.projectId)
    })

    it('should return a success code', function () {
      this.res.sendStatus.calledWith(204).should.equal(true)
    })
  })

  describe('getAllMembers', function () {
    beforeEach(function (done) {
      this.req.params = { Project_id: this.projectId }
      this.res.json = sinon.spy(() => {
        done()
      })
      this.next = sinon.stub()
      this.members = [{ a: 1 }]
      this.CollaboratorsGetter.promises.getAllInvitedMembers.resolves(
        this.members
      )
      this.CollaboratorsController.getAllMembers(this.req, this.res, this.next)
    })

    it('should not produce an error', function () {
      this.next.callCount.should.equal(0)
    })

    it('should produce a json response', function () {
      this.res.json.callCount.should.equal(1)
      this.res.json.calledWith({ members: this.members }).should.equal(true)
    })

    it('should call CollaboratorsGetter.getAllInvitedMembers', function () {
      expect(this.CollaboratorsGetter.promises.getAllInvitedMembers).to.have
        .been.calledOnce
    })

    describe('when CollaboratorsGetter.getAllInvitedMembers produces an error', function () {
      beforeEach(function (done) {
        this.res.json = sinon.stub()
        this.next = sinon.spy(() => {
          done()
        })
        this.CollaboratorsGetter.promises.getAllInvitedMembers.rejects(
          new Error('woops')
        )
        this.CollaboratorsController.getAllMembers(
          this.req,
          this.res,
          this.next
        )
      })

      it('should produce an error', function () {
        expect(this.next).to.have.been.calledOnce
        expect(this.next).to.have.been.calledWithMatch(
          sinon.match.instanceOf(Error)
        )
      })

      it('should not produce a json response', function () {
        this.res.json.callCount.should.equal(0)
      })
    })
  })

  describe('setCollaboratorInfo', function () {
    beforeEach(function () {
      this.req.params = {
        Project_id: this.projectId,
        user_id: this.user._id,
      }
      this.req.body = { privilegeLevel: 'readOnly' }
    })

    it('should set the collaborator privilege level', function (done) {
      this.res.sendStatus = status => {
        expect(status).to.equal(204)
        expect(
          this.CollaboratorsHandler.promises.setCollaboratorPrivilegeLevel
        ).to.have.been.calledWith(this.projectId, this.user._id, 'readOnly')
        done()
      }
      this.CollaboratorsController.setCollaboratorInfo(this.req, this.res)
    })

    it('should return a 404 when the project or collaborator is not found', function (done) {
      this.HttpErrorHandler.notFound = sinon.spy((req, res) => {
        expect(req).to.equal(this.req)
        expect(res).to.equal(this.res)
        done()
      })

      this.CollaboratorsHandler.promises.setCollaboratorPrivilegeLevel.rejects(
        new Errors.NotFoundError()
      )
      this.CollaboratorsController.setCollaboratorInfo(this.req, this.res)
    })

    it('should pass the error to the next handler when setting the privilege level fails', function (done) {
      this.next = sinon.spy(err => {
        expect(err).instanceOf(Error)
        done()
      })

      this.CollaboratorsHandler.promises.setCollaboratorPrivilegeLevel.rejects(
        new Error()
      )
      this.CollaboratorsController.setCollaboratorInfo(
        this.req,
        this.res,
        this.next
      )
    })
  })

  describe('transferOwnership', function () {
    beforeEach(function () {
      this.req.body = { user_id: this.user._id.toString() }
    })

    it('returns 204 on success', function (done) {
      this.res.sendStatus = status => {
        expect(status).to.equal(204)
        done()
      }
      this.CollaboratorsController.transferOwnership(this.req, this.res)
    })

    it('returns 404 if the project does not exist', function (done) {
      this.HttpErrorHandler.notFound = sinon.spy((req, res, message) => {
        expect(req).to.equal(this.req)
        expect(res).to.equal(this.res)
        expect(message).to.match(/project not found/)
        done()
      })
      this.OwnershipTransferHandler.promises.transferOwnership.rejects(
        new Errors.ProjectNotFoundError()
      )
      this.CollaboratorsController.transferOwnership(this.req, this.res)
    })

    it('returns 404 if the user does not exist', function (done) {
      this.HttpErrorHandler.notFound = sinon.spy((req, res, message) => {
        expect(req).to.equal(this.req)
        expect(res).to.equal(this.res)
        expect(message).to.match(/user not found/)
        done()
      })
      this.OwnershipTransferHandler.promises.transferOwnership.rejects(
        new Errors.UserNotFoundError()
      )
      this.CollaboratorsController.transferOwnership(this.req, this.res)
    })

    it('invokes HTTP forbidden error handler if the user is not a collaborator', function (done) {
      this.HttpErrorHandler.forbidden = sinon.spy(() => done())
      this.OwnershipTransferHandler.promises.transferOwnership.rejects(
        new Errors.UserNotCollaboratorError()
      )
      this.CollaboratorsController.transferOwnership(this.req, this.res)
    })
  })
})
