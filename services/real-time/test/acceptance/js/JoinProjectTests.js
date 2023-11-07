// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { expect } = require('chai')

const RealTimeClient = require('./helpers/RealTimeClient')
const MockWebServer = require('./helpers/MockWebServer')
const FixturesManager = require('./helpers/FixturesManager')

const async = require('async')

describe('joinProject', function () {
  describe('when authorized', function () {
    before(function (done) {
      return async.series(
        [
          cb => {
            return FixturesManager.setUpProject(
              {
                privilegeLevel: 'owner',
                project: {
                  name: 'Test Project',
                },
              },
              (e, { project_id: projectId, user_id: userId }) => {
                this.project_id = projectId
                this.user_id = userId
                return cb(e)
              }
            )
          },

          cb => {
            this.client = RealTimeClient.connect()
            return this.client.on('connectionAccepted', cb)
          },

          cb => {
            return this.client.emit(
              'joinProject',
              { project_id: this.project_id },
              (error, project, privilegeLevel, protocolVersion) => {
                this.project = project
                this.privilegeLevel = privilegeLevel
                this.protocolVersion = protocolVersion
                return cb(error)
              }
            )
          },
        ],
        done
      )
    })

    it('should get the project from web', function () {
      return MockWebServer.joinProject
        .calledWith(this.project_id, this.user_id)
        .should.equal(true)
    })

    it('should return the project', function () {
      return this.project.should.deep.equal({
        name: 'Test Project',
        owner: { _id: this.user_id },
      })
    })

    it('should return the privilege level', function () {
      return this.privilegeLevel.should.equal('owner')
    })

    it('should return the protocolVersion', function () {
      return this.protocolVersion.should.equal(2)
    })

    it('should have joined the project room', function (done) {
      return RealTimeClient.getConnectedClient(
        this.client.socket.sessionid,
        (error, client) => {
          if (error) return done(error)
          expect(Array.from(client.rooms).includes(this.project_id)).to.equal(
            true
          )
          return done()
        }
      )
    })

    return it('should have marked the user as connected', function (done) {
      return this.client.emit(
        'clientTracking.getConnectedUsers',
        (error, users) => {
          if (error) return done(error)
          let connected = false
          for (const user of Array.from(users)) {
            if (
              user.client_id === this.client.publicId &&
              user.user_id === this.user_id
            ) {
              connected = true
              break
            }
          }
          expect(connected).to.equal(true)
          return done()
        }
      )
    })
  })

  describe('when authorized with token', function () {
    before(function (done) {
      async.series(
        [
          cb => {
            FixturesManager.setUpProject(
              {
                privilegeLevel: 'owner',
                publicAccess: 'readOnly',
                project: {
                  name: 'Test Project',
                },
              },
              (
                e,
                {
                  user_id: ownerId,
                  project_id: projectId,
                  anonymousAccessToken,
                }
              ) => {
                this.ownerId = ownerId
                this.project_id = projectId
                this.anonymousAccessToken = anonymousAccessToken
                cb(e)
              }
            )
          },

          cb => {
            RealTimeClient.setSession({}, cb)
          },

          cb => {
            this.client = RealTimeClient.connect()
            this.client.on('connectionAccepted', cb)
          },

          cb => {
            this.client.emit(
              'joinProject',
              {
                project_id: this.project_id,
                anonymousAccessToken: this.anonymousAccessToken,
              },
              (error, project, privilegeLevel, protocolVersion) => {
                this.project = project
                this.privilegeLevel = privilegeLevel
                this.protocolVersion = protocolVersion
                cb(error)
              }
            )
          },
        ],
        done
      )
    })

    it('should get the project from web', function () {
      MockWebServer.joinProject
        .calledWith(
          this.project_id,
          'anonymous-user',
          this.anonymousAccessToken
        )
        .should.equal(true)
    })

    it('should return the project', function () {
      this.project.should.deep.equal({
        name: 'Test Project',
        owner: { _id: this.ownerId },
      })
    })

    it('should return the privilege level', function () {
      this.privilegeLevel.should.equal('readOnly')
    })

    it('should return the protocolVersion', function () {
      this.protocolVersion.should.equal(2)
    })

    it('should have joined the project room', function (done) {
      RealTimeClient.getConnectedClient(
        this.client.socket.sessionid,
        (error, client) => {
          if (error) return done(error)
          expect(Array.from(client.rooms).includes(this.project_id)).to.equal(
            true
          )
          done()
        }
      )
    })

    it('should have marked the user as connected', function (done) {
      this.client.emit('clientTracking.getConnectedUsers', (error, users) => {
        if (error) return done(error)
        let connected = false
        for (const user of Array.from(users)) {
          if (user.client_id === this.client.publicId) {
            connected = true
            break
          }
        }
        expect(connected).to.equal(true)
        done()
      })
    })
  })

  describe('when not authorized', function () {
    before(function (done) {
      return async.series(
        [
          cb => {
            return FixturesManager.setUpProject(
              {
                privilegeLevel: null,
                project: {
                  name: 'Test Project',
                },
              },
              (e, { project_id: projectId, user_id: userId }) => {
                this.project_id = projectId
                this.user_id = userId
                return cb(e)
              }
            )
          },

          cb => {
            this.client = RealTimeClient.connect()
            return this.client.on('connectionAccepted', cb)
          },

          cb => {
            return this.client.emit(
              'joinProject',
              { project_id: this.project_id },
              (error, project, privilegeLevel, protocolVersion) => {
                this.error = error
                this.project = project
                this.privilegeLevel = privilegeLevel
                this.protocolVersion = protocolVersion
                return cb()
              }
            )
          },
        ],
        done
      )
    })

    it('should return an error', function () {
      return this.error.message.should.equal('not authorized')
    })

    return it('should not have joined the project room', function (done) {
      return RealTimeClient.getConnectedClient(
        this.client.socket.sessionid,
        (error, client) => {
          if (error) return done(error)
          expect(Array.from(client.rooms).includes(this.project_id)).to.equal(
            false
          )
          return done()
        }
      )
    })
  })

  describe('when not authorized and web replies with a 403', function () {
    before(function (done) {
      return async.series(
        [
          cb => {
            return FixturesManager.setUpProject(
              {
                project_id: '403403403403403403403403', // forbidden
                privilegeLevel: 'owner',
                project: {
                  name: 'Test Project',
                },
              },
              (e, { project_id: projectId, user_id: userId }) => {
                this.project_id = projectId
                this.user_id = userId
                cb(e)
              }
            )
          },

          cb => {
            this.client = RealTimeClient.connect()
            this.client.on('connectionAccepted', cb)
          },

          cb => {
            this.client.emit(
              'joinProject',
              { project_id: this.project_id },
              (error, project, privilegeLevel, protocolVersion) => {
                this.error = error
                this.project = project
                this.privilegeLevel = privilegeLevel
                this.protocolVersion = protocolVersion
                cb()
              }
            )
          },
        ],
        done
      )
    })

    it('should return an error', function () {
      this.error.message.should.equal('not authorized')
    })

    it('should not have joined the project room', function (done) {
      RealTimeClient.getConnectedClient(
        this.client.socket.sessionid,
        (error, client) => {
          if (error) return done(error)
          expect(Array.from(client.rooms).includes(this.project_id)).to.equal(
            false
          )
          done()
        }
      )
    })
  })

  describe('when deleted and web replies with a 404', function () {
    before(function (done) {
      return async.series(
        [
          cb => {
            return FixturesManager.setUpProject(
              {
                project_id: '404404404404404404404404', // not-found
                privilegeLevel: 'owner',
                project: {
                  name: 'Test Project',
                },
              },
              (e, { project_id: projectId, user_id: userId }) => {
                this.project_id = projectId
                this.user_id = userId
                cb(e)
              }
            )
          },

          cb => {
            this.client = RealTimeClient.connect()
            this.client.on('connectionAccepted', cb)
          },

          cb => {
            this.client.emit(
              'joinProject',
              { project_id: this.project_id },
              (error, project, privilegeLevel, protocolVersion) => {
                this.error = error
                this.project = project
                this.privilegeLevel = privilegeLevel
                this.protocolVersion = protocolVersion
                cb()
              }
            )
          },
        ],
        done
      )
    })

    it('should return an error', function () {
      this.error.code.should.equal('ProjectNotFound')
    })

    it('should not have joined the project room', function (done) {
      RealTimeClient.getConnectedClient(
        this.client.socket.sessionid,
        (error, client) => {
          if (error) return done(error)
          expect(Array.from(client.rooms).includes(this.project_id)).to.equal(
            false
          )
          done()
        }
      )
    })
  })

  describe('when invalid', function () {
    before(function (done) {
      MockWebServer.joinProject.resetHistory()
      return async.series(
        [
          cb => {
            this.client = RealTimeClient.connect()
            return this.client.on('connectionAccepted', cb)
          },

          cb => {
            return this.client.emit(
              'joinProject',
              { project_id: 'invalid-id' },
              error => {
                this.error = error
                return cb()
              }
            )
          },
        ],
        done
      )
    })

    it('should return an invalid id error', function () {
      this.error.message.should.equal('invalid id')
    })

    it('should not call to web', function () {
      MockWebServer.joinProject.called.should.equal(false)
    })
  })

  describe('when joining more than one project', function () {
    before(function (done) {
      return async.series(
        [
          cb => {
            return FixturesManager.setUpProject(
              {
                privilegeLevel: 'owner',
                project: {
                  name: 'Other Project',
                },
              },
              (e, { project_id: projectId, user_id: userId }) => {
                this.other_project_id = projectId
                this.other_user_id = userId
                return cb(e)
              }
            )
          },

          cb => {
            return FixturesManager.setUpProject(
              {
                user_id: this.other_user_id,
                privilegeLevel: 'owner',
                project: {
                  name: 'Test Project',
                },
              },
              (e, { project_id: projectId, user_id: userId }) => {
                this.project_id = projectId
                this.user_id = userId
                return cb(e)
              }
            )
          },

          cb => {
            this.client = RealTimeClient.connect()
            return this.client.on('connectionAccepted', cb)
          },

          cb => {
            return this.client.emit(
              'joinProject',
              { project_id: this.project_id },
              (error, project, privilegeLevel, protocolVersion) => {
                this.project = project
                this.privilegeLevel = privilegeLevel
                this.protocolVersion = protocolVersion
                return cb(error)
              }
            )
          },

          cb => {
            return this.client.emit(
              'joinProject',
              { project_id: this.other_project_id },
              error => {
                this.error = error
                return cb()
              }
            )
          },
        ],
        done
      )
    })

    return it('should return an error', function () {
      this.error.message.should.equal('cannot join multiple projects')
    })
  })

  describe('when over rate limit', function () {
    before(function (done) {
      return async.series(
        [
          cb => {
            this.client = RealTimeClient.connect()
            return this.client.on('connectionAccepted', cb)
          },

          cb => {
            return this.client.emit(
              'joinProject',
              { project_id: '429429429429429429429429' }, // rate-limited
              error => {
                this.error = error
                return cb()
              }
            )
          },
        ],
        done
      )
    })

    return it('should return a TooManyRequests error code', function () {
      this.error.message.should.equal('rate-limit hit when joining project')
      return this.error.code.should.equal('TooManyRequests')
    })
  })

  describe('when automatically joining the project', function () {
    describe('when authorized', function () {
      let connectionAcceptedReceived = false
      before(function (done) {
        async.series(
          [
            cb => {
              FixturesManager.setUpProject(
                {
                  privilegeLevel: 'owner',
                  project: {
                    name: 'Test Project',
                  },
                },
                (e, { project_id: projectId, user_id: userId }) => {
                  this.project_id = projectId
                  this.user_id = userId
                  cb(e)
                }
              )
            },

            cb => {
              this.client = RealTimeClient.connect(
                `projectId=${this.project_id}`
              )
              this.client.on('connectionAccepted', () => {
                connectionAcceptedReceived = true
              })
              this.client.on('connectionRejected', cb)
              this.client.on(
                'joinProjectResponse',
                ({ project, permissionsLevel, protocolVersion }) => {
                  this.project = project
                  this.permissionsLevel = permissionsLevel
                  this.protocolVersion = protocolVersion
                  cb()
                }
              )
            },
          ],
          done
        )
      })

      it('should not emit connectionAccepted', function () {
        expect(connectionAcceptedReceived).to.equal(false)
      })

      it('should get the project from web', function () {
        MockWebServer.joinProject
          .calledWith(this.project_id, this.user_id)
          .should.equal(true)
      })

      it('should return the project', function () {
        this.project.should.deep.equal({
          name: 'Test Project',
          owner: { _id: this.user_id },
        })
      })

      it('should return the privilege level', function () {
        this.permissionsLevel.should.equal('owner')
      })

      it('should return the protocolVersion', function () {
        this.protocolVersion.should.equal(2)
      })

      it('should have joined the project room', function (done) {
        RealTimeClient.getConnectedClient(
          this.client.socket.sessionid,
          (error, client) => {
            if (error) return done(error)
            expect(Array.from(client.rooms).includes(this.project_id)).to.equal(
              true
            )
            done()
          }
        )
      })

      it('should have marked the user as connected', function (done) {
        this.client.emit('clientTracking.getConnectedUsers', (error, users) => {
          if (error) return done(error)
          let connected = false
          for (const user of Array.from(users)) {
            if (
              user.client_id === this.client.publicId &&
              user.user_id === this.user_id
            ) {
              connected = true
              break
            }
          }
          expect(connected).to.equal(true)
          done()
        })
      })
    })

    describe('when authorized with token', function () {
      let connectionAcceptedReceived = false
      before(function (done) {
        async.series(
          [
            cb => {
              FixturesManager.setUpProject(
                {
                  privilegeLevel: 'owner',
                  publicAccess: 'readOnly',
                  project: {
                    name: 'Test Project',
                  },
                },
                (
                  e,
                  {
                    user_id: ownerId,
                    project_id: projectId,
                    anonymousAccessToken,
                  }
                ) => {
                  this.ownerId = ownerId
                  this.project_id = projectId
                  this.anonymousAccessToken = anonymousAccessToken
                  cb(e)
                }
              )
            },

            cb => {
              RealTimeClient.setSession(
                {
                  anonTokenAccess: {
                    [this.project_id]: this.anonymousAccessToken,
                  },
                },
                cb
              )
            },

            cb => {
              this.client = RealTimeClient.connect(
                `projectId=${this.project_id}`
              )
              this.client.on('connectionAccepted', () => {
                connectionAcceptedReceived = true
              })
              this.client.on('connectionRejected', cb)
              this.client.on(
                'joinProjectResponse',
                ({ project, permissionsLevel, protocolVersion }) => {
                  this.project = project
                  this.permissionsLevel = permissionsLevel
                  this.protocolVersion = protocolVersion
                  cb()
                }
              )
            },
          ],
          done
        )
      })

      it('should not emit connectionAccepted', function () {
        expect(connectionAcceptedReceived).to.equal(false)
      })

      it('should get the project from web', function () {
        MockWebServer.joinProject
          .calledWith(
            this.project_id,
            'anonymous-user',
            this.anonymousAccessToken
          )
          .should.equal(true)
      })

      it('should return the project', function () {
        this.project.should.deep.equal({
          name: 'Test Project',
          owner: { _id: this.ownerId },
        })
      })

      it('should return the privilege level', function () {
        this.permissionsLevel.should.equal('readOnly')
      })

      it('should return the protocolVersion', function () {
        this.protocolVersion.should.equal(2)
      })

      it('should have joined the project room', function (done) {
        RealTimeClient.getConnectedClient(
          this.client.socket.sessionid,
          (error, client) => {
            if (error) return done(error)
            expect(Array.from(client.rooms).includes(this.project_id)).to.equal(
              true
            )
            done()
          }
        )
      })

      it('should have marked the user as connected', function (done) {
        this.client.emit('clientTracking.getConnectedUsers', (error, users) => {
          if (error) return done(error)
          let connected = false
          for (const user of Array.from(users)) {
            if (user.client_id === this.client.publicId) {
              connected = true
              break
            }
          }
          expect(connected).to.equal(true)
          done()
        })
      })
    })

    describe('when not authorized', function () {
      let joinProjectResponseReceived = false
      before(function (done) {
        async.series(
          [
            cb => {
              FixturesManager.setUpProject(
                {
                  privilegeLevel: null,
                  project: {
                    name: 'Test Project',
                  },
                },
                (e, { project_id: projectId, user_id: userId }) => {
                  this.project_id = projectId
                  this.user_id = userId
                  cb(e)
                }
              )
            },

            cb => {
              this.client = RealTimeClient.connect(
                `projectId=${this.project_id}`
              )
              this.client.on('connectionRejected', err => {
                this.error = err
                cb()
              })
              this.client.on('joinProjectResponse', () => {
                joinProjectResponseReceived = true
                cb()
              })
            },
          ],
          done
        )
      })

      it('should not emit joinProjectResponse', function () {
        expect(joinProjectResponseReceived).to.equal(false)
      })

      it('should have disconnected the client', function () {
        expect(this.client.socket.connected).to.equal(false)
      })

      it('should return an error', function () {
        this.error.message.should.equal('not authorized')
      })

      it('should not have joined the project room', function (done) {
        RealTimeClient.getConnectedClient(
          this.client.socket.sessionid,
          error => {
            expect(error.message).to.equal('not found')
            done()
          }
        )
      })
    })

    describe('when not authorized and web replies with a 403', function () {
      let joinProjectResponseReceived = false
      before(function (done) {
        async.series(
          [
            cb => {
              FixturesManager.setUpProject(
                {
                  project_id: '403403403403403403403403', // forbidden
                  privilegeLevel: 'owner',
                  project: {
                    name: 'Test Project',
                  },
                },
                (e, { project_id: projectId, user_id: userId }) => {
                  this.project_id = projectId
                  this.user_id = userId
                  cb(e)
                }
              )
            },

            cb => {
              this.client = RealTimeClient.connect(
                `projectId=${this.project_id}`
              )
              this.client.on('connectionRejected', err => {
                this.error = err
                cb()
              })
              this.client.on('joinProjectResponse', () => {
                joinProjectResponseReceived = true
                cb()
              })
            },
          ],
          done
        )
      })

      it('should not emit joinProjectResponse', function () {
        expect(joinProjectResponseReceived).to.equal(false)
      })

      it('should have disconnected the client', function () {
        expect(this.client.socket.connected).to.equal(false)
      })

      it('should return an error', function () {
        this.error.message.should.equal('not authorized')
      })

      it('should not have joined the project room', function (done) {
        RealTimeClient.getConnectedClient(
          this.client.socket.sessionid,
          error => {
            expect(error.message).to.equal('not found')
            done()
          }
        )
      })
    })

    describe('when deleted and web replies with a 404', function () {
      let joinProjectResponseReceived = false
      before(function (done) {
        async.series(
          [
            cb => {
              FixturesManager.setUpProject(
                {
                  project_id: '404404404404404404404404', // not-found
                  privilegeLevel: 'owner',
                  project: {
                    name: 'Test Project',
                  },
                },
                (e, { project_id: projectId, user_id: userId }) => {
                  this.project_id = projectId
                  this.user_id = userId
                  cb(e)
                }
              )
            },

            cb => {
              this.client = RealTimeClient.connect(
                `projectId=${this.project_id}`
              )
              this.client.on('connectionRejected', err => {
                this.error = err
                cb()
              })
              this.client.on('joinProjectResponse', () => {
                joinProjectResponseReceived = true
                cb()
              })
            },
          ],
          done
        )
      })

      it('should not emit joinProjectResponse', function () {
        expect(joinProjectResponseReceived).to.equal(false)
      })

      it('should have disconnected the client', function () {
        expect(this.client.socket.connected).to.equal(false)
      })

      it('should return an error', function () {
        this.error.code.should.equal('ProjectNotFound')
      })

      it('should not have joined the project room', function (done) {
        RealTimeClient.getConnectedClient(
          this.client.socket.sessionid,
          error => {
            expect(error.message).to.equal('not found')
            done()
          }
        )
      })
    })

    describe('when invalid', function () {
      let joinProjectResponseReceived = false
      before(function (done) {
        MockWebServer.joinProject.resetHistory()
        async.series(
          [
            cb => {
              this.client = RealTimeClient.connect('projectId=invalid-id')
              this.client.on('connectionRejected', err => {
                this.error = err
                cb()
              })
              this.client.on('joinProjectResponse', () => {
                joinProjectResponseReceived = true
                cb()
              })
            },
          ],
          done
        )
      })

      it('should not emit joinProjectResponse', function () {
        expect(joinProjectResponseReceived).to.equal(false)
      })

      it('should have disconnected the client', function () {
        expect(this.client.socket.connected).to.equal(false)
      })

      it('should return an invalid id error', function () {
        this.error.message.should.equal('invalid id')
      })

      it('should not call to web', function () {
        MockWebServer.joinProject.called.should.equal(false)
      })
    })

    describe('when joining more than one project', function () {
      before(function (done) {
        async.series(
          [
            cb => {
              FixturesManager.setUpProject(
                {
                  privilegeLevel: 'owner',
                  project: {
                    name: 'Other Project',
                  },
                },
                (e, { project_id: projectId, user_id: userId }) => {
                  this.other_project_id = projectId
                  this.other_user_id = userId
                  cb(e)
                }
              )
            },

            cb => {
              FixturesManager.setUpProject(
                {
                  user_id: this.other_user_id,
                  privilegeLevel: 'owner',
                  project: {
                    name: 'Test Project',
                  },
                },
                (e, { project_id: projectId, user_id: userId }) => {
                  this.project_id = projectId
                  this.user_id = userId
                  cb(e)
                }
              )
            },

            cb => {
              this.client = RealTimeClient.connect(
                `projectId=${this.project_id}`
              )
              this.client.on('connectionRejected', cb)
              this.client.on('joinProjectResponse', () => {
                cb()
              })
            },

            cb => {
              this.client.emit(
                'joinProject',
                { project_id: this.other_project_id },
                error => {
                  this.error = error
                  cb()
                }
              )
            },
          ],
          done
        )
      })

      it('should return an error', function () {
        this.error.message.should.equal('cannot join multiple projects')
      })
    })

    describe('when over rate limit', function () {
      let joinProjectResponseReceived = false
      before(function (done) {
        async.series(
          [
            cb => {
              this.client = RealTimeClient.connect(
                'projectId=429429429429429429429429'
              )
              this.client.on('connectionRejected', err => {
                this.error = err
                cb()
              })
              this.client.on('joinProjectResponse', () => {
                joinProjectResponseReceived = true
                cb()
              })
            },
          ],
          done
        )
      })

      it('should not emit joinProjectResponse', function () {
        expect(joinProjectResponseReceived).to.equal(false)
      })

      it('should have disconnected the client', function () {
        expect(this.client.socket.connected).to.equal(false)
      })

      it('should return a TooManyRequests error code', function () {
        this.error.message.should.equal('rate-limit hit when joining project')
        this.error.code.should.equal('TooManyRequests')
      })
    })
  })
})
