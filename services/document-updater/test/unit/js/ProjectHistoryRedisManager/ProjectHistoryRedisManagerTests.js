const sinon = require('sinon')
const modulePath = '../../../../app/js/ProjectHistoryRedisManager.js'
const SandboxedModule = require('sandboxed-module')
const tk = require('timekeeper')

describe('ProjectHistoryRedisManager', function () {
  beforeEach(function () {
    this.project_id = 'project-id-123'
    this.projectHistoryId = 'history-id-123'
    this.user_id = 'user-id-123'
    this.callback = sinon.stub()
    this.rclient = {}
    this.source = 'editor'
    tk.freeze(new Date())

    this.Limits = {
      docIsTooLarge: sinon.stub().returns(false),
    }

    this.ProjectHistoryRedisManager = SandboxedModule.require(modulePath, {
      requires: {
        '@overleaf/settings': (this.settings = {
          max_doc_length: 123,
          redis: {
            project_history: {
              key_schema: {
                projectHistoryOps({ project_id: projectId }) {
                  return `ProjectHistory:Ops:${projectId}`
                },
                projectHistoryFirstOpTimestamp({ project_id: projectId }) {
                  return `ProjectHistory:FirstOpTimestamp:${projectId}`
                },
              },
            },
          },
        }),
        '@overleaf/redis-wrapper': {
          createClient: () => this.rclient,
        },
        './Metrics': (this.metrics = { summary: sinon.stub() }),
        './Limits': this.Limits,
      },
    })
  })

  afterEach(function () {
    tk.reset()
  })

  describe('queueOps', function () {
    beforeEach(function () {
      this.ops = ['mock-op-1', 'mock-op-2']
      this.multi = { exec: sinon.stub() }
      this.multi.rpush = sinon.stub()
      this.multi.setnx = sinon.stub()
      this.rclient.multi = () => this.multi
      // @rclient = multi: () => @multi
      this.ProjectHistoryRedisManager.queueOps(
        this.project_id,
        ...this.ops,
        this.callback
      )
    })

    it('should queue an update', function () {
      this.multi.rpush
        .calledWithExactly(
          `ProjectHistory:Ops:${this.project_id}`,
          this.ops[0],
          this.ops[1]
        )
        .should.equal(true)
    })

    it('should set the queue timestamp if not present', function () {
      this.multi.setnx
        .calledWithExactly(
          `ProjectHistory:FirstOpTimestamp:${this.project_id}`,
          Date.now()
        )
        .should.equal(true)
    })
  })

  describe('queueRenameEntity', function () {
    beforeEach(function () {
      this.file_id = 1234

      this.rawUpdate = {
        pathname: (this.pathname = '/old'),
        newPathname: (this.newPathname = '/new'),
        version: (this.version = 2),
      }

      this.ProjectHistoryRedisManager.queueOps = sinon.stub()
      this.ProjectHistoryRedisManager.queueRenameEntity(
        this.project_id,
        this.projectHistoryId,
        'file',
        this.file_id,
        this.user_id,
        this.rawUpdate,
        this.source,
        this.callback
      )
    })

    it('should queue an update', function () {
      const update = {
        pathname: this.pathname,
        new_pathname: this.newPathname,
        meta: {
          user_id: this.user_id,
          ts: new Date(),
          source: this.source,
        },
        version: this.version,
        projectHistoryId: this.projectHistoryId,
        file: this.file_id,
      }

      this.ProjectHistoryRedisManager.queueOps
        .calledWithExactly(
          this.project_id,
          JSON.stringify(update),
          this.callback
        )
        .should.equal(true)
    })
  })

  describe('queueAddEntity', function () {
    beforeEach(function () {
      this.rclient.rpush = sinon.stub().yields()
      this.doc_id = 1234

      this.rawUpdate = {
        pathname: (this.pathname = '/old'),
        docLines: (this.docLines = 'a\nb'),
        version: (this.version = 2),
        url: (this.url = 'filestore.example.com'),
      }

      this.ProjectHistoryRedisManager.queueOps = sinon.stub()
      this.ProjectHistoryRedisManager.queueAddEntity(
        this.project_id,
        this.projectHistoryId,
        'doc',
        this.doc_id,
        this.user_id,
        this.rawUpdate,
        this.source,
        this.callback
      )
    })

    it('should queue an update', function () {
      const update = {
        pathname: this.pathname,
        docLines: this.docLines,
        url: this.url,
        meta: {
          user_id: this.user_id,
          ts: new Date(),
          source: this.source,
        },
        version: this.version,
        projectHistoryId: this.projectHistoryId,
        doc: this.doc_id,
      }

      this.ProjectHistoryRedisManager.queueOps
        .calledWithExactly(
          this.project_id,
          JSON.stringify(update),
          this.callback
        )
        .should.equal(true)
    })

    describe('queueResyncProjectStructure', function () {
      it('should queue an update', function () {})
    })

    describe('queueResyncDocContent', function () {
      beforeEach(function () {
        this.doc_id = 1234
        this.lines = ['one', 'two']
        this.version = 2
        this.pathname = '/path'

        this.update = {
          resyncDocContent: {
            content: this.lines.join('\n'),
            version: this.version,
          },
          projectHistoryId: this.projectHistoryId,
          path: this.pathname,
          doc: this.doc_id,
          meta: {
            ts: new Date(),
          },
        }

        this.ProjectHistoryRedisManager.queueOps = sinon.stub()
      })

      describe('with a good doc', function () {
        beforeEach(function () {
          this.ProjectHistoryRedisManager.queueResyncDocContent(
            this.project_id,
            this.projectHistoryId,
            this.doc_id,
            this.lines,
            this.version,
            this.pathname,
            this.callback
          )
        })
        it('should check if the doc is too large', function () {
          this.Limits.docIsTooLarge
            .calledWith(
              JSON.stringify(this.update).length,
              this.lines,
              this.settings.max_doc_length
            )
            .should.equal(true)
        })

        it('should queue an update', function () {
          this.ProjectHistoryRedisManager.queueOps
            .calledWithExactly(
              this.project_id,
              JSON.stringify(this.update),
              this.callback
            )
            .should.equal(true)
        })
      })

      describe('with a doc that is too large', function () {
        beforeEach(function () {
          this.Limits.docIsTooLarge.returns(true)
          this.ProjectHistoryRedisManager.queueResyncDocContent(
            this.project_id,
            this.projectHistoryId,
            this.doc_id,
            this.lines,
            this.version,
            this.pathname,
            this.callback
          )
        })
        it('should not queue an update if the doc is too large', function () {
          this.ProjectHistoryRedisManager.queueOps.called.should.equal(false)
          this.callback
            .calledWith(sinon.match.instanceOf(Error))
            .should.equal(true)
        })
      })
    })
  })
})
