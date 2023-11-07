import HighlightedWordManager from './HighlightedWordManager'
import 'ace/ace'
const { Range } = ace.require('ace/range')

class SpellCheckAdapter {
  constructor(editor) {
    this.replaceWord = this.replaceWord.bind(this)
    this.editor = editor
    this.highlightedWordManager = new HighlightedWordManager(this.editor)
  }

  getLines() {
    return this.editor.getValue().split('\n')
  }

  getLineCount() {
    return this.editor.session.getLength()
  }

  getFirstVisibleRowNum() {
    return this.editor.renderer.layerConfig.firstRow
  }

  getLastVisibleRowNum() {
    return this.editor.renderer.layerConfig.lastRow
  }

  getLinesByRows(rows) {
    return rows.map(rowIdx => this.editor.session.doc.getLine(rowIdx))
  }

  getSelectionContents() {
    return this.editor.getSelectedText()
  }

  normalizeChangeEvent(e) {
    return e
  }

  getCoordsFromContextMenuEvent(e) {
    e.domEvent.stopPropagation()
    return {
      x: e.domEvent.clientX,
      y: e.domEvent.clientY,
    }
  }

  preventContextMenuEventDefault(e) {
    e.domEvent.preventDefault()
  }

  getHighlightFromCoords(coords) {
    const position = this.editor.renderer.screenToTextCoordinates(
      coords.x,
      coords.y
    )
    return this.highlightedWordManager.findHighlightWithinRange({
      start: position,
      end: position,
    })
  }

  isContextMenuEventOnBottomHalf(e) {
    const { clientY } = e.domEvent
    const editorBoundingRect = e.target.container.getBoundingClientRect()
    const relativeYPos =
      (clientY - editorBoundingRect.top) / editorBoundingRect.height
    return relativeYPos > 0.5
  }

  selectHighlightedWord(highlight) {
    const { row } = highlight.range.start
    const startColumn = highlight.range.start.column
    const endColumn = highlight.range.end.column

    this.editor
      .getSession()
      .getSelection()
      .setSelectionRange(new Range(row, startColumn, row, endColumn))
  }

  replaceWord(highlight, newWord) {
    const { row } = highlight.range.start
    const startColumn = highlight.range.start.column
    const endColumn = highlight.range.end.column

    this.editor
      .getSession()
      .replace(new Range(row, startColumn, row, endColumn), newWord)

    // Bring editor back into focus after clicking on suggestion
    this.editor.focus()
  }
}

export default SpellCheckAdapter
