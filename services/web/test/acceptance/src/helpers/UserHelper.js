const { CookieJar } = require('tough-cookie')
const AuthenticationManager = require('../../../../app/src/Features/Authentication/AuthenticationManager')
const Settings = require('@overleaf/settings')
const InstitutionsAPI = require('../../../../app/src/Features/Institutions/InstitutionsAPI')
const UserCreator = require('../../../../app/src/Features/User/UserCreator')
const UserGetter = require('../../../../app/src/Features/User/UserGetter')
const UserUpdater = require('../../../../app/src/Features/User/UserUpdater')
const moment = require('moment')
const fetch = require('node-fetch')
const { db } = require('../../../../app/src/infrastructure/mongodb')
const { ObjectId } = require('mongodb')
const {
  UserAuditLogEntry,
} = require('../../../../app/src/models/UserAuditLogEntry')

// Import the rate limiter so we can clear it between tests

const {
  RateLimiter,
} = require('../../../../app/src/infrastructure/RateLimiter')

const rateLimiters = {
  resendConfirmation: new RateLimiter('resend-confirmation'),
}

let globalUserNum = Settings.test.counterInit

class UserHelper {
  /**
   * Create UserHelper
   * @param {object} [user] - Mongo User object
   */
  constructor(user = null) {
    // used for constructing default emails, etc
    this.userNum = globalUserNum++
    // initialize all internal state properties to defaults
    this.reset()
    // set user if passed in, may be null
    this.user = user
  }

  /* sync functions */

  /**
   * Get auditLog, ignore the login
   * @return {object[]}
   */
  getAuditLogWithoutNoise() {
    return (this.user.auditLog || []).filter(entry => {
      return entry.operation !== 'login'
    })
  }

  /**
   * Generate default email from unique (per instantiation) user number
   * @returns {string} email
   */
  getDefaultEmail() {
    return `test.user.${this.userNum}@example.com`
  }

  /**
   * Generate email, password args object. Default values will be used if
   * email and password are not passed in args.
   * @param {object} [userData]
   * @param {string} [userData.email] email to use
   * @param {string} [userData.password] password to use
   * @returns {object} email, password object
   */
  getDefaultEmailPassword(userData = {}) {
    return {
      email: this.getDefaultEmail(),
      password: this.getDefaultPassword(),
      ...userData,
    }
  }

  /**
   * Generate default password from unique (per instantiation) user number
   * @returns {string} password
   */
  getDefaultPassword() {
    return `New-Password-${this.userNum}!`
  }

  /**
   * (Re)set internal state of UserHelper object.
   */
  reset() {
    // cached csrf token
    this._csrfToken = ''
    // used to store mongo user object once created/loaded
    this.user = null
    // cookie jar
    this.jar = new CookieJar()
  }

  async fetch(url, opts = {}) {
    url = UserHelper.url(url)
    const headers = {}
    const cookieString = this.jar.getCookieStringSync(url)
    if (cookieString) {
      headers.Cookie = cookieString
    }
    if (this._csrfToken) {
      headers['x-csrf-token'] = this._csrfToken
    }
    const response = await fetch(url, {
      redirect: 'manual',
      ...opts,
      headers: { ...headers, ...opts.headers },
    })

    // From https://www.npmjs.com/package/node-fetch#extract-set-cookie-header
    const cookies = response.headers.raw()['set-cookie']
    if (cookies != null) {
      for (const cookie of cookies) {
        this.jar.setCookieSync(cookie, url)
      }
    }
    return response
  }

  /* async http api call methods */

  /**
   * Requests csrf token unless already cached in internal state
   */
  async getCsrfToken() {
    // get csrf token from api and store
    const response = await this.fetch('/dev/csrf')
    const body = await response.text()
    if (response.status !== 200) {
      throw new Error(
        `get csrf token failed: status=${response.status} body=${JSON.stringify(
          body
        )}`
      )
    }
    this._csrfToken = body
  }

