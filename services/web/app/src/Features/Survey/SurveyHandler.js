const crypto = require('crypto')
const SurveyCache = require('./SurveyCache')
const SubscriptionLocator = require('../Subscription/SubscriptionLocator')
const { callbackify } = require('../../util/promises')

/**
 * @typedef {import('../../../../types/project/dashboard/survey').Survey} Survey
 */

/**
 * determines if there is a survey to show, given current surveys and rollout percentages
 * uses userId in computation, to ensure that rollout groups always contain same users
 * @param {string} userId
 * @returns {Promise<Survey | undefined>}
 */
async function getSurvey(userId) {
  const survey = await SurveyCache.get(true)
  if (survey) {
    if (survey.options?.hasRecurlyGroupSubscription) {
      const hasRecurlyGroupSubscription =
        await SubscriptionLocator.promises.hasRecurlyGroupSubscription(userId)
      if (!hasRecurlyGroupSubscription) {
        return
      }
    }

    const { name, preText, linkText, url, options } = survey?.toObject() || {}
    // default to full rollout for backwards compatibility
    const rolloutPercentage = options?.rolloutPercentage || 100
    if (!_userInRolloutPercentile(userId, name, rolloutPercentage)) {
      return
    }

    return { name, preText, linkText, url }
  }
}

function _userRolloutPercentile(userId, surveyName) {
  const hash = crypto
    .createHash('md5')
    .update(userId + surveyName)
    .digest('hex')
  const hashPrefix = hash.substring(0, 8)
  return Math.floor(
    ((parseInt(hashPrefix, 16) % 0xffffffff) / 0xffffffff) * 100
  )
}

function _userInRolloutPercentile(userId, surveyName, rolloutPercentage) {
  if (rolloutPercentage === 100) {
    return true
  }
  const userPercentile = _userRolloutPercentile(userId, surveyName)
  return userPercentile < rolloutPercentage
}

module.exports = {
  getSurvey: callbackify(getSurvey),
  promises: {
    getSurvey,
  },
}
