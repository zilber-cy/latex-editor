import { expect } from 'chai'
import sinon from 'sinon'
import { screen, render, waitFor } from '@testing-library/react'
import * as eventTracking from '../../../../../frontend/js/infrastructure/event-tracking'
import SettingsPageRoot from '../../../../../frontend/js/features/settings/components/root'

describe('<SettingsPageRoot />', function () {
  let sendMBSpy: sinon.SinonSpy
  beforeEach(function () {
    window.metaAttributesCache = new Map()
    window.metaAttributesCache.set('ol-usersEmail', 'foo@bar.com')
    window.metaAttributesCache.set('ol-ExposedSettings', { isOverleaf: true })
    window.metaAttributesCache.set('ol-hasPassword', true)
    window.metaAttributesCache.set('ol-ExposedSettings', {
      hasAffiliationsFeature: true,
      isOverleaf: true,
    })
    window.metaAttributesCache.set('ol-user', {
      features: { github: true, dropbox: true, mendeley: true, zotero: true },
      refProviders: {
        mendeley: true,
        zotero: true,
      },
    })
    window.metaAttributesCache.set('ol-github', { enabled: true })
    window.metaAttributesCache.set('ol-dropbox', { registered: true })
    window.metaAttributesCache.set('ol-oauthProviders', {})
    sendMBSpy = sinon.spy(eventTracking, 'sendMB')
  })

  afterEach(function () {
    window.metaAttributesCache = new Map()
    sendMBSpy.restore()
  })

  it('displays page for Overleaf', async function () {
    render(<SettingsPageRoot />)

    await waitFor(() => {
      screen.getByText('Account Settings')
    })
    screen.getByText('Emails and Affiliations')
    screen.getByText('Update Account Info')
    screen.getByText('Change Password')
    screen.getByText('Integrations')
    screen.getByText('Overleaf Beta Program')
    screen.getByText('Sessions')
    screen.getByText('Newsletter')
    screen.getByRole('button', {
      name: 'Delete your account',
    })
  })

  it('displays page for non-Overleaf', async function () {
    window.metaAttributesCache.set('ol-ExposedSettings', {
      hasAffiliationsFeature: false,
      isOverleaf: false,
    })
    render(<SettingsPageRoot />)

    await waitFor(() => {
      screen.getByText('Account Settings')
    })
    expect(screen.queryByText('Emails and Affiliations')).to.not.exist
    screen.getByText('Update Account Info')
    screen.getByText('Change Password')
    screen.getByText('Integrations')
    expect(screen.queryByText('Overleaf Beta Program')).to.not.exist
    screen.getByText('Sessions')
    expect(screen.queryByText('Newsletter')).to.not.exist
    expect(
      screen.queryByRole('button', {
        name: 'Delete your account',
      })
    ).to.not.exist
  })

  it('sends tracking event on load', async function () {
    render(<SettingsPageRoot />)

    sinon.assert.calledOnce(sendMBSpy)
    sinon.assert.calledWith(sendMBSpy, 'settings-view')
  })
})
