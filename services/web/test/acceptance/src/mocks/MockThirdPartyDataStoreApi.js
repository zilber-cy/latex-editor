const AbstractMockApi = require('./AbstractMockApi')

class MockThirdPartyDataStoreApi extends AbstractMockApi {
  reset() {}

  deleteUser(req, res) {
    res.sendStatus(200)
  }

  applyRoutes() {
    this.app.delete('/user/:user_id', (req, res) => this.deleteUser(req, res))
  }
}

module.exports = MockThirdPartyDataStoreApi

// type hint for the inherited `instance` method
/**
 * @function instance
 * @memberOf MockThirdPartyDataStoreApi
 * @static
 * @returns {MockThirdPartyDataStoreApi}
 */
