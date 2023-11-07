import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useCodeMirrorStateContext,
  useCodeMirrorViewContext,
} from '../codemirror-editor'
import { Button } from 'react-bootstrap'
import { resolveCommandNode } from '../../extensions/command-tooltip'
import {
  LabelArgument,
  RefArgument,
  ShortArg,
  ShortTextArgument,
} from '../../lezer-latex/latex.terms.mjs'
import { SyntaxNode } from '@lezer/common'
import { syntaxTree } from '@codemirror/language'
import {
  EditorSelection,
  EditorState,
  TransactionSpec,
} from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import Icon from '../../../../shared/components/icon'

export const RefTooltipContent: FC = () => {
  const { t } = useTranslation()
  const view = useCodeMirrorViewContext()
  const state = useCodeMirrorStateContext()

  return (
    <div className="ol-cm-command-tooltip-content">
      <Button
        type="button"
        bsStyle="link"
        className="ol-cm-command-tooltip-link"
        onClick={() => {
          const target = readTarget(state)
          if (target) {
            const labelNode = findTargetLabel(state, target)
            // TODO: handle label not found
            if (labelNode) {
              view.dispatch(selectNode(labelNode))
            }
          }
        }}
      >
        <Icon type="link" fw />
        {t('open_target')}
      </Button>
    </div>
  )
}

const readTarget = (state: EditorState) => {
  const commandNode = resolveCommandNode(state)
  const argumentNode = commandNode
    ?.getChild(RefArgument)
    ?.getChild(ShortTextArgument)
    ?.getChild(ShortArg)

  if (argumentNode) {
    return state.sliceDoc(argumentNode.from, argumentNode.to)
  }
}

const findTargetLabel = (state: EditorState, target: string) => {
  let labelNode: SyntaxNode | undefined

  syntaxTree(state).iterate({
    enter(nodeRef) {
      if (labelNode) {
        return false
      }

      if (nodeRef.type.is(LabelArgument)) {
        const argumentNode = nodeRef.node
          .getChild('ShortTextArgument')
          ?.getChild('ShortArg')

        if (argumentNode) {
          const label = state.sliceDoc(argumentNode.from, argumentNode.to)
          if (label === target) {
            labelNode = argumentNode
          }
        }
      }
    },
  })

  return labelNode
}

const selectNode = (node: SyntaxNode): TransactionSpec => {
  const selection = EditorSelection.range(node.from, node.to)

  return {
    selection,
    effects: EditorView.scrollIntoView(selection, {
      y: 'center',
    }),
  }
}