  /**
   * Make request to POST /logout
   * @param {object} [options] options to pass to request
   * @returns {object} http response
   */
  async logout(options = {}) {
    // post logout
    const response = await this.fetch('/logout', { method: 'POST', ...options })
    if (
      response.status !== 302 ||
      !response.headers.get('location').includes('/login')
    ) {
      const body = await response.text()
      throw new Error(
        `logout failed: status=${response.status} body=${JSON.stringify(
          body
        )} headers=${JSON.stringify(
          Object.fromEntries(response.headers.entries())
        )}`
      )
    }
    // after logout CSRF token becomes invalid
    this._csrfToken = ''
    // resolve with http request response
    return response
  }

  /* static sync methods */

  /**
   * Generates base URL from env options
   * @returns {string} baseUrl
   */
  static baseUrl() {
    return `http://${process.env.HTTP_TEST_HOST || 'localhost'}:23000`
  }

  /**
   * Generates a full URL given a path
   */
  static url(path) {
    return new URL(path, UserHelper.baseUrl())
  }

  /* static async instantiation methods */

  /**
   * Create a new user via UserCreator and return UserHelper instance
   * @param {object} attributes user data for UserCreator
   * @param {object} options options for UserCreator
   * @returns {UserHelper}
   */
  static async createUser(attributes = {}) {
    const userHelper = new UserHelper()
    attributes = userHelper.getDefaultEmailPassword(attributes)

    // hash password and delete plaintext if set
    if (attributes.password) {
      attributes.hashedPassword =
        await AuthenticationManager.promises.hashPassword(attributes.password)
      delete attributes.password
    }

    userHelper.user = await UserCreator.promises.createNewUser(attributes)

    return userHelper
  }

  /**
   * Get existing user via UserGetter and return UserHelper instance.
   * All args passed to UserGetter.getUser.
   * @returns {UserHelper}
   */
  static async getUser(...args) {
    const user = await UserGetter.promises.getUser(...args)

    if (!user) {
      throw new Error(`no user found for args: ${JSON.stringify([...args])}`)
    }

    user.auditLog = await UserAuditLogEntry.find(
      { userId: user._id },
      {},
      { sort: { timestamp: 'asc' } }
    ).exec()

    return new UserHelper(user)
  }

  /**
   * Update an existing user via UserUpdater and return the updated UserHelper
   * instance.
   * All args passed to UserUpdater.getUser.
   * @returns {UserHelper}
   */
  static async updateUser(userId, update) {
    // TODO(das7pad): revert back to args pass-through after mongo upgrades
    const user = await UserUpdater.promises.updateUser(
      { _id: ObjectId(userId) },
      update
    )

    if (!user) {
      throw new Error(`no user found for args: ${JSON.stringify([userId])}`)
    }

    return new UserHelper(user)
  }

