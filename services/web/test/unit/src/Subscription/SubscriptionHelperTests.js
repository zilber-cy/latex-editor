const SandboxedModule = require('sandboxed-module')
const { expect } = require('chai')
const modulePath =
  '../../../../app/src/Features/Subscription/SubscriptionHelper'

const plans = {
  expensive: {
    planCode: 'expensive',
    price_in_cents: 1500,
  },
  cheaper: {
    planCode: 'cheaper',
    price_in_cents: 500,
  },
  alsoCheap: {
    plancode: 'also-cheap',
    price_in_cents: 500,
  },
  expensiveGroup: {
    plancode: 'group_expensive',
    price_in_cents: 49500,
    groupPlan: true,
  },
  cheapGroup: {
    plancode: 'group_cheap',
    price_in_cents: 1000,
    groupPlan: true,
  },
  bad: {},
}

describe('SubscriptionHelper', function () {
  beforeEach(function () {
    this.INITIAL_LICENSE_SIZE = 2
    this.settings = {
      groupPlanModalOptions: {
        currencySymbols: {
          USD: '$',
          CHF: 'Fr',
          DKK: 'kr',
          NOK: 'kr',
          SEK: 'kr',
        },
      },
    }
    this.GroupPlansData = {
      enterprise: {
        collaborator: {
          CHF: {
            [this.INITIAL_LICENSE_SIZE]: {
              price_in_cents: 1000,
            },
          },
          DKK: {
            [this.INITIAL_LICENSE_SIZE]: {
              price_in_cents: 2000,
            },
          },
          SEK: {
            [this.INITIAL_LICENSE_SIZE]: {
              price_in_cents: 3000,
            },
          },
          NOK: {
            [this.INITIAL_LICENSE_SIZE]: {
              price_in_cents: 4000,
            },
          },
          USD: {
            [this.INITIAL_LICENSE_SIZE]: {
              price_in_cents: 5000,
            },
          },
        },
        professional: {
          CHF: {
            [this.INITIAL_LICENSE_SIZE]: {
              price_in_cents: 10000,
            },
          },
          DKK: {
            [this.INITIAL_LICENSE_SIZE]: {
              price_in_cents: 20000,
            },
          },
          SEK: {
            [this.INITIAL_LICENSE_SIZE]: {
              price_in_cents: 30000,
            },
          },
          NOK: {
            [this.INITIAL_LICENSE_SIZE]: {
              price_in_cents: 40000,
            },
          },
          USD: {
            [this.INITIAL_LICENSE_SIZE]: {
              price_in_cents: 50000,
            },
          },
        },
      },
    }
    this.SubscriptionHelper = SandboxedModule.require(modulePath, {
      requires: {
        '@overleaf/settings': this.settings,
        './GroupPlansData': this.GroupPlansData,
      },
    })
  })

  describe('shouldPlanChangeAtTermEnd', function () {
    it('should return true if the new plan is less expensive', function () {
      const changeAtTermEnd = this.SubscriptionHelper.shouldPlanChangeAtTermEnd(
        plans.expensive,
        plans.cheaper
      )
      expect(changeAtTermEnd).to.be.true
    })
    it('should return false if the new plan is more exepensive', function () {
      const changeAtTermEnd = this.SubscriptionHelper.shouldPlanChangeAtTermEnd(
        plans.cheaper,
        plans.expensive
      )
      expect(changeAtTermEnd).to.be.false
    })
    it('should return false if the new plan is the same price', function () {
      const changeAtTermEnd = this.SubscriptionHelper.shouldPlanChangeAtTermEnd(
        plans.cheaper,
        plans.alsoCheap
      )
      expect(changeAtTermEnd).to.be.false
    })
    it('should return false if the change is from an individual plan to a more expensive group plan', function () {
      const changeAtTermEnd = this.SubscriptionHelper.shouldPlanChangeAtTermEnd(
        plans.expensive,
        plans.expensiveGroup
      )
      expect(changeAtTermEnd).to.be.false
    })
    it('should return true if the change is from an individual plan to a cheaper group plan', function () {
      const changeAtTermEnd = this.SubscriptionHelper.shouldPlanChangeAtTermEnd(
        plans.expensive,
        plans.cheapGroup
      )
      expect(changeAtTermEnd).to.be.true
    })
  })

  describe('generateInitialLocalizedGroupPrice', function () {
    describe('CHF currency', function () {
      it('should return the correct localized price for every plan', function () {
        const localizedPrice =
          this.SubscriptionHelper.generateInitialLocalizedGroupPrice('CHF')

        expect(localizedPrice).to.deep.equal({
          price: {
            collaborator: 'Fr 10',
            professional: 'Fr 100',
          },
          pricePerUser: {
            collaborator: 'Fr 5',
            professional: 'Fr 50',
          },
        })
      })
    })

    describe('DKK currency', function () {
      it('should return the correct localized price for every plan', function () {
        const localizedPrice =
          this.SubscriptionHelper.generateInitialLocalizedGroupPrice('DKK')

        expect(localizedPrice).to.deep.equal({
          price: {
            collaborator: '20 kr',
            professional: '200 kr',
          },
          pricePerUser: {
            collaborator: '10 kr',
            professional: '100 kr',
          },
        })
      })
    })

    describe('SEK currency', function () {
      it('should return the correct localized price for every plan', function () {
        const localizedPrice =
          this.SubscriptionHelper.generateInitialLocalizedGroupPrice('SEK')

        expect(localizedPrice).to.deep.equal({
          price: {
            collaborator: '30 kr',
            professional: '300 kr',
          },
          pricePerUser: {
            collaborator: '15 kr',
            professional: '150 kr',
          },
        })
      })
    })

    describe('NOK currency', function () {
      it('should return the correct localized price for every plan', function () {
        const localizedPrice =
          this.SubscriptionHelper.generateInitialLocalizedGroupPrice('NOK')

        expect(localizedPrice).to.deep.equal({
          price: {
            collaborator: '40 kr',
            professional: '400 kr',
          },
          pricePerUser: {
            collaborator: '20 kr',
            professional: '200 kr',
          },
        })
      })
    })

    describe('other supported currencies', function () {
      it('should return the correct localized price for every plan', function () {
        const localizedPrice =
          this.SubscriptionHelper.generateInitialLocalizedGroupPrice('USD')

        expect(localizedPrice).to.deep.equal({
          price: {
            collaborator: '$50',
            professional: '$500',
          },
          pricePerUser: {
            collaborator: '$25',
            professional: '$250',
          },
        })
      })
    })
  })
})
