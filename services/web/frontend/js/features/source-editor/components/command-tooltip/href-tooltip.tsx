import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useCodeMirrorStateContext,
  useCodeMirrorViewContext,
} from '../codemirror-editor'
import {
  closeCommandTooltip,
  resolveCommandNode,
} from '../../extensions/command-tooltip'
import {
  LiteralArgContent,
  ShortArg,
  ShortTextArgument,
  UrlArgument,
} from '../../lezer-latex/latex.terms.mjs'
import { Button, ControlLabel, FormControl, FormGroup } from 'react-bootstrap'
import Icon from '../../../../shared/components/icon'
import { EditorState } from '@codemirror/state'

export const HrefTooltipContent: FC = () => {
  const state = useCodeMirrorStateContext()
  const view = useCodeMirrorViewContext()
  const [url, setUrl] = useState<string>(() => readUrl(state) ?? '')
  const { t } = useTranslation()

  const inputRef = useRef<HTMLInputElement | null>(null)

  // Update the URL if the argument value changes while not editing
  // TODO: on input blur, update the input value with this URL or read from the syntax tree?
  useEffect(() => {
    if (inputRef.current) {
      const controller = new AbortController()

      // update the input URL when it changes in the doc
      inputRef.current.addEventListener(
        'value-update',
        event => {
          setUrl((event as CustomEvent<string>).detail)
        },
        { signal: controller.signal }
      )

      // focus the input element if there is content selected in the doc when the tooltip opens
      if (!view.state.selection.main.empty) {
        inputRef.current.focus()
      }

      inputRef.current?.addEventListener(
        'blur',
        () => {
          const currentUrl = readUrl(view.state)
          if (currentUrl) {
            setUrl(currentUrl)
          }
        },
        { signal: controller.signal }
      )

      return () => controller.abort()
    }
  }, [view])

  const handleSubmit = useCallback(
    event => {
      event.preventDefault()
      view.dispatch(closeCommandTooltip())
      view.focus()
    },
    [view]
  )

  return (
    <div className="ol-cm-command-tooltip-content">
      <form className="ol-cm-command-tooltip-form" onSubmit={handleSubmit}>
        <FormGroup controlId="link-tooltip-url-input">
          <ControlLabel>URL</ControlLabel>
          <FormControl
            type="url"
            bsSize="sm"
            size={50}
            placeholder="https://…"
            value={url}
            inputRef={element => {
              inputRef.current = element
            }}
            autoComplete="off"
            onChange={event => {
              const url = (event.target as HTMLInputElement).value
              setUrl(url)
              const spec = replaceUrl(state, url)
              if (spec) {
                view.dispatch(spec)
              }
            }}
          />
        </FormGroup>
      </form>

      <Button
        type="button"
        bsStyle="link"
        className="ol-cm-command-tooltip-link"
        onClick={() => {
          // TODO: unescape content
          window.open(url, '_blank')
        }}
      >
        <Icon type="external-link" fw />
        {t('open_link')}
      </Button>

      <Button
        type="button"
        bsStyle="link"
        className="ol-cm-command-tooltip-link"
        onClick={() => {
          const spec = removeLink(state)
          if (spec) {
            view.dispatch(spec)
            view.focus()
          }
        }}
      >
        <Icon type="chain-broken" fw />
        {t('remove_link')}
      </Button>
    </div>
  )
}

const readUrl = (state: EditorState) => {
  const commandNode = resolveCommandNode(state)
  const argumentNode = commandNode
    ?.getChild(UrlArgument)
    ?.getChild(LiteralArgContent)

  if (argumentNode) {
    return state.sliceDoc(argumentNode.from, argumentNode.to)
  }
}

const replaceUrl = (state: EditorState, url: string) => {
  const commandNode = resolveCommandNode(state)
  const argumentNode = commandNode
    ?.getChild(UrlArgument)
    ?.getChild(LiteralArgContent)

  if (argumentNode) {
    return {
      changes: {
        from: argumentNode.from,
        to: argumentNode.to,
        insert: url,
      },
    }
  }
}

const removeLink = (state: EditorState) => {
  const commandNode = resolveCommandNode(state)
  const contentNode = commandNode
    ?.getChild(ShortTextArgument)
    ?.getChild(ShortArg)

  if (commandNode && contentNode) {
    const content = state.sliceDoc(contentNode.from, contentNode.to)
    return {
      changes: {
        from: commandNode.from,
        to: commandNode.to,
        insert: content,
      },
    }
  }
}
