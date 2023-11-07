const { expect } = require('chai')
const modulePath =
  '../../../../app/src/Features/Authorization/PermissionsManager.js'
const SandboxedModule = require('sandboxed-module')

describe('PermissionsManager', function () {
  beforeEach(function () {
    this.PermissionsManager = SandboxedModule.require(modulePath, {
      requires: {},
    })
    this.PermissionsManager.registerCapability('capability1', {
      default: true,
    })
    this.PermissionsManager.registerCapability('capability2', {
      default: true,
    })
    this.PermissionsManager.registerCapability('capability3', {
      default: true,
    })
    this.PermissionsManager.registerCapability('capability4', {
      default: false,
    })
  })

  describe('hasPermission', function () {
    describe('when no policies apply to the user', function () {
      it('should return true if default permission is true', function () {
        const groupPolicy = {}
        const capability = 'capability1'
        const result = this.PermissionsManager.hasPermission(
          groupPolicy,
          capability
        )
        expect(result).to.be.true
      })

      it('should return false if the default permission is false', function () {
        const groupPolicy = {}
        const capability = 'capability4'
        const result = this.PermissionsManager.hasPermission(
          groupPolicy,
          capability
        )
        expect(result).to.be.false
      })
    })

    describe('when a policy applies to the user', function () {
      it('should return true if the user has the capability after the policy is applied', function () {
        this.PermissionsManager.registerPolicy('policy', {
          capability1: true,
          capability2: false,
        })
        const groupPolicy = {
          policy: true,
        }
        const capability = 'capability1'
        const result = this.PermissionsManager.hasPermission(
          groupPolicy,
          capability
        )
        expect(result).to.be.true
      })

      it('should return false if the user does not have the capability after the policy is applied', function () {
        this.PermissionsManager.registerPolicy('policy', {
          capability1: true,
          capability2: false,
        })
        const groupPolicy = {
          policy: true,
        }
        const capability = 'capability2'
        const result = this.PermissionsManager.hasPermission(
          groupPolicy,
          capability
        )
        expect(result).to.be.false
      })

      it('should return the default permission if the policy does not apply to the capability', function () {
        this.PermissionsManager.registerPolicy('policy', {
          capability1: true,
          capability2: false,
        })
        const groupPolicy = {
          policy: true,
        }
        const capability = 'capability3'
        const result = this.PermissionsManager.hasPermission(
          groupPolicy,
          capability
        )
        expect(result).to.be.false
      })

      it('should return the default permission if the policy is not enforced', function () {
        this.PermissionsManager.registerPolicy('policy', {
          capability1: true,
          capability2: false,
        })
        const groupPolicy = {
          policy: false,
        }
        const capability1 = 'capability1'
        const result1 = this.PermissionsManager.hasPermission(
          groupPolicy,
          capability1
        )
        const capability2 = 'capability2'
        const result2 = this.PermissionsManager.hasPermission(
          groupPolicy,
          capability2
        )
        expect(result1).to.be.true
        expect(result2).to.be.true
      })
    })

    describe('when multiple policies apply to the user', function () {
      it('should return true if all policies allow the capability', function () {
        this.PermissionsManager.registerPolicy('policy1', {
          capability1: true,
          capability2: true,
        })

        this.PermissionsManager.registerPolicy('policy2', {
          capability1: true,
          capability2: true,
        })
        const groupPolicy = {
          policy1: true,
          policy2: true,
        }
        const capability = 'capability1'
        const result = this.PermissionsManager.hasPermission(
          groupPolicy,
          capability
        )
        expect(result).to.be.true
      })

      it('should return false if any policy denies the capability', function () {
        this.PermissionsManager.registerPolicy('policy1', {
          capability1: true,
          capability2: true,
        })

        this.PermissionsManager.registerPolicy('policy2', {
          capability1: false,
          capability2: true,
        })
        const groupPolicy = {
          policy1: true,
          policy2: true,
        }
        const capability = 'capability1'
        const result = this.PermissionsManager.hasPermission(
          groupPolicy,
          capability
        )
        expect(result).to.be.false
      })

      it('should return the default permssion when the applicable policy is not enforced', function () {
        this.PermissionsManager.registerPolicy('policy1', {
          capability1: true,
          capability2: true,
        })

        this.PermissionsManager.registerPolicy('policy2', {
          capability1: false,
          capability2: true,
        })
        const groupPolicy = {
          policy1: true,
          policy2: false,
        }
        const capability = 'capability1'
        const result = this.PermissionsManager.hasPermission(
          groupPolicy,
          capability
        )
        expect(result).to.be.true
      })

      it('should return the default permission if the policies do not restrict to the capability', function () {
        this.PermissionsManager.registerPolicy('policy', {
          capability1: true,
          capability2: false,
        })
        const groupPolicy = {
          policy: true,
        }
        const capability = 'capability3'
        const result = this.PermissionsManager.hasPermission(
          groupPolicy,
          capability
        )
        expect(result).to.be.false
      })
    })
  })

  describe('getUserCapabilities', function () {
    it('should return the default capabilities when no group policy is provided', function () {
      const groupPolicy = {}
      const capabilities =
        this.PermissionsManager.getUserCapabilities(groupPolicy)
      expect(capabilities).to.deep.equal(
        new Set(['capability1', 'capability2', 'capability3'])
      )
    })

    it('should return a reduced capability set when a group policy is provided', function () {
      this.PermissionsManager.registerPolicy('policy', {
        capability1: true,
        capability2: false,
      })
      const groupPolicy = {
        policy: true,
      }
      const capabilities =
        this.PermissionsManager.getUserCapabilities(groupPolicy)
      expect(capabilities).to.deep.equal(
        new Set(['capability1', 'capability3'])
      )
    })

    it('should return a reduced capability set when multiple group policies are provided', function () {
      this.PermissionsManager.registerPolicy('policy1', {
        capability1: true,
        capability2: false,
      })
      this.PermissionsManager.registerPolicy('policy2', {
        capability1: false,
        capability2: true,
      })

      const groupPolicy = {
        policy1: true,
        policy2: true,
      }
      const capabilities =
        this.PermissionsManager.getUserCapabilities(groupPolicy)
      expect(capabilities).to.deep.equal(new Set(['capability3']))
    })

    it('should return an empty capability set when group policies remove all permissions', function () {
      this.PermissionsManager.registerPolicy('policy1', {
        capability1: true,
        capability2: false,
      })
      this.PermissionsManager.registerPolicy('policy2', {
        capability1: false,
        capability2: true,
      })
      this.PermissionsManager.registerPolicy('policy3', {
        capability1: true,
        capability2: true,
        capability3: false,
      })
      const groupPolicy = {
        policy1: true,
        policy2: true,
        policy3: true,
      }
      const capabilities =
        this.PermissionsManager.getUserCapabilities(groupPolicy)
      expect(capabilities).to.deep.equal(new Set())
    })
  })

  describe('getUserValidationStatus', function () {
    it('should return the status for the policy when the user conforms', async function () {
      this.PermissionsManager.registerPolicy(
        'policy',
        {},
        {
          validator: async ({ user, subscription }) => {
            return user.prop === 'allowed' && subscription.prop === 'managed'
          },
        }
      )
      const groupPolicy = {
        policy: true,
      }
      const user = { prop: 'allowed' }
      const subscription = { prop: 'managed' }
      const result =
        await this.PermissionsManager.promises.getUserValidationStatus({
          user,
          groupPolicy,
          subscription,
        })
      expect(result).to.deep.equal(new Map([['policy', true]]))
    })

    it('should return the status for the policy when the user does not conform', async function () {
      this.PermissionsManager.registerPolicy(
        'policy',
        {},
        {
          validator: async ({ user, subscription }) => {
            return user.prop === 'allowed' && subscription.prop === 'managed'
          },
        }
      )
      const groupPolicy = {
        policy: true,
      }
      const user = { prop: 'not allowed' }
      const subscription = { prop: 'managed' }
      const result =
        await this.PermissionsManager.promises.getUserValidationStatus({
          user,
          groupPolicy,
          subscription,
        })
      expect(result).to.deep.equal(new Map([['policy', false]]))
    })
    it('should return the status for multiple policies according to whether the user conforms', async function () {
      this.PermissionsManager.registerPolicy(
        'policy1',
        {},
        {
          validator: async ({ user, subscription }) => {
            return user.prop === 'allowed' && subscription.prop === 'managed'
          },
        }
      )
      this.PermissionsManager.registerPolicy(
        'policy2',
        {},
        {
          validator: async ({ user, subscription }) => {
            return user.prop === 'other' && subscription.prop === 'managed'
          },
        }
      )
      this.PermissionsManager.registerPolicy(
        'policy3',
        {},
        {
          validator: async ({ user, subscription }) => {
            return user.prop === 'allowed' && subscription.prop === 'managed'
          },
        }
      )

      const groupPolicy = {
        policy1: true,
        policy2: true,
        policy3: false, // this policy is not enforced
      }
      const user = { prop: 'allowed' }
      const subscription = { prop: 'managed' }
      const result =
        await this.PermissionsManager.promises.getUserValidationStatus({
          user,
          groupPolicy,
          subscription,
        })
      expect(result).to.deep.equal(
        new Map([
          ['policy1', true],
          ['policy2', false],
        ])
      )
    })
  })
})
