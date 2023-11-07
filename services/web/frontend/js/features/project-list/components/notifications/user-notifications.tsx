import { JSXElementConstructor } from 'react'
import Common from './groups/common'
import Institution from './groups/institution'
import ConfirmEmail from './groups/confirm-email'
import ReconfirmationInfo from './groups/affiliation/reconfirmation-info'
import GroupsAndEnterpriseBanner from './groups-and-enterprise-banner'
import WritefullPromoBanner from './writefull-promo-banner'
import INRBanner from './ads/inr-banner'
import LATAMBanner from './ads/latam-banner'
import getMeta from '../../../../utils/meta'
import importOverleafModules from '../../../../../macros/import-overleaf-module.macro'
import BackToSchoolModal from './ads/back-to-school-modal'

type Subscription = {
  groupId: string
  groupName: string
}

const [enrollmentNotificationModule] = importOverleafModules(
  'managedGroupSubscriptionEnrollmentNotification'
)
const EnrollmentNotification: JSXElementConstructor<{
  groupId: string
  groupName: string
}> = enrollmentNotificationModule?.import.default

function UserNotifications() {
  const groupSubscriptionsPendingEnrollment: Subscription[] = getMeta(
    'ol-groupSubscriptionsPendingEnrollment',
    []
  )
  const showBackToSchoolModal = getMeta('ol-showBackToSchoolModal', false)

  const showInrGeoBanner = getMeta('ol-showInrGeoBanner', false)
  const inrGeoBannerVariant = showBackToSchoolModal
    ? 'default' // This test should be disabled to prevent double modals, but sanity check to be safe
    : getMeta('ol-inrGeoBannerVariant', 'default')
  const inrGeoBannerSplitTestName = getMeta(
    'ol-inrGeoBannerSplitTestName',
    'unassigned'
  )
  const showLATAMBanner = getMeta('ol-showLATAMBanner', false)

  return (
    <div className="user-notifications">
      <ul className="list-unstyled">
        {EnrollmentNotification &&
          groupSubscriptionsPendingEnrollment.map(subscription => (
            <EnrollmentNotification
              groupId={subscription.groupId}
              groupName={subscription.groupName}
              key={subscription.groupId}
            />
          ))}
        <Common />
        <Institution />
        <ConfirmEmail />
        <ReconfirmationInfo />
        {showLATAMBanner ? (
          <LATAMBanner />
        ) : showInrGeoBanner ? (
          <INRBanner
            variant={inrGeoBannerVariant}
            splitTestName={inrGeoBannerSplitTestName}
          />
        ) : (
          <GroupsAndEnterpriseBanner />
        )}
        {showBackToSchoolModal ? (
          <BackToSchoolModal />
        ) : (
          <WritefullPromoBanner />
        )}
      </ul>
    </div>
  )
}

export default UserNotifications
