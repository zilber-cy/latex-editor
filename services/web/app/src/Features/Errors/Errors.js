const OError = require('@overleaf/o-error')
const settings = require('@overleaf/settings')

// Error class for legacy errors so they inherit OError while staying
// backward-compatible (can be instantiated with string as argument instead
// of object)
class BackwardCompatibleError extends OError {
  constructor(messageOrOptions) {
    if (typeof messageOrOptions === 'string') {
      super(messageOrOptions)
    } else if (messageOrOptions) {
      const { message, info } = messageOrOptions
      super(message, info)
    } else {
      super()
    }
  }
}

// Error class that facilitates the migration to OError v3 by providing
// a signature in which the 2nd argument can be an object containing
// the `info` object.
class OErrorV2CompatibleError extends OError {
  constructor(message, options) {
    if (options) {
      super(message, options.info)
    } else {
      super(message)
    }
  }
}

class NotFoundError extends BackwardCompatibleError {}

class ForbiddenError extends BackwardCompatibleError {}

class ServiceNotConfiguredError extends BackwardCompatibleError {}

class TooManyRequestsError extends BackwardCompatibleError {}

class InvalidNameError extends BackwardCompatibleError {}

class UnsupportedFileTypeError extends BackwardCompatibleError {}

class FileTooLargeError extends BackwardCompatibleError {}

class UnsupportedExportRecordsError extends BackwardCompatibleError {}

class V1HistoryNotSyncedError extends BackwardCompatibleError {}

class ProjectHistoryDisabledError extends BackwardCompatibleError {}

class V1ConnectionError extends BackwardCompatibleError {}

class UnconfirmedEmailError extends BackwardCompatibleError {}

class EmailExistsError extends OErrorV2CompatibleError {
  constructor(options) {
    super('Email already exists', options)
  }
}

class InvalidError extends BackwardCompatibleError {}

class NotInV2Error extends BackwardCompatibleError {}

class SLInV2Error extends BackwardCompatibleError {}

class SAMLIdentityExistsError extends OError {
  get i18nKey() {
    return 'institution_account_tried_to_add_already_registered'
  }
}

class SAMLAlreadyLinkedError extends OError {
  get i18nKey() {
    return 'institution_account_tried_to_add_already_linked'
  }
}

class SAMLEmailNotAffiliatedError extends OError {
  get i18nKey() {
    return 'institution_account_tried_to_add_not_affiliated'
  }
}

class SAMLEmailAffiliatedWithAnotherInstitutionError extends OError {
  get i18nKey() {
    return 'institution_account_tried_to_add_affiliated_with_another_institution'
  }
}

class SAMLSessionDataMissing extends BackwardCompatibleError {
  constructor(arg) {
    super(arg)

    const samlSession =
      typeof arg === 'object' && arg !== null && arg.samlSession
        ? arg.samlSession
        : {}
    this.tryAgain = true
    const { universityId, universityName, externalUserId, institutionEmail } =
      samlSession

    if (
      !universityId &&
      !universityName &&
      !externalUserId &&
      !institutionEmail
    ) {
      this.message = 'Missing session data.'
    } else if (
      !institutionEmail &&
      samlSession &&
      samlSession.userEmailAttributeUnreliable
    ) {
      this.tryAgain = false
      this.message = `Your account settings at your institution prevent us from accessing your email address. You will need to make your email address public at your institution in order to link with ${settings.appName}. Please contact your IT department if you have any questions.`
    } else if (!institutionEmail) {
      this.message =
        'Unable to confirm your institutional email address. The institutional identity provider did not provide an email address in the expected attribute. Please contact us if this keeps happening.'
    }
  }
}

class ThirdPartyIdentityExistsError extends BackwardCompatibleError {
  constructor(arg) {
    super(arg)
    if (!this.message) {
      this.message =
        'provider and external id already linked to another account'
    }
  }
}

class ThirdPartyUserNotFoundError extends BackwardCompatibleError {
  constructor(arg) {
    super(arg)
    if (!this.message) {
      this.message = 'user not found for provider and external id'
    }
  }
}

class OutputFileFetchFailedError extends OError {}

class SubscriptionAdminDeletionError extends OErrorV2CompatibleError {
  constructor(options) {
    super('subscription admins cannot be deleted', options)
  }
}

class SubscriptionNotFoundError extends OErrorV2CompatibleError {
  constructor(options) {
    super('subscription not found', options)
  }
}

class ProjectNotFoundError extends OErrorV2CompatibleError {
  constructor(options) {
    super('project not found', options)
  }
}

class UserNotFoundError extends OErrorV2CompatibleError {
  constructor(options) {
    super('user not found', options)
  }
}

class UserNotCollaboratorError extends OErrorV2CompatibleError {
  constructor(options) {
    super('user not a collaborator', options)
  }
}

class DocHasRangesError extends OErrorV2CompatibleError {
  constructor(options) {
    super('document has ranges', options)
  }
}

class InvalidQueryError extends OErrorV2CompatibleError {
  constructor(options) {
    super('invalid search query', options)
  }
}

class AffiliationError extends OError {}

class InvalidInstitutionalEmailError extends OError {
  get i18nKey() {
    return 'invalid_institutional_email'
  }
}

module.exports = {
  OError,
  BackwardCompatibleError,
  NotFoundError,
  ForbiddenError,
  ServiceNotConfiguredError,
  TooManyRequestsError,
  InvalidNameError,
  UnsupportedFileTypeError,
  FileTooLargeError,
  UnsupportedExportRecordsError,
  V1HistoryNotSyncedError,
  ProjectHistoryDisabledError,
  V1ConnectionError,
  UnconfirmedEmailError,
  EmailExistsError,
  InvalidError,
  NotInV2Error,
  OutputFileFetchFailedError,
  SAMLIdentityExistsError,
  SAMLAlreadyLinkedError,
  SAMLEmailNotAffiliatedError,
  SAMLEmailAffiliatedWithAnotherInstitutionError,
  SAMLSessionDataMissing,
  SLInV2Error,
  ThirdPartyIdentityExistsError,
  ThirdPartyUserNotFoundError,
  SubscriptionAdminDeletionError,
  SubscriptionNotFoundError,
  ProjectNotFoundError,
  UserNotFoundError,
  UserNotCollaboratorError,
  DocHasRangesError,
  InvalidQueryError,
  AffiliationError,
  InvalidInstitutionalEmailError,
}
