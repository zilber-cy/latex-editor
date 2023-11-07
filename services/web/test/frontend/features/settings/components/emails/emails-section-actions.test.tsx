import {
  render,
  screen,
  waitForElementToBeRemoved,
  within,
  fireEvent,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect } from 'chai'
import { UserEmailData } from '../../../../../../types/user-email'
import fetchMock from 'fetch-mock'
import EmailsSection from '../../../../../../frontend/js/features/settings/components/emails-section'
import { Institution } from '../../../../../../types/institution'
import { Affiliation } from '../../../../../../types/affiliation'

const userEmailData: UserEmailData = {
  confirmedAt: '2022-03-10T10:59:44.139Z',
  email: 'bar@overleaf.com',
  default: false,
}

const userEmailData2: UserEmailData & { affiliation: Affiliation } = {
  affiliation: {
    inReconfirmNotificationPeriod: false,
    institution: {
      confirmed: false,
    } as Institution,
  } as Affiliation,
  confirmedAt: '2022-03-10T10:59:44.139Z',
  email: 'bar@overleaf.com',
  default: false,
}

describe('email actions - make primary', function () {
  beforeEach(function () {
    window.metaAttributesCache.set('ol-ExposedSettings', {
      hasAffiliationsFeature: true,
    })
    fetchMock.reset()
  })

  afterEach(function () {
    window.metaAttributesCache = new Map()
    fetchMock.reset()
  })

  describe('disabled `make primary` button', function () {
    it('when renders with unconfirmed email', async function () {
      const userEmailDataCopy = { ...userEmailData2 }
      const { confirmedAt: _, ...userEmailData } = userEmailDataCopy
      fetchMock.get('/user/emails?ensureAffiliation=true', [userEmailData])
      render(<EmailsSection />)

      const button = (await screen.findByRole('button', {
        name: /make primary/i,
      })) as HTMLButtonElement
      expect(button.disabled).to.be.true
    })

    it('when renders with email in reconfirmation period', async function () {
      const userEmailDataCopy = {
        ...userEmailData2,
        affiliation: {
          ...userEmailData2.affiliation,
          inReconfirmNotificationPeriod: true,
        },
      }
      fetchMock.get('/user/emails?ensureAffiliation=true', [userEmailDataCopy])
      render(<EmailsSection />)

      const button = (await screen.findByRole('button', {
        name: /make primary/i,
      })) as HTMLButtonElement
      expect(button.disabled).to.be.true
    })
  })

  describe('button tooltips', function () {
    it('when the email is in reconfirmation period', async function () {
      const userEmailDataCopy = {
        ...userEmailData2,
        affiliation: {
          ...userEmailData2.affiliation,
          inReconfirmNotificationPeriod: true,
        },
      }

      fetchMock.get('/user/emails?ensureAffiliation=true', [userEmailDataCopy])
      render(<EmailsSection />)

      const button = (await screen.findByRole('button', {
        name: /make primary/i,
      })) as HTMLButtonElement

      userEvent.hover(button.parentElement!)

      await screen.findByText(
        /Please confirm your affiliation before making this the primary/i
      )
    })

    it('when the email is confirmed', async function () {
      const userEmailDataCopy = { ...userEmailData2 }

      fetchMock.get('/user/emails?ensureAffiliation=true', [userEmailDataCopy])
      render(<EmailsSection />)

      const button = (await screen.findByRole('button', {
        name: /make primary/i,
      })) as HTMLButtonElement

      userEvent.hover(button.parentElement!)

      await screen.findByText('Make this the primary email, used to log in', {
        exact: false,
      })
    })

    it('when not linked to institution', async function () {
      window.metaAttributesCache.set('ol-ExposedSettings', {
        hasAffiliationsFeature: true,
        hasSamlFeature: true,
      })

      const userEmailDataCopy = { ...userEmailData2 }
      const { confirmedAt: _, ...userEmailData } = userEmailDataCopy
      const userEmailDataCopy1 = { ...userEmailData }
      const userEmailDataCopy2 = {
        ...userEmailData,
        email: 'baz@overleaf.com',
        affiliation: {
          ...userEmailData.affiliation,
          institution: {
            ...userEmailData.affiliation.institution,
            id: 123,
            confirmed: true,
            isUniversity: true,
            ssoEnabled: true,
          },
        },
      }

      fetchMock.get('/user/emails?ensureAffiliation=true', [
        userEmailDataCopy1,
        userEmailDataCopy2,
      ])
      render(<EmailsSection />)

      const buttons = (await screen.findAllByRole('button', {
        name: /make primary/i,
      })) as HTMLButtonElement[]

      userEvent.hover(buttons[1].parentElement!)

      await screen.findByText(
        'Please confirm your email by linking to your institutional account before making it the primary email',
        {
          exact: false,
        }
      )
    })
  })

  describe('make an email primary', function () {
    const confirmPrimaryEmail = async () => {
      const button = await screen.findByRole('button', {
        name: /make primary/i,
      })
      fireEvent.click(button)

      const withinModal = within(screen.getByRole('dialog'))
      fireEvent.click(withinModal.getByRole('button', { name: /confirm/i }))
      expect(screen.queryByRole('dialog')).to.be.null

      await waitForElementToBeRemoved(() =>
        screen.getByRole('button', { name: /sending/i, hidden: true })
      )
    }

    it('shows confirmation modal and closes it', async function () {
      fetchMock.get('/user/emails?ensureAffiliation=true', [userEmailData])
      render(<EmailsSection />)

      const button = await screen.findByRole('button', {
        name: /make primary/i,
      })
      fireEvent.click(button)

      const withinModal = within(screen.getByRole('dialog'))
      withinModal.getByText(
        /do you want to change your primary email address to .*/i
      )
      withinModal.getByText(
        /this will be the email address to use if you log in with an email address and password/i
      )
      withinModal.getByText(
        /important .* notifications will be sent to this email address/i
      )
      withinModal.getByRole('button', { name: /confirm/i })

      fireEvent.click(withinModal.getByRole('button', { name: /cancel/i }))
      expect(screen.queryByRole('dialog')).to.be.null
    })

    it('shows loader and removes button', async function () {
      fetchMock
        .get('/user/emails?ensureAffiliation=true', [userEmailData])
        .post('/user/emails/default', 200)
      render(<EmailsSection />)

      await confirmPrimaryEmail()

      expect(
        screen.queryByText(
          /an error has occurred while performing your request/i
        )
      ).to.be.null
      expect(screen.queryByRole('button', { name: /make primary/i })).to.be.null
    })

    it('shows error', async function () {
      fetchMock
        .get('/user/emails?ensureAffiliation=true', [userEmailData])
        .post('/user/emails/default', 503)
      render(<EmailsSection />)

      await confirmPrimaryEmail()

      screen.getByText(/sorry, something went wrong/i)
      await screen.findByRole('button', { name: /make primary/i })
    })
  })
})

describe('email actions - delete', function () {
  beforeEach(function () {
    window.metaAttributesCache.set('ol-ExposedSettings', {
      hasAffiliationsFeature: true,
    })
    fetchMock.reset()
  })

  afterEach(function () {
    window.metaAttributesCache = new Map()
    fetchMock.reset()
  })

  it('shows loader when deleting and removes the row', async function () {
    fetchMock
      .get('/user/emails?ensureAffiliation=true', [userEmailData])
      .post('/user/emails/delete', 200)
    render(<EmailsSection />)

    const button = await screen.findByRole('button', { name: /remove/i })
    fireEvent.click(button)

    await waitForElementToBeRemoved(() =>
      screen.queryByText(userEmailData.email)
    )
  })

  it('shows error when deleting', async function () {
    fetchMock
      .get('/user/emails?ensureAffiliation=true', [userEmailData])
      .post('/user/emails/delete', 503)
    render(<EmailsSection />)

    const button = await screen.findByRole('button', { name: /remove/i })
    fireEvent.click(button)

    await screen.queryByText(/sorry, something went wrong/i)
    screen.getByRole('button', { name: /remove/i })
  })
})
