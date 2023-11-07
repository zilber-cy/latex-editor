import BetaBadge from '../../../../frontend/js/shared/components/beta-badge'

describe('beta badge', function () {
  it('renders the url and tooltip text', function () {
    cy.mount(
      <BetaBadge
        url="/foo"
        tooltip={{
          id: 'test-tooltip',
          text: 'This is a test',
        }}
      />
    )

    cy.get('a[href="/foo"]').contains('This is a test')
  })
})
