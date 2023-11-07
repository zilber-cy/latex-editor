import App from '../../../base'
import { react2angular } from 'react2angular'

import ShareProjectModal from '../components/share-project-modal'
import { rootContext } from '../../../shared/context/root-context'
import { listProjectInvites, listProjectMembers } from '../utils/api'

App.component(
  'shareProjectModal',
  react2angular(
    rootContext.use(ShareProjectModal),
    Object.keys(ShareProjectModal.propTypes)
  )
)

export default App.controller(
  'ReactShareProjectModalController',
  function ($scope, eventTracking, ide) {
    $scope.show = false

    $scope.handleHide = () => {
      $scope.$applyAsync(() => {
        $scope.show = false
      })
    }

    $scope.openShareProjectModal = () => {
      eventTracking.sendMBOnce('ide-open-share-modal-once')
      $scope.$applyAsync(() => {
        $scope.show = true
      })
    }

    ide.socket.on('project:membership:changed', data => {
      if (data.members) {
        listProjectMembers($scope.project._id)
          .then(({ members }) => {
            if (members) {
              $scope.$applyAsync(() => {
                $scope.project.members = members
              })
            }
          })
          .catch(() => {
            console.error('Error fetching members for project')
          })
      }

      if (data.invites) {
        listProjectInvites($scope.project._id)
          .then(({ invites }) => {
            if (invites) {
              $scope.$applyAsync(() => {
                $scope.project.invites = invites
              })
            }
          })
          .catch(() => {
            console.error('Error fetching invites for project')
          })
      }
    })
  }
)
