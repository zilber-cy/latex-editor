import { expect } from 'chai'
import sinon from 'sinon'
import { screen, fireEvent } from '@testing-library/react'

import OutlinePane from '../../../../../frontend/js/features/outline/components/outline-pane'
import { renderWithEditorContext } from '../../../helpers/render-with-context'

describe('<OutlinePane />', function () {
  const jumpToLine = () => {}
  const onToggle = sinon.stub()
  const eventTracking = { sendMB: sinon.stub() }

  function render(children) {
    renderWithEditorContext(children, { projectId: '123abc' })
  }

  let originalLocalStorage
  before(function () {
    originalLocalStorage = global.localStorage

    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: sinon.stub().returns(null),
        setItem: sinon.stub(),
        removeItem: sinon.stub(),
      },
    })
  })

  afterEach(function () {
    onToggle.reset()
    eventTracking.sendMB.reset()
    global.localStorage.getItem.resetHistory()
    global.localStorage.setItem.resetHistory()
  })

  after(function () {
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
    })
  })

  it('renders expanded outline', function () {
    const outline = [
      {
        title: 'Section',
        line: 1,
        level: 10,
      },
    ]
    render(
      <OutlinePane
        isTexFile
        outline={outline}
        jumpToLine={jumpToLine}
        onToggle={onToggle}
        eventTracking={eventTracking}
        show
      />
    )

    screen.getByRole('tree')
  })

  it('renders disabled outline', function () {
    const outline = []
    render(
      <OutlinePane
        isTexFile={false}
        outline={outline}
        jumpToLine={jumpToLine}
        onToggle={onToggle}
        eventTracking={eventTracking}
        show
      />
    )

    expect(screen.queryByRole('tree')).to.be.null
  })

  it('expand outline and use local storage', function () {
    global.localStorage.getItem.callsFake(key => {
      if (key.startsWith('file_outline.expanded.')) {
        return false
      }
      return null
    })

    const outline = [
      {
        title: 'Section',
        line: 1,
        level: 10,
      },
    ]
    render(
      <OutlinePane
        isTexFile
        outline={outline}
        jumpToLine={jumpToLine}
        onToggle={onToggle}
        eventTracking={eventTracking}
        show
      />
    )

    expect(screen.queryByRole('tree')).to.be.null
    const collapseButton = screen.getByRole('button', {
      name: 'Show File outline',
    })
    fireEvent.click(collapseButton)

    screen.getByRole('tree')
    expect(global.localStorage.setItem).to.be.calledOnce
    expect(global.localStorage.setItem).to.be.calledWithMatch(/123abc/, 'true')
    expect(onToggle).to.be.calledTwice
  })

  it('shows warning on partial result', function () {
    render(
      <OutlinePane
        isTexFile
        outline={[]}
        jumpToLine={jumpToLine}
        onToggle={onToggle}
        eventTracking={eventTracking}
        show
        isPartial
      />
    )
    expect(screen.queryByRole('status')).to.exist
  })

  it('shows no warning on non-partial result', function () {
    render(
      <OutlinePane
        isTexFile
        outline={[]}
        jumpToLine={jumpToLine}
        onToggle={onToggle}
        eventTracking={eventTracking}
        show
        isPartial={false}
      />
    )

    expect(screen.queryByRole('status')).to.not.exist
  })
})
