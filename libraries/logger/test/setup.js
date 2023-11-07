const chai = require('chai')
const sinonChai = require('sinon-chai')
const SandboxedModule = require('sandboxed-module')

// Chai configuration
chai.should()
chai.use(sinonChai)

SandboxedModule.configure({
  globals: { Buffer, JSON, console, process },
})
