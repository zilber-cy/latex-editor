import PropTypes from 'prop-types'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import Icon from '../../../shared/components/icon'

function ChatToggleButton({ chatIsOpen, unreadMessageCount, onClick }) {
  const { t } = useTranslation()
  const classes = classNames(
    'btn',
    'btn-full-height',
    'btn-full-height-no-border',
    { active: chatIsOpen }
  )

  const hasUnreadMessages = unreadMessageCount > 0

  return (
    <div className="toolbar-item">
      <button className={classes} onClick={onClick}>
        <Icon type="comment" fw className={hasUnreadMessages ? 'bounce' : ''} />
        {hasUnreadMessages && (
          <span className="label label-info">{unreadMessageCount}</span>
        )}
        <p className="toolbar-label">{t('chat')}</p>
      </button>
    </div>
  )
}

ChatToggleButton.propTypes = {
  chatIsOpen: PropTypes.bool,
  unreadMessageCount: PropTypes.number.isRequired,
  onClick: PropTypes.func.isRequired,
}

export default ChatToggleButton
