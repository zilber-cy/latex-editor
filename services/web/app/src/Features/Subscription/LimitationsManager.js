const OError = require('@overleaf/o-error')
const logger = require('@overleaf/logger')
const ProjectGetter = require('../Project/ProjectGetter')
const UserGetter = require('../User/UserGetter')
const SubscriptionLocator = require('./SubscriptionLocator')
const Settings = require('@overleaf/settings')
const CollaboratorsGetter = require('../Collaborators/CollaboratorsGetter')
const CollaboratorsInvitesHandler = require('../Collaborators/CollaboratorsInviteHandler')
const V1SubscriptionManager = require('./V1SubscriptionManager')
const { V1ConnectionError } = require('../Errors/Errors')
const { promisifyAll } = require('../../util/promises')

const LimitationsManager = {
  allowedNumberOfCollaboratorsInProject(projectId, callback) {
    ProjectGetter.getProject(
      projectId,
      { owner_ref: true },
      (error, project) => {
        if (error) {
          return callback(error)
        }
        this.allowedNumberOfCollaboratorsForUser(project.owner_ref, callback)
      }
    )
  },

  allowedNumberOfCollaboratorsForUser(userId, callback) {
    UserGetter.getUser(userId, { features: 1 }, function (error, user) {
      if (error) {
        return callback(error)
      }
      if (user.features && user.features.collaborators) {
        callback(null, user.features.collaborators)
      } else {
        callback(null, Settings.defaultFeatures.collaborators)
      }
    })
  },

  canAddXCollaborators(projectId, numberOfNewCollaborators, callback) {
    this.allowedNumberOfCollaboratorsInProject(
      projectId,
      (error, allowedNumber) => {
        if (error) {
          return callback(error)
        }
        CollaboratorsGetter.getInvitedCollaboratorCount(
          projectId,
          (error, currentNumber) => {
            if (error) {
              return callback(error)
            }
            CollaboratorsInvitesHandler.getInviteCount(
              projectId,
              (error, inviteCount) => {
                if (error) {
                  return callback(error)
                }
                if (
                  currentNumber + inviteCount + numberOfNewCollaborators <=
                    allowedNumber ||
                  allowedNumber < 0
                ) {
                  callback(null, true)
                } else {
                  callback(null, false)
                }
              }
            )
          }
        )
      }
    )
  },

  hasPaidSubscription(user, callback) {
    this.userHasV2Subscription(user, (err, hasSubscription, subscription) => {
      if (err) {
        return callback(err)
      }
      this.userIsMemberOfGroupSubscription(user, (err, isMember) => {
        if (err) {
          return callback(err)
        }
        this.userHasV1Subscription(user, (err, hasV1Subscription) => {
          if (err) {
            return callback(
              new V1ConnectionError(
                'error getting subscription from v1'
              ).withCause(err)
            )
          }
          callback(
            err,
            isMember || hasSubscription || hasV1Subscription,
            subscription
          )
        })
      })
    })
  },

  // alias for backward-compatibility with modules. Use `haspaidsubscription` instead
  userHasSubscriptionOrIsGroupMember(user, callback) {
    this.hasPaidSubscription(user, callback)
  },

  userHasV2Subscription(user, callback) {
    SubscriptionLocator.getUsersSubscription(
      user._id,
      function (err, subscription) {
        if (err) {
          return callback(err)
        }
        let hasValidSubscription = false
        if (subscription) {
          if (
            subscription.recurlySubscription_id ||
            subscription.customAccount
          ) {
            hasValidSubscription = true
          }
        }
        callback(err, hasValidSubscription, subscription)
      }
    )
  },

  userHasV1OrV2Subscription(user, callback) {
    this.userHasV2Subscription(user, (err, hasV2Subscription) => {
      if (err) {
        return callback(err)
      }
      if (hasV2Subscription) {
        return callback(null, true)
      }
      this.userHasV1Subscription(user, (err, hasV1Subscription) => {
        if (err) {
          return callback(err)
        }
        if (hasV1Subscription) {
          return callback(null, true)
        }
        callback(null, false)
      })
    })
  },

  userIsMemberOfGroupSubscription(user, callback) {
    SubscriptionLocator.getMemberSubscriptions(
      user._id,
      function (err, subscriptions) {
        if (!subscriptions) {
          subscriptions = []
        }
        if (err) {
          return callback(err)
        }
        callback(err, subscriptions.length > 0, subscriptions)
      }
    )
  },

  userHasV1Subscription(user, callback) {
    V1SubscriptionManager.getSubscriptionsFromV1(
      user._id,
      function (err, v1Subscription) {
        callback(
          err,
          !!(v1Subscription ? v1Subscription.has_subscription : undefined)
        )
      }
    )
  },

  teamHasReachedMemberLimit(subscription) {
    const currentTotal =
      (subscription.member_ids || []).length +
      (subscription.teamInvites || []).length +
      (subscription.invited_emails || []).length

    return currentTotal >= subscription.membersLimit
  },

  hasGroupMembersLimitReached(subscriptionId, callback) {
    SubscriptionLocator.getSubscription(
      subscriptionId,
      function (err, subscription) {
        if (err) {
          OError.tag(err, 'error getting subscription', {
            subscriptionId,
          })
          return callback(err)
        }
        if (!subscription) {
          logger.warn({ subscriptionId }, 'no subscription found')
          return callback(new Error('no subscription found'))
        }

        const limitReached =
          LimitationsManager.teamHasReachedMemberLimit(subscription)
        callback(err, limitReached, subscription)
      }
    )
  },
}

LimitationsManager.promises = promisifyAll(LimitationsManager, {
  multiResult: {
    userHasV2Subscription: ['hasSubscription', 'subscription'],
    userIsMemberOfGroupSubscription: ['isMember', 'subscriptions'],
    hasGroupMembersLimitReached: ['limitReached', 'subscription'],
  },
})
module.exports = LimitationsManager
