import React from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { Dropdown, MenuItem } from 'react-bootstrap'
import Tooltip from '../../../shared/components/tooltip'
import Icon from '../../../shared/components/icon'
import { getHueForUserId } from '../../../shared/utils/colors'
import ControlledDropdown from '../../../shared/components/controlled-dropdown'

function OnlineUsersWidget({ onlineUsers, goToUser }) {
  const { t } = useTranslation()

  const shouldDisplayDropdown = onlineUsers.length >= 4

  if (shouldDisplayDropdown) {
    return (
      <ControlledDropdown id="online-users" className="online-users" pullRight>
        <DropDownToggleButton
          bsRole="toggle"
          onlineUserCount={onlineUsers.length}
        />
        <Dropdown.Menu>
          <MenuItem header>{t('connected_users')}</MenuItem>
          {onlineUsers.map((user, index) => (
            <MenuItem
              as="button"
              key={`${user.user_id}_${index}`}
              eventKey={user}
              onSelect={goToUser}
            >
              <UserIcon user={user} onClick={goToUser} showName />
            </MenuItem>
          ))}
        </Dropdown.Menu>
      </ControlledDropdown>
    )
  } else {
    return (
      <div className="online-users">
        {onlineUsers.map((user, index) => (
          <Tooltip
            key={`${user.user_id}_${index}`}
            id="online-user"
            description={user.name}
            overlayProps={{ placement: 'bottom', trigger: ['hover', 'focus'] }}
          >
            <span>
              {/* OverlayTrigger won't fire unless UserIcon is wrapped in a span */}
              <UserIcon user={user} onClick={goToUser} />
            </span>
          </Tooltip>
        ))}
      </div>
    )
  }
}

OnlineUsersWidget.propTypes = {
  onlineUsers: PropTypes.arrayOf(
    PropTypes.shape({
      user_id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  goToUser: PropTypes.func.isRequired,
}

function UserIcon({ user, showName, onClick }) {
  const backgroundColor = `hsl(${getHueForUserId(user.user_id)}, 70%, 50%)`

  function handleOnClick() {
    onClick(user)
  }

  const [character] = [...user.name]

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <span onClick={handleOnClick}>
      <span className="online-user" style={{ backgroundColor }}>
        {character}
      </span>
      {showName && user.name}
    </span>
  )
}

UserIcon.propTypes = {
  user: PropTypes.shape({
    user_id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }),
  showName: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
}

const DropDownToggleButton = React.forwardRef((props, ref) => {
  const { t } = useTranslation()
  return (
    <Tooltip
      id="connected-users"
      description={t('connected_users')}
      overlayProps={{ placement: 'left' }}
    >
      <button
        className="btn online-user online-user-multi"
        onClick={props.onClick} // required by Bootstrap Dropdown to trigger an opening
      >
        <strong>{props.onlineUserCount}</strong>
        <Icon type="users" fw />
      </button>
    </Tooltip>
  )
})

DropDownToggleButton.displayName = 'DropDownToggleButton'

DropDownToggleButton.propTypes = {
  onlineUserCount: PropTypes.number.isRequired,
  onClick: PropTypes.func,
}

export default OnlineUsersWidget
