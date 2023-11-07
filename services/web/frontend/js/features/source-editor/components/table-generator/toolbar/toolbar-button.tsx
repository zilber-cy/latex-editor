import { EditorView } from '@codemirror/view'
import classNames from 'classnames'
import { memo, useCallback } from 'react'
import Tooltip from '../../../../../shared/components/tooltip'
import MaterialIcon from '../../../../../shared/components/material-icon'
import { useCodeMirrorViewContext } from '../../codemirror-editor'
import { emitTableGeneratorEvent } from '../analytics'

export const ToolbarButton = memo<{
  id: string
  className?: string
  label: string
  command?: (view: EditorView) => void
  active?: boolean
  disabled?: boolean
  disabledLabel?: string
  icon: string
  hidden?: boolean
}>(function ToolbarButton({
  id,
  className,
  label,
  command,
  active = false,
  disabled,
  icon,
  hidden = false,
  disabledLabel,
}) {
  const view = useCodeMirrorViewContext()
  const handleMouseDown = useCallback(event => {
    event.preventDefault()
  }, [])

  const handleClick = useCallback(
    event => {
      if (command) {
        emitTableGeneratorEvent(view, id)
        event.preventDefault()
        command(view)
      }
    },
    [command, view, id]
  )

  const button = (
    <button
      className={classNames('table-generator-toolbar-button', className, {
        hidden,
        active,
      })}
      aria-label={label}
      onMouseDown={handleMouseDown}
      onClick={!disabled ? handleClick : undefined}
      disabled={disabled}
      aria-disabled={disabled}
      type="button"
    >
      <MaterialIcon type={icon} />
    </button>
  )

  const description =
    disabled && disabledLabel ? <div>{disabledLabel}</div> : <div>{label}</div>

  return (
    <Tooltip
      id={id}
      description={description}
      overlayProps={{ placement: 'bottom' }}
    >
      {button}
    </Tooltip>
  )
})
