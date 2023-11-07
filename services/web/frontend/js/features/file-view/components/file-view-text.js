import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useProjectContext } from '../../../shared/context/project-context'

const MAX_FILE_SIZE = 2 * 1024 * 1024

export default function FileViewText({ file, onLoad, onError }) {
  const { _id: projectId } = useProjectContext({
    _id: PropTypes.string.isRequired,
  })

  const [textPreview, setTextPreview] = useState('')
  const [shouldShowDots, setShouldShowDots] = useState(false)
  const [inFlight, setInFlight] = useState(false)

  useEffect(() => {
    if (inFlight) {
      return
    }
    let path = `/project/${projectId}/file/${file.id}`
    fetch(path, { method: 'HEAD' })
      .then(response => {
        if (!response.ok) throw new Error('HTTP Error Code: ' + response.status)
        return response.headers.get('Content-Length')
      })
      .then(fileSize => {
        let truncated = false
        let maxSize = null
        if (fileSize > MAX_FILE_SIZE) {
          truncated = true
          maxSize = MAX_FILE_SIZE
        }

        if (maxSize != null) {
          path += `?range=0-${maxSize}`
        }
        return fetch(path).then(response => {
          return response.text().then(text => {
            if (truncated) {
              text = text.replace(/\n.*$/, '')
            }

            setTextPreview(text)
            onLoad()
            setShouldShowDots(truncated)
          })
        })
      })
      .catch(err => {
        console.error(err)
        onError()
      })
      .finally(() => {
        setInFlight(false)
      })
  }, [projectId, file.id, onError, onLoad, inFlight])
  return (
    <div>
      {textPreview && (
        <div className="text-preview">
          <div className="scroll-container">
            <p>{textPreview}</p>
            {shouldShowDots && <p>...</p>}
          </div>
        </div>
      )}
    </div>
  )
}

FileViewText.propTypes = {
  file: PropTypes.shape({ id: PropTypes.string }).isRequired,
  onLoad: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
}
