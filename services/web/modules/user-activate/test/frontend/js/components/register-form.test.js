import { expect } from 'chai'
import { render, screen, fireEvent } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import sinon from 'sinon'
import RegisterForm from '../../../../frontend/js/components/register-form'

describe('RegisterForm', function () {
  beforeEach(function () {
    fetchMock.reset()
  })
  afterEach(function () {
    fetchMock.reset()
  })
  it('should render the register form', async function () {
    const setRegistrationSuccessStub = sinon.stub()
    const setEmailsStub = sinon.stub()
    const setRegisterErrorStub = sinon.stub()
    const setFailedEmailsStub = sinon.stub()

    render(
      <RegisterForm
        setRegistrationSuccess={setRegistrationSuccessStub}
        setEmails={setEmailsStub}
        setRegisterError={setRegisterErrorStub}
        setFailedEmails={setFailedEmailsStub}
      />
    )
    await screen.findByLabelText('emails to register')
    screen.getByRole('button', { name: /register/i })
  })

  it('should call the fetch request when register button is pressed', async function () {
    const email = 'abc@gmail.com'
    const setRegistrationSuccessStub = sinon.stub()
    const setEmailsStub = sinon.stub()
    const setRegisterErrorStub = sinon.stub()
    const setFailedEmailsStub = sinon.stub()

    const endPointResponse = {
      status: 200,
      body: {
        email,
        setNewPasswordUrl: 'SetNewPasswordURL',
      },
    }
    const registerMock = fetchMock.post('/admin/register', endPointResponse)

    render(
      <RegisterForm
        setRegistrationSuccess={setRegistrationSuccessStub}
        setEmails={setEmailsStub}
        setRegisterError={setRegisterErrorStub}
        setFailedEmails={setFailedEmailsStub}
      />
    )
    const registerInput = screen.getByLabelText('emails to register')
    const registerButton = screen.getByRole('button', { name: /register/i })
    fireEvent.change(registerInput, { target: { value: email } })
    fireEvent.click(registerButton)
    expect(registerMock.called()).to.be.true
  })
})
