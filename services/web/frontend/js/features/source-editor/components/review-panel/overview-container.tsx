import Container from './container'
import Toggler from './toggler'
import Toolbar from './toolbar/toolbar'
import Nav from './nav'
import Icon from '../../../../shared/components/icon'
import OverviewFile from './overview-file'
import { useReviewPanelValueContext } from '../../context/review-panel/review-panel-context'

function OverviewContainer() {
  const { loading, docs } = useReviewPanelValueContext()

  return (
    <Container>
      <Toggler />
      <Toolbar />
      <div
        className="rp-entry-list"
        id="review-panel-overview"
        role="tabpanel"
        tabIndex={0}
        aria-labelledby="review-panel-tab-overview"
      >
        {loading ? (
          <div className="rp-loading">
            <Icon type="spinner" spin />
          </div>
        ) : (
          docs?.map(doc => (
            <OverviewFile
              key={doc.doc.id}
              docId={doc.doc.id}
              docPath={doc.path}
            />
          ))
        )}
      </div>
      <Nav />
    </Container>
  )
}

export default OverviewContainer
