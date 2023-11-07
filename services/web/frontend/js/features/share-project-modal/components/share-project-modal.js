import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import PropTypes from 'prop-types'
import ShareProjectModalContent from './share-project-modal-content'
import {
  useProjectContext,
  projectShape,
} from '../../../shared/context/project-context'
import { useSplitTestContext } from '../../../shared/context/split-test-context'
import { sendMB } from '../../../infrastructure/event-tracking'

const ShareProjectContext = createContext()

ShareProjectContext.Provider.propTypes = {
  value: PropTypes.shape({
    updateProject: PropTypes.func.isRequired,
    monitorRequest: PropTypes.func.isRequired,
    inFlight: PropTypes.bool,
    setInFlight: PropTypes.func,
    error: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    setError: PropTypes.func,
  }),
}

export function useShareProjectContext() {
  const context = useContext(ShareProjectContext)

  if (!context) {
    throw new Error(
      'useShareProjectContext is only available inside ShareProjectProvider'
    )
  }

  return context
}

const ShareProjectModal = React.memo(function ShareProjectModal({
  handleHide,
  show,
  animation = true,
}) {
  const [inFlight, setInFlight] = useState(false)
  const [error, setError] = useState()

  const project = useProjectContext(projectShape)

  const { splitTestVariants } = useSplitTestContext({
    splitTestVariants: PropTypes.object,
  })

  // send tracking event when the modal is opened
  useEffect(() => {
    if (show) {
      sendMB('share-modal-opened', {
        splitTestVariant: splitTestVariants['null-test-share-modal'],
        project_id: project._id,
      })
    }
  }, [splitTestVariants, project._id, show])

  // reset error when the modal is opened
  useEffect(() => {
    if (show) {
      setError(undefined)
    }
  }, [show])

  // close the modal if not in flight
  const cancel = useCallback(() => {
    if (!inFlight) {
      handleHide()
    }
  }, [handleHide, inFlight])

  // update `error` and `inFlight` while sending a request
  const monitorRequest = useCallback(request => {
    setError(undefined)
    setInFlight(true)

    const promise = request()

    promise.catch(error => {
      setError(
        error.data?.errorReason ||
          error.data?.error ||
          'generic_something_went_wrong'
      )
    })

    promise.finally(() => {
      setInFlight(false)
    })

    return promise
  }, [])

  // merge the new data with the old project data
  const updateProject = useCallback(
    data => Object.assign(project, data),
    [project]
  )

  if (!project) {
    return null
  }

  return (
    <ShareProjectContext.Provider
      value={{
        updateProject,
        monitorRequest,
        inFlight,
        setInFlight,
        error,
        setError,
      }}
    >
      <ShareProjectModalContent
        animation={animation}
        cancel={cancel}
        error={error}
        inFlight={inFlight}
        show={show}
      />
    </ShareProjectContext.Provider>
  )
})
ShareProjectModal.propTypes = {
  animation: PropTypes.bool,
  handleHide: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
}

export default ShareProjectModal
