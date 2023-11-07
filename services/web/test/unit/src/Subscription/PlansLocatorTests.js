const SandboxedModule = require('sandboxed-module')
const { expect } = require('chai')
const modulePath = '../../../../app/src/Features/Subscription/PlansLocator'

const plans = [
  {
    planCode: 'first',
    name: '1st',
    price_in_cents: 800,
    features: {},
    featureDescription: {},
  },
  {
    planCode: 'second',
    name: '2nd',
    price_in_cents: 1500,
    features: {},
    featureDescription: {},
  },
  {
    planCode: 'third',
    name: '3rd',
    price_in_cents: 3000,
    features: {},
    featureDescription: {},
  },
]

describe('PlansLocator', function () {
  beforeEach(function () {
    this.settings = { plans }

    this.PlansLocator = SandboxedModule.require(modulePath, {
      requires: {
        '@overleaf/settings': this.settings,
      },
    })
  })

  describe('findLocalPlanInSettings', function () {
    it('should return the found plan', function () {
      const plan = this.PlansLocator.findLocalPlanInSettings('second')
      expect(plan).to.have.property('name', '2nd')
      expect(plan).to.have.property('price_in_cents', 1500)
    })
    it('should return null if no matching plan is found', function () {
      const plan = this.PlansLocator.findLocalPlanInSettings('gibberish')
      expect(plan).to.be.a('null')
    })
  })
})
