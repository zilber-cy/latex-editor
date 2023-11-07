import sinon from 'sinon'
import { expect } from 'chai'
import { screen, render, fireEvent } from '@testing-library/react'

import MessageList from '../../../../../frontend/js/features/chat/components/message-list'
import { stubMathJax, tearDownMathJaxStubs } from './stubs'

describe('<MessageList />', function () {
  const currentUser = {
    id: 'fake_user',
    first_name: 'fake_user_first_name',
    email: 'fake@example.com',
  }

  function createMessages() {
    return [
      {
        id: '1',
        contents: ['a message'],
        user: currentUser,
        timestamp: new Date().getTime(),
      },
      {
        id: '2',
        contents: ['another message'],
        user: currentUser,
        timestamp: new Date().getTime(),
      },
    ]
  }

  before(function () {
    stubMathJax()
  })

  after(function () {
    tearDownMathJaxStubs()
  })

  it('renders multiple messages', function () {
    render(
      <MessageList
        userId={currentUser.id}
        messages={createMessages()}
        resetUnreadMessages={() => {}}
      />
    )

    screen.getByText('a message')
    screen.getByText('another message')
  })

  it('renders a single timestamp for all messages within 5 minutes', function () {
    const msgs = createMessages()
    msgs[0].timestamp = new Date(2019, 6, 3, 4, 23).getTime()
    msgs[1].timestamp = new Date(2019, 6, 3, 4, 27).getTime()

    render(
      <MessageList
        userId={currentUser.id}
        messages={msgs}
        resetUnreadMessages={() => {}}
      />
    )

    screen.getByText('4:23 am Wed, 3rd Jul 19')
    expect(screen.queryByText('4:27 am Wed, 3rd Jul 19')).to.not.exist
  })

  it('renders a timestamp for each messages separated for more than 5 minutes', function () {
    const msgs = createMessages()
    msgs[0].timestamp = new Date(2019, 6, 3, 4, 23).getTime()
    msgs[1].timestamp = new Date(2019, 6, 3, 4, 31).getTime()

    render(
      <MessageList
        userId={currentUser.id}
        messages={msgs}
        resetUnreadMessages={() => {}}
      />
    )

    screen.getByText('4:23 am Wed, 3rd Jul 19')
    screen.getByText('4:31 am Wed, 3rd Jul 19')
  })

  it('resets the number of unread messages after clicking on the input', function () {
    const resetUnreadMessages = sinon.stub()
    render(
      <MessageList
        userId={currentUser.id}
        messages={createMessages()}
        resetUnreadMessages={resetUnreadMessages}
      />
    )

    fireEvent.click(screen.getByRole('list'))
    expect(resetUnreadMessages).to.be.calledOnce
  })
})
