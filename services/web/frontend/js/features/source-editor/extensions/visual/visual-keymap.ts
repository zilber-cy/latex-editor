import { keymap } from '@codemirror/view'
import { EditorSelection, Prec } from '@codemirror/state'
import { ancestorNodeOfType } from '../../utils/tree-query'
import {
  getIndentation,
  IndentContext,
  indentString,
} from '@codemirror/language'
import {
  cursorIsAtStartOfListItem,
  indentDecrease,
  indentIncrease,
} from '../toolbar/commands'

/**
 * A keymap which provides behaviours for the visual editor,
 * including lists and text formatting.
 */
export const visualKeymap = Prec.highest(
  keymap.of([
    // create a new list item with the same indentation
    {
      key: 'Enter',
      run: view => {
        const { state } = view

        let handled = false

        const changes = state.changeByRange(range => {
          if (range.empty) {
            const { from } = range
            const listNode = ancestorNodeOfType(state, from, 'ListEnvironment')
            if (listNode) {
              const line = state.doc.lineAt(range.from)
              const endLine = state.doc.lineAt(listNode.to)

              if (line.number === endLine.number - 1) {
                // last item line
                if (line.text.trim() === '\\item') {
                  // no content on this line

                  // delete this line
                  const changes = state.changes({
                    from: line.from,
                    to: line.to + 1,
                    insert: '',
                  })

                  // the start of the line after the list environment
                  const range = EditorSelection.cursor(endLine.to + 1).map(
                    changes
                  )

                  handled = true

                  return { changes, range }
                }
              }

              // create a new list item
              const cx = new IndentContext(state)
              const columns = getIndentation(cx, from) ?? 0
              const indent = indentString(state, columns)
              const insert = `\n${indent}\\item `

              const countWhitespaceAfterPosition = (pos: number) => {
                const line = state.doc.lineAt(pos)
                const followingText = state.sliceDoc(pos, line.to)
                const matches = followingText.match(/^(\s+)/)
                return matches ? matches[1].length : 0
              }

              // move the cursor past any whitespace on the new line
              const pos =
                from + insert.length + countWhitespaceAfterPosition(from)

              handled = true

              return {
                changes: { from, insert },
                range: EditorSelection.cursor(pos),
              }
            }

            const sectioningNode = ancestorNodeOfType(
              state,
              from,
              'SectioningCommand'
            )
            if (sectioningNode) {
              // jump out of a section heading to the start of the next line
              const nextLineNumber = state.doc.lineAt(from).number + 1
              if (nextLineNumber <= state.doc.lines) {
                const line = state.doc.line(nextLineNumber)
                handled = true
                return {
                  range: EditorSelection.cursor(line.from),
                }
              }
            }
          }

          return { range }
        })

        if (handled) {
          view.dispatch(changes, {
            scrollIntoView: true,
            userEvent: 'input',
          })
        }

        return handled
      },
    },
    // Increase list indent
    {
      key: 'Mod-]',
      preventDefault: true,
      run: indentIncrease,
    },
    // Decrease list indent
    {
      key: 'Mod-[',
      preventDefault: true,
      run: indentDecrease,
    },
    // Increase list indent
    {
      key: 'Tab',
      preventDefault: true,
      run: view =>
        cursorIsAtStartOfListItem(view.state) && indentIncrease(view),
    },
    // Decrease list indent
    {
      key: 'Shift-Tab',
      preventDefault: true,
      run: indentDecrease,
    },
  ])
)
