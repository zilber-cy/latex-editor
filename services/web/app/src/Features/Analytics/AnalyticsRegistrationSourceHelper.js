const AnalyticsManager = require('./AnalyticsManager')
const RequestHelper = require('./RequestHelper')

function clearSource(session) {
  if (session) {
    delete session.required_login_from_product_medium
    delete session.required_login_from_product_source
  }
}

function setInbound(session, url, query, referrer) {
  const inboundSession = {
    referrer: RequestHelper.parseReferrer(referrer, url),
    utm: RequestHelper.parseUtm(query),
  }

  if (inboundSession.referrer || inboundSession.utm) {
    session.inbound = inboundSession
  }
}

function clearInbound(session) {
  if (session) {
    delete session.inbound
  }
}

function addUserProperties(userId, session) {
  if (!session) {
    return
  }

  if (session.required_login_from_product_medium) {
    AnalyticsManager.setUserPropertyForUser(
      userId,
      `registered-from-product-medium`,
      session.required_login_from_product_medium
    )
    if (session.required_login_from_product_source) {
      AnalyticsManager.setUserPropertyForUser(
        userId,
        `registered-from-product-source`,
        session.required_login_from_product_source
      )
    }
  } else if (session.referal_id) {
    AnalyticsManager.setUserPropertyForUser(
      userId,
      `registered-from-bonus-scheme`,
      true
    )
    AnalyticsManager.setUserPropertyForUser(
      userId,
      `registered-from-product-medium`,
      'bonus-scheme'
    )
  }

  if (session.inbound) {
    if (session.inbound.referrer && session.inbound.referrer.medium) {
      AnalyticsManager.setUserPropertyForUser(
        userId,
        `registered-from-referrer-medium`,
        `${session.inbound.referrer.medium
          .charAt(0)
          .toUpperCase()}${session.inbound.referrer.medium.slice(1)}`
      )
      if (session.inbound.referrer.source) {
        AnalyticsManager.setUserPropertyForUser(
          userId,
          `registered-from-referrer-source`,
          session.inbound.referrer.source
        )
      }
    }

    if (session.inbound.utm) {
      for (const utmKey of RequestHelper.UTM_KEYS) {
        if (session.inbound.utm[utmKey]) {
          AnalyticsManager.setUserPropertyForUser(
            userId,
            `registered-from-${utmKey.replace('_', '-')}`,
            session.inbound.utm[utmKey]
          )
        }
      }
    }
  }
}

module.exports = {
  clearSource,
  setInbound,
  clearInbound,
  addUserProperties,
}
