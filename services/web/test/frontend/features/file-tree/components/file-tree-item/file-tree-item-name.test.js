import { expect } from 'chai'
import sinon from 'sinon'
import { screen, fireEvent, cleanup } from '@testing-library/react'
import renderWithContext from '../../helpers/render-with-context'

import FileTreeItemName from '../../../../../../frontend/js/features/file-tree/components/file-tree-item/file-tree-item-name'

describe('<FileTreeItemName />', function () {
  const sandbox = sinon.createSandbox()
  const setIsDraggable = sinon.stub()

  beforeEach(function () {
    sandbox.spy(window, 'requestAnimationFrame')
  })

  afterEach(function () {
    sandbox.restore()
    setIsDraggable.reset()
    cleanup()
  })

  it('renders name as button', function () {
    renderWithContext(
      <FileTreeItemName
        name="foo.tex"
        isSelected
        setIsDraggable={setIsDraggable}
      />
    )

    screen.getByRole('button', { name: 'foo.tex' })
    expect(screen.queryByRole('textbox')).to.not.exist
  })

  it("doesn't start renaming on unselected component", function () {
    renderWithContext(
      <FileTreeItemName
        name="foo.tex"
        isSelected={false}
        setIsDraggable={setIsDraggable}
      />
    )

    const button = screen.queryByRole('button')
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.doubleClick(button)
    expect(screen.queryByRole('textbox')).to.not.exist
  })

  it('start renaming on double-click', function () {
    renderWithContext(
      <FileTreeItemName
        name="foo.tex"
        isSelected
        setIsDraggable={setIsDraggable}
      />
    )

    const button = screen.queryByRole('button')
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.doubleClick(button)
    screen.getByRole('textbox')
    expect(screen.queryByRole('button')).to.not.exist
    expect(window.requestAnimationFrame).to.be.calledOnce
    expect(setIsDraggable).to.be.calledWith(false)
  })

  it('cannot start renaming in read-only', function () {
    renderWithContext(
      <FileTreeItemName
        name="foo.tex"
        isSelected
        setIsDraggable={setIsDraggable}
      />,
      {
        contextProps: { permissionsLevel: 'readOnly' },
      }
    )

    const button = screen.queryByRole('button')
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.doubleClick(button)

    expect(screen.queryByRole('textbox')).to.not.exist
  })

  describe('stop renaming', function () {
    beforeEach(function () {
      renderWithContext(
        <FileTreeItemName
          name="foo.tex"
          isSelected
          setIsDraggable={setIsDraggable}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)
      fireEvent.click(button)
      fireEvent.doubleClick(button)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'bar.tex' } })
    })

    it('on Escape', function () {
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'Escape' })

      screen.getByRole('button', { name: 'foo.tex' })
      expect(setIsDraggable).to.be.calledWith(true)
    })
  })
})