  /**
   * Login to existing account via request and return UserHelper instance
   * @param {object} userData
   * @param {string} userData.email
   * @param {string} userData.password
   * @returns {UserHelper}
   */
  static async loginUser(userData) {
    if (!userData || !userData.email || !userData.password) {
      throw new Error('email and password required')
    }
    const userHelper = new UserHelper()
    const loginPath = Settings.enableLegacyLogin ? '/login/legacy' : '/login'
    await userHelper.getCsrfToken()
    const response = await userHelper.fetch(loginPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        'g-recaptcha-response': 'valid',
        ...userData,
      }),
    })
    if (!response.ok) {
      const body = await response.text()
      const error = new Error(
        `login failed: status=${response.status} body=${JSON.stringify(body)}`
      )
      error.response = response
      throw error
    }

    const body = await response.json()
    if (body.redir !== '/project') {
      const error = new Error(
        `login should redirect to /project: status=${
          response.status
        } body=${JSON.stringify(body)}`
      )
      error.response = response
      throw error
    }

    userHelper.user = await UserGetter.promises.getUser({
      email: userData.email,
    })
    if (!userHelper.user) {
      throw new Error(`user not found for email: ${userData.email}`)
    }
    await userHelper.getCsrfToken()

    return userHelper
  }

  /**
   * Check if user is logged in by requesting an endpoint behind authentication.
   * @returns {Boolean}
   */
  async isLoggedIn() {
    const response = await this.fetch('/user/sessions', {
      redirect: 'follow',
    })
    return !response.redirected
  }

  /**
   * Register new account via request and return UserHelper instance.
   * If userData is not provided the default email and password will be used.
   * @param {object} [userData]
   * @param {string} [userData.email]
   * @param {string} [userData.password]
   * @returns {UserHelper}
   */
  static async registerUser(userData, options = {}) {
    const userHelper = new UserHelper()
    await userHelper.getCsrfToken()
    userData = userHelper.getDefaultEmailPassword(userData)
    const response = await userHelper.fetch('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(userData),
      ...options,
    })
    const body = await response.json()
    if (response.status !== 200) {
      throw new Error(
        `register failed: status=${response.status} body=${JSON.stringify(
          body
        )}`
      )
    }
    if (body.message && body.message.type === 'error') {
      throw new Error(`register api error: ${body.message.text}`)
    }
    if (body.redir === '/institutional-login') {
      throw new Error(
        `cannot register intitutional email: ${options.json.email}`
      )
    }
    userHelper.user = await UserGetter.promises.getUser({
      email: userData.email,
    })
    if (!userHelper.user) {
      throw new Error(`user not found for email: ${userData.email}`)
    }
    await userHelper.getCsrfToken()

    return userHelper
  }

  async refreshMongoUser() {
    this.user = await UserGetter.promises.getUser({
      _id: this.user._id,
    })
    return this.user
  }

  async addEmail(email) {
    const response = await this.fetch('/user/emails', {
      method: 'POST',
      body: new URLSearchParams([['email', email]]),
    })
    const body = await response.text()
    if (response.status !== 204) {
      throw new Error(
        `add email failed: status=${response.status} body=${JSON.stringify(
          body
        )}`
      )
    }
  }

  async addEmailAndConfirm(userId, email) {
    await this.addEmail(email)
    await this.confirmEmail(userId, email)
  }

  async changeConfirmationDate(userId, email, date) {
    const query = {
      _id: userId,
      'emails.email': email,
    }
    const update = {
      $set: {
        'emails.$.confirmedAt': date,
        'emails.$.reconfirmedAt': date,
      },
    }
    await UserUpdater.promises.updateUser(query, update)
    await InstitutionsAPI.promises.addAffiliation(userId, email, {
      confirmedAt: date,
    })
  }

  async changeConfirmedToNotificationPeriod(
    userId,
    email,
    maxConfirmationMonths
  ) {
    // set a user's confirmation date so that
    // it is within the notification period to reconfirm
    // but not older than the last day to reconfirm
    const notificationDays = Settings.reconfirmNotificationDays
    if (!notificationDays) return

    const middleOfNotificationPeriod = Math.ceil(notificationDays / 2)
    // use the middle of the notification rather than the start or end due to
    // variations in days in months.

    const lastDayToReconfirm = moment().subtract(
      maxConfirmationMonths,
      'months'
    )
    const notificationsStart = lastDayToReconfirm
      .add(middleOfNotificationPeriod, 'days')
      .toDate()
    await this.changeConfirmationDate(userId, email, notificationsStart)
  }

  async changeConfirmedToPastReconfirmation(
    userId,
    email,
    maxConfirmationMonths
  ) {
    // set a user's confirmation date so that they are past the reconfirmation window
    const date = moment()
      .subtract(maxConfirmationMonths, 'months')
      .subtract(1, 'week')
      .toDate()

    await this.changeConfirmationDate(userId, email, date)
  }

  async confirmEmail(userId, email) {
    // clear ratelimiting on resend confirmation endpoint
    await rateLimiters.resendConfirmation.delete(userId)
    // UserHelper.createUser does not create a confirmation token
    let response = await this.fetch('/user/emails/resend_confirmation', {
      method: 'POST',
      body: new URLSearchParams([['email', email]]),
    })
    if (response.status !== 200) {
      const body = await response.text()
      throw new Error(
        `resend confirmation failed: status=${
          response.status
        } body=${JSON.stringify(body)}`
      )
    }
    const tokenData = await db.tokens
      .find({
        use: 'email_confirmation',
        'data.user_id': userId.toString(),
        'data.email': email,
        usedAt: { $exists: false },
      })
      .next()
    response = await this.fetch('/user/emails/confirm', {
      method: 'POST',
      body: new URLSearchParams([['token', tokenData.token]]),
    })
    if (response.status !== 200) {
      const body = await response.text()
      throw new Error(
        `confirm email failed: status=${response.status} body=${JSON.stringify(
          body
        )}`
      )
    }
  }
}

module.exports = UserHelper
