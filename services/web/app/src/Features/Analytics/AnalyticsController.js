const metrics = require('@overleaf/metrics')
const AnalyticsManager = require('./AnalyticsManager')
const SessionManager = require('../Authentication/SessionManager')
const GeoIpLookup = require('../../infrastructure/GeoIpLookup')
const Features = require('../../infrastructure/Features')

async function updateEditingSession(req, res, next) {
  if (!Features.hasFeature('analytics')) {
    return res.sendStatus(202)
  }
  const userId = SessionManager.getLoggedInUserId(req.session)
  const { projectId } = req.params
  const segmentation = req.body.segmentation || {}
  let countryCode = null

  if (userId) {
    try {
      const geoDetails = await GeoIpLookup.promises.getDetails(req.ip)
      if (geoDetails && geoDetails.country_code) {
        countryCode = geoDetails.country_code
      }
      AnalyticsManager.updateEditingSession(
        userId,
        projectId,
        countryCode,
        segmentation
      )
    } catch (error) {
      metrics.inc('analytics_geo_ip_lookup_errors')
    }
  }
  res.sendStatus(202)
}

function recordEvent(req, res, next) {
  if (!Features.hasFeature('analytics')) {
    return res.sendStatus(202)
  }
  delete req.body._csrf
  AnalyticsManager.recordEventForSession(
    req.session,
    req.params.event,
    req.body
  )
  res.sendStatus(202)
}

module.exports = {
  updateEditingSession,
  recordEvent,
}
