import { EditorSelection, EditorState, SelectionRange } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { ancestorOfNodeWithType } from '../../utils/tree-operations/ancestors'
import { SyntaxNode } from '@lezer/common'

export const findCurrentSectionHeadingLevel = (state: EditorState) => {
  const selections = state.selection.ranges.map(range =>
    rangeInfo(state, range)
  )
  const currentLevels = new Set(selections.map(item => item.level))

  return currentLevels.size === 1 ? selections[0] : null
}

type RangeInfo = {
  range: SelectionRange
  command?: SyntaxNode
  ctrlSeq?: SyntaxNode
  level: string
}

export const rangeInfo = (
  state: EditorState,
  range: SelectionRange
): RangeInfo => {
  const tree = syntaxTree(state)

  const fromNode = tree.resolveInner(range.from, 1)
  const fromAncestor = ancestorOfNodeWithType(fromNode, 'SectioningCommand')

  const toNode = tree.resolveInner(range.to, -1)
  const toAncestor = ancestorOfNodeWithType(toNode, 'SectioningCommand')

  const command = fromAncestor ?? toAncestor

  // from and to are both outside section heading
  if (!command) {
    return { range, level: 'text' }
  }

  if (fromAncestor && toAncestor) {
    // from and to are inside different section headings
    if (fromAncestor !== toAncestor) {
      return { range, level: 'text' }
    }
  } else {
    // the range isn't empty and only one end is inside a section heading
    if (!range.empty) {
      return { range, level: 'text' }
    }
  }

  const ctrlSeq = command.firstChild
  if (!ctrlSeq) {
    return { range, level: 'text' }
  }

  const level = state.sliceDoc(ctrlSeq.from + 1, ctrlSeq.to).trim()

  return { command, ctrlSeq, level, range }
}

export const setSectionHeadingLevel = (view: EditorView, level: string) => {
  view.dispatch(
    view.state.changeByRange(range => {
      const info = rangeInfo(view.state, range)

      if (level === info.level) {
        return { range }
      }

      if (level === 'text' && info.command) {
        // remove
        const argument = info.command.getChild('SectioningArgument')
        if (argument) {
          const content = view.state.sliceDoc(
            argument.from + 1,
            argument.to - 1
          )
          // map through the prefix only
          const changedRange = range.map(
            view.state.changes([
              { from: info.command.from, to: argument.from + 1, insert: '' },
            ]),
            1
          )
          return {
            range: changedRange,
            changes: [
              {
                from: info.command.from,
                to: info.command.to,
                insert: content,
              },
            ],
          }
        }
        return { range }
      } else if (info.level === 'text') {
        // add
        const insert = {
          prefix: `\\${level}{`,
          suffix: '}',
        }

        const originalRange = range
        const line = view.state.doc.lineAt(range.anchor)
        if (range.empty) {
          // expand range to cover the whole line
          range = EditorSelection.range(line.from, line.to)
        } else {
          if (range.from !== line.from) {
            insert.prefix = '\n' + insert.prefix
          }

          if (range.to !== line.to) {
            insert.suffix += '\n'
          }
        }

        const content = view.state.sliceDoc(range.from, range.to)

        // map through the prefix only
        const changedRange = originalRange.map(
          view.state.changes([
            { from: range.from, insert: `${insert.prefix}` },
          ]),
          1
        )

        return {
          range: changedRange,
          // create a single change, including the content
          changes: [
            {
              from: range.from,
              to: range.to,
              insert: `${insert.prefix}${content}${insert.suffix}`,
            },
          ],
        }
      } else {
        // change
        if (!info.ctrlSeq) {
          return { range }
        }

        const changes = view.state.changes([
          {
            from: info.ctrlSeq.from + 1,
            to: info.ctrlSeq.to,
            insert: level,
          },
        ])

        return {
          range: range.map(changes),
          changes,
        }
      }
    }),
    { scrollIntoView: true }
  )
}
