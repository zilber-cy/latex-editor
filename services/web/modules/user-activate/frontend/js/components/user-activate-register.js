import { useState } from 'react'
import PropTypes from 'prop-types'
import RegisterForm from './register-form'
function UserActivateRegister() {
  const [emails, setEmails] = useState([])
  const [failedEmails, setFailedEmails] = useState([])
  const [registerError, setRegisterError] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)

  return (
    <div className="row">
      <div className="col-md-12">
        <div className="card">
          <div className="page-header">
            <h1> 注册新用户</h1>
          </div>
          <RegisterForm
            setRegistrationSuccess={setRegistrationSuccess}
            setEmails={setEmails}
            setRegisterError={setRegisterError}
            setFailedEmails={setFailedEmails}
          />
          {registerError ? (
            <UserActivateError failedEmails={failedEmails} />
          ) : null}
          {registrationSuccess ? (
            <>
              <SuccessfulRegistrationMessage />
              <hr />
              <DisplayEmailsList emails={emails} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function UserActivateError({ failedEmails }) {
  return (
    <div className="row-spaced text-danger">
      <p>Sorry, an error occured, failed to register these emails.</p>
      {failedEmails.map(email => (
        <p key={email}>{email}</p>
      ))}
    </div>
  )
}

function SuccessfulRegistrationMessage() {
  return (
    <div className="row-spaced text-success">
      <p>我们已经发送了邮件给注册的用户.</p>
      <p>
      您也可以在下面手动向他们发送url，以允许他们重置他们的第一次输入密码并登录.
      </p>
      <p>
        (密码重置令牌将在一周后过期，用户将需要再次注册).
      </p>
    </div>
  )
}

function DisplayEmailsList({ emails }) {
  return (
    <table className="table table-striped ">
      <tbody>
        <tr>
          <th>Email</th>
          <th>Set Password Url</th>
        </tr>
        {emails.map(user => (
          <tr key={user.email}>
            <td>{user.email}</td>
            <td style={{ wordBreak: 'break-all' }}>{user.setNewPasswordUrl}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

DisplayEmailsList.propTypes = {
  emails: PropTypes.array,
}
UserActivateError.propTypes = {
  failedEmails: PropTypes.array,
}

export default UserActivateRegister
